
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
let moisture = null;
let temperature = null;
let humidity = null;
let battery = null;
let flow = null;
let waterUsed = null;

// ESP32 CONNECTION
let esp32Connected = false;
let wifiName = "Not Connected";
let wifiSignal = null;
let lastHeartbeat = null;

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

    // SOIL MOISTURE
    document.getElementById("moisture").textContent =
        Number.isFinite(moisture) ? Math.round(moisture) + "%" : "--";

    // TEMPERATURE
    document.getElementById("temperature").textContent =
        Number.isFinite(temperature) ? temperature.toFixed(1) + " °C" : "-- °C";

    // HUMIDITY
    document.getElementById("humidity").textContent =
        Number.isFinite(humidity) ? Math.round(humidity) + "%" : "--";

    // BATTERY
    document.getElementById("battery").textContent =
        Number.isFinite(battery) ? Math.round(battery) + "%" : "--";

    // WATER FLOW
    document.getElementById("flow").textContent =
        Number.isFinite(flow) ? flow.toFixed(1) + " L/min" : "-- L/min";

    // TOTAL WATER USED
    document.getElementById("waterUsed").textContent =
        Number.isFinite(waterUsed) ? waterUsed.toFixed(1) + " L" : "-- L";


    // MOISTURE PROGRESS BAR
    const moistureFill = document.getElementById("moistureFill");

    moistureFill.style.width =
        Number.isFinite(moisture) ? moisture + "%" : "0%";

    moistureFill.className = "moisture-fill";

    if (Number.isFinite(moisture)) {
        if (moisture < 30) {
            moistureFill.classList.add("dry");
        } else if (moisture < 60) {
            moistureFill.classList.add("medium");
        } else {
            moistureFill.classList.add("good");
        }
    }


    // BATTERY PROGRESS BAR
    const batteryFill = document.getElementById("batteryFill");

    batteryFill.style.width =
        Number.isFinite(battery) ? battery + "%" : "0%";

    batteryFill.className = "battery-fill";

    if (Number.isFinite(battery)) {
        if (battery < 20) {
            batteryFill.classList.add("low");
        } else if (battery < 50) {
            batteryFill.classList.add("medium");
        } else {
            batteryFill.classList.add("good");
        }
    }


    // WATER FLOW STATUS
    const flowIndicator = document.getElementById("flowIndicator");
    const flowStatus = document.getElementById("flowStatus");

    if (!Number.isFinite(flow)) {
        flowIndicator.classList.remove("active");
        flowStatus.textContent = "WAITING FOR DATA";
    } else if (flow > 0) {
        flowIndicator.classList.add("active");
        flowStatus.textContent = "WATER FLOWING";
    } else {
        flowIndicator.classList.remove("active");
        flowStatus.textContent = "NO WATER FLOW";
    }
}



// ==========================================
// LISTEN FOR REAL ESP32 DATA FROM FIREBASE
// ==========================================

function listenToFirebase() {

    // Helper: convert valid sensor values into numbers
    function getNumber(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    // 1. LISTEN FOR LIVE SENSOR READINGS
    const liveRef = ref(database, "liveData");

    onValue(liveRef, (snapshot) => {

        if (!snapshot.exists()) {
            moisture = null;
            temperature = null;
            humidity = null;
            battery = null;
            flow = null;
            waterUsed = null;

            displayReadings();
            return;
        }

      const data = snapshot.val();

// UPDATE LAST SENSOR READING TIME
updateLastDataTime(getNumber(data.timestamp));

moisture = getNumber(data.moisture);
temperature = getNumber(data.temperature);
humidity = getNumber(data.humidity);
battery = getNumber(data.battery);
flow = getNumber(data.flow);
waterUsed = getNumber(data.waterUsed);

        if (data.pumpStatus === "ON" || data.pumpStatus === "OFF") {
            pumpIsOn = data.pumpStatus === "ON";
        }

        if (data.mode === "AUTO" || data.mode === "MANUAL") {
            currentMode = data.mode;
        }

        displayReadings();
        updatePumpStatus();

        const modeElement = document.getElementById("systemMode");

        if (modeElement) {
            modeElement.textContent = currentMode;
        }

        console.log("Firebase: Live ESP32 data received!");
    });


    // 2. LISTEN FOR ESP32 CONNECTION AND WI-FI STATUS
    const deviceRef = ref(database, "deviceStatus");

    onValue(deviceRef, (snapshot) => {

        if (!snapshot.exists()) {
            esp32Connected = false;
            wifiName = "Not Connected";
            wifiSignal = null;
            lastHeartbeat = null;

        } else {
            const device = snapshot.val();

            wifiName = device.ssid || "Unknown";
            wifiSignal = getNumber(device.rssi);
            lastHeartbeat = getNumber(device.lastHeartbeat);
        }

        updateDeviceStatus();
    });


    // 3. LISTEN FOR REAL ESP32 HISTORY
    const historyRef = ref(database, "sensorHistory");

    onValue(historyRef, (snapshot) => {

        timeLabels.length = 0;
        moistureHistory.length = 0;
        temperatureHistory.length = 0;

        if (!snapshot.exists()) {
            updateCharts();
            console.log("No ESP32 history available yet.");
            return;
        }

        const readings = Object.values(snapshot.val());

        // Only accept readings marked as ESP32 data
        const realReadings = readings
            .filter(reading =>
                reading.source === "ESP32" &&
                getNumber(reading.timestamp) !== null
            )
            .sort((a, b) =>
                Number(a.timestamp) - Number(b.timestamp)
            )
            .slice(-MAX_HISTORY);

        realReadings.forEach((reading) => {

            const time = new Date(Number(reading.timestamp));

            timeLabels.push(
                time.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                })
            );

            moistureHistory.push(getNumber(reading.moisture));
            temperatureHistory.push(getNumber(reading.temperature));
        });

        updateCharts();

        console.log("Firebase: Real ESP32 history updated!");
    });


    // 4. CHECK WHETHER ESP32 HEARTBEAT IS STILL ACTIVE
    function updateDeviceStatus() {

        const now = Date.now();

        esp32Connected =
            Number.isFinite(lastHeartbeat) &&
            now - lastHeartbeat >= 0 &&
            now - lastHeartbeat < 15000;

        const statusText = document.getElementById("espStatus");
        const headerText = document.getElementById("connectionText");
        const wifiElement = document.getElementById("wifiName");
        const signalElement = document.getElementById("wifiSignal");
        const heartbeatElement = document.getElementById("lastHeartbeat");
        const modeElement = document.getElementById("systemMode");
        const sourceElement = document.getElementById("dataSource");

        if (statusText) {
            statusText.textContent =
                esp32Connected ? "Connected" : "Disconnected";
        }

        if (headerText) {
            headerText.textContent =
                esp32Connected ? "ESP32 CONNECTED" : "ESP32 DISCONNECTED";
        }

        if (wifiElement) {
            wifiElement.textContent =
                esp32Connected ? wifiName : "Not Connected";
        }

        if (signalElement) {
            signalElement.textContent =
                esp32Connected && Number.isFinite(wifiSignal)
                    ? wifiSignal + " dBm"
                    : "-- dBm";
        }

        if (heartbeatElement) {
            heartbeatElement.textContent =
                Number.isFinite(lastHeartbeat)
                    ? new Date(lastHeartbeat).toLocaleString("en-IN")
                    : "Waiting...";
        }

        if (modeElement) {
            modeElement.textContent = currentMode;
        }

        if (sourceElement) {
            sourceElement.textContent =
                esp32Connected ? "ESP32 Live Data" : "No Live Data";
        }

        const connectionDot = document.getElementById("connectionDot");

        if (connectionDot) {
            connectionDot.classList.toggle("online", esp32Connected);
            connectionDot.classList.toggle("offline", !esp32Connected);
        }
        
        updatePumpStatus();
        
    }

    // Refresh connection status every 5 seconds
    setInterval(updateDeviceStatus, 5000);
}



// ==========================================
// PUMP STATUS
// ==========================================

function updatePumpStatus() {

    const status = document.getElementById("pumpStatus");
    const statusBox = status.parentElement;

    statusBox.classList.remove("running");

    if (!esp32Connected) {
        status.textContent = "PUMP STATUS UNKNOWN";
        return;
    }

    if (pumpIsOn) {
        status.textContent = "PUMP ON";
        statusBox.classList.add("running");
    } else {
        status.textContent = "PUMP OFF";
    }
}



// ==========================================
// PUMP ON / OFF
// ==========================================

async function pumpOn() {

    if (!esp32Connected) {
        alert("ESP32 is disconnected. Pump command not sent.");
        return;
    }

    try {
        await set(ref(database, "commands/pump"), "ON");
        await set(ref(database, "commands/mode"), "MANUAL");

        currentMode = "MANUAL";

        document.getElementById("modeStatus").textContent =
            "Current Mode: MANUAL";

        console.log("Pump ON command sent to ESP32.");

    } catch (error) {
        console.error("Pump ON command failed:", error);
        alert("Unable to send pump command.");
    }
}


async function pumpOff() {

    if (!esp32Connected) {
        alert("ESP32 is disconnected. Pump command not sent.");
        return;
    }

    try {
        await set(ref(database, "commands/pump"), "OFF");
        await set(ref(database, "commands/mode"), "MANUAL");

        currentMode = "MANUAL";

        document.getElementById("modeStatus").textContent =
            "Current Mode: MANUAL";

        console.log("Pump OFF command sent to ESP32.");

    } catch (error) {
        console.error("Pump OFF command failed:", error);
        alert("Unable to send pump command.");
    }
}


// ==========================================
// AUTO / MANUAL MODE
// ==========================================

async function setAutoMode() {

    if (!esp32Connected) {
        alert("ESP32 is disconnected. Cannot change operating mode.");
        return;
    }

    try {
        await set(ref(database, "commands/mode"), "AUTO");

        currentMode = "AUTO";

        document.getElementById("modeStatus").textContent =
            "Current Mode: AUTOMATIC";

        console.log("AUTO mode command sent to ESP32.");

    } catch (error) {
        console.error("AUTO mode command failed:", error);
        alert("Unable to send AUTO mode command.");
    }
}


async function setManualMode() {

    if (!esp32Connected) {
        alert("ESP32 is disconnected. Cannot change operating mode.");
        return;
    }

    try {
        await set(ref(database, "commands/mode"), "MANUAL");

        currentMode = "MANUAL";

        document.getElementById("modeStatus").textContent =
            "Current Mode: MANUAL";

        console.log("MANUAL mode command sent to ESP32.");

    } catch (error) {
        console.error("MANUAL mode command failed:", error);
        alert("Unable to send MANUAL mode command.");
    }
}



// ==========================================
// AUTOMATIC IRRIGATION
// ==========================================

function checkAutomaticIrrigation() {

    // Do not operate without a connected ESP32
    if (!esp32Connected) return;

    // Automatic mode only
    if (currentMode !== "AUTO") return;

    // Do not operate without a valid moisture reading
    if (!Number.isFinite(moisture)) return;

    const onThreshold =
        Number(document.getElementById("onThreshold").value);

    const offThreshold =
        Number(document.getElementById("offThreshold").value);

    // Validate thresholds
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
// UPDATE SYSTEM ALERTS
// ==========================================

function updateAlerts() {

    const alertBox = document.getElementById("alertList");

    if (!alertBox) return;

    let messages = [];

    if (
        (Number.isFinite(battery) && battery < 20) ||
        alertTest === "battery"
    ) {
        messages.push("⚠️ Low battery level!");
    }

    if (
        (Number.isFinite(moisture) && moisture < 30) ||
        alertTest === "dry"
    ) {
        messages.push("⚠️ Soil moisture is low!");
    }

    if (
        (pumpIsOn && Number.isFinite(flow) && flow === 0) ||
        alertTest === "noflow"
    ) {
        messages.push("⚠️ Pump is ON but no water flow detected!");
    }

    if (alertTest === "runtime") {
        messages.push("⚠️ System runtime alert test!");
    }

    if (messages.length > 0) {

        alertBox.innerHTML = messages
            .map(message => `<div>${message}</div>`)
            .join("");

    } else if (!esp32Connected) {

        alertBox.innerHTML =
            `<div>Waiting for ESP32 connection. No live sensor data available.</div>`;

    } else {

        alertBox.innerHTML =
            `<div>✓ No active alerts. System connected.</div>`;
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
// CONNECT WEBSITE BUTTONS
// ==========================================

function connectButtons() {
    const buttons = [
        ["autoModeButton", setAutoMode],
        ["manualModeButton", setManualMode],
        ["pumpOnButton", pumpOn],
        ["pumpOffButton", pumpOff]
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

function updateLastDataTime(timestamp = null) {

    const element = document.getElementById("lastUpdate");

    if (!element) return;

    if (!Number.isFinite(timestamp)) {
        element.textContent = "Last data update: Waiting for ESP32...";
        return;
    }

    element.textContent =
        "Last data update: " +
        new Date(timestamp).toLocaleTimeString("en-IN");
}



// ==========================================
// SAVE REAL SENSOR HISTORY
// ==========================================

function saveHistory() {

    // Do not save missing sensor readings
    if (
        !Number.isFinite(moisture) ||
        !Number.isFinite(temperature)
    ) {
        return;
    }

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

// Firebase sensor history section

// Create charts
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

    // Connect website buttons
    connectButtons();

    // Create empty charts
    createCharts();

    // Display empty sensor values
    displayReadings();

    // Display initial pump and alert status
    updatePumpStatus();
    updateAlerts();

    // Start date and time
    updateDateTime();
    updateLastDataTime();

    // Listen for actual ESP32 data from Firebase
    listenToFirebase();

    // Update date and time every second
    setInterval(updateDateTime, 1000);

    console.log("Smart Farm dashboard started.");
}

startDashboard();
console.log("Firebase listener initialized.");
