// Configuration
const API_KEY = '3798fc1b4cb7e48638d95c5fe4fc0f1f'; 
const API_BASE = 'https://api.openweathermap.org/data/2.5';

// State management
const state = {
    unit: 'metric',
    theme: 'light',
    currentLocation: null,
    favorites: [],
    searchHistory: []
};

// DOM Elements
const elements = {
    mainWeather: document.getElementById('mainWeather'),
    forecastContainer: document.getElementById('forecastContainer'),
    forecastGrid: document.getElementById('forecastGrid'),
    favoritesGrid: document.getElementById('favoritesGrid'),
    citySearch: document.getElementById('citySearch'),
    searchBtn: document.getElementById('searchBtn'),
    suggestions: document.getElementById('suggestions'),
    locationBtn: document.getElementById('locationBtn'),
    unitToggle: document.getElementById('unitToggle'),
    themeToggle: document.getElementById('themeToggle'),
    addFavorite: document.getElementById('addFavorite'),
    messageContainer: document.getElementById('messageContainer'),
    unitLabel: document.getElementById('unitLabel'),
    body: document.body
};

// --- Utility Functions ---

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getWeatherIcon(iconCode) {
    const map = {
        '01d': 'fas fa-sun',
        '01n': 'fas fa-moon',
        '02d': 'fas fa-cloud-sun',
        '02n': 'fas fa-cloud-moon',
        '03d': 'fas fa-cloud',
        '03n': 'fas fa-cloud',
        '04d': 'fas fa-cloud-meatball',
        '04n': 'fas fa-cloud-meatball',
        '09d': 'fas fa-cloud-showers-heavy',
        '09n': 'fas fa-cloud-showers-heavy',
        '10d': 'fas fa-cloud-sun-rain',
        '10n': 'fas fa-cloud-moon-rain',
        '11d': 'fas fa-bolt',
        '11n': 'fas fa-bolt',
        '13d': 'fas fa-snowflake',
        '13n': 'fas fa-snowflake',
        '50d': 'fas fa-smog',
        '50n': 'fas fa-smog',
    };
    return map[iconCode] || 'fas fa-question';
}

function unixToTime(timestamp, offset) {
    const date = new Date((timestamp + offset) * 1000);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
}

// --- State Management ---

function loadState() {
    try {
        const savedFavorites = localStorage.getItem('weatherProFavorites');
        const savedHistory = localStorage.getItem('weatherProHistory');
        const savedUnit = localStorage.getItem('weatherProUnit');
        const savedTheme = localStorage.getItem('weatherProTheme');

        if (savedFavorites) state.favorites = JSON.parse(savedFavorites);
        if (savedHistory) state.searchHistory = JSON.parse(savedHistory);
        if (savedUnit) state.unit = savedUnit;
        if (savedTheme) state.theme = savedTheme;
    } catch (e) {
        console.error("Error loading state from localStorage", e);
    }
}

function saveState() {
    try {
        localStorage.setItem('weatherProFavorites', JSON.stringify(state.favorites));
        localStorage.setItem('weatherProHistory', JSON.stringify(state.searchHistory));
        localStorage.setItem('weatherProUnit', state.unit);
        localStorage.setItem('weatherProTheme', state.theme);
    } catch (e) {
        console.error("Error saving state to localStorage", e);
    }
}

function renderUIState() {
    elements.body.setAttribute('data-theme', state.theme);
    elements.themeToggle.querySelector('i').className = state.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    elements.unitLabel.textContent = state.unit === 'metric' ? '°C' : '°F';
    renderFavorites();
}

// --- UI Rendering ---

function showLoading() {
    elements.mainWeather.innerHTML = `
        <div class="loading">
            <div class="spinner" role="status" aria-label="Memuat data cuaca"></div>
        </div>
    `;
    elements.forecastContainer.classList.add('hidden');
}

function showMessage(message, type = 'success', duration = 3000) {
    elements.messageContainer.innerHTML = ''; 
    const messageDiv = document.createElement('div');
    
    const isApiKeyWarning = message.includes('Kunci API') && message.includes('placeholder');
    const actualDuration = (type === 'error' || isApiKeyWarning) ? 6000 : duration;

    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.innerHTML = `<i class="fas fa-info-circle" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`;
    
    elements.messageContainer.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv.parentNode === elements.messageContainer) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(-20px)';
            messageDiv.addEventListener('transitionend', () => messageDiv.remove());
        }
    }, actualDuration);
}

function displayWeather(data) {
    const unitSymbol = state.unit === 'metric' ? '°C' : '°F';
    const speedUnit = state.unit === 'metric' ? 'm/s' : 'mph';
    const weatherIcon = getWeatherIcon(data.weather[0].icon);
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const timeStr = unixToTime(data.dt, data.timezone);
    const sunriseStr = unixToTime(data.sys.sunrise, data.timezone);
    const sunsetStr = unixToTime(data.sys.sunset, data.timezone);

    elements.mainWeather.innerHTML = `
        <div class="weather-main-content">
            <div class="location-info">
                <h2>${escapeHtml(data.name)}, ${escapeHtml(data.sys.country)}</h2>
                <p>
                    <i class="fas fa-calendar" aria-hidden="true"></i>
                    ${dateStr}
                </p>
                <p>
                    <i class="fas fa-clock" aria-hidden="true"></i>
                    Pembaruan: ${timeStr}
                </p>
                <div class="weather-details">
                    <div class="detail-item">
                        <i class="fas fa-wind" aria-hidden="true"></i>
                        <div class="detail-label">Angin</div>
                        <div class="detail-value">${Math.round(data.wind.speed)}${speedUnit}</div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-tint" aria-hidden="true"></i>
                        <div class="detail-label">Kelembaban</div>
                        <div class="detail-value">${data.main.humidity}%</div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-tachometer-alt" aria-hidden="true"></i>
                        <div class="detail-label">Tekanan</div>
                        <div class="detail-value">${data.main.pressure} hPa</div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-eye" aria-hidden="true"></i>
                        <div class="detail-label">Jarak Pandang</div>
                        <div class="detail-value">${(data.visibility / 1000).toFixed(1)} km</div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-sun" aria-hidden="true"></i>
                        <div class="detail-label">Matahari Terbit</div>
                        <div class="detail-value">${sunriseStr}</div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-moon" aria-hidden="true"></i>
                        <div class="detail-label">Matahari Terbenam</div>
                        <div class="detail-value">${sunsetStr}</div>
                    </div>
                </div>
            </div>
            <div class="temp-display">
                <i class="${weatherIcon} weather-icon" aria-hidden="true"></i>
                <div class="temperature">${Math.round(data.main.temp)}${unitSymbol}</div>
                <div class="weather-description">${escapeHtml(data.weather[0].description)}</div>
                <p class="mt-2">Feels like: ${Math.round(data.main.feels_like)}${unitSymbol}</p>
            </div>
        </div>
    `;
}

function displayForecast(data) {
    const unitSymbol = state.unit === 'metric' ? '°C' : '°F';
    const timezoneOffset = data.city.timezone;
    
    const now = new Date();
    const today = new Date(now.getTime() + timezoneOffset * 1000).toLocaleDateString('id-ID', { timeZone: 'UTC' });

    const dailyForecastMap = new Map();

    data.list.forEach(item => {
        const date = new Date((item.dt + timezoneOffset) * 1000);
        const dateStr = date.toLocaleDateString('id-ID', { timeZone: 'UTC' });
        
        // Ambil data pertama dari hari berikutnya untuk prakiraan 5 hari.
        if (dateStr !== today && dailyForecastMap.size < 5 && !dailyForecastMap.has(dateStr)) {
            dailyForecastMap.set(dateStr, item);
        }
    });

    const dailyForecasts = Array.from(dailyForecastMap.values()).slice(0, 5);

    elements.forecastGrid.innerHTML = dailyForecasts.map(item => {
        const date = new Date((item.dt + timezoneOffset) * 1000);
        const day = date.toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'UTC' });
        const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        const weatherIcon = getWeatherIcon(item.weather[0].icon);

        return `
            <div class="forecast-card">
                <div>
                    <div class="forecast-day">${day}</div>
                    <div class="forecast-date">${dateStr}</div>
                </div>
                <i class="${weatherIcon} forecast-icon" aria-hidden="true"></i>
                <div class="forecast-desc">${escapeHtml(item.weather[0].description)}</div>
                <div class="forecast-temps">
                    <div class="forecast-high">${Math.round(item.main.temp_max)}${unitSymbol}</div>
                    <div class="forecast-low">${Math.round(item.main.temp_min)}${unitSymbol}</div>
                </div>
            </div>
        `;
    }).join('');

    elements.forecastContainer.classList.remove('hidden');
}

function renderFavorites() {
    elements.favoritesGrid.innerHTML = '';
    
    if (state.favorites.length === 0) {
        elements.favoritesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart" aria-hidden="true"></i>
                <p>Belum ada lokasi favorit. Tambahkan lokasi favorit Anda!</p>
            </div>
        `;
        return;
    }

    state.favorites.forEach((fav) => {
        const card = document.createElement('div');
        card.className = 'favorite-card';
        card.setAttribute('tabindex', '0');
        
        card.dataset.lat = fav.lat;
        card.dataset.lon = fav.lon;
        
        card.innerHTML = `
            <h4>${escapeHtml(fav.name)}</h4>
            <p>${escapeHtml(fav.country)}</p>
            <button class="remove-favorite" data-lat="${fav.lat}" data-lon="${fav.lon}" aria-label="Hapus ${escapeHtml(fav.name)} dari favorit">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-favorite')) {
                const lat = parseFloat(card.dataset.lat);
                const lon = parseFloat(card.dataset.lon);
                getWeatherByCoords(lat, lon);
            }
        });

        card.querySelector('.remove-favorite').addEventListener('click', (e) => {
            e.stopPropagation(); 
            const lat = parseFloat(e.currentTarget.dataset.lat);
            const lon = parseFloat(e.currentTarget.dataset.lon);
            removeFromFavorites(lat, lon);
        });

        elements.favoritesGrid.appendChild(card);
    });
}

// --- API and Core Logic ---

async function fetchWeatherData(url) {
    if (API_KEY === 'YOUR_ACTUAL_API_KEY_HERE' || !API_KEY) {
        throw new Error('Kesalahan Konfigurasi: Silakan ganti "YOUR_ACTUAL_API_KEY_HERE" di script.js dengan Kunci API Anda.');
    }

    const response = await fetch(url);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Kota tidak ditemukan.');
        } else if (response.status === 401) {
            throw new Error('Otorisasi Gagal: API key tidak valid. Silakan periksa API_KEY Anda.');
        } else {
            throw new Error(`Gagal mengambil data cuaca. Status: ${response.status}`);
        }
    }
    
    return await response.json();
}

async function getWeatherByCoords(lat, lon) {
    try {
        showLoading();
        
        const [weatherData, forecastData] = await Promise.all([
            fetchWeatherData(`${API_BASE}/weather?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}&lang=id`),
            fetchWeatherData(`${API_BASE}/forecast?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}&lang=id`)
        ]);

        state.currentLocation = {
            name: weatherData.name,
            country: weatherData.sys.country,
            lat: lat,
            lon: lon
        };

        displayWeather(weatherData);
        displayForecast(forecastData);
        elements.citySearch.value = weatherData.name; 
    } catch (error) {
        console.error('Weather fetch error:', error);
        showMessage('Gagal mengambil data cuaca: ' + error.message, 'error');
        elements.mainWeather.innerHTML = `<div class="empty-state">
            <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
            <p>${escapeHtml(error.message)}</p>
        </div>`;
        elements.forecastContainer.classList.add('hidden');
    }
}

async function getWeatherByCity(city) {
    try {
        showLoading();
        
        const weatherData = await fetchWeatherData(
            `${API_BASE}/weather?q=${encodeURIComponent(city)}&units=${state.unit}&appid=${API_KEY}&lang=id`
        );

        const { lat, lon } = weatherData.coord;
        const forecastData = await fetchWeatherData(
            `${API_BASE}/forecast?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}&lang=id`
        );

        state.currentLocation = {
            name: weatherData.name,
            country: weatherData.sys.country,
            lat: lat,
            lon: lon
        };

        displayWeather(weatherData);
        displayForecast(forecastData);
        addToSearchHistory(weatherData.name); 
    } catch (error) {
        console.error('Weather fetch error:', error);
        showMessage('Gagal mengambil data cuaca: ' + error.message, 'error');
        elements.mainWeather.innerHTML = `<div class="empty-state">
            <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
            <p>${escapeHtml(error.message)}</p>
        </div>`;
        elements.forecastContainer.classList.add('hidden');
    }
}

// --- Event Handlers ---

function handleSearch() {
    const city = elements.citySearch.value.trim();
    if (city) {
        getWeatherByCity(city);
        elements.suggestions.classList.remove('active');
    }
}

function handleSearchInput(e) {
    const value = e.target.value.trim();

    if (value.length < 2) {
        elements.suggestions.classList.remove('active');
        return;
    }

    const matches = state.searchHistory
        .filter(item => item.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);

    if (matches.length > 0) {
        elements.suggestions.innerHTML = matches.map(city => `
            <div class="suggestion-item" role="option" tabindex="0" data-city="${escapeHtml(city)}">
                <i class="fas fa-history" style="margin-right: 8px;" aria-hidden="true"></i> ${escapeHtml(city)}
            </div>
        `).join('');
        
        elements.suggestions.classList.add('active');

        elements.suggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const city = item.dataset.city;
                elements.citySearch.value = city;
                getWeatherByCity(city);
                elements.suggestions.classList.remove('active');
            });
        });
    } else {
        elements.suggestions.classList.remove('active');
    }
}

function addToSearchHistory(city) {
    city = city.trim();
    if (!city) return;
    
    const index = state.searchHistory.findIndex(item => item.toLowerCase() === city.toLowerCase());
    
    if (index > -1) {
        state.searchHistory.splice(index, 1);
    }
    
    state.searchHistory.unshift(city);
    
    state.searchHistory = state.searchHistory.slice(0, 10);
    saveState();
}

/**
 * Fungsi getUserLocation hanya memuat Jakarta sebagai default.
 * Notifikasi telah dihapus.
 */
function getUserLocation() {
    // Memuat default kota (Jakarta)
    getWeatherByCity('Jakarta');
    // Baris di bawah ini yang menyebabkan pop-up notifikasi, kini telah dihapus:
    // showMessage('Memuat cuaca Jakarta. Fitur geolokasi dinonaktifkan untuk menghindari error izin.', 'success', 3500);
}

function toggleUnit() {
    state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
    renderUIState();
    saveState();
    if (state.currentLocation) {
        getWeatherByCoords(state.currentLocation.lat, state.currentLocation.lon);
    }
    showMessage(`Satuan suhu diubah ke ${state.unit === 'metric' ? 'Celcius' : 'Fahrenheit'}`, 'success', 2000);
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    renderUIState();
    saveState();
    showMessage(`Tema diubah ke mode ${state.theme === 'dark' ? 'gelap' : 'terang'}`, 'success', 2000);
}

function addToFavorites() {
    if (!state.currentLocation) {
        showMessage('Tidak ada lokasi saat ini yang dimuat.', 'error');
        return;
    }

    const { name, country, lat, lon } = state.currentLocation;
    
    const isDuplicate = state.favorites.some(fav => fav.lat === lat && fav.lon === lon);
    
    if (isDuplicate) {
        showMessage(`${name} sudah ada di favorit!`, 'warning');
        return;
    }

    state.favorites.push({ name, country, lat, lon });
    saveState();
    renderFavorites(); 
    showMessage(`${name} ditambahkan ke favorit!`, 'success');
}

function removeFromFavorites(lat, lon) {
    const initialLength = state.favorites.length;
    state.favorites = state.favorites.filter(fav => !(fav.lat === lat && fav.lon === lon));
    
    if (state.favorites.length < initialLength) {
        saveState();
        renderFavorites();
        showMessage(`Lokasi dihapus dari favorit.`, 'success');
    }
}

// --- Initialization ---

function init() {
    loadState();
    renderUIState(); 
    initEventListeners();
    
    // Panggil getUserLocation() yang sekarang hanya memuat Jakarta tanpa notifikasi.
    getUserLocation(); 
}

// Event Listeners
function initEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.citySearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.citySearch.addEventListener('input', handleSearchInput);
    
    // locationBtn tetap memanggil getUserLocation() yang memuat Jakarta
    elements.locationBtn.addEventListener('click', getUserLocation);
    
    elements.unitToggle.addEventListener('click', toggleUnit);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.addFavorite.addEventListener('click', addToFavorites);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            elements.suggestions.classList.remove('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', init);