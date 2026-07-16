from typing import Dict, List, Any

# Disease metadata and treatment database
DISEASE_CATALOG = {
    "late_blight": {
        "clean_name": "Late Blight",
        "description": "A destructive fungal-like oomycete disease that spreads rapidly in cool, wet weather, causing dark water-soaked spots on leaves and stems.",
        "is_healthy": False,
        "treatments": [
            "Prune and destroy infected leaves immediately (do not compost them).",
            "Ensure good air circulation by spacing plants properly.",
            "Apply copper-based organic fungicides at the first sign of symptoms.",
            "Water at the base of the plant to keep foliage dry."
        ]
    },
    "early_blight": {
        "clean_name": "Early Blight",
        "description": "A common fungal infection caused by Alternaria solani, characterized by dark spots with concentric 'target-like' rings on older leaves.",
        "is_healthy": False,
        "treatments": [
            "Prune the lower leaves of the plant to prevent soil-splash inoculation.",
            "Apply organic copper fungicide or Bacillus subtilis spray weekly.",
            "Mulch around the base of the plant to create a barrier against soil pathogens.",
            "Ensure crop rotation in subsequent planting seasons."
        ]
    },
    "bacterial_spot": {
        "clean_name": "Bacterial Spot",
        "description": "A bacterial disease causing small, dark, water-soaked spots on leaves, which eventually turn brown and paper-like, leading to leaf drop.",
        "is_healthy": False,
        "treatments": [
            "Avoid handling or pruning the plant when leaves are wet to prevent bacterial spread.",
            "Spray with copper fungicides mixed with mancozeb for chemical control.",
            "Drip irrigate instead of overhead watering to keep foliage dry.",
            "Clear away all fallen leaf debris and weeds around the plant base."
        ]
    },
    "rust": {
        "clean_name": "Rust Infection",
        "description": "A fungal disease identified by orange, yellow, or brown powdery pustules on the undersides of leaves.",
        "is_healthy": False,
        "treatments": [
            "Pinch off infected leaves immediately to halt spore release.",
            "Spray the plant with organic sulfur-based or copper-based fungicides.",
            "Avoid overhead watering and water early in the morning so leaves dry quickly.",
            "Ensure adequate ventilation and spacing between plants."
        ]
    },
    "powdery_mildew": {
        "clean_name": "Powdery Mildew",
        "description": "A widespread fungal disease that covers leaves with a white or gray powdery coating, inhibiting photosynthesis and stunts growth.",
        "is_healthy": False,
        "treatments": [
            "Mix 1 tablespoon of baking soda, 1/2 teaspoon of liquid soap, and 1 gallon of water; spray weekly.",
            "Prune congested areas to increase airflow and light penetration.",
            "Place the plant in a brighter area, as high humidity and low light favor mildew.",
            "Spray organic neem oil to control the spread of active spores."
        ]
    },
    "black_rot": {
        "clean_name": "Black Rot",
        "description": "A serious fungal infection causing circular, light-brown spots that blacken over time, accompanied by small black fruiting bodies.",
        "is_healthy": False,
        "treatments": [
            "Prune out infected branches and remove diseased leaves immediately.",
            "Apply copper fungicide early in the spring as a preventive measure.",
            "Disinfect pruning shears with 70% isopropyl alcohol between every cut."
        ]
    },
    "scab": {
        "clean_name": "Scab Disease",
        "description": "A fungal disease causing olive-green to black velvety spots on leaves, leading to yellowing and premature leaf fall.",
        "is_healthy": False,
        "treatments": [
            "Rake up and burn or discard fallen leaves to prevent overwintering spores.",
            "Apply neem oil or sulfur-based fungicides during the bud break stage.",
            "Prune to keep the tree canopy open and dry."
        ]
    },
    "leaf_mold": {
        "clean_name": "Leaf Mold",
        "description": "A fungal disease prevalent in high humidity, causing pale green or yellow spots on the upper leaf surfaces and olive-green mold on the undersides.",
        "is_healthy": False,
        "treatments": [
            "Reduce humidity levels around the plant (keep under 85% RH).",
            "Increase ventilation by using fans or opening greenhouse vents.",
            "Water early in the morning and avoid getting the leaves wet."
        ]
    },
    "septoria": {
        "clean_name": "Septoria Leaf Spot",
        "description": "A fungal infection causing numerous tiny, circular spots with dark borders and greyish-white centers on lower leaves.",
        "is_healthy": False,
        "treatments": [
            "Remove affected lower leaves to prevent the fungus from climbing.",
            "Apply a copper-based fungicide or bio-fungicide weekly.",
            "Apply mulch to reduce water splash from the soil."
        ]
    },
    "spider_mites": {
        "clean_name": "Spider Mites Infestation",
        "description": "Tiny arachnid pests that feed on sap, causing fine yellow stippling on leaves and delicate webbing on stems.",
        "is_healthy": False,
        "treatments": [
            "Wash the undersides of the leaves with a strong blast of water to dislodge mites.",
            "Apply insecticidal soap, neem oil, or horticultural oils.",
            "Increase local humidity, as spider mites thrive in hot, dry conditions.",
            "Introduce predatory mites (Phytoseiulus persimilis) as a biological control."
        ]
    },
    "greening": {
        "clean_name": "Huanglongbing (Citrus Greening)",
        "description": "A severe bacterial disease spread by psyllids, causing mottled yellow leaves, stunted growth, and bitter fruit.",
        "is_healthy": False,
        "treatments": [
            "Control psyllid vectors using systemic insecticide treatments.",
            "Apply nutritional sprays to improve tree vigor, though it is not a cure.",
            "Remove and destroy severely affected citrus trees to prevent neighboring infections."
        ]
    },
    "virus": {
        "clean_name": "Viral Infection",
        "description": "A viral disease causing yellow mosaic patterns, crinkling, or leaf curling. Viral plant diseases are incurable.",
        "is_healthy": False,
        "treatments": [
            "Remove and destroy the infected plant immediately to protect the rest of your garden.",
            "Control insect vectors like whiteflies and aphids that spread the virus.",
            "Sanitize all tools with bleach or alcohol to prevent mechanical transmission."
        ]
    },
    "healthy": {
        "clean_name": "Healthy Plant Leaf",
        "description": "No symptoms of active pathogen infection or insect infestation detected on the leaf scan.",
        "is_healthy": True,
        "treatments": [
            "Continue your regular watering, lighting, and humidity routines.",
            "Wipe leaf surfaces periodically with a damp cloth to remove dust.",
            "Apply a balanced organic fertilizer according to seasonal guidelines."
        ]
    }
}

def get_disease_details(raw_label: str) -> Dict[str, Any]:
    """
    Parses a raw Hugging Face label string using substring matching
    and returns its catalog details. Falls back to healthy if no match.
    """
    label_lower = raw_label.lower()
    
    # Substring matching rules
    if "healthy" in label_lower:
        category = "healthy"
    elif "late blight" in label_lower:
        category = "late_blight"
    elif "early blight" in label_lower:
        category = "early_blight"
    elif "bacterial spot" in label_lower:
        category = "bacterial_spot"
    elif "rust" in label_lower:
        category = "rust"
    elif "powdery mildew" in label_lower:
        category = "powdery_mildew"
    elif "black rot" in label_lower:
        category = "black_rot"
    elif "scab" in label_lower:
        category = "scab"
    elif "leaf mold" in label_lower:
        category = "leaf_mold"
    elif "septoria" in label_lower:
        category = "septoria"
    elif "spider mite" in label_lower:
        category = "spider_mites"
    elif "greening" in label_lower or "haunglongbing" in label_lower:
        category = "greening"
    elif "virus" in label_lower or "mosaic" in label_lower or "curl" in label_lower:
        category = "virus"
    else:
        # Catch-all default: if unknown, return a custom alert
        return {
            "clean_name": f"Unknown Condition ({raw_label})",
            "description": "An unrecognized pattern was detected by the AI. Review and clean the leaves.",
            "is_healthy": False,
            "treatments": [
                "Monitor the plant closely for signs of discoloration or pests.",
                "Isolate the plant temporarily to avoid cross-contamination.",
                "Consult a botanist or agricultural extension specialist."
            ]
        }
        
    return DISEASE_CATALOG[category]
