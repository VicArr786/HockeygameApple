"""Generates the game's sound effects and app icon/splash images.

Run from the project root:  python3 scripts/make_assets.py
Everything is synthesised, so the app ships with no third-party assets.
"""
import math, random, struct, wave, os
from PIL import Image, ImageDraw, ImageFilter

RATE = 44100
random.seed(7)
os.makedirs('assets/sounds', exist_ok=True)


def write(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    with wave.open(f'assets/sounds/{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(s / peak * 0.9 * 32767)) for s in samples))


def tone(freq, dur, kind='sine', decay=8.0, attack=0.003):
    out = []
    for i in range(int(RATE * dur)):
        t = i / RATE
        ph = 2 * math.pi * freq * t
        if kind == 'sine': v = math.sin(ph)
        elif kind == 'square': v = 1.0 if math.sin(ph) >= 0 else -1.0
        else: v = 2 * (t * freq % 1) - 1
        env = min(1, t / attack) * math.exp(-decay * t)
        out.append(v * env)
    return out


def mix(*parts):
    n = max(len(p) for p in parts)
    return [sum(p[i] if i < len(p) else 0 for p in parts) for i in range(n)]


def seq(*parts):
    return [s for p in parts for s in p]


# Puck-on-paddle: low thock with a noise transient.
noise = [random.uniform(-1, 1) * math.exp(-90 * i / RATE) for i in range(int(RATE * 0.03))]
write('hit', mix(tone(170, 0.09, decay=45), [0.6 * s for s in tone(340, 0.05, decay=70)], noise))
# Puck-on-rail: brighter, shorter clack.
write('wall', mix(tone(620, 0.05, 'square', decay=90), [0.5 * s for s in noise]))
# Goal: rising arcade arpeggio.
write('goal', seq(*[tone(f, 0.11, 'square', decay=6) for f in (523, 659, 784, 1047)], tone(1047, 0.3, 'square', decay=5)))
# Lose point (CPU scores): falling.
write('concede', seq(*[tone(f, 0.12, 'saw', decay=7) for f in (440, 349, 262)], tone(196, 0.3, 'saw', decay=5)))
# Win fanfare.
write('win', seq(*[tone(f, 0.12, 'square', decay=4) for f in (523, 659, 784, 659, 784)], tone(1047, 0.6, 'square', decay=2.5)))
write('beep', tone(880, 0.14, 'square', decay=14))
write('go', tone(1320, 0.3, 'square', decay=7))
write('tap', tone(1200, 0.035, 'sine', decay=60))

# ---------- Icon (1024, opaque RGB — App Store rejects alpha) ----------
S = 1024
BG_TOP, BG_BOT = (12, 8, 40), (4, 2, 16)
SPLASH_BG = (8, 5, 28)  # keep in sync with app.json splash backgroundColor #08051c


def background(size, solid=False):
    if solid:
        return Image.new('RGB', (size, size), SPLASH_BG)
    img = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        k = y / size
        d.line([(0, y), (size, y)], fill=tuple(int(BG_TOP[i] * (1 - k) + BG_BOT[i] * k) for i in range(3)))
    return img


def glow_layer(size, draw_fn, blur):
    layer = Image.new('RGB', (size, size), (0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def add(a, b):
    from PIL import ImageChops
    return ImageChops.add(a, b)


def draw_art(size, scale=1.0, cx=None, cy=None, solid=False):
    cx = size / 2 if cx is None else cx
    cy = size / 2 if cy is None else cy
    u = size / 1024 * scale
    CYAN, MAG = (40, 240, 255), (255, 40, 170)

    def art(d, w_mult=1.0):
        # centre line + circle
        d.line([(cx - 420 * u, cy), (cx + 420 * u, cy)], fill=CYAN, width=int(10 * u * w_mult))
        d.ellipse([cx - 150 * u, cy - 150 * u, cx + 150 * u, cy + 150 * u], outline=CYAN, width=int(10 * u * w_mult))
        # paddle (magenta) lower-right
        px, py, pr = cx + 120 * u, cy + 230 * u, 150 * u
        d.ellipse([px - pr, py - pr, px + pr, py + pr], outline=MAG, width=int(26 * u * w_mult))
        d.ellipse([px - 55 * u, py - 55 * u, px + 55 * u, py + 55 * u], fill=MAG)
        # puck upper-left
        qx, qy, qr = cx - 140 * u, cy - 150 * u, 95 * u
        d.ellipse([qx - qr, qy - qr, qx + qr, qy + qr], fill=(255, 240, 120))

    img = background(size, solid)
    img = add(img, glow_layer(size, lambda d: art(d, 2.2), 40 * u))
    img = add(img, glow_layer(size, art, 10 * u))
    sharp = Image.new('RGB', (size, size)); art(ImageDraw.Draw(sharp))
    return add(img, sharp)


icon = draw_art(S)
icon.save('assets/icon.png')
icon.resize((48, 48), Image.LANCZOS).save('assets/favicon.png')

# Splash image: art on transparent-free dark square; app.json sets matching bg.
draw_art(1024, scale=0.8, solid=True).save('assets/splash-icon.png')

# Android adaptive icon layers.
fg = draw_art(S, scale=0.62)
fg.save('assets/android-icon-foreground.png')
background(S).save('assets/android-icon-background.png')
mono = Image.new('L', (S, S), 0)
md = ImageDraw.Draw(mono)
c, u = S / 2, 0.62
md.ellipse([c - 150 * u, c - 150 * u, c + 150 * u, c + 150 * u], outline=255, width=int(16 * u))
md.ellipse([c + 120 * u - 150 * u, c + 230 * u - 150 * u, c + 120 * u + 150 * u, c + 230 * u + 150 * u], fill=255)
Image.merge('LA', (mono, mono)).save('assets/android-icon-monochrome.png')
print('assets written')
