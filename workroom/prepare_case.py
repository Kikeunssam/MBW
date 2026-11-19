"""Fit the cabinet art to the playing surface. Coordinates are in the 960 px layout."""
from pathlib import Path
import json
from math import asin, cos, radians, sin
from PIL import Image

root = Path(__file__).resolve().parent
original = next((root.parent / 'generated_images').glob('exec-9598ddca-*.png'))
src = Image.open(original).convert('RGBA')
# The navy matte continues through the picture aperture. The brass corners stay opaque.
pixels = src.load()
for y in range(src.height):
    for x in range(src.width):
        r, g, b, _ = pixels[x, y]
        if b > r + 6 and b > g + 8 and r < 31:
            pixels[x, y] = (0, 0, 0, 0)
# Keep the grain on the lid, rails and apron at their original aspect as far as
# possible. Only the velvet well needs extra depth for the rotating instrument.
# A single rigid rectangle is seen twice, lying flat and lifted on its hinge.
# Project its edges from a common camera. A circle on the deck projects to
# an ellipse with the reference aspect of 0.85 at the centre of the plate.
camera_angle = asin(.85)
opening_angle = radians(104)
width, depth, focal = 826, 539, 5600

def free_edge(angle):
    scale = focal / (focal - depth*cos(angle-camera_angle))
    return round(abs(depth*sin(angle-camera_angle)*scale)), width*scale/2

lid_height, lid_radius = free_edge(opening_angle)
deck_height, front_radius = free_edge(0)
hinge = lid_height + 8
front = hinge + deck_height
stations = [
    (0, 0, 307, lid_radius), (5, 8, 307, lid_radius),
    (190, hinge, 302, width/2), (237, hinge+29, 325, width/2+6),
    (316, front, 359, front_radius), (340, front+27, 359, front_radius),
    (429, front+118, 359, front_radius), (480, front+172, 359, front_radius)
]
case = Image.new('RGBA', (960, front+172))
for start, end in zip(stations, stations[1:]):
    for y in range(start[1], end[1]):
        t = (y + .5 - start[1]) / (end[1] - start[1])
        source_y, _, source_radius, radius = [
            a + (b-a)*t for a, b in zip(start, end)
        ]
        sy = min(src.height-1, int(source_y * src.height / 480))
        width = round(720 * radius / source_radius)
        row = src.crop((0, sy, src.width, sy+1)).resize((width, 1), Image.Resampling.NEAREST)
        case.paste(row, (444 - width//2, y))
swatches = json.loads((root.parent / 'assets/palette.json').read_text())['colors']
palette = Image.new('P', (1, 1))
palette.putpalette(b''.join(bytes.fromhex(c['hex'][1:]) for c in swatches))
result = case.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
result.putalpha(case.getchannel('A'))
result.save(root / 'stage' / 'cabinet.png', optimize=True)
