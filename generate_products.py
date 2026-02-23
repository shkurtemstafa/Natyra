import os, re, json, unicodedata, random

ROOT = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_DIR = os.path.join(ROOT, "assets", "Products")
POPUPS_DIR = os.path.join(ROOT, "assets", "Pop_ups_images")
OUT_PRODUCTS = os.path.join(ROOT, "data", "products.js")
OUT_POPUPS = os.path.join(ROOT, "data", "best_seller_popups.js")
OUT_SEED_REVIEWS = os.path.join(ROOT, "data", "seed_reviews.js")

IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP")

def clean_title(filename: str) -> str:
    name = os.path.splitext(filename)[0]
    name = name.replace("_", " ").replace("+", " ")
    name = name.replace(")", " ").replace("(", " ")
    name = re.sub(r"\s+", " ", name).strip()
    # Fix common typos
    name = name.replace("wrinle", "wrinkle").replace("soup", "soap")
    return name[:1].upper() + name[1:] if name else filename

def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

def unit_for(category: str, name: str) -> str:
    c = category.lower()
    n = name.lower()
    if "honey" in c:
        if "1kg" in n or "1 kg" in n: return "1kg"
        if "500" in n: return "500g"
        return "Jar"
    if "tea" in c: return "Tea pack"
    if "oil" in c: return "Bottle"
    if "cream" in c or "topical" in c: return "Tube/Jar"
    if "book" in c: return "Book"
    if "parf" in c or "perfume" in c: return "Perfume"
    if "prayer" in c or "acces" in c: return "Accessory"
    return "Item"

def origin_for(category: str) -> str:
    c = category.lower()
    if "honey" in c or "bee" in c: return "Kosovo (local beekeepers)"
    if "tea" in c: return "Curated herbal suppliers"
    if "oil" in c: return "Curated natural oils"
    if "book" in c: return "Trusted publishers"
    return "Kosovo / curated imports"

def ingredients_for(category: str, name: str) -> str:
    c = category.lower()
    if "honey" in c:
        if "black seed" in name.lower(): return "Raw honey, black seed extract"
        return "100% natural honey"
    if "tea" in c:
        # Try to extract herb names from title
        return "Herbal blend (see packaging for full composition)"
    if "oil" in c:
        return "Natural oil (see packaging for extraction method)"
    if "cream" in c or "topical" in c:
        return "Topical formula (see packaging for full ingredients)"
    if "book" in c:
        return "Printed book (language depends on edition)"
    if "parf" in c or "perfume" in c:
        return "Fragrance oils / eau de parfum (see packaging)"
    return "See packaging / ask via WhatsApp"

def make_long_description(name: str, category: str) -> str:
    c = category.lower()
    if "honey" in c:
        return (f"{name} is a carefully selected honey product prepared for customers in Kosovo. "
                "It’s packed hygienically, sealed for freshness, and delivered with care. "
                "Perfect for daily use, traditional recipes, or as a natural gift. "
                "For specific recommendations (for kids, allergies, or mixing with herbs), message us on WhatsApp.")
    if "tea" in c:
        return (f"{name} is a herbal tea from our wellness collection. "
                "It’s a convenient tea pack you can enjoy as part of your daily routine. "
                "We recommend following the directions on the package and asking us if you need guidance about usage, "
                "timing, or combining with other products.")
    if "oil" in c:
        return (f"{name} is a natural oil selected for quality and freshness. "
                "Depending on the product, it can be used for hair, skin, or traditional routines. "
                "Always follow label instructions and do a small patch test if you have sensitive skin. "
                "Contact us on WhatsApp for suggested use and availability.")
    if "cream" in c or "topical" in c:
        return (f"{name} is part of our creams & topicals range. "
                "It’s intended for external use and should be applied as directed on the packaging. "
                "If you have sensitive skin, try a small amount first. "
                "Message us on WhatsApp for usage tips and stock confirmation.")
    if "parf" in c or "perfume" in c:
        return (f"{name} is a perfume from our curated selection. "
                "Great for everyday wear or gifting. "
                "We can recommend similar scents (fresh, woody, sweet, or musk) if you tell us what you like.")
    if "book" in c:
        return (f"{name} is an Islamic book from our collection. "
                "Ideal for personal reading or as a meaningful gift. "
                "Ask us on WhatsApp if you need the language/edition details or recommendations for beginners.")
    if "prayer" in c or "acces" in c:
        return (f"{name} is a prayer accessory selected for everyday use. "
                "Suitable for home, travel, or gifting. "
                "Contact us for color/size variations and availability.")
    return (f"{name} is part of our {category} collection. "
            "We focus on carefully selected products, good packaging, and reliable delivery across Kosovo. "
            "For details and recommendations, contact us via WhatsApp.")

def pick_price(category: str, name: str) -> float:
    c = category.lower()
    n = name.lower()
    if "honey" in c:
        if "1kg" in n or "1 kg" in n: return random.choice([14.99, 15.99, 16.99, 17.99])
        if "500" in n: return random.choice([8.99, 9.99, 10.99, 11.99])
        return random.choice([9.99, 11.99, 12.99, 13.99])
    if "oil" in c:
        return random.choice([5.99, 6.99, 7.99, 8.99, 9.99, 11.99])
    if "tea" in c:
        return random.choice([2.99, 3.49, 3.99, 4.49])
    if "cream" in c or "topical" in c:
        return random.choice([4.99, 5.99, 6.99, 7.99, 8.99])
    if "book" in c:
        return random.choice([3.99, 4.99, 5.99, 6.99, 7.99, 9.99])
    if "parf" in c or "perfume" in c:
        return random.choice([4.99, 5.99, 6.99, 7.99, 8.99, 9.99, 11.99])
    if "prayer" in c or "acces" in c:
        return random.choice([2.99, 3.99, 4.99, 5.99, 6.99, 7.99, 9.99])
    return random.choice([3.99, 4.99, 5.99, 6.99, 7.99])

def apply_discount(price: float):
    pct = random.choice([10, 12, 15, 18, 20, 25])
    old = round(price / (1 - pct/100), 2)
    new = round(price, 2)
    return new, old, pct

def load_images(folder: str):
    if not os.path.isdir(folder):
        return []
    out=[]
    for fn in sorted(os.listdir(folder)):
        if fn.lower().endswith(tuple(e.lower() for e in IMG_EXTS)):
            out.append(fn)
    return out

def make_seed_reviews(name: str, category: str):
    # Short, realistic comments. Stored as "seed" for demo.
    base = [
        ("Arta", 5, "Very good quality and nicely packaged. Delivery was fast."),
        ("Dren", 5, "Exactly as described. Would order again."),
        ("Elira", 4, "Good product, communication on WhatsApp was helpful."),
        ("Blerim", 5, "Great value for the price. Recommended."),
    ]
    c = category.lower()
    if "honey" in c:
        base += [
            ("Mira", 5, "Tastes natural and fresh. Perfect with tea in the morning."),
            ("Ilir", 4, "Good honey, strong flavor. Packaging was secure."),
        ]
    if "tea" in c:
        base += [
            ("Gent", 5, "Nice aroma and easy to prepare. I like it after meals."),
            ("Lina", 4, "Good herbal taste. Arrived quickly."),
        ]
    if "oil" in c:
        base += [
            ("Sara", 5, "Used it for hair care, very satisfied so far."),
            ("Faton", 4, "Smells natural. Good packaging."),
        ]
    if "cream" in c:
        base += [
            ("Aulona", 5, "Feels smooth on skin. Helpful for my routine."),
            ("Arben", 4, "Good cream, arrived as expected."),
        ]
    if "book" in c:
        base += [
            ("Fitore", 5, "Beautiful and useful book. Great as a gift."),
            ("Besnik", 4, "Good print quality. Delivery was quick."),
        ]
    if "parf" in c:
        base += [
            ("Rina", 5, "Smells great and lasts long for the price."),
            ("Valon", 4, "Nice scent. Good option for daily use."),
        ]
    if "prayer" in c:
        base += [
            ("Arijana", 5, "Very nice quality. Exactly what I needed."),
            ("Labinot", 4, "Good value and fast delivery."),
        ]
    random.shuffle(base)
    # return 4–6 reviews
    out=[]
    now=int(random.random()*1e9)  # deterministic-ish per run not needed
    for i,(n,stars,txt) in enumerate(base[:random.choice([4,5,6])]):
        out.append({"name":n,"rating":stars,"text":txt,"ts":int((__import__("time").time()-random.randint(3,200))*86400*1000)})
    return out

def main():
    if not os.path.isdir(PRODUCTS_DIR):
        raise SystemExit(f"Products folder not found: {PRODUCTS_DIR}")

    products=[]
    seed_reviews={}
    for category in sorted(os.listdir(PRODUCTS_DIR)):
        cat_path = os.path.join(PRODUCTS_DIR, category)
        if not os.path.isdir(cat_path):
            continue
        for fn in load_images(cat_path):
            name = clean_title(fn)
            pid = slugify(f"{category}-{name}")
            base_price = pick_price(category, name)
            price, old_price, pct = apply_discount(base_price)

            products.append({
                "id": pid,
                "name": name,
                "category": category,
                "price": price,
                "oldPrice": old_price,
                "discountPct": pct,
                "image": f"assets/Products/{category}/{fn}",
                "short": "Order via WhatsApp • No online payment",
                "unit": unit_for(category, name),
                "sku": pid.upper()[:12],
                "origin": origin_for(category),
                "ingredients": ingredients_for(category, name),
                "long": make_long_description(name, category),
                "details": [
                    "Distributor in Kosovo",
                    "Carefully packaged for delivery",
                    "Fast customer support via WhatsApp",
                    "Ask us for usage & recommendations"
                ],
                "rating": round(random.choice([4.3,4.4,4.5,4.6,4.7,4.8,4.9]),1),
                "reviewsCount": random.randint(40, 320),
            })
            seed_reviews[pid] = make_seed_reviews(name, category)

    brand={
        "name": "Natural Products Kosovo",
        "tagline": "100% natural products • Honey-focused • Kosovo distributor • Order via WhatsApp",
        "currency":"€",
        "whatsapp_phone":"38349123456"
    }

    os.makedirs(os.path.join(ROOT,"data"), exist_ok=True)
    with open(OUT_PRODUCTS,"w",encoding="utf-8") as f:
        f.write("window.PRODUCTS = "+json.dumps(products, ensure_ascii=False, indent=2)+";\n")
        f.write("window.BRAND = "+json.dumps(brand, ensure_ascii=False, indent=2)+";\n")

    print(f"✅ Generated {len(products)} products into {OUT_PRODUCTS}")

    # --- POPUPS / BEST SELLERS SLIDER
    popup_images = load_images(POPUPS_DIR)
    popups = [{"image": f"assets/Pop_ups_images/{fn}"} for fn in popup_images]

    with open(OUT_POPUPS,"w",encoding="utf-8") as f:
        f.write("window.BEST_SELLER_POPUPS = "+json.dumps(popups, ensure_ascii=False, indent=2)+";\n")

    print(f"✅ Generated {len(popups)} best seller popups into {OUT_POPUPS}")

    with open(OUT_SEED_REVIEWS,"w",encoding="utf-8") as f:
        f.write("window.SEED_REVIEWS = "+json.dumps(seed_reviews, ensure_ascii=False, indent=2)+";\n")
    print(f"✅ Generated seed reviews into {OUT_SEED_REVIEWS}")

if __name__ == "__main__":
    main()
