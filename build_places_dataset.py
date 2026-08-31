import urllib.request
import urllib.parse
import json
import re
import os

# Bounding boxes for Italy & France regions (south, west, north, east)
ITALY_BBOXES = [
    ("Nord-Ovest (Piemonte, Liguria, VdA, Lombardia Ovest)", "43.7,6.6,46.5,9.5"),
    ("Nord-Est (Lombardia Est, Veneto, Trentino, Friuli)", "44.8,9.5,47.1,13.9"),
    ("Centro Ovest (Toscana, Umbria, Lazio)", "41.2,9.8,44.5,13.0"),
    ("Centro Est (Emilia-Romagna, Marche, Abruzzo, Molise)", "41.7,11.5,45.0,15.1"),
    ("Sud (Campania, Puglia, Basilicata, Calabria)", "37.9,13.8,42.0,18.6"),
    ("Sicilia", "36.6,12.4,38.4,15.7"),
    ("Sardegna", "38.8,8.1,41.4,9.9"),
]

FRANCE_BBOXES = [
    ("Sud-Ovest / Aquitaine / Dordogne", "42.8,-1.8,45.8,2.0"),
    ("Sud-Est / Provence / Cote d Azur", "43.1,3.0,45.2,7.6"),
    ("Ovest / Bretagne / Normandy", "47.0,-4.8,49.8,1.0"),
    ("Nord / Ile-de-France / Hauts-de-France", "48.5,1.0,51.1,4.5"),
    ("Est / Alsace / Lorraine / Rhone-Alpes", "45.0,4.5,49.1,8.3"),
    ("Corsica", "41.3,8.5,43.1,9.6"),
]

def fetch_overpass_bbox(bbox):
    query = f'''[out:json][timeout:25];
(
  node["tourism"="camp_site"]({bbox});
  way["tourism"="camp_site"]({bbox});
  node["tourism"="caravan_site"]({bbox});
  node["caravan_site"]({bbox});
  node["amenity"="sanitary_dump_station"]({bbox});
);
out center;'''

    urls = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.openstreetmap.fr/api/interpreter'
    ]

    for url in urls:
        try:
            req = urllib.request.Request(
                url, 
                data=('data=' + urllib.parse.quote(query)).encode('utf-8'),
                headers={'User-Agent': 'ViaCamperApp/2.4 (viacamperapp@gmail.com)'}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                elements = data.get('elements', [])
                if elements:
                    return elements
        except Exception as e:
            pass
    return []

def process_elements(elements, prefix):
    results = []
    seen = set()
    for el in elements:
        lat = el.get('lat')
        lng = el.get('lon')
        if el.get('type') == 'way' and el.get('center'):
            lat = el['center'].get('lat')
            lng = el['center'].get('lon')
        
        if not lat or not lng:
            continue
        
        key = (round(lat, 4), round(lng, 4))
        if key in seen:
            continue
        seen.add(key)
        
        tags = el.get('tags', {})
        name = tags.get('name') or tags.get('official_name') or tags.get('operator') or tags.get('brand')
        
        category = "AA"
        if tags.get('amenity') == 'sanitary_dump_station':
            category = "CS"
            if not name:
                name = "Camper Service CS"
        elif tags.get('tourism') == 'camp_site':
            category = "CAMP"
            if not name:
                name = "Camping Campeggio"
        else:
            if not name:
                name = "Area Sosta Camper AA"
        
        clean_name = re.sub(r'["\\]', '', name).strip()
        label = f"{clean_name} {prefix} {category}"
        
        results.append((round(lng, 5), round(lat, 5), label))
    return results

def main():
    all_it = []
    seen_it = set()
    print("=== Querying Italy Bounding Boxes ===")
    for region_name, bbox in ITALY_BBOXES:
        print(f"Fetching {region_name} ({bbox})...")
        els = fetch_overpass_bbox(bbox)
        processed = process_elements(els, "IT")
        added = 0
        for lng, lat, label in processed:
            key = (lng, lat)
            if key not in seen_it:
                seen_it.add(key)
                all_it.append((lng, lat, label))
                added += 1
        print(f" -> Found {len(els)} raw elements, added {added} new unique places. Total IT: {len(all_it)}")

    all_fr = []
    seen_fr = set()
    print("\n=== Querying France Bounding Boxes ===")
    for region_name, bbox in FRANCE_BBOXES:
        print(f"Fetching {region_name} ({bbox})...")
        els = fetch_overpass_bbox(bbox)
        processed = process_elements(els, "FR")
        added = 0
        for lng, lat, label in processed:
            key = (lng, lat)
            if key not in seen_fr:
                seen_fr.add(key)
                all_fr.append((lng, lat, label))
                added += 1
        print(f" -> Found {len(els)} raw elements, added {added} new unique places. Total FR: {len(all_fr)}")

    if all_it:
        with open("src/data/italiaPlaces.ts", "w", encoding="utf-8") as f:
            f.write("export const ITALIA_RAW_PLACES: [number, number, string][] = [\n")
            for lng, lat, label in all_it:
                f.write(f'  [{lng}, {lat}, {json.dumps(label)}],\n')
            f.write("];\n")
        print(f"\n✅ Successfully wrote {len(all_it)} Italian places to src/data/italiaPlaces.ts!")

    if all_fr:
        with open("src/data/francePlaces.ts", "w", encoding="utf-8") as f:
            f.write("export const FRANCE_RAW_PLACES: [number, number, string][] = [\n")
            for lng, lat, label in all_fr:
                f.write(f'  [{lng}, {lat}, {json.dumps(label)}],\n')
            f.write("];\n")
        print(f"✅ Successfully wrote {len(all_fr)} French places to src/data/francePlaces.ts!")

if __name__ == "__main__":
    main()
