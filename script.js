// ==========================================
// WEATHER DASHBOARD - JAVASCRIPT
// ==========================================

// Configuration
// PENTING: Ganti nilai di bawah ini dengan API Key Anda sendiri dari OpenWeatherMap
const API_KEY = '384dd6fdc3dc999e396ea4f23bdeca55'; 
const API_BASE = 'https://api.openweathermap.org/data/2.5';

// State Management
const state = {
    currentCity: null,
    unit: 'metric',
    theme: 'dark',
    favorites: [],
    searchHistory: [],
    currentWeatherData: null
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    searchSuggestions: document.getElementById('searchSuggestions'),
    locationBtn: document.getElementById('locationBtn'),
    unitToggle: document.getElementById('unitToggle'),
    themeToggle: document.getElementById('themeToggle'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorMessage: document.getElementById('errorMessage'),
    currentWeatherSection: document.getElementById('currentWeatherSection'),
    cityName: document.getElementById('cityName'),
    temperature: document.getElementById('temperature'),
    description: document.getElementById('description'),
    weatherIcon: document.getElementById('weatherIcon'),
    feelsLike: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    pressure: document.getElementById('pressure'),
    forecastContainer: document.getElementById('forecastContainer'),
    favoritesContainer: document.getElementById('favoritesContainer'),
    addFavoriteBtn: document.getElementById('addFavoriteBtn')
};

// ==========================================
// INITIALIZATION
// ==========================================

function init() {
    loadFromStorage();
    setupEventListeners();
    applyTheme();
    renderFavorites();
    
    // Coba dapatkan lokasi pengguna saat pertama kali memuat
    if (state.favorites.length > 0) {
        loadWeatherByCity(state.favorites[0].name);
    } else {
        getCurrentLocation();
    }
}

// ==========================================
// LOCAL STORAGE FUNCTIONS
// ==========================================

function loadFromStorage() {
    const savedUnit = localStorage.getItem('weatherUnit');
    const savedTheme = localStorage.getItem('weatherTheme');
    const savedFavorites = localStorage.getItem('weatherFavorites');
    const savedHistory = localStorage.getItem('searchHistory');

    if (savedUnit) state.unit = savedUnit;
    if (savedTheme) state.theme = savedTheme;
    if (savedFavorites) state.favorites = JSON.parse(savedFavorites);
    if (savedHistory) state.searchHistory = JSON.parse(savedHistory);
}

function saveToStorage() {
    localStorage.setItem('weatherUnit', state.unit);
    localStorage.setItem('weatherTheme', state.theme);
    localStorage.setItem('weatherFavorites', JSON.stringify(state.favorites));
    localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchInput.addEventListener('focus', handleSearchInput);
    elements.locationBtn.addEventListener('click', getCurrentLocation);
    elements.unitToggle.addEventListener('click', toggleUnit);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.addFavoriteBtn.addEventListener('click', addToFavorites);
    
    document.addEventListener('click', (e) => {
        if (!elements.searchInput.contains(e.target) && !elements.searchSuggestions.contains(e.target)) {
            elements.searchSuggestions.style.display = 'none';
        }
    });
}

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================

function handleSearch() {
    const city = elements.searchInput.value.trim();
    if (city) {
        loadWeatherByCity(city);
        addToSearchHistory(city);
        elements.searchInput.value = '';
        elements.searchSuggestions.style.display = 'none';
    }
}

function handleSearchInput(e) {
    const value = e.target.value.trim();
    if (value.length >= 1 || e.type === 'focus') {
        showSearchSuggestions();
    } else {
        elements.searchSuggestions.style.display = 'none';
    }
}

function showSearchSuggestions() {
    const recentSearches = state.searchHistory.slice(0, 5);
    if (recentSearches.length > 0) {
        elements.searchSuggestions.innerHTML = recentSearches
            .map(city => `<div class="suggestion-item" onclick="selectSuggestion('${city}')">${city}</div>`)
            .join('');
        elements.searchSuggestions.style.display = 'block';
    } else {
        elements.searchSuggestions.innerHTML = '<div class="suggestion-item" style="cursor: default; color: var(--text-secondary);">No recent searches</div>';
        elements.searchSuggestions.style.display = 'block';
    }
}

function selectSuggestion(city) {
    elements.searchInput.value = '';
    elements.searchSuggestions.style.display = 'none';
    loadWeatherByCity(city);
}

function addToSearchHistory(city) {
    state.searchHistory = state.searchHistory.filter(c => c.toLowerCase() !== city.toLowerCase());
    state.searchHistory.unshift(city);
    state.searchHistory = state.searchHistory.slice(0, 10);
    saveToStorage();
}

// ==========================================
// GEOLOCATION
// ==========================================

function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                loadWeatherByCoords(latitude, longitude);
            },
            error => {
                hideLoading();
                showError('Tidak dapat mengakses lokasi Anda. Silakan cari kota secara manual.');
                console.error('Geolocation error:', error);
            }
        );
    } else {
        showError('Geolocation tidak didukung oleh browser ini.');
    }
}

// ==========================================
// API CALLS
// ==========================================

async function loadWeatherByCity(city) {
    if (!API_KEY || API_KEY === 'GANTI_DENGAN_API_KEY_ANDA') {
        showError('API Key belum diatur. Silakan edit file script.js');
        return;
    }
    showLoading();
    hideError();
    
    try {
        const weatherData = await fetchWeather(`${API_BASE}/weather?q=${city}&units=${state.unit}&appid=${API_KEY}`);
        const forecastData = await fetchWeather(`${API_BASE}/forecast?q=${city}&units=${state.unit}&appid=${API_KEY}`);
        
        state.currentWeatherData = weatherData;
        state.currentCity = weatherData.name;
        
        displayCurrentWeather(weatherData);
        displayForecast(forecastData);
        hideLoading();
    } catch (error) {
        hideLoading();
        showError(`Tidak dapat mengambil data untuk "${city}". Periksa kembali nama kota.`);
        console.error('API Error:', error);
    }
}

async function loadWeatherByCoords(lat, lon) {
    if (!API_KEY || API_KEY === 'GANTI_DENGAN_API_KEY_ANDA') {
        showError('API Key belum diatur. Silakan edit file script.js');
        return;
    }
    showLoading();
    hideError();

    try {
        const weatherData = await fetchWeather(`${API_BASE}/weather?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}`);
        const forecastData = await fetchWeather(`${API_BASE}/forecast?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}`);
        
        state.currentWeatherData = weatherData;
        state.currentCity = weatherData.name;
        
        displayCurrentWeather(weatherData);
        displayForecast(forecastData);
    } catch (error) {
        showError('Tidak dapat mengambil data untuk lokasi Anda.');
        console.error('API Error:', error);
    } finally {
        hideLoading();
    }
}

async function fetchWeather(url) {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('City not found');
        } else if (response.status === 401) {
            throw new Error('Invalid API key');
        } else {
            throw new Error('Weather data not found');
        }
    }
    return await response.json();
}

// ==========================================
// DISPLAY FUNCTIONS
// ==========================================

function displayCurrentWeather(data) {
    const tempSymbol = state.unit === 'metric' ? '°C' : '°F';
    const windUnit = state.unit === 'metric' ? 'm/s' : 'mph';
    
    elements.cityName.textContent = `${data.name}, ${data.sys.country}`;
    elements.temperature.textContent = `${Math.round(data.main.temp)}${tempSymbol}`;
    elements.description.textContent = data.weather[0].description;
    elements.weatherIcon.textContent = getWeatherEmoji(data.weather[0].id);
    elements.feelsLike.textContent = `${Math.round(data.main.feels_like)}${tempSymbol}`;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.windSpeed.textContent = `${data.wind.speed.toFixed(1)} ${windUnit}`;
    elements.pressure.textContent = `${data.main.pressure} hPa`;
    
    elements.currentWeatherSection.classList.remove('hidden');
}

function displayForecast(data) {
    const dailyData = processForecastData(data.list);
    const tempSymbol = state.unit === 'metric' ? '°C' : '°F';
    
    elements.forecastContainer.innerHTML = dailyData.map((day, index) => {
        return `
            <div class="forecast-card" onclick='showForecastDetails(${index})' tabindex="0" role="button" aria-label="View forecast for ${day.date}">
                <div class="forecast-date">${day.date}</div>
                <div class="forecast-icon">${getWeatherEmoji(day.weather.id)}</div>
                <div class="weather-description">${day.weather.description}</div>
                <div class="forecast-temp">
                    <span class="temp-high">${Math.round(day.temp.max)}${tempSymbol}</span> / 
                    <span class="temp-low">${Math.round(day.temp.min)}${tempSymbol}</span>
                </div>
            </div>
        `;
    }).join('');
    
    window.forecastData = dailyData;
}

function processForecastData(list) {
    const daily = {};
    
    list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        if (!daily[dateKey]) {
            daily[dateKey] = {
                date: dateKey,
                temp: { min: item.main.temp, max: item.main.temp },
                weather: item.weather[0],
                details: []
            };
        } else {
            daily[dateKey].temp.min = Math.min(daily[dateKey].temp.min, item.main.temp);
            daily[dateKey].temp.max = Math.max(daily[dateKey].temp.max, item.main.temp);
        }
        
        daily[dateKey].details.push(item);
    });
    
    return Object.values(daily).slice(0, 5);
}

function showForecastDetails(index) {
    const day = window.forecastData[index];
    const tempSymbol = state.unit === 'metric' ? '°C' : '°F';
    const details = day.details.map(d => {
        const time = new Date(d.dt * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `${time}: ${Math.round(d.main.temp)}${tempSymbol} - ${d.weather[0].description}`;
    }).join('\n');
    
    alert(`📅 ${day.date}\n\n🌡️ High: ${Math.round(day.temp.max)}${tempSymbol}\n🌡️ Low: ${Math.round(day.temp.min)}${tempSymbol}\n☁️ ${day.weather.description}\n\n⏰ Hourly Details:\n${details}`);
}

// ==========================================
// FAVORITES - [BAGIAN INI DIPERBAIKI TOTAL]
// ==========================================

function addToFavorites() {
    if (!state.currentCity || !state.currentWeatherData) {
        showError('Tidak ada data cuaca untuk disimpan!');
        return;
    }

    const isAlreadyFavorite = state.favorites.some(fav => fav.name.toLowerCase() === state.currentCity.toLowerCase());

    if (isAlreadyFavorite) {
        alert(`${state.currentCity} sudah ada di favorit Anda.`);
        return;
    }
    
    const newFavorite = {
        name: state.currentCity,
        country: state.currentWeatherData.sys.country,
        id: state.currentWeatherData.id
    };
    state.favorites.push(newFavorite);
    saveToStorage();
    renderFavorites();
    alert(`${state.currentCity} ditambahkan ke favorit!`);
}

function renderFavorites() {
    if (state.favorites.length === 0) {
        elements.favoritesContainer.innerHTML = '<p style="color: var(--text-secondary);">Belum ada lokasi favorit.</p>';
        return;
    }
    elements.favoritesContainer.innerHTML = state.favorites.map(fav => `
        <div class="favorite-card" onclick="loadWeatherByCity('${fav.name}')" tabindex="0">
            <div>
                <strong>${fav.name}</strong>
                <small>${fav.country}</small>
            </div>
            <button class="remove-favorite" onclick="event.stopPropagation(); removeFavorite('${fav.name}')" aria-label="Remove ${fav.name} from favorites">&times;</button>
        </div>
    `).join('');
}

function removeFavorite(cityName) {
    state.favorites = state.favorites.filter(fav => fav.name.toLowerCase() !== cityName.toLowerCase());
    saveToStorage();
    renderFavorites();
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function toggleUnit() {
    state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
    elements.unitToggle.textContent = state.unit === 'metric' ? '°C' : '°F';
    saveToStorage();
    if (state.currentCity) {
        loadWeatherByCity(state.currentCity);
    }
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    elements.themeToggle.textContent = state.theme === 'dark' ? '🌙' : '☀️';
    applyTheme();
    saveToStorage();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

function showLoading() {
    elements.loadingIndicator.classList.remove('hidden');
    elements.currentWeatherSection.classList.add('hidden');
}

function hideLoading() {
    elements.loadingIndicator.classList.add('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

function getWeatherEmoji(id) {
    if (id >= 200 && id < 300) return '⛈️'; // Thunderstorm
    if (id >= 300 && id < 400) return '🌦️'; // Drizzle
    if (id >= 500 && id < 600) return '🌧️'; // Rain
    if (id >= 600 && id < 700) return '❄️'; // Snow
    if (id >= 700 && id < 800) return '🌫️'; // Atmosphere
    if (id === 800) return '☀️'; // Clear
    if (id === 801) return '🌤️'; // Few Clouds
    if (id === 802) return '⛅'; // Scattered Clouds
    if (id > 802) return '☁️';  // Broken/Overcast Clouds
    return '🌡️';
}

// ==========================================
// START THE APP
// ==========================================

init();