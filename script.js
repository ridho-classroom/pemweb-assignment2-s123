// ===== KONFIGURASI API =====
const API_KEY = 'f55bb225e45b04b1735b2acd70606ffa';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// ===== STATE MANAGEMENT =====
let currentUnit = 'celsius'; // celsius atau fahrenheit
let currentWeatherData = null;
let forecastData = null;

// ===== ELEMEN DOM =====
const elements = {
    // Controls
    themeToggle: document.getElementById('theme-toggle'),
    unitToggle: document.getElementById('unit-toggle'),
    
    // Search
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    searchHistory: document.getElementById('search-history'),
    errorMessage: document.getElementById('error-message'),
    
    // Location
    locationBtn: document.getElementById('location-btn'),
    
    // Loading
    loading: document.getElementById('loading'),
    
    // Current Weather
    currentWeather: document.getElementById('current-weather'),
    cityName: document.getElementById('city-name'),
    currentDate: document.getElementById('current-date'),
    weatherIcon: document.getElementById('weather-icon'),
    temperature: document.getElementById('temperature'),
    weatherDescription: document.getElementById('weather-description'),
    feelsLike: document.getElementById('feels-like'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('wind-speed'),
    
    // Forecast
    forecastSection: document.getElementById('forecast-section'),
    forecastContainer: document.getElementById('forecast-container')
};

// ===== INISIALISASI =====
function init() {
    // Load tema dari localStorage
    loadTheme();
    
    // Load search history
    displaySearchHistory();
    
    // Event listeners
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.unitToggle.addEventListener('click', toggleUnit);
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.locationBtn.addEventListener('click', getCurrentLocation);
    
    // Minta lokasi pengguna saat halaman dimuat
    getCurrentLocation();
}

// ===== THEME MANAGEMENT =====
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = elements.themeToggle.querySelector('.toggle-icon');
    icon.textContent = theme === 'light' ? '🌙' : '☀️';
}

// ===== UNIT MANAGEMENT =====
function toggleUnit() {
    currentUnit = currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
    
    const text = elements.unitToggle.querySelector('.toggle-text');
    text.textContent = currentUnit === 'celsius' ? '°F' : '°C';
    
    // Update tampilan dengan unit baru
    if (currentWeatherData) {
        displayCurrentWeather(currentWeatherData);
    }
    if (forecastData) {
        displayForecast(forecastData);
    }
}

// ===== KONVERSI TEMPERATUR =====
function convertTemp(kelvin) {
    if (currentUnit === 'celsius') {
        return Math.round(kelvin - 273.15);
    } else {
        return Math.round((kelvin - 273.15) * 9/5 + 32);
    }
}

function getTempUnit() {
    return currentUnit === 'celsius' ? '°C' : '°F';
}

// ===== GEOLOCATION =====
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolokasi tidak didukung oleh browser Anda');
        return;
    }
    
    showLoading();
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
            hideLoading();
            console.error('Geolocation error:', error);
            showError('Tidak dapat mengakses lokasi Anda. Silakan cari kota secara manual.');
        }
    );
}

// ===== API CALLS =====
async function fetchWeatherByCity(city) {
    try {
        showLoading();
        hideError();
        
        // Fetch current weather
        const currentResponse = await fetch(
            `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}`
        );
        
        if (!currentResponse.ok) {
            if (currentResponse.status === 404) {
                throw new Error('Kota tidak ditemukan');
            }
            throw new Error('Gagal mengambil data cuaca');
        }
        
        const currentData = await currentResponse.json();
        currentWeatherData = currentData;
        displayCurrentWeather(currentData);
        
        // Fetch forecast
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}`
        );
        
        if (forecastResponse.ok) {
            const forecastDataRaw = await forecastResponse.json();
            forecastData = forecastDataRaw;
            displayForecast(forecastDataRaw);
        }
        
        // Simpan ke history
        saveToHistory(city);
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showError(error.message);
        console.error('Fetch error:', error);
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        showLoading();
        hideError();
        
        // Fetch current weather
        const currentResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        
        if (!currentResponse.ok) {
            throw new Error('Gagal mengambil data cuaca');
        }
        
        const currentData = await currentResponse.json();
        currentWeatherData = currentData;
        displayCurrentWeather(currentData);
        
        // Fetch forecast
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        
        if (forecastResponse.ok) {
            const forecastDataRaw = await forecastResponse.json();
            forecastData = forecastDataRaw;
            displayForecast(forecastDataRaw);
        }
        
        // Simpan ke history
        saveToHistory(currentData.name);
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showError(error.message);
        console.error('Fetch error:', error);
    }
}

// ===== DISPLAY FUNCTIONS =====
function displayCurrentWeather(data) {
    // Update location info
    elements.cityName.textContent = `${data.name}, ${data.sys.country}`;
    elements.currentDate.textContent = formatDate(new Date());
    
    // Update weather icon
    const iconCode = data.weather[0].icon;
    elements.weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    elements.weatherIcon.alt = data.weather[0].description;
    
    // Update temperature
    elements.temperature.textContent = `${convertTemp(data.main.temp)}${getTempUnit()}`;
    elements.weatherDescription.textContent = data.weather[0].description;
    
    // Update details
    elements.feelsLike.textContent = `${convertTemp(data.main.feels_like)}${getTempUnit()}`;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.windSpeed.textContent = `${data.wind.speed} m/s`;
    
    // Show weather section
    elements.currentWeather.classList.remove('hidden');
}

function displayForecast(data) {
    // Filter data untuk mendapatkan 1 data per hari (sekitar jam 12:00)
    const dailyData = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();
        const hours = date.getHours();
        
        // Ambil data sekitar tengah hari atau data pertama untuk hari tersebut
        if (!dailyData[dateKey]) {
            // Jika belum ada data untuk hari ini, simpan
            dailyData[dateKey] = { item: item, hours: hours };
        } else if (hours >= 12 && dailyData[dateKey].hours < 12) {
            // Jika data sebelumnya pagi dan data baru siang/sore, ganti
            dailyData[dateKey] = { item: item, hours: hours };
        } else if (hours >= 12 && dailyData[dateKey].hours >= 12 && hours < dailyData[dateKey].hours) {
            // Jika keduanya siang/sore, ambil yang lebih dekat ke jam 12
            dailyData[dateKey] = { item: item, hours: hours };
        }
    });
    
    // Konversi ke array dan ambil 5 hari pertama
    const forecastArray = Object.values(dailyData).map(obj => obj.item).slice(0, 5);
    
    // Clear container
    elements.forecastContainer.innerHTML = '';
    
    // Create forecast cards
    forecastArray.forEach(item => {
        const card = createForecastCard(item);
        elements.forecastContainer.appendChild(card);
    });
    
    // Show forecast section
    elements.forecastSection.classList.remove('hidden');
}

function createForecastCard(data) {
    const date = new Date(data.dt * 1000);
    const iconCode = data.weather[0].icon;
    
    const card = document.createElement('div');
    card.className = 'forecast-card';
    
    card.innerHTML = `
        <div class="forecast-date">${formatDateShort(date)}</div>
        <div class="forecast-day">${formatDay(date)}</div>
        <img 
            class="forecast-icon" 
            src="https://openweathermap.org/img/wn/${iconCode}@2x.png" 
            alt="${data.weather[0].description}"
        >
        <div class="forecast-description">${data.weather[0].description}</div>
        <div class="forecast-temps">
            <span class="temp-high">${convertTemp(data.main.temp_max)}${getTempUnit()}</span>
            <span class="temp-low">${convertTemp(data.main.temp_min)}${getTempUnit()}</span>
        </div>
    `;
    
    return card;
}

// ===== SEARCH HISTORY =====
function saveToHistory(city) {
    let history = getSearchHistory();
    
    // Hapus duplikat (case insensitive)
    history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
    
    // Tambahkan di awal array
    history.unshift(city);
    
    // Batasi 5 item terakhir
    history = history.slice(0, 5);
    
    // Simpan ke localStorage
    localStorage.setItem('searchHistory', JSON.stringify(history));
    
    // Update tampilan
    displaySearchHistory();
}

function getSearchHistory() {
    const history = localStorage.getItem('searchHistory');
    return history ? JSON.parse(history) : [];
}

function displaySearchHistory() {
    const history = getSearchHistory();
    
    if (history.length === 0) {
        elements.searchHistory.innerHTML = '';
        return;
    }
    
    elements.searchHistory.innerHTML = history
        .map(city => `<button class="history-item" onclick="handleHistoryClick('${city}')">${city}</button>`)
        .join('');
}

function handleHistoryClick(city) {
    elements.cityInput.value = city;
    fetchWeatherByCity(city);
}

// ===== SEARCH HANDLER =====
function handleSearch() {
    const city = elements.cityInput.value.trim();
    
    if (!city) {
        showError('Silakan masukkan nama kota');
        return;
    }
    
    fetchWeatherByCity(city);
}

// ===== UI HELPERS =====
function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.currentWeather.classList.add('hidden');
    elements.forecastSection.classList.add('hidden');
}

function hideLoading() {
    elements.loading.classList.add('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// ===== DATE FORMATTING =====
function formatDate(date) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('id-ID', options);
}

function formatDateShort(date) {
    const options = { 
        month: 'short', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('id-ID', options);
}

function formatDay(date) {
    const options = { weekday: 'long' };
    return date.toLocaleDateString('id-ID', options);
}

// ===== START APP =====
document.addEventListener('DOMContentLoaded', init);
