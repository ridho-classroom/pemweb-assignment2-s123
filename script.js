// =================================================================
// WeatherMAP - SCRIPT.JS FINAL DAN LENGKAP DENGAN 9 FITUR
// =================================================================

// Ganti dengan API Key OpenWeatherMap Anda yang valid
const API_KEY = 'ab68bd2271e181eb742be99e4eb446f2'; 
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements & State
const body = document.body;
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const weatherInfo = document.getElementById('weatherInfo');
const autocompleteResults = document.getElementById('autocompleteResults');
const hourlyContainer = document.getElementById('hourlyContainer');
const dailyContainer = document.getElementById('dailyContainer');

// New Feature Elements
const toggleUnitBtn = document.getElementById('toggleUnitBtn');       // Fitur 8
const toggleThemeBtn = document.getElementById('toggleThemeBtn');     // Fitur 9
const favoritesBtn = document.getElementById('favoritesBtn');         // Fitur 6
const historyBtn = document.getElementById('historyBtn');             // Fitur 7
const quickListContainer = document.getElementById('quickListContainer');
const quickListTitle = document.getElementById('quickListTitle');
const quickListContent = document.getElementById('quickListContent');
const favStar = document.getElementById('favStar');                   // Fitur 6
const tempUnit = document.querySelector('.unit');                     // Fitur 8
const tempMaxEl = document.getElementById('tempMax');                 // Fitur 4
const tempMinEl = document.getElementById('tempMin');                 // Fitur 4
const feelsLikeTemp = document.getElementById('feelsLikeTemp');
const detailModal = document.getElementById('detailModal');           // Fitur 5
const closeBtn = detailModal.querySelector('.close-btn');

// Global State
let currentWeatherData = null;
let dailyForecastData = []; 
let isCelsius = localStorage.getItem('unit') !== 'F'; // Default C
let currentCityName = '';

// Utility Data
const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Konversi Suhu
const toFahrenheit = (celsius) => Math.round((celsius * 9/5) + 32);
const convertTemp = (tempC) => isCelsius ? Math.round(tempC) : toFahrenheit(tempC);
const unitSymbol = () => isCelsius ? '°C' : '°F';

// =================================================================
// 1. INITIALIZATION & CORE LISTENERS
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    updateCurrentDate();
    
    // Muat kota terakhir dicari (Fitur 3) atau default
    const lastCity = localStorage.getItem('lastCity') || 'Jakarta';
    if (API_KEY && API_KEY !== 'GANTI_DENGAN_API_KEY_ANDA') {
        getWeatherData(lastCity);
    } else {
        showError('PERINGATAN: API Key belum diatur. Silakan ganti.');
    }
});

searchBtn.addEventListener('click', () => handleSearch());
locationBtn.addEventListener('click', () => handleLocationSearch());
cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });

// FITUR 1: Autocomplete Listeners
cityInput.addEventListener('input', handleAutocomplete);
cityInput.addEventListener('focus', () => { 
    if (cityInput.value.length >= 3 && autocompleteResults.children.length > 0) {
        autocompleteResults.classList.remove('hidden');
    }
});
cityInput.addEventListener('blur', () => {
    setTimeout(() => autocompleteResults.classList.add('hidden'), 200);
});

// FITUR 8: Toggle Unit
toggleUnitBtn.addEventListener('click', toggleUnit);

// FITUR 9: Toggle Tema
toggleThemeBtn.addEventListener('click', toggleTheme);

// FITUR 6 & 7: Quick Access Listeners
favStar.addEventListener('click', toggleFavorite);
favoritesBtn.addEventListener('click', () => toggleQuickList('favorites'));
historyBtn.addEventListener('click', () => toggleQuickList('history'));

// Modal close events
closeBtn.addEventListener('click', () => detailModal.classList.add('hidden'));
window.addEventListener('click', (event) => {
    if (event.target === detailModal) detailModal.classList.add('hidden');
});

// =================================================================
// 2. CORE LOGIC (HANDLE SEARCH & LOCATION) 🎯
// =================================================================

/**
 * Handle Search (Fungsi yang hilang dan sudah ditambahkan)
 */
function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    } else {
        showError('Silakan masukkan nama kota');
    }
}

/**
 * Handle Location Search (Fungsi yang hilang dan sudah ditambahkan)
 */
function handleLocationSearch() {
    if (!API_KEY || API_KEY === 'GANTI_DENGAN_API_KEY_ANDA') {
        showError('API Key belum diatur. Tidak bisa menggunakan lokasi.');
        return;
    }

    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            () => {
                hideLoading();
                showError('Tidak dapat mengakses lokasi Anda. Izin ditolak atau lokasi tidak tersedia.');
            }
        );
    } else {
        showError('Geolokasi tidak didukung oleh browser ini');
    }
}

/**
 * Get weather data by coordinates (Untuk tombol lokasi)
 */
async function getWeatherByCoords(lat, lon) {
    if (!API_KEY || API_KEY === 'GANTI_DENGAN_API_KEY_ANDA') {
        showError('API Key belum diatur. Gagal mengambil data.');
        return;
    }
    
    try {
        // Fetch Current Weather & Forecast
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=id`),
            fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=id`)
        ]);

        if (!currentRes.ok || !forecastRes.ok) {
            throw new Error('Gagal mengambil data cuaca untuk koordinat ini.');
        }
        
        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        currentWeatherData = currentData;
        currentCityName = `${currentData.name}, ${currentData.sys.country}`;

        saveHistory(currentData.name);
        localStorage.setItem('lastCity', currentData.name);
        
        processAndDisplayData(currentData, forecastData);
        hideLoading();
        showWeatherInfo();
        
    } catch (error) {
        hideLoading();
        showError(error.message || 'Gagal mengambil data cuaca');
    }
}

// =================================================================
// 3. DATA FETCHING (GET WEATHER DATA BY CITY NAME)
// =================================================================

async function getWeatherData(city) {
    if (!city) return;
    try {
        showLoading();
        
        // Fetch Current Weather & Forecast
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=id`),
            fetch(`${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=id`)
        ]);

        // FITUR 2: Menangani kesalahan pencarian
        if (!currentRes.ok) {
            if (currentRes.status === 404) throw new Error('Kota tidak ditemukan. Coba nama kota lain.');
            throw new Error(`Gagal mengambil data cuaca: ${currentRes.statusText}`);
        }
        
        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        currentWeatherData = currentData;
        currentCityName = `${currentData.name}, ${currentData.sys.country}`;
        
        // FITUR 7: Simpan riwayat pencarian
        saveHistory(currentData.name);
        // FITUR 3: Menyimpan pencarian terbaru
        localStorage.setItem('lastCity', currentData.name);

        processAndDisplayData(currentData, forecastData);
        hideLoading();
        showWeatherInfo();
        
    } catch (error) {
        hideLoading();
        showError(error.message || 'Terjadi kesalahan jaringan atau API.');
    }
}

function processAndDisplayData(current, forecast) {
    // Proses prakiraan harian (untuk Fitur 4 & 5)
    dailyForecastData = groupForecastByDay(forecast.list);
    
    // Update UI
    updateUI(current);
    
    // Update Forecast Sections
    displayHourlyForecast(forecast);
    displayDailyForecast(dailyForecastData.slice(1, 6)); // Tampilkan 5 hari ke depan
    
    cityInput.value = current.name;
    updateFavStar(current.name); // Perbarui status bintang (Fitur 6)
}

// =================================================================
// 4. UI UPDATE & DISPLAY FUNCTIONS
// =================================================================

function updateUI(data) {
    if (!data) return;

    // Hitung suhu dalam unit yang benar
    const tempC = data.main.temp;
    const feelsLikeC = data.main.feels_like;
    const maxTempC = dailyForecastData[0]?.high || data.main.temp_max; // Gunakan data harian jika ada
    const minTempC = dailyForecastData[0]?.low || data.main.temp_min;

    const currentTemp = convertTemp(tempC);
    const maxTemp = convertTemp(maxTempC);
    const minTemp = convertTemp(minTempC);
    const feelsLike = convertTemp(feelsLikeC);
    const unit = unitSymbol();

    // Current Weather
    // Menggunakan childNodes[0] untuk mengabaikan elemen <span> (star icon)
    document.getElementById('cityName').childNodes[0].nodeValue = `${data.name}, ${data.sys.country} `; 
    temperature.textContent = currentTemp;
    tempUnit.textContent = unit;
    
    // FITUR 4: Suhu Maks/Min Harian
    tempMaxEl.textContent = `${maxTemp}${unit}`;
    tempMinEl.textContent = `${minTemp}${unit}`;
    
    feelsLikeTemp.textContent = `${feelsLike}${unit}`;
    weatherDescription.textContent = data.weather[0].description;
    
    // Weather Icon
    const iconCode = data.weather[0].icon;
    weatherIcon.className = getWeatherIconClass(iconCode);

    // Kalkulasi Titik Embun sederhana
    const T = data.main.temp;
    const RH = data.main.humidity;
    
    // Update prakiraan harian & per jam dengan unit baru
    displayHourlyForecast(currentWeatherData); // Panggil ulang untuk unit baru
    displayDailyForecast(dailyForecastData.slice(1, 6)); // Panggil ulang untuk unit baru
}

// FITUR 8: Toggle Unit
function toggleUnit() {
    isCelsius = !isCelsius;
    localStorage.setItem('unit', isCelsius ? 'C' : 'F');
    
    // Ganti ikon tombol
    toggleUnitBtn.querySelector('i').className = isCelsius ? 'fas fa-temperature-three-quarters' : 'fas fa-temperature-full';
    
    if (currentWeatherData) {
        updateUI(currentWeatherData);
    }
}

// FITUR 9: Toggle Tema
function toggleTheme() {
    const currentTheme = body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    toggleThemeBtn.querySelector('i').className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

/**
 * Menampilkan prakiraan harian.
 */
function displayDailyForecast(data) {
    dailyContainer.innerHTML = '';
    if (!data || data.length === 0) {
        dailyContainer.innerHTML = '<p class="error-inline">Prakiraan 5 hari tidak tersedia.</p>';
        return;
    }

    data.forEach((item) => {
        let high = convertTemp(item.high);
        let low = convertTemp(item.low);
        const unit = unitSymbol();
        
        const dailyItem = document.createElement('div');
        dailyItem.className = 'daily-item';
        dailyItem.innerHTML = `
            <div class="day">${item.day}</div>
            <div class="icon"><i class="${getWeatherIconClass(item.icon)}"></i></div>
            <div class="desc">${item.desc}</div>
            <div class="temps">
                <span class="high">${high}${unit}</span> / 
                <span class="low">${low}${unit}</span>
            </div>
        `;
        
        // FITUR 5: Item prakiraan bisa diklik untuk detail
        dailyItem.addEventListener('click', () => showDailyDetail(item));
        
        dailyContainer.appendChild(dailyItem);
    });
}

// Menampilkan prakiraan per jam
function displayHourlyForecast(data) {
    hourlyContainer.innerHTML = '';
    
    // Gunakan data list dari forecast yang sudah disimpan di currentWeatherData
    const forecastList = data.list || data.list; 

    if (!forecastList || !Array.isArray(forecastList)) return; 
    
    const hourlyData = forecastList.slice(0, 8); // Next 8 intervals (24 hours)
    
    hourlyData.forEach(item => {
        const time = new Date(item.dt * 1000);
        const hour = time.getHours();
        const temp = convertTemp(item.main.temp);
        const iconCode = item.weather[0].icon;
        const icon = getWeatherIconClass(iconCode);
        const unit = unitSymbol();
        
        const hourlyItem = document.createElement('div');
        hourlyItem.className = 'hourly-item';
        hourlyItem.innerHTML = `
            <div class="time">${hour}:00</div>
            <div class="icon"><i class="${icon}"></i></div>
            <div class="temp">${temp}${unit}</div>
        `;
        
        hourlyContainer.appendChild(hourlyItem);
    });
}

// FITUR 5: Fungsi menampilkan detail modal
function showDailyDetail(detail) {
    const unit = unitSymbol();
    
    let high = convertTemp(detail.high);
    let low = convertTemp(detail.low);
    let pop = Math.round(detail.pop * 100);

    document.getElementById('modalDay').textContent = `${detail.day} - ${currentCityName.split(',')[0]}`;
    document.getElementById('modalCity').textContent = detail.desc;
    document.getElementById('modalTemp').textContent = `${low}${unit} / ${high}${unit}`;
    document.getElementById('modalHumidity').textContent = `${detail.avgHumidity}%`;
    document.getElementById('modalWind').textContent = `${detail.avgWindSpeed} km/h`;
    document.getElementById('modalPop').textContent = `${pop}%`;

    detailModal.classList.remove('hidden');
}

// =================================================================
// 5. UTILITIES & FEATURE IMPLEMENTATIONS
// =================================================================

// Group forecast data by day (diperbarui untuk detail modal)
function groupForecastByDay(forecastList) {
    const grouped = {};

    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toDateString();
        
        if (!grouped[dayKey]) {
            grouped[dayKey] = {
                day: dayNames[date.getDay()],
                temps: [],
                icons: [],
                descs: [],
                humidity: [],
                windSpeed: [],
                pop: []
            };
        }
        
        grouped[dayKey].temps.push(item.main.temp); 
        grouped[dayKey].icons.push(item.weather[0].icon);
        grouped[dayKey].descs.push(item.weather[0].description);
        grouped[dayKey].humidity.push(item.main.humidity);
        grouped[dayKey].windSpeed.push(item.wind.speed * 3.6); // Konversi ke km/h
        grouped[dayKey].pop.push(item.pop || 0); // Peluang hujan
    });
    
    return Object.values(grouped).map(day => ({
        day: day.day,
        high: Math.max(...day.temps), 
        low: Math.min(...day.temps),
        icon: day.icons[0], 
        desc: day.descs[0],
        // Ambil rata-rata untuk detail modal
        avgHumidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
        avgWindSpeed: (day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length).toFixed(1),
        pop: day.pop.reduce((a, b) => Math.max(a, b), 0) // Ambil nilai POP tertinggi
    }));
}

// Fungsi helper untuk ikon
function getWeatherIconClass(iconCode) {
    const icons = {
        '01d': 'fas fa-sun', '01n': 'fas fa-moon',
        '02d': 'fas fa-cloud-sun', '02n': 'fas fa-cloud-moon',
        '03d': 'fas fa-cloud', '03n': 'fas fa-cloud',
        '04d': 'fas fa-clouds', '04n': 'fas fa-clouds',
        '09d': 'fas fa-cloud-rain', '09n': 'fas fa-cloud-rain',
        '10d': 'fas fa-cloud-sun-rain', '10n': 'fas fa-cloud-moon-rain',
        '11d': 'fas fa-bolt', '11n': 'fas fa-bolt',
        '13d': 'fas fa-snowflake', '13n': 'fas fa-snowflake',
        '50d': 'fas fa-smog', '50n': 'fas fa-smog'
    };
    return icons[iconCode] || 'fas fa-question-circle';
}

// FITUR 1: Autocomplete
async function handleAutocomplete() {
    const query = cityInput.value.trim();
    autocompleteResults.innerHTML = '';
    
    if (query.length < 3) {
        autocompleteResults.classList.add('hidden');
        return;
    }

    try {
        const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`);
        const data = await response.json();
        
        if (data.length > 0) {
            data.forEach(item => {
                const resultItem = document.createElement('div');
                resultItem.className = 'autocomplete-item';
                resultItem.textContent = `${item.name}${item.state ? ', ' + item.state : ''}, ${item.country}`;
                // Menggunakan mousedown daripada click agar event blur tidak menutupnya sebelum event ini dipicu
                resultItem.addEventListener('mousedown', () => { 
                    cityInput.value = item.name;
                    handleSearch();
                });
                autocompleteResults.appendChild(resultItem);
            });
            autocompleteResults.classList.remove('hidden');
        } else {
            autocompleteResults.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error fetching autocomplete:', error);
    }
}

// FITUR 6 & 7: Favorit dan Riwayat (Local Storage)
function getList(key) { return JSON.parse(localStorage.getItem(key)) || []; }
function saveList(key, list) { localStorage.setItem(key, JSON.stringify(list)); }

function saveHistory(city) {
    let history = getList('searchHistory');
    history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
    history.unshift(city);
    saveList('searchHistory', history.slice(0, 10)); // Batasi 10
}

function isFavorite(city) {
    const favorites = getList('favorites');
    return favorites.some(fav => fav.toLowerCase() === city.toLowerCase());
}

function updateFavStar(city) {
    const isFav = isFavorite(city);
    favStar.innerHTML = `<i class="${isFav ? 'fas fa-star' : 'far fa-star'}"></i>`;
}

function toggleFavorite() {
    if (!currentWeatherData) return;
    const currentCity = currentWeatherData.name;
    let favorites = getList('favorites');
    
    if (isFavorite(currentCity)) {
        favorites = favorites.filter(fav => fav.toLowerCase() !== currentCity.toLowerCase());
    } else {
        favorites.push(currentCity);
    }
    
    saveList('favorites', favorites);
    updateFavStar(currentCity);
}

function toggleQuickList(type) {
    if (!quickListContainer.classList.contains('hidden') && quickListContainer.dataset.type === type) {
        quickListContainer.classList.add('hidden');
        return;
    }
    
    quickListContent.innerHTML = '';
    const list = getList(type === 'favorites' ? 'favorites' : 'searchHistory');
    quickListTitle.textContent = type === 'favorites' ? 'Lokasi Favorit' : 'Riwayat Pencarian';
    quickListContainer.dataset.type = type;

    if (list.length === 0) {
        quickListContent.innerHTML = `<p style="margin: 10px 0; font-style: italic;">Tidak ada ${quickListTitle.textContent.toLowerCase()}.</p>`;
    } else {
        list.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.textContent = item;
            itemEl.addEventListener('click', () => {
                cityInput.value = item;
                handleSearch();
                quickListContainer.classList.add('hidden');
            });
            quickListContent.appendChild(itemEl);
        });
    }

    quickListContainer.classList.remove('hidden');
}

// =================================================================
// 6. UI STATE HANDLERS
// =================================================================

function loadPreferences() {
    // FITUR 9: Tema
    const theme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', theme);
    toggleThemeBtn.querySelector('i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    // FITUR 8: Unit
    const unit = localStorage.getItem('unit') || 'C';
    isCelsius = unit === 'C';
    toggleUnitBtn.querySelector('i').className = isCelsius ? 'fas fa-temperature-three-quarters' : 'fas fa-temperature-full';
}

function updateCurrentDate() {
    const now = new Date();
    const dayName = dayNames[now.getDay()];
    const day = now.getDate();
    const monthName = monthNames[now.getMonth()];
    const year = now.getFullYear();
    document.getElementById('currentDate').textContent = `${dayName}, ${day} ${monthName} ${year}`;
}

function showLoading() {
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    weatherInfo.classList.add('hidden');
    quickListContainer.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

// FITUR 2: Penanganan Error
function showError(message) {
    errorMessage.textContent = message;
    error.classList.remove('hidden');
    weatherInfo.classList.add('hidden');
    loading.classList.add('hidden');
}

function showWeatherInfo() {
    weatherInfo.classList.remove('hidden');
    error.classList.add('hidden');
}