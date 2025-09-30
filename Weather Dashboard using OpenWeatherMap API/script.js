// API Key
const API_KEY = "592586c5e216652ed98f151714e8ce62";

// DOM Elements
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const currentWeather = document.getElementById("current-weather");
const forecastList = document.getElementById("forecast-list");
const errorMessage = document.getElementById("error-message");
const loading = document.getElementById("loading");
const toggleUnitBtn = document.getElementById("toggle-unit");
const toggleThemeBtn = document.getElementById("toggle-theme");
const citySuggestions = document.getElementById("city-suggestions");
const favoritesList = document.getElementById("favorites-list");
const forecastModal = document.getElementById("forecast-modal");
const modalBody = document.getElementById("modal-body");
const closeBtn = forecastModal.querySelector(".close-btn");

// State variables
let currentCity = "";
let isCelsius = true;
let recentSearches = [];

// Sample cities for autocomplete
const sampleCities = [
    "Jakarta",
    "Bandung",
    "Surabaya",
    "Yogyakarta",
    "Medan",
    "Bali",
    "Malang",
    "Semarang",
    "Makassar",
    "Palembang",
];

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    loadThemeFromStorage();
    loadUnitFromStorage();
    loadRecentSearches();
    populateAutocomplete();
    renderFavorites();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            () => {
                currentCity = "Jakarta";
                searchWeather(currentCity);
            }
        );
    } else {
        currentCity = "Jakarta";
        searchWeather(currentCity);
    }
});

// Event Listeners
searchBtn.addEventListener("click", () => searchWeather(cityInput.value.trim()));
cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchWeather(cityInput.value.trim());
});
toggleUnitBtn.addEventListener("click", toggleUnit);
toggleThemeBtn.addEventListener("click", toggleTheme);
closeBtn.addEventListener("click", closeModal);
window.addEventListener("click", (e) => {
    if (e.target === forecastModal) closeModal();
});

// Theme toggle persistence
function loadThemeFromStorage() {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
}

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
}

// Unit toggle persistence
function loadUnitFromStorage() {
    const unit = localStorage.getItem("unit");
    isCelsius = unit !== "fahrenheit";
    updateUnitBtn();
}

function updateUnitBtn() {
    toggleUnitBtn.textContent = isCelsius ? "°C / °F" : "°F / °C";
}

function toggleUnit() {
    isCelsius = !isCelsius;
    localStorage.setItem("unit", isCelsius ? "celsius" : "fahrenheit");
    updateUnitBtn();
    searchWeather(currentCity);
}

// Recent searches persistence and autocomplete
function loadRecentSearches() {
    recentSearches = JSON.parse(localStorage.getItem("weatherSearches")) || [];
}

function populateAutocomplete() {
    citySuggestions.innerHTML = "";
    const allOptions = [...new Set([...recentSearches, ...sampleCities])];
    allOptions.forEach(city => {
        const option = document.createElement("option");
        option.value = city;
        citySuggestions.appendChild(option);
    });
}

function saveSearch(city) {
    city = city.trim();
    if (!city) return;
    if (!recentSearches.includes(city)) {
        recentSearches.push(city);
        if (recentSearches.length > 5) recentSearches.shift();
        localStorage.setItem("weatherSearches", JSON.stringify(recentSearches));
    }
    populateAutocomplete();
}

// Cached fetch helper (cache for 10 minutes)
async function fetchWithCache(url, cacheKey, cacheDuration = 600000) {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < cacheDuration) {
            return parsed.data;
        }
    }
    const response = await fetch(url);
    const data = await response.json();
    sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
}

// Fetch weather by coordinates (geolocation)
async function fetchWeatherByCoords(lat, lon) {
    clearError();
    loading.style.display = "block";
    try {
        const units = isCelsius ? "metric" : "imperial";
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`;
        const data = await fetchWithCache(url, `weather-${lat}-${lon}-${units}`);
        if (data.cod === 200) {
            currentCity = data.name;
            displayCurrentWeather(data);
            await fetchForecast(currentCity);
            saveSearch(currentCity);
        } else {
            showError("Could not get weather for your location.");
        }
    } catch (error) {
        showError("Error fetching location weather.");
        console.error(error);
    } finally {
        loading.style.display = "none";
    }
}

// Search weather by city name
async function searchWeather(city) {
    city = city || currentCity || "Jakarta";
    clearError();

    if (!city.trim()) {
        showError("Please enter a city name.");
        return;
    }
    if (!/^[a-zA-Z\s]+$/.test(city)) {
        showError("Invalid city name. Please enter letters only.");
        return;
    }

    loading.style.display = "block";

    try {
        const units = isCelsius ? "metric" : "imperial";
        const urlWeather = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${units}`;
        const data = await fetchWithCache(urlWeather, `weather-${city}-${units}`);
        if (data.cod === 200) {
            currentCity = data.name;
            displayCurrentWeather(data);
            await fetchForecast(currentCity);
            saveSearch(currentCity);
        } else {
            showError(data.message || "City not found. Please try again.");
        }
    } catch (error) {
        showError("An error occurred. Please try again later.");
        console.error(error);
    } finally {
        loading.style.display = "none";
    }
}

// Fetch 5-day forecast for city
async function fetchForecast(city) {
    try {
        const units = isCelsius ? "metric" : "imperial";
        const urlForecast = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${units}`;
        const data = await fetchWithCache(urlForecast, `forecast-${city}-${units}`);
        if (data.cod === "200") {
            displayForecast(data.list);
        }
    } catch (error) {
        console.error("Error fetching forecast:", error);
    }
}

// Display current weather data
function displayCurrentWeather(data) {
    const { name, sys, main, weather, wind } = data;
    const iconCode = weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

    document.getElementById("city-name").textContent = name;
    document.getElementById("country").textContent = sys.country;
    document.getElementById("weather-icon").src = iconUrl;
    document.getElementById("weather-icon").alt = weather[0].description;
    document.getElementById("weather-description").textContent = weather[0].description;

    const temp = Math.round(main.temp);
    const feelsLike = Math.round(main.feels_like);
    const humidity = main.humidity;
    const windSpeed = Math.round(wind.speed * (isCelsius ? 3.6 : 1));

    document.getElementById("temperature").textContent = temp;
    document.getElementById("feels-like").textContent = `${feelsLike}°${isCelsius ? "C" : "F"}`;
    document.getElementById("humidity").textContent = `${humidity}%`;
    document.getElementById("wind-speed").textContent = isCelsius ? `${windSpeed} km/h` : `${Math.round(wind.speed)} mph`;

    document.querySelector(".unit").textContent = `°${isCelsius ? "C" : "F"}`;

    // Favorite button creation and toggle
    let favBtn = document.querySelector(".favorite-btn");
    if (!favBtn) {
        favBtn = document.createElement("button");
        favBtn.className = "favorite-btn";
        favBtn.setAttribute("aria-label", "Add to favorites");
        favBtn.innerHTML = "♥";
        document.querySelector(".weather-card").appendChild(favBtn);

        favBtn.addEventListener("click", () => {
            addFavorite(data.name);
        });
    }
    const favs = loadFavorites();
    if (favs.includes(data.name)) {
        favBtn.classList.add("active");
        favBtn.setAttribute("aria-label", "Remove from favorites");
    } else {
        favBtn.classList.remove("active");
        favBtn.setAttribute("aria-label", "Add to favorites");
    }
}

// Display 5-day forecast grouped by day with clickable detail
function displayForecast(forecastData) {
    forecastList.innerHTML = "";

    const dailyForecast = {};
    forecastData.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toLocaleDateString("en-US", { weekday: "short", year:"numeric", month:"numeric", day:"numeric" });
        if (!dailyForecast[dayKey]) {
            dailyForecast[dayKey] = {
                temps: [],
                icons: [],
                descriptions: [],
                details: []
            };
        }
        dailyForecast[dayKey].temps.push(item.main.temp);
        dailyForecast[dayKey].icons.push(item.weather[0].icon);
        dailyForecast[dayKey].descriptions.push(item.weather[0].description);
        dailyForecast[dayKey].details.push(item);
    });

    const days = Object.keys(dailyForecast);
    for (let i = 0; i < 5 && i < days.length; i++) {
        const dayKey = days[i];
        const data = dailyForecast[dayKey];
        const dayName = new Date(dayKey).toLocaleDateString("en-US", { weekday: "short" }) || dayKey;

        const maxTemp = Math.round(Math.max(...data.temps));
        const minTemp = Math.round(Math.min(...data.temps));
        const iconCode = mode(data.icons);
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

        const forecastItem = document.createElement("div");
        forecastItem.className = "forecast-item";
        forecastItem.tabIndex = 0;
        forecastItem.setAttribute("role", "button");
        forecastItem.setAttribute("aria-pressed", "false");
        forecastItem.setAttribute("aria-label", `Forecast details for ${dayName}`);

        forecastItem.innerHTML = `
            <div class="day">${dayName}</div>
            <img src="${iconUrl}" alt="${data.descriptions[0]}" loading="lazy" />
            <div class="temp">
                <span class="temp-high">${maxTemp}°</span>
                <span class="temp-separator">/</span>
                <span class="temp-low">${minTemp}°</span>
            </div>
        `;

        forecastItem.addEventListener("click", () => {
            showForecastDetails(dayName, data.details);
        });
        forecastItem.addEventListener("keypress", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                showForecastDetails(dayName, data.details);
            }
        });

        forecastList.appendChild(forecastItem);
    }
}

// Show modal forecast detail
function showForecastDetails(dayName, details) {
    let html = `<h4>${dayName}</h4>`;
    details.forEach(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        const iconCode = item.weather && item.weather.length > 0 ? item.weather[0].icon : null;
        const iconUrl = iconCode ? `https://openweathermap.org/img/wn/${iconCode}.png` : 'fallback-icon.png';
        const altText = item.weather && item.weather.length > 0 ? item.weather[0].description : "No icon";

        html += `
            <div class="modal-detail">
                <div><strong>${time}</strong></div>
                <img src="${iconUrl}" alt="${altText}" />
                <div>${Math.round(item.main.temp)}°${isCelsius ? "C" : "F"}</div>
                <div>${altText}</div>
            </div>
        `;
    });
    modalBody.innerHTML = html;
    forecastModal.style.display = "block";
    forecastModal.setAttribute("aria-hidden", "false");
}

// Close modal handler
function closeModal() {
    forecastModal.style.display = "none";
    forecastModal.setAttribute("aria-hidden", "true");
}

// Helper to find mode (most frequent element) in array
function mode(array) {
    return array.sort((a,b) =>
        array.filter(v => v === a).length - array.filter(v => v === b).length
    ).pop();
}

// Show and clear error messages
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    currentWeather.style.display = "none";
    forecastList.innerHTML = "";
}

function clearError() {
    errorMessage.style.display = "none";
    currentWeather.style.display = "block";
}

// Favorite locations functions
function loadFavorites() {
    return JSON.parse(localStorage.getItem("favorites")) || [];
}

function saveFavorites(favs) {
    localStorage.setItem("favorites", JSON.stringify(favs));
}

function addFavorite(city) {
    let favs = loadFavorites();
    if (favs.includes(city)) {
        removeFavorite(city);
        return;
    }
    favs.push(city);
    saveFavorites(favs);
    renderFavorites();
}

function removeFavorite(city) {
    let favs = loadFavorites();
    favs = favs.filter(c => c !== city);
    saveFavorites(favs);
    renderFavorites();
}

// Render favorite buttons list
function renderFavorites() {
    const favs = loadFavorites();
    favoritesList.innerHTML = "";
    favs.forEach(city => {
        const btn = document.createElement("button");
        btn.className = "favorite-item";
        btn.textContent = city;
        btn.setAttribute("aria-label", `View weather for ${city}`);
        btn.addEventListener("click", () => {
            searchWeather(city);
        });
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.textContent = "×";
        removeBtn.setAttribute("aria-label", `Remove ${city} from favorites`);
        removeBtn.addEventListener("click", e => {
            e.stopPropagation();
            removeFavorite(city);
        });
        btn.appendChild(removeBtn);
        favoritesList.appendChild(btn);
    });
}