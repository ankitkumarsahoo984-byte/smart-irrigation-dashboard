
// ==========================================
// SMART FARM - DEMO IRRIGATION SYSTEM
// Sample data only. ESP32 is NOT connected.
// ==========================================

// SENSOR VALUES
let moisture = 36;
let temperature = 27.9;
let humidity = 68;
let battery = 85;
let flow = 0;
let waterUsed = 12;

// PUMP SETTINGS
let currentMode = "AUTO";
let pumpIsOn = false;

// ALERT TEST
let alertTest = "";

// CHART OBJECTS
let moistureChart = null;
let temperatureChart = null;

// HISTORY ARRAYS
let timeLabels = [];
let moistureHistory = [];
let temperatureHistory = [];

const MAX_HISTORY = 20;

// ==========================================
// DISPLAY SENSOR READINGS
// ==========================================

function displayReadings() {

    document.getElementById("moisture").textContent =
        Math.round(moisture) + "%";

    document.getElementById("temperature").textContent =
        temperature.toFixed(1) + " °C";

    document.getElementById("humidity").textContent =
        Math.round(humidity) + "%";

    document.getElementById("battery").textContent =
        Math.round(battery) + "%";

    document.getElementById("flow").textContent =
        flow.toFixed(1) + " L/min";

    document.getElementById("waterUsed").textContent =
        waterUsed.toFixed(1) + " L";

    // Moisture progress bar
    const moistureFill = document.getElementById("moistureFill");

    moistureFill.style.width = moisture + "%";
    moistureFill.className = "moisture-fill";

    if (moisture < 30) {
        moistureFill.classList.add("dry");
    } else if (moisture < 60) {
        moistureFill.classList.add("medium");
    } else {
        moistureFill.classList.add("good");
    }

    // Battery progress bar
    const batteryFill = document.getElementById("batteryFill");

    batteryFill.style.width = battery + "%";
    batteryFill.className = "battery-fill";

    if (battery < 20) {
        batteryFill.classList.add("low");
    } else if (battery < 50) {
        batteryFill.classList.add("medium");
    } else {
        batteryFill.classList.add("good");
    }

    // Water flow indicator
    const flowIndicator = document.getElementById("flowIndicator");
    const flowStatus = document.getElementById("flowStatus");

    if (flow > 0) {
        flowIndicator.classList.add("active");
        flowStatus.textContent = "WATER FLOWING";
    } else {
        flowIndicator.classList.remove("active");
        flowStatus.textContent = "NO WATER FLOW";
    }
}

// ==========================================
// PUMP STATUS
// ==========================================

function updatePumpStatus() {

    const status = document.getElementById("pumpStatus");
    const statusBox = status.parentElement;

    if (pumpIsOn) {
        status.textContent = "PUMP ON (DEMO)";
        statusBox.classList.add("running");
    } else {
        status.textContent = "PUMP OFF (DEMO)";
        statusBox.classList.remove("running");
    }
}

// ==========================================
// PUMP ON / OFF
// ==========================================

function pumpOn() {

    pumpIsOn = true;

    updatePumpStatus();

    displayReadings();

    updateAlerts();
}

function pumpOff() {

    pumpIsOn = false;
    flow = 0;

    updatePumpStatus();

    displayReadings();

    updateAlerts();
}

// ==========================================
// AUTO / MANUAL MODE
// ==========================================

function setAutoMode() {

    currentMode = "AUTO";

    document.getElementById("modeStatus").textContent =
        "Current Mode: AUTOMATIC";

    checkAutomaticIrrigation();

    updatePumpStatus();
}

function setManualMode() {

    currentMode = "MANUAL";

    document.getElementById("modeStatus").textContent =
        "Current Mode: MANUAL";

    updatePumpStatus();
}

// ==========================================
// AUTOMATIC IRRIGATION
// ==========================================

function checkAutomaticIrrigation() {

    if (currentMode !== "AUTO") {
        return;
    }

    const onThreshold =
        Number(document.getElementById("onThreshold").value);

    const offThreshold =
        Number(document.getElementById("offThreshold").value);

    if (
        !Number.isFinite(onThreshold) ||
        !Number.isFinite(offThreshold) ||
        onThreshold >= offThreshold
    ) {
        return;
    }

    if (moisture <= onThreshold) {
        pumpIsOn = true;
    }

    if (moisture >= offThreshold) {
        pumpIsOn = false;
    }
}

// ==========================================
// ALERT SYSTEM
// ==========================================

function updateAlerts() {

    const alertBox = document.getElementById("alertList");

    let messages = [];

    if (battery < 20 || alertTest === "battery") {
        messages.push(
            '<div class="alert-item danger"><p>⚠ Low battery warning!</p></div>'
        );
    }

    if (moisture < 30 || alertTest === "dry") {
        messages.push(
            '<div class="alert-item warning"><p>💧 Soil moisture is too low!</p></div>'
        );
    }

    if (
        (pumpIsOn && flow === 0) ||
        alertTest === "noflow"
    ) {
        messages.push(
            '<div class="alert-item danger"><p>🚰 No water flow detected!</p></div>'
        );
    }

    if (alertTest === "runtime") {
        messages.push(
            '<div class="alert-item warning"><p>⏰ Pump runtime warning (DEMO)!</p></div>'
        );
    }

    if (messages.length === 0) {
        alertBox.innerHTML =
            '<div class="alert-item normal"><p>✓ System operating normally (DEMO)</p></div>';
    } else {
        alertBox.innerHTML = messages.join("");
    }
}

// ==========================================
// ALERT TEST BUTTONS
// ==========================================

function testLowBattery() {
    alertTest = "battery";
    updateAlerts();
}

function testDrySoil() {
    alertTest = "dry";
    updateAlerts();
}

function testNoFlow() {
    alertTest = "noflow";
    updateAlerts();
}

function testLongRunning() {
    alertTest = "runtime";
    updateAlerts();
}

function resetAlertTest() {
    alertTest = "";
    updateAlerts();
}

// ==========================================
// DATE AND TIME
// ==========================================

function updateDateTime() {

    const now = new Date();

    document.getElementById("liveDateTime").textContent =
        now.toLocaleString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
}

// ==========================================
// LAST DATA UPDATE
// ==========================================

function updateLastDataTime() {

    document.getElementById("lastUpdate").textContent =
        "Last data update: " +
        new Date().toLocaleTimeString("en-IN");
}

// ==========================================
// SAVE SENSOR HISTORY
// ==========================================

function saveHistory() {

    const now = new Date();

    const label = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    timeLabels.push(label);
    moistureHistory.push(Number(moisture.toFixed(1)));
    temperatureHistory.push(Number(temperature.toFixed(1)));

    if (timeLabels.length > MAX_HISTORY) {
        timeLabels.shift();
        moistureHistory.shift();
        temperatureHistory.shift();
    }

    updateCharts();
}

// ==========================================
// CREATE CHARTS
// ==========================================

function createCharts() {

    if (typeof Chart === "undefined") {
        console.error("Chart.js library not loaded.");
        return;
    }

    const moistureCanvas =
        document.getElementById("moistureChart");

    const temperatureCanvas =
        document.getElementById("temperatureChart");

    if (!moistureCanvas || !temperatureCanvas) {
        console.error("Chart canvas not found.");
        return;
    }

    moistureChart = new Chart(moistureCanvas, {

        type: "line",

        data: {
            labels: timeLabels,

            datasets: [{
                label: "Soil Moisture (%)",
                data: moistureHistory,
                borderColor: "#287044",
                backgroundColor: "rgba(40,112,68,0.12)",
                borderWidth: 3,
                tension: 0.3,
                fill: true
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            animation: {
                duration: 500
            },

            scales: {
                y: {
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: "Moisture (%)"
                    }
                }
            }
        }
    });

    temperatureChart = new Chart(temperatureCanvas, {

        type: "line",

        data: {
            labels: timeLabels,

            datasets: [{
                label: "Temperature (°C)",
                data: temperatureHistory,
                borderColor: "#e58a24",
                backgroundColor: "rgba(229,138,36,0.12)",
                borderWidth: 3,
                tension: 0.3,
                fill: true
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            animation: {
                duration: 500
            },

            scales: {
                y: {
                    title: {
                        display: true,
                        text: "Temperature (°C)"
                    }
                }
            }
        }
    });
}

// ==========================================
// UPDATE CHARTS
// ==========================================

function updateCharts() {

    if (!moistureChart || !temperatureChart) {
        return;
    }

    moistureChart.data.labels = [...timeLabels];
    moistureChart.data.datasets[0].data = [...moistureHistory];

    temperatureChart.data.labels = [...timeLabels];
    temperatureChart.data.datasets[0].data = [...temperatureHistory];

    moistureChart.update();
    temperatureChart.update();
}

// ==========================================
// SIMULATE SENSOR DATA
// ==========================================

function simulateSensorData() {

    if (pumpIsOn) {

        if (alertTest === "noflow") {
            flow = 0;
        } else {
            flow = 2.5;
            moisture = Math.min(100, moisture + 1);
            waterUsed += flow * (5 / 60);
        }

    } else {

        flow = 0;
        moisture = Math.max(0, moisture - 0.2);
    }

    temperature = 27 + Math.random() * 4;
    humidity = 60 + Math.random() * 10;

    checkAutomaticIrrigation();

    updatePumpStatus();
    displayReadings();
    updateAlerts();
    saveHistory();
    updateLastDataTime();
}

// ==========================================
// START DASHBOARD
// ==========================================

function startDashboard() {

    displayReadings();

    updatePumpStatus();

    updateAlerts();

    updateDateTime();

    updateLastDataTime();

    // First history reading
    saveHistory();

    // Create graphs
    createCharts();

    // Update clock every second
    setInterval(updateDateTime, 1000);

    // Update demo sensor data every 5 seconds
    setInterval(simulateSensorData, 5000);
}

startDashboard();
