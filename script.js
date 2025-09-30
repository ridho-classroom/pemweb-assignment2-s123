let cityInput = document.getElementById('city_input'),
searchBtn = document.getElementById('searchBtn'),
locationBtn = document.getElementById('locationBtn'),
api_key = '15cb928135b2b6970b1bbb889bb0f0b4'
currentWeatherCard = document.querySelectorAll('.weather-left .card')[0],
fiveDaysForecastCard = document.querySelector('.day-forecast');
aqiCard = document.querySelectorAll('.highlights .card')[0];
sunriseCard = document.querySelectorAll('.highlights .card')[1];
humidityVal = document.getElementById('humidityVal');
pressureVal = document.getElementById('pressureVal');
visibilityVal = document.getElementById('visibilityVal');
windspeedVal = document.getElementById('windspeedVal');
hourlyForecastCard = document.querySelector('.hourly-forecast'),
feelsVal = document.getElementById('feelsVal');
aqiList = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];

// --- VARIABEL UNTUK FITUR BARU ---
let unitSwitchBtn = document.getElementById('unitSwitchBtn'),
    modeSwitchBtn = document.getElementById('modeSwitchBtn');
let favoriteBtn = document.getElementById('favoriteBtn');
let favoriteList = document.getElementById('favoriteList');
let historyList = document.getElementById('historyList');
let suggestionsList = document.getElementById('suggestions'); // Datalist element

// --- VARIABEL POPUP ERROR BARU ---
let errorPopup = document.getElementById('errorPopup');
let closePopupBtn = document.getElementById('closePopupBtn');
// ----------------------------------

// State default dan cache
let currentUnit = 'C';
let weatherDataCache = {};
let forecastDataCache = {};
let currentCityName = ''; // Untuk melacak kota yang sedang ditampilkan
let favorites = JSON.parse(localStorage.getItem('weather_favorites')) || [];
let history = JSON.parse(localStorage.getItem('weather_history')) || [];

// Array untuk hari dan bulan
const days = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];
const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];


// --- FUNGSI UTILITY & KONVERSI SUHU ---

function celciusToFahrenheit(c) {
    // Menampilkan bilangan bulat
    return (c * 9 / 5 + 32).toFixed(0); 
}

function convertTemp(c) {
    // Menampilkan bilangan bulat
    if (currentUnit === 'C') {
        return c.toFixed(0); 
    } else {
        return celciusToFahrenheit(c); 
    }
}

// --- FUNGSI UNTUK MENAMPILKAN DAN MENYEMBUNYIKAN POP-UP ERROR ---
function showErrorPopup() {
    if (errorPopup) {
        errorPopup.style.display = 'flex'; 
    }
}

function closeErrorPopup() {
    if (errorPopup) {
        errorPopup.style.display = 'none';
    }
}


// --- FUNGSI UNTUK MERENDER ULANG DENGAN UNIT BARU ---
function updateWeatherDisplay(weatherData, forecastData) {
    if (Object.keys(weatherData).length === 0 || Object.keys(forecastData).length === 0) return;

    const unitSymbol = currentUnit === 'C' ? '&deg;C' : '&deg;F';

    // Perbarui nama kota saat ini dan tombol favorit
    currentCityName = weatherData.name;
    updateFavoriteButton(); 
    
    // 1. Update Current Weather
    const currentTemp = convertTemp(weatherData.main.temp);
    const feelsLikeTemp = convertTemp(weatherData.main.feels_like);
    let date = new Date(weatherData.dt * 1000); 
    
    currentWeatherCard.innerHTML = `
        <div class="current-weather">
            <div class="details">
                <p>Now</p>
                <h2>${currentTemp}${unitSymbol}</h2>
                <p>${weatherData.weather[0].description}</p>
            </div>
            <div class="weather-icon">
                <img src="https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png" alt="">
            </div>
        </div>
        <hr>
        <div class="card-footer">
            <p><i class="fa-light fa-calendar"></i>${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}</p>
            <p><i class="fa-light fa-location-dot"></i>${weatherData.name}, ${weatherData.sys.country}</p>
        </div>
    `;

    // 2. Update Highlights
    feelsVal.innerHTML = `${feelsLikeTemp}${unitSymbol}`;


    // 3. Update Hourly Forecast
    hourlyForecastCard.innerHTML = '';
    const hourlyForecast = forecastData.list;
    for(i = 0; i <= 7; i++){
        // Pastikan moment.js terinstal dan berfungsi untuk format waktu
        let hrForecastDate = moment.unix(hourlyForecast[i].dt).format('h A');
        let temp = convertTemp(hourlyForecast[i].main.temp);
        
        hourlyForecastCard.innerHTML += `
            <div class="card">
               <p>${hrForecastDate}</p>
                <img src="https://openweathermap.org/img/wn/${hourlyForecast[i].weather[0].icon}.png" alt="">
                <p>${temp}${unitSymbol}</p>
            </div>
        `;
    }

    // 4. Update 5 Days Forecast
    fiveDaysForecastCard.innerHTML = '';
    let uniqueForecastDays = [];
    let dailyForecastsToDisplay = [];
    
    // Iterate through the entire forecast list to collect 5 unique days
    for (let i = 0; i < forecastData.list.length; i++) {
        let forecast = forecastData.list[i];
        let forecastDate = new Date(forecast.dt_txt).getDate(); 
        
        if (!uniqueForecastDays.includes(forecastDate)) {
            uniqueForecastDays.push(forecastDate);
            
            // Kita ingin menampilkan 5 hari ke depan. Ambil dari index 1 hingga 5.
            if (uniqueForecastDays.length > 1 && dailyForecastsToDisplay.length < 5) {
                dailyForecastsToDisplay.push(forecast);
            }
        }
        
        if (dailyForecastsToDisplay.length >= 5) {
            break;
        }
    }

    // Loop untuk 5 hari ke depan
    dailyForecastsToDisplay.forEach(forecastItem => {
        let date = new Date(forecastItem.dt_txt);
        let temp = convertTemp(forecastItem.main.temp);
        
        fiveDaysForecastCard.innerHTML += `
            <div class="forecast-item">
                <div class="icon-wrapper">
                    <img src="https://openweathermap.org/img/wn/${forecastItem.weather[0].icon}.png" alt="">
                        <span>${temp}${unitSymbol}</span>
                </div>
                <p>${date.getDate()} ${months[date.getMonth()]}</p>
                <p>${days[date.getDay()]}</p>
            </div>
        `;
    });
}


function getWeatherDetails(name, lat, lon, country, state){
    let FORECAST_API_URL =`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${api_key}`,
    WEATHER_API_URL =`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${api_key}`,
    AIR_POLLUTION_API_URL =`http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${api_key}`

    // Tambahkan kota ke Riwayat Pencarian
    addToHistory(name, lat, lon);
    
    // Fetch Air Quality Index (AQI)
    fetch(AIR_POLLUTION_API_URL).then(res => res.json()).then(data => {
        let {co, no, no2, o3, so2, pm2_5, pm10 ,nh3} = data.list[0].components;
        aqiCard.innerHTML = `
            <div class="card-head">
                <p>Air Quality Index</p>
                <p class="air-index aqi-${data.list[0].main.aqi}">${aqiList[data.list[0].main.aqi - 1]}</p>
            </div>
            <div class="air-indices">
                <i class="fa-regular fa-wind fa-3x"></i>
                <div class="item">
                <p>PM2.5</p>
                <h2>${pm2_5.toFixed(2)}</h2>
            </div>
            <div class="item">
                <p>PM10</p>
                <h2>${pm10.toFixed(2)}</h2>
            </div>
            <div class="item">
                <p>S02</p>
                <h2>${so2.toFixed(2)}</h2>
            </div>
            <div class="item">
                <p>CO</p>
                <h2>${co.toFixed(2)}</h2>
            </div>
            <div class="item">
                <p>NO</p>
                <h2>${no.toFixed(2)}</h2>
            </div>
            <div class="item">
                <p>NO2</p>
                <h2>${no2.toFixed(2)}</h2>
            </div>
            <div class="item">
                <p>NH3</p>
                <h2>${nh3.toFixed(2)}</h2>
            </div>
            <div class="item">
                <p>03</p>
                <h2>${o3.toFixed(2)}</h2>
            </div>
            </div>
                    `;
    }).catch(() => {
        // console.error('Failed to fetch Air Quality Index');
    })
    
    // Fetch Current Weather (Simpan ke cache)
    fetch(WEATHER_API_URL).then(res => res.json()).then(data => {
        weatherDataCache = data;
        
        let {sunrise, sunset} = data.sys,
        {timezone, visibility} = data,
        {humidity, pressure} = data.main,
        {speed} = data.wind,
        sRiseTime = moment.utc(sunrise, 'X').add(timezone, 'seconds').format('hh:mm A'),
        sSetTime = moment.utc(sunset, 'X').add(timezone, 'seconds').format('hh:mm A');

        // Render data yang tidak bergantung pada unit
        sunriseCard.innerHTML = `
        <div class="card-head">
            <p>Sunrise & Sunset</p>
        </div>
        <div class="sunrise-sunset">
            <div class="item">
                <div class="icon">
                    <i class="fa-light fa-sunrise fa-4x"></i>
                 </div>
                <div>
                    <p>Sunrise</p>
                    <h2>${sRiseTime}</h2>
                </div>
            </div>
            <div class="item">
                <div class="icon">
                    <i class="fa-light fa-sunset fa-4x"></i>
                </div>
                <div>
                    <p>Sunset</p>
                    <h2>${sSetTime}</h2>
                </div>
            </div>  
        </div>
        `;
        // Catatan: OpenWeatherMap menggunakan m/s untuk kecepatan angin saat units=metric
        humidityVal.innerHTML = `${humidity}%`;
        pressureVal.innerHTML = `${pressure}hPa`;
        visibilityVal.innerHTML = `${visibility / 1000}km`;
        windspeedVal.innerHTML = `${speed}m/s`;

        // Panggil updateWeatherDisplay untuk merender bagian unit
        if (Object.keys(forecastDataCache).length !== 0) {
            updateWeatherDisplay(weatherDataCache, forecastDataCache);
        }

    }).catch(()=> {
        alert('Failed to fetch current weather')
    });

    // Fetch 5-Day/Hourly Forecast (Simpan ke cache)
    fetch(FORECAST_API_URL).then(res => res.json()).then(data => {
        forecastDataCache = data;
        
        // Panggil updateWeatherDisplay untuk merender
        updateWeatherDisplay(weatherDataCache, forecastDataCache);

    }).catch(() => {
        alert('Failed to fetch weather forecast')
    });
}

// --- FUNGSI AUTO SUGGESTION ---
function getCitySuggestions(query){
    if (query.length < 3) {
        if (suggestionsList) suggestionsList.innerHTML = '';
        return;
    }
    let GEOCODING_API_URL = `http://api.openweathermap.org/geo/1.0/direct?q=${query},&limit=5&appid=${api_key}`;
    
    fetch(GEOCODING_API_URL)
        .then(res => res.json())
        .then(data => {
            if (suggestionsList) suggestionsList.innerHTML = '';
            data.forEach(city => {
                const option = document.createElement('option');
                // Format suggestion: "City Name, Country Code"
                option.value = `${city.name}, ${city.country}`; 
                if (suggestionsList) suggestionsList.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error fetching suggestions:', error);
        });
}


function getCityCoordinates(){
    let fullCityName = cityInput.value.trim();
    
    // Kosongkan input dan suggestion list
    cityInput.value = ''; 
    if (suggestionsList) suggestionsList.innerHTML = ''; 

    if(!fullCityName) return;
    
    // Gunakan nama lengkap yang dimasukkan (misal: London, GB)
    let GEOCODING_API_URL_ = `http://api.openweathermap.org/geo/1.0/direct?q=${fullCityName},&limit=1&appid=${api_key}`;
    
    fetch(GEOCODING_API_URL_).then(res => res.json()).then(data => {
        
        // --- LOGIKA POP-UP ERROR DITAMBAHKAN DI SINI ---
        if(data.length === 0) {
            showErrorPopup(); // Ganti alert() dengan menampilkan pop-up
            return; // Hentikan fungsi jika kota tidak ditemukan
        }
        // ----------------------------------------------
        
        let {name, lat, lon, country, state} = data[0];
        getWeatherDetails(name, lat, lon, country, state);
    }).catch(() => {
        alert(`Gagal mengambil koordinat untuk "${fullCityName}"`);
    });
}

function getUserCoordinates(){
    navigator.geolocation.getCurrentPosition(position => {
        let {latitude, longitude} = position.coords;
        let REVERSE_GEOCODING_URL = `http://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${api_key}`;

        fetch(REVERSE_GEOCODING_URL).then(res => res.json()).then(data => {
            let {name, country, state} = data[0];
            getWeatherDetails(name, latitude, longitude, country, state);
        }).catch(() => {
            alert('Failed to fetch user coordinates');
        });    
    }, error => {
        if(error.code == error.PERMISSION_DENIED){
            alert('Geolocation permission denied. Please reset location permission to grant access again');
        }
    })
}


// --- FUNGSI FAVORIT DAN RIWAYAT ---

function isFavorite(city) {
    return favorites.some(fav => fav.name === city);
}

function updateFavoriteButton() {
    if (!favoriteBtn) return;
    
    if (currentCityName && isFavorite(currentCityName)) {
        favoriteBtn.innerHTML = '<i class="fa-solid fa-heart" style="color:#ff4d4d;"></i>'; // Hati penuh merah
    } else {
        favoriteBtn.innerHTML = '<i class="fa-regular fa-heart"></i>'; // Hati kosong
    }
}

function toggleFavorite() {
    if (!currentCityName) {
        alert('Please search for a city first.');
        return;
    }
    
    if (isFavorite(currentCityName)) {
        // Hapus dari favorit
        favorites = favorites.filter(fav => fav.name !== currentCityName);
    } else {
        // Tambahkan ke favorit
        const cityData = {
            name: currentCityName,
            // Pastikan data cache sudah terisi sebelum mengambil lat/lon
            lat: weatherDataCache.coord ? weatherDataCache.coord.lat : null,
            lon: weatherDataCache.coord ? weatherDataCache.coord.lon : null
        };
        // Cek jika lat/lon valid
        if (cityData.lat !== null) {
            favorites.push(cityData);
        } else {
            alert('Could not save favorite: coordinates unavailable.');
            return;
        }
    }

    localStorage.setItem('weather_favorites', JSON.stringify(favorites));
    renderFavorites();
    updateFavoriteButton();
}

function addToHistory(name, lat, lon) {
    const newEntry = { name, lat, lon };
    
    // Hapus duplikat dan pindahkan yang baru dicari ke posisi teratas
    history = history.filter(item => item.name !== name);
    
    // Tambahkan di awal
    history.unshift(newEntry);
    
    // Batasi riwayat (misalnya 5 item)
    if (history.length > 5) {
        history.pop();
    }

    localStorage.setItem('weather_history', JSON.stringify(history));
    renderHistory();
}

function renderFavorites() {
    if (!favoriteList) return; 
    favoriteList.innerHTML = '';
    if (favorites.length === 0) {
        favoriteList.innerHTML = '<p class="placeholder">No favorite cities added yet.</p>';
        return;
    }

    favorites.forEach(fav => {
        const item = document.createElement('div');
        item.className = 'city-item';
        item.setAttribute('data-lat', fav.lat);
        item.setAttribute('data-lon', fav.lon);
        item.innerHTML = `
            <span>${fav.name}</span>
            <button class="remove-fav-btn" data-city="${fav.name}">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        favoriteList.appendChild(item);
    });

    // Tambahkan event listener untuk memuat favorit dan menghapus
    favoriteList.querySelectorAll('.city-item span').forEach(span => {
        span.addEventListener('click', (e) => {
            const item = e.target.closest('.city-item');
            const cityName = item.textContent.trim().replace('x', '').replace(/\s*$/, ''); 
            getWeatherDetails(cityName, item.getAttribute('data-lat'), item.getAttribute('data-lon'));
        });
    });

    favoriteList.querySelectorAll('.remove-fav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavorite(btn.getAttribute('data-city'));
        });
    });
}

function removeFavorite(city) {
    favorites = favorites.filter(fav => fav.name !== city);
    localStorage.setItem('weather_favorites', JSON.stringify(favorites));
    renderFavorites();
    // Jika kota yang sedang dilihat adalah kota yang dihapus, perbarui tombol
    if (currentCityName === city) {
        updateFavoriteButton();
    }
}


function renderHistory() {
    if (!historyList) return; 
    historyList.innerHTML = '';
    if (history.length === 0) {
        historyList.innerHTML = '<p class="placeholder">No search history.</p>';
        return;
    }

    history.forEach(hist => {
        const item = document.createElement('div');
        item.className = 'city-item';
        item.setAttribute('data-lat', hist.lat);
        item.setAttribute('data-lon', hist.lon);
        item.innerHTML = `
            <span>${hist.name}</span>
        `;
        historyList.appendChild(item);
    });

    // Tambahkan event listener untuk memuat riwayat
    historyList.querySelectorAll('.city-item').forEach(item => {
        item.addEventListener('click', () => {
            const cityName = item.querySelector('span').textContent;
            getWeatherDetails(cityName, item.getAttribute('data-lat'), item.getAttribute('data-lon'));
        });
    });
}


// --- EVENT LISTENERS UTAMA ---

if (unitSwitchBtn) unitSwitchBtn.addEventListener('click', () => {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    unitSwitchBtn.innerHTML = currentUnit === 'C' ? '&deg;C / &deg;F' : '&deg;F / &deg;C';
    updateWeatherDisplay(weatherDataCache, forecastDataCache);
});

if (modeSwitchBtn) modeSwitchBtn.addEventListener('click', () => {
    const body = document.body;
    const isLightMode = body.classList.toggle('light-mode');

    if (isLightMode) {
        modeSwitchBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        modeSwitchBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
});

if (cityInput) cityInput.addEventListener('input', (e) => getCitySuggestions(e.target.value));

if (favoriteBtn) favoriteBtn.addEventListener('click', toggleFavorite);

// Event listener untuk menutup pop-up
if (closePopupBtn) closePopupBtn.addEventListener('click', closeErrorPopup);
if (errorPopup) errorPopup.addEventListener('click', (e) => {
    if (e.target === errorPopup) {
        closeErrorPopup();
    }
});


if (searchBtn) searchBtn.addEventListener('click', getCityCoordinates);
if (locationBtn) locationBtn.addEventListener('click', getUserCoordinates)
if (cityInput) cityInput.addEventListener('keyup', e => e.key === 'Enter' && getCityCoordinates());
window.addEventListener('load', () => {
    // Memuat data default (kosongkan cityInput agar bisa default ke current location/default city)
    cityInput.value = ''; 
    getCityCoordinates(); 
    renderFavorites();
    renderHistory();
});