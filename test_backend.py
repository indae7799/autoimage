import httpx
import json
import asyncio
import os

async def test_backend():
    url = "https://autoimg-yqer.onrender.com/api/process"
    files = [
        ("files", ("33.png", open(r"c:\Users\jungindae\Downloads\상세페이지\33.png", "rb"), "image/png")),
        ("files", ("55.png", open(r"c:\Users\jungindae\Downloads\상세페이지\55.png", "rb"), "image/png"))
    ]
    params = {"template_id": "template_kbeauty_basic"}
    
    print("Testing backend with 33.png and 55.png...")
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, files=files, params=params)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                content = result.get("content", {})
                print("\n=== AI GENERATED CONTENT ===")
                print(json.dumps(content, indent=2, ensure_ascii=False))
                
                # Check for mandatory fields
                header = content.get("header", {})
                print(f"\nHero English: {header.get('mainBrandName')}")
                print(f"Hero Korean: {header.get('subProductName')}")
                
                ingredients = content.get("ingredients", {}).get("items", [])
                print(f"Ingredients Count: {len(ingredients)}")
                for ing in ingredients:
                    print(f"- {ing.get('name')}")
            else:
                print(f"Error: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_backend())
