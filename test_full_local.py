import os
import sys
import json
import asyncio
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.image_analyzer import ImageAnalyzer
from services.content_generator import ContentGenerator

async def test_full_pipeline():
    load_dotenv("backend/.env")
    
    analyzer = ImageAnalyzer()
    generator = ContentGenerator()
    
    image_paths = [
        r"c:\Users\jungindae\Downloads\상세페이지\33.png",
        r"c:\Users\jungindae\Downloads\상세페이지\55.png"
    ]
    
    image_files = []
    for p in image_paths:
        with open(p, "rb") as f:
            image_files.append(f.read())
            
    print("--- 1. Image Analysis (Gemini 2.0 Flash) ---")
    product_info = analyzer.analyze_images(image_files)
    print(json.dumps(product_info, indent=2, ensure_ascii=False))
    
    print("\n--- 2. Content Generation (Gemini 2.5 Pro) ---")
    content = generator.generate_content(product_info)
    
    print("\n=== FINAL RESULT ===")
    print(f"Hero English: {content.get('header', {}).get('mainBrandName')}")
    print(f"Hero Korean: {content.get('header', {}).get('subProductName')}")
    
    ingredients = content.get('ingredients', {}).get('items', [])
    print(f"Ingredients Count: {len(ingredients)}")
    for ing in ingredients:
        print(f"- {ing.get('name')}: {ing.get('description')[:50]}...")

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
