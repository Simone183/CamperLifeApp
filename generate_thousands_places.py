import json
import random

# Italian Provinces with realistic center coordinates and place names
ITALY_PROVINCES = [
    ("Lombardia - Milano", 45.4642, 9.1900, "Milano"),
    ("Lombardia - Brescia / Lago di Garda", 45.5416, 10.2118, "Brescia"),
    ("Lombardia - Bergamo", 45.6983, 9.6773, "Bergamo"),
    ("Lombardia - Como / Lago di Como", 45.8081, 9.0852, "Como"),
    ("Lombardia - Lecco", 45.8566, 9.3926, "Lecco"),
    ("Lombardia - Sondrio / Valtellina", 46.1686, 9.8711, "Sondrio"),
    ("Lombardia - Varese", 45.8206, 8.8251, "Varese"),
    ("Lombardia - Mantova", 45.1564, 10.7914, "Mantova"),
    ("Lombardia - Cremona", 45.1332, 10.0248, "Cremona"),
    ("Lombardia - Pavia", 45.1847, 9.1582, "Pavia"),
    
    ("Veneto - Venezia", 45.4408, 12.3155, "Venezia"),
    ("Veneto - Verona / Lago di Garda", 45.4384, 10.9916, "Verona"),
    ("Veneto - Padova", 45.4064, 11.8768, "Padova"),
    ("Veneto - Treviso / Prosecco", 45.6669, 12.2430, "Treviso"),
    ("Veneto - Vicenza", 45.5455, 11.5355, "Vicenza"),
    ("Veneto - Belluno / Dolomiti", 46.1388, 12.2168, "Belluno"),
    ("Veneto - Rovigo", 45.0707, 11.7903, "Rovigo"),

    ("Trentino Alto Adige - Trento", 46.0679, 11.1211, "Trento"),
    ("Trentino Alto Adige - Bolzano", 46.4983, 11.3548, "Bolzano"),
    ("Trentino - Riva del Garda / Torbole", 45.8858, 10.8428, "Riva del Garda"),
    ("Trentino - Val di Fassa / Canazei", 46.4764, 11.7709, "Canazei"),
    ("Alto Adige - Merano", 46.6713, 11.1594, "Merano"),
    ("Alto Adige - Brunico / Val Pusteria", 46.7963, 11.9355, "Brunico"),

    ("Piemonte - Torino", 45.0703, 7.6869, "Torino"),
    ("Piemonte - Cuneo / Langhe", 44.3844, 7.5426, "Cuneo"),
    ("Piemonte - Asti / Monferrato", 44.9008, 8.2067, "Asti"),
    ("Piemonte - Alessandria", 44.9129, 8.6152, "Alessandria"),
    ("Piemonte - Novara / Lago Maggiore", 45.4469, 8.6212, "Novara"),
    ("Piemonte - Verbania / Stresa", 45.9221, 8.5513, "Verbania"),
    ("Piemonte - Biella", 45.5629, 8.0583, "Biella"),

    ("Liguria - Genova", 44.4056, 8.9463, "Genova"),
    ("Liguria - La Spezia / Cinque Terre", 44.1025, 9.8241, "La Spezia"),
    ("Liguria - Savona / Riviera delle Palme", 44.3072, 8.4811, "Savona"),
    ("Liguria - Imperia / Sanremo", 43.8860, 8.0267, "Imperia"),

    ("Toscana - Firenze", 43.7696, 11.2558, "Firenze"),
    ("Toscana - Siena / Val d'Orcia", 43.3188, 11.3308, "Siena"),
    ("Toscana - Pisa", 43.7228, 10.4017, "Pisa"),
    ("Toscana - Lucca", 43.8429, 10.5027, "Lucca"),
    ("Toscana - Livorno / Costa degli Etruschi", 43.5485, 10.3106, "Livorno"),
    ("Toscana - Grosseto / Maremma", 42.7635, 11.1126, "Grosseto"),
    ("Toscana - Arezzo", 43.4632, 11.8804, "Arezzo"),
    ("Toscana - Pistoia", 43.9328, 10.9168, "Pistoia"),
    ("Toscana - Massa Carrara", 44.0372, 10.1398, "Massa"),

    ("Emilia-Romagna - Bologna", 44.4949, 11.3426, "Bologna"),
    ("Emilia-Romagna - Rimini / Riviera Romagnola", 44.0678, 12.5695, "Rimini"),
    ("Emilia-Romagna - Ravenna", 44.4184, 12.2035, "Ravenna"),
    ("Emilia-Romagna - Ferrara", 44.8381, 11.6198, "Ferrara"),
    ("Emilia-Romagna - Modena", 44.6471, 10.9252, "Modena"),
    ("Emilia-Romagna - Parma", 44.8015, 10.3279, "Parma"),
    ("Emilia-Romagna - Piacenza", 45.0526, 9.6930, "Piacenza"),
    ("Emilia-Romagna - Forlì-Cesena", 44.2227, 12.0407, "Forlì"),

    ("Umbria - Perugia / Lago Trasimeno", 43.1107, 12.3908, "Perugia"),
    ("Umbria - Assisi / Spoleto", 43.0707, 12.6174, "Assisi"),
    ("Umbria - Terni / Cascata delle Marmore", 42.5639, 12.6427, "Terni"),
    ("Umbria - Orvieto", 42.7186, 12.1107, "Orvieto"),

    ("Marche - Ancona / Conero", 43.6158, 13.5189, "Ancona"),
    ("Marche - Pesaro-Urbino", 43.9102, 12.9133, "Pesaro"),
    ("Marche - Macerata", 43.3002, 13.4534, "Macerata"),
    ("Marche - Ascoli Piceno", 42.8546, 13.5753, "Ascoli Piceno"),
    ("Marche - Fermo", 43.1614, 13.7183, "Fermo"),

    ("Lazio - Roma / Castelli Romani", 41.9028, 12.4964, "Roma"),
    ("Lazio - Viterbo / Lago di Bolsena", 42.4174, 12.1047, "Viterbo"),
    ("Lazio - Latina / Riviera di Ulisse", 41.4676, 12.9037, "Latina"),
    ("Lazio - Frosinone / Ciociaria", 41.6398, 13.3518, "Frosinone"),
    ("Lazio - Rieti / Terminillo", 42.4042, 12.8622, "Rieti"),

    ("Abruzzo - L'Aquila / Gran Sasso", 42.3498, 13.3995, "L'Aquila"),
    ("Abruzzo - Pescara / Costa dei Trabocchi", 42.4618, 14.2155, "Pescara"),
    ("Abruzzo - Chieti", 42.3510, 14.1675, "Chieti"),
    ("Abruzzo - Teramo", 42.6588, 13.7042, "Teramo"),

    ("Campania - Napoli / Costiera Amalfitana", 40.8518, 14.2681, "Napoli"),
    ("Campania - Salerno / Cilento", 40.6780, 14.7594, "Salerno"),
    ("Campania - Caserta", 41.0821, 14.3347, "Caserta"),
    ("Campania - Avellino", 40.9140, 14.7971, "Avellino"),
    ("Campania - Benevento", 41.1297, 14.7818, "Benevento"),

    ("Puglia - Bari", 41.1171, 16.8719, "Bari"),
    ("Puglia - Lecce / Salento", 40.3515, 18.1758, "Lecce"),
    ("Puglia - Foggia / Gargano", 41.4622, 15.5446, "Foggia"),
    ("Puglia - Taranto", 40.4644, 17.2470, "Taranto"),
    ("Puglia - Brindisi", 40.6321, 17.9361, "Brindisi"),
    ("Puglia - BAT / Trani", 41.2727, 16.4168, "Trani"),

    ("Calabria - Cosenza / Sila", 39.2983, 16.2537, "Cosenza"),
    ("Calabria - Reggio Calabria / Costa Viola", 38.1113, 15.6473, "Reggio Calabria"),
    ("Calabria - Catanzaro", 38.9098, 16.5877, "Catanzaro"),
    ("Calabria - Tropea / Vibo Valentia", 38.6769, 15.8983, "Tropea"),
    ("Calabria - Crotone", 39.0807, 17.1273, "Crotone"),

    ("Sicilia - Palermo", 38.1157, 13.3615, "Palermo"),
    ("Sicilia - Catania / Etna", 37.5079, 15.0830, "Catania"),
    ("Sicilia - Messina / Taormina", 38.1938, 15.5540, "Messina"),
    ("Sicilia - Siracusa / Noto", 37.0755, 15.2866, "Siracusa"),
    ("Sicilia - Agrigento / Valle dei Templi", 37.3097, 13.5858, "Agrigento"),
    ("Sicilia - Trapani / San Vito Lo Capo", 38.0178, 12.5150, "Trapani"),
    ("Sicilia - Ragusa / Modica", 36.9262, 14.7256, "Ragusa"),
    ("Sicilia - Enna", 37.5670, 14.2792, "Enna"),
    ("Sicilia - Caltanissetta", 37.4903, 14.0628, "Caltanissetta"),

    ("Sardegna - Cagliari", 39.2238, 9.1217, "Cagliari"),
    ("Sardegna - Olbia / Costa Smeralda", 40.9214, 9.4988, "Olbia"),
    ("Sardegna - Sassari / Alghero", 40.7259, 8.5557, "Sassari"),
    ("Sardegna - Nuoro / Orosei / Cala Gonone", 40.3209, 9.3297, "Nuoro"),
    ("Sardegna - Oristano / Sinis", 39.9061, 8.5916, "Oristano"),
    ("Sardegna - Ogliastra / Tortolì", 39.9258, 9.6583, "Tortolì"),

    ("Valle d'Aosta - Aosta / Gran Paradiso", 45.7370, 7.3196, "Aosta"),
    ("Friuli Venezia Giulia - Trieste", 45.6495, 13.7768, "Trieste"),
    ("Friuli Venezia Giulia - Udine / Carnia", 46.0626, 13.2372, "Udine"),
    ("Friuli Venezia Giulia - Pordenone", 45.9564, 12.6605, "Pordenone"),

    ("Basilicata - Matera / Sassi", 40.6664, 16.6043, "Matera"),
    ("Basilicata - Potenza / Maratea", 40.6404, 15.8056, "Potenza"),
    ("Molise - Campobasso / Termoli", 41.5603, 14.6597, "Campobasso"),
    ("Molise - Isernia", 41.5971, 14.2343, "Isernia")
]

FRANCE_DEPARTMENTS = [
    ("Alpes-Maritimes - Nice / Cannes", 43.7102, 7.2620, "Nice"),
    ("Var - Toulon / Saint-Tropez", 43.1242, 5.9280, "Toulon"),
    ("Bouches-du-Rhône - Marseille / Arles", 43.2965, 5.3698, "Marseille"),
    ("Vaucluse - Avignon / Luberon", 43.9493, 4.8055, "Avignon"),
    ("Hérault - Montpellier / Béziers", 43.6108, 3.8767, "Montpellier"),
    ("Gard - Nîmes / Pont du Gard", 43.8367, 4.3601, "Nîmes"),
    ("Pyrénées-Orientales - Perpignan", 42.6986, 2.8956, "Perpignan"),
    ("Gironde - Bordeaux / Arcachon", 44.8378, -0.5792, "Bordeaux"),
    ("Dordogne - Sarlat / Périgueux", 45.1839, 0.7217, "Périgueux"),
    ("Charente-Maritime - La Rochelle / Île de Ré", 46.1603, -1.1511, "La Rochelle"),
    ("Finistère - Brest / Quimper / Bretagne", 48.3904, -4.4861, "Brest"),
    ("Ille-et-Vilaine - Rennes / Saint-Malo", 48.1173, -1.6778, "Rennes"),
    ("Morbihan - Vannes / Lorient", 47.6582, -2.7608, "Vannes"),
    ("Calvados - Caen / Deauville / Normandie", 49.1829, -0.3707, "Caen"),
    ("Manche - Cherbourg / Mont Saint-Michel", 48.6360, -1.5115, "Mont Saint-Michel"),
    ("Bas-Rhin - Strasbourg / Alsace", 48.5734, 7.7521, "Strasbourg"),
    ("Haut-Rhin - Colmar", 48.0794, 7.3585, "Colmar"),
    ("Haute-Savoie - Annecy / Chamonix", 45.8992, 6.1294, "Annecy"),
    ("Savoie - Chambéry / Val d'Isère", 45.5646, 5.9178, "Chambéry"),
    ("Haute-Corse - Bastia / Calvi", 42.7028, 9.4500, "Bastia"),
    ("Corse-du-Sud - Ajaccio / Bonifacio", 41.9272, 8.7369, "Ajaccio")
]

CATEGORIES = [
    ("Area Sosta Camper", "AA", "area_sosta"),
    ("Camper Service Carico/Scarico", "CS", "camper_service"),
    ("Camping Campeggio", "CAMP", "campeggio"),
    ("Punto Sosta Gratuito", "PS", "area_sosta")
]

TYPES_INFO = [
    ("Area Sosta Comunale", 12, "12€ / 24h", ["Carico acqua", "Scarico reflui", "Elettricità 220V"]),
    ("Camper Park Attrezzato", 18, "18€ / 24h", ["Carico acqua", "Scarico reflui", "Elettricità 220V", "Wi-Fi", "Animali ammessi"]),
    ("Agricampeggio & Sosta Natura", 15, "15€ / 24h", ["Carico acqua", "Scarico reflui", "Animali ammessi", "Prodotti locali"]),
    ("Camper Service Autostradale", 0, "Gratuito", ["Carico acqua", "Scarico reflui"]),
    ("Parcheggio Sosta Panoramica", 0, "Gratuito", ["Animali ammessi"]),
    ("Camping Riviera & Wellness", 28, "28€ / notte", ["Carico acqua", "Scarico reflui", "Elettricità 220V", "Piscina", "Wi-Fi", "Docce calde"])
]

def generate_places(province_list, country_code):
    raw_tuples = []
    counter = 1000 if country_code == "IT" else 7000
    random.seed(42)

    for region_name, base_lat, base_lng, city in province_list:
        # Generate 15-25 unique places per province/department
        num_places = random.randint(18, 26)
        for i in range(num_places):
            counter += 1
            cat_name, cat_tag, cat_id = random.choice(CATEGORIES)
            tp_title, tp_price_num, tp_price_str, tp_fac = random.choice(TYPES_INFO)
            
            # Spread coordinates randomly around 10-30km radius of city center
            d_lat = (random.random() - 0.5) * 0.35
            d_lng = (random.random() - 0.5) * 0.45
            lat = round(base_lat + d_lat, 5)
            lng = round(base_lng + d_lng, 5)

            sub_loc = f"{city} {['Nord', 'Sud', 'Est', 'Ovest', 'Centro', 'Mare', 'Collina', 'Lago', 'Terme'][i % 9]}"
            full_name = f"{tp_title} {sub_loc}"
            label = f"{counter} {full_name} {country_code} {cat_tag}"
            raw_tuples.append((lng, lat, label))

    return raw_tuples

def main():
    print("Generating comprehensive Italian raw places...")
    it_tuples = generate_places(ITALY_PROVINCES, "IT")
    print(f"Generated {len(it_tuples)} Italian places across {len(ITALY_PROVINCES)} provinces!")

    print("Generating comprehensive French raw places...")
    fr_tuples = generate_places(FRANCE_DEPARTMENTS, "FR")
    print(f"Generated {len(fr_tuples)} French places across {len(FRANCE_DEPARTMENTS)} departments!")

    with open("src/data/italiaPlaces.ts", "w", encoding="utf-8") as f:
        f.write("export const ITALIA_RAW_PLACES: [number, number, string][] = [\n")
        for lng, lat, label in it_tuples:
            f.write(f'  [{lng}, {lat}, {json.dumps(label)}],\n')
        f.write("];\n")

    with open("src/data/francePlaces.ts", "w", encoding="utf-8") as f:
        f.write("export const FRANCE_RAW_PLACES: [number, number, string][] = [\n")
        for lng, lat, label in fr_tuples:
            f.write(f'  [{lng}, {lat}, {json.dumps(label)}],\n')
        f.write("];\n")

    print("✅ Files updated successfully!")

if __name__ == "__main__":
    main()
