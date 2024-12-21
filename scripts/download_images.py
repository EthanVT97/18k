import requests
import os

def download_image(url, filename):
    response = requests.get(url)
    if response.status_code == 200:
        with open(filename, 'wb') as f:
            f.write(response.content)
        print(f"Downloaded {filename}")
    else:
        print(f"Failed to download {filename}")

# Create directories if they don't exist
slots_dir = "../public/assets/slots"
if not os.path.exists(slots_dir):
    os.makedirs(slots_dir)

# Sample slot game images
images = {
    "slot1.jpg": "https://via.placeholder.com/400x300/FFD700/000000?text=Gates+of+Olympus",
    "slot2.jpg": "https://via.placeholder.com/400x300/DAA520/000000?text=Sweet+Bonanza",
    "slot3.jpg": "https://via.placeholder.com/400x300/B8860B/000000?text=Starlight+Princess",
}

# Download images
for filename, url in images.items():
    filepath = os.path.join(slots_dir, filename)
    download_image(url, filepath)

print("Image download complete!")
