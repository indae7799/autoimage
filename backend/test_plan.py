import requests
import json

url = 'http://127.0.0.1:8000/api/plan'
payload = {
    "productInfo": {
        "brandName": "Test Brand",
        "productName": "Collagen Serum",
        "category": "Skincare",
        "tone": "Premium"
    },
    "imageAnalysis": [
        {"index": 0, "role": "Main", "desc": "Front of bottle"}
    ]
}

try:
    print("Sending request to /api/plan...")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! Plan generated.")
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    else:
        print("Failed:", response.text)
except Exception as e:
    print(f"Connection failed: {e}")
