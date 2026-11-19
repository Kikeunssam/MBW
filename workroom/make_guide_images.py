"""Make the pictures for the '사용 방법' popup: annotated screenshots of the app.

1) Serve the project locally (python3 -m http.server 8765), then capture
   node workroom/capture_guide.mjs <shots folder>   (headless Chrome, 1440x860 + phone 812x375)
2) python make_guide_images.py <shots folder>  → workroom/guide/*.png
   Pillow required. Labels use Galmuri11 (assets/fonts).
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SHOTS = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'guide'
OUT.mkdir(exist_ok=True)
FONT = ImageFont.truetype(str(ROOT.parent / 'assets/fonts/galmuri11.ttf'), 22)
SMALL = ImageFont.truetype(str(ROOT.parent / 'assets/fonts/galmuri11.ttf'), 11)
R = json.load(open(SHOTS / 'rects.json'))

GOLD, DARK, CREAM, HI = (232, 189, 121), (33, 24, 36), (255, 240, 205), (255, 214, 119)


def shot(name):
    return Image.open(SHOTS / f'{name}.png').convert('RGB')


def crop(im, box, scale=1.0, nearest=False):
    x0, y0, x1, y1 = [round(v) for v in box]
    c = im.crop((x0, y0, x1, y1))
    if scale != 1:
        c = c.resize((round(c.width * scale), round(c.height * scale)), Image.NEAREST if nearest else Image.LANCZOS)
    return c


class Pen:
    """Draws in the source screenshot's CSS coordinates (box origin + scale applied)."""

    def __init__(self, im, origin=(0, 0), scale=1.0):
        self.im, self.d, self.o, self.s = im, ImageDraw.Draw(im), origin, scale

    def p(self, x, y):
        return ((x - self.o[0]) * self.s, (y - self.o[1]) * self.s)

    def box(self, x, y, w, h, pad=4):
        (a, b), (c, d) = self.p(x, y), self.p(x + w, y + h)
        a, b, c, d = a - pad, b - pad, c + pad, d + pad
        self.d.rectangle((a - 2, b - 2, c + 2, d + 2), outline=DARK, width=2)
        self.d.rectangle((a, b, c, d), outline=HI, width=3)

    def ring(self, x, y, r=16):
        cx, cy = self.p(x, y)
        self.d.ellipse((cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2), outline=DARK, width=2)
        self.d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=HI, width=3)

    def badge(self, n, x, y, raw=False):
        cx, cy = (x, y) if raw else self.p(x, y)
        r = 15
        self.d.ellipse((cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2), fill=DARK)
        self.d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GOLD)
        self.d.text((cx, cy + 1), str(n), font=FONT, fill=DARK, anchor='mm')

    def label(self, text, x, y, anchor='lm', raw=False):
        px, py = (x, y) if raw else self.p(x, y)
        l, t, r, b = self.d.textbbox((px, py), text, font=FONT, anchor=anchor)
        W = self.im.width                      # 그림 밖으로 나가지 않게 안쪽으로 민다
        shift = max(0, 13 - l) - max(0, r + 13 - W)
        px, l, r = px + shift, l + shift, r + shift
        self.d.rectangle((l - 9, t - 7, r + 9, b + 7), fill=DARK, outline=GOLD, width=2)
        self.d.text((px, py), text, font=FONT, fill=CREAM, anchor=anchor)
        return (l - 9, t - 7, r + 9, b + 7)

    def arrow(self, x0, y0, x1, y1, raw=False, both=False):
        a = (x0, y0) if raw else self.p(x0, y0)
        b = (x1, y1) if raw else self.p(x1, y1)
        for w, col in ((9, DARK), (4, HI)):
            self.d.line((a, b), fill=col, width=w)
        for tip, tail in ((b, a),) + (((a, b),) if both else ()):
            self._head(tip, tail)

    def _head(self, tip, tail):
        import math
        ang = math.atan2(tip[1] - tail[1], tip[0] - tail[0])
        pts = lambda L, W: [tip, (tip[0] - L * math.cos(ang) + W * math.sin(ang), tip[1] - L * math.sin(ang) - W * math.cos(ang)),
                            (tip[0] - L * math.cos(ang) - W * math.sin(ang), tip[1] - L * math.sin(ang) + W * math.cos(ang))]
        self.d.polygon(pts(22, 13), fill=DARK)
        self.d.polygon(pts(17, 9), fill=HI)


def save(im, name):
    im = im.quantize(colors=160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    im.save(OUT / f'{name}.png', optimize=True)
    print(name, im.size, (OUT / f'{name}.png').stat().st_size // 1024, 'KB')


def rc(k):
    v = R[k]
    return v['x'], v['y'], v['w'], v['h']


# 1. 한눈에 보기 — full screen at half size, numbered
full = shot('desk_full')
s = 0.5
im = full.resize((round(full.width * s), round(full.height * s)), Image.LANCZOS)
pen = Pen(im, (0, 0), s)
ex, ey, ew, eh = rc('editor')
pen.badge(1, ex + 20, ey + 20)
wx, wy, ww, wh = rc('winder')
pen.badge(2, wx + ww - 40, wy + wh - 70)
nx, ny, nw, nh = rc('nameplate')
pen.badge(3, nx - 20, ny + nh / 2)
mx, my, mw, mh = rc('music')
pen.badge(4, mx - 40, my + 14)
dx, dy, dw, dh = rc('decor')
pen.badge(5, dx - 40, dy + 14)
sx, sy, sw, sh = rc('share')
pen.badge(6, sx - 22, sy + sh / 2)
save(im, 'overview')

# 2. 원판에 음 찍기 — disc close-up
box = (0, 360, 640, 700)
s = 1.15
im = crop(full, box, s)
pen = Pen(im, box[:2], s)
holes = {(h['r'], h['b']): (h['x'], h['y']) for h in R['holes']}
hx, hy = holes[(3, 3)]          # 빈 자리 — 누를 곳
pen.ring(hx, hy)
pen.arrow(hx + 58, hy + 22, hx + 16, hy + 6)
pen.label('누르면 음이 찍혀요', hx + 60, hy + 24, 'lm')
hx, hy = holes[(1, 5)]          # 찍힌 음
pen.ring(hx, hy)
pen.label('찍힌 음', hx - 60, hy + 40, 'mm')
hx, hy = holes[(3, 12)]         # 바깥쪽 줄
pen.ring(hx, hy, 13)
pen.arrow(hx - 96, hy - 2, hx - 16, hy)
pen.label('바깥쪽 줄: 높은 음', hx - 98, hy - 2, 'rm')
hx, hy = holes[(0, 12)]         # 안쪽 줄
pen.ring(hx, hy, 13)
pen.arrow(hx - 96, hy + 6, hx - 16, hy + 2)
pen.label('안쪽 줄: 낮은 음', hx - 98, hy + 6, 'rm')
save(im, 'disc')

# 3. 음 수와 길이 고르기
box = (786, 262, 1412, 472)
im = crop(full, box, 1.0)
pen = Pen(im, box[:2], 1.0)
x, y, w, h = rc('pitch')
pen.box(x, y, w, h)
pen.badge(1, x + w + 22, y + h / 2)
x, y, w, h = rc('length')
pen.box(x, y, w, h)
pen.badge(2, x + w + 22, y + h / 2)
save(im, 'settings')

# 4. 표로 편집하기
tb = shot('desk_table')
x, y, w, h = rc('gridDialog')
box = (x, y, x + w, y + h)
im = crop(tb, box, 0.97)
pen = Pen(im, box[:2], 0.97)
pen.box(x + 26, y + 120, 70, 130, 2)
pen.badge(1, x + 26, y + 120)
pen.box(x + 98, y + 72, 618, 46, 2)
pen.badge(2, x + 98, y + 72)
pen.ring(x + 156, y + 202, 22)
pen.badge(3, x + 184, y + 182)
gx, gy, gw, gh = rc('gridWind')
pen.box(gx, gy, gw, gh, 2)
pen.badge(4, gx - 14, gy + gh / 2)
save(im, 'table')

# 5. 원판 크게 보기
zm = shot('desk_zoom')
x, y, w, h = rc('magnifier')
box = (x, y, x + w, y + h)
s = 600 / w
im = crop(zm, box, s)
pen = Pen(im, box[:2], s)
pen.box(x + w - 98, y + 16, 80, 40, 2)
pen.label('다 찍었으면 닫기', x + w - 108, y + 36, 'rm')
pen.label('크게 보고 눌러요', x + w / 2, y + h - 70, 'mm')
save(im, 'zoom')

# 6. 태엽 감고 듣기
box = (380, 430, 771, 652)
s = 1.8
im = crop(full, box, s, nearest=True)
pen = Pen(im, box[:2], s)
gx, gy = 700, 582                # 손잡이 손잡는 곳
pen.box(650, 566, 96, 32, 2)
pen.arrow(758, 540, 758, 626, both=True)
pen.label('위아래로 끌어요', 690, 638, 'mm')
pen.label('손을 떼면 연주 시작', 420, 450, 'lm')
save(im, 'wind')

# 7. 연주 보기와 음 비우기 — two dialogs side by side
exs, wps = shot('desk_examples'), shot('desk_wipe')
x, y, w, h = rc('exampleDialog')
a = crop(exs, (x, y, x + w, y + h), 420 / h)
x2, y2, w2, h2 = rc('wipeDialog')
b = crop(wps, (x2, y2, x2 + w2, y2 + h2), 0.82)
im = Image.new('RGB', (a.width + b.width + 46, 470), (33, 26, 34))
im.paste(a, (12, 38))
im.paste(b, (a.width + 34, 38 + (420 - b.height) // 2))
pen = Pen(im)
pen.label('연주 보기', 12 + a.width / 2, 20, 'mm', raw=True)
pen.label('음 비우기', a.width + 34 + b.width / 2, 20 + (420 - b.height) // 2, 'mm', raw=True)
save(im, 'examples')

# 8. 상자 꾸미기
th = shot('desk_theme')
x, y, w, h = rc('picture')
lid = crop(th, (x, y, x + w, y + h), 600 / w)
x, y, w, h = rc('decor')
dec = crop(th, (x - 6, y - 4, x + w + 6, y + h + 4), 600 / (w + 12))
x, y, w, h = rc('nameplate')
plate = crop(th, (x - 4, y - 4, x + w + 4, y + h + 4), 1.0)
im = Image.new('RGB', (640, lid.height + dec.height + plate.height + 44), (33, 26, 34))
im.paste(lid, (20, 10))
im.paste(dec, (20, lid.height + 20))
im.paste(plate, ((640 - plate.width) // 2, lid.height + dec.height + 32))
pen = Pen(im)
pen.badge(1, 20 + 300, lid.height + 20 + dec.height * 0.55, raw=True)
ph = R['photo']
pen.badge(2, 20 + (ph['x'] - R['decor']['x'] + 6 + ph['w'] + 16) * dec.width / (R['decor']['w'] + 12),
          lid.height + 20 + (ph['y'] - R['decor']['y'] + 4 + ph['h'] / 2) * dec.width / (R['decor']['w'] + 12), raw=True)
pen.badge(3, (640 - plate.width) // 2 - 22, lid.height + dec.height + 32 + plate.height / 2, raw=True)
save(im, 'decor')

# 9. 공유하기
sh = shot('desk_share')
x, y, w, h = rc('shareDialog')
s = 1.45
im = crop(sh, (x, y, x + w, y + h), s)
pen = Pen(im, (x, y), s)
pen.box(x + 284, y + 145, 98, 34, 2)
save(im, 'share')
