from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

base = Path('assets/icon')
base.mkdir(parents=True, exist_ok=True)

size = 1024
im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
d = ImageDraw.Draw(im)

for y in range(size):
    blend = y / (size - 1)
    r = int(16 + blend * (34 - 16))
    g = int(185 + blend * (237 - 185))
    b = int(129 + blend * (156 - 129))
    d.line([(0, y), (size, y)], fill=(r, g, b, 255))

circle_offset = int(size * 0.08)
box = [circle_offset, circle_offset, size - circle_offset, size - circle_offset]
d.ellipse(box, fill=(255, 255, 255, 32), outline=(255, 255, 255, 64), width=10)

try:
    font = ImageFont.truetype('arial.ttf', 320)
except Exception:
    font = ImageFont.load_default()
text = 'MT'
try:
    text_w, text_h = font.getsize(text)
except Exception:
    bbox = d.textbbox((0, 0), text, font=font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
d.text(((size - text_w) / 2, (size - text_h) / 2 - 20), text, font=font, fill=(255, 255, 255, 255))

base_icon = base / 'app_icon.png'
im.save(base_icon)

android_sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}
for name, dim in android_sizes.items():
    outdir = Path('android/app/src/main/res') / name
    outdir.mkdir(parents=True, exist_ok=True)
    resized = im.resize((dim, dim), Image.LANCZOS)
    resized.save(outdir / 'ic_launcher.png')
    resized.save(outdir / 'ic_launcher_round.png')

ios_sizes = [60, 87, 120, 180, 228, 250, 3072]
appicondir = Path('ios/Runner/Assets.xcassets/AppIcon.appiconset')
appicondir.mkdir(parents=True, exist_ok=True)
for dim in ios_sizes:
    resized = im.resize((dim, dim), Image.LANCZOS)
    resized.save(appicondir / f'icon_{dim}.png')

contents = {
    'images': [
        {'size': '20x20', 'idiom': 'iphone', 'scale': '2x', 'filename': 'icon_60.png'},
        {'size': '20x20', 'idiom': 'iphone', 'scale': '3x', 'filename': 'icon_60.png'},
        {'size': '29x29', 'idiom': 'iphone', 'scale': '2x', 'filename': 'icon_87.png'},
        {'size': '29x29', 'idiom': 'iphone', 'scale': '3x', 'filename': 'icon_87.png'},
        {'size': '40x40', 'idiom': 'iphone', 'scale': '2x', 'filename': 'icon_120.png'},
        {'size': '40x40', 'idiom': 'iphone', 'scale': '3x', 'filename': 'icon_120.png'},
        {'size': '60x60', 'idiom': 'iphone', 'scale': '2x', 'filename': 'icon_180.png'},
        {'size': '60x60', 'idiom': 'iphone', 'scale': '3x', 'filename': 'icon_180.png'},
        {'size': '76x76', 'idiom': 'ipad', 'scale': '2x', 'filename': 'icon_228.png'},
        {'size': '83.5x83.5', 'idiom': 'ipad', 'scale': '2x', 'filename': 'icon_250.png'},
        {'size': '1024x1024', 'idiom': 'ios-marketing', 'scale': '1x', 'filename': 'icon_3072.png'},
    ],
    'info': {'version': 1, 'author': 'xcode'}
}
with open(appicondir / 'Contents.json', 'w', encoding='utf-8') as f:
    json.dump(contents, f, indent=2)

print('Icons created')
