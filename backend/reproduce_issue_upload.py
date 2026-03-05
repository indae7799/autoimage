
import requests

url = "http://localhost:8000/api/process"

# Create a dummy image
from PIL import Image
import io

img = Image.new('RGB', (100, 100), color = 'red')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='PNG')
img_bytes = img_byte_arr.getvalue()

files = [
    ('files', ('test.png', img_bytes, 'image/png'))
]

data = {
    'template_id': 'default-template'
}

print(f"Sending request to {url}...")
try:
    response = requests.post(url, files=files, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
