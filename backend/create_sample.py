from PIL import Image, ImageDraw, ImageFont
import os

# Create a premium-looking sample image for K-Beauty testing
width, height = 800, 1000
img = Image.new('RGB', (width, height), color='#fdfbf7') # Beige background
draw = ImageDraw.Draw(img)

# Draw a represented product bottle
draw.rectangle([300, 300, 500, 800], fill='#1a2e22', outline='#d4af37', width=5) # Dark green bottle with gold border
draw.rectangle([350, 200, 450, 300], fill='#d4af37') # Gold cap

# Add some text
try:
    # Use a basic default font
    font = ImageFont.load_default()
    draw.text((320, 400), "PREMIUM\nCOLLAGEN\nSERUM", fill="white", font=font)
except:
    pass

img.save('sample_product_test.png')
print(f"Sample image created: {os.path.abspath('sample_product_test.png')}")
