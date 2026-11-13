#!/usr/bin/env python3
"""
Debug script to inspect new-icon.png pixels.
Remove shape/rectangle from icon.
"""
from PIL import Image
import os

img_path = "new-icon.png"
img = Image.open(img_path).convert("RGBA")
width, height = img.size

# Grid check to understand shape
print("Grid check (x,y): RGBA")
for y in [50, 100, 150, 200, 250, 300, 350, 400, 450]:
    row = []
    for x in [50, 100, 150, 200, 250, 300, 350, 400, 450]:
        row.append(str(img.getpixel((x, y))))
    print(f"y={y}: {row}")

# Find non-transparent pixels bounding box
non_transparent = []
for x in range(width):
    for y in range(height):
        if img.getpixel((x, y))[3] > 0:
            non_transparent.append((x, y))

if non_transparent:
    xs = [p[0] for p in non_transparent]
    ys = [p[1] for p in non_transparent]
    print(f"\nNon-transparent bounding box: x={min(xs)}-{max(xs)}, y={min(xs)}-{max(xs)}")
else:
    print("\nImage is fully transparent!")

# Identify border/outline pixels
border_pixels = []
for x in range(width):
    for y in range(height):
        r, g, b, a = img.getpixel((x, y))
        if a > 0 and (r > 10 or g > 10 or b > 10):
            border_pixels.append((x, y, r, g, b, a))

print(f"\nPixels with color: {len(border_pixels)}")
if border_pixels:
    # Show first 10
    for i, (x, y, r, g, b, a) in enumerate(border_pixels[:50]):
        print(f"  ({x},{y}) RGBA=({r},{g},{b},{a})")
    
    # Check horizontal edges (x=0 or x=width-1 for all y)
    left_edge = [(x, y) for (x, y, r, g, b, a) in border_pixels if x == 0]
    right_edge = [(x, y) for (x, y, r, g, b, a) in border_pixels if x == width-1]
    top_edge = [(x, y) for (x, y, r, g, b, a) in border_pixels if y == 0]
    bottom_edge = [(x, y) for (x, y, r, g, b, a) in border_pixels if y == height-1]
    
    print(f"Left edge pixels: {len(left_edge)}")
    print(f"Right edge pixels: {len(right_edge)}")
    print(f"Top edge pixels: {len(top_edge)}")
    print(f"Bottom edge pixels: {len(bottom_edge)}")

# Save image with padding around transparent area
new_size = (width+50, height+50)
new_img = Image.new('RGBA', new_size, (0, 0, 0, 0))
new_img.paste(img, (25, 25))
new_img.save('new-icon-with-padding.png')
print("\nGenerated new-icon-with-padding.png")