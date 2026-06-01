const sounds = {
  playClick() { window.AudioContext && new AudioContext().close(); },
  playTone(freq, type = 'sine', duration = 0.15) {
    if (!window.AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
    oscillator.onended = () => ctx.close();
  },
  playAlert() { this.playTone(220, 'square', 0.25); },
  playCapture() { this.playTone(440, 'triangle', 0.3); },
  playLevelUp() { this.playTone(880, 'sawtooth', 0.25); }
};

const appState = {
  user: {
    username: "Smarty",
    level: 12,
    xp: 700,
    xpMax: 1000,
    streak: 7,
    healthScore: 82,
    longestStreak: 18,
    avatar: "🏃‍♂️",
    avatarImage: "",
    isLoggedIn: true,
    totalCapturedArea: 24500
  },
  territories: [
    {
      id: "zone-1",
      owner: "user",
      name: "Home Base",
      strength: 82,
      area: 12500,
      points: [[37.4270, -122.1700], [37.4274, -122.1685], [37.4262, -122.1678], [37.4258, -122.1692]]
    },
    {
      id: "zone-2",
      owner: "alpha",
      name: "Alpha Sector",
      strength: 64,
      points: [[37.4285, -122.1690], [37.4293, -122.1678], [37.4281, -122.1668], [37.4274, -122.1685]]
    },
    {
      id: "zone-3",
      owner: "beta",
      name: "Beta Sector",
      strength: 75,
      points: [[37.4258, -122.1690], [37.4264, -122.1708], [37.4252, -122.1715], [37.4246, -122.1700]]
    },
    {
      id: "zone-4",
      owner: "zone",
      name: "Park Zone",
      strength: 100,
      points: [[37.4276, -122.1712], [37.4280, -122.1701], [37.4271, -122.1693], [37.4268, -122.1707]]
    }
  ],
  leaderboard: [
    { name: "TerritoryKing", score: 14800, avatar: "👑🏃‍♂️", isUser: false },
    { name: "AlphaRunner", score: 12500, avatar: "🏃‍♀️", isUser: false },
    { name: "BetaRunner", score: 9200, avatar: "🚴‍♂️", isUser: false },
    { name: "You", score: 700, avatar: "🏃‍♂️", isUser: true }
  ],
  challenges: [
    { id: "c1", title: "Walk 2 km", type: "daily", desc: "Keep your territory active by walking 2 km.", progress: 0.8, max: 2, unit: "km", xpReward: 120, badge: "🏃", completed: false },
    { id: "c2", title: "Earn 300 XP", type: "daily", desc: "Collect XP from captures and activity.", progress: 70, max: 300, unit: "XP", xpReward: 90, badge: "⚡", completed: false },
    { id: "c3", title: "Revisit a captured zone", type: "daily", desc: "Boost your home zone strength by revisiting it.", progress: 0, max: 1, unit: "visit", xpReward: 60, badge: "🛡️", completed: false },
    { id: "c4", title: "Capture 3 zones", type: "weekly", desc: "Expand your territory by capturing 3 new regions.", progress: 1, max: 3, unit: "zones", xpReward: 180, badge: "🏆", completed: false },
    { id: "c5", title: "Defend a zone from decay", type: "weekly", desc: "Keep your strongest zone above 50% health.", progress: 0, max: 1, unit: "defend", xpReward: 140, badge: "🛡️", completed: false }
  ],
  badges: [
    { id: "b1", name: "Starter", icon: "🌱", desc: "Complete first capture.", unlocked: true },
    { id: "b2", name: "Walker", icon: "👟", desc: "Walk 10 km in total.", unlocked: true },
    { id: "b3", name: "Guardian", icon: "🛡️", desc: "Defend a territory twice.", unlocked: false }
  ]
};

let activeChallengeFilter = "daily";

window._pendingAuth = null;

function hashPassword(password) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)).then(buffer => {
    return Array.from(new Uint8Array(buffer)).map(x => x.toString(16).padStart(2, '0')).join('');
  });
}

function saveState() {
  localStorage.setItem('territory_app_state', JSON.stringify(appState));
}

function loadState() {
  const data = localStorage.getItem('territory_app_state');
  if (!data) return;
  try {
    const stored = JSON.parse(data);
    Object.assign(appState, stored);
  } catch (err) {
    console.warn('Corrupt state data', err);
  }
}

function getRankTitle(level) {
  if (level <= 3) return 'Beginner';
  if (level <= 7) return 'Explorer';
  if (level <= 11) return 'Challenger';
  if (level <= 15) return 'Champion';
  return 'Legend';
}

function initAuth() {
  const authScreen = document.getElementById('auth-screen');
  const mainApp = document.getElementById('main-app');
  const startApp = () => {
    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    syncStatsUI();
    sounds.playTone(400, 'sine', 0.2);
  };

  document.getElementById('login-btn').addEventListener('click', () => {
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;
    if (!phone || !password) return showToast('Missing', 'Enter phone and password to continue.');
    loadState();
    if (appState.user.username) {
      appState.user.isLoggedIn = true;
      saveState();
      startApp();
    } else {
      showToast('Invalid', 'Phone or password is incorrect.');
    }
  });

  document.getElementById('register-btn').addEventListener('click', (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!username || !phone || !password) return showToast('Missing', 'Complete all fields to register.');
    appState.user.username = username;
    appState.user.isLoggedIn = true;
    saveState();
    startApp();
    showToast('Welcome', `Hi ${username}, your account is ready.`);
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    appState.user.isLoggedIn = false;
    saveState();
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
  });
}

function openOtpModal(phone, pending) {
  window._pendingAuth = pending;
  document.getElementById('otp-phone-display').innerText = phone;
  document.getElementById('otp-modal').classList.remove('hidden');
}

function closeOtpModal() {
  window._pendingAuth = null;
  document.getElementById('otp-modal').classList.add('hidden');
}

function sendOtpToPhone(phone) {
  document.getElementById('otp-code-display').innerText = '1234';
}

function verifyOtpForPhone(phone, code) {
  if (code === '1234') return { ok: true };
  return { ok: false, reason: 'OTP mismatch' };
}

function verifyPasswordHash(phone, hash) {
  return true;
}

function finishLoginForPhone(phone) {
  appState.user.isLoggedIn = true;
  saveState();
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  syncStatsUI();
}

function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab, .menu-item');
  const screens = document.querySelectorAll('.app-screen');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sounds.playClick();
      const targetScreen = tab.dataset.screen;
      if (!targetScreen) return;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.screen === targetScreen));
      screens.forEach(s => s.classList.remove('active'));
      document.getElementById(`screen-${targetScreen}`)?.classList.add('active');
      if (targetScreen === 'map') setTimeout(() => map?.invalidateSize(), 100);
      if (targetScreen === 'defense' || targetScreen === 'decay') renderDecayDashboard();
      syncStatsUI();
    });
  });
  const dLogout = document.getElementById('sidebar-btn-logout');
  if (dLogout) dLogout.addEventListener('click', () => document.getElementById('btn-logout').click());
}

let map;
let userMarker;
let activePolyline;
let userPos = [37.4270, -122.1700];
let simulatedPath = [];
let isTracking = false;
let trackingStartTime = null;
let durationTimer = null;
let activeTerritoryLayers = [];
let mockCompetitorTimers = [];
let gpsWatchId = null;
let currentTrackingMode = 'sim';
let currentSpeedMode = 'walk';
let sessionPeakSpeedKmH = 0;
const SPEED_FACTORS = {
  walk: { mS: 1.39, deg: 0.000012 },
  run: { mS: 4.17, deg: 0.000036 }
};
const SPEED_CHEAT_THRESHOLD_KMH = 30;

function initMap() {
  map = L.map('map-container', { zoomControl: true, attributionControl: false }).setView(userPos, 16);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);
  updateMapUserMarker();
  renderTerritories();
  document.getElementById('key-up').addEventListener('click', () => moveUser(0.0001, 0));
  document.getElementById('key-down').addEventListener('click', () => moveUser(-0.0001, 0));
  document.getElementById('key-left').addEventListener('click', () => moveUser(0, -0.00012));
  document.getElementById('key-right').addEventListener('click', () => moveUser(0, 0.00012));
  document.getElementById('key-center').addEventListener('click', () => {
    sounds.playClick();
    if (isTracking && simulatedPath.length > 2) {
      simulatedPath.push([simulatedPath[0][0], simulatedPath[0][1]]);
      activePolyline.setLatLngs(simulatedPath);
      completeCapture();
    }
  });
  document.addEventListener('keydown', (e) => {
    const activeScreen = document.querySelector('.app-screen.active');
    if (!activeScreen || activeScreen.id !== 'screen-map' || currentTrackingMode !== 'sim') return;
    if (e.key === 'ArrowUp') moveUser(0.00008, 0);
    else if (e.key === 'ArrowDown') moveUser(-0.00008, 0);
    else if (e.key === 'ArrowLeft') moveUser(0, -0.0001);
    else if (e.key === 'ArrowRight') moveUser(0, 0.0001);
  });
  document.getElementById('tracker-start-btn').addEventListener('click', startTracking);
  document.getElementById('tracker-pause-btn').addEventListener('click', pauseTracking);
  document.getElementById('tracker-stop-btn').addEventListener('click', stopTracking);
  document.querySelectorAll('.speed-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      sounds.playClick();
      document.querySelectorAll('.speed-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentSpeedMode = pill.dataset.speed;
    });
  });
  initGpsModeSelector();
  startCompetitorSimulation();
}

function updateMapUserMarker() {
  if (!map) return;
  let html = '';
  if (appState.user.avatarImage) {
    html = `<div class="user-pulse"></div><div class="user-emoji user-avatar-small has-image" style="background-image: url(${appState.user.avatarImage}); width: 40px; height: 40px; border-radius: 50%;"></div>`;
  } else {
    html = `<div class="user-pulse"></div><div class="user-emoji">${appState.user.avatar}</div>`;
  }
  const userIcon = L.divIcon({ className: 'custom-user-marker', html, iconSize: [40, 40], iconAnchor: [20, 20] });
  if (userMarker) userMarker.setIcon(userIcon);
  else userMarker = L.marker(userPos, { icon: userIcon }).addTo(map);
}

function initGpsModeSelector() {
  const btnSim = document.getElementById('gps-mode-sim');
  const btnDevice = document.getElementById('gps-mode-device');
  const panelKeypad = document.getElementById('sim-keypad-panel');
  const panelInstructions = document.getElementById('sim-instructions-panel');
  const panelSpeed = document.getElementById('sim-speed-panel');
  btnSim.addEventListener('click', () => {
    sounds.playClick();
    if (isTracking) return alert('Please stop your active capture session first.');
    currentTrackingMode = 'sim';
    btnSim.classList.add('active');
    btnDevice.classList.remove('active');
    panelKeypad.classList.remove('hidden');
    panelInstructions.classList.remove('hidden');
    panelSpeed.classList.remove('hidden');
    stopDeviceGpsWatch();
    showToast('🎮 Simulator Mode Active', 'Use keyboard arrow keys or D-Pad controls.');
  });
  btnDevice.addEventListener('click', () => {
    sounds.playClick();
    if (isTracking) return alert('Please stop your active capture session first.');
    currentTrackingMode = 'device';
    btnDevice.classList.add('active');
    btnSim.classList.remove('active');
    panelKeypad.classList.add('hidden');
    panelInstructions.classList.add('hidden');
    panelSpeed.classList.add('hidden');
    startDeviceGpsWatch();
  });
}

function startDeviceGpsWatch() {
  if (!navigator.geolocation) {
    showToast('⚠️ Geolocation Error', "This browser doesn't support GPS tracking. Falling back to Simulator.");
    document.getElementById('gps-mode-sim').click();
    return;
  }
  showToast('📡 Requesting GPS', 'Awaiting location permission from your device...');
  gpsWatchId = navigator.geolocation.watchPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    userPos = [lat, lng];
    userMarker.setLatLng(userPos);
    map.setView(userPos, 17);
    let speedKmH = 0;
    if (position.coords.speed !== null && position.coords.speed !== undefined) {
      speedKmH = position.coords.speed * 3.6;
    } else {
      speedKmH = isTracking ? 5.2 : 0;
    }
    if (isTracking && activePolyline) {
      simulatedPath.push([lat, lng]);
      activePolyline.setLatLngs(simulatedPath);
      activePolyline.bringToFront();
      calculateStats();
      checkLoopClosure();
      if (speedKmH > sessionPeakSpeedKmH) sessionPeakSpeedKmH = speedKmH;
      document.getElementById('cheat-alert').classList.toggle('hidden', speedKmH <= SPEED_CHEAT_THRESHOLD_KMH);
      if (speedKmH > SPEED_CHEAT_THRESHOLD_KMH) sounds.playAlert();
    }
    document.getElementById('track-speed').innerText = `${speedKmH.toFixed(1)} km/h`;
  }, (err) => {
    console.warn('GPS tracking error:', err);
    showToast('⚠️ GPS Location Failure', 'Could not capture device location. Switching to Simulator.');
    document.getElementById('gps-mode-sim').click();
  }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
}

function stopDeviceGpsWatch() {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
}

function renderTerritories() {
  activeTerritoryLayers.forEach(l => map.removeLayer(l));
  activeTerritoryLayers = [];
  appState.territories.forEach(terr => {
    let color = '#9ca3af';
    let fillOpacity = 0.2;
    let className = 'territory-layer';
    if (terr.owner === 'user') {
      color = '#3B82F6';
      fillOpacity = terr.strength / 200;
      className = `territory-user glow-strength-${Math.ceil(terr.strength / 20)}`;
    } else if (terr.owner === 'alpha') {
      color = '#A855F7';
      fillOpacity = terr.strength / 200;
    } else if (terr.owner === 'beta') {
      color = '#EC4899';
      fillOpacity = terr.strength / 200;
    } else if (terr.owner === 'zone') {
      color = '#10B981';
      fillOpacity = 0.35;
    }
    const polygon = L.polygon(terr.points, {
      color,
      fillColor: color,
      fillOpacity,
      weight: terr.owner === 'user' ? 3 : 2,
      dashArray: terr.strength < 40 && terr.owner !== 'zone' ? '5, 5' : null,
      className
    }).addTo(map);
    polygon.bindPopup(`
      <div class="popup-content" style="color:#fff;">
        <h4 style="margin: 0 0 4px 0; color: ${color}; font-size: 14px;">${terr.name}</h4>
        <p style="margin:0; font-size: 11px;">Owner: <b>${terr.owner === 'user' ? 'You' : terr.owner.toUpperCase() + ' (AI)'}</b></p>
        <p style="margin:0; font-size: 11px;">Strength: <b>${terr.strength}%</b> ${terr.strength < 40 ? '⚠️ Decay Warning!' : ''}</p>
        <button onclick="revisitTerritory('${terr.id}')" style="margin-top:6px; background:${color}; border:none; padding:4px 8px; color:#fff; border-radius:4px; font-size:10px; cursor:pointer; font-weight:bold;">🛡️ Boost Strength (+20)</button>
      </div>
    `);
    activeTerritoryLayers.push(polygon);
  });
}

window.revisitTerritory = function(id) {
  sounds.playClick();
  const terr = appState.territories.find(t => t.id === id);
  if (!terr) return;
  if (terr.owner !== 'user') {
    showToast('🛡️ Battle!', 'You must capture this enemy zone by walking around it!');
    return;
  }
  terr.strength = Math.min(100, terr.strength + 20);
  const revisitQuest = appState.challenges.find(c => c.id === 'c3');
  if (revisitQuest && !revisitQuest.completed) revisitQuest.progress = 1;
  const defQuest = appState.challenges.find(c => c.id === 'c5');
  if (defQuest && !defQuest.completed && terr.strength - 20 < 50) defQuest.progress = 1;
  addXP(30);
  showToast('🛡️ Territory Boosted!', `Revisited ${terr.name}. Strength increased to ${terr.strength}% (+30 XP)`);
  renderTerritories();
  saveState();
  syncStatsUI();
};

function moveUser(latOffset, lngOffset) {
  if (currentTrackingMode !== 'sim') return;
  const factor = currentSpeedMode === 'walk' ? 1 : 2.5;
  userPos[0] += latOffset * factor;
  userPos[1] += lngOffset * factor;
  userMarker.setLatLng(userPos);
  map.panTo(userPos);
  if (isTracking && activePolyline) {
    simulatedPath.push([userPos[0], userPos[1]]);
    activePolyline.setLatLngs(simulatedPath);
    activePolyline.bringToFront();
    calculateStats();
    checkLoopClosure();
  }
}

function startTracking() {
  sounds.playClick();
  window.maxSessionDist = 0;
  sessionPeakSpeedKmH = 0;
  isTracking = true;
  simulatedPath = [[userPos[0], userPos[1]]];
  trackingStartTime = new Date();
  document.getElementById('active-workout-bar').classList.remove('hidden');
  document.getElementById('active-workout-text').innerText = currentTrackingMode === 'sim' ? 'Active Session • Simulating Movement' : 'Active Session • Real GPS Tracking';
  document.getElementById('tracker-start-btn').classList.add('hidden');
  document.getElementById('tracker-pause-btn').classList.remove('hidden');
  document.getElementById('tracker-stop-btn').classList.remove('hidden');
  document.getElementById('track-distance').innerText = '0.00 km';
  document.getElementById('track-duration').innerText = '00:00';
  document.getElementById('track-live-area').innerText = '0 m²';
  document.getElementById('track-speed').innerText = currentTrackingMode === 'sim' ? (currentSpeedMode === 'walk' ? '5.0 km/h' : '15.0 km/h') : '0.0 km/h';
  activePolyline = L.polyline(simulatedPath, { color: '#FBBF24', weight: 5, opacity: 0.95, className: 'active-capture-line' }).addTo(map);
  activePolyline.bringToFront();
  let seconds = 0;
  durationTimer = setInterval(() => {
    seconds++;
    document.getElementById('track-duration').innerText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    if (currentTrackingMode === 'sim' && Math.random() > 0.8) moveUser((Math.random() - 0.5) * 0.00001, (Math.random() - 0.5) * 0.00001);
  }, 1000);
  showToast('🏃‍♂️ Capture Started!', 'Walk around an area and complete the loop to capture it!');
}

function pauseTracking() {
  sounds.playClick();
  isTracking = false;
  clearInterval(durationTimer);
  const btn = document.getElementById('tracker-pause-btn');
  btn.innerText = 'Resume';
  btn.removeEventListener('click', pauseTracking);
  btn.addEventListener('click', resumeTracking, { once: true });
}

function resumeTracking() {
  sounds.playClick();
  isTracking = true;
  const btn = document.getElementById('tracker-pause-btn');
  btn.innerText = 'Pause';
  let [mins, secs] = document.getElementById('track-duration').innerText.split(':').map(Number);
  let seconds = mins * 60 + secs;
  durationTimer = setInterval(() => {
    seconds++;
    document.getElementById('track-duration').innerText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }, 1000);
  btn.removeEventListener('click', resumeTracking);
  btn.addEventListener('click', pauseTracking);
}

function stopTracking() {
  sounds.playClick();
  isTracking = false;
  clearInterval(durationTimer);
  document.getElementById('active-workout-bar').classList.add('hidden');
  document.getElementById('tracker-start-btn').classList.remove('hidden');
  document.getElementById('tracker-pause-btn').classList.add('hidden');
  document.getElementById('tracker-stop-btn').classList.add('hidden');
  document.getElementById('cheat-alert').classList.add('hidden');
  if (activePolyline) map.removeLayer(activePolyline);
  showToast('⏹️ Session Finished', 'Workout summary generated. Keep walking to claim areas!');
}

function calculateLiveEstArea() {
  if (simulatedPath.length < 3) return 0;
  const pathClone = JSON.parse(JSON.stringify(simulatedPath));
  pathClone.push([pathClone[0][0], pathClone[0][1]]);
  const origin = pathClone[0];
  const x = [];
  const y = [];
  pathClone.forEach(coord => {
    const dx = (coord[1] - origin[1]) * 111300 * Math.cos(origin[0] * Math.PI / 180);
    const dy = (coord[0] - origin[0]) * 111300;
    x.push(dx);
    y.push(dy);
  });
  let sum1 = 0, sum2 = 0;
  for (let i = 0; i < x.length - 1; i++) {
    sum1 += x[i] * y[i+1];
    sum2 += y[i] * x[i+1];
  }
  return Math.round(Math.abs(sum1 - sum2) * 0.5);
}

function calculateStats() {
  if (simulatedPath.length < 2) return;
  let distMeters = 0;
  for (let i = 1; i < simulatedPath.length; i++) {
    distMeters += L.latLng(simulatedPath[i-1][0], simulatedPath[i-1][1]).distanceTo(L.latLng(simulatedPath[i][0], simulatedPath[i][1]));
  }
  const distKm = distMeters / 1000;
  document.getElementById('track-distance').innerText = `${distKm.toFixed(2)} km`;
  document.getElementById('track-live-area').innerText = `${calculateLiveEstArea().toLocaleString()} m²`;
  let currentSpeedKmH = 0;
  if (currentTrackingMode === 'sim') {
    currentSpeedKmH = (currentSpeedMode === 'walk' ? 5 : 15) + (Math.random() - 0.5) * 0.5;
  } else if (simulatedPath.length >= 2) {
    const last = simulatedPath[simulatedPath.length - 1];
    const prev = simulatedPath[simulatedPath.length - 2];
    currentSpeedKmH = L.latLng(prev[0], prev[1]).distanceTo(L.latLng(last[0], last[1])) * 3.6;
  }
  document.getElementById('track-speed').innerText = `${currentSpeedKmH.toFixed(1)} km/h`;
  if (currentSpeedKmH > sessionPeakSpeedKmH) sessionPeakSpeedKmH = currentSpeedKmH;
  document.getElementById('cheat-alert').classList.toggle('hidden', currentSpeedKmH <= SPEED_CHEAT_THRESHOLD_KMH);
  if (currentSpeedKmH > SPEED_CHEAT_THRESHOLD_KMH) sounds.playAlert();
  const distQuest = appState.challenges.find(c => c.id === 'c1');
  if (distQuest && !distQuest.completed) {
    distQuest.progress = Math.min(distQuest.max, 0.8 + distKm);
    checkQuestCompletion();
  }
}

function checkLoopClosure() {
  if (simulatedPath.length < 15) return;
  const startPoint = L.latLng(simulatedPath[0][0], simulatedPath[0][1]);
  const head = L.latLng(simulatedPath[simulatedPath.length - 1][0], simulatedPath[simulatedPath.length - 1][1]);
  const currentDistFromStart = head.distanceTo(startPoint);
  if (!window.maxSessionDist) window.maxSessionDist = 0;
  if (currentDistFromStart > window.maxSessionDist) window.maxSessionDist = currentDistFromStart;
  if (window.maxSessionDist < 20) return;
  for (let i = 0; i < Math.min(6, simulatedPath.length - 10); i++) {
    const point = L.latLng(simulatedPath[i][0], simulatedPath[i][1]);
    if (head.distanceTo(point) < 15) {
      simulatedPath.push([simulatedPath[i][0], simulatedPath[i][1]]);
      activePolyline.setLatLngs(simulatedPath);
      completeCapture();
      break;
    }
  }
}

function completeCapture() {
  isTracking = false;
  clearInterval(durationTimer);
  sounds.playCapture();
  const estArea = calculateLiveEstArea();
  if (estArea > 100) {
    const isTooFast = sessionPeakSpeedKmH > SPEED_CHEAT_THRESHOLD_KMH;
    if (isTooFast) {
      sounds.playAlert();
      showToast('❌ Cheat Detected!', `Peak speed of ${sessionPeakSpeedKmH.toFixed(1)} km/h exceeded the 30 km/h limit. Walk or run to capture!`);
    } else {
      const newTerrId = `user-capture-${Date.now()}`;
      const newTerrName = `Sector ${appState.territories.length + 1}`;
      const newTerr = { id: newTerrId, owner: 'user', name: newTerrName, strength: 100, area: estArea, points: JSON.parse(JSON.stringify(simulatedPath)) };
      appState.territories.push(newTerr);
      appState.user.totalCapturedArea += estArea;
      const xpGained = 50 + Math.floor(estArea / 500);
      addXP(xpGained);
      const captureWeekly = appState.challenges.find(c => c.id === 'c4');
      if (captureWeekly && !captureWeekly.completed) captureWeekly.progress = Math.min(captureWeekly.max, captureWeekly.progress + 1);
      showToast('🎉 Area Captured!', `Successfully claimed ${newTerrName} (${estArea.toLocaleString()} m²)! Earned +${xpGained} XP.`);
      renderTerritories();
      saveState();
      syncStatsUI();
    }
  }
  document.getElementById('active-workout-bar').classList.add('hidden');
  document.getElementById('tracker-start-btn').classList.remove('hidden');
  document.getElementById('tracker-pause-btn').classList.add('hidden');
  document.getElementById('tracker-stop-btn').classList.add('hidden');
  document.getElementById('cheat-alert').classList.add('hidden');
  if (activePolyline) map.removeLayer(activePolyline);
}

function startCompetitorSimulation() {
  const competitor1Loc = [37.4285, -122.1690];
  const competitor2Loc = [37.4258, -122.1690];
  const cTimer = setInterval(() => {
    competitor1Loc[0] += (Math.random() - 0.5) * 0.0002;
    competitor1Loc[1] += (Math.random() - 0.5) * 0.00025;
    competitor2Loc[0] += (Math.random() - 0.5) * 0.0002;
    competitor2Loc[1] += (Math.random() - 0.5) * 0.00025;
    if (Math.random() > 0.85 && map) {
      const isAlpha = Math.random() > 0.5;
      const owner = isAlpha ? 'alpha' : 'beta';
      const startLoc = isAlpha ? competitor1Loc : competitor2Loc;
      const newPt = [[startLoc[0] - 0.0004, startLoc[1] - 0.0005], [startLoc[0] + 0.0004, startLoc[1] - 0.0005], [startLoc[0] + 0.0004, startLoc[1] + 0.0005], [startLoc[0] - 0.0004, startLoc[1] + 0.0005]];
      appState.territories.push({ id: `ai-${owner}-${Date.now()}`, owner, name: `${owner === 'alpha' ? 'Alpha' : 'Beta'} Sector`, strength: 80, points: newPt });
      renderTerritories();
      if (Math.random() > 0.6) showGuardianNotification('⚔️ Territory Under Attack!', `Opponent ${owner.toUpperCase()} has captured territory near you! Go defend your turf.`);
    }
  }, 10000);
  mockCompetitorTimers.push(cTimer);
}

const LEVEL_TITLES = ['Beginner', 'Explorer', 'Challenger', 'Champion', 'Legend'];

function addXP(amount) {
  appState.user.xp += amount;
  const xpQuest = appState.challenges.find(c => c.id === 'c2');
  if (xpQuest && !xpQuest.completed) xpQuest.progress = Math.min(xpQuest.max, xpQuest.progress + amount);
  if (appState.user.xp >= appState.user.xpMax) {
    appState.user.xp -= appState.user.xpMax;
    appState.user.level++;
    appState.user.xpMax = 1000 + (appState.user.level - 1) * 200;
    triggerLevelUpModal();
  }
  saveState();
  syncStatsUI();
}

function triggerLevelUpModal() {
  const modal = document.getElementById('level-up-modal');
  document.getElementById('modal-level-badge').innerText = getRankTitle(appState.user.level);
  document.getElementById('modal-level-num').innerText = appState.user.level;
  modal.classList.remove('hidden');
  sounds.playLevelUp();
  createConfetti();
}

function createConfetti() {
  const container = document.getElementById('confetti-canvas-container');
  container.innerHTML = '';
  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899', '#A855F7'];
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 2}s`;
    piece.style.transform = `scale(${Math.random() * 0.8 + 0.4})`;
    container.appendChild(piece);
  }
}

function renderMissions() {
  const dailyContainer = document.getElementById('daily-mission-list');
  const fullContainer = document.getElementById('challenges-list-full');
  const badgesContainer = document.getElementById('badges-grid-container');
  dailyContainer.innerHTML = '';
  fullContainer.innerHTML = '';
  badgesContainer.innerHTML = '';
  appState.challenges.filter(c => c.type === 'daily').forEach(quest => {
    const progressPercent = (quest.progress / quest.max) * 100;
    const card = document.createElement('div');
    card.className = `mission-card ${quest.completed ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="mission-badge-icon">${quest.badge}</div>
      <div class="mission-info">
        <h4>${quest.title}</h4>
        <div class="mission-reward-tag"><i class="fa-solid fa-bolt"></i> +${quest.xpReward} XP</div>
        <div class="mission-progress-bar"><div class="mission-progress-fill" style="width: ${progressPercent}%"></div></div>
      </div>
      <div class="mission-checkbox"><i class="fa-solid fa-check"></i></div>
    `;
    dailyContainer.appendChild(card);
  });
  const filteredQuests = appState.challenges.filter(c => c.type === activeChallengeFilter);
  filteredQuests.forEach(quest => {
    const progressPercent = (quest.progress / quest.max) * 100;
    const card = document.createElement('div');
    card.className = `mission-card ${quest.completed ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="mission-badge-icon">${quest.badge}</div>
      <div class="mission-info">
        <div style="display:flex; justify-content:space-between; align-items:center;"><h4>${quest.title}</h4><span style="font-size:10px; opacity:0.6; text-transform:uppercase;">${quest.type}</span></div>
        <p class="mission-desc">${quest.desc}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;"><div class="mission-reward-tag"><i class="fa-solid fa-bolt"></i> +${quest.xpReward} XP</div><span style="font-size:11px; font-weight:700;">${quest.progress.toFixed(1)} / ${quest.max} ${quest.unit}</span></div>
        <div class="mission-progress-bar"><div class="mission-progress-fill" style="width: ${progressPercent}%"></div></div>
      </div>
      <div class="mission-checkbox"><i class="fa-solid fa-check"></i></div>
    `;
    fullContainer.appendChild(card);
  });
  appState.badges.forEach(badge => {
    const item = document.createElement('div');
    item.className = `badge-item ${badge.unlocked ? '' : 'locked'}`;
    item.title = badge.desc;
    item.innerHTML = `<div class="badge-icon">${badge.icon}</div><div class="badge-name">${badge.name}</div>`;
    badgesContainer.appendChild(item);
  });
}

function checkQuestCompletion() {
  appState.challenges.forEach(quest => {
    if (!quest.completed && quest.progress >= quest.max) {
      quest.completed = true;
      addXP(quest.xpReward);
      showToast('🏆 Challenge Completed!', `Nice job! Completed "${quest.title}" and earned +${quest.xpReward} XP.`);
      if (quest.id === 'c3') {
        const badge = appState.badges.find(b => b.id === 'b3');
        if (badge) badge.unlocked = true;
      }
    }
  });
  saveState();
  renderMissions();
}

function renderLeaderboard() {
  const itemsContainer = document.getElementById('leaderboard-items');
  itemsContainer.innerHTML = '';
  appState.leaderboard.sort((a, b) => b.score - a.score);
  appState.leaderboard.forEach((item, index) => {
    item.rank = index + 1;
    let medal = item.rank;
    if (item.rank === 1) medal = '🥇'; else if (item.rank === 2) medal = '🥈'; else if (item.rank === 3) medal = '🥉';
    let avatarHtml = `<div class="leader-avatar">${item.avatar}</div>`;
    if (item.isUser && appState.user.avatarImage) {
      avatarHtml = `<div class="leader-avatar has-image" style="background-image: url(${appState.user.avatarImage});"></div>`;
    }
    const div = document.createElement('div');
    div.className = `leader-item ${item.isUser ? 'user-item' : ''}`;
    div.innerHTML = `
      <div class="leader-rank">${medal}</div>
      ${avatarHtml}
      <div class="leader-info"><div class="leader-name">${item.name}</div><div class="leader-strength">Turf: ${item.score.toLocaleString()} XP</div></div>
      <div class="leader-score">${item.score.toLocaleString()} XP</div>
    `;
    itemsContainer.appendChild(div);
  });
}

const COACH_RESPONSES = {
  default: "I analyze your logs, consistency, and active streaks. Walking at this time keeps your metabolism active! What training recommendation do you need today?",
  analyze: "📊 **Consistency Report**: You completed **3.5 km** today, matching your 7-day average. You captured 1 neutral zone and defended Home Base. Fatigue status is **Low**. Excellent rhythm!",
  target: "🎯 **Tomorrow's Goal**: Let's challenge ourselves. Walk **2.5 km** at the Stanford Oval and complete a full loop to expand your territory boundaries. This will secure you +100 XP!",
  fatigue: "🛡️ **Overtraining Check**: Your health consistency is at **82/100**. You completed workouts 4 days in a row. You are not overtraining, but I suggest focusing on short, low-intensity walks tomorrow to recover.",
  streak: "🔥 **Streak Protection**: Maintain active logs daily (minimum 100m walks or captures) to secure your streak rewards. At day 10, you unlock a **Territory Shield** which slows down decay by 50%!"
};

function initCoachChat() {
  const form = document.getElementById('coach-chat-form');
  const input = document.getElementById('coach-message-input');
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      sounds.playClick();
      const prompt = chip.dataset.prompt;
      addUserBubble(prompt);
      setTimeout(() => { addCoachBubble(prompt.includes('consistency') ? COACH_RESPONSES.analyze : prompt.includes('target') ? COACH_RESPONSES.target : prompt.includes('overtraining') ? COACH_RESPONSES.fatigue : prompt.includes('protection') ? COACH_RESPONSES.streak : COACH_RESPONSES.default); }, 700);
    });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;
    addUserBubble(txt);
    input.value = '';
    setTimeout(() => {
      let reply = COACH_RESPONSES.default;
      const lower = txt.toLowerCase();
      if (lower.includes('analyze') || lower.includes('performance') || lower.includes('workout')) reply = COACH_RESPONSES.analyze;
      else if (lower.includes('goal') || lower.includes('suggest') || lower.includes('tomorrow')) reply = COACH_RESPONSES.target;
      else if (lower.includes('overtrain') || lower.includes('fatigue') || lower.includes('recovery')) reply = COACH_RESPONSES.fatigue;
      else if (lower.includes('streak') || lower.includes('protection') || lower.includes('shield')) reply = COACH_RESPONSES.streak;
      addCoachBubble(reply);
    }, 800);
  });
}

function addUserBubble(text) {
  const viewport = document.getElementById('chat-messages');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'chat-bubble user';
  div.innerHTML = `<div class="bubble-content">${text}</div><span class="bubble-time">${time}</span>`;
  viewport.appendChild(div);
  viewport.scrollTop = viewport.scrollHeight;
}

function addCoachBubble(text) {
  const viewport = document.getElementById('chat-messages');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const parsedText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/📊|🎯|🛡️|🔥/g, (match) => `<span style="font-size: 1.1em">${match}</span>`);
  const div = document.createElement('div');
  div.className = 'chat-bubble coach';
  div.innerHTML = `<div class="bubble-content">${parsedText}</div><span class="bubble-time">${time}</span>`;
  viewport.appendChild(div);
  viewport.scrollTop = viewport.scrollHeight;
}

function initNotificationSimulator() {
  document.getElementById('notif-trigger-btn').addEventListener('click', () => {
    sounds.playClick();
    const notifications = [
      '🏞️ Your territory misses you. A quick walk will keep it strong.',
      '🛡️ Your territory has lost 15% strength today. Time to defend it!',
      '🔥 You are on a 7-day streak. Keep it alive today!',
      '🏃 Only 500 steps left to complete today\'s walking challenge.',
      '👑 Opponent Alpha Runner is catching up. Secure your border now!'
    ];
    showGuardianNotification('🛡️ Territory Guardian', notifications[Math.floor(Math.random() * notifications.length)]);
  });
  document.getElementById('notif-close-btn').addEventListener('click', () => document.getElementById('notification-banner').classList.add('hidden'));
}

function showGuardianNotification(title, text) {
  const banner = document.getElementById('notification-banner');
  banner.querySelector('.notif-title').innerText = title;
  banner.querySelector('.notif-body').innerText = text;
  banner.classList.remove('hidden');
  sounds.playTone(440, 'sine', 0.25);
  setTimeout(() => banner.classList.add('hidden'), 6000);
}

function showToast(title, body) {
  showGuardianNotification(title, body);
}

function fastForwardTime(days) {
  sounds.playClick();
  const userTerritories = appState.territories.filter(t => t.owner === 'user');
  if (userTerritories.length === 0) return showToast('⚠️ No Territories', 'You do not own any territories to decay!');
  let warningAlertTriggered = false;
  let lostAlertTriggered = false;
  userTerritories.forEach(terr => {
    const decayAmount = days * 15;
    const oldStrength = terr.strength;
    terr.strength = Math.max(0, terr.strength - decayAmount);
    if (terr.strength === 0 && oldStrength > 0) {
      terr.owner = 'neutral';
      const lostArea = terr.area || 12000;
      appState.user.totalCapturedArea = Math.max(0, appState.user.totalCapturedArea - lostArea);
      lostAlertTriggered = true;
      showToast('❌ Territory Lost!', `"${terr.name}" decayed to 0% and was lost to neutral space!`);
    } else if (terr.strength <= 30 && oldStrength > 30) {
      warningAlertTriggered = true;
    }
  });
  if (lostAlertTriggered) sounds.playAlert();
  else if (warningAlertTriggered) {
    sounds.playTone(200, 'sawtooth', 0.4);
    showGuardianNotification('🛡️ Critical Decay Alert!', 'One or more territories are below 30% strength! Revisit them to defend.');
  } else {
    showToast('⏳ Time Skips Forward', `Fast-forwarded ${days} day(s). Territories lost strength.`);
  }
  saveState();
  renderTerritories();
  syncStatsUI();
}

function renderDecayDashboard() {
  function renderIntoContainer(containerId, badgeId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const userTerritories = appState.territories.filter(t => t.owner === 'user');
    const badge = document.getElementById(badgeId);
    if (badge) badge.innerText = `${userTerritories.length} Active`;
    if (userTerritories.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:24px 16px; font-size:13px; color:var(--text-muted);">
          <div style="font-size:2rem; margin-bottom:8px;">🗺️</div>
          No territories yet — go capture some on the map!
        </div>
      `;
      return;
    }
    userTerritories.forEach(terr => {
      let healthClass = 'healthy';
      let pctClass = 'healthy';
      let icon = '🟢';
      if (terr.strength <= 15) { healthClass = 'critical'; pctClass = 'critical'; icon = '🚨'; }
      else if (terr.strength <= 44) { healthClass = 'fading'; pctClass = 'fading'; icon = '⚠️'; }
      else if (terr.strength <= 74) { healthClass = 'stable'; pctClass = 'stable'; icon = '🟡'; }
      const card = document.createElement('div');
      card.className = `decay-card ${terr.strength <= 15 ? 'danger-state' : ''}`;
      card.innerHTML = `
        <div class="decay-icon">${icon}</div>
        <div class="decay-info-block">
          <div class="decay-row-top"><span class="decay-card-title">${terr.name}</span><span class="decay-pct ${pctClass}">${terr.strength}%</span></div>
          <div class="decay-area-label">${(terr.area || 12000).toLocaleString()} m²</div>
          <div class="decay-progress-track"><div class="decay-progress-bar ${healthClass}" style="width: ${terr.strength}%"></div></div>
        </div>
        <button class="btn btn-outline decay-defend-btn" onclick="revisitTerritory('${terr.id}')">🛡️ Defend</button>
      `;
      container.appendChild(card);
    });
  }
  renderIntoContainer('decay-list-container', 'decay-count-badge');
  renderIntoContainer('decay-list-container-2', 'decay-count-badge-2');
  const userTerrs = appState.territories.filter(t => t.owner === 'user');
  document.getElementById('decay-total-count').innerText = userTerrs.length;
  document.getElementById('decay-healthy-count').innerText = userTerrs.filter(t => t.strength > 74).length;
  document.getElementById('decay-fading-count').innerText = userTerrs.filter(t => t.strength > 15 && t.strength <= 74).length;
  document.getElementById('decay-critical-count').innerText = userTerrs.filter(t => t.strength <= 15).length;
}

function renderZarssTable() {
  const container = document.getElementById('dashboard-table-list');
  container.innerHTML = '';
  const items = [];
  appState.territories.filter(t => t.owner === 'user').forEach(terr => {
    const chipClass = terr.strength < 45 ? 'fading' : 'completed';
    const chipText = terr.strength < 45 ? 'Fading' : 'Healthy';
    items.push({ name: `You (${terr.name})`, value: `${(terr.area || 12000).toLocaleString()} m²`, chipClass, chipText, avatarContent: appState.user.avatar, avatarStyle: appState.user.avatarImage ? `background-image: url(${appState.user.avatarImage});` : '', timestamp: Date.now() - (terr.strength < 45 ? 86400000 : 3600000) });
  });
  ['David Astee (AI)|14,560 m²|chargeback|Captured|7200000','Maria Hulama (AI)|42,430 m²|completed|Healthy|14400000','Arnold Swarz (AI)|3,412 m²|completed|Healthy|28800000'].forEach(entry => {
    const [name,value,chipClass,chipText,timestamp] = entry.split('|');
    items.push({ name, value, chipClass, chipText, avatarContent: chipClass === 'chargeback' ? '🦁' : chipClass === 'completed' ? '🦉' : '⚡', avatarStyle: '', timestamp: Number(timestamp) });
  });
  items.sort((a, b) => b.timestamp - a.timestamp);
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'zarss-table-row';
    const dateObj = new Date(item.timestamp);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateStr = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    row.innerHTML = `
      <div class="ztr-left"><div class="ztr-avatar" style="${item.avatarStyle}">${item.avatarContent}</div><div class="ztr-info"><span class="ztr-name">${item.name}</span></div></div>
      <div class="ztr-value">${item.value}</div>
      <div class="ztr-right"><span class="ztr-chip ${item.chipClass}">${item.chipText}</span><span class="ztr-date">${dateStr}</span></div>
    `;
    container.appendChild(row);
  });
}

function initZarssChart() {
  document.querySelectorAll('.zarss-bar-graph .chart-col-track').forEach(col => {
    const barFill = col.querySelector('.chart-bar-fill');
    const container = col.querySelector('.chart-bar-container');
    const dayLabel = col.querySelector('.chart-day-label').innerText.toLowerCase();
    const dailyValues = { mon: { pct: 40, val: '16,240 m²' }, tue: { pct: 65, val: '24,575 m²' }, wed: { pct: 82, val: '33,567 m²' }, thu: { pct: 30, val: '10,120 m²' }, fri: { pct: 55, val: '18,450 m²' }, sat: { pct: 75, val: '29,800 m²' }, sun: { pct: 15, val: '0 m²' } };
    const pct = dayLabel === 'sun' ? Math.min(100, appState.user.healthScore) : dailyValues[dayLabel]?.pct || 0;
    const val = dayLabel === 'sun' ? `${appState.user.totalCapturedArea.toLocaleString()} m²` : dailyValues[dayLabel]?.val || '0 m²';
    let tooltip = container.querySelector('.chart-tooltip-bubble');
    if (!tooltip) { tooltip = document.createElement('div'); tooltip.className = 'chart-tooltip-bubble'; container.appendChild(tooltip); }
    tooltip.innerText = val;
    barFill.style.height = `${pct}%`;
    col.addEventListener('click', () => {
      sounds.playClick();
      document.querySelectorAll('.zarss-bar-graph .chart-bar-container').forEach(c => c.classList.remove('active-day'));
      container.classList.add('active-day');
    });
  });
}

function initTimeMachine() {
  document.getElementById('tm-add-1d').addEventListener('click', () => fastForwardTime(1));
  document.getElementById('tm-add-3d').addEventListener('click', () => fastForwardTime(3));
  document.getElementById('tm-add-7d').addEventListener('click', () => fastForwardTime(7));
  document.getElementById('tm2-add-1d').addEventListener('click', () => fastForwardTime(1));
  document.getElementById('tm2-add-3d').addEventListener('click', () => fastForwardTime(3));
  document.getElementById('tm2-add-7d').addEventListener('click', () => fastForwardTime(7));
}

function syncStatsUI() {
  document.getElementById('header-username').innerText = appState.user.username;
  document.getElementById('welcome-name').innerText = appState.user.username;
  document.getElementById('sidebar-username-txt')?.innerText = appState.user.username;
  document.getElementById('profile-username-textbox').value = appState.user.username;
  const headerAvatar = document.getElementById('header-avatar');
  const profileAvatar = document.getElementById('profile-avatar-emoji');
  const sidebarAvatar = document.getElementById('sidebar-avatar-img');
  if (appState.user.avatarImage) {
    [headerAvatar, profileAvatar, sidebarAvatar].forEach(el => { if (!el) return; el.style.backgroundImage = `url(${appState.user.avatarImage})`; el.classList.add('has-image'); el.innerText = ''; });
  } else {
    headerAvatar.style.backgroundImage = 'none'; headerAvatar.classList.remove('has-image'); headerAvatar.innerText = appState.user.avatar;
    profileAvatar.style.backgroundImage = 'none'; profileAvatar.classList.remove('has-image'); profileAvatar.innerText = appState.user.avatar;
    if (sidebarAvatar) { sidebarAvatar.style.backgroundImage = 'none'; sidebarAvatar.classList.remove('has-image'); sidebarAvatar.innerText = appState.user.avatar; }
  }
  document.getElementById('header-level').innerText = appState.user.level;
  document.getElementById('header-streak').innerText = appState.user.streak;
  document.getElementById('header-xp-current').innerText = appState.user.xp;
  document.getElementById('header-xp-max').innerText = appState.user.xpMax;
  document.getElementById('header-xp-bar').style.width = `${(appState.user.xp / appState.user.xpMax) * 100}%`;
  document.getElementById('header-rank-title').innerText = getRankTitle(appState.user.level);
  document.getElementById('dashboard-health-score').innerText = `${appState.user.healthScore}/100`;
  document.getElementById('dashboard-territory-size').innerText = `${appState.user.totalCapturedArea.toLocaleString()} m²`;
  document.getElementById('stat-territory-size').innerText = `${appState.user.totalCapturedArea.toLocaleString()} m²`;
  const avgStrength = appState.territories.filter(t => t.owner === 'user').reduce((sum, t) => sum + t.strength, 0) / Math.max(1, appState.territories.filter(t => t.owner === 'user').length);
  document.getElementById('stat-territory-strength').innerText = `${Math.round(avgStrength)}%`;
  document.getElementById('stat-streak-val').innerText = `${appState.user.streak} Days`;
  document.getElementById('profile-level-badge').innerText = `Level ${appState.user.level} ${getRankTitle(appState.user.level)}`;
  document.getElementById('profile-total-captured').innerText = `${appState.user.totalCapturedArea.toLocaleString()} m²`;
  document.getElementById('profile-max-streak').innerText = `${appState.user.longestStreak} Days`;
  document.getElementById('chart-today-bar').style.height = `${appState.user.healthScore}%`;
  renderDecayDashboard();
  renderZarssTable();
}

function initProfileActions() {
  document.getElementById('profile-username-textbox').addEventListener('input', (e) => {
    const name = e.target.value.trim();
    if (!name) return;
    appState.user.username = name;
    appState.leaderboard.find(l => l.isUser).name = name;
    saveState();
    document.getElementById('header-username').innerText = name;
    document.getElementById('welcome-name').innerText = name;
  });
  document.getElementById('profile-photo-upload-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      appState.user.avatarImage = reader.result;
      updateMapUserMarker();
      saveState();
      syncStatsUI();
      renderLeaderboard();
      showToast('🖼️ Profile Updated', 'Your new custom photo has been applied successfully!');
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (!confirm('Are you sure you want to reset all app progress and territories?')) return;
    sounds.playClick();
    appState.user = { username: '', level: 1, xp: 0, xpMax: 1000, streak: 0, healthScore: 0, longestStreak: 0, avatar: '🏃‍♂️', avatarImage: '', isLoggedIn: false, totalCapturedArea: 0 };
    appState.territories = appState.territories.filter(t => t.owner !== 'user');
    appState.challenges.forEach(c => { c.progress = 0; c.completed = false; });
    appState.badges.forEach(b => b.unlocked = false);
    saveState();
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    updateMapUserMarker();
    syncStatsUI();
    renderMissions();
    renderLeaderboard();
    renderTerritories();
    showToast('🗑️ Data Reset', 'Reverted database to a clean Level 1 profile.');
  });
  document.getElementById('btn-randomize-territories').addEventListener('click', () => {
    sounds.playClick();
    const center = userPos;
    ['alpha','beta'].forEach((owner, i) => {
      const ox = (Math.random() - 0.5) * 0.003;
      const oy = (Math.random() - 0.5) * 0.003;
      appState.territories.push({ id: `spawn-ai-${Date.now()}-${i}`, owner, name: `Spawn Sector ${i+1}`, strength: 50 + Math.floor(Math.random() * 50), points: [[center[0] + ox - 0.0003, center[1] + oy - 0.0004], [center[0] + ox + 0.0003, center[1] + oy - 0.0004], [center[0] + ox + 0.0003, center[1] + oy + 0.0004], [center[0] + ox - 0.0003, center[1] + oy + 0.0004]] });
    });
    renderTerritories();
    saveState();
    showToast('🎲 Territories Spawned!', 'Created rival zones nearby. Defend your turf!');
  });
  document.querySelectorAll('#profile-emoji-selectors .avatar-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      sounds.playClick();
      document.querySelectorAll('#profile-emoji-selectors .avatar-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      appState.user.avatar = opt.dataset.emoji;
      appState.user.avatarImage = '';
      updateMapUserMarker();
      saveState();
      syncStatsUI();
      renderLeaderboard();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  document.getElementById('modal-close-btn').addEventListener('click', () => { sounds.playClick(); document.getElementById('level-up-modal').classList.add('hidden'); });
  document.getElementById('home-start-btn').addEventListener('click', () => { sounds.playClick(); document.querySelector('.nav-tab[data-screen="map"]')?.click(); setTimeout(() => document.getElementById('tracker-start-btn').click(), 300); });
  const themeBtn = document.getElementById('theme-toggle-btn');
  let isDayMode = localStorage.getItem('my_territory_theme') === 'day';
  const applyTheme = (isDay) => {
    document.body.classList.toggle('day-mode', isDay);
    themeBtn.classList.toggle('active', isDay);
    themeBtn.querySelector('i').className = isDay ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    themeBtn.title = isDay ? 'Switch to Night Mode' : 'Switch to Day Mode';
  };
  applyTheme(isDayMode);
  themeBtn.addEventListener('click', () => { isDayMode = !isDayMode; applyTheme(isDayMode); localStorage.setItem('my_territory_theme', isDayMode ? 'day' : 'night'); sounds.playClick(); });
  const viewBtn = document.getElementById('view-toggle-btn');
  let isLaptopView = false;
  document.querySelectorAll('#laptop-sidebar-nav .ls-item').forEach(item => { item.addEventListener('click', () => { const target = item.dataset.screen; if (!target) return; document.querySelector(`.bottom-nav-btn[data-screen="${target}"]`)?.click(); document.querySelectorAll('#laptop-sidebar-nav .ls-item').forEach(el => el.classList.remove('active')); item.classList.add('active'); }); });
  viewBtn.addEventListener('click', () => { isLaptopView = !isLaptopView; document.body.classList.toggle('laptop-view', isLaptopView); viewBtn.classList.toggle('active', isLaptopView); viewBtn.querySelector('i').className = isLaptopView ? 'fa-solid fa-laptop' : 'fa-solid fa-mobile-screen'; viewBtn.title = isLaptopView ? 'Switch to Mobile View' : 'Switch to Laptop View'; sounds.playClick(); });
  renderMissions();
  renderLeaderboard();
  initNavigation();
  initMap();
  initCoachChat();
  initNotificationSimulator();
  initProfileActions();
  initChallengesFilter();
  initAuth();
  initTimeMachine();
  initZarssChart();
  let width = 0;
  const fill = document.getElementById('splash-progress');
  const splashTimer = setInterval(() => {
    width += 5;
    fill.style.width = `${width}%`;
    if (width >= 100) {
      clearInterval(splashTimer);
      document.getElementById('splash-screen').classList.add('hidden');
      if (appState.user.isLoggedIn) {
        document.getElementById('main-app').classList.remove('hidden');
        syncStatsUI();
        sounds.playTone(400, 'sine', 0.2);
      } else {
        document.getElementById('auth-screen').classList.remove('hidden');
      }
    }
  }, 60);
});
