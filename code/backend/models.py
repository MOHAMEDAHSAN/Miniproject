"""
VisionEstate - Property Verification Models
SQLite database with Pydantic models for property listings and verification workflow.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime
import sqlite3
import json
import os

# Database setup - use absolute path based on script directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "visionestate.db")

def get_db():
    """Get database connection with proper error handling"""
    try:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise

def init_db():
    """Initialize database tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Properties table - with admin approval fields
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_name TEXT NOT NULL,
            seller_email TEXT NOT NULL,
            seller_phone TEXT NOT NULL,
            
            property_type TEXT NOT NULL,
            listing_type TEXT NOT NULL,
            
            title TEXT NOT NULL,
            description TEXT,
            
            address TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            pincode TEXT NOT NULL,
            
            claimed_area REAL,
            claimed_width REAL,
            claimed_length REAL,
            bedrooms INTEGER,
            bathrooms INTEGER,
            
            price REAL NOT NULL,
            
            photos TEXT,
            documents TEXT,
            
            verification_tier TEXT DEFAULT 'basic',
            verification_status TEXT DEFAULT 'pending',
            verification_id INTEGER,
            
            ai_estimated_area REAL,
            ai_room_type TEXT,
            ai_confidence REAL,
            ai_crack_detected INTEGER DEFAULT 0,
            ai_discrepancy_flag INTEGER DEFAULT 0,
            ai_discrepancy_details TEXT,
            
            -- Gemini AI crack verification fields
            gemini_crack_verified INTEGER DEFAULT 0,
            gemini_crack_is_real INTEGER DEFAULT 0,
            gemini_crack_description TEXT,
            gemini_crack_severity TEXT,
            gemini_confidence REAL,
            
            -- Admin approval fields
            admin_approved INTEGER DEFAULT 0,
            admin_reviewed INTEGER DEFAULT 0,
            admin_notes TEXT,
            admin_reviewed_at TEXT,
            admin_reviewed_by TEXT,
            
            inspector_id INTEGER,
            inspection_date TEXT,
            inspection_report TEXT,
            
            is_verified INTEGER DEFAULT 0,
            is_listed INTEGER DEFAULT 0,
            
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Verification requests table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS verification_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            tier TEXT DEFAULT 'basic',
            
            ai_analysis_complete INTEGER DEFAULT 0,
            ai_analysis_result TEXT,
            
            document_verified INTEGER DEFAULT 0,
            document_notes TEXT,
            
            inspector_assigned INTEGER,
            inspector_name TEXT,
            inspection_scheduled TEXT,
            inspection_complete INTEGER DEFAULT 0,
            inspection_result TEXT,
            
            final_verdict TEXT,
            rejection_reason TEXT,
            
            payment_status TEXT DEFAULT 'pending',
            payment_amount REAL,
            payment_id TEXT,
            
            -- Admin review tracking
            pending_admin_review INTEGER DEFAULT 0,
            admin_approved INTEGER DEFAULT 0,
            
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (property_id) REFERENCES properties(id)
        )
    """)
    
    # Inspectors table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inspectors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            city TEXT NOT NULL,
            available INTEGER DEFAULT 1,
            total_inspections INTEGER DEFAULT 0
        )
    """)
    
    # Admin users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            role TEXT DEFAULT 'reviewer',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Add sample inspectors
    cursor.execute("SELECT COUNT(*) FROM inspectors")
    if cursor.fetchone()[0] == 0:
        sample_inspectors = [
            ("Rajesh Kumar", "rajesh@visionestate.com", "9876543210", "Mumbai"),
            ("Priya Sharma", "priya@visionestate.com", "9876543211", "Delhi"),
            ("Amit Patel", "amit@visionestate.com", "9876543212", "Bangalore"),
        ]
        cursor.executemany(
            "INSERT INTO inspectors (name, email, phone, city) VALUES (?, ?, ?, ?)",
            sample_inspectors
        )
    
    # Add default admin
    cursor.execute("SELECT COUNT(*) FROM admins")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO admins (username, email, role) VALUES (?, ?, ?)",
            ("admin", "admin@visionestate.com", "superadmin")
        )
    
    # Property activity logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS property_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            description TEXT,
            performed_by TEXT DEFAULT 'system',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT,
            FOREIGN KEY (property_id) REFERENCES properties(id)
        )
    """)
    
    # Legal documents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS legal_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_id INTEGER NOT NULL,
            document_type TEXT NOT NULL,
            original_filename TEXT,
            file_path TEXT NOT NULL,
            uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
            verified INTEGER DEFAULT 0,
            verified_by TEXT,
            verified_at TEXT,
            notes TEXT,
            FOREIGN KEY (property_id) REFERENCES properties(id)
        )
    """)
    
    conn.commit()
    conn.close()


# Enums
class PropertyType(str, Enum):
    HOUSE = "house"
    APARTMENT = "apartment"
    LAND = "land"
    COMMERCIAL = "commercial"
    VILLA = "villa"

class ListingType(str, Enum):
    SALE = "sale"
    RENT = "rent"

class VerificationTier(str, Enum):
    STANDARD = "standard"    # ₹1000 - Unified verification (AI + Documents + Admin Review)

class VerificationStatus(str, Enum):
    PENDING = "pending"
    AI_ANALYZING = "ai_analyzing"
    AI_COMPLETE = "ai_complete"
    AWAITING_PAYMENT = "awaiting_payment"
    DOCUMENT_REVIEW = "document_review"
    INSPECTOR_ASSIGNED = "inspector_assigned"
    INSPECTION_SCHEDULED = "inspection_scheduled"
    INSPECTION_COMPLETE = "inspection_complete"
    PENDING_ADMIN_APPROVAL = "pending_admin_approval"  # New status
    VERIFIED = "verified"
    REJECTED = "rejected"
    RESUBMIT_REQUIRED = "resubmit_required"


# Pydantic Models
class PropertySubmission(BaseModel):
    """Initial property submission from seller"""
    seller_name: str
    seller_email: str
    seller_phone: str
    property_type: PropertyType
    listing_type: ListingType
    title: str
    description: Optional[str] = None
    address: str
    city: str
    state: str
    pincode: str
    claimed_area: Optional[float] = None
    claimed_width: Optional[float] = None
    claimed_length: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    price: float
    verification_tier: VerificationTier = VerificationTier.STANDARD


class AIAnalysisResult(BaseModel):
    """Result from AI analysis"""
    estimated_area: float
    room_type: str
    room_confidence: float
    area_confidence: float
    crack_detected: bool
    crack_count: int = 0
    objects_detected: List[str] = []
    estimation_method: str
    reference_object: Optional[str] = None


class GeminiCrackAnalysis(BaseModel):
    """Result from Gemini crack verification"""
    is_real_crack: bool
    confidence: float
    description: str
    severity: str  # none, minor, moderate, severe
    recommendation: str


class DiscrepancyReport(BaseModel):
    """Report on discrepancies between claimed and detected values"""
    has_discrepancy: bool
    area_discrepancy_percent: Optional[float] = None
    dimension_issues: List[str] = []
    condition_issues: List[str] = []
    severity: str = "none"
    recommendation: str = ""


class PropertyResponse(BaseModel):
    """Property data returned to frontend"""
    id: int
    seller_name: str
    seller_phone: Optional[str] = None
    property_type: str
    listing_type: str
    title: str
    description: Optional[str]
    address: str
    city: str
    state: str
    pincode: str
    claimed_area: Optional[float]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    price: float
    photos: List[str]
    verification_tier: str
    verification_status: str
    is_verified: bool
    is_listed: bool
    admin_approved: bool
    ai_estimated_area: Optional[float]
    ai_room_type: Optional[str]
    ai_confidence: Optional[float]
    ai_crack_detected: bool
    gemini_crack_verified: bool
    gemini_crack_is_real: bool
    ai_discrepancy_flag: bool
    created_at: str


class VerificationStatusResponse(BaseModel):
    """Verification status for tracking"""
    property_id: int
    status: str
    tier: str
    ai_complete: bool
    document_verified: bool
    inspector_assigned: bool
    inspection_complete: bool
    admin_approved: bool
    final_verdict: Optional[str]
    rejection_reason: Optional[str]
    payment_status: str
    payment_amount: Optional[float]
    steps_completed: List[str]
    next_step: str
    estimated_time: str


class AdminApprovalRequest(BaseModel):
    """Admin approval/rejection request"""
    approved: bool
    notes: Optional[str] = None
    admin_username: str = "admin"


# Tier pricing - Unified ₹1000 verification fee
TIER_PRICING = {
    VerificationTier.STANDARD: 1000,
}


# Initialize database on module load
init_db()
