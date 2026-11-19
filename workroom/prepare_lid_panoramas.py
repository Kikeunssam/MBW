"""Convert the four generated paintings into native-size palette PNGs (macOS)."""
import json
import struct
import subprocess
import sys
import tempfile
import zlib
from functools import lru_cache
from pathlib import Path

root = Path(__file__).resolve().parent
palette = [bytes.fromhex(item['hex'][1:]) for item in
           json.loads((root.parent / 'assets/palette.json').read_text())['colors']]

@lru_cache(maxsize=32768)
def closest(r, g, b):
    r, g, b = r * 8 + 4, g * 8 + 4, b * 8 + 4
    return min(range(len(palette)), key=lambda i:
               2*(r-palette[i][0])**2 + 3*(g-palette[i][1])**2 + (b-palette[i][2])**2)

def chunk(tag, data):
    body = tag + data
    return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body))

def convert(source, cuts):
    with tempfile.TemporaryDirectory() as folder:
        bmp = Path(folder)/'atlas.bmp'
        subprocess.run(['sips','-s','format','bmp',source,'--out',str(bmp)],check=True,stdout=subprocess.DEVNULL)
        data = bmp.read_bytes()
    offset, = struct.unpack_from('<I', data, 10)
    width, height = struct.unpack_from('<ii', data, 18)
    bits, = struct.unpack_from('<H', data, 28)
    assert bits in (24,32)
    stride = (width*bits+31)//32*4
    for name,(top,bottom) in zip(['bedroom','village','library','galaxy'],cuts,strict=True):
        rows = bytearray()
        for y in range(300):
            sy = top + int((y+.5)*(bottom-top)/300)
            row = offset + (sy if height<0 else height-1-sy)*stride
            rows.append(0)
            for x in range(800):
                i = row + int((x+.5)*width/800)*(bits//8)
                b,g,r = data[i:i+3]
                rows.extend(palette[closest(r>>3,g>>3,b>>3)] + b'\xff')
        png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR',struct.pack('>IIBBBBB',800,300,8,6,0,0,0))
        (root/'stage'/f'{name}.png').write_bytes(png + chunk(b'IDAT',zlib.compress(rows,9)) + chunk(b'IEND',b''))
if __name__ == '__main__':
    convert(sys.argv[1], [tuple(map(int,p.split(':'))) for p in sys.argv[2:]])
