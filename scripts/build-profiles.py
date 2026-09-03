"""Regenerate web profile photos from assets/source/profiles.

Portrait crop biased toward the face, sized for the site's 4:5 cards.
Run after replacing any source photo:  python scripts/build-profiles.py
"""
from PIL import Image, ImageOps
import glob
import os
import unicodedata

SRC = "assets/source/profiles"
OUT = "apps/web/public/profiles"

ROMAN = {
    "김민찬 A": "kim-minchan-a",
    "김민찬 B": "kim-minchan-b",
    "김준원": "kim-junwon",
    "문정연": "mun-jeongyeon",
    "박신후": "park-sinhu",
    "박지훈": "park-jihun",
    "박하예진": "park-hayejin",
    "안재우": "an-jaewoo",
    "윤희진": "yun-heejin",
    "이수현": "lee-suhyeon",
    "이승우": "lee-seungwoo",
    "이준우": "lee-junwoo",
    "조민지": "jo-minji",
    "최보윤": "choi-boyun",
    "허예지": "heo-yeji",
    "현재희": "hyun-jaehee",
    "mrTED": "ted-kim",
}

os.makedirs(OUT, exist_ok=True)
total = 0
for path in sorted(glob.glob(f"{SRC}/*.jpg") + glob.glob(f"{SRC}/*.png")):
    stem = unicodedata.normalize("NFC", os.path.splitext(os.path.basename(path))[0])
    slug = ROMAN.get(stem)
    if not slug:
        print(f"!! no slug mapping for {stem!r} — skipped")
        continue
    im = ImageOps.exif_transpose(Image.open(path).convert("RGB"))
    im = ImageOps.fit(im, (360, 450), Image.LANCZOS, centering=(0.5, 0.38))
    dest = f"{OUT}/{slug}.jpg"
    im.save(dest, quality=72, optimize=True, progressive=True)
    kb = os.path.getsize(dest) // 1024
    total += kb
    print(f"{slug:18s} {kb:3d} KB")

print(f"-- {total} KB total")
