/* ===========================================================================
    rootkittenWeather Frontend Script
    this is a huge mess and i hate it but it works so whatever
    =========================================================================== */

// ========================= [ CORE UTIL / FETCH STUFF ] =====================
// all data grabbing is here.
// ---------------------------------------------------------------------------
// --- Utility & Data Fetch Functions ---
let iconMap = {}; // Global variable to hold icon map

// Load icon map from JSON file
async function loadIconMap() {
    try {
        const res = await fetch('iconmap.json');
        if (!res.ok) throw new Error(`Failed to load iconmap.json: ${res.status}`);
        iconMap = await res.json();
    } catch (err) {
        console.error('Error loading iconmap.json:', err);
        iconMap = { unknown: 'wi-na.svg' };
    }
}

// Function to fetch current weather for a given latitude and longitude
async function fetchWeather(lat, lon) {
    const url = `http://127.0.0.1:6767/weather_clean?lat=${lat}&lon=${lon}`;
    const res = await fetch(url);
    return await res.json();
}

// Function to search for a place by query string
async function searchPlace(query) {
    const url = `http://127.0.0.1:6767/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    return await res.json();
}

let hourlyChart = null;

function updateHourlyPrecipChart(hourlyData) {
    const ctx = document.getElementById('precip-chart').getContext('2d');
    if (!hourlyData || hourlyData.length === 0) return;
    const parsedData = hourlyData
        .map(h => {
            let hourNum;
            if (h.time && h.time.includes(':')) {
                hourNum = parseInt(h.time.split(':')[0]);
            } else {
                hourNum = new Date(h.time || h.timestamp || Date.now()).getHours();
            }
            return { ...h, hourNum };
        })
        .filter(h => h.hourNum >= 0 && h.hourNum <= 23)
        .sort((a, b) => a.hourNum - b.hourNum);
    const labels = parsedData.map(h => h.time || `${h.hourNum}:00`);
    const values = parsedData.map(h => h.precip_mm ?? h.rain ?? 0);
    const currentHour = new Date().getHours();
    const data = {
        labels,
        datasets: [{
            label: 'Precipitation (mm)',
            data: values,
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            borderWidth: 2,
            segment: {
                borderColor: ctx => {
                    const i = ctx.p0DataIndex;
                    const hour = parsedData[i]?.hourNum;
                    return hour < currentHour ? '#4CC9FF' : '#FFFFFF';
                },
                backgroundColor: ctx => {
                    const i = ctx.p0DataIndex;
                    const hour = parsedData[i]?.hourNum;
                    return hour < currentHour
                        ? 'rgba(76, 201, 255, 0.2)'
                        : 'rgba(255,255,255,0.15)';
                }
            }
        }]
    };
    const options = {
        scales: {
            x: {
                ticks: {
                    color: '#ffffff',
                    maxTicksLimit: 24,
                    font: { family: 'Libre Franklin' }
                },
                grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
                ticks: {
                    color: '#ffffff',
                    font: { family: 'Libre Franklin' }
                },
                grid: { color: 'rgba(255,255,255,0.05)' },
                beginAtZero: true
            }
        },
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutCubic' }
    };
    if (hourlyChart) hourlyChart.destroy();
    hourlyChart = new Chart(ctx, { type: 'line', data, options });
}

// --- Main App Logic ---
// ========================= [ MAIN BOOTSTRAP EVENT ] ========================
// ALL the UI wiring happens inside DOMContentLoaded. could this be modular?
// absolutely. are we ripping it apart today? nah, if it ain't broke don't fix sbhit
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {

        await loadIconMap();
    console.log("Icon map loaded:", iconMap);
    // --- Dynamic Day Tiles ---
    

    // Example: call updateDayTiles with dummy data on load
    // ====================== DAY TILE RENDERING (6-day strip) =================
    // Takes weekly forecast array -> paints mini tiles. Depends on iconMap + F toggle.
    // -------------------------------------------------------------------------
    function updateDayTiles(weeklyData) {
    const isF = document.getElementById('sidebarToggleFahrenheit')?.classList.contains('active');
    for (let i = 0; i < 6; i++) {
        const dayNum = i + 1;
        const dayEl = document.getElementById(`day-name-${dayNum}`);
        const tempEl = document.getElementById(`day-temp-${dayNum}`);
        const iconEl = document.getElementById(`day-icon-${dayNum}`);
        if (!dayEl || !tempEl || !iconEl) continue;
        if (weeklyData && weeklyData[i]) {
            const fc = weeklyData[i];
            const hiC = fc.hi_c;
            const hiF = fc.hi_f !== undefined ? fc.hi_f : (hiC !== undefined ? Math.round(hiC * 1.8 + 32) : undefined);
            dayEl.textContent = fc.day || `Day ${dayNum}`;
            const chosen = isF ? hiF : hiC;
            tempEl.textContent = chosen !== undefined ? `${chosen}°` : '--°';
            const iconFile = iconMap[fc.icon] || iconMap['unknown'];
            iconEl.src = `img/icon/svg/${iconFile}`;
            iconEl.alt = fc.icon || 'unknown';
        } else {
            dayEl.textContent = `Day ${dayNum}`;
            tempEl.textContent = '--°';
            iconEl.src = `img/icon/svg/${iconMap['unknown']}`;
            iconEl.alt = 'unknown';
        }
    }
   }
    // ====================== SIDEBAR + TOGGLE BAR ===========================
    // sidebar works here
    // -----------------------------------------------------------------------
    // Sidebar open/close logic with audio feedback
    let typeSpd = 48; // milliseconds per character
    let latestWeatherData = null; // cache of last fetched weather
    const navBtn = document.getElementById('navToggleBtn');
    const sidebar = document.getElementById('sidebarNav');
    const audioOpen = new Audio('audio/SE_BUTTON_MENU_OPEN.wav');
    const audioClose = new Audio('audio/SE_BUTTON_MENU_CLOSE.wav');
    // Input SFX: press (TOUCH_IN) and release (SE_DECIDE)
    const sfxTouchIn = new Audio('audio/SE_BUTTON_PUSH.wav');
    const sfxDecide = new Audio('audio/SE_DECIDE.wav');

    // Little sidebar opening icon: TOUCH_IN on mousedown
    navBtn.addEventListener('mousedown', () => {
        sfxTouchIn.currentTime = 0;
        sfxTouchIn.volume = 0.5;
        sfxTouchIn.play();
    });
    navBtn.addEventListener('click', () => {
        const willOpen = !sidebar.classList.contains('open');
        sidebar.classList.toggle('open');
        navBtn.classList.toggle('open');
        if (willOpen) {
            audioOpen.volume = 0.5;
            audioOpen.currentTime = 0;
            audioOpen.play();
        } else {
            audioClose.volume = 0.5;
            audioClose.currentTime = 0;
            audioClose.play();
        }
    });

    // Toggle switches logic (generic + specific feature toggles)
    function toggleSwitch(el) {
        el.classList.toggle('active');
        el.setAttribute('aria-checked', el.classList.contains('active'));
    }
    function isMascotEnabled() {
        return document.getElementById('sidebarToggleMascot').classList.contains('active');
    }
    function updateMascotEnabled() {
        const enabled = isMascotEnabled();
        mascotContainer.style.display = enabled ? 'block' : 'none';
        if (!enabled) {
            mascotBubble.classList.add('hidden');
            mascotTalking = false;
            if (window.mascotTypeTimeout) {
                clearTimeout(window.mascotTypeTimeout);
                window.mascotTypeTimeout = null;
            }
        }
    }
    // Toggle SFX: TOUCH_IN on press, SE_DECIDE on release
    ['sidebarToggleMascot','sidebarToggleFahrenheit','sidebarToggleFeeling','sidebarToggleBottom']
        .forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('mousedown', () => {
                sfxTouchIn.currentTime = 0;
                sfxTouchIn.volume = 0.5;
                sfxTouchIn.play();
            });
            el.addEventListener('mouseup', () => {
                sfxDecide.currentTime = 0;
                sfxDecide.volume = 0.5;
                sfxDecide.play();
            });
        });
    document.getElementById('sidebarToggleMascot').addEventListener('click', function () {
        toggleSwitch(this);
        updateMascotEnabled();
    });
    document.getElementById('sidebarToggleFahrenheit').addEventListener('click', function () {
        toggleSwitch(this);
        renderTemperatures();
        if (latestWeatherData) updateDayTiles(latestWeatherData.weekly);
    });
    document.getElementById('sidebarToggleFeeling').addEventListener('click', function () {
        toggleSwitch(this);
        // Re-render temperatures to switch between API apparent temp and custom calc
        renderTemperatures();
    });
    document.getElementById('sidebarToggleBottom').addEventListener('click', function () {
        toggleSwitch(this);
    });

    // Links (anchor tags): TOUCH_IN on press, SE_DECIDE on release
    document.addEventListener('mousedown', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        sfxTouchIn.currentTime = 0;
        sfxTouchIn.volume = 0.5;
        sfxTouchIn.play();
    });
    document.addEventListener('mouseup', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        sfxDecide.currentTime = 0;
        sfxDecide.volume = 0.5;
        sfxDecide.play();
    });

    // ====================== SEARCH RESULT SFX ===============================
    // Subtle UI feedback so it feels alive.
    // -----------------------------------------------------------------------
    // Hover and click sounds for search result items
    const audioHover = new Audio('audio/SE_BUTTON_SCROLL_TOUCH_OUT.wav');
    const audioPush = new Audio('audio/SE_BUTTON_PUSH.wav');
    const audioDecide = new Audio('audio/SE_DECIDE.wav');
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.addEventListener('mouseover', function (e) {
            if (e.target && e.target.classList.contains('search-result-item')) {
                audioHover.currentTime = 0;
                audioHover.volume = 0.5;
                audioHover.play();
            }
        });
        searchResults.addEventListener('mousedown', function (e) {
            if (e.target && e.target.classList.contains('search-result-item')) {
                audioPush.currentTime = 0;
                audioPush.volume = 0.5;
                audioPush.play();
            }
        });
        searchResults.addEventListener('mouseup', function (e) {
            if (e.target && e.target.classList.contains('search-result-item')) {
                audioDecide.currentTime = 0;
                audioDecide.volume = 0.5;
                audioDecide.play();
            }
        });
    }

    // ====================== MASCOT SYSTEM =================================
    // All the mascot animation / voice tick simulation. Yes it's verbose.
    // i could improve this but i am tired and it works
    // -----------------------------------------------------------------------
    // Mascot talking logic
    
    const mascotContainer = document.getElementById('mascot-container');
    const mascotImg = document.getElementById('mascot-img');
    window.mascotImg = mascotImg;
    // Set consistent mascot image size (adjust as needed)
    mascotImg.style.width = '16vh';
    mascotImg.style.height = '16vh';
    mascotImg.style.objectFit = 'contain';
    // Track the current mascot's base name (e.g., 'mascot', 'mysteryman')
    let mascotBaseName = 'mascot';
    const mascotBubble = document.getElementById('mascot-bubble');
    let mascotForecast = '';
    let mascotTalking = false;
    const mascotTalkAudio = new Audio('audio/voca/snd_txtal.wav');
    // IT'S TV TIME
    const tennaVoices = [
    'audio/voca/ten/snd_tv_voice_short.wav',
    'audio/voca/ten/snd_tv_voice_short_2.wav',
    'audio/voca/ten/snd_tv_voice_short_3.wav',
    'audio/voca/ten/snd_tv_voice_short_4.wav',
    'audio/voca/ten/snd_tv_voice_short_5.wav',
    'audio/voca/ten/snd_tv_voice_short_6.wav',
    'audio/voca/ten/snd_tv_voice_short_7.wav',
    'audio/voca/ten/snd_tv_voice_short_8.wav',
    'audio/voca/ten/snd_tv_voice_short_9.wav',
    'audio/voca/ten/snd_tv_voice_short_10.wav',
    ];
    // wing ding gaster lol
    const gasterVoices = [
    'audio/voca/gas/snd_wngdng1.wav',
    'audio/voca/gas/snd_wngdng2.wav',
    'audio/voca/gas/snd_wngdng3.wav',
    'audio/voca/gas/snd_wngdng4.wav',
    'audio/voca/gas/snd_wngdng5.wav',
    'audio/voca/gas/snd_wngdng6.wav',
    'audio/voca/gas/snd_wngdng7.wav',
    ];
    let currentVoiceSet = tennaVoices;
    let oneOffVoice = null;
    function setMascotVoiceSet(voiceSet) {
        currentVoiceSet = voiceSet;
        oneOffVoice = null;
    }
    function setMascotOneOffVoice(filePath) {
        oneOffVoice = filePath;
    }
    // Default to normal mascot voice
    setMascotOneOffVoice('audio/voca/talk.wav');
    let mascotBubbleTimeout = null;

    function showMascotBubble(text) {
        if (!isMascotEnabled()) return; // gate when disabled
        // Cancel any running animation
        if (window.mascotTypeTimeout) {
            clearTimeout(window.mascotTypeTimeout);
            window.mascotTypeTimeout = null;
        }
    mascotBubble.textContent = '';
    mascotBubble.classList.remove('hidden');
    // Try mascotBaseName_talk.gif, .webp, .png, fallback to talk.png if not found
    function tryTalkSprite(exts, idx = 0) {
        if (idx >= exts.length) {
            mascotImg.src = 'img/mascot/talk.png';
            return;
        }
        const trySrc = `img/mascot/${mascotBaseName}_talk.${exts[idx]}`;
        const img = new Image();
        img.onload = function() { mascotImg.src = trySrc; };
        img.onerror = function() { tryTalkSprite(exts, idx + 1); };
        img.src = trySrc;
    }
    
    tryTalkSprite(['gif', 'webp', 'png']);

    mascotTalking = true;
    
        let i = 0;
        function typeLetter() {
            if (i < text.length) {
                mascotBubble.textContent += text[i];
                if (text[i] !== ' ' && text[i] !== '\n') {
                    let voiceSrc;
                    if (oneOffVoice) {
                        voiceSrc = oneOffVoice;
                    } else {
                        voiceSrc = currentVoiceSet[Math.floor(Math.random() * currentVoiceSet.length)];
                    }
                    const randomVoice = new Audio(voiceSrc);
                    randomVoice.volume = 0.2;
                    randomVoice.play();
                }
                i++;
                window.mascotTypeTimeout = setTimeout(typeLetter, typeSpd);
            } else {
                mascotTalking = false;
                // Try mascotBaseName_neutral.gif, .webp, .png, fallback to neutral.png if not found
                function tryNeutralSprite(exts, idx = 0) {
                    if (idx >= exts.length) {
                        mascotImg.src = 'img/mascot/neutral.png';
                        return;
                    }
                    const trySrc = `img/mascot/${mascotBaseName}_neutral.${exts[idx]}`;
                    const img = new Image();
                    img.onload = function() { mascotImg.src = trySrc; };
                    img.onerror = function() { tryNeutralSprite(exts, idx + 1); };
                    img.src = trySrc;
                }
                tryNeutralSprite(['gif', 'webp', 'png']);
                mascotBubbleTimeout = setTimeout(() => mascotBubble.classList.add('hidden'), 5000);
                window.mascotTypeTimeout = null;
            }
        }
        clearTimeout(mascotBubbleTimeout);
        typeLetter();
    }
    mascotBubble.addEventListener('mouseenter', () => {
        clearTimeout(mascotBubbleTimeout);
    });
    mascotBubble.addEventListener('mouseleave', () => {
        if (!mascotTalking) {
            mascotBubbleTimeout = setTimeout(() => mascotBubble.classList.add('hidden'), 2000);
        }
    });


    // Fetch mascot forecast text for current location
    let currentLat = 52.07667; // Default: The Hague
    let currentLon = 4.29861;
    function fetchMascotForecast(lat, lon) {
        fetch(`http://127.0.0.1:6767/weather_clean?lat=${lat}&lon=${lon}`)
            .then(resp => resp.json())
            .then(data => {
                mascotForecast = data.textreport || "Geen voorspelling beschikbaar.";
                // Only show mascot bubble when city is loaded, not on page load
                if (window.mascotShouldSpeak) showMascotBubble(mascotForecast);
            })
            .catch(() => {
                mascotForecast = "Kon het weerbericht niet ophalen.";
                if (window.mascotShouldSpeak) showMascotBubble(mascotForecast);
            });
    }
    // On page load, fetch mascot forecast but do not speak
    window.mascotShouldSpeak = false;
    fetchMascotForecast(currentLat, currentLon);
    mascotImg.addEventListener('click', () => {
        if (!isMascotEnabled()) return;
        if (!mascotTalking) showMascotBubble(mascotForecast);
    });

    // ====================== SEARCH BAR =====================================
    // i dont know how i made this work but i did lmao
    // -----------------------------------------------------------------------
    // --- SEARCH BAR LOGIC --- 
    const searchInput = document.getElementById('sidebarSearch');
    const resultsDiv = document.getElementById('searchResults');
    let searchTimeout = null;

    searchInput.addEventListener('input', function () {
        const query = this.value.trim();
        clearTimeout(searchTimeout);
        if (query.length < 2) {
            resultsDiv.innerHTML = '';
            resultsDiv.classList.remove('active');
            return;
        }
      // Easter egg triggers and actions

    // ====================== EASTER EGGS ====================================
    // it isn't a rootkitten website without them sorry i have to
    // TODO: port the legacy eggs from cashdash. this is necessary
    // -----------------------------------------------------------------------
        const easterEggs = {
            // IT'S TV TIME
            "tenna": () => {
                window.mascotTalking = true;
                mascotBaseName = 'tenna';
                typeSpd = 67; 
                window.mascotImg.src = `img/mascot/${mascotBaseName}_neutral.webp`;
                document.getElementById('mascot-bubble').style.fontFamily = 'PixelOperator-bold';
                showMascotBubble("And now for the weather forecast, folks!!");
                setMascotVoiceSet(tennaVoices);
            },
            // this was for an example. this doesn't mean anything besides and i probably will comment it out later
            "owo": () => {
                showMascotBubble("OwO! You found an Easter egg!");
            },
            // when you know it's some gaster shit but you can't prove it
            "gaster": () => {
                window.mascotTalking = true;
                mascotBaseName = 'mysteryman';
                window.mascotImg.src = `img/mascot/${mascotBaseName}_neutral.png`;
                document.getElementById('mascot-bubble').style.fontFamily = 'Wingdings';
                typeSpd = 64;
                showMascotBubble("MY WEATHER IS VERY INTERESTING.");
                setMascotVoiceSet(gasterVoices);
            }
                // room for more stuff
            }



        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const val = this.value.trim().toLowerCase();
                if (easterEggs[val]) {
                    e.preventDefault();
                    easterEggs[val]();
                    resultsDiv.innerHTML = '';
                    resultsDiv.classList.remove('active');
                    this.value = '';
                }
                // else, normal search will proceed as usual
            }
        });
  

        // Debounce search
        searchTimeout = setTimeout(() => {
            searchPlace(query).then(results => {
                resultsDiv.innerHTML = '';
                if (results.error) {
                    resultsDiv.innerHTML = `<div class=\"search-result-item\">Error: ${results.error}</div>`;
                    resultsDiv.classList.add('active');
                    return;
                }
                if (results.length === 0) {
                    resultsDiv.innerHTML = `<div class=\"search-result-item\">No results</div>`;
                    resultsDiv.classList.add('active');
                    return;
                }
                results.forEach(place => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.textContent = place.name || place.display_name || `${place.lat},${place.lon}`;
                    item.addEventListener('click', () => {
                        updateWeatherForPlace(place);
                        resultsDiv.innerHTML = '';
                        resultsDiv.classList.remove('active');
                        searchInput.value = '';
                    });
                    resultsDiv.appendChild(item);
                });
                resultsDiv.classList.add('active');
            });
        }, 300);
    });

    // Hide results when clicking outside
    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.classList.remove('active');
        }
    });

    // ====================== TEMPERATURE RENDER CORE ========================
    // Fahrenheit toggle and "feels like" toggle all handled here.
    // -----------------------------------------------------------------------
    function renderTemperatures() {
        if (!latestWeatherData) return;
        const isF = document.getElementById('sidebarToggleFahrenheit').classList.contains('active');
        const useApiFeels = document.getElementById('sidebarToggleFeeling').classList.contains('active');
        const cur = latestWeatherData.current || {};
        const tempC = cur.temp_c ?? '--';
        const tempF = cur.temp_f ?? '--';
        // Decide which feels-like source to use
        const feelsC = useApiFeels ? (cur.feels_like ?? tempC) : (cur.feelslike_calc ?? cur.feels_like ?? tempC);
        const feelsF = useApiFeels ? (cur.feels_like_f ?? tempF) : (cur.feelslike_calc_f ?? cur.feels_like_f ?? tempF);
        if (isF) {  
            const displayTemp = tempF !== '--' ? `${tempF}°F` : '--';
            const displayFeels = feelsF !== '--' ? `Feels like ${feelsF}°F` : 'Feels like --';
            const el = document.getElementById('degreecelcius');
            if (el) el.textContent = displayTemp;
            const fl = document.getElementById('feelslike');
            if (fl) fl.textContent = displayFeels;
        } else {
            const displayTemp = tempC !== '--' ? `${tempC}°C` : '--';
            const displayFeels = feelsC !== '--' ? `Feels like ${feelsC}°C` : 'Feels like --';
            const el = document.getElementById('degreecelcius');
            if (el) el.textContent = displayTemp;
            const fl = document.getElementById('feelslike');
            if (fl) fl.textContent = displayFeels;
        }
    }

    // ====================== PLACE / WEATHER UPDATE PIPE ====================
    // sets labels, fetches weather, updates stateful render bits, triggers mascot
    // -----------------------------------------------------------------------
    function updateWeatherForPlace(place) {
        console.log('updateWeatherForPlace called with:', place);
        // Try to split place name and country by comma
        let display = place.name || place.display_name || `${place.lat},${place.lon}`;
        let name = display;
        let country = '';
        if (display.includes(',')) {
            const parts = display.split(',');
            name = parts[0].trim();
            country = parts.slice(1).join(',').trim();
        }
        document.getElementById('placename-text').textContent = name;
        document.getElementById('country-text').textContent = country;
        currentLat = place.lat;
        currentLon = place.lon;
        fetchWeather(currentLat, currentLon).then(data => {
            latestWeatherData = data;
            renderTemperatures();
            document.getElementById('latitude').textContent = `Lat: ${data.location.lat}`;
            document.getElementById('longitude').textContent = `Lon: ${data.location.lon}`;
            document.getElementById('windspeed').textContent = `Wind: ${data.current.wind_kph} KM/H`;
            document.getElementById('uv-index').textContent = `UV Index: ${data.current.uv_index}`;
            document.getElementById('humidity').textContent = `Humidity: ${data.current.humidity}%`;
            updateDayTiles(data.weekly);
            window.mascotShouldSpeak = true;
            fetchMascotForecast(currentLat, currentLon);
            if (data.hourly) updateHourlyPrecipChart(data.hourly);

        });
    }



    // ====================== INITIAL BOOT SEQUENCE ===========================
    // 1. Respect mascot toggle default
    // 2. Load default city (The Hague) and cascade everything else
    // -----------------------------------------------------------------------
    // Apply initial mascot enabled state
    updateMascotEnabled();

    // Set The Hague as the default place on page load
    updateWeatherForPlace({
        name: "The Hague",
        lat: 52.07667,
        lon: 4.29861,
        display_name: "The Hague, Netherlands"
    });
});
/*
// ====================== LEGACY DUPLICATE UTIL BLOCK ========================
// remove this later but keep it just in case i mess something up
// ---------------------------------------------------------------------------
// Function to fetch current weather for a given latitude and longitude
async function fetchWeather(lat, lon) {
    // Construct the backend API URL with query parameters for latitude and longitude
    const url = `http://127.0.0.1:6767/weather_clean?lat=${lat}&lon=${lon}`;
    // Send a GET request to the backend API endpoint
    const res = await fetch(url);
    // Parse the JSON response and return it
    return await res.json();
}

// Function to search for a place by query string
async function searchPlace(query) {
    // Construct the backend API URL with the search query parameter (URL-encoded)
    const url = `http://127.0.0.1:6767/search?q=${encodeURIComponent(query)}`;
    // Send a GET request to the backend API endpoint
    const res = await fetch(url);
    // Parse the JSON response and return it
    return await res.json();
}
*/

/*
// (Duplicate) Hourly precipitation chart logic
function updateHourlyPrecipChart(hourlyData) {
    const ctx = document.getElementById('precip-chart').getContext('2d');
    if (!hourlyData || hourlyData.length === 0) return;

    const parsedData = hourlyData
        .map(h => {
            let hourNum;
            if (h.time && h.time.includes(':')) {
                hourNum = parseInt(h.time.split(':')[0]);
            } else {
                hourNum = new Date(h.time || h.timestamp || Date.now()).getHours();
            }
            return { ...h, hourNum };
        })
        .filter(h => h.hourNum >= 0 && h.hourNum <= 23)
        .sort((a, b) => a.hourNum - b.hourNum);

    const labels = parsedData.map(h => h.time || `${h.hourNum}:00`);
    const values = parsedData.map(h => h.precip_mm ?? h.rain ?? 0);

    const currentHour = new Date().getHours();

    const data = {
        labels,
        datasets: [{
            label: 'Precipitation (mm)',
            data: values,
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            borderWidth: 2,

            // Dynamic coloring
            segment: {
                borderColor: ctx => {
                    const i = ctx.p0DataIndex;
                    const hour = parsedData[i]?.hourNum;
                    return hour < currentHour ? '#4CC9FF' : '#FFFFFF';
                },
                backgroundColor: ctx => {
                    const i = ctx.p0DataIndex;
                    const hour = parsedData[i]?.hourNum;
                    return hour < currentHour
                        ? 'rgba(76, 201, 255, 0.2)'   // Light blue fill
                        : 'rgba(255,255,255,0.15)';   // Default fill
                }
            }
        }]
    };

    const options = {
        scales: {
            x: {
                ticks: {
                    color: '#ffffff',
                    maxTicksLimit: 24,
                    font: { family: 'Libre Franklin' }
                },
                grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
                ticks: {
                    color: '#ffffff',
                    font: { family: 'Libre Franklin' }
                },
                grid: { color: 'rgba(255,255,255,0.05)' },
                beginAtZero: true
            }
        },
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutCubic' }
    };

    if (hourlyChart) hourlyChart.destroy();
    hourlyChart = new Chart(ctx, { type: 'line', data, options });
}
*/