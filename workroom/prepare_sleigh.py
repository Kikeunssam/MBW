"""Fit the transparent sleigh artwork to the village's native pixel grid."""
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

from prepare_lid_panoramas import chunk, closest, palette, root
import zlib


def raster(source, bmp):
    subprocess.run(['sips', '-s', 'format', 'bmp', str(source), '--out', str(bmp)],
                   check=True, stdout=subprocess.DEVNULL)
    data = bmp.read_bytes()
    offset, = struct.unpack_from('<I', data, 10)
    width, height = struct.unpack_from('<ii', data, 18)
    assert struct.unpack_from('<H', data, 28)[0] == 32
    rows = [data[offset+y*width*4:offset+(y+1)*width*4] for y in range(abs(height))]
    return rows if height < 0 else rows[::-1]


def convert(source):
    with tempfile.TemporaryDirectory() as folder:
        rows = raster(source, Path(folder) / 'sleigh.bmp')
    bounds = []
    for y, row in enumerate(rows):
        solid = [x for x, alpha in enumerate(row[3::4]) if alpha >= 96]
        if solid:
            bounds.append((y, solid[0], solid[-1]))
    top, bottom = bounds[0][0], bounds[-1][0]+1
    left, right = min(b[1] for b in bounds), max(b[2] for b in bounds)+1
    width = 80
    height = round(width * (bottom-top)/(right-left))
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            samples = []
            for j in range(5):
                row = rows[top+int((y+(j+.5)/5)*(bottom-top)/height)]
                for i in range(5):
                    pos = 4*(left+int((x+(i+.5)/5)*(right-left)/width))
                    samples.append(row[pos:pos+4])
            solid = [p for p in samples if p[3] >= 96]
            if len(solid) < 6:
                raw.extend(bytes(4))
            else:
                b,g,r = [sum(p[k] for p in solid)//len(solid) for k in range(3)]
                raw.extend(palette[closest(r>>3,g>>3,b>>3)] + b'\xff')
    # Preserve the white beard and its tapered tip at the final viewing size.
    beard = ['.hh.', 'shhh', 'shhh', '.shh', '..sh', '..s.']
    snow = {k: palette[i] for k,i in [('h',9), ('s',8)]}
    for dy, line in enumerate(beard):
        for dx, key in enumerate(line):
            if key in snow:
                start = (8+dy)*(1+4*width)+1+4*(10+dx)
                raw[start:start+4] = snow[key] + bytes([255])
    png = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))
    (root/'stage/sleigh.png').write_bytes(png+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))
    print(width,height)


if __name__ == '__main__':
    convert(Path(sys.argv[1]))
