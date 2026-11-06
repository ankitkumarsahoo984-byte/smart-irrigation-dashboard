
// FIREBASE CONNECTION
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    push,
    onValue
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBTIxYIPW0KSqzuARS0eNQMceKBE7ckA6c",
    authDomain: "smart-irrigation-system-757c8.firebaseapp.com",
    databaseURL: "https://smart-irrigation-system-757c8-default-rtdb.firebaseio.com",
    projectId: "smart-irrigation-system-757c8",
    storageBucket: "smart-irrigation-system-757c8.firebasestorage.app",
    messagingSenderId: "588326528093",
    appId: "1:588326528093:web:5532d530ff06e038dc99b4"
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);
// ==========================================
// SMART FARM - DEMO IRRIGATION SYSTEM
// Browser storage enabled
// ESP32 is NOT connected yet
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

// HISTORY
let timeLabels = [];
let moistureHistory = [];
let temperatureHistory = [];

const MAX_HISTORY = 20;
const STORAGE_KEY = "smartFarmSensorHistory";

// ==========================================
// LOAD SAVED HISTORY
// ==========================================

function loadHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            console.log("No previous history found.");
            return;
        }

        const data = JSON.parse(saved);

        if (
            Array.isArray(data.timeLabels) &&
            Array.isArray(data.moistureHistory) &&
            Array.isArray(data.temperatureHistory)
        ) {
            const count = Math.min(
                data.timeLabels.length,
                data.moistureHistory.length,
                data.temperatureHistory.length
            );

            timeLabels = data.timeLabels.slice(-MAX_HISTORY);
            moistureHistory = data.moistureHistory.slice(-MAX_HISTORY);
            temperatureHistory = data.temperatureHistory.slice(-MAX_HISTORY);

            console.log("History loaded:", count, "readings");
        }
    } catch (error) {
        console.error("History loading failed:", error);
    }
}

// ==========================================
// SAVE HISTORY
// ==========================================

function saveHistoryToStorage() {
    try {
        const data = {
            timeLabels,
            moistureHistory,
            temperatureHistory
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        console.log("History saved:", timeLabels.length, "readings");
    } catch (error) {
        console.error("History saving failed:", error);
    }
}

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

// LISTEN FOR FIREBASE SENSOR DATA
// LISTEN FOR FIREBASE SENSOR DATA AND LOAD CLOUD HISTORY
function listenToFirebase() {
    const sensorRef = ref(database, "sensorHistory");

    onValue(sensorRef, (snapshot) => {
        if (!snapshot.exists()) {
            console.log("No Firebase sensor data found.");
            return;
        }

        const readings = snapshot.val();

        // Sort readings by timestamp (oldest to newest)
        const sortedReadings = Object.values(readings).sort(
            (a, b) => Number(a.timestamp) - Number(b.timestamp)
        );

        // Get the latest reading
        const latestData = sortedReadings[sortedReadings.length - 1];

        // Update dashboard sensor values
        moisture = Number(latestData.moisture);
        temperature = Number(latestData.temperature);
        humidity = Number(latestData.humidity);
        battery = Number(latestData.battery);
        flow = Number(latestData.flow);
        waterUsed = Number(latestData.waterUsed);

        pumpIsOn = latestData.pumpStatus === "ON";
        currentMode = latestData.mode || currentMode;

        // Clear old chart data
        timeLabels.length = 0;
        moistureHistory.length = 0;
        temperatureHistory.length = 0;

        // Load the latest 20 Firebase readings
        const recentReadings = sortedReadings.slice(-MAX_HISTORY);

        recentReadings.forEach((reading) => {
            const time = new Date(Number(reading.timestamp));

            timeLabels.push(
                time.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                })
            );

            moistureHistory.push(Number(reading.moisture));
            temperatureHistory.push(Number(reading.temperature));
        });

        // Refresh dashboard and charts
        displayReadings();
        updatePumpStatus();
        updateCharts();

        console.log("Firebase: Cloud history and dashboard updated!");
    });
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
    currentMode = "MANUAL";
    pumpIsOn = true;

    document.getElementById("modeStatus").textContent =
        "Current Mode: MANUAL";

    updatePumpStatus();
    displayReadings();
    updateAlerts();
}

function pumpOff() {
    currentMode = "MANUAL";
    pumpIsOn = false;
    flow = 0;

    document.getElementById("modeStatus").textContent =
        "Current Mode: MANUAL";

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
    displayReadings();
    updateAlerts();
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
    if (currentMode !== "AUTO") return;

    const onThreshold =
        Number(document.getElementById("onThreshold").value);

    const offThreshold =
        Number(document.getElementById("offThreshold").value);

    if (
        !Number.isFinite(onThreshold) ||
        !Number.isFinite(offThreshold) ||
        onThreshold >= offThreshold ||
        onThreshold < 0 ||
        offThreshold > 100
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
// SYSTEM ALERTS
// ==========================================

function updateAlerts() {
    const alertBox = document.getElementById("alertList");

    if (!alertBox) return;

    let messages = [];

    if (battery < 20 || alertTest === "battery") {
        messages.push(`
            <div class="alert-item danger">
                <p>⚠ Low battery warning!</p>
            </div>
        `);
    }

    if (moisture < 30 || alertTest === "dry") {
        messages.push(`
            <div class="alert-item warning">
                <p>💧 Soil moisture is too low!</p>
            </div>
        `);
    }

    if ((pumpIsOn && flow === 0) || alertTest === "noflow") {
        messages.push(`
            <div class="alert-item danger">
                <p>🚰 No water flow detected!</p>
            </div>
        `);
    }

    if (alertTest === "runtime") {
        messages.push(`
            <div class="alert-item warning">
                <p>⏰ Pump runtime warning (DEMO)!</p>
            </div>
        `);
    }

    alertBox.innerHTML = messages.length
        ? messages.join("")
        : `<div class="alert-item normal">
              <p>✓ System operating normally (DEMO)</p>
           </div>`;
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
// CONNECT WEBSITE BUTTONS
// ==========================================

function connectButtons() {
    const buttons = [
        ["autoModeButton", setAutoMode],
        ["manualModeButton", setManualMode],
        ["pumpOnButton", pumpOn],
        ["pumpOffButton", pumpOff],
        ["lowBatteryButton", testLowBattery],
        ["drySoilButton", testDrySoil],
        ["noFlowButton", testNoFlow],
        ["runtimeButton", testLongRunning],
        ["resetAlertsButton", resetAlertTest]
    ];

    buttons.forEach(([id, action]) => {
        const button = document.getElementById(id);

        if (button) {
            button.addEventListener("click", action);
        } else {
            console.warn("Button not found:", id);
        }
    });
}

// ==========================================
// DATE AND TIME
// ==========================================

function updateDateTime() {
    document.getElementById("liveDateTime").textContent =
        new Date().toLocaleString("en-IN", {
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
// RECORD AND SAVE SENSOR HISTORY
// ==========================================

function saveHistory() {
    const label = new Date().toLocaleTimeString("en-IN", {
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

    saveHistoryToStorage();
    updateCharts();
}

// SAVE SENSOR READINGS TO FIREBASE
async function saveToFirebase() {
    try {
        await push(ref(database, "sensorHistory"), {
            timestamp: Date.now(),
            moisture: moisture,
            temperature: temperature,
            humidity: humidity,
            battery: battery,
            flow: flow,
            waterUsed: waterUsed,
            pumpStatus: pumpIsOn ? "ON" : "OFF",
            mode: currentMode
        });

        console.log("Firebase: Sensor reading saved!");
    } catch (error) {
        console.error("Firebase save error:", error);
    }
}
// ==========================================
// CREATE CHARTS
// ==========================================

function createCharts() {
    if (typeof Chart === "undefined") {
        console.error("Chart.js library not loaded.");
        return;
    }

    const moistureCanvas = document.getElementById("moistureChart");
    const temperatureCanvas = document.getElementById("temperatureChart");

    if (!moistureCanvas || !temperatureCanvas) {
        console.error("Chart canvas not found.");
        return;
    }

    moistureChart = new Chart(moistureCanvas, {
        type: "line",
        data: {
            labels: [...timeLabels],
            datasets: [{
                label: "Soil Moisture (%)",
                data: [...moistureHistory],
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
            labels: [...timeLabels],
            datasets: [{
                label: "Temperature (°C)",
                data: [...temperatureHistory],
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
    if (!moistureChart || !temperatureChart) return;

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
    connectButtons();
    listenToFirebase();

    // Restore history BEFORE creating charts
    loadHistory();

    displayReadings();
    updatePumpStatus();
    updateAlerts();

    updateDateTime();
    updateLastDataTime();

    // Show previously saved history immediately
    createCharts();

    // Record a fresh demo reading
    saveHistory();

 setInterval(updateDateTime, 1000);

if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    setInterval(simulateSensorData, 5000);
    setInterval(saveToFirebase, 30000);
}
    console.log("Smart Farm dashboard started.");
}

startDashboard();
console.log("Firebase connected successfully!");

// FIREBASE CONNECTION TEST
async function testFirebase() {
    try {
        await set(ref(database, "connectionTest"), {
            status: "Connected",
            message: "Smart Irrigation Website",
            time: new Date().toISOString()
        });

        console.log("SUCCESS: Data sent to Firebase!");
    } catch (error) {
        console.error("Firebase Error:", error);
    }
}

if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    testFirebase();
}