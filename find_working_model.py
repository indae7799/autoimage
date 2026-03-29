import os
import google.generativeai as genai
from dotenv import load_dotenv

def test_models():
    # .env 직접 파싱
    api_key = None
    with open("backend/.env", "r") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                api_key = line.split("=")[1].strip().strip('"').strip("'")
    
    if not api_key:
        print("FAILED: API Key not found in backend/.env")
        return
        
    genai.configure(api_key=api_key)
    
    models_to_try = [
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-flash-latest",
        "gemini-pro-latest"
    ]
    
    # 1. Available Models List
    try:
        print("--- Listing All Supported Models ---")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"Supported: {m.name}")
    except Exception as e:
        print(f"ListModels failed: {e}")
    
    for model_id in models_to_try:
        try:
            print(f"Testing {model_id}...", end=" ")
            model = genai.GenerativeModel(model_id)
            # Try a very simple generation
            response = model.generate_content("Hi")
            print(f"SUCCESS: {response.text[:10]}...")
        except Exception as e:
            print(f"FAILED: {str(e)[:50]}...")

if __name__ == "__main__":
    test_models()
