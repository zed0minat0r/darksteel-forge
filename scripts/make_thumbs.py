#!/usr/bin/env python3
"""Bake a local thumbnail for every card into img/t/<id>.jpg and point cards.json at it.

The card CDNs serve their "small" images at 150-250 KB each; the tiles render at 132 CSS px, so a page
of them cost ~13 MB on a phone. 180px JPEGs are ~14 KB and indistinguishable at that size. The 3D
display still pulls the full-resolution card from the CDN, one at a time."""
import json, urllib.request, os, io, time
from PIL import Image

d = json.load(open("data/cards.json")); cards = d["cards"]
os.makedirs("img/t", exist_ok=True)
for c in cards:
    out = f"img/t/{c['id']}.jpg"
    if os.path.exists(out): c["imgSmall"] = out; continue
    src = c["imgSmall"]
    if src.startswith("img/"): continue
    with urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": "darksteel-forge/1.0"}), timeout=30) as r:
        im = Image.open(io.BytesIO(r.read())).convert("RGB")
    im.resize((180, int(180 * im.size[1] / im.size[0])), Image.LANCZOS).save(out, "JPEG", quality=78, optimize=True, progressive=True)
    c["imgSmall"] = out; time.sleep(0.02)
json.dump(d, open("data/cards.json", "w"), indent=0)
print("thumbs:", len(cards))
