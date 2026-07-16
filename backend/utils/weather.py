import os
import json
import urllib.request
import urllib.parse
from datetime import datetime

def get_weather_for_location(location_str: str) -> dict:
    """
    Fetches real-time weather for the given location using OpenWeather API.
    Extracts the city name (e.g. "Chicago, Indoor" -> "Chicago").
    Falls back to mock season-based weather if the API key is invalid or request fails.
    """
    # 1. Parse city name
    # e.g., "Chicago, Indoor" -> "Chicago"
    # e.g., "New York" -> "New York"
    clean_location = location_str.split(",")[0].strip()
    
    api_key = os.environ.get("OPENWEATHER_API_KEY")
    
    # Season-based mock defaults (fallback)
    month = datetime.now().month
    # Default northern hemisphere estimate
    if month in [12, 1, 2]: # Winter
        default_temp = 5.0
        default_humidity = 60.0
        default_condition = "Cloudy"
    elif month in [6, 7, 8]: # Summer
        default_temp = 28.0
        default_humidity = 45.0
        default_condition = "Clear"
    else: # Spring / Autumn
        default_temp = 18.0
        default_humidity = 50.0
        default_condition = "Rainy" if month in [3, 4, 10] else "Clear"

    fallback_data = {
        "temp": default_temp,
        "humidity": default_humidity,
        "condition": default_condition,
        "source": "mock"
    }

    if not api_key or "your_openweather" in api_key.lower():
        print("OpenWeather API key not set or placeholder. Using mock fallback weather.")
        return fallback_data

    # 2. Query OpenWeather API
    try:
        if clean_location.isdigit():
            if len(clean_location) == 5:
                url = f"https://api.openweathermap.org/data/2.5/weather?zip={clean_location},US&appid={api_key}&units=metric"
            elif len(clean_location) == 6:
                url = f"https://api.openweathermap.org/data/2.5/weather?zip={clean_location},IN&appid={api_key}&units=metric"
            else:
                url = f"https://api.openweathermap.org/data/2.5/weather?zip={clean_location}&appid={api_key}&units=metric"
        else:
            encoded_city = urllib.parse.quote(clean_location)
            url = f"https://api.openweathermap.org/data/2.5/weather?q={encoded_city}&appid={api_key}&units=metric"
        
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "VerdantAI/1.0"}
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
            
            main = data.get("main", {})
            weather_list = data.get("weather", [{}])
            
            temp = main.get("temp", default_temp)
            humidity = main.get("humidity", default_humidity)
            main_condition = weather_list[0].get("main", "Clear")
            
            print(f"Weather fetched from OpenWeather for '{clean_location}': {temp}°C, {humidity}%, {main_condition}")
            return {
                "temp": float(temp),
                "humidity": float(humidity),
                "condition": main_condition,
                "source": "api"
            }
    except Exception as e:
        print(f"OpenWeather API call failed for '{clean_location}': {str(e)}. Using mock fallback weather.")
        return fallback_data
