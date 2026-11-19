"""Register generated fittings against the cabinet's inner and outer cheeks."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
src = Image.open(next((root.parent/'generated_images').glob('exec-3b346*'))).convert('RGBA')
palette = Image.new('P', (1,1))
swatches = json.loads((root.parent/'assets/palette.json').read_text())['colors']
palette.putpalette(b''.join(bytes.fromhex(c['hex'][1:]) for c in swatches))

def part(rect, size):
    ratio = src.width / 600
    img = src.crop(tuple(round(v*ratio) for v in rect)).resize(size, Image.Resampling.NEAREST)
    flat = img.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA')
    flat.putalpha(img.getchannel('A').point(lambda a:255 if a>=128 else 0))
    return flat

shaft = Image.new('RGBA',(350,100))
shaft.alpha_composite(part((18,80,249,100),(133,12)),(5,44))
# The inner bearing is countersunk. Only its narrow lip is visible at the felt.
shaft.alpha_composite(part((249,61,294,118),(5,16)),(134,42))
# Seat the large collar behind the actual silhouette of the wooden cheek.
# The short exposed journal still mates with the crank at local x=181.
outside = Image.new('RGBA',shaft.size)
outside.alpha_composite(part((20,79,100,101),(16,10)),(167,45))
outside.alpha_composite(part((249,61,296,118),(22,28)),(151,36))
wood = Image.open(root/'stage/cabinet.png').getchannel('A')
for y in range(32,69):
    edge = wood.crop((850,624+y,880,625+y)).getbbox()
    if edge is None:
        continue
    cut = 150+edge[2]
    for x in range(150,cut):
        outside.putpixel((x,y),(0,0,0,0))
    if outside.getpixel((cut,y))[3]:
        # One recessed contact shadow on the outer face of the wall.
        outside.putpixel((cut-1,y),(46,28,48,255))
        outside.putpixel((cut,y),(99,51,49,255))
shaft.alpha_composite(outside)
shaft.save(root/'stage/through_shaft.png')
part((294,75,337,139),(25,36)).save(root/'stage/crank_link.png')
part((336,78,599,165),(147,49)).save(root/'stage/wood_grip.png')
