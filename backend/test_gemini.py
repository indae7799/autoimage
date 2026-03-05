import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel('gemini-flash-latest')

print("Sending test prompt to Gemini...")
try:
    response = model.generate_content("Hello, respond with 'READY' if you are working.")
    print(f"Gemini Response: {response.text}")
except Exception as e:
    print(f"Gemini Error: {e}")
