# 🌤 rootkitten(weather);

A minimalistic web-based weather dashboard with an integrated **Smart App Controller**.  
This project fetches live weather data from the **Open-Meteo API** and allows simple automation logic to be tested and visualized directly in the browser.

---

## 🌦 Weather Dashboard

The **Weather Dashboard** is the core of this project.  
It fetches **real-time weather data** from the [Open-Meteo API](https://open-meteo.com/) and displays:
- **Current conditions** (temperature, humidity, wind speed, precipitation)
- **7-day forecast**
- **24-hour temperature & precipitation graph**
- **Dynamic weather icons**
- **Frontend–Backend communication** via fetch requests and JSON

This part demonstrates:
- REST API consumption and data parsing
- Dynamic frontend rendering (using vanilla JS)
- Data transformation in Python (FastAPI)
- Visualization of hourly & weekly weather trends

---

## ⚙️ Bonus — Smart App Controller

The **Smart App Controller** is an **extra feature** that showcases backend automation and file I/O.  
It simulates an actuator control system that reads an input file, calculates system settings (CV heating, ventilation, watering), and outputs results.

Features:
- Reads text-based sensor data from `data/input.txt`
- Auto-calculates actuator outputs (`data/output.txt`)
- Allows manual overwrites of actuator values
- Supports file uploads through the web interface

While the controller complements the app, the weather dashboard remains the main focus of this project.

---

## 🧩 Features Overview

- 📡 **Live weather data** (current, hourly, and weekly forecast)
- ☁️ Weather visualizations powered by Open-Meteo API
- ⚙️ **Smart App Controller** for automation logic
- 🔒 Safe file uploads (only `.txt`, max 2 MB)
- 🌍 Browser-based frontend with HTML + JS
- 🐍 Backend powered by **FastAPI** (Python 3.11+)

---

## ⚙️ Local Setup Guide

### 1️⃣ Clone or extract the project
Unzip the project to a folder of your choice, e.g.:

```bash
C:\Projects\rootkittenWeather
```

### 2️⃣ Create and activate a virtual environment
```bash
python -m venv .venv
.venv\Scripts\activate
```

### 3️⃣ Install dependencies
```bash
pip install -r requirements.txt
```

### 4️⃣ Run the backend
From inside the project root (where `backend/` is located):

```bash
uvicorn backend.main:app --reload --port 8000
```

By default the backend runs on:
> http://127.0.0.1:8000

### 5️⃣ Open the frontend
Simply open `frontend/index.html` (for the weather dashboard) or  
`frontend/controller.html` (for the Smart Controller) in your browser.

If using VS Code or Live Server, ensure your backend runs on **the same port** (default 8000).

---

## 🧠 How the Controller Works

1. Upload a `.txt` input file (sensor/weather data).  
2. Click **Auto Calculate** to generate actuator outputs.  
3. Optionally overwrite specific actuator values.  
4. View the resulting configuration live in the browser.

The backend overwrites `data/input.txt` with uploaded files and outputs results to `data/output.txt`.

---

## 🛡️ Security Notes

- File uploads restricted to `.txt` and ≤ 2 MB.
- No external database or authentication is used (demo version).

---

## 🧰 Technologies Used

- **Backend:** FastAPI, Uvicorn, Requests  
- **Frontend:** HTML, CSS, JavaScript  
- **API:** [Open-Meteo](https://open-meteo.com/)  
- **Language:** Python 3.11+  

---

Developed by **rootkitten();**
![Logo](https://github.com/r00tkitty/files/blob/main/branding/WhiskerVision.png?raw=true)
© 2025 rootkitten();
