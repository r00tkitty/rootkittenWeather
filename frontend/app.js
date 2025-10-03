document.addEventListener('DOMContentLoaded', () => {
    // Sidebar open/close logic with audio feedback
    const navBtn = document.getElementById('navToggleBtn');
    const sidebar = document.getElementById('sidebarNav');
    const audioOpen = new Audio('audio/SE_BUTTON_MENU_OPEN.wav');
    const audioClose = new Audio('audio/SE_BUTTON_MENU_CLOSE.wav');
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

    // Toggle switches logic
    function toggleSwitch(el) {
        el.classList.toggle('active');
        el.setAttribute('aria-checked', el.classList.contains('active'));
    }
    document.getElementById('sidebarToggleMascot').addEventListener('click', function() {
        toggleSwitch(this);
    });
    document.getElementById('sidebarToggleFahrenheit').addEventListener('click', function() {
        toggleSwitch(this);
    });
    document.getElementById('sidebarToggleFeeling').addEventListener('click', function() {
        toggleSwitch(this);
    });
    document.getElementById('sidebarToggleBottom').addEventListener('click', function() {
        toggleSwitch(this);
    });

    // Hover and click sounds for search result items
    const audioHover = new Audio('audio/SE_BUTTON_SCROLL_TOUCH_OUT.wav');
    const audioPush = new Audio('audio/SE_BUTTON_PUSH.wav');
    const audioDecide = new Audio('audio/SE_DECIDE.wav');
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.addEventListener('mouseover', function(e) {
            if (e.target && e.target.classList.contains('search-result-item')) {
                audioHover.currentTime = 0;
                audioHover.volume = 0.5;
                audioHover.play();
            }
        });
        searchResults.addEventListener('mousedown', function(e) {
            if (e.target && e.target.classList.contains('search-result-item')) {
                audioPush.currentTime = 0;
                audioPush.volume = 0.5;
                audioPush.play();
            }
        });
        searchResults.addEventListener('mouseup', function(e) {
            if (e.target && e.target.classList.contains('search-result-item')) {
                audioDecide.currentTime = 0;
                audioDecide.volume = 0.5;
                audioDecide.play();
            }
        });
    }

    // Mascot talking logic
    const mascotContainer = document.getElementById('mascot-container');
    const mascotImg = document.getElementById('mascot-img');
    const mascotBubble = document.getElementById('mascot-bubble');
    let mascotForecast = '';
    let mascotTalking = false;
    const mascotTalkAudio = new Audio('audio/talk.wav');
    let mascotBubbleTimeout = null;

    function showMascotBubble(text) {
        mascotBubble.textContent = '';
        mascotBubble.classList.remove('hidden');
        mascotImg.src = 'img/mascot/talk.png';
        mascotTalking = true;
        let i = 0;
        function typeLetter() {
            if (i < text.length) {
                mascotBubble.textContent += text[i];
                if (text[i] !== ' ' && text[i] !== '\n') {
                    mascotTalkAudio.currentTime = 0;
                    mascotTalkAudio.play();
                }
                i++;
                setTimeout(typeLetter, 32);
            } else {
                mascotTalking = false;
                mascotImg.src = 'img/mascot/neutral.png';
                mascotBubbleTimeout = setTimeout(() => mascotBubble.classList.add('hidden'), 5000);
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

    let currentLat = 52.07667; // Default: The Hague
    let currentLon = 4.29861;
    function fetchMascotForecast(lat, lon) {
        fetch(`http://127.0.0.1:8000/weather_clean?lat=${lat}&lon=${lon}`)
            .then(resp => resp.json())
            .then(data => {
                mascotForecast = data.textreport || "Geen voorspelling beschikbaar.";
                showMascotBubble(mascotForecast);
            })
            .catch(() => {
                mascotForecast = "Kon het weerbericht niet ophalen.";
                showMascotBubble(mascotForecast);
            });
    }
    // On page load, show mascot forecast for default location
    fetchMascotForecast(currentLat, currentLon);
    mascotImg.addEventListener('click', () => {
        if (!mascotTalking) showMascotBubble(mascotForecast);
    });

    // --- SEARCH BAR LOGIC --- 
    const searchInput = document.getElementById('sidebarSearch');
    const resultsDiv = document.getElementById('searchResults');
    let searchTimeout = null;

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        clearTimeout(searchTimeout);
        if (query.length < 2) {
            resultsDiv.innerHTML = '';
            resultsDiv.classList.remove('active');
            return;
        }
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
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.classList.remove('active');
        }
    });

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
            document.getElementById('degreecelcius').textContent = `${data.current.temp_c}°C`;
            document.getElementById('degreefahrenheit').textContent = `${data.current.temp_f}°F`;
            document.getElementById('latitude').textContent = `Lat: ${data.location.lat}`;
            document.getElementById('longitude').textContent = `Lon: ${data.location.lon}`;
            document.getElementById('windspeed').textContent = `Wind: ${data.current.wind_kph} KM/H`;
            document.getElementById('uv-index').textContent = `UV Index: ${data.current.uv_index}`;
            document.getElementById('humidity').textContent = `Humidity: ${data.current.humidity}%`;
            fetchMascotForecast(currentLat, currentLon);
        });
    }



    // Set The Hague as the default place on page load
    updateWeatherForPlace({
        name: "The Hague",
        lat: 52.07667,
        lon: 4.29861,
        display_name: "The Hague, Netherlands"
    });
});
// Function to fetch current weather for a given latitude and longitude
async function fetchWeather(lat, lon) {
    // Construct the backend API URL with query parameters for latitude and longitude
    const url = `http://127.0.0.1:8000/weather_clean?lat=${lat}&lon=${lon}`;
    // Send a GET request to the backend API endpoint
    const res = await fetch(url);
    // Parse the JSON response and return it
    return await res.json();
}

// Function to search for a place by query string
async function searchPlace(query) {
    // Construct the backend API URL with the search query parameter (URL-encoded)
    const url = `http://127.0.0.1:8000/search?q=${encodeURIComponent(query)}`;
    // Send a GET request to the backend API endpoint
    const res = await fetch(url);
    // Parse the JSON response and return it
    return await res.json();
}

// Example usage: fetch weather for a specific location
/* fetchWeather(52.5219, 6.1355).then(data =>{
    document.getElementById('degreecelcius').textContent = `${data.current.temp_c}°C`;
    document.getElementById('degreefahrenheit').textContent = `${data.current.temp_f}°F`;
    document.getElementById('latitude').textContent = `Lat: ${data.location.lat}`;
    document.getElementById('longitude').textContent = `Lon: ${data.location.lon}`;
    document.getElementById('windspd').textContent = `Wind: ${data.current.wind_kph} KM/H`;
    }); // Log the weather data to the console
     // Assuming your API returns data.current.temp_c and data.current.temp_f
    
*/
// Example usage: search for a place by name
// searchPlace('berkum').then(data => console.log('Search:', data));


