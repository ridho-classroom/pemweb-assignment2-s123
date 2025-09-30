// Configuration
const CONFIG = {
    API_KEY: '633a2b56f231dc690b4dc15178cb0d7b', 
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    GEO_URL: 'https://api.openweathermap.org/geo/1.0',
    ICON_URL: 'https://openweathermap.org/img/wn'
};

// State Management
const state = {
    currentCity: null,
    currentUnit: 'metric',
    theme: 'light',
    favorites: [],
    recentSearches: [],
    currentWeatherData: null,
    forecastData: null
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    searchSuggestions: document.getElementById('searchSuggestions'),
    recentSearches: document.getElementById('recentSearches'),
    unitToggle: document.getElementById('unitToggle'),
    unitLabel: document.getElementById('unitLabel'),
    themeToggle: document.getElementById('themeToggle'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorTitle: document.getElementById('errorTitle'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    currentWeather: document.getElementById('currentWeather'),
    cityName: document.getElementById('cityName'),
    currentDate: document.getElementById('currentDate'),
    currentTemp: document.getElementById('currentTemp'),
    weatherIcon: document.getElementById('weatherIcon'),
    weatherDescription: document.getElementById('weatherDescription'),
    feelsLike: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    pressure: document.getElementById('pressure'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    forecastSection: document.getElementById('forecastSection'),
    forecastContainer: document.getElementById('forecastContainer'),
    favoritesSection: document.getElementById('favoritesSection'),
    favoritesContainer: document.getElementById('favoritesContainer'),
    forecastModal: document.getElementById('forecastModal'),
    modalDate: document.getElementById('modalDate'),
    modalDetails: document.getElementById('modalDetails')
};

// Initialize App
function init() {
    loadPreferences();
    setupEventListeners();
    loadFavorites();
    displayRecentSearches();
    
    // Get user's location on startup
    if (navigator.geolocation) {
        getUserLocation();
    }
}

// Load Preferences from localStorage (fallback to memory)
function loadPreferences() {
    try {
        const savedUnit = localStorage.getItem('weatherUnit');
        const savedTheme = localStorage.getItem('weatherTheme');
        const savedFavorites = localStorage.getItem('weatherFavorites');
        const savedRecent = localStorage.getItem('weatherRecent');
        
        if (savedUnit) {
            state.currentUnit = savedUnit;
            elements.unitLabel.textContent = savedUnit === 'metric' ? '°C' : '°F';
        }
        
        if (savedTheme) {
            state.theme = savedTheme;
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
        
        if (savedFavorites) {
            state.favorites = JSON.parse(savedFavorites);
        }
        
        if (savedRecent) {
            state.recentSearches = JSON.parse(savedRecent);
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

// Save Preferences
function savePreferences() {
    try {
        localStorage.setItem('weatherUnit', state.currentUnit);
        localStorage.setItem('weatherTheme', state.theme);
        localStorage.setItem('weatherFavorites', JSON.stringify(state.favorites));
        localStorage.setItem('weatherRecent', JSON.stringify(state.recentSearches));
    } catch (error) {
        console.error('Error saving preferences:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.locationBtn.addEventListener('click', getUserLocation);
    elements.unitToggle.addEventListener('click', toggleUnit);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.favoriteBtn.addEventListener('click', toggleFavorite);
    elements.retryBtn.addEventListener('click', retry);
    
    // Close modal on click outside
    elements.forecastModal.addEventListener('click', (e) => {
        if (e.target === elements.forecastModal) {
            closeModal();
        }
    });
    
    // Close modal button
    const modalClose = elements.forecastModal.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
}

// Get User Location
function getUserLocation() {
    showLoading();
    
    if (!navigator.geolocation) {
        showError('Geolocation Error', 'Your browser does not support geolocation');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
            showError('Location Error', 'Unable to get your location. Please search manually.');
            console.error('Geolocation error:', error);
        }
    );
}

// Handle Search
function handleSearch() {
    const city = elements.searchInput.value.trim();
    
    if (!city) {
        showError('Invalid Input', 'Please enter a city name');
        return;
    }
    
    fetchWeatherByCity(city);
    elements.searchSuggestions.innerHTML = '';
}

// Handle Search Input (for suggestions)
function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (query.length < 3) {
        elements.searchSuggestions.innerHTML = '';
        return;
    }
    
    // Debounce search suggestions
    clearTimeout(handleSearchInput.timeout);
    handleSearchInput.timeout = setTimeout(() => {
        fetchCitySuggestions(query);
    }, 300);
}

// Fetch City Suggestions
async function fetchCitySuggestions(query) {
    try {
        const response = await fetch(
            `${CONFIG.GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${CONFIG.API_KEY}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        
        const data = await response.json();
        displaySuggestions(data);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

// Display Suggestions
function displaySuggestions(cities) {
    if (!cities || cities.length === 0) {
        elements.searchSuggestions.innerHTML = '';
        return;
    }
    
    elements.searchSuggestions.innerHTML = cities.map(city => `
        <div class="suggestion-item" onclick="selectSuggestion('${city.name}', '${city.country}')">
            ${city.name}, ${city.state || ''} ${city.country}
        </div>
    `).join('');
}

// Select Suggestion
function selectSuggestion(city, country) {
    elements.searchInput.value = city;
    elements.searchSuggestions.innerHTML = '';
    fetchWeatherByCity(city);
}

// Fetch Weather by City
async function fetchWeatherByCity(city) {
    showLoading();
    
    try {
        // Add to recent searches
        addToRecentSearches(city);
        
        const response = await fetch(
            `${CONFIG.BASE_URL}/weather?q=${encodeURIComponent(city)}&units=${state.currentUnit}&appid=${CONFIG.API_KEY}`
        );
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('City not found');
            }
            throw new Error('Failed to fetch weather data');
        }
        
        const data = await response.json();
        state.currentCity = city;
        state.currentWeatherData = data;
        
        displayCurrentWeather(data);
        fetchForecast(data.coord.lat, data.coord.lon);
    } catch (error) {
        showError('Weather Error', error.message);
        console.error('Error fetching weather:', error);
    }
}

// Fetch Weather by Coordinates
async function fetchWeatherByCoords(lat, lon) {
    showLoading();
    
    try {
        const response = await fetch(
            `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${state.currentUnit}&appid=${CONFIG.API_KEY}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch weather data');
        
        const data = await response.json();
        state.currentCity = data.name;
        state.currentWeatherData = data;
        
        displayCurrentWeather(data);
        fetchForecast(lat, lon);
    } catch (error) {
        showError('Weather Error', error.message);
        console.error('Error fetching weather:', error);
    }
}

// Fetch Forecast
async function fetchForecast(lat, lon) {
    try {
        const response = await fetch(
            `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${state.currentUnit}&appid=${CONFIG.API_KEY}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch forecast');
        
        const data = await response.json();
        state.forecastData = data;
        
        displayForecast(data);
    } catch (error) {
        console.error('Error fetching forecast:', error);
        elements.forecastSection.classList.add('hidden');
    }
}

// Display Current Weather
function displayCurrentWeather(data) {
    hideLoading();
    hideError();
    elements.currentWeather.classList.remove('hidden');
    
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const unitSymbol = state.currentUnit === 'metric' ? 'C' : 'F';
    
    elements.cityName.textContent = `${data.name}, ${data.sys.country}`;
    elements.currentDate.textContent = formatDate(new Date());
    elements.currentTemp.textContent = temp;
    elements.weatherIcon.src = `${CONFIG.ICON_URL}/${data.weather[0].icon}@2x.png`;
    elements.weatherIcon.alt = data.weather[0].description;
    elements.weatherDescription.textContent = data.weather[0].description;
    elements.feelsLike.textContent = `${feelsLike}°${unitSymbol}`;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.windSpeed.textContent = `${data.wind.speed} ${state.currentUnit === 'metric' ? 'm/s' : 'mph'}`;
    elements.pressure.textContent = `${data.main.pressure} hPa`;
    
    updateFavoriteButton();
}

// Display Forecast
function displayForecast(data) {
    elements.forecastSection.classList.remove('hidden');
    
    // Group forecasts by day (take one per day)
    const dailyForecasts = [];
    const processedDates = new Set();
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateStr = date.toDateString();
        
        if (!processedDates.has(dateStr) && dailyForecasts.length < 5) {
            processedDates.add(dateStr);
            dailyForecasts.push(item);
        }
    });
    
    elements.forecastContainer.innerHTML = dailyForecasts.map((item, index) => {
        const date = new Date(item.dt * 1000);
        const temp = Math.round(item.main.temp);
        const tempMin = Math.round(item.main.temp_min);
        const tempMax = Math.round(item.main.temp_max);
        const unitSymbol = state.currentUnit === 'metric' ? 'C' : 'F';
        
        return `
            <div class="forecast-card" onclick="showForecastDetails(${index})">
                <div class="forecast-date">${formatDayName(date)}</div>
                <img src="${CONFIG.ICON_URL}/${item.weather[0].icon}@2x.png" 
                     alt="${item.weather[0].description}" 
                     class="forecast-icon">
                <div class="forecast-temp">${temp}°${unitSymbol}</div>
                <div class="forecast-desc">${item.weather[0].description}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    H: ${tempMax}° L: ${tempMin}°
                </div>
            </div>
        `;
    }).join('');
    
    // Store for modal
    displayForecast.dailyForecasts = dailyForecasts;
}

// Show Forecast Details in Modal
function showForecastDetails(index) {
    const forecast = displayForecast.dailyForecasts[index];
    if (!forecast) return;
    
    const date = new Date(forecast.dt * 1000);
    const temp = Math.round(forecast.main.temp);
    const unitSymbol = state.currentUnit === 'metric' ? 'C' : 'F';
    
    elements.modalDate.textContent = formatFullDate(date);
    elements.modalDetails.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <img src="${CONFIG.ICON_URL}/${forecast.weather[0].icon}@4x.png" 
                 alt="${forecast.weather[0].description}"
                 style="width: 128px; height: 128px;">
            <div style="font-size: 3rem; font-weight: 700; margin: 1rem 0;">${temp}°${unitSymbol}</div>
            <div style="font-size: 1.25rem; text-transform: capitalize;">${forecast.weather[0].description}</div>
        </div>
        <div class="detail-item">
            <div>
                <p class="detail-label">Feels Like</p>
                <p class="detail-value">${Math.round(forecast.main.feels_like)}°${unitSymbol}</p>
            </div>
        </div>
        <div class="detail-item">
            <div>
                <p class="detail-label">Humidity</p>
                <p class="detail-value">${forecast.main.humidity}%</p>
            </div>
        </div>
        <div class="detail-item">
            <div>
                <p class="detail-label">Wind Speed</p>
                <p class="detail-value">${forecast.wind.speed} ${state.currentUnit === 'metric' ? 'm/s' : 'mph'}</p>
            </div>
        </div>
        <div class="detail-item">
            <div>
                <p class="detail-label">Pressure</p>
                <p class="detail-value">${forecast.main.pressure} hPa</p>
            </div>
        </div>
        <div class="detail-item">
            <div>
                <p class="detail-label">Cloudiness</p>
                <p class="detail-value">${forecast.clouds.all}%</p>
            </div>
        </div>
    `;
    
    elements.forecastModal.classList.remove('hidden');
}

// Close Modal
function closeModal() {
    elements.forecastModal.classList.add('hidden');
}

// Toggle Unit
function toggleUnit() {
    state.currentUnit = state.currentUnit === 'metric' ? 'imperial' : 'metric';
    elements.unitLabel.textContent = state.currentUnit === 'metric' ? '°C' : '°F';
    
    savePreferences();
    
    // Refresh current data
    if (state.currentWeatherData) {
        const { lat, lon } = state.currentWeatherData.coord;
        fetchWeatherByCoords(lat, lon);
    }
}

// Toggle Theme
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    savePreferences();
}

// Toggle Favorite
function toggleFavorite() {
    if (!state.currentCity || !state.currentWeatherData) return;
    
    const favoriteIndex = state.favorites.findIndex(f => f.city === state.currentCity);
    
    if (favoriteIndex > -1) {
        state.favorites.splice(favoriteIndex, 1);
    } else {
        state.favorites.push({
            city: state.currentCity,
            country: state.currentWeatherData.sys.country,
            lat: state.currentWeatherData.coord.lat,
            lon: state.currentWeatherData.coord.lon
        });
    }
    
    savePreferences();
    updateFavoriteButton();
    loadFavorites();
}

// Update Favorite Button
function updateFavoriteButton() {
    const isFavorite = state.favorites.some(f => f.city === state.currentCity);
    
    if (isFavorite) {
        elements.favoriteBtn.classList.add('active');
        elements.favoriteBtn.querySelector('span').textContent = 'Remove from Favorites';
    } else {
        elements.favoriteBtn.classList.remove('active');
        elements.favoriteBtn.querySelector('span').textContent = 'Add to Favorites';
    }
}

// Load Favorites
async function loadFavorites() {
    if (state.favorites.length === 0) {
        elements.favoritesSection.classList.add('hidden');
        return;
    }
    
    elements.favoritesSection.classList.remove('hidden');
    elements.favoritesContainer.innerHTML = '<div style="text-align: center; padding: 1rem;">Loading favorites...</div>';
    
    const favoriteCards = await Promise.all(
        state.favorites.map(async (fav) => {
            try {
                const response = await fetch(
                    `${CONFIG.BASE_URL}/weather?lat=${fav.lat}&lon=${fav.lon}&units=${state.currentUnit}&appid=${CONFIG.API_KEY}`
                );
                
                if (!response.ok) throw new Error('Failed to fetch');
                
                const data = await response.json();
                const temp = Math.round(data.main.temp);
                const unitSymbol = state.currentUnit === 'metric' ? 'C' : 'F';
                
                return `
                    <div class="favorite-card" onclick="loadFavorite('${fav.city}')">
                        <button class="favorite-remove" onclick="event.stopPropagation(); removeFavorite('${fav.city}')">&times;</button>
                        <div class="favorite-city">${data.name}, ${data.sys.country}</div>
                        <div class="favorite-temp">${temp}°${unitSymbol}</div>
                        <div class="favorite-desc">${data.weather[0].description}</div>
                    </div>
                `;
            } catch (error) {
                console.error(`Error loading favorite ${fav.city}:`, error);
                return '';
            }
        })
    );
    
    elements.favoritesContainer.innerHTML = favoriteCards.join('');
}

// Load Favorite
function loadFavorite(city) {
    elements.searchInput.value = city;
    fetchWeatherByCity(city);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Remove Favorite
function removeFavorite(city) {
    state.favorites = state.favorites.filter(f => f.city !== city);
    savePreferences();
    loadFavorites();
    updateFavoriteButton();
}

// Add to Recent Searches
function addToRecentSearches(city) {
    // Remove if already exists
    state.recentSearches = state.recentSearches.filter(c => c.toLowerCase() !== city.toLowerCase());
    
    // Add to beginning
    state.recentSearches.unshift(city);
    
    // Keep only last 5
    if (state.recentSearches.length > 5) {
        state.recentSearches = state.recentSearches.slice(0, 5);
    }
    
    savePreferences();
    displayRecentSearches();
}

// Display Recent Searches
function displayRecentSearches() {
    if (state.recentSearches.length === 0) {
        elements.recentSearches.innerHTML = '';
        return;
    }
    
    elements.recentSearches.innerHTML = state.recentSearches.map(city => `
        <div class="recent-chip" onclick="loadRecent('${city}')">${city}</div>
    `).join('');
}

// Load Recent Search
function loadRecent(city) {
    elements.searchInput.value = city;
    fetchWeatherByCity(city);
}

// Show Loading
function showLoading() {
    elements.loadingState.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
    elements.currentWeather.classList.add('hidden');
    elements.forecastSection.classList.add('hidden');
}

// Hide Loading
function hideLoading() {
    elements.loadingState.classList.add('hidden');
}

// Show Error
function showError(title, message) {
    hideLoading();
    elements.errorState.classList.remove('hidden');
    elements.currentWeather.classList.add('hidden');
    elements.forecastSection.classList.add('hidden');
    elements.errorTitle.textContent = title;
    elements.errorMessage.textContent = message;
}

// Hide Error
function hideError() {
    elements.errorState.classList.add('hidden');
}

// Retry
function retry() {
    if (state.currentCity) {
        fetchWeatherByCity(state.currentCity);
    } else {
        getUserLocation();
    }
}

// Format Date
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format Full Date
function formatFullDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format Day Name
function formatDayName(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}