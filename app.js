// Weather Dashboard Pro JavaScript
// Configuration
const API_KEY = 'b1b15e88fa797225412429c1c50c122a1'; // OpenWeatherMap API key
const API_BASE = 'https://api.openweathermap.org/data/2.5';

// State Management
let currentCity = '';
let currentUnit = localStorage.getItem('unit') || 'metric';
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
let weatherCache = {};

// DOM Elements
const citySearch = document.getElementById('citySearch');
const searchBtn = document.getElementById('searchBtn');
const searchSuggestions = document.getElementById('searchSuggestions');
const unitToggle = document.getElementById('unitToggle');
const themeToggle = document.getElementById('themeToggle');
const locationBtn = document.getElementById('locationBtn');
const addFavorite = document.getElementById('addFavorite');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const weatherContent = document.getElementById('weatherContent');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadFavorites();
    getUserLocation();
    setupEventListeners();
});

function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    citySearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    citySearch.addEventListener('input', handleSearchInput);
    unitToggle.addEventListener('click', toggleUnit);
    themeToggle.addEventListener('click', toggleTheme);
    locationBtn.addEventListener('click', getUserLocation);
    addFavorite.addEventListener('click', addToFavorites);
    document.addEventListener('click', (e) => {
        if (!searchSuggestions.contains(e.target) && e.target !== citySearch) {
            searchSuggestions.classList.remove('active');
        }
    });
    citySearch.addEventListener('keydown', handleSuggestionNavigation);
}

function handleSuggestionNavigation(e) {
    const items = searchSuggestions.querySelectorAll('.suggestion-item');
    let currentIndex = -1;
    items.forEach((item, index) => {
        if (item.classList.contains('focused')) currentIndex = index;
    });
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < items.length - 1) {
            items[currentIndex]?.classList.remove('focused');
            items[currentIndex + 1]?.classList.add('focused');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
            items[currentIndex]?.classList.remove('focused');
            items[currentIndex - 1]?.classList.add('focused');
        }
    } else if (e.key === 'Enter' && currentIndex >= 0) {
        e.preventDefault();
        items[currentIndex]?.click();
    }
}

function handleSearchInput() {
    const query = citySearch.value.trim();
    if (query.length < 2) {
        searchSuggestions.classList.remove('active');
        return;
    }
    const filtered = recentSearches.filter(city => 
        city.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
    if (filtered.length > 0) {
        displaySuggestions(filtered);
    }
}

function displaySuggestions(suggestions) {
    searchSuggestions.innerHTML = suggestions.map(city => 
        `<div class="suggestion-item" tabindex="0" role="option">${city}</div>`
    ).join('');
    searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            citySearch.value = item.textContent;
            searchSuggestions.classList.remove('active');
            handleSearch();
        });
    });
    searchSuggestions.classList.add('active');
}

async function handleSearch() {
    const city = citySearch.value.trim();
    if (!city) return;
    addToRecentSearches(city);
    await fetchWeatherByCity(city);
}

function addToRecentSearches(city) {
    recentSearches = recentSearches.filter(c => c.toLowerCase() !== city.toLowerCase());
    recentSearches.unshift(city);
    recentSearches = recentSearches.slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
}

function getUserLocation() {
    if ('geolocation' in navigator) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            position => {
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            error => {
                showError('Unable to get your location. Please search for a city.');
                showLoading(false);
                fetchWeatherByCity('Jakarta');
            }
        );
    } else {
        showError('Geolocation is not supported by your browser');
        fetchWeatherByCity('Jakarta');
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        showLoading(true);
        const cacheKey = `coords_${lat}_${lon}_${currentUnit}`;
        if (weatherCache[cacheKey] && Date.now() - weatherCache[cacheKey].timestamp < 600000) {
            updateUI(weatherCache[cacheKey].data);
            showLoading(false);
            return;
        }
        const currentWeather = await fetch(
            `${API_BASE}/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`
        ).then(res => res.json());
        const forecast = await fetch(
            `${API_BASE}/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`
        ).then(res => res.json());
        const data = { current: currentWeather, forecast: forecast };
        weatherCache[cacheKey] = { data, timestamp: Date.now() };
        currentCity = currentWeather.name;
        updateUI(data);
        showLoading(false);
    } catch (error) {
        showError('Failed to fetch weather data. Please check your API key.');
        showLoading(false);
    }
}

async function fetchWeatherByCity(city) {
    try {
        showLoading(true);
        const cacheKey = `city_${city}_${currentUnit}`;
        if (weatherCache[cacheKey] && Date.now() - weatherCache[cacheKey].timestamp < 600000) {
            updateUI(weatherCache[cacheKey].data);
            showLoading(false);
            return;
        }
        const currentWeather = await fetch(
            `${API_BASE}/weather?q=${city}&units=${currentUnit}&appid=${API_KEY}`
        ).then(res => {
            if (!res.ok) throw new Error('City not found');
            return res.json();
        });
        const forecast = await fetch(
            `${API_BASE}/forecast?q=${city}&units=${currentUnit}&appid=${API_KEY}`
        ).then(res => res.json());
        const data = { current: currentWeather, forecast: forecast };
        weatherCache[cacheKey] = { data, timestamp: Date.now() };
        currentCity = currentWeather.name;
        updateUI(data);
        showLoading(false);
    } catch (error) {
        showError(`Failed to fetch weather for "${city}". Please check the city name.`);
        showLoading(false);
    }
}

function updateUI(data) {
    const { current, forecast } = data;
    const unit = currentUnit === 'metric' ? '°C' : '°F';
    const windUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
    document.getElementById('location').innerHTML = `
        <span>📍</span>
        <span>${current.name}, ${current.sys.country}</span>
    `;
    document.getElementById('condition').textContent = current.weather[0].description;
    document.getElementById('temperature').textContent = `${Math.round(current.main.temp)}${unit}`;
    document.getElementById('feelsLike').textContent = `${Math.round(current.main.feels_like)}${unit}`;
    document.getElementById('humidity').textContent = `${current.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.wind.speed * 3.6)} ${windUnit}`;
    document.getElementById('pressure').textContent = `${current.main.pressure} hPa`;
    document.getElementById('mainIcon').textContent = getWeatherIcon(current.weather[0].icon);
    displayForecast(forecast);
}

function displayForecast(forecast) {
    const dailyData = {};
    forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!dailyData[date]) {
            dailyData[date] = {
                temps: [],
                conditions: [],
                icons: []
            };
        }
        dailyData[date].temps.push(item.main.temp);
        dailyData[date].conditions.push(item.weather[0].description);
        dailyData[date].icons.push(item.weather[0].icon);
    });
    const forecastHTML = Object.entries(dailyData).slice(0, 5).map(([date, data]) => {
        const maxTemp = Math.max(...data.temps);
        const minTemp = Math.min(...data.temps);
        const icon = getWeatherIcon(data.icons[0]);
        const condition = data.conditions[0];
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        const unit = currentUnit === 'metric' ? '°C' : '°F';
        return `
            <div class="forecast-card" tabindex="0" role="button" 
                 aria-label="Weather for ${dayName}: ${condition}, high ${Math.round(maxTemp)}, low ${Math.round(minTemp)}">
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-icon" aria-hidden="true">${icon}</div>
                <div class="forecast-temp">
                    <span class="temp-high">${Math.round(maxTemp)}${unit}</span> / 
                    <span class="temp-low">${Math.round(minTemp)}${unit}</span>
                </div>
                <div class="forecast-condition">${condition}</div>
            </div>
        `;
    }).join('');
    document.getElementById('forecastContainer').innerHTML = forecastHTML;
}

function getWeatherIcon(code) {
    const icons = {
        '01d': '☀️', '01n': '🌙',
        '02d': '⛅', '02n': '☁️',
        '03d': '☁️', '03n': '☁️',
        '04d': '☁️', '04n': '☁️',
        '09d': '🌧️', '09n': '🌧️',
        '10d': '🌦️', '10n': '🌧️',
        '11d': '⛈️', '11n': '⛈️',
        '13d': '❄️', '13n': '❄️',
        '50d': '🌫️', '50n': '🌫️',
    };
    return icons[code] || '⛅';
}

function showLoading(show) {
    if (show) {
        loading.classList.add('active');
    } else {
        loading.classList.remove('active');
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.add('active');
    setTimeout(() => errorMessage.classList.remove('active'), 4000);
}

function toggleUnit() {
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('unit', currentUnit);
    if (currentCity) {
        fetchWeatherByCity(currentCity);
    } else {
        getUserLocation();
    }
}

function initializeTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function addToFavorites() {
    if (!currentCity) return;
    if (!favorites.includes(currentCity)) {
        favorites.push(currentCity);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        loadFavorites();
    }
}

function loadFavorites() {
    const container = document.getElementById('favoritesContainer');
    if (!container) return;
    container.innerHTML = favorites.map(city => `
        <div class="favorite-card">
            <span>${city}</span>
            <button class="remove-favorite" aria-label="Remove from favorites">×</button>
        </div>
    `).join('');
    container.querySelectorAll('.favorite-card').forEach((card, idx) => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-favorite')) {
                favorites.splice(idx, 1);
                localStorage.setItem('favorites', JSON.stringify(favorites));
                loadFavorites();
            } else {
                fetchWeatherByCity(favorites[idx]);
            }
        });
    });
}
