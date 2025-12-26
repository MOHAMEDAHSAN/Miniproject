import cv2
import torch
import numpy as np
from ultralytics import YOLO
import os
from PIL import Image

# Room type detection (CLIP/ViT zero-shot)
from transformers import CLIPProcessor, CLIPModel

# Load CLIP model for room type detection (only once)
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch16")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")

# Room type labels for zero-shot
ROOM_TYPE_LABELS = [
    "a bedroom",
    "a living room",
    "a kitchen",
    "a bathroom",
    "an office"
]

# Reference object dimensions in meters (width, height) - using typical sizes
# These are used to estimate scale when detected in images
REFERENCE_OBJECTS = {
    "bed": {"width": 1.9, "height": 0.5, "priority": 1},
    "couch": {"width": 2.0, "height": 0.85, "priority": 2},
    "sofa": {"width": 2.0, "height": 0.85, "priority": 2},
    "chair": {"width": 0.45, "height": 0.9, "priority": 4},
    "dining table": {"width": 1.2, "height": 0.75, "priority": 3},
    "refrigerator": {"width": 0.7, "height": 1.7, "priority": 2},
    "tv": {"width": 1.2, "height": 0.7, "priority": 5},
    "door": {"width": 0.9, "height": 2.1, "priority": 1},
    "toilet": {"width": 0.4, "height": 0.4, "priority": 3},
    "oven": {"width": 0.6, "height": 0.9, "priority": 4},
    "sink": {"width": 0.6, "height": 0.2, "priority": 5},
}

# Load Vision Models
obj_model = YOLO('yolov8n.pt')
crack_model = YOLO('crack.pt')

# Load MiDaS for Depth
model_type = "MiDaS_small"
device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
midas = torch.hub.load("intel-isl/MiDaS", model_type, trust_repo=True).to(device).eval()
midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)


def find_a4_calibration(img):
    """
    Robust A4 detection using multiple techniques with fallback strategies.
    Optimized for WHITE A4 paper detection.
    """
    h_img, w_img = img.shape[:2]
    
    # Convert to LAB color space (best for brightness detection)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, _, _ = cv2.split(lab)
    
    # Also get HSV for saturation checking (helps reject colored objects)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Use adaptive thresholding for better results in varying lighting
    blurred = cv2.GaussianBlur(l_channel, (5, 5), 0)
    
    # Try both Otsu and adaptive thresholding
    _, thresh1 = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thresh2 = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                     cv2.THRESH_BINARY, 11, 2)
    
    # Combine both methods
    thresh = cv2.bitwise_or(thresh1, thresh2)
    
    # Morphological operations to clean up
    kernel = np.ones((5, 5), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        
        # More lenient area check (0.3% to 30% of image)
        min_area = h_img * w_img * 0.003
        max_area = h_img * w_img * 0.3
        
        if area < min_area or area > max_area:
            continue
        
        # Approximate contour to polygon
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
        
        # Accept 4-6 sided shapes (more lenient for imperfect detection)
        if len(approx) < 4 or len(approx) > 6:
            continue
        
        # Get minimum area rectangle
        rect = cv2.minAreaRect(cnt)
        (cx, cy), (rw, rh), angle = rect
        
        if min(rw, rh) == 0:
            continue
        
        # A4 aspect ratio is 1.414 (√2), but be lenient (1.2 to 1.7)
        aspect = max(rw, rh) / min(rw, rh)
        if aspect < 1.2 or aspect > 1.7:
            continue
        
        # Check if it's WHITE paper (brightness + low saturation)
        mask = np.zeros(l_channel.shape, dtype=np.uint8)
        cv2.drawContours(mask, [cnt], -1, 255, -1)
        mean_val, std_dev = cv2.meanStdDev(l_channel, mask=mask)
        mean_sat = cv2.mean(hsv[:,:,1], mask=mask)[0]
        
        # White paper should be bright (>140) and have low saturation (<40)
        if mean_val[0][0] < 140:
            continue
        
        # Reject highly saturated colored objects
        if mean_sat > 40:
            continue
        
        # Calculate solidity (how much it fills its convex hull)
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        if hull_area > 0:
            solidity = area / hull_area
        else:
            solidity = 0
        
        # More lenient solidity check
        if solidity < 0.75:
            continue
        
        # Score based on multiple factors
        aspect_score = 1.0 - abs(aspect - 1.414) / 1.414
        brightness_score = min(mean_val[0][0] / 255.0, 1.0)
        solidity_score = solidity
        area_score = min(area / (h_img * w_img * 0.1), 1.0)
        saturation_score = 1.0 - (mean_sat / 100)  # Lower saturation = higher score
        
        total_score = (aspect_score * 0.35 + 
                      brightness_score * 0.25 + 
                      solidity_score * 0.2 + 
                      saturation_score * 0.15 +
                      area_score * 0.05)
        
        candidates.append({
            'approx': approx,
            'score': total_score,
            'rect': rect,
            'area': area,
            'contour': cnt
        })
    
    if not candidates:
        # Fallback: Try detecting the brightest large rectangular region
        _, bright_thresh = cv2.threshold(l_channel, 200, 255, cv2.THRESH_BINARY)
        bright_contours, _ = cv2.findContours(bright_thresh, cv2.RETR_EXTERNAL, 
                                               cv2.CHAIN_APPROX_SIMPLE)
        
        for cnt in bright_contours:
            area = cv2.contourArea(cnt)
            if area > h_img * w_img * 0.003:
                peri = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
                
                if len(approx) >= 4:
                    rect = cv2.minAreaRect(cnt)
                    (cx, cy), (rw, rh), angle = rect
                    
                    if min(rw, rh) > 0:
                        aspect = max(rw, rh) / min(rw, rh)
                        if 1.2 <= aspect <= 1.7:
                            candidates.append({
                                'approx': approx,
                                'score': 0.5,
                                'rect': rect,
                                'area': area,
                                'contour': cnt
                            })
    
    if not candidates:
        print("No A4 paper detected in image")
        return None, None
    
    # Pick the best candidate
    best = max(candidates, key=lambda x: x['score'])
    rect = best['rect']
    
    # Calculate calibration scale
    # A4 paper dimensions: 210mm x 297mm (0.21m x 0.297m)
    long_side_px = max(rect[1])
    short_side_px = min(rect[1])
    
    # Use the long side for calibration (297mm)
    m_per_px = 0.297 / long_side_px
    
    # Get bounding box from the actual contour for more accuracy
    x, y, w, h = cv2.boundingRect(best['contour'])
    
    print(f"✓ A4 detected! Score: {best['score']:.3f}")
    print(f"  Detected size: {long_side_px:.1f}px × {short_side_px:.1f}px")
    print(f"  Scale: {m_per_px:.6f} m/px ({1/m_per_px:.2f} px/m)")
    print(f"  Calibration based on 297mm (A4 long side)")
    
    return float(m_per_px), [float(x), float(y), float(w), float(h)]


def estimate_scale_from_reference_objects(detections, img_width, img_height):
    """
    Estimate meters-per-pixel using detected reference objects.
    Returns (m_per_px, reference_object_used, confidence)
    """
    best_reference = None
    best_priority = 999
    best_m_per_px = None
    
    for det in detections:
        label = det.get("label", "").lower()
        bbox = det.get("bbox", [])
        
        if len(bbox) < 4:
            continue
            
        # Check if this object is a known reference
        for ref_name, ref_data in REFERENCE_OBJECTS.items():
            if ref_name in label:
                bbox_width_px = bbox[2]  # width in pixels
                bbox_height_px = bbox[3]  # height in pixels
                
                # Use the larger dimension for more reliable estimation
                if bbox_width_px > bbox_height_px:
                    # Object appears wider - use width for scale
                    m_per_px = ref_data["width"] / bbox_width_px
                else:
                    # Object appears taller - use height for scale
                    m_per_px = ref_data["height"] / bbox_height_px
                
                # Check if this is a better (higher priority) reference
                if ref_data["priority"] < best_priority:
                    best_priority = ref_data["priority"]
                    best_reference = ref_name
                    best_m_per_px = m_per_px
                break
    
    if best_m_per_px is not None:
        # Confidence based on priority (1 = highest confidence)
        confidence = max(0.5, 1.0 - (best_priority - 1) * 0.1)
        print(f"✓ Reference object detected: {best_reference}")
        print(f"  Scale: {best_m_per_px:.6f} m/px (confidence: {confidence*100:.1f}%)")
        return best_m_per_px, best_reference, confidence
    
    return None, None, 0.0


def detect_defects(img_path):
    img = cv2.imread(img_path)
    if img is None:
        return [], {
            "width": 0.0, "height": 0.0, "length": 0.0, "area": 0.0,
            "room_type": "unknown", "room_confidence": 0.0,
            "reference_object": None
        }, False, [0, 0]
    
    h_orig, w_orig = img.shape[:2]
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    print(f"\nProcessing image: {img_path}")
    print(f"Image size: {w_orig}px × {h_orig}px")
    
    # --- 1. Room Type Detection ---
    print("\n[1/4] Room type detection...")
    pil_img = Image.fromarray(img_rgb)
    inputs = clip_processor(text=ROOM_TYPE_LABELS, images=pil_img, return_tensors="pt", padding=True)
    with torch.no_grad():
        outputs = clip_model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1).cpu().numpy()[0]
    
    best_idx = int(np.argmax(probs))
    room_type_raw = ROOM_TYPE_LABELS[best_idx]
    room_type = room_type_raw.replace("a ", "").replace("an ", "").strip().title()
    room_confidence = float(probs[best_idx])
    print(f"  Room type: {room_type} (confidence: {room_confidence*100:.1f}%)")
    
    # --- 2. Calibration (A4 first) ---
    print("\n[2/4] Calibration...")
    m_per_px, a4_bbox = find_a4_calibration(img)
    is_calibrated = m_per_px is not None
    
    all_results = []
    reference_object = None
    
    if is_calibrated:
        all_results.append({
            "label": "A4 Reference",
            "confidence": 1.0,
            "bbox": a4_bbox,
            "isCrack": False,
            "isCalibration": True
        })
    else:
        print("⚠ Warning: No A4 reference found")
    
    # Add room type result
    all_results.append({
        "label": "Room Type",
        "room_type": room_type,
        "confidence": room_confidence,
        "isRoomType": True
    })
    
    # --- 3. Object Detection ---
    print("\n[3/4] Object detection...")
    object_detections = []
    try:
        obj_res = obj_model(img, verbose=False)
        for r in obj_res:
            for box in r.boxes:
                b = box.xyxy[0].tolist()
                det = {
                    "label": str(obj_model.names[int(box.cls)]),
                    "confidence": float(box.conf[0]),
                    "bbox": [b[0], b[1], b[2]-b[0], b[3]-b[1]],
                    "isCrack": False,
                    "isCalibration": False
                }
                object_detections.append(det)
                all_results.append(det)
        print(f"  Detected {len(object_detections)} object(s)")
    except Exception as e:
        print(f"  Object detection error: {e}")
    
    # --- Reference Object Calibration (fallback if no A4) ---
    if not is_calibrated:
        print("\n  Trying reference objects...")
        ref_m_per_px, reference_object, ref_confidence = estimate_scale_from_reference_objects(
            object_detections, w_orig, h_orig
        )
        if ref_m_per_px is not None:
            m_per_px = ref_m_per_px
            is_calibrated = True
    
    # --- 4. Crack Detection ---
    print("\n[4/4] Crack detection...")
    crack_res = crack_model.predict(source=img, conf=0.15, verbose=False)
    total_crack_pixel_area = 0
    max_crack_dim_px = 0
    crack_count = 0
    
    for r in crack_res:
        for box in r.boxes:
            b = box.xyxy[0].tolist()
            bw, bh = b[2]-b[0], b[3]-b[1]
            total_crack_pixel_area += (bw * bh)
            max_crack_dim_px = max(max_crack_dim_px, bw, bh)
            crack_count += 1
            
            all_results.append({
                "label": "Structural Crack",
                "confidence": float(box.conf[0]),
                "bbox": [b[0], b[1], bw, bh],
                "isCrack": True,
                "isCalibration": False
            })
    
    print(f"  Detected {crack_count} crack(s)")
    
    # --- 5. Spatial Measurements (ORIGINAL LOGIC) ---
    spatial_data = {
        "width": 0.0,
        "height": 0.0,
        "length": 0.0,
        "area": 0.0,
        "room_type": room_type,
        "room_confidence": round(room_confidence * 100, 1),
        "reference_object": reference_object
    }
    
    if is_calibrated:
        if total_crack_pixel_area > 0:
            # Real world crack measurements
            spatial_data["area"] = float(total_crack_pixel_area * (m_per_px ** 2))
            spatial_data["length"] = float(max_crack_dim_px * m_per_px)
            spatial_data["width"] = float((total_crack_pixel_area / max_crack_dim_px 
                                           if max_crack_dim_px > 0 else 0) * m_per_px)
            spatial_data["height"] = spatial_data["width"]
            
            print(f"\nCrack measurements (real world):")
            print(f"  Length: {spatial_data['length']*100:.2f} cm")
            print(f"  Width: {spatial_data['width']*100:.2f} cm")
            print(f"  Area: {spatial_data['area']*10000:.2f} cm²")
        else:
            # ORIGINAL: Simple floor area estimation (60% of image)
            floor_area_px = w_orig * h_orig * 0.6  # Estimate 60% is floor
            spatial_data["area"] = float(floor_area_px * (m_per_px ** 2))
            spatial_data["width"] = float(w_orig * m_per_px)
            spatial_data["length"] = float(h_orig * m_per_px * 0.8)  # Adjust for perspective
            spatial_data["height"] = 2.7  # Standard ceiling height
            
            print(f"\nEstimated floor area in view: {spatial_data['area']:.2f} m²")
            print(f"Dimensions: {spatial_data['width']:.2f}m × {spatial_data['length']:.2f}m × {spatial_data['height']:.2f}m")
    elif total_crack_pixel_area > 0:
        # Fallback to pixel measurements
        spatial_data["area"] = float(total_crack_pixel_area)
        spatial_data["length"] = float(max_crack_dim_px)
        spatial_data["width"] = float(total_crack_pixel_area / max_crack_dim_px 
                                     if max_crack_dim_px > 0 else 0)
        print(f"⚠ Using pixel measurements (no calibration)")
    
    print("\n" + "="*40 + "\n")
    
    return all_results, spatial_data, is_calibrated, [h_orig, w_orig]