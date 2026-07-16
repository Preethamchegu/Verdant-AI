import os
from datetime import datetime, timedelta
from database.models import Plant

class CarePlanner:
    def __init__(self):
        pass

    def generate_plan(self, plant: Plant, weather_data: dict) -> list[dict]:
        """
        Generates care intervals (watering, fertilizer, misting) using a rule engine.
        Combines species traits, indoor/outdoor setting, and current weather logs.
        """
        species_lower = plant.species.lower()
        location_lower = plant.location.lower()
        is_outdoor = "outdoor" in location_lower
        
        # 1. Base rules based on species family traits
        # Succulents & Cacti
        if any(s in species_lower for s in ["succulent", "cactus", "aloe", "jade", "snake plant", "sansevieria", "haworthia"]):
            base_water_interval = 12
            base_fertilizer_interval = 45
            base_misting_interval = None # No misting needed for succulents
            family = "Succulent"
            
        # Ferns & Tropicals (High humidity lovers)
        elif any(s in species_lower for s in ["fern", "monstera", "pothos", "philodendron", "epipremnum", "peace lily", "spathiphyllum", "ficus"]):
            base_water_interval = 5
            base_fertilizer_interval = 30
            base_misting_interval = 2 # Mist every 2 days
            family = "Tropical/Fern"
            
        # Crops & Herbs (High resource needs)
        elif any(s in species_lower for s in ["tomato", "pepper", "basil", "mint", "herb", "chili", "neem"]):
            base_water_interval = 4
            base_fertilizer_interval = 14 # Crop feeding
            base_misting_interval = None
            family = "Crop/Herb"
            
        # Default house plants
        else:
            base_water_interval = 7
            base_fertilizer_interval = 30
            base_misting_interval = None
            family = "Standard Houseplant"

        # 2. Apply weather adjustments
        water_reasoning_parts = [f"Base watering interval of {base_water_interval} days for {family}."]
        fert_reasoning_parts = [f"Base fertilizer interval of {base_fertilizer_interval} days."]
        misting_reasoning_parts = []
        
        water_interval = base_water_interval
        fertilizer_interval = base_fertilizer_interval
        misting_interval = base_misting_interval

        temp = weather_data.get("temp", 22.0)
        humidity = weather_data.get("humidity", 50.0)
        condition = weather_data.get("condition", "Clear").lower()

        if is_outdoor:
            water_reasoning_parts.append("Plant is outdoors, adjusting for outdoor weather conditions.")
            
            # Hot Weather Adjustment
            if temp > 30.0:
                water_interval -= 2
                water_reasoning_parts.append(f"High temperature ({temp:.1f}°C > 30°C) increases evaporation: watering interval reduced by 2 days.")
            elif temp < 15.0:
                water_interval += 3
                water_reasoning_parts.append(f"Cool temperature ({temp:.1f}°C < 15°C) slows evaporation: watering interval extended by 3 days.")
                
            # Dry Weather Adjustment
            if humidity < 35.0:
                water_interval -= 1
                water_reasoning_parts.append(f"Dry outdoor air ({humidity:.1f}% humidity < 35%): watering interval reduced by 1 day.")
                if base_misting_interval is not None:
                    misting_interval = 1
                    misting_reasoning_parts.append(f"Very low outdoor humidity: misting interval reduced to daily.")
                    
            # Wet/Rainy Weather Adjustment
            if "rain" in condition or "drizzle" in condition or "thunderstorm" in condition:
                water_interval += 4
                water_reasoning_parts.append("Recent/ongoing precipitation detected: watering delayed by 4 days.")
        else:
            water_reasoning_parts.append("Plant is indoors, climate is mostly regulated.")
            # Indoor heating/cooling drying effects
            if temp > 25.0:
                water_interval -= 1
                water_reasoning_parts.append(f"Warm indoor climate ({temp:.1f}°C): watering interval reduced by 1 day.")
            if humidity < 40.0:
                if base_misting_interval is None:
                    # Give high misting only to tropical plants, but list a suggestion for dry indoor air
                    pass
                else:
                    misting_interval = 1
                    misting_reasoning_parts.append(f"Dry indoor AC/heating environment ({humidity:.1f}% humidity): misting frequency increased to daily.")

        # Ensure safe ranges
        water_interval = max(2, min(21, water_interval))
        
        # 3. Compile plan reminders
        now = datetime.utcnow()
        reminders = [
            {
                "type": "watering",
                "interval_days": water_interval,
                "next_due": now + timedelta(days=water_interval),
                "reasoning": " ".join(water_reasoning_parts)
            },
            {
                "type": "fertilizer",
                "interval_days": fertilizer_interval,
                "next_due": now + timedelta(days=fertilizer_interval),
                "reasoning": " ".join(fert_reasoning_parts)
            }
        ]

        if misting_interval is not None:
            if not misting_reasoning_parts:
                misting_reasoning_parts.append(f"Regular misting interval of {misting_interval} days to maintain tropical leaf humidity.")
            reminders.append({
                "type": "misting",
                "interval_days": misting_interval,
                "next_due": now + timedelta(days=misting_interval),
                "reasoning": " ".join(misting_reasoning_parts)
            })

        return reminders
