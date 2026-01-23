// =========================
// Date
// =========================
function updateDate() {
    const dateSpan = document.getElementById('date');
    const now = new Date();

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const dayName = days[now.getDay()];
    const month = now.getMonth() + 1; // JS months start at 0
    const day = now.getDate();
    const year = String(now.getFullYear()).slice(-2); // last two digits

    dateSpan.textContent = `${dayName}, ${month}/${day}/${year}`;
}

document.addEventListener("DOMContentLoaded", () => {
    updateDate();
});


// Refresh the date automatically at midnight
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        updateDate();
    }
}, 60000); // checks once per minute



// =========================
// Clock
// =========================
function updateClock() {
    const clockSpan = document.getElementById('clock');
    const now = new Date();

    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12

    const paddedMinutes = minutes < 10 ? "0" + minutes : minutes;
    const timeString = `${hours}:${paddedMinutes} ${ampm}`;

    clockSpan.textContent = timeString;
}

// Update every second
setInterval(updateClock, 1000);
updateClock(); // run immediately


// ==============================
// Weather (Kansas-Optimized)
// ==============================

// Full icon map for Kansas conditions (day + night)
const weatherIcons = {
    // Clear / Fair
    "clear-day": "☀️",
    "clear-night": "🌕",

    // Mostly clear / partly cloudy
    "mostly-sunny": "🌤️",
    "mostly-clear-night": "🌖",
    "partly-cloudy-day": "⛅",
    "partly-cloudy-night": "🌙",

    // Cloud cover
    "cloudy": "☁️",
    "overcast": "☁️",

    // Rain
    "light-rain": "🌦️",
    "rain": "🌧️",
    "heavy-rain": "🌧️",
    "drizzle": "🌦️",

    // Storms
    "thunderstorm": "⛈️",
    "severe-thunderstorm": "⛈️",

    // Winter
    "snow": "❄️",
    "snow-showers": "🌨️",
    "wintry-mix": "🌨️",
    "sleet": "🌨️",
    "freezing-rain": "🧊",
    "ice": "🧊",

    // Visibility
    "fog": "🌫️",
    "mist": "🌫️",
    "haze": "🌫️",

    // Wind
    "windy": "🌬️",
    "breezy": "🌬️",

    // Severe
    "tornado": "🌪️",
    "funnel-cloud": "🌪️",

    // Fallback
    "unknown": "🌀"
};


// Smart icon selector
function getWeatherIcon(condition, isNight = false) {
    const c = condition.toLowerCase();

    // Night overrides for clear/partly cloudy
    if (isNight) {
        if (c.includes("clear")) return weatherIcons["clear-night"];
        if (c.includes("partly")) return weatherIcons["partly-cloudy-night"];
        if (c.includes("mostly")) return weatherIcons["mostly-clear-night"];
    }

    // Daytime logic
    if (c.includes("sun") || c.includes("clear")) return weatherIcons["clear-day"];
    if (c.includes("mostly")) return weatherIcons["mostly-sunny"];
    if (c.includes("partly")) return weatherIcons["partly-cloudy-day"];
    if (c.includes("cloud")) return weatherIcons["cloudy"];
    if (c.includes("overcast")) return weatherIcons["overcast"];

    if (c.includes("drizzle")) return weatherIcons["drizzle"];
    if (c.includes("light rain")) return weatherIcons["light-rain"];
    if (c.includes("rain")) return weatherIcons["rain"];
    if (c.includes("heavy rain")) return weatherIcons["heavy-rain"];

    if (c.includes("thunder")) return weatherIcons["thunderstorm"];
    if (c.includes("storm")) return weatherIcons["severe-thunderstorm"];

    if (c.includes("snow")) return weatherIcons["snow"];
    if (c.includes("shower")) return weatherIcons["snow-showers"];
    if (c.includes("mix")) return weatherIcons["wintry-mix"];
    if (c.includes("sleet")) return weatherIcons["sleet"];
    if (c.includes("freezing")) return weatherIcons["freezing-rain"];
    if (c.includes("ice")) return weatherIcons["ice"];

    if (c.includes("fog") || c.includes("mist") || c.includes("haze"))
        return weatherIcons["fog"];

    if (c.includes("wind")) return weatherIcons["windy"];
    if (c.includes("breezy")) return weatherIcons["breezy"];

    if (c.includes("tornado") || c.includes("funnel"))
        return weatherIcons["tornado"];

    return weatherIcons["unknown"];
}


// Auto-detect day or night based on local time
function isNightTime() {
    const now = new Date();
    const hour = now.getHours();
    return hour < 6 || hour >= 18; // Night = 6pm–6am
}


// Weather configuration
const weatherConfig = {
  apiKey: "cebf0d4f222fb9dc3f7349133f7db964",
  lat: 38.0683,      // Prescott, KS
  lon: -94.7069
};

// Main update function
async function updateWeather() {
  const weatherSpan = document.getElementById("weather");
  const weatherText = weatherSpan.querySelector(".weather-text");
  const weatherIcon = weatherSpan.querySelector(".weather-icon");

  const { lat, lon, apiKey } = weatherConfig;

  // Update multi-day forecast
  updateMultiDayForecast(lat, lon);

  let condition = "Unavailable";
  let temperature = "--°F";
  let windSpeed = "--";
  let humidity = "--";
  let feelsLike = "--°F";

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
    );
    const data = await response.json();

    condition = data.weather[0].main;
    temperature = Math.round(data.main.temp) + "°F";
    windSpeed = Math.round(data.wind.speed) + " mph";
    humidity = data.main.humidity + "%";
    feelsLike = Math.round(data.main.feels_like) + "°F";
  } catch (error) {
    console.error("Weather API error:", error);
  }

  const isNight = isNightTime();
  const icon = getWeatherIcon(condition, isNight);

  // Top bar
  weatherSpan.dataset.icon = icon;
  weatherText.innerText = `${condition}, ${temperature}`;
  weatherIcon.innerText = icon;

  // Dropdown details
  const windEl = document.getElementById("wind");
  const humidityEl = document.getElementById("humidity");
  const feelsLikeEl = document.getElementById("feels-like");

  if (windEl) windEl.innerText = `🌬️ Wind: ${windSpeed}`;
  if (humidityEl) humidityEl.innerText = `💧 Humidity: ${humidity}`;
  if (feelsLikeEl) feelsLikeEl.innerText = `🌡️ Feels Like: ${feelsLike}`;

  // Updated time
  const now = new Date();
  const timeString = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const updatedEl = document.getElementById("weather-updated");
  if (updatedEl) {
    updatedEl.innerText = `Updated ${timeString}`;
  }
}




   // end updateWeather

async function updateMultiDayForecast(lat, lon) {

  const { apiKey } = weatherConfig;
 
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const dayIndices = [8, 16, 24, 32, 39];
    const today = new Date();
    const dayLabels = ["Tomorrow"];

    for (let i = 2; i <= 5; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        const weekday = futureDate.toLocaleDateString("en-US", { weekday: "short" });
        dayLabels.push(weekday);
    }


    const forecastDivs = document.querySelectorAll(".forecast-day");

    dayIndices.forEach((index, i) => {
      const entry = data.list[index];
      const condition = entry.weather[0].main;
      const temp = Math.round(entry.main.temp);
      const icon = getWeatherIcon(condition, false);

      forecastDivs[i].querySelector(".day-label").innerText = dayLabels[i];
      forecastDivs[i].querySelector(".day-icon").innerText = icon;
      forecastDivs[i].querySelector(".day-temp").innerText = `${temp}°F`;
    });

  } catch (error) {
    console.error("Multiday forecast error:", error);
  }
}    // end updateMultiDayForecast


// Initial run + auto-refresh every 10 minutes
updateWeather();
setInterval(updateWeather, 600000);

const weatherLink = document.getElementById("weather");
const weatherPanel = document.getElementById("weather-panel");
const weatherCaret = weatherLink.querySelector(".weather-caret");

weatherLink.addEventListener("click", () => {
  const isHidden = weatherPanel.classList.contains("hidden");

  if (isHidden) {
    weatherPanel.classList.remove("hidden");
    weatherPanel.classList.add("show");

    // Refresh weather when dropdown opens
    updateWeather();
  } else {
    weatherPanel.classList.remove("show");
    setTimeout(() => {
      weatherPanel.classList.add("hidden");
    }, 250); // matches CSS transition
  }

  weatherCaret.classList.toggle("rotate");
});
