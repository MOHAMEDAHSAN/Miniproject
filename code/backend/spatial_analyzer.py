import cv2
import torch
import numpy as np
from ultralytics import YOLO

# Load Vision Models
obj_model = YOLO('yolov8n.pt')
crack_model = YOLO('crack.pt')

# Load MiDaS
model_type = "MiDaS_small"
device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
midas = torch.hub.load("intel-isl/MiDaS", model_type, trust_repo=True).to(device).eval()
midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)

def find_a4_calibration(img):
    """
    Robust A4 detection from scratch using Lightness isolation, 
    texture variance filtering, and geometric solidity checks.
    """
    h_img, w_img = img.shape[:2]
    
    # 1. Convert to LAB and isolate L (Lightness)
    # This is better than Grayscale for finding white objects in shadows
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, _, _ = cv2.split(lab)
    
    # 2. Smooth the floor texture while keeping paper edges sharp
    blurred = cv2.bilateralFilter(l_channel, 9, 75, 75)
    
    # 3. Morphological Gradient: Highlights the boundary of the paper
    kernel = np.ones((5,5), np.uint8)
    gradient = cv2.morphologyEx(blurred, cv2.MORPH_GRADIENT, kernel)
    
    # 4. Otsu's Thresholding: Automatically finds the best "white vs dark" split
    _, thresh = cv2.threshold(gradient, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # 5. Close gaps in the paper border
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Check area: A4 should be significant but not the whole frame (0.5% to 20%)
        if area < (h_img * w_img * 0.005) or area > (h_img * w_img * 0.2):
            continue
            
        # 6. Geometric Shape Check
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        
        if len(approx) == 4:
            rect = cv2.minAreaRect(cnt)
            (cx, cy), (rw, rh), angle = rect
            if min(rw, rh) == 0: continue
            
            aspect = max(rw, rh) / min(rw, rh)
            
            # 7. Texture & Brightness Verification (The "Anti-Laptop" Filter)
            mask = np.zeros(l_channel.shape, dtype=np.uint8)
            cv2.drawContours(mask, [cnt], -1, 255, -1)
            mean_val, std_dev = cv2.meanStdDev(l_channel, mask=mask)
            
            # - Paper is bright (mean_val > 180)
            # - Paper is flat/smooth (std_dev < 20). Laptops have high variance due to keys/pixels.
            if mean_val[0][0] < 170 or std_dev[0][0] > 25:
                continue

            # 8. Solidity Check (How much it fills its own bounding box)
            solidity = area / (rw * rh)
            if solidity < 0.85: continue # A4 is a solid rectangle

            # Score based on how close it is to A4 aspect ratio (1.414)
            score = 1.0 - abs(aspect - 1.414)
            candidates.append({'approx': approx, 'score': score, 'rect': rect})

    if not candidates:
        return None, None

    # Pick the best candidate (usually the brightest and most rectangular)
    best = max(candidates, key=lambda x: x['score'])
    rect = best['rect']
    
    # Calibration scale (A4 long side is 0.297m)
    m_per_px = 0.297 / max(rect[1])
    
    x, y, w, h = cv2.boundingRect(best['approx'])
    return float(m_per_px), [float(x), float(y), float(w), float(h)]
    return None, None

def analyze_frame(img_path):
    img = cv2.imread(img_path)
    if img is None: return None
    h_orig, w_orig = img.shape[:2]
    
    # 1. Calibration
    m_per_px, a4_bbox = find_a4_calibration(img)
    
    # 2. MiDaS Depth
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    input_batch = midas_transforms.small_transform(img_rgb).to(device)
    with torch.no_grad():
        prediction = midas(input_batch)
        prediction = torch.nn.functional.interpolate(
            prediction.unsqueeze(1), size=(h_orig, w_orig), mode="bicubic"
        ).squeeze()
    depth_map = prediction.cpu().numpy()

    # 3. Detections
    all_results = []
    if a4_bbox:
        all_results.append({"label": "A4 Reference", "bbox": a4_bbox, "isCrack": False, "isCalibration": True})

    crack_res = crack_model.predict(img, conf=0.15, verbose=False)
    max_crack_px = 0
    for r in crack_res:
        for box in r.boxes:
            b = box.xyxy[0].tolist()
            bw, bh = b[2]-b[0], b[3]-b[1]
            max_crack_px = max(max_crack_px, bw, bh)
            all_results.append({"label": "Crack", "bbox": [b[0], b[1], bw, bh], "isCrack": True, "isCalibration": False})

    # 4. Spatial Logic (Unified)
    # If we have A4, use it. Otherwise, fallback to MiDaS relative scaling.
    if m_per_px:
        width = w_orig * m_per_px
        length = (np.max(depth_map) - np.min(depth_map)) * 0.05 # Depth scaling
    else:
        width = w_orig / 100
        length = (np.max(depth_map) - np.min(depth_map)) * 0.1

    spatial_data = {
        "width": round(float(width), 2),
        "height": round(float(h_orig / 100), 2),
        "length": round(float(length), 2),
        "area": round(float(width * length), 2)
    }

    return all_results, spatial_data, m_per_px is not None