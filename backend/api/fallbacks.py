from .image_service import _stock_url, get_stock_image_url

import random


DEFAULT_NAVBAR_LINKS = [
    {"label": "Accueil", "href": "#"},
    {"label": "Services", "href": "#"},
    {"label": "Contact", "href": "#"},
]

DEFAULT_FOOTER_LINKS = [
    {"label": "Accueil", "href": "#"},
    {"label": "Services", "href": "#"},
    {"label": "Mentions légales", "href": "#"},
]

DEFAULT_SOCIAL_LINKS = ["Instagram", "LinkedIn", "Facebook"]


def _navbar_section(data, sec_id):
    raw_links = data.get("links")
    if not isinstance(raw_links, list):
        raw_links = []
    links = []
    for l in raw_links:
        if not isinstance(l, dict):
            continue
        label = str(l.get("label", "") or "").strip()
        if not label:
            continue
        links.append({
            "label": label,
            "href": str(l.get("href", "") or "").strip() or "#",
        })
    if not links:
        links = [dict(x) for x in DEFAULT_NAVBAR_LINKS]
    return {
        "id": sec_id,
        "type": "navbar",
        "brand_name": str(data.get("brand_name", "") or ""),
        "links": links,
        "cta_text": str(data.get("cta_text", "") or "Contact"),
    }


def _footer_section(data, sec_id):
    raw_links = data.get("links")
    if not isinstance(raw_links, list):
        raw_links = []
    links = []
    for l in raw_links:
        if not isinstance(l, dict):
            continue
        label = str(l.get("label", "") or "").strip()
        if not label:
            continue
        links.append({
            "label": label,
            "href": str(l.get("href", "") or "").strip() or "#",
        })
    if not links:
        links = [dict(x) for x in DEFAULT_FOOTER_LINKS]

    raw_social = data.get("social_links")
    if not isinstance(raw_social, list):
        raw_social = []
    social_links = []
    for s in raw_social:
        s_str = str(s).strip()
        if s_str:
            social_links.append(s_str)
    if not social_links:
        social_links = list(DEFAULT_SOCIAL_LINKS)

    return {
        "id": sec_id,
        "type": "footer",
        "brand_name": str(data.get("brand_name", "") or ""),
        "description": str(data.get("description", "") or ""),
        "copyright": str(data.get("copyright", "") or "© 2026 Tous droits réservés."),
        "links": links,
        "social_links": social_links,
    }


def _product(name, price, keyword, width: int = 800, height: int = 800, description: str = "") -> dict:
    return {
        "name": name,
        "price": price,
        "image_keyword": keyword,
        "image_url": get_stock_image_url(keyword, width, height),
        "description": description or f"{name}. Un produit de qualité sélectionné pour vous.",
        "stock": random.randint(0, 50),
    }


def _fallback_catalog(prompt: str = "") -> list:
    """Catalogue e-commerce de secours : 4 catégories x 6 produits, adapté au domaine détecté dans le prompt."""
    p = prompt.lower()
    if any(k in p for k in ["boulangerie", "pâtisserie", "pain"]):
        return [
            {"name": "Pains", "products": [
                _product("Pain de Campagne", "4.50 €", "sourdough bread", description="Un pain rustique au levain naturel, à la croûte croustillante et à la mie dense et moelleuse."),
                _product("Baguette Tradition", "1.30 €", "french baguette", description="La baguette classique au goût authentique, façonnée à la main et cuite au feu de bois."),
                _product("Pain Complet Bio", "3.20 €", "whole grain bread", description="Un pain riche en fibres préparé avec des farines complètes certifiées bio."),
                _product("Pain aux Céréales", "3.80 €", "multi grain bread", description="Pain gourmand garni de graines de tournesol, lin et sésame."),
                _product("Pain de Seigle", "4.20 €", "rye bread", description="Un pain de seigle savoureux et nourrissant, parfait avec les fromages affinés."),
                _product("Fougasse aux Olives", "5.50 €", "focaccia olives", description="Une fougasse provençale généreusement parsemée d'olives noires et d'herbes de Provence."),
            ]},
            {"name": "Viennoiseries", "products": [
                _product("Croissant au Beurre AOP", "1.50 €", "butter croissant", description="Un croissant doré et feuilleté au beurre AOP, fondant à chaque bouchée."),
                _product("Pain au Chocolat", "1.60 €", "chocolate croissant", description="Feuilletage croustillant garni de deux barres de chocolat noir intense."),
                _product("Chausson aux Pommes", "2.20 €", "apple pastry", description="Un chausson généreusement garni de compotée de pommes caramélisées."),
                _product("Brioche Nanterre", "6.50 €", "brioche bread", description="Une brioche moelleuse et filante, idéale pour le petit-déjeuner."),
                _product("Pain aux Raisins", "2.40 €", "raisin pastry", description="Une escargot feuilletée aux raisins secs et à la crème pâtissière vanillée."),
                _product("Palmier", "1.80 €", "palmier pastry", description="Un palmier caramélisé croustillant, parfait avec un café."),
            ]},
            {"name": "Pâtisseries", "products": [
                _product("Éclair au Chocolat", "3.90 €", "chocolate eclair", description="Un éclair garni d'une crème pâtissière au chocolat et nappé d'un glaçage brillant."),
                _product("Tarte aux Fruits Familiale", "24.90 €", "fruit tart", description="Une tarte gourmande composée de fruits de saison sur une crème d'amande."),
                _product("Millefeuille Vanille", "4.50 €", "millefeuille", description="Trois couches de pâte feuilletée et une crème légère à la vanille de Madagascar."),
                _product("Opéra", "4.80 €", "opera cake", description="Le grand classique parisien : biscuit joconde, ganache chocolat et café."),
                _product("Paris-Brest", "4.60 €", "paris brest", description="Un chou craquelin garni d'une crème pralinée onctueuse et savoureuse."),
                _product("Tarte au Citron Meringuée", "4.40 €", "lemon meringue pie", description="Une tarte acidulée au citron jaune surmontée d'une meringue italienne dorée."),
            ]},
            {"name": "Traiteur & Commandes", "products": [
                _product("Plateau Apéritif 12 Pers.", "42.00 €", "party platter", description="Un assortiment de viennoiseries salées et de petits fours pour vos réceptions."),
                _product("Quiche Lorraine Familiale", "18.50 €", "quiche lorraine", description="Une quiche crémeuse aux lardons fumés et à l'oignon, cuite à la perfection."),
                _product("Sandwich Trio", "12.90 €", "sandwich platter", description="Trois sandwiches gourmands préparés avec du pain frais du jour."),
                _product("Tarte Fine aux Légumes", "16.80 €", "vegetable tart", description="Une tarte fine aux légumes rôtis, parfaite pour un déjeuner léger."),
                _product("Gâteau d'Anniversaire", "29.00 €", "birthday cake", description="Un gâteau personnalisé aux saveurs de votre choix, décoré avec soin."),
                _product("Coffret Petit-Déjeuner", "19.90 €", "breakfast box", description="Viennoiseries, pain frais et confitures maison dans un coffret élégant."),
            ]},
        ]
    if any(k in p for k in ["animalerie", "chien", "chat", "animal", "chiot", "vétérinaire"]):
        return [
            {"name": "Chiens", "products": [
                _product("Croquettes Bio 5kg", "24.99 €", "dog food kibble", description="Croquettes riches en protéines pour chiens actifs. Sans céréales et fabriquées en France."),
                _product("Laisse en Cuir", "22.50 €", "leather dog leash", description="Une laisse en cuir véritable, résistante et confortable en main pour toutes les balades."),
                _product("Lit Douillet XXL", "49.90 €", "dog bed", description="Un coussin moelleux et lavable pour des nuits douillettes et reposantes."),
                _product("Jouet Balle Rebondissante", "8.90 €", "dog ball toy", description="Une balle durable et rebondissante pour des heures de jeu avec votre compagnon."),
                _product("Shampoing Doux Naturel", "11.90 €", "dog shampoo", description="Un shampoing doux à base d'avoine pour un pelage propre et brillant."),
                _product("Harnais Réglable", "29.90 €", "dog harness", description="Un harnais confortable et anti-traction, réglable pour un maintien parfait."),
            ]},
            {"name": "Chats", "products": [
                _product("Arbre à Chat Premium", "79.00 €", "cat tree", description="Un arbre à chat en sisal avec hamac et cachettes, idéal pour grimper et dormir."),
                _product("Croquettes Saumon 2kg", "19.90 €", "salmon cat food", description="Des croquettes au saumon riches en oméga-3 pour un pelage éclatant."),
                _product("Fontaine à Eau", "34.90 €", "cat water fountain", description="Une fontaine à circulation continue qui encourage votre chat à boire."),
                _product("Litière Végétale 10L", "14.50 €", "cat litter", description="Une litière naturelle absorbante et sans poussière, agglomérante au quotidien."),
                _product("Griffoir en Sisal", "18.90 €", "cat scratching post", description="Un griffoir vertical robuste pour préserver vos meubles et entretenir ses griffes."),
                _product("Jouet Souris Peluche", "5.90 €", "cat mouse toy", description="Des souris en peluche garnies d'herbe à chat pour stimuler l'instinct de chasse."),
            ]},
            {"name": "Oiseaux", "products": [
                _product("Cage Volière Moyenne", "89.00 €", "bird cage", description="Une cage spacieuse et sécurisée, idéale pour perruches et canaris."),
                _product("Graines Bio Mélange 1kg", "9.90 €", "bird seeds", description="Un mélange de graines certifié bio pour une alimentation variée et équilibrée."),
                _product("Perchoir en Bois", "6.50 €", "bird perch", description="Un perchoir naturel en bois pour le confort des pattes et le jeu."),
                _product("Miroir avec Clochette", "4.90 €", "bird mirror toy", description="Un miroir ludique avec clochette pour occuper et divertir votre oiseau."),
                _product("Abreuvoir Anti-Éclaboussures", "7.90 €", "bird water dispenser", description="Un abreuvoir pratique qui garde l'eau propre et fraîche toute la journée."),
                _product("Jouet Clochette", "3.90 €", "bird toy bell", description="Une clochette colorée et légère, parfaite pour stimuler l'activité."),
            ]},
            {"name": "Rongeurs", "products": [
                _product("Foin de Crau AOP", "12.90 €", "hay bale", description="Un foin de Crau certifié AOP, riche en fibres pour une digestion saine."),
                _product("Mangeoire Céramique", "8.50 €", "ceramic bowl", description="Une mangeoire lourde et stable qui ne se renverse pas."),
                _product("Roue d'Exercice Silencieuse", "15.90 €", "hamster wheel", description="Une roue silencieuse pour que votre rongeur se dépense sans bruit la nuit."),
                _product("Cage à Barreaux + Tunnel", "74.00 €", "rodent cage", description="Une cage modulable avec tunnels et cachettes pour l'épanouissement."),
                _product("Friandises aux Fruits", "4.50 €", "rodent treats", description="Des bâtonnets gourmands aux fruits pour récompenser votre compagnon."),
                _product("Biberon Goutte-à-Goutte", "5.90 €", "water bottle", description="Un biberon anti-fuite à fixer sur la cage pour une hydratation constante."),
            ]},
        ]
    if any(k in p for k in ["avocat", "juridique", "cabinet", "droit"]):
        return [
            {"name": "Droit des Affaires", "products": [
                _product("Consultation Stratégique", "150.00 €", "lawyer consultation", description="Un premier rendez-vous pour analyser votre situation et définir la stratégie adaptée."),
                _product("Rédaction de Contrat", "390.00 €", "contract document", description="Rédaction de contrats commerciaux sur mesure, sécurisés juridiquement."),
                _product("Audit Juridique Annuel", "650.00 €", "legal audit", description="Un audit complet de vos documents et procédures pour anticiper les risques."),
                _product("Constitution de Société", "890.00 €", "company formation", description="Accompagnement complet pour la création de votre entreprise."),
                _product("Relance et Recouvrement", "350.00 €", "debt collection", description="Gestion des impayés et procédures de recouvrement amiable."),
                _product("Cession de Fonds de Commerce", "1 200.00 €", "business transfer", description="Conseil et rédaction pour la vente ou l'achat d'un fonds de commerce."),
            ]},
            {"name": "Droit Immobilier", "products": [
                _product("Rédaction de Bail Commercial", "450.00 €", "lease agreement", description="Rédaction ou révision de baux commerciaux conformes à la réglementation."),
                _product("Transaction Immobilière", "750.00 €", "real estate deal", description="Sécurisation de vos transactions immobilières de bout en bout."),
                _product("Contentieux Locatif", "600.00 €", "real estate dispute", description="Défense de vos intérêts dans les litiges entre bailleur et locataire."),
                _product("Promesse de Vente", "380.00 €", "sale agreement", description="Rédaction de promesses et compromis de vente fiables et opposables."),
                _product("Copropriété et Syndic", "420.00 €", "condominium law", description="Conseil pour les syndics et assemblées de copropriété."),
                _product("Urbanisme et Permis", "520.00 €", "urban planning", description="Assistance pour vos démarches d'urbanisme et recours administratifs."),
            ]},
            {"name": "Droit du Travail", "products": [
                _product("Contrat de Travail", "280.00 €", "employment contract", description="Rédaction de contrats de travail et annexes conformes au droit en vigueur."),
                _product("Défense Salarié", "540.00 €", "employee defense", description="Représentation et défense de vos droits devant le conseil de prud'hommes."),
                _product("Licenciement Encadré", "590.00 €", "labor dismissal", description="Sécurisation des procédures de licenciement pour les employeurs."),
                _product("Accord de Rupture Convent.", "320.00 €", "mutual agreement", description="Négociation et rédaction de ruptures conventionnelles sécurisées."),
                _product("Plan de Formation", "250.00 €", "training plan", description="Conseil sur les obligations de formation et le plan de développement."),
                _product("Prud'hommes Assistance", "780.00 €", "labor court", description="Accompagnement complet lors de l'audience prud'homale."),
            ]},
            {"name": "Contentieux & Conseil", "products": [
                _product("Assistance Contentieux", "890.00 €", "courtroom justice", description="Représentation devant toutes les juridictions civiles et commerciales."),
                _product("Médiation et Conciliation", "340.00 €", "mediation", description="Une résolution amiable et rapide de vos différends."),
                _product("Droit des Familles", "420.00 €", "family law", description="Conseil et assistance pour les affaires familiales et patrimoniales."),
                _product("Garde et Divorce", "520.00 €", "divorce", description="Accompagnement bienveillant dans les procédures de divorce."),
                _product("Successions et Donations", "480.00 €", "inheritance law", description="Organisation et sécurisation de vos transmissions patrimoniales."),
                _product("Forfait Entreprise Annuel", "1 900.00 €", "business meeting", description="Un accompagnement juridique annuel illimité pour les PME."),
            ]},
        ]
    if any(k in p for k in ["pizza", "restaurant", "cuisine", "italien"]):
        return [
            {"name": "Pizzas Signature", "products": [
                _product("Margherita Classique", "11.50 €", "margherita pizza", description="Tomates San Marzano, mozzarella fondante et basilic frais."),
                _product("Quattro Stagioni", "14.90 €", "pizza four seasons", description="Artichauts, jambon, champignons et olives sur une pâte fine."),
                _product("Calzone Artisanal", "12.90 €", "calzone", description="Une pizza pliée garnie de ricotta, jambon et mozzarella."),
                _product("Diavola", "13.90 €", "spicy pizza", description="Salami piquant, piments et mozzarella pour les amateurs de sensations."),
                _product("Pizza Truffe", "19.50 €", "truffle pizza", description="Crème de truffe, champignons et parmesan affiné."),
                _product("Végétarienne du Marché", "12.90 €", "vegetarian pizza", description="Légumes de saison grillés et mozzarella di bufala."),
            ]},
            {"name": "Pâtes & Risottos", "products": [
                _product("Pâtes Fraîches du Jour", "12.50 €", "fresh pasta", description="Des pâtes faites maison accompagnées d'une sauce du moment."),
                _product("Risotto aux Champignons", "14.90 €", "risotto mushroom", description="Un risotto crémeux aux champignons de saison et parmesan."),
                _product("Tagliatelles Saumon", "16.50 €", "salmon pasta", description="Tagliatelles fraîches, saumon fumé et crème citronnée."),
                _product("Lasagnes Traditionnelles", "13.50 €", "lasagna", description="Lasagnes au ragù maison gratinées au four."),
                _product("Penne à la Norma", "13.90 €", "penne pasta", description="Aubergines, tomates et ricotta salée dans la grande tradition sicilienne."),
                _product("Gnocchis au Gorgonzola", "14.50 €", "gnocchi", description="Gnocchis moelleux nappés d'une sauce gorgonzola crémeuse."),
            ]},
            {"name": "Desserts Maison", "products": [
                _product("Tiramisu Maison", "6.50 €", "tiramisu dessert", description="Le dessert italien par excellence : mascarpone, café et cacao."),
                _product("Panna Cotta", "5.90 €", "panna cotta", description="Une panna cotta onctueuse accompagnée de coulis de fruits rouges."),
                _product("Tarte de la Maison", "24.90 €", "fruit tart", description="Une tarte gourmande composée de fruits de saison."),
                _product("Cannoli Siciliani", "6.90 €", "cannoli", description="Deux cannolis croustillants fourrés à la ricotta sucrée."),
                _product("Affogato", "5.50 €", "affogato", description="Une boule de glace vanille noyée dans un espresso brûlant."),
                _product("Panna Cotta Chocolat", "6.20 €", "chocolate panna cotta", description="Une variante gourmande au chocolat noir intense."),
            ]},
            {"name": "Menus & Formules", "products": [
                _product("Menu Dégustation", "28.00 €", "tasting menu", description="Un parcours gourmand : entrée, plat et dessert au choix."),
                _product("Formule Midi", "16.90 €", "lunch menu", description="Plat du jour, dessert et boisson à prix doux."),
                _product("Menu Enfant", "9.50 €", "kids menu", description="Pizza ou pâtes, glace et boisson pour les petits gourmets."),
                _product("Coffret Apéritif Italien", "22.00 €", "italian antipasti", description="Un assortiment d'antipasti, charcuteries et fromages italiens."),
                _product("Panettone de Noël", "18.90 €", "panettone", description="Le grand classique milanais aux fruits confits."),
                _product("Carte des Vins Dégustation", "35.00 €", "wine tasting", description="Trois verres de vins italiens sélectionnés par notre sommelier."),
            ]},
        ]
    if any(k in p for k in ["coffee", "café", "coffee shop", "barista", "espresso"]):
        return [
            {"name": "Cafés & Expressos", "products": [
                _product("Espresso Classique", "2.50 €", "espresso coffee", description="Un espresso intense et aromatique, extrait lentement pour un goût parfait."),
                _product("Cappuccino Onctueux", "3.80 €", "cappuccino", description="Espresso, lait chaud et mousse légère pour un moment de douceur."),
                _product("Flat White", "4.20 €", "flat white coffee", description="Double ristretto et lait micro-mousse pour les vrais amateurs de café."),
                _product("Latte Maison", "4.00 €", "latte coffee", description="Un latte crémeux préparé avec notre mélange de grains sélectionnés."),
                _product("Cold Brew 24h", "4.50 €", "cold brew coffee", description="Infusion à froid pendant 24h pour un café doux, fruité et sans amertume."),
                _product("Café Filtre du Jour", "3.20 €", "filter coffee", description="Un café filtre artisanal, préparé chaque matin avec des grains torréfiés frais."),
            ]},
            {"name": "Boissons Chaudes & Alternatives", "products": [
                _product("Matcha Latte", "4.80 €", "matcha latte", description="Thé matcha japonais biologique monté en latte crémeux."),
                _product("Chocolat Chaud Artisanal", "4.00 €", "hot chocolate", description="Préparé avec du chocolat noir fondu, doux et intense à la fois."),
                _product("Châi Latte Epicé", "4.50 €", "chai latte", description="Infusion d'épices indiennes, lait vaporé et touche de cannelle."),
                _product("Latte Lavande", "4.60 €", "lavender latte", description="Espresso et sirop de lavande pour un latte floral et délicat."),
                _product("Thé Noir Darjeeling", "3.50 €", "black tea", description="Un thé Darjeeling de première flush aux notes fleuries et muscatelées."),
                _product("Tisane Maison", "3.20 €", "herbal tea", description="Mélange de plantes fraîches de saison composé par notre barista."),
            ]},
            {"name": "Pâtisseries & Snacks", "products": [
                _product("Croissant Beurre AOP", "2.20 €", "butter croissant", description="Feuilletage doré et croustillant, préparé par notre boulanger partenaire."),
                _product("Banana Bread Noix", "3.50 €", "banana bread", description="Un banana bread moelleux aux noix de pécan et pépites de chocolat."),
                _product("Carrot Cake", "4.20 €", "carrot cake", description="Gâteau à la carotte et épices, nappé d'un glaçage fromage frais."),
                _product("Cookie Double Chocolat", "2.80 €", "chocolate cookie", description="Un cookie géant croustillant dehors et fondant à l'intérieur."),
                _product("Muffin Myrtille", "3.20 €", "blueberry muffin", description="Un muffin généreux garni de myrtilles fraîches et sucre croustillant."),
                _product("Toast Avocat", "6.50 €", "avocado toast", description="Toast maison, purée d'avocat, œuf poché et graines de sésame."),
            ]},
            {"name": "Café en Grains & Accessoires", "products": [
                _product("Grains Origine Ethiopie 250g", "14.90 €", "coffee beans", description="Grains Ethiopie Yirgacheffe aux notes florales et fruits rouges."),
                _product("Grains Blend Signature 250g", "12.90 €", "roasted coffee beans", description="Notre mélange maison torréfié sur place, équilibré et gourmand."),
                _product("Cafetière Chemex 6 Tasses", "49.90 €", "chemex coffee maker", description="La cafetière Chemex iconique pour un café filtre cristallin à la maison."),
                _product("Kit Barista Débutant", "39.90 €", "barista kit", description="Tout le nécessaire pour réaliser des lattes art et cafés parfaits chez soi."),
                _product("Capsules Bio x10", "6.90 €", "coffee capsules", description="Capsules compatibles Nespresso, café biologique certifié Rainforest."),
                _product("Tasse Double Paroi 250ml", "18.90 €", "coffee cup", description="Tasse en verre double paroi qui garde votre boisson chaude plus longtemps."),
            ]},
        ]
    return [
        {"name": "Produits Phares", "products": [
            _product("Produit Star", "49.90 €", "best seller product", description="Notre produit le plus demandé, au meilleur rapport qualité-prix."),
            _product("Pack Essentiel", "99.00 €", "essential products", description="Un pack complet pour démarrer avec l'essentiel du nécessaire."),
            _product("Édition Premium", "149.00 €", "premium product", description="Une édition limitée aux finitions haut de gamme."),
            _product("Pack Découverte", "39.90 €", "discovery pack", description="Idéal pour tester notre gamme en toute simplicité."),
            _product("Coque Protectrice", "19.90 €", "protective case", description="Une protection robuste et élégante pour votre appareil."),
            _product("Câble Rapide USB-C", "14.90 €", "usb cable", description="Un câble haute vitesse résistant et durable au quotidien."),
        ]},
        {"name": "Nouveautés", "products": [
            _product("Nouveau Produit 2026", "59.90 €", "new product", description="Découvrez la dernière innovation de notre marque."),
            _product("Coffret Cadeau", "69.90 €", "gift box", description="Un coffret élégant prêt à offrir, pour toutes les occasions."),
            _product("Accessoire Exclusif", "29.90 €", "exclusive accessory", description="Un accessoire en édition limitée, réservé à nos clients."),
            _product("Pack Famille", "119.00 €", "family bundle", description="Un lot économique pensé pour toute la famille."),
            _product("Version Pro", "199.00 €", "pro version", description="La version professionnelle avec toutes les fonctionnalités avancées."),
            _product("Carte Cadeau 50€", "50.00 €", "gift card", description="La carte cadeau parfaite pour faire plaisir."),
        ]},
        {"name": "Services", "products": [
            _product("Installation Assistée", "39.00 €", "installation service", description="Nos experts installent et configurent votre produit à domicile."),
            _product("Garantie Étendue 2 ans", "29.90 €", "extended warranty", description="Une protection supplémentaire contre les pannes et accidents."),
            _product("Maintenance Premium", "79.00 €", "maintenance service", description="Un contrat annuel incluant le suivi et les mises à jour."),
            _product("Support Prioritaire", "19.90 €", "priority support", description="Une ligne dédiée avec une réponse en moins de 2 heures."),
            _product("Formation Individuelle", "89.00 €", "training session", description="Une session personnalisée pour maîtriser votre produit."),
            _product("Abonnement Contenu", "9.90 €", "content subscription", description="Un accès mensuel à nos guides et contenus exclusifs."),
        ]},
        {"name": "Accessoires", "products": [
            _product("Chargeur Sans Fil", "34.90 €", "wireless charger", description="Un chargeur rapide et élégant, compatible avec tous vos appareils."),
            _product("Sac de Transport", "44.90 €", "carry bag", description="Un sac rembourré pour transporter votre matériel en toute sécurité."),
            _product("Sangle Confort", "15.90 €", "comfort strap", description="Une sangle ajustable pour un confort optimal au quotidien."),
            _product("Kit de Nettoyage", "12.90 €", "cleaning kit", description="Tout pour entretenir votre équipement et le garder comme neuf."),
            _product("Support Universel", "24.90 €", "universal stand", description="Un support stable et ajustable, compatible avec de nombreux modèles."),
            _product("Lot de Rangement", "18.90 €", "storage set", description="Des boîtes modulaires pour organiser vos accessoires."),
        ]},
    ]


def generate_smart_fallback(prompt: str) -> dict:
    """Génère un agencement multi-sections varié et structuré si l'API Gemini est indisponible."""
    p = prompt.lower() if prompt else ""

    # Détection du nombre de cartes pour les sections "columns"
    if "1 colonne" in p or "une colonne" in p:
        grid_count = 1
    elif "2 colonnes" in p or "deux colonnes" in p:
        grid_count = 2
    elif "4 colonnes" in p or "quatre colonnes" in p:
        grid_count = 4
    else:
        grid_count = 3

    def make_columns(layout, columns):
        return {
            "id": "columns_1",
            "type": "columns",
            "layout_style": layout,
            "title": "Nos Expertises",
            "subtitle": "Des solutions sur mesure pour répondre à tous vos besoins.",
            "columns": columns,
        }

    def make_gallery(layout, items):
        return {
            "id": "gallery_1",
            "type": "gallery",
            "layout_style": layout,
            "title": "Galerie",
            "subtitle": "Découvrez nos réalisations en images.",
            "items": items,
        }

    if any(k in p for k in ["boulangerie", "pâtisserie", "pain"]):
        theme = {
            "primary_color": "#b45309",
            "secondary_color": "#f59e0b",
            "background_color": "#fff7ed",
            "font_family": "serif",
            "border_radius": "lg",
        }
        hero_keyword = "bakery, bread"
        sections = [
            _navbar_section({
                "brand_name": "Boulangerie Artisanale",
                "cta_text": "Nous trouver",
            }, "navbar_1"),
            {
                "id": "hero_1",
                "type": "hero",
                "layout_style": "centered_bg",
                "title": "Boulangerie Artisanale & Pâtisserie",
                "subtitle": "Le goût authentique du pain frais et des viennoiseries faites maison.",
                "cta_text": "Découvrir nos créations",
                "image_keyword": hero_keyword,
                "image_url": _stock_url(hero_keyword, 1600, 900),
            },
            make_gallery("row_grid", [
                {"title": "Pains de campagne", "image_keyword": "sourdough bread", "image_url": _stock_url("sourdough bread", 800, 600)},
                {"title": "Croissants dorés", "image_keyword": "croissant pastry", "image_url": _stock_url("croissant pastry", 800, 600)},
                {"title": "Tartes fruitières", "image_keyword": "fruit tart", "image_url": _stock_url("fruit tart", 800, 600)},
                {"title": "Pièces montées", "image_keyword": "wedding cake", "image_url": _stock_url("wedding cake", 800, 600)},
            ]),
            make_columns("alternating_rows", [
                {
                    "title": "Pains Traditionnels",
                    "text": "Fabriqués chaque matin avec des farines locales et au levain naturel.",
                    "content_type": "both",
                    "image_keyword": "artisan bread",
                    "image_url": _stock_url("artisan bread", 800, 600),
                },
                {
                    "title": "Viennoiseries",
                    "text": "Croissants au beurre AOP et pains au chocolat croustillants.",
                    "content_type": "both",
                    "image_keyword": "pastry, croissant",
                    "image_url": _stock_url("pastry, croissant", 800, 600),
                },
                {
                    "title": "Gâteaux & Tartes",
                    "text": "Des créations gourmandes pour tous vos événements d'exception.",
                    "content_type": "both",
                    "image_keyword": "cake, dessert",
                    "image_url": _stock_url("cake, dessert", 800, 600),
                },
                {
                    "title": "Commandes sur mesure",
                    "text": "Composez votre sélection pour vos événements et réceptions.",
                    "content_type": "both",
                    "image_keyword": "bakery display",
                    "image_url": _stock_url("bakery display", 800, 600),
                },
            ]),
            {
                "id": "testimonials_1",
                "type": "testimonials",
                "layout_style": "quote_cards",
                "title": "Ils Adorent Nos Pains",
                "reviews": [
                    {"quote": "Le meilleur croissant de la ville, un vrai délice chaque matin.", "author": "Claire D.", "role": "Cliente"},
                    {"quote": "Des pains au levain d'une qualité exceptionnelle.", "author": "Marc T.", "role": "Client"},
                    {"quote": "Un accueil chaleureux et des gâteaux magnifiques.", "author": "Élodie B.", "role": "Cliente"},
                ],
            },
            {
                "id": "overlay_1",
                "type": "overlay",
                "layout_style": "split_cta",
                "title": "Commandez Vos Créations Pâtissières",
                "subtitle": "Une envie particulière pour votre événement ? Contactez nos artisans.",
                "cta_text": "Passer commande",
                "image_keyword": "wheat, bakery",
                "image_url": _stock_url("wheat, bakery", 1600, 900),
            },
            _footer_section({
                "brand_name": "Boulangerie Artisanale",
                "description": "Le goût authentique du pain frais et des viennoiseries faites maison.",
                "copyright": "© 2026 Boulangerie Artisanale. Tous droits réservés.",
            }, "footer_1"),
        ]
    elif any(k in p for k in ["animalerie", "chien", "chat", "animal", "chiot", "vétérinaire"]):
        theme = {
            "primary_color": "#047857",
            "secondary_color": "#f59e0b",
            "background_color": "#f0fdf4",
            "font_family": "sans-serif",
            "border_radius": "full",
        }
        hero_keyword = "pet shop"
        sections = [
            _navbar_section({
                "brand_name": "Votre Animalerie",
                "cta_text": "Nous contacter",
            }, "navbar_1"),
            {
                "id": "hero_1",
                "type": "hero",
                "layout_style": "split_50_50",
                "title": "Animalerie & Boutique pour Animaux",
                "subtitle": "Tout pour le bien-être de vos compagnons : alimentation, accessoires et conseils.",
                "cta_text": "Découvrir nos produits",
                "image_keyword": hero_keyword,
                "image_url": _stock_url(hero_keyword, 1600, 900),
            },
            {
                "id": "stats_1",
                "type": "stats",
                "layout_style": "metric_grid",
                "title": "L'Animalerie en Chiffres",
                "metrics": [
                    {"label": "Clients satisfaits", "value": "12 000+"},
                    {"label": "Espèces référencées", "value": "350+"},
                    {"label": "Années d'expérience", "value": "20+"},
                    {"label": "Conseillers experts", "value": "15"},
                ],
            },
            make_columns("asymmetric_featured", [
                {
                    "title": "Alimentation Chien",
                    "text": "Des croquettes et pâtées de qualité, adaptées à chaque race et âge.",
                    "content_type": "both",
                    "image_keyword": "dog food",
                    "image_url": _stock_url("dog food", 800, 600),
                },
                {
                    "title": "Alimentation Chat",
                    "text": "Des recettes savoureuses et équilibrées pour les chats difficiles.",
                    "content_type": "both",
                    "image_keyword": "cat food",
                    "image_url": _stock_url("cat food", 800, 600),
                },
                {
                    "title": "Accessoires & Jeux",
                    "text": "Lits, jouets, laisses et arbres à chat pour le bonheur de vos animaux.",
                    "content_type": "both",
                    "image_keyword": "pet accessories",
                    "image_url": _stock_url("pet accessories", 800, 600),
                },
            ]),
            make_gallery("masonry_grid", [
                {"title": "Boutique chaleureuse", "image_keyword": "pet store", "image_url": _stock_url("pet store", 800, 600)},
                {"title": "Chiot curieux", "image_keyword": "puppy", "image_url": _stock_url("puppy", 800, 600)},
                {"title": "Chaton câlin", "image_keyword": "kitten", "image_url": _stock_url("kitten", 800, 600)},
                {"title": "Accessoires colorés", "image_keyword": "pet toys", "image_url": _stock_url("pet toys", 800, 600)},
            ]),
            {
                "id": "overlay_1",
                "type": "overlay",
                "layout_style": "full_bg_banner",
                "title": "Offrez le Meilleur à Votre Compagnon",
                "subtitle": "Bénéficiez de conseils personnalisés et d'une livraison rapide partout en France.",
                "cta_text": "Voir le catalogue",
                "image_keyword": "happy pet",
                "image_url": _stock_url("happy pet", 1600, 900),
            },
            _footer_section({
                "brand_name": "Votre Animalerie",
                "description": "Tout pour le bien-être de vos compagnons, en boutique et en ligne.",
                "copyright": "© 2026 Votre Animalerie. Tous droits réservés.",
            }, "footer_1"),
        ]
    elif any(k in p for k in ["avocat", "juridique", "cabinet", "droit"]):
        theme = {
            "primary_color": "#1e293b",
            "secondary_color": "#334155",
            "background_color": "#f8fafc",
            "font_family": "serif",
            "border_radius": "none",
        }
        hero_keyword = "lawyer, office"
        sections = [
            _navbar_section({
                "brand_name": "Cabinet d'Avocats",
                "cta_text": "Prendre rendez-vous",
            }, "navbar_1"),
            {
                "id": "hero_1",
                "type": "hero",
                "layout_style": "split_50_50",
                "title": "Cabinet d'Avocats & Conseil Juridique",
                "subtitle": "Un accompagnement rigoureux et personnalisé pour tous vos besoins juridiques.",
                "cta_text": "Prendre rendez-vous",
                "image_keyword": hero_keyword,
                "image_url": _stock_url(hero_keyword, 1600, 900),
            },
            {
                "id": "stats_1",
                "type": "stats",
                "layout_style": "banner_stats",
                "title": "Le Cabinet en Chiffres",
                "metrics": [
                    {"label": "Années d'expérience", "value": "25+"},
                    {"label": "Affaires plaidées", "value": "1200+"},
                    {"label": "Taux de satisfaction", "value": "98%"},
                    {"label": "Associés experts", "value": "12"},
                ],
            },
            make_columns("grid_cards", [
                {
                    "title": "Droit des Affaires",
                    "text": "Conseil et accompagnement des entreprises et dirigeants.",
                    "content_type": "both",
                    "image_keyword": "law, gavel",
                    "image_url": _stock_url("law, gavel", 800, 600),
                },
                {
                    "title": "Droit Immobilier",
                    "text": "Baux, transactions et contentieux immobiliers.",
                    "content_type": "both",
                    "image_keyword": "lawyer, contract",
                    "image_url": _stock_url("lawyer, contract", 800, 600),
                },
                {
                    "title": "Droit du Travail",
                    "text": "Défense des salariés et assistance aux employeurs.",
                    "content_type": "both",
                    "image_keyword": "courtroom",
                    "image_url": _stock_url("courtroom", 800, 600),
                },
            ][:grid_count] if grid_count <= 3 else [
                {
                    "title": "Droit des Affaires",
                    "text": "Conseil et accompagnement des entreprises et dirigeants.",
                    "content_type": "both",
                    "image_keyword": "law, gavel",
                    "image_url": _stock_url("law, gavel", 800, 600),
                },
                {
                    "title": "Droit Immobilier",
                    "text": "Baux, transactions et contentieux immobiliers.",
                    "content_type": "both",
                    "image_keyword": "lawyer, contract",
                    "image_url": _stock_url("lawyer, contract", 800, 600),
                },
                {
                    "title": "Droit du Travail",
                    "text": "Défense des salariés et assistance aux employeurs.",
                    "content_type": "both",
                    "image_keyword": "courtroom",
                    "image_url": _stock_url("courtroom", 800, 600),
                },
                {
                    "title": "Gestion des Contentieux",
                    "text": "Représentation devant toutes les juridictions.",
                    "content_type": "both",
                    "image_keyword": "legal, books",
                    "image_url": _stock_url("legal, books", 800, 600),
                },
            ]),
            {
                "id": "testimonials_1",
                "type": "testimonials",
                "layout_style": "full_width_quote",
                "title": "Ils Nous Font Confiance",
                "reviews": [
                    {"quote": "Un accompagnement d'une rigueur remarquable, toujours à l'écoute.", "author": "Marie L.", "role": "Dirigeante d'entreprise"},
                    {"quote": "Une équipe qui maîtrise parfaitement le droit des affaires.", "author": "Julien R.", "role": "Chef d'entreprise"},
                    {"quote": "Disponibles et efficaces dans les moments décisifs.", "author": "Sophie M.", "role": "Promoteur immobilier"},
                ],
            },
            {
                "id": "overlay_1",
                "type": "overlay",
                "layout_style": "full_bg_banner",
                "title": "Une Urgence Juridique ?",
                "subtitle": "Prenez rendez-vous en ligne avec l'un de nos associés.",
                "cta_text": "Nous contacter",
                "image_keyword": "courtroom, justice",
                "image_url": _stock_url("courtroom, justice", 1600, 900),
            },
            _footer_section({
                "brand_name": "Cabinet d'Avocats",
                "description": "Un accompagnement rigoureux et personnalisé pour tous vos besoins juridiques.",
                "copyright": "© 2026 Cabinet d'Avocats. Tous droits réservés.",
            }, "footer_1"),
        ]
    elif any(k in p for k in ["pizza", "restaurant", "cuisine", "italien"]):
        theme = {
            "primary_color": "#b91c1c",
            "secondary_color": "#059669",
            "background_color": "#fffaf0",
            "font_family": "serif",
            "border_radius": "sm",
        }
        hero_keyword = "italian pizza"
        sections = [
            _navbar_section({
                "brand_name": "Restaurant & Pizzeria",
                "cta_text": "Réserver",
            }, "navbar_1"),
            {
                "id": "hero_1",
                "type": "hero",
                "layout_style": "split_50_50",
                "title": "Restaurant & Pizzeria Gourmande",
                "subtitle": "Des ingrédients frais et des recettes traditionnelles préparées avec passion.",
                "cta_text": "Réserver une table",
                "image_keyword": hero_keyword,
                "image_url": _stock_url(hero_keyword, 1600, 900),
            },
            make_columns("alternating_rows", [
                {
                    "title": "Plats du Jour",
                    "text": "Une cuisine de saison élaborée à partir de produits frais.",
                    "content_type": "both",
                    "image_keyword": "pasta, italian",
                    "image_url": _stock_url("pasta, italian", 800, 600),
                },
                {
                    "title": "Pizzas au Feu de Bois",
                    "text": "Pâte artisanale maturée 48h et garnitures savoureuses.",
                    "content_type": "both",
                    "image_keyword": "pizza oven",
                    "image_url": _stock_url("pizza oven", 800, 600),
                },
                {
                    "title": "Desserts Maison",
                    "text": "Tiramisu traditionnel, panna cotta et tartes de la maison.",
                    "content_type": "both",
                    "image_keyword": "tiramisu, dessert",
                    "image_url": _stock_url("tiramisu, dessert", 800, 600),
                },
                {
                    "title": "Réservations",
                    "text": "Réservez votre table en ligne pour vos dîners et événements.",
                    "content_type": "both",
                    "image_keyword": "restaurant, table",
                    "image_url": _stock_url("restaurant, table", 800, 600),
                },
            ][:grid_count] if grid_count <= 3 else [
                {
                    "title": "Plats du Jour",
                    "text": "Une cuisine de saison élaborée à partir de produits frais.",
                    "content_type": "both",
                    "image_keyword": "pasta, italian",
                    "image_url": _stock_url("pasta, italian", 800, 600),
                },
                {
                    "title": "Pizzas au Feu de Bois",
                    "text": "Pâte artisanale maturée 48h et garnitures savoureuses.",
                    "content_type": "both",
                    "image_keyword": "pizza oven",
                    "image_url": _stock_url("pizza oven", 800, 600),
                },
                {
                    "title": "Desserts Maison",
                    "text": "Tiramisu traditionnel, panna cotta et tartes de la maison.",
                    "content_type": "both",
                    "image_keyword": "tiramisu, dessert",
                    "image_url": _stock_url("tiramisu, dessert", 800, 600),
                },
                {
                    "title": "Réservations",
                    "text": "Réservez votre table en ligne pour vos dîners et événements.",
                    "content_type": "both",
                    "image_keyword": "restaurant, table",
                    "image_url": _stock_url("restaurant, table", 800, 600),
                },
            ]),
            make_gallery("row_grid", [
                {"title": "Pizzas du four", "image_keyword": "wood fired pizza", "image_url": _stock_url("wood fired pizza", 800, 600)},
                {"title": "Pâtes fraîches", "image_keyword": "fresh pasta", "image_url": _stock_url("fresh pasta", 800, 600)},
                {"title": "Plats gourmands", "image_keyword": "italian food", "image_url": _stock_url("italian food", 800, 600)},
                {"title": "Ambiance italienne", "image_keyword": "restaurant interior", "image_url": _stock_url("restaurant interior", 800, 600)},
            ]),
            {
                "id": "overlay_1",
                "type": "overlay",
                "layout_style": "full_bg_banner",
                "title": "Réservez Votre Table Dès Maintenant",
                "subtitle": "Une soirée inoubliable autour de la gastronomie italienne vous attend.",
                "cta_text": "Réserver",
                "image_keyword": "pasta, italian",
                "image_url": _stock_url("pasta, italian", 1600, 900),
            },
            _footer_section({
                "brand_name": "Restaurant & Pizzeria",
                "description": "Des ingrédients frais et des recettes traditionnelles préparées avec passion.",
                "copyright": "© 2026 Restaurant & Pizzeria. Tous droits réservés.",
            }, "footer_1"),
        ]
    elif any(k in p for k in ["coffee", "café", "coffee shop", "barista", "espresso"]):
        theme = {
            "primary_color": "#78350f",
            "secondary_color": "#d97706",
            "background_color": "#fffbf5",
            "font_family": "serif",
            "border_radius": "lg",
        }
        hero_keyword = "coffee shop"
        sections = [
            _navbar_section({
                "brand_name": "Coffee Shop",
                "cta_text": "Commander",
            }, "navbar_1"),
            {
                "id": "hero_1",
                "type": "hero",
                "layout_style": "split_50_50",
                "title": "Votre Coffee Shop Artisanal",
                "subtitle": "Des cafés de spécialité, des pâtisseries maison et une atmosphère chaleureuse.",
                "cta_text": "Voir le menu",
                "image_keyword": hero_keyword,
                "image_url": _stock_url(hero_keyword, 1600, 900),
            },
            {
                "id": "stats_1",
                "type": "stats",
                "layout_style": "metric_grid",
                "title": "Notre Coffee en Chiffres",
                "metrics": [
                    {"label": "Origines de café", "value": "12+"},
                    {"label": "Clients quotidiens", "value": "300+"},
                    {"label": "Recettes signatures", "value": "25"},
                    {"label": "Années d'expertise", "value": "8"},
                ],
            },
            make_columns("alternating_rows", [
                {
                    "title": "Cafés de Spécialité",
                    "text": "Des grains soigneusement sélectionnés, torréfiés localement et préparés avec passion.",
                    "content_type": "both",
                    "image_keyword": "specialty coffee",
                    "image_url": _stock_url("specialty coffee", 800, 600),
                },
                {
                    "title": "Pâtisseries Maison",
                    "text": "Croissants, banana bread et gâteaux préparés chaque matin par nos boulangers.",
                    "content_type": "both",
                    "image_keyword": "pastry coffee",
                    "image_url": _stock_url("pastry coffee", 800, 600),
                },
                {
                    "title": "Espace Cosy",
                    "text": "Un cadre chaleureux pour travailler, lire ou simplement profiter du moment.",
                    "content_type": "both",
                    "image_keyword": "cozy cafe interior",
                    "image_url": _stock_url("cozy cafe interior", 800, 600),
                },
            ]),
            make_gallery("masonry_grid", [
                {"title": "Latte Art", "image_keyword": "latte art", "image_url": _stock_url("latte art", 800, 600)},
                {"title": "Cold Brew", "image_keyword": "cold brew", "image_url": _stock_url("cold brew", 800, 600)},
                {"title": "Pâtisseries", "image_keyword": "cafe pastry", "image_url": _stock_url("cafe pastry", 800, 600)},
                {"title": "Ambiance", "image_keyword": "cafe ambiance", "image_url": _stock_url("cafe ambiance", 800, 600)},
            ]),
            {
                "id": "overlay_1",
                "type": "overlay",
                "layout_style": "split_cta",
                "title": "Commandez Votre Café Préféré",
                "subtitle": "Retrouvez tous nos cafés, boissons et pâtisseries dans notre boutique en ligne.",
                "cta_text": "Voir le catalogue",
                "image_keyword": "barista coffee",
                "image_url": _stock_url("barista coffee", 1600, 900),
            },
            _footer_section({
                "brand_name": "Coffee Shop",
                "description": "Cafés de spécialité, pâtisseries maison et atmosphère chaleureuse.",
                "copyright": "© 2026 Coffee Shop. Tous droits réservés.",
            }, "footer_1"),
        ]
    else:
        theme = {
            "primary_color": "#4f46e5",
            "secondary_color": "#06b6d4",
            "background_color": "#ffffff",
            "font_family": "sans-serif",
            "border_radius": "lg",
        }
        hero_keyword = "modern office"
        sections = [
            _navbar_section({
                "brand_name": "Votre Marque",
                "cta_text": "Contactez-nous",
            }, "navbar_1"),
            {
                "id": "hero_1",
                "type": "hero",
                "layout_style": "minimal_text",
                "title": "Bienvenue sur notre site web",
                "subtitle": "Découvrez nos services sur mesure et notre savoir-faire d'exception.",
                "cta_text": "Découvrir",
                "image_keyword": hero_keyword,
                "image_url": _stock_url(hero_keyword, 1600, 900),
            },
            make_columns("grid_cards", [
                {
                    "title": "Présentation",
                    "text": "Découvrez notre équipe passionnée et notre savoir-faire unique.",
                    "content_type": "both",
                    "image_keyword": "teamwork",
                    "image_url": _stock_url("teamwork", 800, 600),
                },
                {
                    "title": "Nos Services",
                    "text": "Des solutions sur mesure adaptées à tous vos projets.",
                    "content_type": "both",
                    "image_keyword": "technology, office",
                    "image_url": _stock_url("technology, office", 800, 600),
                },
                {
                    "title": "Engagement Qualité",
                    "text": "Une exigence constante pour votre entière satisfaction.",
                    "content_type": "both",
                    "image_keyword": "quality, handshake",
                    "image_url": _stock_url("quality, handshake", 800, 600),
                },
            ][:grid_count] if grid_count <= 3 else [
                {
                    "title": "Présentation",
                    "text": "Découvrez notre équipe passionnée et notre savoir-faire unique.",
                    "content_type": "both",
                    "image_keyword": "teamwork",
                    "image_url": _stock_url("teamwork", 800, 600),
                },
                {
                    "title": "Nos Services",
                    "text": "Des solutions sur mesure adaptées à tous vos projets.",
                    "content_type": "both",
                    "image_keyword": "technology, office",
                    "image_url": _stock_url("technology, office", 800, 600),
                },
                {
                    "title": "Engagement Qualité",
                    "text": "Une exigence constante pour votre entière satisfaction.",
                    "content_type": "both",
                    "image_keyword": "quality, handshake",
                    "image_url": _stock_url("quality, handshake", 800, 600),
                },
                {
                    "title": "Contact",
                    "text": "Contactez-nous dès aujourd'hui pour obtenir votre devis personnalisé.",
                    "content_type": "both",
                    "image_keyword": "contact, phone",
                    "image_url": _stock_url("contact, phone", 800, 600),
                },
            ]),
            make_gallery("masonry_grid", [
                {"title": "Notre équipe", "image_keyword": "office team", "image_url": _stock_url("office team", 800, 600)},
                {"title": "Nos réalisations", "image_keyword": "modern workspace", "image_url": _stock_url("modern workspace", 800, 600)},
                {"title": "Nos événements", "image_keyword": "business event", "image_url": _stock_url("business event", 800, 600)},
                {"title": "Nos locaux", "image_keyword": "corporate building", "image_url": _stock_url("corporate building", 800, 600)},
            ]),
            {
                "id": "overlay_1",
                "type": "overlay",
                "layout_style": "split_cta",
                "title": "Prêt à Lancer Votre Projet ?",
                "subtitle": "Discutons de vos ambitions et construisons ensemble votre succès.",
                "cta_text": "Contactez-nous",
                "image_keyword": "technology, abstract",
                "image_url": _stock_url("technology, abstract", 1600, 900),
            },
            _footer_section({
                "brand_name": "Votre Marque",
                "description": "Des services sur mesure pour concrétiser tous vos projets.",
                "copyright": "© 2026 Votre Marque. Tous droits réservés.",
            }, "footer_1"),
        ]

    return {"theme": theme, "sections": sections, "catalog": _fallback_catalog(prompt)}
