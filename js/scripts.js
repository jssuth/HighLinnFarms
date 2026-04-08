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

async function getCoordinatesForCity(city) {
  const apiKey = weatherConfig.apiKey;
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.length === 0) {
      return null;
    }

    return {
      lat: data[0].lat,
      lon: data[0].lon,
      name: `${data[0].name}, ${data[0].state || data[0].country}`
    };
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}


// Main update function
async function updateWeather() {
  const weatherSpan = document.getElementById("weather-link");
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

// WEATHER DROPDOWN TOGGLE
const weatherLink = document.getElementById('weather-link');
const weatherPanel = document.getElementById('weather-panel');
const weatherCaret = weatherLink.querySelector('.weather-caret');

weatherLink.addEventListener('click', (e) => {
  e.stopPropagation();

  const isHidden = weatherPanel.classList.contains('hidden');

  if (isHidden) {
    weatherPanel.classList.remove('hidden');
    weatherPanel.classList.add('show');
    updateWeather(); // refresh when opening
  
  } else {
    weatherPanel.classList.remove('show');

    // Revert to Prescott when closing
    weatherConfig.lat = 38.0683;
    weatherConfig.lon = -94.7069;

    // Reset location label
    const locEl = document.getElementById("weather-location");
    locEl.innerText = "📍 Prescott, KS";

    // Clear forecast blocks (optional but clean)
    document.querySelectorAll(".forecast-day").forEach((block) => {
      block.querySelector(".day-label").innerText = "--";
      block.querySelector(".day-icon").innerText = "🌀";
      block.querySelector(".day-temp").innerText = "--°F";
    });

     // Refresh weather
    updateWeather();

    setTimeout(() => {
      weatherPanel.classList.add('hidden');
    }, 250);
 }



  weatherCaret.classList.toggle('rotate');
});

// WEATHER CITY UPDATE
const cityInput = document.getElementById("weather-city-input");
const citySubmit = document.getElementById("weather-city-submit");

citySubmit.addEventListener("click", async () => {
  const city = cityInput.value.trim();
  if (!city) return;

  // ZIP detection (5 digits)
if (/^\d{5}$/.test(city)) {
    try {
        const apiKey = weatherConfig.apiKey;
        const zipUrl = `https://api.openweathermap.org/data/2.5/weather?zip=${city},US&units=imperial&appid=${apiKey}`;
        const response = await fetch(zipUrl);
        const data = await response.json();

        if (data.cod !== 200) {
            alert("ZIP not found. Try again.");
            return;
        }

        // Update config with ZIP coordinates
        weatherConfig.lat = data.coord.lat;
        weatherConfig.lon = data.coord.lon;

        // Update location label
        const locEl = document.getElementById("weather-location");
        locEl.innerText = `📍 ${data.name}, ${data.sys.country}`;

        // Refresh weather
        updateWeather();

        // Clear input
        cityInput.value = "";
        return; // STOP — do not run city/state logic
    } catch (err) {
        console.error("ZIP lookup error:", err);
        alert("ZIP lookup failed.");
        return;
    }
}

// ===============================
// CITY + STATE HANDLING (Option #2)
// ===============================

if (city.includes(",")) {
    const parts = city.split(",").map(p => p.trim());

    if (parts.length === 2) {
        const cityName = parts[0];
        let statePart = parts[1].toLowerCase();

        // Special case: OpenWeather uses GB, not UK
        if (statePart === "uk") statePart = "gb";

        // Full list of US states
        const states = {
            "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
            "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
            "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
            "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
            "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
            "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
            "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
            "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
            "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
            "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
            "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
            "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
            "wisconsin": "WI", "wyoming": "WY"
        };

        // Convert full state name → abbreviation
        if (states[statePart]) {
            statePart = states[statePart];
        }

        // If valid 2‑letter abbreviation
        const validAbbrev = Object.values(states);
        if (validAbbrev.includes(statePart.toUpperCase())) {

            const formatted = `${cityName},${statePart.toUpperCase()},US`;
            const coords = await getCoordinatesForCity(formatted);

            if (!coords) {
                alert("City/state not found. Check spelling.");
                return;
            }

            weatherConfig.lat = coords.lat;
            weatherConfig.lon = coords.lon;

            const locEl = document.getElementById("weather-location");
            locEl.innerText = `📍 ${coords.name}`;

            updateWeather();
            cityInput.value = "";
            return; // STOP — do not run fallback
        }

        // Foreign country case (e.g., London, GB)
        const formattedForeign = `${cityName},${statePart}`;
        const coordsForeign = await getCoordinatesForCity(formattedForeign);

        if (coordsForeign) {
            weatherConfig.lat = coordsForeign.lat;
            weatherConfig.lon = coordsForeign.lon;

            const locEl = document.getElementById("weather-location");
            locEl.innerText = `📍 ${coordsForeign.name}`;

            updateWeather();
            cityInput.value = "";
            return;
        }
    }
}


  const coords = await getCoordinatesForCity(city);

  if (!coords) {
    alert("City not found. Try 'City, State' or ZIP.");
    return;
  }

  // Update config
  weatherConfig.lat = coords.lat;
  weatherConfig.lon = coords.lon;

  // Update location label
  const locEl = document.getElementById("weather-location");
  locEl.innerText = `📍 ${coords.name}`;

  // Refresh weather
  updateWeather();

  // Clear the text box
  cityInput.value = "";
});

//About page viewer logic
(function () {
  function setupViewer(viewerEl) {
    const thumbsWrap = viewerEl.querySelector("[data-items]");
    const thumbs = Array.from(thumbsWrap.querySelectorAll(".thumb"));
    const imgEl = viewerEl.querySelector('img.viewer-media[data-type="image"]');
    const pdfEl = viewerEl.querySelector('iframe.viewer-media[data-type="pdf"]');
    const countEl = viewerEl.querySelector(".viewer-count");
    const prevBtn = viewerEl.querySelector("[data-prev]");
    const nextBtn = viewerEl.querySelector("[data-next]");
    const closeBtn = viewerEl.querySelector("[data-viewer-close]");

    let index = 0;

    function show(i) {
      index = (i + thumbs.length) % thumbs.length;
      thumbs.forEach(t => t.classList.remove("is-active"));
      const active = thumbs[index];
      active.classList.add("is-active");

      const src = active.getAttribute("data-src");
      const kind = active.getAttribute("data-kind");

      // swap media type
      imgEl.classList.remove("is-active");
      pdfEl.classList.remove("is-active");

      if (kind === "pdf") {
        pdfEl.src = src;
        pdfEl.classList.add("is-active");
      } else {
        imgEl.src = src;
        imgEl.alt = active.getAttribute("aria-label") || "";
        imgEl.classList.add("is-active");
      }

      if (countEl) countEl.textContent = `${index + 1} / ${thumbs.length}`;
    }

    thumbs.forEach((btn, i) => {
      btn.addEventListener("click", () => show(i));
    });

    prevBtn.addEventListener("click", () => show(index - 1));
    nextBtn.addEventListener("click", () => show(index + 1));

    closeBtn.addEventListener("click", () => {
      viewerEl.classList.remove("is-open");
      viewerEl.setAttribute("aria-hidden", "true");
      // reset to first item (portrait) when closing
      show(0);
    });

    // initialize
    show(0);
  }

  // Open buttons
  document.querySelectorAll("[data-viewer-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-viewer-open");
      const viewer = document.getElementById(id);
      if (!viewer) return;

      if (!viewer.dataset.ready) {
        setupViewer(viewer);
        viewer.dataset.ready = "true";
      }
      viewer.classList.add("is-open");
      viewer.setAttribute("aria-hidden", "false");
      viewer.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();

// =====================================
// ABOUT PAGE ARCHIVE VIEWERS
// =====================================

const ARCHIVE_ITEMS = {
  "viewer-walter-j": [
    {
      type: "image",
      title: "Portrait",
      label: "Portrait",
      src: "archives/walter-j/portrait.jpg"
    },
    {
      type: "image",
      title: "Farm Location",
      label: "Farm ",
      caption: "Location: Original farm of Walter J. Sutherland, ¼ mile west of the Kansas/Missouri State Line",
      src: "archives/walter-j/farm-location.jpg"
    },
    {
      type: "html",
      title: "Prosperous Farmer (1899)",
      label: "1899",
      src: "archives/walter-j/article-1899-prosperous-farmer.html"
    },
    {
      type: "html",
      title: "Citizen of Prescott (1884–1887)",
      label: "1884-87",
      src: "archives/walter-j/clippings-citizen-of-prescott.html"
    },
    {
      type: "html",
      title: "On the Farm (1887–1901)",
      label: "Farm Life",
      src: "archives/walter-j/clippings-on-the-farm.html"
    },
    {
      type: "html",
      title: "Later Years & Family (1889–1921)",
      label: "Later Years",
      src: "archives/walter-j/clippings-later-years.html"
    }
  ],

  "viewer-walter-mason": [
  {
    type: "image",
    title: "Mason & Maud",
    label: "Portrait",
    src: "archives/walter-mason/mason-maud.jpg"
  },
  {
    type: "image",
    title: "Family at the Farm",
    label: "Farm 1912",
    caption: "Taken in 1912 in the yard of their farmhouse east of Prescott. Mason is holding the mules, daughter Florence (Kite) holds the horse that son Billy, age 4, is riding. Maude is seated with baby Carl on her lap and Mildred stands beside her. Billy died in July 1919 as the result of a fall from a horse.",
    src: "archives/walter-mason/mason-country-home.jpg"
  }
],

"viewer-carl-mason": [
  {
    type: "image",
    title: "Carl & Mary Jane",
    label: "Together",
    src: "archives/carl-mason/carl-mary.jpg"
  },
  {
    type: "image",
    title: "Carl at Mizzou",
    label: "Carl 1933",
    caption: "Carl Mason Sutherland, Delta Sigma Phi fraternity portrait, University of Missouri, 1933.",
    src: "archives/carl-mason/carl-portrait.jpg"
  },
  {
    type: "image",
    title: "Mary Jane Portrait",
    label: "Mary Jane",
    caption: "Mary Jane Harryman, portrait photograph, circa mid-1930s.",
    src: "archives/carl-mason/maryj-portrait.jpg"
  }
]


};

function renderArchiveStage(stageEl, item) {
  stageEl.innerHTML = "";

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.title || "Image";
    img.loading = "lazy";
    stageEl.appendChild(img);
    if (item.caption) {
      const cap = document.createElement("p");
      cap.className = "viewer-caption";
      cap.textContent = item.caption;
      stageEl.appendChild(cap);
    }
    return;
  }

  if (item.type === "html") {
    const iframe = document.createElement("iframe");
    iframe.src = item.src;
    iframe.title = item.title || "Archive item";
    iframe.loading = "lazy";
    stageEl.appendChild(iframe);
    return;
  }

  if (item.type === "pdf") {
    const iframe = document.createElement("iframe");
    iframe.src = item.src;
    iframe.title = item.title || "Document";
    iframe.loading = "lazy";
    stageEl.appendChild(iframe);
  }
}

function buildArchiveThumbs(thumbsEl, items, activeIndex, onPick) {
  thumbsEl.innerHTML = "";

  if (items.length <= 1) {
    thumbsEl.style.display = "none";
    return;
  }

  thumbsEl.style.display = "flex";

  items.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "viewer-thumb" + (index === activeIndex ? " is-active" : "");
    btn.title = item.title || `Item ${index + 1}`;

    if (item.type === "image") {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.title || "Thumbnail";
      img.loading = "lazy";
      btn.appendChild(img);
    } else {
      btn.textContent = item.label || (item.type === "html" ? "Article" : "PDF");
      btn.style.fontWeight = "700";
      btn.style.padding = "18px 10px";
      btn.style.background = "#fff";
    }

    btn.addEventListener("click", () => onPick(index));
    thumbsEl.appendChild(btn);
  });
}

function initArchiveViewer(viewerEl) {
  const viewerId = viewerEl.id;
  const items = ARCHIVE_ITEMS[viewerId] || [];
  if (!items.length) return;

  const stage = viewerEl.querySelector(".viewer-stage");
  const thumbs = viewerEl.querySelector(".viewer-thumbs");
  const counter = viewerEl.querySelector(".viewer-counter");
  const prevBtn = viewerEl.querySelector(".viewer-prev");
  const nextBtn = viewerEl.querySelector(".viewer-next");
  const closeBtn = viewerEl.querySelector(".viewer-close");

  let currentIndex = 0;

  function updateViewer() {
    renderArchiveStage(stage, items[currentIndex]);
    counter.textContent = `${currentIndex + 1} / ${items.length}`;

    buildArchiveThumbs(thumbs, items, currentIndex, (newIndex) => {
      currentIndex = newIndex;
      updateViewer();
    });

    const single = items.length <= 1;
    prevBtn.disabled = single;
    nextBtn.disabled = single;
  }

  prevBtn.onclick = () => {
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    updateViewer();
  };

  nextBtn.onclick = () => {
    currentIndex = (currentIndex + 1) % items.length;
    updateViewer();
  };

  closeBtn.onclick = () => {
    viewerEl.hidden = true;
    currentIndex = 0; // reset to portrait
    updateViewer();

    const toggle = document.querySelector(`[data-viewer="${viewerId}"]`);
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  };

  updateViewer();
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".viewer-toggle");
  if (!toggle) return;

  const viewerId = toggle.getAttribute("data-viewer");
  const viewerEl = document.getElementById(viewerId);
  if (!viewerEl) return;

  viewerEl.hidden = false;
  toggle.setAttribute("aria-expanded", "true");

  if (!viewerEl.dataset.initialized) {
    initArchiveViewer(viewerEl);
    viewerEl.dataset.initialized = "true";
  }
});


// ============================================================
// SEASONAL TAB VIEWER — Properties Page
// ============================================================

const SEASONAL_PHOTOS = {
  pleasanton: {
    winter: [
      {
        src: "images/properties/pleasanton/pleasanton-winter-01-cabin.jpg",
        caption: "The Pleasanton cabin under heavy snowfall"
      },
      {
        src: "images/properties/pleasanton/pleasanton-winter-02-icicle-view.jpg",
        caption: "Winter sun through icicles — view from the deck"
      },
      {
        src: "images/properties/pleasanton/pleasanton-winter-03-snowy-woods.jpg",
        caption: "Fresh snow blankets the oak woodland"
      },
      {
        src: "images/properties/pleasanton/pleasanton-winter-04-snowy-oaks.jpg",
        caption: "Heavy snow bends the oak canopy into sweeping arches"
      },
      {
        src: "images/properties/pleasanton/pleasanton-winter-05-turkeys.jpg",
        caption: "Wild turkeys foraging through the snowy hillside"
      },
      {
        src: "images/properties/pleasanton/pleasanton-winter-06-deer.jpg",
        caption: "A herd of whitetail deer move through the timber"
      }
    ],
    spring: [
      {
        src: "images/properties/pleasanton/pleasanton-spring-01-cabin.jpg",
        caption: "Early spring at the cabin — new timber retaining walls taking shape"
      },
      {
        src: "images/properties/pleasanton/pleasanton-spring-02-green-woods.jpg",
        caption: "The oak woodland bursts to life with fresh spring green"
      },
      {
        src: "images/properties/pleasanton/pleasanton-spring-03-hailstorm.jpg",
        caption: "A spring hailstorm rolls through the timber — Kansas weather at its finest"
      },
      {
        src: "images/properties/pleasanton/pleasanton-spring-04-oak-sky.jpg",
        caption: "Spring arriving — first green buds beneath towering oaks"
      },
      {
        src: "images/properties/pleasanton/pleasanton-spring-05-turkeys.jpg",
        caption: "A tom turkey fans his tail for the hens on a frosty spring morning"
      }
    ],
    summer: [
      {
        src: "images/properties/pleasanton/pleasanton-summer-01-cabin.jpg",
        caption: "The Pleasanton cabin in full summer — green lawn and lush canopy"
      },
      {
        src: "images/properties/pleasanton/pleasanton-summer-02-putting-green.jpg",
        caption: "The property's own putting green tucked into the summer timber"
      },
      {
        src: "images/properties/pleasanton/pleasanton-summer-03-timber-trail.jpg",
        caption: "A winding trail through the oak timber on a summer day"
      },
      {
        src: "images/properties/pleasanton/pleasanton-summer-04-woodland.jpg",
        caption: "Summer shade beneath the oak canopy — cool and quiet"
      },
      {
        src: "images/properties/pleasanton/pleasanton-summer-05-field-view.jpg",
        caption: "Looking out across the open meadow to the timber beyond"
      },
      {
        src: "images/properties/pleasanton/pleasanton-summer-06-gate-drive.jpg",
        caption: "The rustic gate marks the entrance — the drive winds into the trees"
      }
    ],
    fall: [
      {
        src: "images/properties/pleasanton/pleasanton-fall-01-cabin-foliage.jpg",
        caption: "The cabin nestled in peak fall color — golden oaks all around"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-02-canopy.jpg",
        caption: "Fall color sweeps through the canopy — yellows, oranges, and greens"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-03-late-fall.jpg",
        caption: "Late fall in the timber — leaf-covered ground and a pop of color"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-04-trail.jpg",
        caption: "A sunlit fall trail winds through the bare oaks"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-05-sunset.jpg",
        caption: "A Kansas fall sunset — pink and purple skies through the timber"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-06-turkeys.jpg",
        caption: "Two tom turkeys fan out in a full fall display"
      },
      {
        src: "images/properties/pleasanton/pleasanton-fall-07-deer-deck.jpg",
        caption: "Deer browse the timber as seen right from the cabin deck"
      }
    ]
  },
  prescott: {
    winter: [],
    spring: [],
    summer: [],
    fall: []
  }
};

const SEASON_COMING_SOON = {
  winter: { icon: "❄️", label: "Winter" },
  spring: { icon: "🌱", label: "Spring" },
  summer: { icon: "☀️", label: "Summer" },
  fall:   { icon: "🍂", label: "Fall" }
};

function initSeasonalViewer(viewerEl) {
  const property = viewerEl.dataset.property;
  if (!property || !SEASONAL_PHOTOS[property]) return;

  const tabs = viewerEl.querySelectorAll(".season-tab");
  const panels = viewerEl.querySelectorAll(".season-panel");

  // Track current index per season
  const currentIndex = {};
  Object.keys(SEASONAL_PHOTOS[property]).forEach(s => { currentIndex[s] = 0; });

  function renderPanel(season) {
    const panel = viewerEl.querySelector(`.season-panel[data-season="${season}"]`);
    if (!panel) return;
    const photos = SEASONAL_PHOTOS[property][season];

    panel.innerHTML = "";

    if (!photos || photos.length === 0) {
      // Coming soon
      const info = SEASON_COMING_SOON[season] || { icon: "📷", label: season };
      panel.innerHTML = `
        <div class="season-coming-soon">
          <span class="season-icon">${info.icon}</span>
          <p>${info.label} photos coming soon — check back later!</p>
        </div>`;
      return;
    }

    // Build gallery
    const gallery = document.createElement("div");
    gallery.className = "season-gallery";

    // Stage
    const stage = document.createElement("div");
    stage.className = "season-stage";
    const img = document.createElement("img");
    img.src = photos[currentIndex[season]].src;
    img.alt = photos[currentIndex[season]].caption;
    const caption = document.createElement("div");
    caption.className = "season-caption";
    caption.textContent = photos[currentIndex[season]].caption;
    stage.appendChild(img);
    stage.appendChild(caption);

    // Nav row
    const nav = document.createElement("div");
    nav.className = "season-nav";

    const prevBtn = document.createElement("button");
    prevBtn.className = "season-nav-btn";
    prevBtn.setAttribute("aria-label", "Previous photo");
    prevBtn.innerHTML = "&#8592;";

    const counter = document.createElement("div");
    counter.className = "season-counter";
    counter.textContent = `${currentIndex[season] + 1} / ${photos.length}`;

    const nextBtn = document.createElement("button");
    nextBtn.className = "season-nav-btn";
    nextBtn.setAttribute("aria-label", "Next photo");
    nextBtn.innerHTML = "&#8594;";

    nav.appendChild(prevBtn);
    nav.appendChild(counter);
    nav.appendChild(nextBtn);

    // Thumbs
    const thumbsRow = document.createElement("div");
    thumbsRow.className = "season-thumbs";

    photos.forEach((photo, i) => {
      const thumb = document.createElement("div");
      thumb.className = "season-thumb" + (i === currentIndex[season] ? " active" : "");
      const tImg = document.createElement("img");
      tImg.src = photo.src;
      tImg.alt = photo.caption;
      tImg.loading = "lazy";
      thumb.appendChild(tImg);

      thumb.addEventListener("click", () => {
        currentIndex[season] = i;
        renderPanel(season);
      });
      thumbsRow.appendChild(thumb);
    });

    gallery.appendChild(stage);
    gallery.appendChild(nav);
    gallery.appendChild(thumbsRow);
    panel.appendChild(gallery);

    // Prev / Next handlers
    prevBtn.addEventListener("click", () => {
      currentIndex[season] = (currentIndex[season] - 1 + photos.length) % photos.length;
      renderPanel(season);
    });

    nextBtn.addEventListener("click", () => {
      currentIndex[season] = (currentIndex[season] + 1) % photos.length;
      renderPanel(season);
    });
  }

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const season = tab.dataset.season;

      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const activePanel = viewerEl.querySelector(`.season-panel[data-season="${season}"]`);
      if (activePanel) {
        activePanel.classList.add("active");
        if (!activePanel.dataset.rendered) {
          renderPanel(season);
          activePanel.dataset.rendered = "true";
        }
      }
    });
  });

  // Render the default active tab (winter)
  const defaultSeason = viewerEl.querySelector(".season-tab.active")?.dataset.season || "winter";
  renderPanel(defaultSeason);
  const defaultPanel = viewerEl.querySelector(`.season-panel[data-season="${defaultSeason}"]`);
  if (defaultPanel) {
    defaultPanel.dataset.rendered = "true";
  }
}

// Auto-init all seasonal viewers on page load
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".seasonal-viewer[data-property]").forEach(initSeasonalViewer);
});