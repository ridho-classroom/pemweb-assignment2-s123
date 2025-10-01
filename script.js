// ===== JAVASCRIPT =====

// Configuration
const API_KEY = '80a58a7a6943fe8425ec51a6a993bcd5'; // Replace with your OpenWeatherMap API key
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// State Management
const state = {
    currentWeather: null,
    forecast: null,
    favorites: JSON.parse(localStorage.getItem('favorites')) || [],
    recentSearches: JSON.parse(localStorage.getItem('recentSearches')) || [],
    unit: localStorage.getItem('unit') || 'metric',
    theme: localStorage.getItem('theme') || 'light',
    currentLocation: null
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    unitToggle: document.getElementById('unitToggle'),
    themeToggle: document.getElementById('themeToggle'),
    currentWeather: document.getElementById('currentWeather'),
    forecastSection: document.getElementById('forecastSection'),
    favoritesSection: document.getElementById('favoritesSection'),
    loadingState: document.getElementById('loadingState'),
    errorContainer: document.getElementById('errorContainer'),
    recentSearches: document.getElementById('recentSearches'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    favoritesGrid: document.getElementById('favoritesGrid'),
    forecastGrid: document.getElementById('forecastGrid')
};

// Initialize App
function init() {
    applyTheme();
    updateUnitDisplay();
    renderRecentSearches();
    renderFavorites();
    setupEventListeners();
    
    // Get user's location on load
    if (navigator.geolocation) {
        getUserLocation();
    } else {
        showError('Geolocation is not supported by your browser');
    }
}

// Event Listeners
function setupEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.locationBtn.addEventListener('click', getUserLocation);
    elements.unitToggle.addEventListener('click', toggleUnit);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.favoriteBtn.addEventListener('click', toggleFavorite);
}

// API Functions
async function fetchWeatherByCity(city) {
    showLoading();
    try {
        const response = await fetch(
            `${API_BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=${state.unit}`
        );
        
        if (!response.ok) throw new Error('City not found');
        
        const data = await response.json();
        state.currentWeather = data;
        state.currentLocation = { lat: data.coord.lat, lon: data.coord.lon };
        
        await fetchForecast(data.coord.lat, data.coord.lon);
        displayWeather(data);
        addToRecentSearches(city);
        hideLoading();
        clearError();
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

async function fetchWeatherByCoords(lat, lon) {
    showLoading();
    try {
        const response = await fetch(
            `${API_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.unit}`
        );
        
        if (!response.ok) throw new Error('Unable to fetch weather data');
        
        const data = await response.json();
        state.currentWeather = data;
        state.currentLocation = { lat, lon };
        
        await fetchForecast(lat, lon);
        displayWeather(data);
        hideLoading();
        clearError();
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

async function fetchForecast(lat, lon) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${state.unit}`
        );
        
        if (!response.ok) throw new Error('Unable to fetch forecast');
        
        const data = await response.json();
        state.forecast = data;
        displayForecast(data);
    } catch (error) {
        console.error('Forecast error:', error);
    }
}

// Display Functions
function displayWeather(data) {
    elements.currentWeather.classList.remove('hidden');
    
    document.getElementById('temperature').textContent = 
        `${Math.round(data.main.temp)}°${state.unit === 'metric' ? 'C' : 'F'}`;
    document.getElementById('weatherDesc').textContent = data.weather[0].description;
    document.getElementById('locationName').textContent = 
        `${data.name}, ${data.sys.country}`;
    document.getElementById('dateTime').textContent = 
        new Date().toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
    document.getElementById('feelsLike').textContent = 
        `${Math.round(data.main.feels_like)}°${state.unit === 'metric' ? 'C' : 'F'}`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('windSpeed').textContent = 
        `${data.wind.speed} ${state.unit === 'metric' ? 'm/s' : 'mph'}`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    
    const iconCode = data.weather[0].icon;
    document.getElementById('weatherIcon').src = 
        `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    document.getElementById('weatherIcon').alt = data.weather[0].description;
    
    updateFavoriteButton();
}

function displayForecast(data) {
    elements.forecastSection.classList.remove('hidden');
    elements.forecastGrid.innerHTML = '';
    
    // Get one forecast per day (at noon)
    const dailyForecasts = data.list.filter(item => 
        item.dt_txt.includes('12:00:00')
    ).slice(0, 5);
    
    dailyForecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-date">
                ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <img class="forecast-icon" 
                    src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png"
                    alt="${forecast.weather[0].description}">
            <div class="weather-desc">${forecast.weather[0].description}</div>
            <div class="forecast-temps">
                <span class="temp-high">${Math.round(forecast.main.temp_max)}°</span>
                <span class="temp-low">${Math.round(forecast.main.temp_min)}°</span>
            </div>
        `;
        elements.forecastGrid.appendChild(card);
    });
}

// Favorites Management
function toggleFavorite() {
    if (!state.currentWeather) return;
    
    const location = {
        name: state.currentWeather.name,
        country: state.currentWeather.sys.country,
        lat: state.currentWeather.coord.lat,
        lon: state.currentWeather.coord.lon
    };
    
    const index = state.favorites.findIndex(fav => 
        fav.lat === location.lat && fav.lon === location.lon
    );
    
    if (index > -1) {
        state.favorites.splice(index, 1);
        showMessage('Removed from favorites', 'success');
    } else {
        state.favorites.push(location);
        showMessage('Added to favorites', 'success');
    }
    
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
    updateFavoriteButton();
    renderFavorites();
}

function updateFavoriteButton() {
    if (!state.currentWeather) return;
    
    const isFavorite = state.favorites.some(fav => 
        fav.lat === state.currentWeather.coord.lat && 
        fav.lon === state.currentWeather.coord.lon
    );
    
    document.getElementById('favoriteIcon').textContent = isFavorite ? '★' : '☆';
    elements.favoriteBtn.classList.toggle('active', isFavorite);
}

function renderFavorites() {
    if (state.favorites.length === 0) {
        elements.favoritesSection.classList.add('hidden');
        return;
    }
    
    elements.favoritesSection.classList.remove('hidden');
    elements.favoritesGrid.innerHTML = '';
    
    state.favorites.forEach(fav => {
        const card = document.createElement('div');
        card.className = 'favorite-card';
        card.innerHTML = `
            <button class="remove-favorite" data-lat="${fav.lat}" data-lon="${fav.lon}">×</button>
            <div style="font-weight: 600; margin-bottom: 0.5rem;">${fav.name}</div>
            <div style="color: var(--text-secondary);">${fav.country}</div>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-favorite')) {
                fetchWeatherByCoords(fav.lat, fav.lon);
            }
        });
        
        card.querySelector('.remove-favorite').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavorite(fav.lat, fav.lon);
        });
        
        elements.favoritesGrid.appendChild(card);
    });
}

function removeFavorite(lat, lon) {
    state.favorites = state.favorites.filter(fav => 
        fav.lat !== lat || fav.lon !== lon
    );
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
    renderFavorites();
    updateFavoriteButton();
}

// Recent Searches
function addToRecentSearches(city) {
    if (!state.recentSearches.includes(city)) {
        state.recentSearches.unshift(city);
        state.recentSearches = state.recentSearches.slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(state.recentSearches));
        renderRecentSearches();
    }
}

function renderRecentSearches() {
    elements.recentSearches.innerHTML = '';
    
    if (state.recentSearches.length > 0) {
        const label = document.createElement('span');
        label.textContent = 'Recent: ';
        label.style.color = 'var(--text-secondary)';
        elements.recentSearches.appendChild(label);
    }
    
    state.recentSearches.forEach(search => {
        const tag = document.createElement('span');
        tag.className = 'recent-tag';
        tag.textContent = search;
        tag.addEventListener('click', () => fetchWeatherByCity(search));
        elements.recentSearches.appendChild(tag);
    });
}

// Handlers
function handleSearch() {
    const city = elements.searchInput.value.trim();
    if (city) {
        fetchWeatherByCity(city);
        elements.searchInput.value = '';
    }
}

function getUserLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }
    
    showLoading();
    navigator.geolocation.getCurrentPosition(
        (position) => {
            fetchWeatherByCoords(
                position.coords.latitude,
                position.coords.longitude
            );
        },
        (error) => {
            hideLoading();
            showError('Unable to retrieve your location. Please search manually.');
        }
    );
}

function toggleUnit() {
    state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('unit', state.unit);
    updateUnitDisplay();
    
    // Refresh weather data with new unit
    if (state.currentLocation) {
        fetchWeatherByCoords(state.currentLocation.lat, state.currentLocation.lon);
    }
}

function updateUnitDisplay() {
    document.getElementById('unitText').textContent = 
        state.unit === 'metric' ? '°C' : '°F';
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    applyTheme();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.getElementById('themeIcon').textContent = 
        state.theme === 'light' ? '🌙' : '☀️';
}

// UI Helpers
function showLoading() {
    elements.loadingState.classList.remove('hidden');
    elements.currentWeather.classList.add('hidden');
    elements.forecastSection.classList.add('hidden');
}

function hideLoading() {
    elements.loadingState.classList.add('hidden');
}

function showError(message) {
    elements.errorContainer.innerHTML = `
        <div class="error-message">
            <span>⚠️</span>
            <span>${message}</span>
        </div>
    `;
    setTimeout(clearError, 5000);
}

function clearError() {
    elements.errorContainer.innerHTML = '';
}

function showMessage(message, type = 'success') {
    const className = type === 'success' ? 'success-message' : 'error-message';
    const icon = type === 'success' ? '✓' : '⚠️';
    
    elements.errorContainer.innerHTML = `
        <div class="${className}">
            <span>${icon}</span>
            <span>${message}</span>
        </div>
    `;
    setTimeout(clearError, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);