// --- 1. KONFIGURASI GLOBAL & UTILITY ---
const API_KEY = '2d11095f638de252c15674cf00373bdc'; 
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// State Global
let CURRENT_UNIT = localStorage.getItem('unit') || 'metric';
let IS_DARK_MODE = localStorage.getItem('theme') === 'dark-theme';
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
let searchHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];
let lastCurrentWeatherCache = null; // Cache data untuk offline viewing (FR-4)

// DOM Elements 
const elements = {
    appContainer: document.getElementById('app-container'),
    themeToggle: document.getElementById('theme-toggle'),
    unitToggle: document.getElementById('unit-toggle'),
    currentUnitDisplay: document.getElementById('current-unit'),
    loadingSpinner: document.getElementById('loading-spinner'),
    errorMessage: document.getElementById('error-message'),
    searchForm: document.getElementById('search-form'),
    cityInput: document.getElementById('city-input'),
    currentWeatherSection: document.getElementById('current-weather-section'),
    forecastContainer: document.getElementById('forecast-container'),
    searchHistoryDiv: document.getElementById('search-history'),
    favoritesList: document.getElementById('favorites-list'),
    favoriteBtn: document.getElementById('favorite-btn'),
};

// --- UTILITY FUNCTIONS ---
const convertTemperature = (tempK, targetUnit) => {
    const C = tempK - 273.15;
    if (targetUnit === 'metric') return Math.round(C);
    if (targetUnit === 'imperial') return Math.round(C * 9/5 + 32);
    return Math.round(C); 
};

const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const toggleLoading = (show) => {
    elements.loadingSpinner.classList.toggle('hidden', !show);
    elements.errorMessage.classList.add('hidden');
    
    // PERBAIKAN LOKASI: Reset lokasi saat loading untuk menghindari tampilkan data lama/cache
    document.getElementById('location-name').textContent = 'Memuat Lokasi...';

    if (show) {
        elements.currentWeatherSection.classList.add('hidden');
        document.getElementById('forecast-section').classList.add('hidden');
    }
};

const displayError = (message) => {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    toggleLoading(false);
    elements.currentWeatherSection.classList.add('hidden');
    document.getElementById('forecast-section').classList.add('hidden');
};

// --- 2. DATA PERSISTENCE & STATE MANAGEMENT (FR-4) ---

const loadPreferences = () => {
    IS_DARK_MODE = localStorage.getItem('theme') === 'dark-theme';
    elements.appContainer.classList.toggle('dark-theme', IS_DARK_MODE);
    elements.themeToggle.innerHTML = IS_DARK_MODE ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    
    CURRENT_UNIT = localStorage.getItem('unit') || 'metric';
    elements.currentUnitDisplay.textContent = CURRENT_UNIT === 'metric' ? '°C' : '°F';
};

const savePreferences = () => {
    localStorage.setItem('unit', CURRENT_UNIT);
    localStorage.setItem('theme', IS_DARK_MODE ? 'dark-theme' : 'light-theme');
};

const saveSearchHistory = (city) => {
    searchHistory = searchHistory.filter(c => c !== city);
    searchHistory.unshift(city);
    searchHistory = searchHistory.slice(0, 5); 
    localStorage.setItem('weatherHistory', JSON.stringify(searchHistory));
    renderSearchHistory();
};

const saveFavorite = (city, lat, lon) => {
    const existing = favorites.find(fav => fav.name === city);
    if (!existing) {
        favorites.push({ name: city, lat, lon });
    } else {
        favorites = favorites.filter(fav => fav.name !== city);
    }
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    renderFavorites();
};

// --- 3. API CALLS (FR-1, FR-3) ---
const fetchWeather = async (endpoint, params) => {
    const url = `${BASE_URL}/${endpoint}?${params}&appid=${API_KEY}`;
    
    // Caching logic
    if (endpoint === 'weather' && lastCurrentWeatherCache && lastCurrentWeatherCache.timestamp > (Date.now() - 300000)) {
         console.log('Menggunakan data dari cache.');
         return lastCurrentWeatherCache.data;
    }

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Kode status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (endpoint === 'weather') {
            lastCurrentWeatherCache = { data, timestamp: Date.now() };
        }
        
        return data;
    } catch (error) {
        console.error("API Fetch Error:", error.message);
        if (endpoint === 'weather' && lastCurrentWeatherCache) {
             console.log('API gagal, memuat dari cache.');
             return lastCurrentWeatherCache.data;
        }
        displayError(`Gagal mengambil data cuaca: ${error.message}`);
        return null;
    }
};

const fetchAllData = async (queryCity = null, lat = null, lon = null) => {
    // PERBAIKAN LOKASI: Kosongkan cache saat memulai pencarian berdasarkan kota baru
    if (queryCity) {
        lastCurrentWeatherCache = null; 
    }
    
    toggleLoading(true);

    let weatherData, forecastData;
    let params;

    if (queryCity) {
        params = `q=${queryCity}&units=standard`; 
    } else if (lat && lon) {
        params = `lat=${lat}&lon=${lon}&units=standard`;
    } else {
        toggleLoading(false);
        return displayError("Gagal mendapatkan lokasi atau query.");
    }
    
    weatherData = await fetchWeather('weather', params);
    
    if (weatherData) {
        const forecastParams = `lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&units=standard`;
        forecastData = await fetchWeather('forecast', forecastParams);

        if (forecastData) {
            renderAllData(weatherData, forecastData);
            saveSearchHistory(weatherData.name);
        }
    }
    toggleLoading(false);
};


// --- 4. RENDER KE DOM (FR-1, FR-3, FR-4) ---
const renderAllData = (currentData, forecastData) => {
    renderCurrentWeather(currentData);
    renderForecast(forecastData);
    
    elements.currentWeatherSection.classList.remove('hidden');
    document.getElementById('forecast-section').classList.remove('hidden');
};

const renderCurrentWeather = (data) => {
    const temp = convertTemperature(data.main.temp, CURRENT_UNIT);
    const feelsLike = convertTemperature(data.main.feels_like, CURRENT_UNIT);
    const unitSymbol = CURRENT_UNIT === 'metric' ? '°C' : '°F';
    const isFavorite = favorites.some(fav => fav.name === data.name);
    
    document.getElementById('location-name').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('current-temp').textContent = `${temp}${unitSymbol}`;
    document.getElementById('weather-condition').textContent = data.weather[0].description;
    document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    
    document.getElementById('feels-like').textContent = `${feelsLike}${unitSymbol}`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind-speed').textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`; 
    
    document.getElementById('sunrise').textContent = formatTime(data.sys.sunrise);
    document.getElementById('sunset').textContent = formatTime(data.sys.sunset);

    elements.favoriteBtn.innerHTML = isFavorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    elements.favoriteBtn.onclick = () => {
        saveFavorite(data.name, data.coord.lat, data.coord.lon);
        renderCurrentWeather(data);
    };
};

const renderForecast = (data) => {
    elements.forecastContainer.innerHTML = '';
    
    const dailyForecasts = {};
    const today = new Date().toLocaleDateString('en-CA');

    data.list.forEach(item => {
        const dateKey = item.dt_txt.split(' ')[0];
        
        if (dateKey === today) return;

        if (!dailyForecasts[dateKey]) {
            dailyForecasts[dateKey] = { temps: [], date: new Date(item.dt * 1000), icon: item.weather[0].icon, condition: item.weather[0].description };
        }
        dailyForecasts[dateKey].temps.push(item.main.temp_min, item.main.temp_max);
    });

    let count = 0;
    const unitSymbol = CURRENT_UNIT === 'metric' ? '°C' : '°F';
    
    for (const dateKey in dailyForecasts) {
        if (count >= 5) break; 
        
        const dailyData = dailyForecasts[dateKey];
        const minK = Math.min(...dailyData.temps);
        const maxK = Math.max(...dailyData.temps);
        
        const tempLow = convertTemperature(minK, CURRENT_UNIT);
        const tempHigh = convertTemperature(maxK, CURRENT_UNIT);
        
        const dayName = dailyData.date.toLocaleDateString('id-ID', { weekday: 'short' });
        
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <h3>${dayName}</h3>
            <img src="https://openweathermap.org/img/wn/${dailyData.icon}@2x.png" alt="${dailyData.condition}">
            <p class="temp-high">High: ${tempHigh}${unitSymbol}</p>
            <p class="temp-low">Low: ${tempLow}${unitSymbol}</p>
        `;
        card.onclick = () => console.log(`Detail untuk ${dayName}:`, dailyData);
        
        elements.forecastContainer.appendChild(card);
        count++;
    }
};

const renderSearchHistory = () => {
    elements.searchHistoryDiv.innerHTML = '<h4>Pencarian Terbaru:</h4><div class="tags-container" id="history-tags"></div>';
    const historyTags = document.getElementById('history-tags');

    if (searchHistory.length === 0) {
        historyTags.innerHTML = '<p style="font-size:0.9em; margin-top:5px;">Belum ada riwayat.</p>';
        return;
    }
    
    searchHistory.forEach(city => {
        const button = document.createElement('button');
        button.className = 'city-tag';
        button.textContent = city;
        button.addEventListener('click', () => fetchAllData(city));
        historyTags.appendChild(button);
    });
};

const renderFavorites = () => {
    elements.favoritesList.innerHTML = '';
    
    if (favorites.length === 0) {
        elements.favoritesList.innerHTML = '<p style="font-size:0.9em;">Tambahkan lokasi favorit Anda di sini!</p>';
        return;
    }
    
    favorites.forEach(fav => {
        const button = document.createElement('button');
        button.className = 'city-tag favorite-tag';
        button.textContent = fav.name;
        button.addEventListener('click', () => fetchAllData(null, fav.lat, fav.lon)); 
        elements.favoritesList.appendChild(button);
    });
};


// --- 5. EVENT HANDLERS & INITIALIZATION (FR-5) ---

const toggleTheme = () => {
    IS_DARK_MODE = !IS_DARK_MODE;
    elements.appContainer.classList.toggle('dark-theme', IS_DARK_MODE);
    elements.themeToggle.innerHTML = IS_DARK_MODE ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    savePreferences();
};

const toggleUnit = () => {
    CURRENT_UNIT = CURRENT_UNIT === 'metric' ? 'imperial' : 'metric';
    elements.currentUnitDisplay.textContent = CURRENT_UNIT === 'metric' ? '°C' : '°F';
    savePreferences();
    
    const lastCity = document.getElementById('location-name').textContent.split(',')[0].trim();
    if (lastCity && lastCity !== 'Memuat Lokasi...') {
        fetchAllData(lastCity);
    } else {
        displayError("Unit diubah. Silakan cari atau muat ulang lokasi.");
    }
};

const initializeApp = () => {
    loadPreferences();
    renderSearchHistory();
    renderFavorites();
    
    // FR-1: Ambil lokasi pengguna
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchAllData(null, latitude, longitude);
            },
            (error) => {
                console.error("Geolocation Gagal:", error);
                displayError("Gagal mendapatkan lokasi. Memuat data default (London).");
                fetchAllData('London'); 
            }
        );
    } else {
        displayError("Geolocation tidak didukung. Memuat data default (London).");
        fetchAllData('London');
    }
};

// Event Listeners Utama
elements.themeToggle.addEventListener('click', toggleTheme);
elements.unitToggle.addEventListener('click', toggleUnit);

elements.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = elements.cityInput.value.trim();
    if (city) {
        fetchAllData(city);
        elements.cityInput.value = '';
    }
});

// Jalankan Aplikasi saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', initializeApp);