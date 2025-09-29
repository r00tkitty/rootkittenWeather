document.addEventListener('DOMContentLoaded', () => {
    // The default for now will be the hague
    const defaultLat = 52.07667;
    const defaultLon = 4.29861;
    const defaultPlaceName = "The Hague";
    document.getElementById('placename').textContent = defaultPlaceName;
    fetchWeather(defaultLat, defaultLon).then(data => {
        document.getElementById('degreecelcius').textContent = `${data.current.temp_c}°C`;
        document.getElementById('degreefahrenheit').textContent = `${data.current.temp_f}°F`;
        document.getElementById('latitude').textContent = `Lat: ${data.location.lat}`;
        document.getElementById('longitude').textContent = `Lon: ${data.location.lon}`;
        document.getElementById('windspeed').textContent = `Wind: ${data.current.wind_kph} KM/H`;
        document.getElementById('uv-index').textContent = `UV Index: ${data.current.uv}`;
    }); // Log the weather data to the console
     
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
searchPlace('berkum')
    .then(data => console.log('Search:', data)); // Log the search results to the console


