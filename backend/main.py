from fastapi import FastAPI # import fastapi
from fastapi.middleware.cors import CORSMiddleware #import cors bullshit
import time # hey what time is it

app = FastAPI(title="rootkitten(weather); API") # name the app. 

# the cors bullshit in question
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # dev thing, allow from everywhere
    allow_methods=["*"], # dev thing, allow from everywhere
    allow_headers=["*"], # you get it by now
)
# website health route (is it alive)
@app.get("/health") # URL will be rootkitten.dev/weather/health.
def health():
    return {"ok" : True, "t": int(time.time())}  # am i alive, what time is it


# oh boy now the actual API requests part
import requests

BASE_GEO = "https://geocoding-api.open-meteo.com/v1/search"

@app.get("/search") #ditto, except URL ends with search
def search(q: str, count: int = 5, language : str = "en"):

    try: 
        res = requests.get(BASE_GEO, params={
            "name": q,
            "count": count,
            "language": language,
            "format": "json"
        }, timeout=8)
        res.raise_for_status()
        data = res.json()
    except Exception as e:
        return {"error": str(e)}
    
    results = data.get("results", [])
    out = [
        {
            "name": f"{r['name']}, {r.get('country', '')}".strip(", "),
            "lat": r["latitude"],
            "lon": r["longitude"]

        }
        for r in results
    ]
    return out

# the forecast
BASE_FORECAST = "https://api.open-meteo.com/v1/forecast"
@app.get("/weather")
def weather (lat: float, lon:float, days: int = 7, timezone: str="auto" ):
    try:
        res = requests.get(BASE_FORECAST, params={
            "latitude": lat,
            "longitude": lon,
            "timezone": timezone,
            "current": "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,uv_index",
            "hourly": "temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m",
            "daily": "temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max,wind_speed_10m_max",
            "forecast_days": days
        }, timeout=8)

        res.raise_for_status()
        data = res.json()
    except Exception as e:
        return {"error": str(e)
        }
    return data


def map_weather_code(code: int) -> str:
    mapping = {
        0: "clear",
        1: "mainly_clear",
        2: "partly_cloudy",
        3: "overcast",
        45: "fog", 48: "fog",
        51: "drizzle_light", 53: "drizzle_moderate", 55: "drizzle_dense",
        61: "rain_light", 63: "rain_moderate", 65: "rain_heavy",
        66: "freezing_rain_light", 67: "freezing_rain_heavy",
        71: "snow_light", 73: "snow_moderate", 75: "snow_heavy", 77: "snow_grains",
        80: "showers_light", 81: "showers_moderate", 82: "showers_violent",
        85: "snow_showers_light", 86: "snow_showers_heavy",
        95: "thunderstorm", 96: "thunderstorm_hail", 99: "thunderstorm_hail_heavy",
    }
    return mapping.get(int(code) if code is not None else -1, "unknown")

def pick_daily_icon(day_str : str, hourly_times: list[str], hourly_codes: list[int]) -> str:
    target = f"{day_str}T12:00"
    try:
        idx = hourly_times.index(target)
        return map_weather_code(hourly_codes[idx])
    except ValueError:
        for i, t in enumerate(hourly_times):
            if t.startswith(day_str):
                return map_weather_code(hourly_codes[i])
    return "unknown"

def text_forecast(feels_like: float, wind_kph: float) -> str:
        if feels_like < 0 and wind_kph > 10:
            return "Het is heel koud en het stormt! Verwarming helemaal aan!"
        elif feels_like < 0 and wind_kph <= 10:
            return "Het is behoorlijk koud! Verwarming aan op de benedenverdieping!"
        elif 10 > feels_like >= 0 and wind_kph > 12:
            return "Het is best koud en het waait; verwarming aan en roosters dicht!"
        elif 10 > feels_like >= 0 and wind_kph <= 12:
            return "Het is een beetje koud, elektrische kachel op de benedenverdieping aan!"
        elif 10 <= feels_like < 22:
            return "Heerlijk weer, niet te koud of te warm."
        else:
            return "Warm! Airco aan!"

@app.get("/weather_clean") 

def weather_clean (lat: float, lon:float, days: int = 7, timezone: str="auto", name : str | None = None):
    try:
        res = requests.get(BASE_FORECAST, params={
            "name": name or f"{lat:.4f}, {lon:.4f}",
            "latitude": lat,
            "longitude": lon,
            "timezone": timezone,
            "current": "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,uv_index",
            "hourly": "temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m",
            "daily": "temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max,wind_speed_10m_max,weather_code",
            "forecast_days": days
        }, timeout=8)

        res.raise_for_status()
        raw = res.json()
    except Exception as e:
        return {"error": str(e)
        }
    
    tz = raw.get("timezone", "local")
    loc = {
        "name": name or f"{lat:.4f}, {lon:.4f}",
        "lat": raw.get("latitude", lat),
        "lon": raw.get("longitude", lon),
        "timezone": tz,
    }
    def celcius_to_f(c: float) -> float:
        return round(c * 1.8 + 32)
    cur = raw.get("current", {}) or {}
    current = {
        "temp_c": round(cur.get("temperature_2m", 0), 1),
        "temp_f": celcius_to_f(cur.get("temperature_2m", 0)),
        "feels_like": round(cur.get("apparent_temperature", 0), 1),
        "feels_like_f": celcius_to_f(cur.get("apparent_temperature", 0)),
        "humidity": round(cur.get("relative_humidity_2m", 0), 1),
        "precip_mm": round(cur.get("precipitation", 0), 2),
        "wind_kph": round(cur.get("wind_speed_10m", 0)),
        "uv_index": round(cur.get("uv_index", 0), 1),
        "icon": map_weather_code(cur.get("weather_code", 3)),
        "time" : (cur.get("time")[11:16] if cur.get("time") else "")

    }
    weather_report = text_forecast(current["feels_like"], current["wind_kph"])
    daily = raw.get("daily", {}) or {}
    d_time = daily.get("time", []) or []
    d_hi = daily.get("temperature_2m_max", []) or []
    d_lo = daily.get("temperature_2m_min", []) or []
    d_sunrise = daily.get("sunrise", []) or []
    d_sunset = daily.get("sunset", []) or []
    d_pop_max = daily.get("precipitation_probability_max", []) or []

    today = {}
    if d_time:
        today = {
            "date": d_time[0],
            "hi_c": round(d_hi[0], 1) if len(d_hi) > 0 else None,
            "lo_c": round(d_lo[0], 1) if len(d_lo) > 0 else None,
            "sunrise": (d_sunrise[0][11:16] if len(d_sunrise) > 0 else "") if d_sunrise else "",
            "sunset": (d_sunset[0][11:16] if len(d_sunset) > 0 else "") if d_sunset else "",
            "chance_of_rain" : int(d_pop_max[0]) if d_pop_max else 0
        }

    hourly = raw.get("hourly", {}) or {}
    h_time = hourly.get("time", []) or []
    h_temp = hourly.get("temperature_2m", []) or [] 
    h_pop = hourly.get("precipitation_probability", []) or []
    h_code = hourly.get("weather_code", []) or []
    h_precip = hourly.get("precipitation", []) or []

    start_idx = 0
    cur_iso = cur.get("time")
    if cur_iso and cur_iso in h_time:
        start_idx = h_time.index(cur_iso)

    hourly_list = []
    for i in range(start_idx, min(start_idx + 24, len(h_time))):
        hhmm = h_time[i][11:16]
        hourly_list.append({
            "time": hhmm,
            "temp_c": round(h_temp[i], 1) if i < len(h_temp) else None,
            "chance_of_rain": int(h_pop[i]) if i < len(h_pop) else 0,
            "precip_mm": round(h_precip[i], 2) if i < len(h_precip) else 0.0,
            "icon": map_weather_code(h_code[i]) if i < len(h_code) else "unknown",
        })

    week_list = []
    for i in range(min(days, len(d_time))):
        day = d_time[i]
        icon = pick_daily_icon(day, h_time, h_code)
        try:
            from datetime import datetime
            wk = datetime.strptime(day, "%Y-%m-%d").strftime("%a")
        except Exception:
            wk = day
        week_list.append({
            "day": wk,
            "date": day,
            "hi_c": round(d_hi[i], 1) if i < len(d_hi) else None,
            "hi_f": round(celcius_to_f(d_hi[i]), 1) if i < len(d_hi) else None,
            "lo_c": round(d_lo[i], 1) if i < len(d_lo) else None,
            "lo_f": round(celcius_to_f(d_lo[i]), 1) if i < len(d_lo) else None,
            "icon": icon,
        })
    

        

    return {
        "location": loc,
        "current": current,
        "today": today,
        "hourly": hourly_list,
        "weekly": week_list,
        "textreport": weather_report,
    }
