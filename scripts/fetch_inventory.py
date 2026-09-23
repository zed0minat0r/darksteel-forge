#!/usr/bin/env python3
"""Bake the demo inventory (then run scripts/make_thumbs.py to rebuild img/t): real cards, images and market prices from Scryfall (Magic) and pokemontcg.io
(Pokemon), written to data/cards.json so the page never depends on either API being up at demo time
(pokemontcg.io returned 500 twice out of three calls on 2026-09-21). Re-run to refresh prices."""
import json, time, urllib.request, urllib.parse, sys

def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "darksteel-forge-demo/1.0", "Accept": "application/json"}), timeout=30) as r:
                return json.load(r)
        except Exception as e:
            print("  retry", i, url[:80], e, file=sys.stderr); time.sleep(2 + 2 * i)
    return None

cards = []
# ---- Magic: chase cards across a few sets, priced, with high-res images
MTG_Q = [
    ("set:2xm rarity:mythic", 12), ("set:mh3 rarity:mythic", 10), ("set:ltr is:borderless", 8),
    ("set:woe rarity:mythic", 6), ("set:otj rarity:mythic", 6), ("set:blb rarity:mythic", 6),
    ("set:fdn rarity:mythic", 6), ("set:dsk rarity:mythic", 6), ("set:cmm rarity:mythic", 8), ("set:mom rarity:mythic", 6),
]
for q, n in MTG_Q:
    d = get("https://api.scryfall.com/cards/search?" + urllib.parse.urlencode({"q": q + " usd>=3", "order": "usd", "dir": "desc", "unique": "cards"}))
    if not d: continue
    for c in d["data"][:n]:
        img = c.get("image_uris") or (c.get("card_faces") or [{}])[0].get("image_uris")
        if not img or not c["prices"].get("usd"): continue
        cards.append({"id": "mtg-" + c["id"], "game": "magic", "name": c["name"], "set": c["set_name"], "setCode": c["set"].upper(),
                      "number": c["collector_number"], "rarity": c["rarity"], "img": img.get("png") or img["large"], "imgSmall": img["normal"],
                      "price": float(c["prices"]["usd"]), "priceFoil": float(c["prices"]["usd_foil"]) if c["prices"].get("usd_foil") else None,
                      "type": c.get("type_line", ""), "artist": c.get("artist", ""), "year": c.get("released_at", "")[:4],
                      "finishes": c.get("finishes", [])})
    time.sleep(0.15)
print("magic", len(cards), file=sys.stderr)

# ---- Pokemon: the chase rarities from recent sets
PK_SETS = ["sv3pt5", "sv4pt5", "sv8pt5", "sv6pt5", "sv7", "sv8", "swsh12pt5", "sv1", "sv2", "sv9"]
RAR = ["Special Illustration Rare", "Illustration Rare", "Hyper Rare", "Ultra Rare", "Double Rare"]
n0 = len(cards)
for s in PK_SETS:
    d = get("https://api.pokemontcg.io/v2/cards?" + urllib.parse.urlencode({"q": f"set.id:{s} (rarity:\"Special Illustration Rare\" OR rarity:\"Illustration Rare\" OR rarity:\"Hyper Rare\" OR rarity:\"Ultra Rare\")", "pageSize": 40, "orderBy": "-tcgplayer.prices.holofoil.market"}))
    if not d: continue
    got = 0
    for c in d["data"]:
        tp = (c.get("tcgplayer") or {}).get("prices") or {}
        price = None
        for k in ("holofoil", "normal", "reverseHolofoil", "1stEditionHolofoil"):
            if k in tp and tp[k].get("market"): price = tp[k]["market"]; break
        if not price or price < 3: continue
        cards.append({"id": "pk-" + c["id"], "game": "pokemon", "name": c["name"], "set": c["set"]["name"], "setCode": c["set"]["ptcgoCode"] if c["set"].get("ptcgoCode") else c["set"]["id"].upper(),
                      "number": f'{c["number"]}/{c["set"]["printedTotal"]}', "rarity": c.get("rarity", ""), "img": c["images"]["large"], "imgSmall": c["images"]["small"],
                      "price": float(price), "priceFoil": None, "type": " / ".join(c.get("types", [])) + (" · " + c["supertype"] if c.get("supertype") else ""),
                      "artist": c.get("artist", ""), "year": c["set"]["releaseDate"][:4], "finishes": ["holo"]})
        got += 1
        if got >= 12: break
    time.sleep(0.5)
print("pokemon", len(cards) - n0, file=sys.stderr)

# ---- One Piece and Riftbound, from dotgg's public card feed (images + TCGplayer market prices)
def dotgg(game, n_per_set, min_price, cap=60):
    d = get(f"https://api.dotgg.gg/cgfw/getcards?game={game}&mode=indexed")
    if not d: return []
    names, rows = d["names"], d["data"]
    out = []
    for row in rows:
        c = dict(zip(names, row))
        try: price = float(c.get("price") or 0)
        except ValueError: price = 0
        if price < min_price: continue
        name = c.get("name", "")
        if not name or any(ord(ch) > 0x2000 for ch in name): continue          # skip Japanese-language printings
        img = c.get("image") or f"https://static.dotgg.gg/{game}/card/{c['id']}.webp"
        if game == "onepiece":
            setname = (c.get("CardSets") or "").split("[")[0].strip(" -") or c.get("set", "")
            typ = " / ".join(x for x in [c.get("cardType"), c.get("Color")] if x)
            rarity = {"C": "Common", "UC": "Uncommon", "R": "Rare", "SR": "Super Rare", "SEC": "Secret Rare",
                      "L": "Leader", "P": "Promo", "SP CARD": "Special"}.get((c.get("rarity") or "").upper(), c.get("rarity") or "")
        else:
            setname = c.get("set_name") or ""
            t = c.get("type"); typ = " / ".join(t) if isinstance(t, list) else (t or "")
            col = c.get("color"); typ = (typ + (" · " + " / ".join(col) if isinstance(col, list) and col else "")).strip()
            rarity = c.get("rarity") or ""
        out.append({"id": f"{game}-{c['id']}", "game": game, "name": c.get("name", ""), "set": setname,
                    "setCode": str(c.get("set") or c["id"].split("-")[0]), "number": c["id"], "rarity": rarity,
                    "img": img, "imgSmall": img, "price": price,
                    "priceFoil": (lambda v: float(v) if v and float(v) > 0 else None)(c.get("foilPrice")),
                    "type": typ, "artist": "", "year": "", "finishes": ["holo"] if c.get("hasFoil") else []})
    # the most valuable cards per set, so the library reads like a case
    by = {}
    for c in out: by.setdefault(c["set"], []).append(c)
    picked = []
    for st, cs in by.items():
        cs.sort(key=lambda c: -c["price"])
        seen = set(); uniq = []
        for c in cs:                                                            # one printing per card name
            if c["name"] in seen: continue
            seen.add(c["name"]); uniq.append(c)
        picked += uniq[:n_per_set]
    picked.sort(key=lambda c: -c["price"])
    return picked[:cap]

n0 = len(cards)
cards += dotgg("onepiece", 6, 3.0, cap=56)
print("one piece", len(cards) - n0, file=sys.stderr)
n0 = len(cards)
cards += dotgg("riftbound", 12, 0.4, cap=56)
print("riftbound", len(cards) - n0, file=sys.stderr)

cards.sort(key=lambda c: -c["price"])
json.dump({"generated": time.strftime("%Y-%m-%d"), "cards": cards}, open("data/cards.json", "w"), indent=0)
print("total", len(cards), "top", cards[0]["name"], cards[0]["price"], file=sys.stderr)
