import requests

# Create a dummy image
from PIL import Image
import io

img = Image.new('RGB', (100, 100), color = 'red')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='PNG')
img_byte_arr = img_byte_arr.getvalue()

url = 'http://127.0.0.1:8000/api/analyze'
files = {'files': ('test.png', img_byte_arr, 'image/png')}

try:
    print("Sending request to backend...")
    response = requests.post(url, files=files)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! Response:", response.json())
    else:
        print("Failed:", response.text)
except Exception as e:
    print(f"Connection failed: {e}")
