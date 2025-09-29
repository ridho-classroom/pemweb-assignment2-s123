// OpenWeatherMap API Configuration
const API_KEY = 'd497b753cbe1c9f22ba9ad28d1ecefcb'; // Your OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEOCODING_URL = 'https://api.openweathermap.org/geo/1.0';

// Application State
const appState = {
    currentUnit: 'metric', // 'metric' for Celsius, 'imperial' for Fahrenheit
    theme: 'light',
    favorites: [],
    searchHistory: [],
    currentWeatherData: null,
    forecastData: null,
    cachedData: {}
};

// DOM Elements
const elements = {
    // Theme and Unit Controls
    themeToggle: document.getElementById('themeToggle'),
    unitToggle: document.getElementById('unitToggle'),
    unitDisplay: document.getElementById('unitDisplay'),
    
    // Search Elements
    searchInput: document.getElementById('searchInput'),
    searchButton: document.getElementById('searchButton'),
    searchSuggestions: document.getElementById('searchSuggestions'),
    
    // Loading and Error
    loadingContainer: document.getElementById('loadingContainer'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText'),
    retryButton: document.getElementById('retryButton'),
    
    // Weather Display
    weatherCard: document.getElementById('weatherCard'),
    locationName: document.getElementById('locationName'),
    currentTemp: document.getElementById('currentTemp'),
    weatherDescription: document.getElementById('weatherDescription'),
    feelsLike: document.getElementById('feelsLike'),
    weatherIcon: document.getElementById('weatherIcon'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    locationRefreshBtn: document.getElementById('locationRefreshBtn'),
    
    // Weather Details
    visibility: document.getElementById('visibility'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    pressure: document.getElementById('pressure'),
    uvIndex: document.getElementById('uvIndex'),
    cloudiness: document.getElementById('cloudiness'),
    
    // Forecast and History
    forecastContainer: document.getElementById('forecastContainer'),
    favoriteCities: document.getElementById('favoriteCities'),
    searchHistory: document.getElementById('searchHistory'),
    
    // Modal
    modalOverlay: document.getElementById('modalOverlay'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalClose: document.getElementById('modalClose')
};

// Initialize Application
class WeatherApp {
    constructor() {
        this.init();
    }

    async init() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateThemeDisplay();
        this.updateUnitDisplay();
        this.renderFavorites();
        this.renderSearchHistory();
        
        // Try to get user's location for initial weather
        await this.getCurrentLocationWeather();
    }

    // Settings Management
    loadSettings() {
        const savedUnit = localStorage.getItem('weatherUnit');
        const savedTheme = localStorage.getItem('weatherTheme');
        const savedFavorites = localStorage.getItem('weatherFavorites');
        const savedHistory = localStorage.getItem('searchHistory');
        const savedCache = localStorage.getItem('weatherCache');

        if (savedUnit) appState.currentUnit = savedUnit;
        if (savedTheme) appState.theme = savedTheme;
        if (savedFavorites) appState.favorites = JSON.parse(savedFavorites);
        if (savedHistory) appState.searchHistory = JSON.parse(savedHistory);
        if (savedCache) appState.cachedData = JSON.parse(savedCache);

        // Apply theme
        document.documentElement.setAttribute('data-theme', appState.theme);
    }

    saveSettings() {
        localStorage.setItem('weatherUnit', appState.currentUnit);
        localStorage.setItem('weatherTheme', appState.theme);
        localStorage.setItem('weatherFavorites', JSON.stringify(appState.favorites));
        localStorage.setItem('searchHistory', JSON.stringify(appState.searchHistory));
        localStorage.setItem('weatherCache', JSON.stringify(appState.cachedData));
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Theme toggle
        elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Unit toggle
        elements.unitToggle.addEventListener('click', () => this.toggleUnit());
        
        // Search functionality
        elements.searchButton.addEventListener('click', () => this.handleSearch());
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        elements.searchInput.addEventListener('input', (e) => this.handleSearchSuggestions(e.target.value));
        
        // Handle search input focus
        elements.searchInput.addEventListener('focus', () => {
            if (elements.searchInput.value.length >= 3) {
                this.handleSearchSuggestions(elements.searchInput.value);
            }
        });
        
        // Retry button
        elements.retryButton.addEventListener('click', () => this.getCurrentLocationWeather());
        
        // Favorite button
        elements.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        
        // Location refresh button
        elements.locationRefreshBtn.addEventListener('click', () => this.refreshLocation());
        
        // Modal close
        elements.modalClose.addEventListener('click', () => this.closeModal());
        elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === elements.modalOverlay) this.closeModal();
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!elements.searchInput.contains(e.target) && 
                !elements.searchSuggestions.contains(e.target) &&
                !elements.searchButton.contains(e.target)) {
                elements.searchSuggestions.style.display = 'none';
            }
        });

        // Close suggestions when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                elements.searchSuggestions.style.display = 'none';
            }
        });
    }

    // Theme Management
    toggleTheme() {
        appState.theme = appState.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', appState.theme);
        this.updateThemeDisplay();
        this.saveSettings();
    }

    updateThemeDisplay() {
        const icon = elements.themeToggle.querySelector('i');
        icon.className = appState.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Unit Management
    toggleUnit() {
        appState.currentUnit = appState.currentUnit === 'metric' ? 'imperial' : 'metric';
        this.updateUnitDisplay();
        this.saveSettings();
        
        // Re-fetch weather data with new units if we have current location data
        if (appState.currentWeatherData && appState.currentWeatherData.coord) {
            this.getWeatherByCoords(appState.currentWeatherData.coord.lat, appState.currentWeatherData.coord.lon);
        }
    }

    updateUnitDisplay() {
        elements.unitDisplay.textContent = appState.currentUnit === 'metric' ? '°C' : '°F';
    }

    // Geolocation
    async getCurrentLocationWeather() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser. Please search for a city manually.');
            return;
        }

        this.showLoading();

        // Try high accuracy first, then fallback to lower accuracy
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000 // 5 minutes cache
        };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                console.log('Location found:', position.coords);
                const { latitude, longitude, accuracy } = position.coords;
                console.log(`Accuracy: ${accuracy} meters`);
                await this.getWeatherByCoords(latitude, longitude);
            },
            async (error) => {
                console.error('Geolocation error:', error);
                
                // Handle different error types
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        this.showError('Location access denied. Please enable location permission and refresh the page, or search for a city manually.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        this.showError('Location information is unavailable. Trying with lower accuracy...');
                        // Try again with lower accuracy
                        this.tryLowerAccuracyLocation();
                        break;
                    case error.TIMEOUT:
                        this.showError('Location request timed out. Trying with lower accuracy...');
                        // Try again with lower accuracy
                        this.tryLowerAccuracyLocation();
                        break;
                    default:
                        this.showError('An unknown error occurred while getting your location. Please search for a city manually.');
                        break;
                }
            },
            options
        );
    }

    // Fallback method with lower accuracy requirements
    tryLowerAccuracyLocation() {
        const fallbackOptions = {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 600000 // 10 minutes cache
        };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                console.log('Fallback location found:', position.coords);
                const { latitude, longitude, accuracy } = position.coords;
                console.log(`Fallback accuracy: ${accuracy} meters`);
                await this.getWeatherByCoords(latitude, longitude);
            },
            (error) => {
                console.error('Fallback geolocation error:', error);
                this.showError('Unable to get your location. Please search for a city manually or check your location settings.');
            },
            fallbackOptions
        );
    }

    // Refresh current location
    refreshLocation() {
        console.log('Refreshing location...');
        elements.locationRefreshBtn.classList.add('refreshing');
        
        // Clear any cached position data
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0 // Don't use cached position
        };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                console.log('Location refreshed:', position.coords);
                const { latitude, longitude, accuracy } = position.coords;
                console.log(`New accuracy: ${accuracy} meters`);
                await this.getWeatherByCoords(latitude, longitude);
                elements.locationRefreshBtn.classList.remove('refreshing');
            },
            (error) => {
                console.error('Location refresh error:', error);
                elements.locationRefreshBtn.classList.remove('refreshing');
                this.showError('Unable to refresh location. Please try again or search manually.');
            },
            options
        );
    }

    // API Calls
    async getWeatherByCoords(lat, lon) {
        try {
            console.log(`Fetching weather for coordinates: ${lat}, ${lon}`);
            
            const [weatherResponse, forecastResponse] = await Promise.all([
                fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${appState.currentUnit}`),
                fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${appState.currentUnit}`)
            ]);

            console.log('Weather API Response Status:', weatherResponse.status);
            console.log('Forecast API Response Status:', forecastResponse.status);

            if (!weatherResponse.ok || !forecastResponse.ok) {
                const errorText = !weatherResponse.ok ? 
                    `Weather API Error: ${weatherResponse.status} ${weatherResponse.statusText}` :
                    `Forecast API Error: ${forecastResponse.status} ${forecastResponse.statusText}`;
                throw new Error(errorText);
            }

            const weatherData = await weatherResponse.json();
            const forecastData = await forecastResponse.json();

            console.log('Weather data received for:', weatherData.name);
            
            this.processWeatherData(weatherData, forecastData);
        } catch (error) {
            console.error('API Error Details:', error);
            if (error.message.includes('fetch')) {
                this.showError('Network error. Please check your internet connection and try again.');
            } else if (error.message.includes('API')) {
                this.showError('Weather service temporarily unavailable. Please try again in a few minutes.');
            } else {
                this.showError('Unable to fetch weather data. Please try again later.');
            }
        }
    }

    async getWeatherByCity(cityName) {
        try {
            this.showLoading();

            // First, get coordinates for the city
            const geocodeResponse = await fetch(`${GEOCODING_URL}/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${API_KEY}`);
            
            if (!geocodeResponse.ok) {
                throw new Error('City not found');
            }

            const locations = await geocodeResponse.json();
            
            if (locations.length === 0) {
                throw new Error('City not found');
            }

            const { lat, lon } = locations[0];
            await this.getWeatherByCoords(lat, lon);
            
            // Add to search history
            this.addToSearchHistory(cityName);
            
        } catch (error) {
            console.error('Search Error:', error);
            this.showError(`Unable to find weather data for "${cityName}". Please check the city name and try again.`);
        }
    }

    // Search Functionality
    async handleSearch() {
        const query = elements.searchInput.value.trim();
        if (!query) return;

        await this.getWeatherByCity(query);
        elements.searchInput.value = '';
        elements.searchSuggestions.style.display = 'none';
    }

    async handleSearchSuggestions(query) {
        if (query.length < 3) {
            elements.searchSuggestions.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`${GEOCODING_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`);
            const cities = await response.json();

            this.displaySearchSuggestions(cities);
        } catch (error) {
            console.error('Suggestions Error:', error);
            elements.searchSuggestions.style.display = 'none';
        }
    }

    displaySearchSuggestions(cities) {
        if (cities.length === 0) {
            elements.searchSuggestions.style.display = 'none';
            return;
        }

        elements.searchSuggestions.innerHTML = '';
        
        cities.forEach(city => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = `${city.name}, ${city.country}${city.state ? `, ${city.state}` : ''}`;
            
            suggestionItem.addEventListener('click', () => {
                elements.searchInput.value = city.name;
                elements.searchSuggestions.style.display = 'none';
                this.getWeatherByCity(city.name);
            });
            
            elements.searchSuggestions.appendChild(suggestionItem);
        });

        elements.searchSuggestions.style.display = 'block';
    }

    // Data Processing
    processWeatherData(weatherData, forecastData) {
        appState.currentWeatherData = weatherData;
        appState.forecastData = forecastData;
        
        // Cache the data
        const cacheKey = `${weatherData.coord.lat},${weatherData.coord.lon}`;
        appState.cachedData[cacheKey] = {
            weather: weatherData,
            forecast: forecastData,
            timestamp: Date.now()
        };
        this.saveSettings();

        this.displayCurrentWeather(weatherData);
        this.displayForecast(forecastData);
        this.updateWeatherBackground(weatherData.weather[0].main);
        this.hideLoading();
        this.hideError();
    }

    // Display Functions
    displayCurrentWeather(data) {
        const temp = Math.round(data.main.temp);
        const feelsLike = Math.round(data.main.feels_like);
        const unitSymbol = appState.currentUnit === 'metric' ? 'C' : 'F';

        elements.locationName.textContent = `${data.name}, ${data.sys.country}`;
        elements.currentTemp.textContent = temp;
        elements.weatherDescription.textContent = data.weather[0].description;
        elements.feelsLike.textContent = feelsLike;
        elements.weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
        elements.weatherIcon.alt = data.weather[0].description;

        // Update weather details
        elements.visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
        elements.humidity.textContent = `${data.main.humidity}%`;
        elements.windSpeed.textContent = `${Math.round(data.wind.speed * (appState.currentUnit === 'metric' ? 3.6 : 1))} ${appState.currentUnit === 'metric' ? 'km/h' : 'mph'}`;
        elements.pressure.textContent = `${data.main.pressure} hPa`;
        elements.cloudiness.textContent = `${data.clouds.all}%`;
        elements.uvIndex.textContent = 'N/A'; // UV Index requires separate API call

        // Update favorite button state
        this.updateFavoriteButton(data.name);

        // Show weather card
        elements.weatherCard.classList.add('active');
    }

    displayForecast(data) {
        elements.forecastContainer.innerHTML = '';

        // Group forecast by day (take one forecast per day, around noon)
        const dailyForecasts = this.processForecastData(data.list);

        dailyForecasts.slice(0, 5).forEach((forecast, index) => {
            const forecastItem = this.createForecastItem(forecast, index);
            elements.forecastContainer.appendChild(forecastItem);
        });
    }

    processForecastData(forecastList) {
        const dailyData = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toDateString();
            
            if (!dailyData[dateKey] || Math.abs(12 - date.getHours()) < Math.abs(12 - new Date(dailyData[dateKey].dt * 1000).getHours())) {
                dailyData[dateKey] = item;
            }
        });

        return Object.values(dailyData);
    }

    createForecastItem(forecast, index) {
        const date = new Date(forecast.dt * 1000);
        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' });
        const temp = Math.round(forecast.main.temp);
        const tempMax = Math.round(forecast.main.temp_max);
        const tempMin = Math.round(forecast.main.temp_min);

        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" 
                 alt="${forecast.weather[0].description}" class="forecast-icon">
            <div class="forecast-temps">
                <span class="temp-high">${tempMax}°</span>
                <span class="temp-low">${tempMin}°</span>
            </div>
            <div class="forecast-desc">${forecast.weather[0].description}</div>
        `;

        forecastItem.addEventListener('click', () => this.showForecastModal(forecast, dayName));

        return forecastItem;
    }

    // Modal Functions
    showForecastModal(forecast, dayName) {
        const date = new Date(forecast.dt * 1000);
        const temp = Math.round(forecast.main.temp);
        const feelsLike = Math.round(forecast.main.feels_like);
        const unitSymbol = appState.currentUnit === 'metric' ? 'C' : 'F';

        elements.modalTitle.textContent = `${dayName} - ${date.toLocaleDateString()}`;
        elements.modalBody.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@4x.png" 
                     alt="${forecast.weather[0].description}" style="width: 100px; height: 100px;">
                <h3 style="margin: 1rem 0; text-transform: capitalize;">${forecast.weather[0].description}</h3>
            </div>
            <div class="weather-details">
                <div class="detail-item">
                    <i class="fas fa-thermometer-half"></i>
                    <span class="detail-label">Temperature</span>
                    <span class="detail-value">${temp}°${unitSymbol}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-thermometer-empty"></i>
                    <span class="detail-label">Feels Like</span>
                    <span class="detail-value">${feelsLike}°${unitSymbol}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-tint"></i>
                    <span class="detail-label">Humidity</span>
                    <span class="detail-value">${forecast.main.humidity}%</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-wind"></i>
                    <span class="detail-label">Wind Speed</span>
                    <span class="detail-value">${Math.round(forecast.wind.speed * (appState.currentUnit === 'metric' ? 3.6 : 1))} ${appState.currentUnit === 'metric' ? 'km/h' : 'mph'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-compress-arrows-alt"></i>
                    <span class="detail-label">Pressure</span>
                    <span class="detail-value">${forecast.main.pressure} hPa</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-cloud"></i>
                    <span class="detail-label">Cloudiness</span>
                    <span class="detail-value">${forecast.clouds.all}%</span>
                </div>
            </div>
        `;

        elements.modalOverlay.classList.add('active');
    }

    closeModal() {
        elements.modalOverlay.classList.remove('active');
    }

    // Favorites Management
    toggleFavorite() {
        if (!appState.currentWeatherData) return;

        const cityName = appState.currentWeatherData.name;
        const existingIndex = appState.favorites.findIndex(fav => fav.name === cityName);

        if (existingIndex >= 0) {
            appState.favorites.splice(existingIndex, 1);
        } else {
            appState.favorites.push({
                name: cityName,
                country: appState.currentWeatherData.sys.country,
                coords: appState.currentWeatherData.coord
            });
        }

        this.updateFavoriteButton(cityName);
        this.renderFavorites();
        this.saveSettings();
    }

    updateFavoriteButton(cityName) {
        const isFavorite = appState.favorites.some(fav => fav.name === cityName);
        const icon = elements.favoriteBtn.querySelector('i');
        
        if (isFavorite) {
            icon.className = 'fas fa-heart';
            elements.favoriteBtn.classList.add('active');
        } else {
            icon.className = 'far fa-heart';
            elements.favoriteBtn.classList.remove('active');
        }
    }

    renderFavorites() {
        elements.favoriteCities.innerHTML = '';

        appState.favorites.forEach(favorite => {
            const favoriteItem = document.createElement('div');
            favoriteItem.className = 'favorite-city';
            favoriteItem.innerHTML = `
                <span>${favorite.name}, ${favorite.country}</span>
                <i class="fas fa-times" style="cursor: pointer; opacity: 0.6;"></i>
            `;

            // Click to load weather
            favoriteItem.addEventListener('click', (e) => {
                if (e.target.tagName === 'I') {
                    // Remove favorite
                    const index = appState.favorites.indexOf(favorite);
                    appState.favorites.splice(index, 1);
                    this.renderFavorites();
                    this.saveSettings();
                } else {
                    // Load weather
                    this.getWeatherByCoords(favorite.coords.lat, favorite.coords.lon);
                }
            });

            elements.favoriteCities.appendChild(favoriteItem);
        });
    }

    // Search History Management
    addToSearchHistory(cityName) {
        // Remove if already exists
        appState.searchHistory = appState.searchHistory.filter(item => item !== cityName);
        
        // Add to beginning
        appState.searchHistory.unshift(cityName);
        
        // Limit to 10 items
        if (appState.searchHistory.length > 10) {
            appState.searchHistory.pop();
        }

        this.renderSearchHistory();
        this.saveSettings();
    }

    renderSearchHistory() {
        elements.searchHistory.innerHTML = '';

        appState.searchHistory.forEach(city => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = city;
            
            historyItem.addEventListener('click', () => {
                this.getWeatherByCity(city);
            });

            elements.searchHistory.appendChild(historyItem);
        });
    }

    // UI State Management
    showLoading() {
        elements.loadingContainer.classList.add('active');
        elements.weatherCard.classList.remove('active');
        elements.errorMessage.classList.remove('active');
    }

    hideLoading() {
        elements.loadingContainer.classList.remove('active');
    }

    showError(message) {
        elements.errorText.textContent = message;
        elements.errorMessage.classList.add('active');
        elements.loadingContainer.classList.remove('active');
        elements.weatherCard.classList.remove('active');
    }

    hideError() {
        elements.errorMessage.classList.remove('active');
    }

    // Dynamic Background
    updateWeatherBackground(condition) {
        const body = document.body;
        
        // Remove existing weather classes
        body.classList.remove('weather-clear', 'weather-clouds', 'weather-rain', 
                          'weather-snow', 'weather-thunderstorm', 'weather-mist');

        // Add appropriate class based on weather condition
        switch(condition.toLowerCase()) {
            case 'clear':
                body.classList.add('weather-clear');
                break;
            case 'clouds':
                body.classList.add('weather-clouds');
                break;
            case 'rain':
            case 'drizzle':
                body.classList.add('weather-rain');
                break;
            case 'snow':
                body.classList.add('weather-snow');
                break;
            case 'thunderstorm':
                body.classList.add('weather-thunderstorm');
                break;
            case 'mist':
            case 'smoke':
            case 'haze':
            case 'dust':
            case 'fog':
            case 'sand':
            case 'ash':
            case 'squall':
            case 'tornado':
                body.classList.add('weather-mist');
                break;
            default:
                body.classList.add('weather-clear');
        }
    }
}

// Initialize the weather app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for API key
    if (API_KEY === 'YOUR_API_KEY_HERE') {
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; text-align: center; padding: 2rem;">
                <h1 style="color: #ef4444; margin-bottom: 1rem;">API Key Required</h1>
                <p style="max-width: 600px; line-height: 1.6; margin-bottom: 2rem;">
                    To use this weather dashboard, you need to get a free API key from OpenWeatherMap:
                </p>
                <ol style="text-align: left; margin-bottom: 2rem;">
                    <li>Visit <a href="https://openweathermap.org/api" target="_blank" style="color: #0ea5e9;">https://openweathermap.org/api</a></li>
                    <li>Sign up for a free account</li>
                    <li>Get your API key</li>
                    <li>Replace 'YOUR_API_KEY_HERE' in the script.js file with your actual API key</li>
                </ol>
                <p style="color: #64748b; font-size: 0.9rem;">The API key is free and allows up to 1000 calls per day.</p>
            </div>
        `;
        return;
    }

    new WeatherApp();
});