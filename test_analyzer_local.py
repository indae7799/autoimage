import os
import sys
from PIL import Image
import io
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.image_analyzer import ImageAnalyzer

async def test_analyzer():
    load_dotenv()
    analyzer = ImageAnalyzer()
    
    image_paths = [
        r"c:\Users\jungindae\Downloads\상세페이지\33.png",
        r"c:\Users\jungindae\Downloads\상세페이지\55.png"
    ]
    
    image_files = []
    for p in image_paths:
        with open(p, "rb") as f:
            image_files.append(f.read())
            
    print(f"Testing analyzer with {len(image_files)} images...")
    try:
        result = analyzer.analyze_images(image_files)
        import json
        print("\n=== ANALYZER RESULT ===")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Analyzer failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_analyzer())
