document.addEventListener('DOMContentLoaded', () => {
    // The default for now will be the hague
    const defaultLat = 52.07667;
    const defaultLon = 4.29861;
    const defaultPlaceName = "The Hague";
    document.getElementById('placename-text').textContent = defaultPlaceName;
    document.getElementById('country-text').textContent = 'Netherlands';
    fetchWeather(defaultLat, defaultLon).then(data => {
        document.getElementById('degreecelcius').textContent = `${data.current.temp_c}°C`;
        document.getElementById('degreefahrenheit').textContent = `${data.current.temp_f}°F`;
        document.getElementById('latitude').textContent = `Lat: ${data.location.lat}`;
        document.getElementById('longitude').textContent = `Lon: ${data.location.lon}`;
        document.getElementById('windspeed').textContent = `Wind: ${data.current.wind_kph} KM/H`;
        document.getElementById('uv-index').textContent = `UV Index: ${data.current.uv}`;
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
            return;
        }
        // Debounce search
        searchTimeout = setTimeout(() => {
            searchPlace(query).then(results => {
                resultsDiv.innerHTML = '';
                if (results.error) {
                    resultsDiv.innerHTML = `<div class="search-result-item">Error: ${results.error}</div>`;
                    return;
                }
                if (results.length === 0) {
                    resultsDiv.innerHTML = `<div class="search-result-item">No results</div>`;
                    return;
                }
                results.forEach(place => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.textContent = place.name || place.display_name || `${place.lat},${place.lon}`;
                    item.addEventListener('click', () => {
                        updateWeatherForPlace(place);
                        resultsDiv.innerHTML = '';
                        searchInput.value = '';
                    });
                    resultsDiv.appendChild(item);
                });
            });
        }, 300);
    });

    function updateWeatherForPlace(place) {
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
        fetchWeather(place.lat, place.lon).then(data => {
            document.getElementById('degreecelcius').textContent = `${data.current.temp_c}°C`;
            document.getElementById('degreefahrenheit').textContent = `${data.current.temp_f}°F`;
            document.getElementById('latitude').textContent = `Lat: ${data.location.lat}`;
            document.getElementById('longitude').textContent = `Lon: ${data.location.lon}`;
            document.getElementById('windspeed').textContent = `Wind: ${data.current.wind_kph} KM/H`;
            document.getElementById('uv-index').textContent = `UV Index: ${data.current.uv}`;
        });
    }
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


