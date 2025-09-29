// ============================================
// KONFIGURASI API
// ============================================

const CONFIG = {
    API_KEY: 'ee74c8b0d1cd20067bb454aa49d75e9d',
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    GEO_URL: 'https://api.openweathermap.org/geo/1.0',
    UNITS: 'metric',
    LANG: 'id',
    CACHE_DURATION: 10 * 60 * 1000
};

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
    currentCity: null,
    currentWeather: null,
    forecast: null,
    unit: 'celsius',
    theme: 'light',
    favorites: [],
    searchHistory: [],
    cache: {},
    autocompleteCities: []
};

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
    themeToggle: document.getElementById('themeToggle'),
    unitToggle: document.getElementById('unitToggle'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    citySearch: document.getElementById('citySearch'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('errorMessage'),
    errorText: document.getElementById('errorText'),
    currentWeather: document.getElementById('currentWeather'),
    forecast: document.getElementById('forecast'),
    favorites: document.getElementById('favorites'),
    favoritesList: document.getElementById('favoritesList'),
    searchHistory: document.getElementById('searchHistory'),
    autocomplete: document.getElementById('autocomplete'),
    cityName: document.getElementById('cityName'),
    country: document.getElementById('country'),
    dateTime: document.getElementById('dateTime'),
    weatherIcon: document.getElementById('weatherIcon'),
    temperature: document.getElementById('temperature'),
    description: document.getElementById('description'),
    feelsLike: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    pressure: document.getElementById('pressure'),
    forecastCards: document.getElementById('forecastCards'),
    forecastModal: document.getElementById('forecastModal'),
    modalBody: document.getElementById('modalBody')
};

// ============================================
// LOCALSTORAGE FUNCTIONS
// ============================================

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return null;
    }
}

function loadPreferences() {
    const savedUnit = loadFromLocalStorage('weatherApp_unit');
    if (savedUnit) {
        state.unit = savedUnit;
        CONFIG.UNITS = savedUnit === 'celsius' ? 'metric' : 'imperial';
        elements.unitToggle.textContent = savedUnit === 'celsius' ? '°C' : '°F';
    }

    const savedTheme = loadFromLocalStorage('weatherApp_theme');
    if (savedTheme) {
        state.theme = savedTheme;
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    const savedFavorites = loadFromLocalStorage('weatherApp_favorites');
    if (savedFavorites && Array.isArray(savedFavorites)) {
        state.favorites = savedFavorites;
        renderFavorites();
    }

    const savedHistory = loadFromLocalStorage('weatherApp_searchHistory');
    if (savedHistory && Array.isArray(savedHistory)) {
        state.searchHistory = savedHistory;
        renderSearchHistory();
    }

    const savedCache = loadFromLocalStorage('weatherApp_cache');
    if (savedCache) {
        state.cache = savedCache;
    }
}

function savePreferences() {
    saveToLocalStorage('weatherApp_unit', state.unit);
    saveToLocalStorage('weatherApp_theme', state.theme);
    saveToLocalStorage('weatherApp_favorites', state.favorites);
    saveToLocalStorage('weatherApp_searchHistory', state.searchHistory);
}

// ============================================
// CACHE FUNCTIONS
// ============================================

function isCacheValid(cityName) {
    const cached = state.cache[cityName];
    if (!cached) return false;
    
    const now = Date.now();
    const cacheAge = now - cached.timestamp;
    
    return cacheAge < CONFIG.CACHE_DURATION;
}

function getFromCache(cityName) {
    if (isCacheValid(cityName)) {
        console.log(`📦 Using cached data for ${cityName}`);
        return state.cache[cityName].data;
    }
    return null;
}

function saveToCache(cityName, data) {
    state.cache[cityName] = {
        data: data,
        timestamp: Date.now()
    };
    saveToLocalStorage('weatherApp_cache', state.cache);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.currentWeather.classList.add('hidden');
    elements.forecast.classList.add('hidden');
}

function hideLoading() {
    elements.loading.classList.add('hidden');
}

function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    setTimeout(() => elements.errorMessage.classList.add('hidden'), 5000);
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

function formatDateTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(timestamp) {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
}

function celsiusToFahrenheit(celsius) {
    return (celsius * 9 / 5) + 32;
}

function formatTemp(temp) {
    if (state.unit === 'fahrenheit') {
        return Math.round(celsiusToFahrenheit(temp)) + '°F';
    }
    return Math.round(temp) + '°C';
}

function getWeatherIconUrl(iconCode) {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchWeatherByCity(cityName) {
    const url = `${CONFIG.BASE_URL}/weather?q=${cityName}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}`;
    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) throw new Error('Kota tidak ditemukan. Coba periksa ejaan!');
        if (response.status === 401) throw new Error('API key tidak valid. Periksa konfigurasi!');
        throw new Error('Gagal mengambil data cuaca.');
    }

    return await response.json();
}

async function fetchWeatherByCoords(lat, lon) {
    const url = `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('Gagal mengambil data cuaca.');

    return await response.json();
}

async function fetchForecast(cityName) {
    const url = `${CONFIG.BASE_URL}/forecast?q=${cityName}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('Gagal mengambil data prakiraan.');

    return await response.json();
}

async function fetchForecastByCoords(lat, lon) {
    const url = `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('Gagal mengambil data prakiraan.');

    return await response.json();
}

// AUTOCOMPLETE: Fetch city suggestions
async function fetchCitySuggestions(query) {
    if (query.length < 2) return [];
    
    try {
        const url = `${CONFIG.GEO_URL}/direct?q=${query}&limit=5&appid=${CONFIG.API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) return [];
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching city suggestions:', error);
        return [];
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderCurrentWeather(data) {
    state.currentWeather = data;
    state.currentCity = data.name;

    elements.cityName.textContent = data.name;
    elements.country.textContent = data.sys.country;
    elements.dateTime.textContent = formatDateTime(data.dt);
    elements.weatherIcon.src = getWeatherIconUrl(data.weather[0].icon);
    elements.weatherIcon.alt = data.weather[0].description;
    elements.temperature.textContent = formatTemp(data.main.temp);
    elements.description.textContent = data.weather[0].description;
    elements.feelsLike.textContent = formatTemp(data.main.feels_like);
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    elements.pressure.textContent = `${data.main.pressure} hPa`;

    updateFavoriteButton();
    elements.currentWeather.classList.remove('hidden');
}

function renderForecast(data) {
    state.forecast = data;
    elements.forecastCards.innerHTML = '';

    const daily = data.list.filter(item => item.dt_txt.includes('12:00:00'));

    daily.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="day">${formatDate(item.dt)}</div>
            <img src="${getWeatherIconUrl(item.weather[0].icon)}" alt="${item.weather[0].description}">
            <div class="temp-range">
                <span class="temp-high">${formatTemp(item.main.temp_max)}</span>
                <span class="temp-low">${formatTemp(item.main.temp_min)}</span>
            </div>
            <p class="forecast-desc">${item.weather[0].description}</p>
        `;
        
        // Click card untuk buka modal detail
        card.addEventListener('click', () => showForecastModal(item));
        
        elements.forecastCards.appendChild(card);
    });

    elements.forecast.classList.remove('hidden');
}

// ============================================
// MODAL DETAIL FORECAST
// ============================================

function showForecastModal(forecastData) {
    elements.modalBody.innerHTML = `
        <h2 style="font-size: 2rem; font-weight: 800; margin-bottom: 1rem; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            Detail Prakiraan
        </h2>
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <img src="${getWeatherIconUrl(forecastData.weather[0].icon)}" 
                 alt="${forecastData.weather[0].description}" 
                 style="width: 120px; height: 120px;">
            <h3 style="font-size: 1.5rem; margin-top: 1rem;">${formatDate(forecastData.dt)}</h3>
            <p style="font-size: 1.2rem; color: var(--text-secondary); text-transform: capitalize;">
                ${forecastData.weather[0].description}
            </p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); text-align: center;">
                <i class="fas fa-temperature-high" style="font-size: 2rem; color: var(--accent-red);"></i>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">Suhu Maksimal</p>
                <p style="font-size: 1.5rem; font-weight: 800;">${formatTemp(forecastData.main.temp_max)}</p>
            </div>
            
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); text-align: center;">
                <i class="fas fa-temperature-low" style="font-size: 2rem; color: var(--accent-blue);"></i>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">Suhu Minimal</p>
                <p style="font-size: 1.5rem; font-weight: 800;">${formatTemp(forecastData.main.temp_min)}</p>
            </div>
            
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); text-align: center;">
                <i class="fas fa-droplet" style="font-size: 2rem; color: var(--accent-blue);"></i>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">Kelembapan</p>
                <p style="font-size: 1.5rem; font-weight: 800;">${forecastData.main.humidity}%</p>
            </div>
            
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); text-align: center;">
                <i class="fas fa-wind" style="font-size: 2rem; color: var(--accent-green);"></i>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">Kecepatan Angin</p>
                <p style="font-size: 1.5rem; font-weight: 800;">${Math.round(forecastData.wind.speed * 3.6)} km/h</p>
            </div>
            
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); text-align: center;">
                <i class="fas fa-compass" style="font-size: 2rem; color: var(--accent-purple);"></i>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">Tekanan</p>
                <p style="font-size: 1.5rem; font-weight: 800;">${forecastData.main.pressure} hPa</p>
            </div>
            
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); text-align: center;">
                <i class="fas fa-eye" style="font-size: 2rem; color: var(--accent-yellow);"></i>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">Jarak Pandang</p>
                <p style="font-size: 1.5rem; font-weight: 800;">${(forecastData.visibility / 1000).toFixed(1)} km</p>
            </div>
        </div>
    `;
    
    elements.forecastModal.classList.remove('hidden');
}

function closeForecastModal() {
    elements.forecastModal.classList.add('hidden');
}

// ============================================
// AUTOCOMPLETE
// ============================================

let autocompleteTimeout;

async function handleAutocomplete(query) {
    clearTimeout(autocompleteTimeout);
    
    if (query.length < 2) {
        elements.autocomplete.classList.add('hidden');
        return;
    }
    
    autocompleteTimeout = setTimeout(async () => {
        const cities = await fetchCitySuggestions(query);
        renderAutocomplete(cities);
    }, 300); // Debounce 300ms
}

function renderAutocomplete(cities) {
    if (cities.length === 0) {
        elements.autocomplete.classList.add('hidden');
        return;
    }
    
    elements.autocomplete.innerHTML = '';
    
    cities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            <i class="fas fa-map-marker-alt"></i>
            <span>${city.name}, ${city.country}</span>
        `;
        
        item.addEventListener('click', () => {
            elements.citySearch.value = city.name;
            elements.autocomplete.classList.add('hidden');
            searchCity(city.name);
        });
        
        elements.autocomplete.appendChild(item);
    });
    
    elements.autocomplete.classList.remove('hidden');
}

// ============================================
// FAVORITES
// ============================================

function isFavorite(cityName) {
    return state.favorites.some(fav => fav.name.toLowerCase() === cityName.toLowerCase());
}

function updateFavoriteButton() {
    if (!state.currentCity) return;

    if (isFavorite(state.currentCity)) {
        elements.favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        elements.favoriteBtn.classList.add('active');
    } else {
        elements.favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        elements.favoriteBtn.classList.remove('active');
    }
}

function toggleFavorite() {
    if (!state.currentWeather) return;

    const cityName = state.currentWeather.name;

    if (isFavorite(cityName)) {
        state.favorites = state.favorites.filter(fav => fav.name !== cityName);
        console.log(`❌ Removed ${cityName} from favorites`);
    } else {
        state.favorites.push({
            name: cityName,
            country: state.currentWeather.sys.country,
            temp: state.currentWeather.main.temp,
            icon: state.currentWeather.weather[0].icon,
            description: state.currentWeather.weather[0].description
        });
        console.log(`⭐ Added ${cityName} to favorites`);
    }

    updateFavoriteButton();
    savePreferences();
    renderFavorites();
}

function renderFavorites() {
    if (state.favorites.length === 0) {
        elements.favorites.classList.add('hidden');
        return;
    }

    elements.favoritesList.innerHTML = '';

    state.favorites.forEach(fav => {
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.innerHTML = `
            <img src="${getWeatherIconUrl(fav.icon)}" alt="${fav.description}" style="width: 60px; height: 60px;">
            <div>
                <div class="city">${fav.name}</div>
                <div class="country-text">${fav.country}</div>
                <div class="temp">${formatTemp(fav.temp)}</div>
            </div>
            <button class="favorite-remove" aria-label="Hapus dari favorit">
                <i class="fas fa-times"></i>
            </button>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-remove')) {
                searchCity(fav.name);
            }
        });

        const removeBtn = item.querySelector('.favorite-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.favorites = state.favorites.filter(f => f.name !== fav.name);
            savePreferences();
            renderFavorites();
        });

        elements.favoritesList.appendChild(item);
    });

    elements.favorites.classList.remove('hidden');
}

// ============================================
// SEARCH HISTORY
// ============================================

function addToSearchHistory(cityName) {
    if (state.searchHistory.includes(cityName)) {
        state.searchHistory = state.searchHistory.filter(city => city !== cityName);
    }

    state.searchHistory.unshift(cityName);

    if (state.searchHistory.length > 5) {
        state.searchHistory = state.searchHistory.slice(0, 5);
    }

    savePreferences();
    renderSearchHistory();
}

function clearSearchHistory() {
    state.searchHistory = [];
    savePreferences();
    renderSearchHistory();
}

function renderSearchHistory() {
    if (state.searchHistory.length === 0) {
        elements.searchHistory.classList.add('hidden');
        return;
    }

    elements.searchHistory.innerHTML = '';

    state.searchHistory.forEach(city => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <i class="fas fa-clock"></i>
            <span>${city}</span>
        `;

        item.addEventListener('click', () => {
            searchCity(city);
        });

        elements.searchHistory.appendChild(item);
    });
    
    // Tambah tombol clear history
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-history-btn';
    clearBtn.innerHTML = '<i class="fas fa-trash"></i> Hapus Riwayat';
    clearBtn.addEventListener('click', clearSearchHistory);
    elements.searchHistory.appendChild(clearBtn);

    elements.searchHistory.classList.remove('hidden');
}

// ============================================
// GEOLOCATION
// ============================================

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation tidak didukung oleh browser ini.'));
            return;
        }

        showLoading();
        navigator.geolocation.getCurrentPosition(
            position => resolve(position.coords),
            error => {
                let message = 'Gagal mendapatkan lokasi.';
                if (error.code === error.PERMISSION_DENIED) {
                    message = 'Izin lokasi ditolak. Silakan aktifkan di pengaturan browser.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    message = 'Informasi lokasi tidak tersedia.';
                } else if (error.code === error.TIMEOUT) {
                    message = 'Permintaan lokasi timeout.';
                }
                reject(new Error(message));
            }
        );
    });
}

async function loadWeatherByLocation() {
    try {
        const coords = await getUserLocation();
        const weatherData = await fetchWeatherByCoords(coords.latitude, coords.longitude);
        renderCurrentWeather(weatherData);

        const forecastData = await fetchForecastByCoords(coords.latitude, coords.longitude);
        renderForecast(forecastData);

        saveToCache(weatherData.name, { weather: weatherData, forecast: forecastData });

        hideLoading();
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

// ============================================
// SEARCH FUNCTION
// ============================================

async function searchCity(cityName) {
    if (!cityName) return;

    state.currentCity = cityName;
    showLoading();
    hideError();

    try {
        const cachedData = getFromCache(cityName);
        if (cachedData) {
            renderCurrentWeather(cachedData.weather);
            renderForecast(cachedData.forecast);
            hideLoading();
            addToSearchHistory(cityName);
            return;
        }

        const weatherData = await fetchWeatherByCity(cityName);
        renderCurrentWeather(weatherData);

        const forecastData = await fetchForecast(cityName);
        renderForecast(forecastData);

        saveToCache(cityName, { weather: weatherData, forecast: forecastData });
        addToSearchHistory(cityName);

        hideLoading();
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

// ============================================
// TOGGLE FUNCTIONS
// ============================================

function toggleUnit() {
    if (state.unit === 'celsius') {
        state.unit = 'fahrenheit';
        CONFIG.UNITS = 'imperial';
        elements.unitToggle.textContent = '°F';
    } else {
        state.unit = 'celsius';
        CONFIG.UNITS = 'metric';
        elements.unitToggle.textContent = '°C';
    }

    savePreferences();

    if (state.currentWeather) {
        renderCurrentWeather(state.currentWeather);
    }
    if (state.forecast) {
        renderForecast(state.forecast);
    }
    if (state.favorites.length > 0) {
        renderFavorites();
    }
}

function toggleTheme() {
    if (state.theme === 'light') {
        state.theme = 'dark';
        document.body.classList.add('dark-mode');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        state.theme = 'light';
        document.body.classList.remove('dark-mode');
        elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }

    savePreferences();
}

// ============================================
// EVENT LISTENERS
// ============================================

elements.searchBtn.addEventListener('click', () => {
    const city = elements.citySearch.value.trim();
    if (city) {
        searchCity(city);
        elements.citySearch.value = '';
        elements.autocomplete.classList.add('hidden');
    }
});

elements.citySearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = elements.citySearch.value.trim();
        if (city) {
            searchCity(city);
            elements.citySearch.value = '';
            elements.autocomplete.classList.add('hidden');
        }
    }
});

// Autocomplete saat ketik
elements.citySearch.addEventListener('input', (e) => {
    handleAutocomplete(e.target.value.trim());
});

// Tutup autocomplete saat klik di luar
document.addEventListener('click', (e) => {
    if (!elements.citySearch.contains(e.target) && !elements.autocomplete.contains(e.target)) {
        elements.autocomplete.classList.add('hidden');
    }
});

elements.locationBtn.addEventListener('click', loadWeatherByLocation);
elements.unitToggle.addEventListener('click', toggleUnit);
elements.themeToggle.addEventListener('click', toggleTheme);
elements.favoriteBtn.addEventListener('click', toggleFavorite);

// Modal close
const modalCloseBtn = document.querySelector('.modal-close');
if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeForecastModal);
}

elements.forecastModal.addEventListener('click', (e) => {
    if (e.target === elements.forecastModal) {
        closeForecastModal();
    }
});

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    console.log('🚀 Weather Dashboard Initialized');
    loadPreferences();
    
    console.log('📦 Loaded from localStorage:');
    console.log('- Unit:', state.unit);
    console.log('- Theme:', state.theme);
    console.log('- Favorites:', state.favorites.length);
    console.log('- Search History:', state.searchHistory.length);
}

document.addEventListener('DOMContentLoaded', init);

// ============================================
// DEBUG HELPER
// ============================================

window.weatherApp = {
    state,
    elements,
    searchCity,
    loadWeatherByLocation,
    toggleUnit,
    toggleTheme,
    toggleFavorite,
    clearSearchHistory,
    clearCache: () => {
        state.cache = {};
        saveToLocalStorage('weatherApp_cache', {});
        console.log('🗑️ Cache cleared');
    },
    clearAll: () => {
        localStorage.clear();
        console.log('🗑️ All data cleared');
        location.reload();
    }
};