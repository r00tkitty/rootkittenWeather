from fastapi import FastAPI, Form # import fastapi
from fastapi.middleware.cors import CORSMiddleware #import cors middleware
import time # hey what time is it
from datetime import datetime
from backend import controller  # <-- your controller.py file
import os  # for file path handling
from fastapi import UploadFile, File
from fastapi import HTTPException, WebSocketException


app = FastAPI(title="rootkitten(weather); API") # name the app. 

# the cors middleware in question
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # dev thing, allow from everywhere
    allow_methods=["*"], # dev thing, allow from everywhere
    allow_headers=["*"], # you get it by now
)
# website health route (is it alive)
@app.get("/health") # URL will be rootkitten.dev/weather/health.
def health(): # function name
    return {"ok" : True, "t": int(time.time())}  # am i alive, what time is it


# oh boy now the actual API requests part
import requests # for making the requests 

BASE_GEO = "https://geocoding-api.open-meteo.com/v1/search" # the geocoding API endpoint


@app.get("/search") #ditto, except URL ends with search
def search(q: str, count: int = 5, language : str = "en"): # function name and params

    try: # try to make the request
        res = requests.get(BASE_GEO, params={  # the parameters to send.
            "name": q, # the query string
            "count": count, # how many results
            "language": language, # language for results
            "format": "json" # and we want it in json formatting
        }, timeout=8) # 8 second timeout
        res.raise_for_status() # if it fails, throw an error
        data = res.json() # get the json data
    except Exception as e: # if something goes wrong
        return {"error": str(e)} # return the error as a string
    
    results = data.get("results", []) or [] # get the results, or an empty list if none
    out = [ # format the results
        {
            "name": f"{r['name']}, {r.get('country', '')}".strip(", "), # name, country
            "lat": r["latitude"], # latitude
            "lon": r["longitude"] # longitude

        }
        for r in results # for each result in results
    ]
    return out # return the formatted results

# This is the raw data from the weather API. We will clean it up later with /weather_clean. This is mostly for debugging.
BASE_FORECAST = "https://api.open-meteo.com/v1/forecast" # the forecast API endpoint
@app.get("/weather") # URL ends with weather
def weather (lat: float, lon:float, days: int = 7, timezone: str="auto" ): # function name and params
     # lat and lon are required, days is optional (default 7), timezone is optional
    try: # try to make the request
        res = requests.get(BASE_FORECAST, params={ # the parameters to send
            "latitude": lat, # latitude
            "longitude": lon, # longitude
            "timezone": timezone, # timezone (auto-detect if "auto")
            "current": "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,uv_index", # current weather data
            "hourly": "temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m", # hourly weather data
            "daily": "temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max,wind_speed_10m_max", # daily weather data
            "forecast_days": days # how many days of forecast (1-16, in our case 7)
        }, timeout=8) # 8 second timeout 

        res.raise_for_status() # if it fails, throw an error
        data = res.json() # get the json data
    except Exception as e: # if something goes wrong
        return {"error": str(e) # you know the drill
        }
    return data # return the raw data


def map_weather_code(code: int) -> str: # map the weather code to a string
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
    return mapping.get(int(code) if code is not None else -1, "unknown") # return the mapped string, return -1 if code is empty, and "unknown" if not found

def pick_daily_icon(day_str : str, hourly_times: list[str], hourly_codes: list[int]) -> str: # pick the daily icon based on the hourly data
    target = f"{day_str}T12:00" # target time is noon on the given day
    try: # try to find the target time in the hourly times
        idx = hourly_times.index(target) # get the index of the target time
        return map_weather_code(hourly_codes[idx]) # return the mapped weather code
    except ValueError: # if not found, fall back to first entry of that day
        for i, t in enumerate(hourly_times): # for each time in hourly times
            if t.startswith(day_str): # if the time starts with the day string
                return map_weather_code(hourly_codes[i]) # return the mapped weather code
    return "unknown" # if all else fails, return unknown

# i just had to add this so here we go. we're translating this to english when we're done with the presentation
def text_forecast(feels_like: float, wind_kph: float) -> str: 
        if feels_like < 0 and wind_kph > 10: # if feels like is below 0 and wind speed is above 10
            return "Het is heel koud en het stormt! Verwarming helemaal aan!" # It's very cold and stormy! Heating full blast! (ugh i hate dutch)
        elif feels_like < 0 and wind_kph <= 10: # if feels like is below 0 and wind speed is 10 or below
            return "Het is behoorlijk koud! Verwarming aan op de benedenverdieping!" # It's quite cold! Heating on the ground floor! (god help me)
        elif 10 > feels_like >= 0 and wind_kph > 12: # if feels like is between 0 and 10 and wind speed is above 12
            return "Het is best koud en het waait; verwarming aan en roosters dicht!" # It's quite cold and windy; heating on and vents closed! (this sucks so much)
        elif 10 > feels_like >= 0 and wind_kph <= 12: # if feels like is between 0 and 10 and wind speed is 12 or below
            return "Het is een beetje koud, elektrische kachel op de benedenverdieping aan!" # It's a bit cold, electric heater on the ground floor! (i hate this)
        elif 10 <= feels_like < 22: # if feels like is between 10 and 22 (comfortable range) 
            return "Heerlijk weer, niet te koud of te warm." # Lovely weather, not too cold or too warm. (finally something less terrible)
        else: # if feels like is 22 or above (warm)
            return "Warm! Airco aan!" # Warm! Air conditioning on! (thank god this is over)

@app.get("/weather_clean") # URL ends with weather_clean
# HERE WE GO NOW THE FUN PART BEGINS
def weather_clean (lat: float, lon:float, days: int = 7, timezone: str="auto", name : str | None = None): # function name and params
    try: # try to make the request
        res = requests.get(BASE_FORECAST, params={ # the parameters to send
            "name": name or f"{lat:.4f}, {lon:.4f}", # name (if provided, else lat/lon)
            "latitude": lat, # latitude
            "longitude": lon, # longitude
            "timezone": timezone, # timezone (auto-detect if "auto")
            "current": "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,uv_index", # current weather data
            "hourly": "temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m", # hourly weather data
            "daily": "temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max,wind_speed_10m_max,weather_code", # daily weather data
            "forecast_days": days # how many days of forecast (1-16, in our case 7)
        }, timeout=8) # 8 second timeout

        res.raise_for_status() # if it fails, throw an error
        raw = res.json() # get the json data
    except Exception as e: # if something goes wrong
        return {"error": str(e) # yeah once again
        }
    
    tz = raw.get("timezone", "local") # get the timezone, default to local
    loc = { # location data
        "name": name or f"{lat:.4f}, {lon:.4f}", # name (if provided, else lat/lon)
        "lat": raw.get("latitude", lat), # latitude
        "lon": raw.get("longitude", lon), # longitude
        "timezone": tz, # timezone
    }
    def celcius_to_f(c: float) -> float: # convert celcius to fahrenheit
        return round(c * 1.8 + 32) # round to nearest integer
    
    def feelingTempCalc(c: float, w: float, h: float) -> float: # calculate the "feels like" temperature
        return round(c - (h / 100.0) * w, 1) # simple formula for now
    
    def kph_to_mps(k: float) -> float: # convert kph to mps
        return round(k * (5/18), 1) # round to nearest tenth
    cur = raw.get("current", {}) or {} # current weather data
    # all the things we want to return
    current = { # formatted current weather data
        "temp_c": round(cur.get("temperature_2m", 0), 1), # temperature in Celsius
        "temp_f": celcius_to_f(cur.get("temperature_2m", 0)), # temperature in Fahrenheit (with a fancy conversion because the school wants me to)
        "feels_like": round(cur.get("apparent_temperature", 0), 1), # "feels like" temperature in Celsius
        "feels_like_f": celcius_to_f(cur.get("apparent_temperature", 0)), # "feels like" temperature in Fahrenheit
        "humidity": round(cur.get("relative_humidity_2m", 0), 1), # humidity in percentage
        "precip_mm": round(cur.get("precipitation", 0), 2), # precipitation in mm
        "wind_kph": round(cur.get("wind_speed_10m", 0)), # wind speed in kph
        "wind_mps": kph_to_mps(round(cur.get("wind_speed_10m", 0))), # wind speed in mps
        "uv_index": round(cur.get("uv_index", 0), 1), # UV index
        "icon": map_weather_code(cur.get("weather_code", 3)), # weather icon code (default to overcast if missing)
        "time" : (cur.get("time")[11:16] if cur.get("time") else ""), # time in HH:MM format
        "feelslike_calc": feelingTempCalc(cur.get("temperature_2m", 0), kph_to_mps(cur.get("wind_speed_10m", 0)), cur.get("relative_humidity_2m", 0)), # calculated "feels like" temperature in Celsius (very dumb formula i know but its part of the mvp so whatever)
        "feelslike_calc_f": celcius_to_f(feelingTempCalc(cur.get("temperature_2m", 0), kph_to_mps(cur.get("wind_speed_10m", 0)), cur.get ("relative_humidity_2m", 0))) # calculated "feels like" temperature in Fahrenheit

    }
    weather_report = text_forecast(current["feels_like"], current["wind_kph"]) # generate a text forecast based on the current weather
    daily = raw.get("daily", {}) or {} # daily weather data
    d_time = daily.get("time", []) or [] # daily dates
    d_hi = daily.get("temperature_2m_max", []) or [] # daily high temperatures
    d_lo = daily.get("temperature_2m_min", []) or [] # daily low temperatures
    d_sunrise = daily.get("sunrise", []) or [] # daily sunrise times. this is not used currently but might be useful later, i might do it in the modular tile structure update
    d_sunset = daily.get("sunset", []) or [] # daily sunset times. same as before
    d_pop_max = daily.get("precipitation_probability_max", []) or [] # daily max precipitation probabilities

    # Weather data of today:    
    today = {} # today's weather data
    if d_time: # if we have daily data
        today = { # format today's weather data
            "date": d_time[0], # date
            "hi_c": round(d_hi[0], 1) if len(d_hi) > 0 else None, # high temperature in Celsius
            "lo_c": round(d_lo[0], 1) if len(d_lo) > 0 else None, # low temperature in Celsius
            "hi_f": round(celcius_to_f(d_hi[0]), 1) if len(d_hi) > 0 else None, # high temperature in Fahrenheit (not used currently)
            "lo_f": round(celcius_to_f(d_lo[0]), 1) if len(d_lo) > 0 else None, # low temperature in Fahrenheit (not used currently)
            "sunrise": (d_sunrise[0][11:16] if len(d_sunrise) > 0 else "") if d_sunrise else "", # sunrise time in HH:MM format (not used currently)
            "sunset": (d_sunset[0][11:16] if len(d_sunset) > 0 else "") if d_sunset else "", # sunset time in HH:MM format (not used currently)
            "chance_of_rain" : int(d_pop_max[0]) if d_pop_max else 0 # chance of rain in percentage (not used currently)
        }
        # PROGRAMMER'S NOTE: to my knowledge, none of this is even being used in the frontend. why is this even here? what are we going to do with it?

    hourly = raw.get("hourly", {}) or {} # hourly weather data (this is used for the graph)
    h_time = hourly.get("time", []) or [] # hourly times (also for the graph)
    h_temp = hourly.get("temperature_2m", []) or [] # hourly temperatures (also for the graph)
    h_pop = hourly.get("precipitation_probability", []) or [] # hourly precipitation probabilities (all of it)
    h_code = hourly.get("weather_code", []) or [] # hourly weather codes (all of this)
    h_precip = hourly.get("precipitation", []) or [] # hourly precipitation (all of it is for the graph. why am i even putting these in)

    start_idx = 0 # starting index for hourly data
    cur_iso = cur.get("time") # current ISO time. i'm gonna be honest i forgot what this does
    if cur_iso and cur_iso in h_time: # find the current hour in the hourly data
        start_idx = h_time.index(cur_iso) # starting index for hourly data

    # Generate hourly forecast (FOR THE GRAPH!!!!!!!!!!11!1)
    hourly_list = [] # make empty list for hourly data
    for i in range(start_idx, min(start_idx + 24, len(h_time))): # fill it
        hhmm = h_time[i][11:16] # extract hour and minute. slice the date out so we only have the time
        hourly_list.append({ 
            "time": hhmm, # time in HH:MM format
            "temp_c": round(h_temp[i], 1) if i < len(h_temp) else None, # temperature in Celsius
            "chance_of_rain": int(h_pop[i]) if i < len(h_pop) else 0, # chance of rain in percentage
            "precip_mm": round(h_precip[i], 2) if i < len(h_precip) else 0.0, # precipitation in mm (such a weird word, precipitation. never heard of it until now)
            "icon": map_weather_code(h_code[i]) if i < len(h_code) else "unknown", # weather icon code
        })

    week_list = [] # weekly forecast list
    for i in range(min(days, len(d_time))): # for each day in the forecast (up to the number of days requested)
        day = d_time[i] # date
        icon = pick_daily_icon(day, h_time, h_code) # pick the daily icon based on the hourly data
        try: # try to get the weekday name
            wk = datetime.strptime(day, "%Y-%m-%d").strftime("%a") # convert to weekday name
        except Exception: # if it fails, just use the date
            wk = day # fallback to date string
        week_list.append({ # append to the weekly list
            "day": wk, # yeah no i'm not noting these anymore
            "date": day, 
            "hi_c": round(d_hi[i], 1) if i < len(d_hi) else None,
            "hi_f": round(celcius_to_f(d_hi[i]), 1) if i < len(d_hi) else None,
            "lo_c": round(d_lo[i], 1) if i < len(d_lo) else None,
            "lo_f": round(celcius_to_f(d_lo[i]), 1) if i < len(d_lo) else None,
            "icon": icon,
        })
    

        

    return {
        "location": loc, # location information
        "current": current, # current weather information
        "today": today, # today's weather information
        "hourly": hourly_list, # hourly weather forecast
        "weekly": week_list, # weekly weather forecast
        "textreport": weather_report, # text-based weather report
    }





#CONTROLLER STUFF BELOW THIS LINE LAST MINUTE ADDITION LMAO

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "data")) # get the directory of the current file
INPUT_FILE = os.path.join(BASE_DIR, "input.txt") # path to input.txt
OUTPUT_FILE = os.path.join(BASE_DIR, "output.txt") # path to output.txt
MAX_FILE_SIZE_MB = 2  # 2 MB upload limit
ALLOWED_EXTENSIONS = {".txt"}  # Allowed text types only




@app.post("/api/controller/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Uploads a text file and overwrites data/input.txt.
    Only accepts .txt files under 2 MB.
    """
    UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "data") # Directory to save uploaded files
    os.makedirs(UPLOAD_DIR, exist_ok=True) # Create directory if it doesn't exist

    # Validate file extension
    if not file.filename.lower().endswith(".txt"): # only allow .txt files
        raise HTTPException(status_code=400, detail="Only .txt files are allowed.")

    # Validate size (2 MB limit)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 2 MB).")

    # Always overwrite input.txt, regardless of uploaded name
    save_path = os.path.join(UPLOAD_DIR, "input.txt")

    with open(save_path, "wb") as f: # open the file as write - binary
        f.write(contents) # write the contents to the file

    print(f"Overwrote input file: {save_path}") # Log the overwrite action
    return {"message": "File uploaded and overwritten successfully as input.txt"}

@app.get("/api/controller/days") # URL ends with /api/controller/days
def api_days(): # function name
    days = controller.aantal_dagen(INPUT_FILE) # call the function from controller.py
    return {"days": days} # return the number of days


@app.post("/api/controller/auto") # URL ends with /api/controller/auto
def api_auto(): # function name
    result = controller.auto_bereken(INPUT_FILE, OUTPUT_FILE) # call the function from controller.py
    return result


@app.post("/api/controller/overwrite")
def api_overwrite( # form parameters
    date: str = Form(...),
    system: str = Form(...),
    value: str = Form(...)
):
    result = controller.overwrite_settings( 
        OUTPUT_FILE, 
        date_to_change=date, 
        system_choice=system,
        new_value=value
    )
    return {"result": result}



@app.get("/api/controller/output") # URL ends with /api/controller/output
def api_get_output(): # function name
    try: # try to read the output file
        with open(OUTPUT_FILE, "r") as f: # open the file
            lines = [line.strip() for line in f.readlines()] # read the lines and strip whitespace
        return {"lines": lines} # return the lines
    except FileNotFoundError: # if the file is not found
        return {"lines": []} # return an empty list

# that's it for the backend. now onto the frontend where the real fun begins


'''

  @              @  
  @@@          @@@  
  @@@@@@@@@@@@@@@@  
  @@            @@  
  @@ ~********= @@  
  @@ ~********= @@  
  @@ ~********= @@  
  @@            @@  
  @@@@@@@@@@@@@@@@  
   rootkitten.dev
'''