import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables (mostly for consistency checking)
load_dotenv()

URL = "http://127.0.0.1:8000/api/plan"

# Mock data similar to what the frontend sends
payload = {
    "brandName": "DebugBrand",
    "productName": "Debug Product Serum",
    "category": "Skincare",
    "price": "$50",
    "volume": "30ml",
    "ingredients": ["Water", "Glycerin", "Niacinamide"],
    "features": ["Hydrating", "Brightening", "Anti-aging"],
    "targetAudience": "30s Women",
    "tone": "Scientific"
}

print(f"Sending request to {URL}...")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(URL, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
