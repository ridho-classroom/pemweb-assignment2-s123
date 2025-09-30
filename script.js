// API key a4bca1718cc54beb7c804f38c61f96fe
// ==================== CONFIGURATION ====================
const API_KEY = 'a4bca1718cc54beb7c804f38c61f96fe'; // Replace with your API key
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0';

// ==================== STATE MANAGEMENT ====================
const state = {
    currentWeather: null,
    forecast: null,
    currentLocation: null,
    unit: 'metric', // 'metric' or 'imperial'
    theme: 'light',
    favorites: [],
    recentSearches: [],
    cachedData: {}
};

// ==================== DOM ELEMENTS ====================
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    searchSuggestions: document.getElementById('searchSuggestions'),
    unitToggle: document.getElementById('unitToggle'),
    themeToggle: document.getElementById('themeToggle'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    mainContent: document.getElementById('mainContent'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    locationName: document.getElementById('locationName'),
    currentDate: document.getElementById('currentDate'),
    weatherIcon: document.getElementById('weatherIcon'),
    currentTemp: document.getElementById('currentTemp'),
    weatherDescription: document.getElementById('weatherDescription'),
    feelsLike: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    forecastContainer: document.getElementById('forecastContainer'),
    favoritesContainer: document.getElementById('favoritesContainer'),
    recentSearches: document.getElementById('recentSearches'),
    forecastModal: document.getElementById('forecastModal'),
    modalClose: document.getElementById('modalClose')
};

// ==================== INITIALIZATION ====================
function init() {
    console.log('Initializing weather dashboard...');
    loadStateFromStorage();
    setupEventListeners();
    applyTheme();
    updateUnitToggle();
    
    console.log('Initial state:', state);
    
    // Try to get weather for user's location on load
    if (navigator.geolocation) {
        getUserLocation();
    } else {
        // Fallback to a default city
        searchWeather('London');
    }
    
    // Display saved data after a short delay to ensure DOM is ready
    setTimeout(() => {
        displayFavorites();
        displayRecentSearches();
    }, 100);
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.locationBtn.addEventListener('click', getUserLocation);
    elements.unitToggle.addEventListener('click', toggleUnit);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.retryBtn.addEventListener('click', () => {
        if (state.currentLocation) {
            getWeatherByCoords(state.currentLocation.lat, state.currentLocation.lon);
        }
    });
    elements.favoriteBtn.addEventListener('click', toggleFavorite);
    elements.modalClose.addEventListener('click', closeModal);
    elements.forecastModal.addEventListener('click', (e) => {
        if (e.target === elements.forecastModal) closeModal();
    });
    
    // Click outside suggestions to close
    document.addEventListener('click', (e) => {
        if (!elements.searchInput.contains(e.target) && !elements.searchSuggestions.contains(e.target)) {
            elements.searchSuggestions.innerHTML = '';
        }
    });
}

// ==================== LOCAL STORAGE ====================
function loadStateFromStorage() {
    try {
        const savedUnit = localStorage.getItem('weatherUnit');
        const savedTheme = localStorage.getItem('weatherTheme');
        const savedFavorites = localStorage.getItem('weatherFavorites');
        const savedRecentSearches = localStorage.getItem('weatherRecentSearches');
        const savedCache = localStorage.getItem('weatherCache');
        
        if (savedUnit) state.unit = savedUnit;
        if (savedTheme) state.theme = savedTheme;
        if (savedFavorites) {
            try {
                state.favorites = JSON.parse(savedFavorites);
            } catch (e) {
                state.favorites = [];
            }
        }
        if (savedRecentSearches) {
            try {
                state.recentSearches = JSON.parse(savedRecentSearches);
                console.log('Loaded recent searches:', state.recentSearches);
            } catch (e) {
                state.recentSearches = [];
            }
        }
        if (savedCache) {
            try {
                state.cachedData = JSON.parse(savedCache);
            } catch (e) {
                state.cachedData = {};
            }
        }
    } catch (error) {
        console.error('Error loading from storage:', error);
    }
}

function saveToStorage() {
    try {
        localStorage.setItem('weatherUnit', state.unit);
        localStorage.setItem('weatherTheme', state.theme);
        localStorage.setItem('weatherFavorites', JSON.stringify(state.favorites));
        localStorage.setItem('weatherRecentSearches', JSON.stringify(state.recentSearches));
        localStorage.setItem('weatherCache', JSON.stringify(state.cachedData));
        console.log('Saved to storage. Recent searches:', state.recentSearches);
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

// ==================== API CALLS ====================
async function getWeatherByCity(city) {
    try {
        showLoading();
        console.log('Fetching weather for city:', city);
        
        const response = await fetch(
            `${API_BASE_URL}/weather?q=${encodeURIComponent(city)}&units=${state.unit}&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('City not found');
        }
        
        const data = await response.json();
        state.currentLocation = { lat: data.coord.lat, lon: data.coord.lon };
        
        console.log('Weather data received for:', data.name, data.sys.country);
        
        await getForecastByCoords(data.coord.lat, data.coord.lon);
        displayCurrentWeather(data);
        
        const cityName = `${data.name}, ${data.sys.country}`;
        console.log('About to add to recent searches:', cityName);
        addToRecentSearches(cityName);
        
        hideError();
    } catch (error) {
        console.error('Error fetching weather:', error);
        showError(error.message);
    }
}

async function getWeatherByCoords(lat, lon) {
    try {
        showLoading();
        console.log('Fetching weather for coordinates:', lat, lon);
        
        const response = await fetch(
            `${API_BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Unable to fetch weather data');
        }
        
        const data = await response.json();
        await getForecastByCoords(lat, lon);
        displayCurrentWeather(data);
        state.currentLocation = { lat, lon };
        
        // Add to recent searches when using geolocation too
        const cityName = `${data.name}, ${data.sys.country}`;
        console.log('Adding geolocation result to recent searches:', cityName);
        addToRecentSearches(cityName);
        
        hideError();
    } catch (error) {
        console.error('Error fetching weather by coords:', error);
        showError(error.message);
    }
}

async function getForecastByCoords(lat, lon) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Unable to fetch forecast data');
        }
        
        const data = await response.json();
        state.forecast = data;
        displayForecast(data);
        
        // Cache the data
        const cacheKey = `${lat},${lon}`;
        state.cachedData[cacheKey] = {
            timestamp: Date.now(),
            data: data
        };
        saveToStorage();
    } catch (error) {
        console.error('Forecast error:', error);
    }
}

async function searchCities(query) {
    if (query.length < 3) {
        elements.searchSuggestions.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(
            `${GEO_API_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
        );
        
        if (!response.ok) return;
        
        const cities = await response.json();
        displaySuggestions(cities);
    } catch (error) {
        console.error('Search error:', error);
    }
}

// ==================== UI DISPLAY FUNCTIONS ====================
function displayCurrentWeather(data) {
    state.currentWeather = data;
    
    elements.locationName.textContent = `${data.name}, ${data.sys.country}`;
    elements.currentDate.textContent = formatDate(new Date());
    elements.weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    elements.weatherIcon.alt = data.weather[0].description;
    elements.currentTemp.textContent = `${Math.round(data.main.temp)}°`;
    elements.weatherDescription.textContent = data.weather[0].description;
    elements.feelsLike.textContent = `${Math.round(data.main.feels_like)}°`;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.windSpeed.textContent = `${Math.round(data.wind.speed * (state.unit === 'metric' ? 3.6 : 1))} ${state.unit === 'metric' ? 'km/h' : 'mph'}`;
    
    updateFavoriteButton();
    hideLoading();
    
    console.log('Current weather displayed. Recent searches count:', state.recentSearches.length);
}

function displayForecast(data) {
    elements.forecastContainer.innerHTML = '';
    
    // Get daily forecasts (one per day at noon)
    const dailyForecasts = data.list.filter(item => 
        item.dt_txt.includes('12:00:00')
    ).slice(0, 5);
    
    dailyForecasts.forEach(forecast => {
        const card = createForecastCard(forecast);
        elements.forecastContainer.appendChild(card);
    });
}

function createForecastCard(forecast) {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    
    const date = new Date(forecast.dt * 1000);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    card.innerHTML = `
        <div class="forecast-date">${dayName}</div>
        <div class="forecast-date" style="font-size: 0.875rem; color: var(--text-secondary);">${dateStr}</div>
        <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" alt="${forecast.weather[0].description}">
        <div class="forecast-temp">${Math.round(forecast.main.temp)}°</div>
        <div class="forecast-desc">${forecast.weather[0].description}</div>
    `;
    
    card.addEventListener('click', () => showForecastDetails(forecast));
    
    return card;
}

function showForecastDetails(forecast) {
    const date = new Date(forecast.dt * 1000);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    document.getElementById('modalDate').textContent = dateStr;
    document.getElementById('modalIcon').src = `https://openweathermap.org/img/wn/${forecast.weather[0].icon}@4x.png`;
    document.getElementById('modalTemp').textContent = `${Math.round(forecast.main.temp)}°`;
    document.getElementById('modalFeels').textContent = `${Math.round(forecast.main.feels_like)}°`;
    document.getElementById('modalCondition').textContent = forecast.weather[0].description;
    document.getElementById('modalHumidity').textContent = `${forecast.main.humidity}%`;
    document.getElementById('modalWind').textContent = `${Math.round(forecast.wind.speed * (state.unit === 'metric' ? 3.6 : 1))} ${state.unit === 'metric' ? 'km/h' : 'mph'}`;
    
    elements.forecastModal.classList.remove('hidden');
}

function closeModal() {
    elements.forecastModal.classList.add('hidden');
}

function displaySuggestions(cities) {
    if (cities.length === 0) {
        elements.searchSuggestions.innerHTML = '';
        return;
    }
    
    elements.searchSuggestions.innerHTML = cities.map(city => `
        <div class="suggestion-item" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}">
            ${city.name}, ${city.state || ''} ${city.country}
        </div>
    `).join('');
    
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const lat = parseFloat(item.dataset.lat);
            const lon = parseFloat(item.dataset.lon);
            const name = item.dataset.name;
            
            getWeatherByCoords(lat, lon);
            elements.searchInput.value = name;
            elements.searchSuggestions.innerHTML = '';
        });
    });
}

function displayFavorites() {
    if (state.favorites.length === 0) {
        elements.favoritesContainer.innerHTML = '<p class="empty-state">No favorite locations yet</p>';
        return;
    }
    
    elements.favoritesContainer.innerHTML = state.favorites.map(fav => `
        <div class="favorite-item" data-lat="${fav.lat}" data-lon="${fav.lon}">
            <span>${fav.name}</span>
            <button class="favorite-remove" data-name="${fav.name}">&times;</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.favorite-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('favorite-remove')) {
                const lat = parseFloat(item.dataset.lat);
                const lon = parseFloat(item.dataset.lon);
                getWeatherByCoords(lat, lon);
            }
        });
    });
    
    document.querySelectorAll('.favorite-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavorite(btn.dataset.name);
        });
    });
}

function displayRecentSearches() {
    console.log('Displaying recent searches:', state.recentSearches);
    
    if (!state.recentSearches || state.recentSearches.length === 0) {
        elements.recentSearches.innerHTML = '<p class="empty-state">No recent searches</p>';
        return;
    }
    
    const html = state.recentSearches.map((search, index) => `
        <div class="recent-item" data-index="${index}">
            ${search}
        </div>
    `).join('');
    
    elements.recentSearches.innerHTML = html;
    
    // Add event listeners after rendering
    setTimeout(() => {
        document.querySelectorAll('.recent-item').forEach((item) => {
            item.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const searchText = state.recentSearches[index];
                console.log('Clicked recent search:', searchText);
                
                // Extract city name (remove country code if present)
                const cityName = searchText.split(',')[0].trim();
                elements.searchInput.value = cityName;
                searchWeather(cityName);
            });
        });
    }, 0);
}

// ==================== HELPER FUNCTIONS ====================
function handleSearch() {
    const query = elements.searchInput.value.trim();
    if (query) {
        searchWeather(query);
    }
}

function searchWeather(city) {
    getWeatherByCity(city);
}

function handleSearchInput(e) {
    const query = e.target.value.trim();
    searchCities(query);
}

function getUserLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }
    
    showLoading();
    navigator.geolocation.getCurrentPosition(
        (position) => {
            getWeatherByCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
            showError('Unable to retrieve your location');
        }
    );
}

function toggleUnit() {
    state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
    updateUnitToggle();
    saveToStorage();
    
    // Refresh weather data with new unit
    if (state.currentLocation) {
        getWeatherByCoords(state.currentLocation.lat, state.currentLocation.lon);
    }
}

function updateUnitToggle() {
    elements.unitToggle.textContent = state.unit === 'metric' ? '°C' : '°F';
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveToStorage();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

function toggleFavorite() {
    if (!state.currentWeather) return;
    
    const location = {
        name: state.currentWeather.name,
        lat: state.currentWeather.coord.lat,
        lon: state.currentWeather.coord.lon
    };
    
    const index = state.favorites.findIndex(fav => fav.name === location.name);
    
    if (index === -1) {
        state.favorites.push(location);
    } else {
        state.favorites.splice(index, 1);
    }
    
    saveToStorage();
    updateFavoriteButton();
    displayFavorites();
}

function removeFavorite(name) {
    state.favorites = state.favorites.filter(fav => fav.name !== name);
    saveToStorage();
    displayFavorites();
    updateFavoriteButton();
}

function updateFavoriteButton() {
    if (!state.currentWeather) return;
    
    const isFavorite = state.favorites.some(fav => fav.name === state.currentWeather.name);
    
    if (isFavorite) {
        elements.favoriteBtn.classList.add('active');
        elements.favoriteBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>Remove from Favorites</span>
        `;
    } else {
        elements.favoriteBtn.classList.remove('active');
        elements.favoriteBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>Add to Favorites</span>
        `;
    }
}

function addToRecentSearches(city) {
    // Normalize the city name
    const normalizedCity = city.trim();
    
    console.log('Adding to recent searches:', normalizedCity);
    
    // Remove if already exists (case-insensitive)
    state.recentSearches = state.recentSearches.filter(
        search => search.toLowerCase() !== normalizedCity.toLowerCase()
    );
    
    // Add to beginning
    state.recentSearches.unshift(normalizedCity);
    
    // Keep only last 5
    if (state.recentSearches.length > 5) {
        state.recentSearches = state.recentSearches.slice(0, 5);
    }
    
    saveToStorage();
    displayRecentSearches();
    
    // Debug log
    console.log('Recent searches updated:', state.recentSearches);
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showLoading() {
    elements.loadingState.classList.remove('hidden');
    elements.mainContent.classList.add('hidden');
    elements.errorState.classList.add('hidden');
}

function hideLoading() {
    elements.loadingState.classList.add('hidden');
    elements.mainContent.classList.remove('hidden');
    
    // Always update these sections when content is shown
    displayFavorites();
    displayRecentSearches();
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorState.classList.remove('hidden');
    elements.loadingState.classList.add('hidden');
    elements.mainContent.classList.add('hidden');
}

function hideError() {
    elements.errorState.classList.add('hidden');
}

// ==================== START APPLICATION ====================
document.addEventListener('DOMContentLoaded', init);