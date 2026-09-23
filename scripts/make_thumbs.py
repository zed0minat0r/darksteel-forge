#!/usr/bin/env python3
"""Bake a local thumbnail for every card into img/t/<id>.jpg and point cards.json at it.

The card CDNs serve their "small" images at 150-250 KB each; the tiles render at 132 CSS px, so a page
of them cost ~13 MB on a phone. 180px JPEGs are ~14 KB and indistinguishable at that size. The 3D
display still pulls the full-resolution card from the CDN, one at a time."""
import json, urllib.request, os, io, time, re
from PIL import Image

d = json.load(open("data/cards.json")); cards = d["cards"]
os.makedirs("img/t", exist_ok=True)
keep = []
for c in cards:
    c["id"] = re.sub(r"[^A-Za-z0-9._-]", "-", c["id"])      # ids become filenames
    out = f"img/t/{c['id']}.jpg"
    if os.path.exists(out): c["imgSmall"] = out; keep.append(c); continue
    src = c["imgSmall"]
    if src.startswith("img/"): keep.append(c); continue
    try:
        with urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": "darksteel-forge/1.0"}), timeout=30) as r:
            im = Image.open(io.BytesIO(r.read())).convert("RGB")
    except Exception as e:                                   # a card whose art 404s is dropped, not shipped broken
        print("drop", c["id"], e); continue
    im.resize((180, int(180 * im.size[1] / im.size[0])), Image.LANCZOS).save(out, "JPEG", quality=78, optimize=True, progressive=True)
    c["imgSmall"] = out; keep.append(c); time.sleep(0.02)
d["cards"] = keep
json.dump(d, open("data/cards.json", "w"), indent=0)
print("thumbs:", len(keep), "dropped:", len(cards) - len(keep))
