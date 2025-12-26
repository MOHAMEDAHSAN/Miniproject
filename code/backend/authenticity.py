from PIL import Image
from PIL.ExifTags import TAGS

def get_image_metadata(img_path):  # <--- Make sure this name matches
    img = Image.open(img_path)
    exif = img._getexif()
    if not exif:
        return None, "No metadata found"
    
    data = {TAGS.get(tag): value for tag, value in exif.items() if tag in TAGS}
    timestamp = data.get("DateTimeOriginal")
    return data, timestamp