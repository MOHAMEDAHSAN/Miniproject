"""
VisionEstate - Gemini AI Crack Verification
Uses Google Gemini Vision API to verify if detected cracks are real or decorative patterns.
"""

import os
import base64
import json
from typing import Optional, Tuple
import google.generativeai as genai
from PIL import Image
import io

# Load API key from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def configure_gemini(api_key: str = None):
    """Configure Gemini API with the provided key"""
    key = api_key or GEMINI_API_KEY
    if not key:
        raise ValueError("Gemini API key not provided. Set GEMINI_API_KEY environment variable.")
    genai.configure(api_key=key)
    return True


def analyze_crack_with_gemini(image_path: str, api_key: str = None) -> dict:
    """
    Use Gemini Vision to analyze if a detected crack is real or a decorative pattern.
    
    Args:
        image_path: Path to the image file
        api_key: Optional Gemini API key (uses env var if not provided)
    
    Returns:
        dict with crack analysis results
    """
    try:
        # Configure Gemini
        configure_gemini(api_key)
        
        # Load and prepare image
        img = Image.open(image_path)
        
        # Use Gemini Pro Vision model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Craft the prompt for crack analysis
        prompt = """Analyze this property image carefully. I need you to determine:

1. Are there any cracks or structural defects visible in this image?
2. If there are lines or patterns on the walls/surfaces, are they:
   - REAL CRACKS (structural issues, damage, wear)
   - DECORATIVE DESIGNS (intentional patterns, wallpaper designs, tiles, artistic elements)
   - NATURAL TEXTURES (wood grain, stone patterns, etc.)

Please respond in the following JSON format:
{
    "is_real_crack": true/false,
    "confidence": 0.0 to 1.0,
    "description": "Brief description of what you see",
    "severity": "none" / "minor" / "moderate" / "severe",
    "crack_type": "structural" / "surface" / "decorative" / "none",
    "recommendation": "What action should be taken"
}

Be conservative - only mark as a real crack if you are confident it's structural damage, not a design element.
"""
        
        # Generate response
        response = model.generate_content([prompt, img])
        
        # Parse the response
        response_text = response.text
        
        # Try to extract JSON from response
        try:
            # Find JSON in response
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start != -1 and end > start:
                json_str = response_text[start:end]
                result = json.loads(json_str)
            else:
                # Fallback parsing
                result = {
                    "is_real_crack": False,
                    "confidence": 0.5,
                    "description": response_text[:200],
                    "severity": "none",
                    "crack_type": "none",
                    "recommendation": "Manual review recommended"
                }
        except json.JSONDecodeError:
            result = {
                "is_real_crack": False,
                "confidence": 0.5,
                "description": response_text[:200] if response_text else "Could not parse response",
                "severity": "none",
                "crack_type": "none",
                "recommendation": "Manual review recommended"
            }
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": {
                "is_real_crack": False,
                "confidence": 0.0,
                "description": f"Gemini analysis failed: {str(e)}",
                "severity": "unknown",
                "crack_type": "unknown",
                "recommendation": "Manual inspection required"
            }
        }


def verify_property_images(image_paths: list, api_key: str = None) -> dict:
    """
    Analyze multiple property images for cracks using Gemini.
    
    Args:
        image_paths: List of paths to image files
        api_key: Optional Gemini API key
    
    Returns:
        Aggregated analysis results
    """
    results = []
    has_real_crack = False
    max_severity = "none"
    severity_order = {"none": 0, "minor": 1, "moderate": 2, "severe": 3}
    
    for path in image_paths:
        if os.path.exists(path):
            result = analyze_crack_with_gemini(path, api_key)
            results.append({
                "image": os.path.basename(path),
                "analysis": result
            })
            
            if result["success"] and result["data"].get("is_real_crack"):
                has_real_crack = True
                img_severity = result["data"].get("severity", "none")
                if severity_order.get(img_severity, 0) > severity_order.get(max_severity, 0):
                    max_severity = img_severity
    
    return {
        "images_analyzed": len(results),
        "has_real_crack": has_real_crack,
        "max_severity": max_severity,
        "detailed_results": results,
        "recommendation": get_recommendation(has_real_crack, max_severity)
    }


def get_recommendation(has_crack: bool, severity: str) -> str:
    """Generate recommendation based on crack analysis"""
    if not has_crack:
        return "No structural issues detected. Property appears to be in good condition."
    
    if severity == "minor":
        return "Minor surface cracks detected. Regular maintenance recommended."
    elif severity == "moderate":
        return "Moderate cracks detected. Professional inspection recommended before purchase."
    elif severity == "severe":
        return "Severe structural issues detected. Immediate professional assessment required."
    else:
        return "Cracks detected. Further inspection may be needed."


# Quick test function
if __name__ == "__main__":
    # Test with a sample image
    print("Gemini Crack Verifier - Ready")
    print("Set GEMINI_API_KEY environment variable before using.")
