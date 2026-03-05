import os
import glob
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
import json
import time

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Try hardcoded key if env (not recommended but for this script ok) is missing or print error
    print("API Key not found")
    exit(1)

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.0-flash')

# Path to images (adjust as needed based on where script runs)
# Script is in backend/, images are in ../ (root of workspace)
image_paths = []
# Analyze key structural images only
base_path = "../"
image_paths = []
for i in ["00", "11", "22"]:
    p = os.path.join(base_path, f"{i}.png")
    if os.path.exists(p):
        image_paths.append(p)


if not image_paths:
    print("No images found matching 'edited-image (X).png'")
    # Fallback to finding ANY pngs to be safe
    image_paths = glob.glob("../0*.png")[:3] 

print(f"Found {len(image_paths)} images to analyze.")

results = []

for img_path in image_paths:
    print(f"Analyzing {img_path}...")
    try:
        img = Image.open(img_path)
        prompt = """
        Analyze this e-commerce product detail page image. 
        Focus STRICTLY on the visual structure and UI elements.
        
        1. **Layout**: How is content organized? (e.g., Full-width hero, 2-column comparison, grid of 3 icons)
        2. **Icons**: Describe the style of icons used (e.g., SVG line art, 3D render, flat color, thin stroke).
        3. **Typography**: Describe the text hierarchy (Headlines vs Body). usage of English vs Korean.
        4. **Key Features**: What specific visual element is highlighted? (e.g., Texture zoom, Before/After photo, Checkbox list).

        Return a short JSON object:
        {
            "filename": "...",
            "layout_type": "...",
            "icon_style": "...",
            "text_structure": "...",
            "key_visual": "..."
        }
        """
        response = model.generate_content([prompt, img])
        # simple cleanup
        txt = response.text.replace("```json", "").replace("```", "")
        try:
            parsed = json.loads(txt)
            parsed['filename'] = os.path.basename(img_path)
            results.append(parsed)
        except:
            print(f"Failed to parse JSON for {img_path}: {response.text[:100]}...")
            results.append({"filename": os.path.basename(img_path), "raw": response.text})
            
        time.sleep(1) # rate limit
    except Exception as e:
        print(f"Error analyzing {img_path}: {e}")

# Save results
with open("reference_analysis.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("Analysis complete. Saved to reference_analysis.json")
