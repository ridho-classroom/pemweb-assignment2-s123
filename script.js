const API_KEY = "e4f79393a9f78384e9187c757b7a9017";

const statusEl = document.getElementById("status");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const useLocationBtn = document.getElementById("useLocationBtn");
const currentCard = document.getElementById("currentCard");
const forecastEl = document.getElementById("forecast");
const aqiCard = document.getElementById("aqiCard");
const unitToggle = document.getElementById("unitToggle");
const themeToggle = document.getElementById("themeToggle");
const favoritesList = document.getElementById("favoritesList");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const loader = document.getElementById("loader");
const toast = document.getElementById("toast");
const suggestions = document.getElementById("suggestions");

let unit = localStorage.getItem("wd_unit") || "metric";
let theme = localStorage.getItem("wd_theme") || "light";
let history = JSON.parse(localStorage.getItem("wd_history") || "[]");
let favorites = JSON.parse(localStorage.getItem("wd_favorites") || "[]");
let cache = JSON.parse(localStorage.getItem("wd_cache") || "{}");

document.documentElement.setAttribute("data-theme", theme==="dark"?"dark":"light");
unitToggle.innerText = unit==="metric"?"°C":"°F";
themeToggle.setAttribute("aria-pressed", theme==="dark");

function showToast(msg, t=3000){toast.innerText=msg;toast.hidden=false;setTimeout(()=>toast.hidden=true,t);}
function setStatus(msg){statusEl.innerText=msg;}
function setLoading(on){loader.hidden=!on;setStatus(on?"Loading…":"");}
function saveAll(){localStorage.setItem("wd_unit",unit);localStorage.setItem("wd_theme",theme);localStorage.setItem("wd_history",JSON.stringify(history));localStorage.setItem("wd_favorites",JSON.stringify(favorites));localStorage.setItem("wd_cache",JSON.stringify(cache));}

function getCached(city){const e=cache[city];if(!e)return null;if(Date.now()-e.ts>600000){delete cache[city];saveAll();return null;}return e;}
function setCached(city,data){cache[city]={ts:Date.now(),...data};saveAll();}

async function fetchJson(url){const r=await fetch(url);if(!r.ok)throw new Error(r.statusText);return r.json();}

async function fetchWeather(city){
  if(!city)return;
  setLoading(true);
  try{
    const cached=getCached(city);
    if(cached){renderCurrent(cached.current);renderForecast(cached.forecast);renderAQI(cached.aqi);setLoading(false);return;}
    const cur=await fetchJson(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${unit}`);
    const f=await fetchJson(`https://api.openweathermap.org/data/2.5/forecast?lat=${cur.coord.lat}&lon=${cur.coord.lon}&appid=${API_KEY}&units=${unit}`);
    const aqi=await fetchJson(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${cur.coord.lat}&lon=${cur.coord.lon}&appid=${API_KEY}`);
    renderCurrent(cur);renderForecast(f.list);renderAQI(aqi);
    setCached(cur.name,{current:cur,forecast:f.list,aqi:aqi});
    addHistory(cur.name);
    setStatus(`Weather updated: ${cur.name}`);
  }catch(e){showToast("Error: "+e.message);}finally{setLoading(false);}
}

function renderCurrent(d){
  currentCard.innerHTML=`<h2>${d.name}, ${d.sys.country}</h2>
  <div class="current-temp">${Math.round(d.main.temp)}°${unit==="metric"?"C":"F"}</div>
  <div>${d.weather[0].description}</div>
  <div class="current-meta">Feels like ${Math.round(d.main.feels_like)}°, Humidity ${d.main.humidity}%</div>
  <div class="current-meta">Wind ${d.wind.speed} ${unit==="metric"?"m/s":"mph"}</div>
  <button id="favBtn" class="btn small">${favorites.includes(d.name)?"★ Favorited":"☆ Add Favorite"}</button>`;
  document.getElementById("favBtn").addEventListener("click",()=>toggleFavorite(d.name));
}

function renderForecast(list){
  forecastEl.innerHTML="";
  const daily={};
  list.forEach(it=>{const d=new Date(it.dt*1000);const k=d.toISOString().slice(0,10);if(!daily[k])daily[k]=[];daily[k].push(it);});
  Object.keys(daily).slice(0,5).forEach(k=>{
    const arr=daily[k];const temps=arr.map(x=>x.main.temp);
    const min=Math.min(...temps),max=Math.max(...temps);
    const icon=arr[0].weather[0].icon,desc=arr[0].weather[0].description;
    const day=new Date(arr[0].dt*1000).toLocaleDateString(undefined,{weekday:"short"});
    forecastEl.innerHTML+=`<div class="day"><div class="day-name">${day}</div><img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}"/><div class="day-temp">${Math.round(max)}° / ${Math.round(min)}°</div><div class="day-desc small">${desc}</div></div>`;
  });
}

function renderAQI(data){
  if(!data||!data.list)return;
  const aqi=data.list[0].main.aqi;
  const levels=["Good","Fair","Moderate","Poor","Very Poor"];
  aqiCard.innerHTML=`<h3>Air Quality</h3><p>${levels[aqi-1]} (Index ${aqi})</p>`;
}

function addHistory(c){history=history.filter(x=>x.toLowerCase()!==c.toLowerCase());history.unshift(c);if(history.length>8)history.pop();saveAll();renderHistory();}
function renderHistory(){historyList.innerHTML=history.length?history.map(c=>`<li><span>${c}</span><button data-city="${c}">View</button></li>`).join(""):"<li class='small'>No history</li>";historyList.querySelectorAll("button").forEach(b=>b.onclick=()=>fetchWeather(b.dataset.city));}
function toggleFavorite(c){if(favorites.includes(c))favorites=favorites.filter(x=>x!==c);else favorites.push(c);saveAll();renderFavorites();fetchWeather(c);}
function renderFavorites(){favoritesList.innerHTML=favorites.length?favorites.map(c=>`<li><span>${c}</span><button data-city="${c}">View</button><button data-remove="${c}">✖</button></li>`).join(""):"<li class='small'>No favorites</li>";favoritesList.querySelectorAll("button[data-city]").forEach(b=>b.onclick=()=>fetchWeather(b.dataset.city));favoritesList.querySelectorAll("button[data-remove]").forEach(b=>b.onclick=()=>{favorites=favorites.filter(x=>x!==b.dataset.remove);saveAll();renderFavorites();});}

// autocomplete geocoding
cityInput.addEventListener("input",async()=>{
  const q=cityInput.value.trim();if(!q){suggestions.hidden=true;return;}
  try{const res=await fetchJson(`https://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=5&appid=${API_KEY}`);
    suggestions.innerHTML=res.map((c,i)=>`<li role="option" data-city="${c.name}">${c.name}, ${c.country}</li>`).join("");
    suggestions.hidden=false;
    suggestions.querySelectorAll("li").forEach(li=>li.onclick=()=>{cityInput.value=li.dataset.city;suggestions.hidden=true;fetchWeather(li.dataset.city);});
  }catch{suggestions.hidden=true;}
});

searchBtn.onclick=()=>{if(cityInput.value.trim())fetchWeather(cityInput.value.trim());};
useLocationBtn.onclick=()=>{navigator.geolocation.getCurrentPosition(pos=>{fetchJson(`https://api.openweathermap.org/data/2.5/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${API_KEY}&units=${unit}`).then(d=>fetchWeather(d.name));});};
unitToggle.onclick=()=>{unit=unit==="metric"?"imperial":"metric";saveAll();unitToggle.innerText=unit==="metric"?"°C":"°F";const h=currentCard.querySelector("h2");if(h)fetchWeather(h.innerText.split(",")[0]);};
themeToggle.onclick=()=>{theme=theme==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",theme==="dark"?"dark":"light");saveAll();themeToggle.setAttribute("aria-pressed",theme==="dark");};
clearHistoryBtn.onclick=()=>{history=[];saveAll();renderHistory();};

function init(){renderFavorites();renderHistory();fetchWeather("Jakarta");}
init();
