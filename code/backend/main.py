"""
VisionEstate - Verified Property Listing Platform
Backend API with complete verification workflow and admin approval
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
import shutil
import os
import json
import uuid
import traceback
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from analyzer import detect_defects
from models import (
    get_db, init_db, PropertySubmission, VerificationTier, VerificationStatus,
    AIAnalysisResult, DiscrepancyReport, PropertyResponse, 
    VerificationStatusResponse, TIER_PRICING, AdminApprovalRequest,
    GeminiCrackAnalysis
)

# Import Gemini verifier (optional - works without API key)
try:
    from gemini_verifier import analyze_crack_with_gemini, verify_property_images
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

app = FastAPI(title="VisionEstate API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

# Initialize database tables on startup
init_db()

# Create uploads directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(SCRIPT_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Gemini API key from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


# ==================== Health Check ====================

@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {"status": "ok", "message": "VisionEstate API is running", "version": "2.0.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        conn = get_db()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


# ==================== Property Submission ====================
@app.post("/reconstruct-room")
async def reconstruct_room(files: List[UploadFile] = File(...)):
    per_image_results = []
    all_spatial = []
    calibration_status = False
    room_types = []
    
    for file in files:
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        try:
            detections, spatial, calibrated, img_size = detect_defects(temp_path)
            per_image_results.append({"detections": detections, "img_size": img_size})
            all_spatial.append(spatial)
            if calibrated: calibration_status = True
            
            # NEW: Collect room type data
            room_types.append({
                "type": spatial.get("room_type", "unknown"),
                "confidence": spatial.get("room_confidence", 0)
            })
        finally:
            if os.path.exists(temp_path): os.remove(temp_path)

    # NEW: Use best measurement instead of max fusion
    if all_spatial:
        best_idx = max(range(len(all_spatial)), key=lambda i: all_spatial[i].get("area_confidence", 0))
        best_spatial = all_spatial[best_idx]
        
        fused_spatial = {
            "width": float(best_spatial.get("width", 0)),
            "height": float(best_spatial.get("height", 2.7)),
            "length": float(best_spatial.get("length", 0)),
            "area": round(best_spatial.get("area", 0), 2),
            "area_confidence": best_spatial.get("area_confidence", 0),
            "estimation_method": best_spatial.get("estimation_method", "unknown"),
            "reference_object": best_spatial.get("reference_object")
        }
        
        # NEW: Determine best room type by voting
        if room_types:
            room_votes = {}
            for rt in room_types:
                room_type = rt["type"]
                conf = rt["confidence"]
                if room_type not in room_votes:
                    room_votes[room_type] = 0
                room_votes[room_type] += conf
            
            best_room_type = max(room_votes, key=room_votes.get)
            room_confidence = room_votes[best_room_type] / len(room_types)
        else:
            best_room_type = "unknown"
            room_confidence = 0
        
        overall_confidence = (fused_spatial["area_confidence"] + room_confidence) / 2
    else:
        fused_spatial = {"width": 0.0, "height": 0.0, "length": 0.0, "area": 0.0}
        best_room_type = "unknown"
        room_confidence = 0
        overall_confidence = 0

    return {
        "analysis_results": per_image_results,
        "spatial_data": fused_spatial,
        "room_type": best_room_type,
        "room_confidence": round(room_confidence, 1),
        "overall_confidence": round(overall_confidence, 1),
        "is_calibrated": calibration_status,
        "needs_user_confirmation": overall_confidence < 70
    }
    
@app.post("/properties/submit")
async def submit_property(
    seller_name: str = Form(...),
    seller_email: str = Form(...),
    seller_phone: str = Form(...),
    property_type: str = Form(...),
    listing_type: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    address: str = Form(...),
    city: str = Form(...),
    state: str = Form(...),
    pincode: str = Form(...),
    claimed_area: Optional[float] = Form(None),
    claimed_width: Optional[float] = Form(None),
    claimed_length: Optional[float] = Form(None),
    bedrooms: Optional[int] = Form(None),
    bathrooms: Optional[int] = Form(None),
    price: float = Form(...),
    verification_tier: str = Form("basic")
):
    """Submit a new property for listing"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO properties (
                seller_name, seller_email, seller_phone,
                property_type, listing_type, title, description,
                address, city, state, pincode,
                claimed_area, claimed_width, claimed_length,
                bedrooms, bathrooms, price, verification_tier,
                verification_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            seller_name, seller_email, seller_phone,
            property_type, listing_type, title, description,
            address, city, state, pincode,
            claimed_area, claimed_width, claimed_length,
            bedrooms, bathrooms, price, verification_tier,
            "pending"
        ))
        property_id = cursor.lastrowid
        
        conn.commit()
        
        # Log submission (using new connection for log to ensure it persists even if main logic had quirks, though here we committed)
        # Or better, inline it before commit to be atomic.
        # But wait, I'll stick to the pattern I used in approve/reject (inlined before commit).
        
        # Actually, let's reopen a small block or just do it before the commit in previous block if I can match it.
        # The previous tool call showed lines 125-126 as:
        #         conn.commit()
        
        # I will replace the block ending at conn.commit()
        
        # Create verification request
        cursor.execute("""
            INSERT INTO verification_requests (
                property_id, tier, payment_amount
            ) VALUES (?, ?, ?)
        """, (
            property_id, 
            verification_tier,
            TIER_PRICING.get(VerificationTier(verification_tier), 0)
        ))
        
        # Log submission
        cursor.execute("""
            INSERT INTO property_logs (property_id, action, description, performed_by, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            property_id,
            "submitted",
            "Property submitted for verification",
            "user",
            datetime.now().isoformat(),
            json.dumps({"tier": verification_tier})
        ))
        
        conn.commit()
        
        return {
            "success": True,
            "property_id": property_id,
            "message": "Property submitted successfully. Please upload photos.",
            "next_step": "upload_photos"
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.post("/properties/{property_id}/upload-photos")
async def upload_photos(property_id: int, files: List[UploadFile] = File(...)):
    """Upload property photos for AI analysis"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify property exists
    cursor.execute("SELECT id FROM properties WHERE id = ?", (property_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Create property folder
    property_folder = os.path.join(UPLOAD_DIR, str(property_id))
    os.makedirs(property_folder, exist_ok=True)
    
    saved_files = []
    for file in files:
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(property_folder, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        saved_files.append(f"/uploads/{property_id}/{filename}")
    
    # Update property with photo URLs
    cursor.execute(
        "UPDATE properties SET photos = ? WHERE id = ?",
        (json.dumps(saved_files), property_id)
    )
    
    # Log photo upload
    cursor.execute("""
        INSERT INTO property_logs (property_id, action, description, performed_by, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        property_id,
        "photos_uploaded",
        f"Uploaded {len(files)} photos",
        "user",
        datetime.now().isoformat(),
        json.dumps({"count": len(files)})
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "photos": saved_files,
        "message": f"Uploaded {len(saved_files)} photos successfully",
        "next_step": "analyze"
    }


@app.post("/properties/{property_id}/analyze")
async def analyze_property(property_id: int):
    """Run AI analysis on uploaded property photos"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get property data
    cursor.execute("""
        SELECT photos, claimed_area, claimed_width, claimed_length, property_type
        FROM properties WHERE id = ?
    """, (property_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Property not found")
    
    photos = json.loads(row["photos"]) if row["photos"] else []
    if not photos:
        conn.close()
        raise HTTPException(status_code=400, detail="No photos uploaded")
    
    claimed_area = row["claimed_area"]
    claimed_width = row["claimed_width"]
    claimed_length = row["claimed_length"]
    
    # Update status to analyzing
    cursor.execute(
        "UPDATE properties SET verification_status = ? WHERE id = ?",
        ("ai_analyzing", property_id)
    )
    cursor.execute(
        "UPDATE verification_requests SET status = ? WHERE property_id = ?",
        ("ai_analyzing", property_id)
    )
    conn.commit()
    
    # Run AI analysis on each photo
    all_spatial = []
    all_detections = []
    total_cracks = 0
    room_types = []
    
    for photo_url in photos:
        # Convert URL to file path
        photo_path = photo_url.replace("/uploads/", UPLOAD_DIR + "/")
        
        if os.path.exists(photo_path):
            detections, spatial, calibrated, img_size = detect_defects(photo_path)
            
            all_spatial.append(spatial)
            all_detections.extend(detections)
            
            # Count cracks
            crack_count = sum(1 for d in detections if d.get("isCrack", False))
            total_cracks += crack_count
            
            room_types.append({
                "type": spatial.get("room_type", "unknown"),
                "confidence": spatial.get("room_confidence", 0)
            })
    
    # Fuse spatial data from multiple images
    if all_spatial:
        best_idx = max(range(len(all_spatial)), key=lambda i: all_spatial[i].get("area_confidence", 0))
        best_spatial = all_spatial[best_idx]
        
        estimated_area = best_spatial.get("area", 0)
        area_confidence = best_spatial.get("area_confidence", 0)
        estimation_method = best_spatial.get("estimation_method", "unknown")
        reference_object = best_spatial.get("reference_object")
        
        # Determine best room type
        if room_types:
            room_votes = {}
            for rt in room_types:
                room_type = rt["type"]
                conf = rt["confidence"]
                if room_type not in room_votes:
                    room_votes[room_type] = 0
                room_votes[room_type] += conf
            
            best_room_type = max(room_votes, key=room_votes.get)
            room_confidence = room_votes[best_room_type] / len(room_types)
        else:
            best_room_type = "unknown"
            room_confidence = 0
    else:
        estimated_area = 0
        area_confidence = 0
        estimation_method = "none"
        reference_object = None
        best_room_type = "unknown"
        room_confidence = 0
    
    # Calculate discrepancy
    has_discrepancy = False
    discrepancy_details = []
    
    if claimed_area and estimated_area > 0:
        area_diff_percent = abs(claimed_area - estimated_area) / claimed_area * 100
        if area_diff_percent > 15:  # More than 15% difference
            has_discrepancy = True
            discrepancy_details.append(
                f"Area discrepancy: Claimed {claimed_area:.1f} sq.m, AI estimated {estimated_area:.1f} sq.m ({area_diff_percent:.1f}% difference)"
            )
    
    if total_cracks > 0:
        has_discrepancy = True
        discrepancy_details.append(
            f"Structural issues detected: {total_cracks} crack(s) found in photos"
        )
        
        # Trigger Gemini verification if available and cracks are detected
        if GEMINI_AVAILABLE:
            try:
                # Get existing photo paths
                photo_paths = []
                for photo_url in photos:
                    photo_path = photo_url.replace("/uploads/", UPLOAD_DIR + "/")
                    if os.path.exists(photo_path):
                        photo_paths.append(photo_path)
                
                if photo_paths:
                    gemini_result = verify_property_images(photo_paths, GEMINI_API_KEY)
                    
                    if gemini_result.get("has_real_crack"):
                         # It confirmed it's a real crack
                         pass # Keep discrepancy
                    else:
                        # Gemini says it's NOT a real crack
                        # We can potentially lower the severity or flag it for user review with a "good" note
                        discrepancy_details.append(
                            f"AI Note: Second-stage analysis suggests these may be decorative/harmless ({gemini_result.get('max_severity')} severity)."
                        )
                    
                    # Store Gemini results
                    cursor.execute("""
                        UPDATE properties SET
                            gemini_crack_verified = 1,
                            gemini_crack_is_real = ?,
                            gemini_crack_description = ?,
                            gemini_crack_severity = ?,
                            gemini_confidence = ?
                        WHERE id = ?
                    """, (
                        1 if gemini_result.get("has_real_crack") else 0,
                        gemini_result.get("recommendation", ""),
                        gemini_result.get("max_severity", "none"),
                        0.9 if gemini_result.get("has_real_crack") else 0.85,
                        property_id
                    ))
            except Exception as e:
                print(f"Gemini auto-verification failed: {e}")
    
    # Update property with AI results
    cursor.execute("""
        UPDATE properties SET
            verification_status = ?,
            ai_estimated_area = ?,
            ai_room_type = ?,
            ai_confidence = ?,
            ai_crack_detected = ?,
        ai_discrepancy_flag = ?,
            ai_discrepancy_details = ?,
            ai_detections = ?
        WHERE id = ?
    """, (
        "ai_complete",
        estimated_area,
        best_room_type,
        (area_confidence + room_confidence * 100) / 2,
        1 if total_cracks > 0 else 0,
        1 if has_discrepancy else 0,
        json.dumps(discrepancy_details) if discrepancy_details else None,
        json.dumps(all_detections) if all_detections else None,
        property_id
    ))
    
    # Update verification request
    cursor.execute("""
        UPDATE verification_requests SET
            status = ?,
            ai_analysis_complete = 1,
            ai_analysis_result = ?
        WHERE property_id = ?
    """, (
        "ai_complete",
        json.dumps({
            "estimated_area": estimated_area,
            "room_type": best_room_type,
            "area_confidence": area_confidence,
            "room_confidence": room_confidence * 100,
            "cracks_found": total_cracks,
            "estimation_method": estimation_method,
            "reference_object": reference_object
        }),
        property_id
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "analysis": {
            "estimated_area": round(estimated_area, 2),
            "room_type": best_room_type,
            "area_confidence": round(area_confidence, 1),
            "room_confidence": round(room_confidence * 100, 1),
            "cracks_detected": total_cracks,
            "estimation_method": estimation_method,
            "reference_object": reference_object
        },
        "discrepancy": {
            "has_discrepancy": has_discrepancy,
            "details": discrepancy_details
        },
        "needs_confirmation": True,
        "next_step": "confirm_analysis"
    }


@app.post("/properties/{property_id}/confirm-analysis")
async def confirm_analysis(
    property_id: int,
    user_agrees: bool = Form(...),
    corrected_area: Optional[float] = Form(None),
    user_notes: Optional[str] = Form(None)
):
    """User confirms AI analysis or provides corrections"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get property and verification tier
    cursor.execute("""
        SELECT verification_tier, ai_estimated_area FROM properties WHERE id = ?
    """, (property_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Property not found")
    
    tier = row["verification_tier"]
    
    # If user corrected area, update claimed area
    if corrected_area:
        cursor.execute(
            "UPDATE properties SET claimed_area = ? WHERE id = ?",
            (corrected_area, property_id)
        )
    
    # Determine next step based on tier
    if tier == "basic":
        # Basic tier: Mark as verified immediately
        cursor.execute("""
            UPDATE properties SET
                verification_status = 'verified',
                is_verified = 1,
                is_listed = 1
            WHERE id = ?
        """, (property_id,))
        cursor.execute("""
            UPDATE verification_requests SET
                status = 'verified',
                final_verdict = 'approved',
                payment_status = 'free'
            WHERE property_id = ?
        """, (property_id,))
        next_step = "listed"
        message = "Property verified and listed on marketplace!"
    else:
        # Standard/Premium: Require payment
        cursor.execute(
            "UPDATE properties SET verification_status = 'awaiting_payment' WHERE id = ?",
            (property_id,)
        )
        cursor.execute(
            "UPDATE verification_requests SET status = 'awaiting_payment' WHERE property_id = ?",
            (property_id,)
        )
        next_step = "payment"
        message = "Please complete payment to continue verification."
    
    # Log analysis confirmation
    cursor.execute("""
        INSERT INTO property_logs (property_id, action, description, performed_by, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        property_id,
        "analysis_confirmed",
        "User confirmed AI analysis results",
        "user",
        datetime.now().isoformat(),
        json.dumps({"user_agrees": user_agrees, "corrected_area": corrected_area})
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": message,
        "next_step": next_step
    }


@app.post("/properties/{property_id}/pay")
async def process_payment(
    property_id: int,
    payment_method: str = Form(...),  # "upi", "card", "netbanking"
    payment_reference: Optional[str] = Form(None)
):
    """Process verification fee payment (simulated)"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get property tier
    cursor.execute("""
        SELECT verification_tier FROM properties WHERE id = ?
    """, (property_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Property not found")
    
    tier = row["verification_tier"]
    amount = TIER_PRICING.get(VerificationTier(tier), 0)
    
    # Simulate payment success
    payment_id = f"PAY_{uuid.uuid4().hex[:12].upper()}"
    
    if tier == "standard":
        # Standard: Move to document review
        next_status = "document_review"
        next_step = "document_review"
        message = "Payment successful! Document verification in progress."
    else:
        # Premium: Assign inspector
        next_status = "inspector_assigned"
        next_step = "schedule_inspection"
        message = "Payment successful! An inspector will be assigned."
    
    cursor.execute("""
        UPDATE properties SET verification_status = ? WHERE id = ?
    """, (next_status, property_id))
    
    cursor.execute("""
        UPDATE verification_requests SET
            status = ?,
            payment_status = 'completed',
            payment_id = ?
        WHERE property_id = ?
    """, (next_status, payment_id, property_id))
    
    # For premium tier, assign an available inspector
    if tier == "premium":
        cursor.execute("""
            SELECT id, name FROM inspectors WHERE available = 1 LIMIT 1
        """)
        inspector = cursor.fetchone()
        if inspector:
            cursor.execute("""
                UPDATE verification_requests SET
                    inspector_assigned = 1,
                    inspector_name = ?
                WHERE property_id = ?
            """, (inspector["name"], property_id))
            cursor.execute("""
                UPDATE properties SET inspector_id = ? WHERE id = ?
            """, (inspector["id"], property_id))
    
    conn.commit()
    
    # Log payment (new connection or inline)
    # Inline:
    log_conn = get_db()
    log_cursor = log_conn.cursor()
    log_cursor.execute("""
        INSERT INTO property_logs (property_id, action, description, performed_by, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        property_id,
        "payment_completed",
        f"Payment request submitted via {payment_method}",
        "user",
        datetime.now().isoformat(),
        json.dumps({"amount": amount, "method": payment_method, "payment_id": payment_id})
    ))
    log_conn.commit()
    log_conn.close()
    
    conn.close()
    
    return {
        "success": True,
        "payment_id": payment_id,
        "amount": amount,
        "message": message,
        "next_step": next_step
    }


@app.post("/properties/{property_id}/schedule-inspection")
async def schedule_inspection(
    property_id: int,
    preferred_date: str = Form(...),  # ISO format date
    preferred_time: str = Form(...)   # "morning", "afternoon", "evening"
):
    """Schedule physical inspection for premium tier"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE properties SET
            verification_status = 'inspection_scheduled',
            inspection_date = ?
        WHERE id = ?
    """, (f"{preferred_date} {preferred_time}", property_id))
    
    cursor.execute("""
        UPDATE verification_requests SET
            status = 'inspection_scheduled',
            inspection_scheduled = ?
        WHERE property_id = ?
    """, (f"{preferred_date} {preferred_time}", property_id))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": f"Inspection scheduled for {preferred_date} ({preferred_time})",
        "next_step": "await_inspection"
    }


@app.post("/properties/{property_id}/complete-inspection")
async def complete_inspection(
    property_id: int,
    passed: bool = Form(...),
    report: str = Form(...),
    actual_area: Optional[float] = Form(None)
):
    """Inspector submits inspection report (admin endpoint)"""
    conn = get_db()
    cursor = conn.cursor()
    
    if passed:
        cursor.execute("""
            UPDATE properties SET
                verification_status = 'verified',
                is_verified = 1,
                is_listed = 1,
                inspection_report = ?
            WHERE id = ?
        """, (report, property_id))
        
        cursor.execute("""
            UPDATE verification_requests SET
                status = 'verified',
                inspection_complete = 1,
                inspection_result = ?,
                final_verdict = 'approved'
            WHERE property_id = ?
        """, (report, property_id))
        
        message = "Property verified and listed!"
    else:
        cursor.execute("""
            UPDATE properties SET
                verification_status = 'rejected',
                inspection_report = ?
            WHERE id = ?
        """, (report, property_id))
        
        cursor.execute("""
            UPDATE verification_requests SET
                status = 'rejected',
                inspection_complete = 1,
                inspection_result = ?,
                final_verdict = 'rejected',
                rejection_reason = ?
            WHERE property_id = ?
        """, (report, report, property_id))
        
        message = "Property rejected. Seller can resubmit."
    
    # Log inspection result
    log_property_activity(
        property_id,
        "inspection_completed",
        f"Inspection {'passed' if passed else 'failed'}: {report[:50]}...",
        "inspector",
        {"passed": passed, "report": report}
    )

    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": message
    }


# ==================== Verification Status ====================

@app.get("/properties/{property_id}/status")
async def get_verification_status(property_id: int):
    """Get detailed verification status for a property"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.*, v.* 
        FROM properties p
        LEFT JOIN verification_requests v ON p.id = v.property_id
        WHERE p.id = ?
    """, (property_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Property not found")
    
    status = row["verification_status"]
    tier = row["verification_tier"]
    
    # Build steps completed list
    steps_completed = []
    if row["photos"]:
        steps_completed.append("photos_uploaded")
    if row["ai_analysis_complete"]:
        steps_completed.append("ai_analysis")
    if row["payment_status"] == "completed":
        steps_completed.append("payment")
    if row["document_verified"]:
        steps_completed.append("document_review")
    if row["inspection_complete"]:
        steps_completed.append("inspection")
    if row["is_verified"]:
        steps_completed.append("verified")
    
    # Determine next step
    next_step_map = {
        "pending": "Upload property photos",
        "ai_analyzing": "Waiting for AI analysis...",
        "ai_complete": "Review and confirm AI analysis",
        "awaiting_payment": "Complete payment",
        "document_review": "Documents under review",
        "inspector_assigned": "Schedule inspection",
        "inspection_scheduled": "Await inspector visit",
        "inspection_complete": "Awaiting final verdict",
        "verified": "Listed on marketplace!",
        "rejected": "Review rejection reason"
    }
    
    return {
        "property_id": property_id,
        "status": status,
        "tier": tier,
        "ai_complete": bool(row["ai_analysis_complete"]),
        "document_verified": bool(row["document_verified"]),
        "inspector_assigned": bool(row["inspector_assigned"]),
        "inspection_complete": bool(row["inspection_complete"]),
        "final_verdict": row["final_verdict"],
        "rejection_reason": row["rejection_reason"],
        "payment_status": row["payment_status"],
        "payment_amount": TIER_PRICING.get(VerificationTier(tier), 0),
        "steps_completed": steps_completed,
        "next_step": next_step_map.get(status, "Unknown"),
        "ai_analysis": {
            "estimated_area": row["ai_estimated_area"],
            "room_type": row["ai_room_type"],
            "confidence": row["ai_confidence"],
            "crack_detected": bool(row["ai_crack_detected"]),
            "discrepancy_flag": bool(row["ai_discrepancy_flag"]),
            "discrepancy_details": json.loads(row["ai_discrepancy_details"]) if row["ai_discrepancy_details"] else [],
            "detections": json.loads(row["ai_detections"]) if "ai_detections" in row.keys() and row["ai_detections"] else []
        }
    }


# ==================== Marketplace ====================

@app.get("/properties/verified")
async def get_verified_properties(
    city: Optional[str] = None,
    property_type: Optional[str] = None,
    listing_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bedrooms: Optional[int] = None
):
    """Get all verified properties for marketplace"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = """
        SELECT * FROM properties 
        WHERE is_verified = 1 AND is_listed = 1 AND admin_approved = 1
    """
    params = []
    
    if city:
        query += " AND LOWER(city) = LOWER(?)"
        params.append(city)
    if property_type:
        query += " AND property_type = ?"
        params.append(property_type)
    if listing_type:
        query += " AND listing_type = ?"
        params.append(listing_type)
    if min_price:
        query += " AND price >= ?"
        params.append(min_price)
    if max_price:
        query += " AND price <= ?"
        params.append(max_price)
    if bedrooms:
        query += " AND bedrooms >= ?"
        params.append(bedrooms)
    
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    properties = []
    for row in rows:
        properties.append({
            "id": row["id"],
            "title": row["title"],
            "property_type": row["property_type"],
            "listing_type": row["listing_type"],
            "city": row["city"],
            "state": row["state"],
            "price": row["price"],
            "bedrooms": row["bedrooms"],
            "bathrooms": row["bathrooms"],
            "claimed_area": row["claimed_area"],
            "ai_estimated_area": row["ai_estimated_area"],
            "ai_room_type": row["ai_room_type"],
            "ai_confidence": row["ai_confidence"],
            "ai_crack_detected": bool(row["ai_crack_detected"]),
            "verification_tier": row["verification_tier"],
            "photos": json.loads(row["photos"]) if row["photos"] else [],
            "created_at": row["created_at"]
        })
    
    return {
        "count": len(properties),
        "properties": properties
    }


@app.get("/properties/{property_id}")
async def get_property_detail(property_id: int):
    """Get single property details"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM properties WHERE id = ?", (property_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {
        "id": row["id"],
        "seller_name": row["seller_name"],
        "seller_phone": row["seller_phone"] if row["is_verified"] else None,
        "title": row["title"],
        "description": row["description"],
        "property_type": row["property_type"],
        "listing_type": row["listing_type"],
        "address": row["address"] if row["is_verified"] else f"{row['city']}, {row['state']}",
        "city": row["city"],
        "state": row["state"],
        "pincode": row["pincode"],
        "price": row["price"],
        "bedrooms": row["bedrooms"],
        "bathrooms": row["bathrooms"],
        "claimed_area": row["claimed_area"],
        "ai_estimated_area": row["ai_estimated_area"],
        "ai_room_type": row["ai_room_type"],
        "ai_confidence": row["ai_confidence"],
        "ai_crack_detected": bool(row["ai_crack_detected"]),
        "verification_tier": row["verification_tier"],
        "verification_status": row["verification_status"],
        "is_verified": bool(row["is_verified"]),
        "photos": json.loads(row["photos"]) if row["photos"] else [],
        "created_at": row["created_at"]
    }


# ==================== Legacy Analysis Endpoint ====================

@app.post("/reconstruct-room")
async def reconstruct_room(files: List[UploadFile] = File(...)):
    """Legacy endpoint for room reconstruction (kept for compatibility)"""
    per_image_results = []
    all_spatial = []
    calibration_status = False
    room_types = []
    
    for file in files:
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        try:
            detections, spatial, calibrated, img_size = detect_defects(temp_path)
            per_image_results.append({
                "detections": detections,
                "img_size": img_size
            })
            all_spatial.append(spatial)
            if calibrated: 
                calibration_status = True
            
            room_types.append({
                "type": spatial.get("room_type", "unknown"),
                "confidence": spatial.get("room_confidence", 0)
            })
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # Fuse spatial data
    fused_spatial = {
        "width": float(max(s["width"] for s in all_spatial)),
        "height": float(max(s["height"] for s in all_spatial)),
        "length": float(max(s["length"] for s in all_spatial)),
    }
    
    best_area_idx = max(range(len(all_spatial)), key=lambda i: all_spatial[i].get("area_confidence", 0))
    best_spatial = all_spatial[best_area_idx]
    
    fused_spatial["area"] = round(best_spatial["area"], 2)
    fused_spatial["area_confidence"] = best_spatial.get("area_confidence", 0)
    fused_spatial["estimation_method"] = best_spatial.get("estimation_method", "unknown")
    fused_spatial["reference_object"] = best_spatial.get("reference_object")
    
    if room_types:
        room_votes = {}
        for rt in room_types:
            room_type = rt["type"]
            conf = rt["confidence"]
            if room_type not in room_votes:
                room_votes[room_type] = 0
            room_votes[room_type] += conf
        
        best_room_type = max(room_votes, key=room_votes.get)
        room_confidence = room_votes[best_room_type] / len(room_types)
    else:
        best_room_type = "unknown"
        room_confidence = 0
    
    overall_confidence = (fused_spatial["area_confidence"] + room_confidence) / 2

    return {
        "analysis_results": per_image_results,
        "spatial_data": fused_spatial,
        "room_type": best_room_type,
        "room_confidence": round(room_confidence, 1),
        "overall_confidence": round(overall_confidence, 1),
        "is_calibrated": calibration_status,
        "needs_user_confirmation": overall_confidence < 70
    }



@app.get("/api/info")
async def api_info():
    return {
        "name": "VisionEstate API",
        "version": "2.0.0",
        "description": "Verified Property Listing Platform",
        "gemini_available": GEMINI_AVAILABLE,
        "endpoints": {
            "submit_property": "/properties/submit",
            "upload_photos": "/properties/{id}/upload-photos",
            "analyze": "/properties/{id}/analyze",
            "status": "/properties/{id}/status",
            "marketplace": "/properties/verified",
            "admin_pending": "/admin/properties/pending",
            "admin_approve": "/admin/properties/{id}/approve"
        }
    }


# ==================== User Endpoints ====================

@app.get("/user/{email}/properties")
async def get_user_properties(email: str):
    """Get all properties submitted by a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.*, 
               (SELECT COUNT(*) FROM legal_documents WHERE property_id = p.id) as doc_count
        FROM properties p 
        WHERE p.seller_email = ? 
        ORDER BY p.created_at DESC
    """, (email,))
    
    rows = cursor.fetchall()
    
    properties = []
    for row in rows:
        photos = []
        if row["photos"]:
            import json as json_lib
            try:
                photos = json_lib.loads(row["photos"])
            except:
                pass
        
        # Get recent logs for this property
        cursor.execute("""
            SELECT * FROM property_logs 
            WHERE property_id = ? 
            ORDER BY timestamp DESC LIMIT 5
        """, (row["id"],))
        logs = [dict(l) for l in cursor.fetchall()]
        
        properties.append({
            "id": row["id"],
            "title": row["title"],
            "property_type": row["property_type"],
            "listing_type": row["listing_type"],
            "city": row["city"],
            "state": row["state"],
            "price": row["price"],
            "photos": photos,
            "verification_status": row["verification_status"],
            "verification_tier": row["verification_tier"],
            "is_verified": bool(row["is_verified"]),
            "is_listed": bool(row["is_listed"]),
            "created_at": row["created_at"],
            "documents_count": row["doc_count"],
            "recent_logs": logs
        })
    
    conn.close()
    
    return {"count": len(properties), "properties": properties}


# ==================== Admin Endpoints ====================

@app.get("/admin/properties/pending")
async def get_pending_properties():
    """Get all properties pending admin approval"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.*, vr.status as vr_status, vr.tier
        FROM properties p
        LEFT JOIN verification_requests vr ON p.id = vr.property_id
        WHERE p.admin_approved = 0 
        AND p.verification_status IN ('document_review', 'pending_admin_approval', 'inspection_complete')
        ORDER BY p.created_at DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    properties = []
    for row in rows:
        photos = json.loads(row["photos"]) if row["photos"] else []
        properties.append({
            "id": row["id"],
            "title": row["title"],
            "seller_name": row["seller_name"],
            "seller_email": row["seller_email"],
            "property_type": row["property_type"],
            "listing_type": row["listing_type"],
            "city": row["city"],
            "state": row["state"],
            "price": row["price"],
            "photos": photos,
            "verification_tier": row["verification_tier"],
            "verification_status": row["verification_status"],
            "ai_estimated_area": row["ai_estimated_area"],
            "ai_crack_detected": bool(row["ai_crack_detected"]),
            "gemini_crack_verified": bool(row["gemini_crack_verified"]) if row["gemini_crack_verified"] else False,
            "gemini_crack_is_real": bool(row["gemini_crack_is_real"]) if row["gemini_crack_is_real"] else False,
            "gemini_crack_description": row["gemini_crack_description"],
            "created_at": row["created_at"]
        })
    
    return {"pending_count": len(properties), "properties": properties}


@app.post("/admin/properties/{property_id}/approve")
async def approve_property(property_id: int, notes: Optional[str] = Form(None)):
    """Admin approves a property for listing"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify property exists
    cursor.execute("SELECT id, verification_status FROM properties WHERE id = ?", (property_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Update property as approved
    cursor.execute("""
        UPDATE properties SET
            admin_approved = 1,
            admin_reviewed = 1,
            admin_notes = ?,
            admin_reviewed_at = ?,
            verification_status = 'verified',
            is_verified = 1,
            is_listed = 1
        WHERE id = ?
    """, (notes, datetime.now().isoformat(), property_id))
    
    # Update verification request
    cursor.execute("""
        UPDATE verification_requests SET
            admin_approved = 1,
            status = 'verified',
            final_verdict = 'approved'
        WHERE property_id = ?
    """, (property_id,))
    
    # Log the approval
    cursor.execute("""
        INSERT INTO property_logs (property_id, action, description, performed_by, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        property_id,
        "admin_approved",
        "Property approved and listed on marketplace",
        "admin",
        datetime.now().isoformat(),
        json.dumps({"notes": notes}) if notes else None
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": "Property approved and listed successfully",
        "property_id": property_id
    }


@app.post("/admin/properties/{property_id}/reject")
async def reject_property(
    property_id: int,
    reason: str = Form(...),
    notes: Optional[str] = Form(None)
):
    """Admin rejects a property"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify property exists
    cursor.execute("SELECT id FROM properties WHERE id = ?", (property_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Update property as rejected
    cursor.execute("""
        UPDATE properties SET
            admin_approved = 0,
            admin_reviewed = 1,
            admin_notes = ?,
            admin_reviewed_at = ?,
            verification_status = 'rejected',
            is_verified = 0,
            is_listed = 0
        WHERE id = ?
    """, (f"Rejected: {reason}. {notes or ''}", datetime.now().isoformat(), property_id))
    
    # Update verification request
    cursor.execute("""
        UPDATE verification_requests SET
            admin_approved = 0,
            status = 'rejected',
            final_verdict = 'rejected',
            rejection_reason = ?
        WHERE property_id = ?
    """, (reason, property_id))
    
    # Log the rejection
    cursor.execute("""
        INSERT INTO property_logs (property_id, action, description, performed_by, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        property_id,
        "admin_rejected",
        f"Property rejected: {reason}",
        "admin",
        datetime.now().isoformat(),
        json.dumps({"reason": reason, "notes": notes})
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": "Property rejected",
        "property_id": property_id,
        "reason": reason
    }


@app.post("/properties/{property_id}/verify-cracks-gemini")
async def verify_cracks_with_gemini(property_id: int, api_key: Optional[str] = Form(None)):
    """Use Gemini AI to verify if detected cracks are real or decorative patterns"""
    if not GEMINI_AVAILABLE:
        raise HTTPException(status_code=503, detail="Gemini verifier not available")
    
    key = api_key or GEMINI_API_KEY
    if not key:
        raise HTTPException(status_code=400, detail="Gemini API key required. Provide via form or set GEMINI_API_KEY env var")
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Get property photos
    cursor.execute("SELECT photos, ai_crack_detected FROM properties WHERE id = ?", (property_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Property not found")
    
    photos = json.loads(row["photos"]) if row["photos"] else []
    if not photos:
        conn.close()
        raise HTTPException(status_code=400, detail="No photos to analyze")
    
    # Convert photo URLs to file paths
    photo_paths = []
    for photo_url in photos:
        photo_path = photo_url.replace("/uploads/", UPLOAD_DIR + "/")
        if os.path.exists(photo_path):
            photo_paths.append(photo_path)
    
    if not photo_paths:
        conn.close()
        raise HTTPException(status_code=400, detail="No valid photo files found")
    
    # Run Gemini analysis
    result = verify_property_images(photo_paths, key)
    
    # Update property with Gemini results
    cursor.execute("""
        UPDATE properties SET
            gemini_crack_verified = 1,
            gemini_crack_is_real = ?,
            gemini_crack_description = ?,
            gemini_crack_severity = ?,
            gemini_confidence = ?
        WHERE id = ?
    """, (
        1 if result["has_real_crack"] else 0,
        result.get("recommendation", ""),
        result.get("max_severity", "none"),
        0.9 if result["has_real_crack"] else 0.85,
        property_id
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "property_id": property_id,
        "gemini_analysis": result
    }


@app.get("/admin/stats")
async def get_admin_stats():
    """Get admin dashboard statistics"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Count pending approvals
    cursor.execute("SELECT COUNT(*) FROM properties WHERE admin_approved = 0 AND verification_status IN ('document_review', 'pending_admin_approval', 'inspection_complete')")
    pending_count = cursor.fetchone()[0]
    
    # Count approved listings
    cursor.execute("SELECT COUNT(*) FROM properties WHERE admin_approved = 1 AND is_listed = 1")
    approved_count = cursor.fetchone()[0]
    
    # Count rejected
    cursor.execute("SELECT COUNT(*) FROM properties WHERE verification_status = 'rejected'")
    rejected_count = cursor.fetchone()[0]
    
    # Total properties
    cursor.execute("SELECT COUNT(*) FROM properties")
    total_count = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "pending_approval": pending_count,
        "approved_listings": approved_count,
        "rejected": rejected_count,
        "total_properties": total_count
    }


# ==================== Activity Logging ====================

def log_property_activity(property_id: int, action: str, description: str, performed_by: str = "system", metadata: dict = None):
    """Helper function to log property activities"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO property_logs (property_id, action, description, performed_by, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        property_id,
        action,
        description,
        performed_by,
        datetime.now().isoformat(),
        json.dumps(metadata) if metadata else None
    ))
    conn.commit()
    conn.close()


@app.get("/properties/{property_id}/logs")
async def get_property_logs(property_id: int):
    """Get activity timeline for a property"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM property_logs 
        WHERE property_id = ? 
        ORDER BY timestamp DESC
    """, (property_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    logs = []
    for row in rows:
        logs.append({
            "id": row["id"],
            "action": row["action"],
            "description": row["description"],
            "performed_by": row["performed_by"],
            "timestamp": row["timestamp"],
            "metadata": json.loads(row["metadata"]) if row["metadata"] else None
        })
    
    return {"property_id": property_id, "logs": logs}


# ==================== Legal Documents ====================

DOCUMENTS_DIR = os.path.join(SCRIPT_DIR, "documents")
os.makedirs(DOCUMENTS_DIR, exist_ok=True)

DOCUMENT_TYPES = ["patta", "sale_deed", "ec", "khata", "tax_receipt", "other"]


@app.post("/properties/{property_id}/upload-documents")
async def upload_property_documents(property_id: int, document_type: str = Form(...), files: List[UploadFile] = File(...)):
    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {DOCUMENT_TYPES}")

    conn = get_db()
    cursor = conn.cursor()

    # Verify property exists
    cursor.execute("SELECT * FROM properties WHERE id = ?", (property_id,))
    prop = cursor.fetchone()
    if not prop:
        conn.close()
        raise HTTPException(status_code=404, detail="Property not found")

    saved_files = []
    property_docs_dir = os.path.join(DOCUMENTS_DIR, str(property_id))
    os.makedirs(property_docs_dir, exist_ok=True)
    
    for file in files:
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{document_type}_{uuid.uuid4().hex[:8]}{file_ext}"
        file_path = os.path.join(property_docs_dir, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Save to DB - using relative path for storage
        cursor.execute("""
            INSERT INTO legal_documents (property_id, document_type, original_filename, file_path, uploaded_at)
            VALUES (?, ?, ?, ?, ?)
        """, (property_id, document_type, file.filename, f"/documents/{property_id}/{unique_filename}", datetime.now().isoformat()))
        
        saved_files.append(file_path)

    # Check if all required documents are uploaded to auto-advance status
    required_docs = {'patta', 'sale_deed', 'ec', 'tax_receipt'}
    cursor.execute("SELECT DISTINCT document_type FROM legal_documents WHERE property_id = ?", (property_id,))
    existing_docs = {row['document_type'] for row in cursor.fetchall()}
    
    # Also include the one just uploaded (though it should be in DB now)
    existing_docs.add(document_type) 
    
    status_advanced = False
    if required_docs.issubset(existing_docs):
        # All docs uploaded -> Move to Pending Admin Approval
        cursor.execute("""
            UPDATE properties 
            SET verification_status = 'pending_admin_approval' 
            WHERE id = ? AND verification_status = 'document_review'
        """, (property_id,))
        if cursor.rowcount > 0:
            status_advanced = True

    conn.commit()
    conn.close()

    # Log activities AFTER connection is closed to avoid database locks
    try:
        log_property_activity(property_id, "document_upload", f"Uploaded document: {document_type}", "user")
        if status_advanced:
            log_property_activity(property_id, "status_update", "All documents submitted. Pending Admin Review.", "system")
    except Exception as e:
        print(f"Warning: Failed to log activity: {e}")

    return {"message": "Documents uploaded successfully", "files": [f"/documents/{property_id}/{os.path.basename(f)}" for f in saved_files]}


@app.get("/properties/{property_id}/documents")
async def get_property_documents(property_id: int):
    """Get all legal documents for a property"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM legal_documents 
        WHERE property_id = ? 
        ORDER BY uploaded_at DESC
    """, (property_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    documents = []
    for row in rows:
        documents.append({
            "id": row["id"],
            "document_type": row["document_type"],
            "original_filename": row["original_filename"],
            "file_path": row["file_path"],
            "uploaded_at": row["uploaded_at"],
            "verified": bool(row["verified"]),
            "verified_by": row["verified_by"],
            "notes": row["notes"]
        })
    
    # Group by document type
    grouped = {}
    for doc in documents:
        doc_type = doc["document_type"]
        if doc_type not in grouped:
            grouped[doc_type] = []
        grouped[doc_type].append(doc)
    
    return {
        "property_id": property_id,
        "documents": documents,
        "grouped": grouped,
        "document_types": DOCUMENT_TYPES
    }


@app.get("/user/{user_email}/properties")
async def get_user_properties_with_logs(user_email: str):
    """Get all properties for a user with their activity logs"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all properties for this user
    cursor.execute("""
        SELECT * FROM properties 
        WHERE seller_email = ? 
        ORDER BY created_at DESC
    """, (user_email,))
    
    properties = cursor.fetchall()
    
    result = []
    for prop in properties:
        property_id = prop["id"]
        
        # Get logs for this property
        cursor.execute("""
            SELECT * FROM property_logs 
            WHERE property_id = ? 
            ORDER BY timestamp DESC
            LIMIT 10
        """, (property_id,))
        logs = cursor.fetchall()
        
        # Get documents for this property
        cursor.execute("""
            SELECT document_type, COUNT(*) as count 
            FROM legal_documents 
            WHERE property_id = ? 
            GROUP BY document_type
        """, (property_id,))
        docs = cursor.fetchall()
        
        result.append({
            "id": prop["id"],
            "title": prop["title"],
            "property_type": prop["property_type"],
            "listing_type": prop["listing_type"],
            "city": prop["city"],
            "state": prop["state"],
            "price": prop["price"],
            "verification_status": prop["verification_status"],
            "verification_tier": prop["verification_tier"],
            "is_verified": bool(prop["is_verified"]),
            "is_listed": bool(prop["is_listed"]),
            "admin_approved": bool(prop["admin_approved"]),
            "photos": json.loads(prop["photos"]) if prop["photos"] else [],
            "created_at": prop["created_at"],
            "recent_logs": [
                {
                    "action": log["action"],
                    "description": log["description"],
                    "performed_by": log["performed_by"],
                    "timestamp": log["timestamp"]
                }
                for log in logs
            ],
            "documents_summary": {doc["document_type"]: doc["count"] for doc in docs}
        })
    
    conn.close()
    
    return {
        "user_email": user_email,
        "property_count": len(result),
        "properties": result
    }


# Mount documents directory for serving files
app.mount("/documents", StaticFiles(directory=DOCUMENTS_DIR), name="documents")

