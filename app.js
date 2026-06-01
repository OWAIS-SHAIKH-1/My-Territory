/* =============================================
   MY TERRITORY — APP v3.0
   Auth + Real GPS + Google Maps + Territory Polygons
   ============================================= */
'use strict';

/* ═══════════════════════════════════════════════
   STORAGE KEYS
═══════════════════════════════════════════════ */
const STORE = {
  USERS:    'mt_users',
  SESSION:  'mt_session',
  GAME:     'mt_game_',
  GM_KEY:   'mt_gm_key',
};

/* ═══════════════════════════════════════════════
   UTILITY HELPERS
═══════════════════════════════════════════════ */
function el(id) { return document.getElementById(id); }
function cls(el, ...c) { el.classList.add(...c); }
function uncls(el, ...c) { el.classList.remove(...c); }

let _toastTimer = null;
function showToast(msg, dur = 3000) {
  const t = el('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

/* Simple hash (not cryptographic — prototype only) */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

/* Distance between two lat/lng points in meters (Haversine) */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* Compute area of polygon (in m²) using Shoelace formula on lat/lng */
function polygonArea(points) {
  if (points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const [lat1, lng1] = points[i];
    const [lat2, lng2] = points[(i+1) % n];
    area += (lng1 + lng2) * (lat1 - lat2);
  }
  return Math.abs(area / 2) * 111000 * 111000;
}

/* ═══════════════════════════════════════════════
   CONVEX HULL (Andrew's Monotone Chain)
═══════════════════════════════════════════════ */
function convexHull(points) {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
  const cross = (O, A, B) => (A[0]-O[0])*(B[1]-O[1]) - (A[1]-O[1])*(B[0]-O[0]);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

/* Expand hull outward from its centroid by `deg` degrees (~10m) */
function expandHull(hull, deg = 0.00015) {
  if (hull.length === 0) return hull;
  const cLat = hull.reduce((s,p) => s+p[0], 0) / hull.length;
  const cLng = hull.reduce((s,p) => s+p[1], 0) / hull.length;
  return hull.map(([lat, lng]) => {
    const dLat = lat - cLat, dLng = lng - cLng;
    const len = Math.sqrt(dLat*dLat + dLng*dLng) || 1;
    return [lat + dLat/len*deg, lng + dLng/len*deg];
  });
}

/* ═══════════════════════════════════════════════
   AUTH MODULE
═══════════════════════════════════════════════ */
const Auth = (() => {
  let _otp = null;
  let _otpPhone = null;
  let _otpTimer = null;
  let _countryCode = '+1';
  let _regStep = 1;
  let _pendingUser = {};

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(STORE.USERS) || '{}'); }
    catch { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(STORE.USERS, JSON.stringify(users));
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(STORE.SESSION) || 'null'); }
    catch { return null; }
  }

  function saveSession(phone) {
    localStorage.setItem(STORE.SESSION, JSON.stringify({ phone, ts: Date.now() }));
  }

  function currentUser() {
    const s = getSession();
    if (!s) return null;
    const users = getUsers();
    return users[s.phone] || null;
  }

  /* ── Show / Hide panels ── */
  function _showPanel(id) {
    document.querySelectorAll('.auth-panel').forEach(p => {
      p.classList.remove('active');
      p.classList.add('slide-left');
    });
    setTimeout(() => {
      document.querySelectorAll('.auth-panel').forEach(p => uncls(p, 'slide-left'));
      const panel = el(id);
      if (panel) panel.classList.add('active');
    }, 10);
  }

  function showRegister() { _regStep = 1; _showRegStep(1); _showPanel('authRegister'); }
  function showLogin()    { _showPanel('authLogin'); }
  function back()         { _showPanel('authWelcome'); }

  function _showRegStep(step) {
    _regStep = step;
    document.querySelectorAll('.reg-step').forEach(s => s.classList.remove('active'));
    const s = el(`regStep${step}`);
    if (s) s.classList.add('active');
    // Update step dots
    ['rDot1','rDot2','rDot3'].forEach((id, i) => {
      const dot = el(id);
      if (!dot) return;
      uncls(dot, 'active', 'done');
      if (i+1 < step) dot.classList.add('done');
      else if (i+1 === step) dot.classList.add('active');
    });
    ['rLine12','rLine23'].forEach((id, i) => {
      const line = el(id);
      if (!line) return;
      uncls(line, 'done');
      if (step > i+1) line.classList.add('done');
    });
  }

  /* ── Country Selection ── */
  function toggleCountry(event) {
    if (event) event.stopPropagation();
    const dd = el('countryDropdown');
    if (!dd) return;
    const isHidden = dd.classList.contains('hidden');
    // Close all dropdowns first
    document.querySelectorAll('.country-dropdown').forEach(d => d.classList.add('hidden'));
    if (isHidden) dd.classList.remove('hidden');
  }

  function selectCountry(btn) {
    if (!btn) return;
    _countryCode = btn.dataset.code || '+1';
    const flag = btn.dataset.flag || '🌐';
    const countryFlagEl = el('countryFlag');
    const countryCodeEl = el('countryCode');
    if (countryFlagEl) countryFlagEl.textContent = flag;
    if (countryCodeEl) countryCodeEl.textContent = _countryCode;
    const dd = el('countryDropdown');
    if (dd) dd.classList.add('hidden');
    showToast(`Country set to ${flag} ${_countryCode}`);
  }

  /* ── Send OTP ── */
  function sendOTP() {
    const name  = (el('regName')?.value || '').trim();
    const phone = (el('regPhone')?.value || '').replace(/\D/g,'').trim();

    if (!name) { showError('Please enter your name.'); return; }
    if (phone.length < 7) { showError('Enter a valid phone number.'); return; }

    const fullPhone = _countryCode + phone;
    const users = getUsers();
    if (users[fullPhone]) { showError('This phone is already registered. Please sign in.'); return; }

    _pendingUser = { name, phone: fullPhone };
    _otpPhone = fullPhone;

    // Generate 6-digit OTP
    _otp = String(Math.floor(100000 + Math.random() * 900000));

    // Show OTP demo box
    el('otpDemoCode').textContent = _otp;
    el('otpSentTo').textContent = `OTP sent to ${fullPhone}`;

    // Update login country flag for later
    if (el('loginFlag')) el('loginFlag').textContent = el('countryFlag').textContent;
    if (el('loginCode')) el('loginCode').textContent = _countryCode;

    // Move to step 2
    _showRegStep(2);

    // Focus first OTP box
    setTimeout(() => {
      const first = document.querySelector('.otp-box');
      if (first) first.focus();
    }, 100);

    // Start 60s countdown
    startOTPTimer();
    showToast(`📱 OTP generated! Check the demo box. (Production: SMS to ${fullPhone})`);
  }

  function startOTPTimer() {
    let count = 60;
    const timerEl = el('otpTimer');
    const resendEl = el('resendBtn');
    if (timerEl) timerEl.style.display = 'block';
    if (resendEl) resendEl.style.display = 'none';
    clearInterval(_otpTimer);
    _otpTimer = setInterval(() => {
      count--;
      const c = el('timerCount');
      if (c) c.textContent = count;
      if (count <= 0) {
        clearInterval(_otpTimer);
        if (timerEl) timerEl.style.display = 'none';
        if (resendEl) resendEl.style.display = 'block';
      }
    }, 1000);
  }

  function resendOTP() {
    _otp = String(Math.floor(100000 + Math.random() * 900000));
    el('otpDemoCode').textContent = _otp;
    startOTPTimer();
    // Clear OTP boxes
    document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; uncls(b, 'filled', 'error'); });
    document.querySelector('.otp-box')?.focus();
    showToast('📱 New OTP generated!');
  }

  /* ── OTP Input Handling ── */
  function otpInput(input) {
    const val = input.value.replace(/\D/g,'');
    input.value = val.slice(0,1);
    input.classList.toggle('filled', input.value.length > 0);
    if (val.length > 0) {
      const next = document.querySelector(`.otp-box[data-index="${parseInt(input.dataset.index)+1}"]`);
      if (next) next.focus();
    }
  }

  function otpKeydown(event, input) {
    if (event.key === 'Backspace' && !input.value) {
      const prev = document.querySelector(`.otp-box[data-index="${parseInt(input.dataset.index)-1}"]`);
      if (prev) { prev.value = ''; prev.classList.remove('filled'); prev.focus(); }
    }
  }

  function getOTPValue() {
    return Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
  }

  /* ── Verify OTP ── */
  function verifyOTP() {
    const entered = getOTPValue();
    if (entered.length < 6) { showError('Enter the full 6-digit OTP.'); return; }
    if (entered !== _otp) {
      document.querySelectorAll('.otp-box').forEach(b => { b.classList.add('error'); setTimeout(() => b.classList.remove('error'), 500); });
      showError('Incorrect OTP. Please try again.');
      return;
    }
    clearInterval(_otpTimer);
    showToast('✅ Phone verified!');
    _showRegStep(3);
  }

  /* ── Password strength ── */
  function checkPassStrength() {
    const pass = el('regPass')?.value || '';
    const fill = el('passStrengthFill');
    const label = el('passStrengthLabel');
    if (!fill || !label) return;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    const levels = [
      { w: '0%',   c: 'transparent', t: '' },
      { w: '25%',  c: '#EF4444', t: 'Weak' },
      { w: '50%',  c: '#F59E0B', t: 'Fair' },
      { w: '75%',  c: '#3B82F6', t: 'Good' },
      { w: '100%', c: '#10B981', t: 'Strong 💪' },
    ];
    const lv = levels[score] || levels[0];
    fill.style.width = lv.w;
    fill.style.background = lv.c;
    label.textContent = lv.t;
    label.style.color = lv.c;
  }

  function togglePass(inputId, btn) {
    const input = el(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
  }

  /* ── Create Account ── */
  function createAccount() {
    const pass = el('regPass')?.value || '';
    const conf = el('regPassConfirm')?.value || '';
    if (pass.length < 8) { showError('Password must be at least 8 characters.'); return; }
    if (pass !== conf) { showError('Passwords do not match.'); return; }

    const users = getUsers();
    users[_pendingUser.phone] = {
      name: _pendingUser.name,
      phone: _pendingUser.phone,
      passHash: simpleHash(pass),
      emoji: '🏃',
      createdAt: Date.now(),
      level: 1,
      xp: 0,
      xpNext: 500,
      streak: 0,
      healthScore: 80,
      totalArea: 0,
      totalDist: 0,
      sessions: 0,
    };
    saveUsers(users);
    saveSession(_pendingUser.phone);

    // Init game data
    initGameData(_pendingUser.phone);

    showToast(`🎉 Welcome, ${_pendingUser.name}! Account created!`);
    hideAuth();
    bootApp();
  }

  /* ── Login ── */
  function login() {
    const phone = (el('loginPhone')?.value || '').replace(/\D/g,'').trim();
    const pass  = (el('loginPass')?.value  || '').trim();
    const fullPhone = _countryCode + phone;

    if (!phone) { showError('Enter your phone number.'); return; }
    if (!pass)  { showError('Enter your password.'); return; }

    const users = getUsers();
    const user = users[fullPhone];
    if (!user) { showError('No account found with this phone number.'); return; }
    if (user.passHash !== simpleHash(pass)) { showError('Incorrect password. Please try again.'); return; }

    saveSession(fullPhone);
    showToast(`👋 Welcome back, ${user.name}!`);
    hideAuth();
    bootApp();
  }

  function forgotPassword() {
    showError('Password reset: Register a new account with the same phone to reset. (Demo: OTP-based reset coming soon)');
  }

  /* ── Logout ── */
  function logout() {
    if (confirm('Sign out of My Territory?')) {
      localStorage.removeItem(STORE.SESSION);
      location.reload();
    }
  }

  /* ── Error display ── */
  function showError(msg) {
    const e = el('authError');
    if (!e) return;
    e.textContent = msg;
    e.classList.remove('hidden');
    clearTimeout(showError._timer);
    showError._timer = setTimeout(() => e.classList.add('hidden'), 4000);
  }

  /* ── Check auth state on load ── */
  function check() {
    const session = getSession();
    if (session) {
      const user = currentUser();
      if (user) {
        hideAuth();
        return true;
      }
    }
    // Show auth
    el('authOverlay')?.classList.remove('hidden');
    return false;
  }

  function hideAuth() {
    const overlay = el('authOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transform = 'scale(1.04)';
      overlay.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      setTimeout(() => overlay.style.display = 'none', 500);
    }
  }

  return {
    check, currentUser, login, logout, forgotPassword,
    showRegister, showLogin, back,
    sendOTP, resendOTP, verifyOTP,
    otpInput, otpKeydown,
    createAccount, checkPassStrength, togglePass,
    toggleCountry, selectCountry,
    showError,
  };
})();

/* ═══════════════════════════════════════════════
   GAME DATA INIT + LOAD
═══════════════════════════════════════════════ */
const GameData = (() => {
  let _phone = null;

  function key(k) { return STORE.GAME + _phone + '_' + k; }

  function init(phone) {
    _phone = phone;
    if (!localStorage.getItem(key('territories'))) {
      localStorage.setItem(key('territories'), JSON.stringify([]));
    }
    if (!localStorage.getItem(key('sessions'))) {
      localStorage.setItem(key('sessions'), JSON.stringify([]));
    }
  }

  function getTerritories() {
    try { return JSON.parse(localStorage.getItem(key('territories')) || '[]'); }
    catch { return []; }
  }

  function saveTerritories(arr) {
    localStorage.setItem(key('territories'), JSON.stringify(arr));
  }

  function addTerritory(t) {
    const arr = getTerritories();
    arr.push(t);
    saveTerritories(arr);
  }

  function getSessions() {
    try { return JSON.parse(localStorage.getItem(key('sessions')) || '[]'); }
    catch { return []; }
  }

  function addSession(s) {
    const arr = getSessions();
    arr.push(s);
    localStorage.setItem(key('sessions'), JSON.stringify(arr));
  }

  function getUser() { return Auth.currentUser(); }

  function updateUser(changes) {
    const users = JSON.parse(localStorage.getItem(STORE.USERS) || '{}');
    if (!_phone || !users[_phone]) return;
    Object.assign(users[_phone], changes);
    localStorage.setItem(STORE.USERS, JSON.stringify(users));
  }

  return { init, getTerritories, saveTerritories, addTerritory, addSession, getUser, updateUser };
})();

/* ═══════════════════════════════════════════════
   GPS MODULE
═══════════════════════════════════════════════ */
const GPS = (() => {
  let _watchId = null;
  let _lastPos = null;
  let _state = 'idle'; // idle | searching | active | denied | error
  let _onUpdate = null;

  function requestPermission() {
    el('gpsOverlay').classList.add('hidden');
    if (!navigator.geolocation) {
      showToast('❌ GPS not supported in this browser.');
      App.setMode('sim');
      return;
    }
    _setState('searching');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        _lastPos = pos;
        _setState('active');
        el('gpsOverlay').classList.add('hidden');
        showToast('📍 GPS locked! Start Capture to begin tracking.');
        startWatch();
      },
      (err) => {
        _setState('error');
        el('gpsOverlay').classList.add('hidden');
        showToast(`❌ GPS Error: ${err.message}. Switching to simulation.`);
        App.setMode('sim');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function denyPermission() {
    el('gpsOverlay').classList.add('hidden');
    App.setMode('sim');
    showToast('🎮 Using simulation mode instead.');
  }

  function startWatch() {
    if (_watchId !== null) return;
    if (!navigator.geolocation) return;
    _watchId = navigator.geolocation.watchPosition(
      (pos) => {
        _lastPos = pos;
        _setState('active');
        if (_onUpdate) _onUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.speed);
      },
      (err) => {
        _setState('error');
        showToast(`⚠️ GPS signal lost: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  function stopWatch() {
    if (_watchId !== null) {
      navigator.geolocation.clearWatch(_watchId);
      _watchId = null;
    }
    _setState('idle');
  }

  function _setState(state) {
    _state = state;
    const dot = el('gpsPulseDot');
    const txt = el('gpsStatusText');
    if (!dot || !txt) return;
    uncls(dot, 'searching', 'error');
    switch (state) {
      case 'searching':
        dot.classList.add('searching');
        txt.textContent = 'Searching for GPS signal...';
        break;
      case 'active':
        txt.textContent = 'GPS Active — tracking';
        break;
      case 'error':
        dot.classList.add('error');
        txt.textContent = 'GPS signal lost';
        break;
      case 'idle':
        txt.textContent = 'GPS idle';
        break;
    }
  }

  function getState()   { return _state; }
  function getLastPos() { return _lastPos; }
  function onUpdate(fn) { _onUpdate = fn; }

  return { requestPermission, denyPermission, startWatch, stopWatch, getState, getLastPos, onUpdate };
})();

/* ═══════════════════════════════════════════════
   MAP ENGINE (Leaflet + optional Google Maps)
═══════════════════════════════════════════════ */
const MapEngine = (() => {
  let _map = null;
  let _playerMarker = null;
  let _accuracyCircle = null;
  let _trailPolyline = null;
  let _territoryPolygons = [];
  let _rivalMarkers = [];
  let _useGoogleMaps = false;
  let _googleLoaded = false;
  let _gmap = null;
  let _gmTrail = null;
  let _gmPlayerMarker = null;

  function init() {
    if (_map) { setTimeout(() => _map.invalidateSize(), 200); return; }

    // Try to load Google Maps if key is set
    const gmKey = localStorage.getItem(STORE.GM_KEY);
    if (gmKey && !_googleLoaded) {
      loadGoogleMaps(gmKey);
      return;
    }

    initLeaflet();
  }

  function initLeaflet() {
    const mapEl = el('leafletMap');
    if (!mapEl || _map) return;

    // Try to center on last known GPS position
    let lat = 51.505, lng = -0.09;
    const lastPos = GPS.getLastPos();
    if (lastPos) { lat = lastPos.coords.latitude; lng = lastPos.coords.longitude; }

    _map = L.map('leafletMap', { center: [lat, lng], zoom: 16, zoomControl: true, attributionControl: false });

    // Dark OSM tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(_map);

    // Player marker
    _playerMarker = L.marker([lat, lng], { icon: _playerIcon() }).addTo(_map);

    // Trail polyline
    _trailPolyline = L.polyline([], { color: '#10B981', weight: 4, opacity: 0.9, dashArray: null }).addTo(_map);

    // Draw existing territories
    drawAllTerritories();

    // Rival markers
    spawnRivalMarkers(lat, lng);

    // Set GPS update callback
    GPS.onUpdate((lat, lng, acc, spd) => {
      updatePlayerPosition(lat, lng, acc, spd);
    });
  }

  function _playerIcon() {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:32px;height:32px;
        background:linear-gradient(135deg,#10B981,#3B82F6);
        border:3px solid #fff;border-radius:50%;
        display:flex;align-items:center;justify-content:center;font-size:15px;
        box-shadow:0 0 16px rgba(16,185,129,0.8),0 0 40px rgba(16,185,129,0.3);
        animation:gpsPulse 1.5s ease infinite;
      ">🏃</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16],
    });
  }

  /* ── Update player position ── */
  function updatePlayerPosition(lat, lng, accuracy, speed) {
    if (!_map) return;

    // Move player marker
    if (_playerMarker) _playerMarker.setLatLng([lat, lng]);

    // Accuracy circle
    if (_accuracyCircle) {
      _accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy || 10);
    } else if (accuracy) {
      _accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#3B82F6', fillColor: '#3B82F6',
        fillOpacity: 0.08, weight: 1, opacity: 0.4, dashArray: '4',
      }).addTo(_map);
    }

    // Update accuracy badge
    const badge = el('gpsBadge');
    const accText = el('gpsAccText');
    if (badge && accText) {
      badge.classList.remove('hidden');
      accText.textContent = `GPS: ±${Math.round(accuracy || 0)}m`;
    }

    // Update coordinate display
    const coordsEl = el('gpsCoords');
    if (coordsEl) {
      coordsEl.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    // Update home card
    const lc = el('lastLocationCard');
    if (lc) lc.textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)} · ±${Math.round(accuracy||0)}m`;

    // Pan map to player
    _map.panTo([lat, lng], { animate: true, duration: 0.5 });

    // Notify App
    App._onGPSUpdate(lat, lng, accuracy, speed);
  }

  /* ── Trail ── */
  function addTrailPoint(lat, lng) {
    if (!_map || !_trailPolyline) return;
    const pts = _trailPolyline.getLatLngs();
    pts.push([lat, lng]);
    _trailPolyline.setLatLngs(pts);
  }

  function clearTrail() {
    if (_trailPolyline) _trailPolyline.setLatLngs([]);
  }

  function getTrailPoints() {
    if (!_trailPolyline) return [];
    return _trailPolyline.getLatLngs().map(p => [p.lat, p.lng]);
  }

  /* ── Territory Polygons ── */
  function drawTerritoryPolygon(points, color = '#10B981', label = 'Your Territory') {
    if (!_map || points.length < 3) return null;
    const hull = expandHull(convexHull(points));
    const polygon = L.polygon(hull, {
      color: color, weight: 2,
      fillColor: color, fillOpacity: 0.18,
      dashArray: null,
    }).addTo(_map);
    polygon.bindTooltip(label, { permanent: false, direction: 'center' });
    _territoryPolygons.push(polygon);
    return polygon;
  }

  function drawAllTerritories() {
    const territories = GameData.getTerritories();
    territories.forEach(t => {
      if (t.hull && t.hull.length >= 3) {
        drawTerritoryPolygon(t.hull, '#10B981', t.name);
      }
    });
    // Static rival zones
    const lat = _map ? _map.getCenter().lat : 51.505;
    const lng = _map ? _map.getCenter().lng : -0.09;
    const rivalPoints = [
      [lat-0.004, lng+0.003], [lat-0.003, lng+0.004],
      [lat-0.005, lng+0.005], [lat-0.004, lng+0.006],
    ];
    L.polygon(rivalPoints, { color:'#EF4444', weight:2, fillColor:'#EF4444', fillOpacity:0.15 })
      .addTo(_map).bindTooltip('RocketRaj Territory');
    const neutralPoints = [
      [lat+0.003, lng+0.002], [lat+0.002, lng+0.004],
      [lat+0.004, lng+0.005], [lat+0.005, lng+0.003],
    ];
    L.polygon(neutralPoints, { color:'#6B7280', weight:1, fillColor:'#6B7280', fillOpacity:0.12 })
      .addTo(_map).bindTooltip('Neutral Zone');
  }

  function spawnRivalMarkers(lat, lng) {
    const rivals = [
      { lat: lat-0.004, lng: lng+0.003, emoji: '🦁', name: 'RocketRaj' },
      { lat: lat+0.003, lng: lng-0.002, emoji: '🦊', name: 'FoxFit' },
    ];
    rivals.forEach(r => {
      const icon = L.divIcon({
        className: '',
        html: `<div title="${r.name}" style="width:26px;height:26px;background:linear-gradient(135deg,#EF4444,#DC2626);border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 10px rgba(239,68,68,0.6);">${r.emoji}</div>`,
        iconSize: [26, 26], iconAnchor: [13, 13],
      });
      L.marker([r.lat, r.lng], { icon }).addTo(_map).bindPopup(`<b>${r.name}</b><br/>Rival territory`);
    });
  }

  /* ── Simulation movement ── */
  function movePlayerSim(dLat, dLng) {
    if (!_map || !_playerMarker) return;
    const pos = _playerMarker.getLatLng();
    const newLat = pos.lat + dLat;
    const newLng = pos.lng + dLng;
    _playerMarker.setLatLng([newLat, newLng]);
    _map.panTo([newLat, newLng], { animate: false });
    App._onSimMove(newLat, newLng);
  }

  function getCenter() {
    if (_map) return _map.getCenter();
    return { lat: 51.505, lng: -0.09 };
  }

  function flyTo(lat, lng, zoom = 15) {
    if (_map) _map.flyTo([lat, lng], zoom, { animate: true, duration: 1 });
  }

  /* ── Google Maps Support ── */
  function loadGoogleMaps(apiKey) {
    if (window.google?.maps) { _googleLoaded = true; initGoogleMap(apiKey); return; }
    const existing = document.getElementById('gmScript');
    if (existing) return;
    const script = document.createElement('script');
    script.id = 'gmScript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=MapEngine._gmCallback`;
    script.async = true;
    script.onerror = () => {
      showToast('❌ Google Maps failed to load. Check your API key. Using OpenStreetMap instead.');
      el('gmStatus').textContent = '❌ Invalid API key or billing not enabled.';
      el('gmStatus').className = 'gm-status err';
      localStorage.removeItem(STORE.GM_KEY);
      initLeaflet();
    };
    window.MapEngine = MapEngine; // Ensure callback is accessible
    document.head.appendChild(script);
  }

  function _gmCallback() {
    _googleLoaded = true;
    initGoogleMap(localStorage.getItem(STORE.GM_KEY));
    el('gmStatus').textContent = '✅ Google Maps loaded successfully!';
    el('gmStatus').className = 'gm-status ok';
  }

  function initGoogleMap(apiKey) {
    _useGoogleMaps = true;
    const mapEl = el('leafletMap');
    if (!mapEl) return;
    mapEl.innerHTML = '';

    const lastPos = GPS.getLastPos();
    const center = lastPos
      ? { lat: lastPos.coords.latitude, lng: lastPos.coords.longitude }
      : { lat: 51.505, lng: -0.09 };

    _gmap = new google.maps.Map(mapEl, {
      center,
      zoom: 16,
      mapTypeId: 'roadmap',
      styles: DARK_MAP_STYLE,
      disableDefaultUI: false,
      zoomControl: true,
    });

    // Player marker
    _gmPlayerMarker = new google.maps.Marker({
      position: center,
      map: _gmap,
      title: 'You',
      label: { text: '🏃', fontSize: '20px' },
    });

    // Trail polyline
    _gmTrail = new google.maps.Polyline({
      path: [],
      geodesic: true,
      strokeColor: '#10B981',
      strokeWeight: 4,
      strokeOpacity: 0.9,
      map: _gmap,
    });

    GPS.onUpdate((lat, lng, acc, spd) => {
      _gmPlayerMarker.setPosition({ lat, lng });
      _gmap.panTo({ lat, lng });
      App._onGPSUpdate(lat, lng, acc, spd);
    });

    showToast('✅ Google Maps loaded!');
  }

  function addGMTrailPoint(lat, lng) {
    if (!_gmTrail) return;
    const path = _gmTrail.getPath();
    path.push(new google.maps.LatLng(lat, lng));
  }

  function applyGoogleMapsKey() {
    const key = (el('gmApiKeyInput')?.value || '').trim();
    if (!key || !key.startsWith('AIza')) {
      showToast('❌ Enter a valid Google Maps API key (starts with AIza...)');
      el('gmStatus').textContent = '❌ Invalid key format.';
      el('gmStatus').className = 'gm-status err';
      return;
    }
    localStorage.setItem(STORE.GM_KEY, key);
    el('gmStatus').textContent = '⏳ Loading Google Maps...';
    loadGoogleMaps(key);
    showToast('🗺️ Loading Google Maps...');
  }

  function clearGoogleMapsKey() {
    localStorage.removeItem(STORE.GM_KEY);
    el('gmStatus').textContent = 'Google Maps key cleared. Using OpenStreetMap.';
    el('gmStatus').className = 'gm-status';
    el('gmApiKeyInput').value = '';
    showToast('🗺️ Reverted to OpenStreetMap.');
  }

  /* Load existing GM key into input */
  function loadSavedGMKey() {
    const k = localStorage.getItem(STORE.GM_KEY);
    if (k && el('gmApiKeyInput')) el('gmApiKeyInput').value = k;
  }

  return {
    init, clearTrail, addTrailPoint, getTrailPoints,
    drawTerritoryPolygon, drawAllTerritories,
    movePlayerSim, getCenter, flyTo,
    updatePlayerPosition, _gmCallback,
    applyGoogleMapsKey, clearGoogleMapsKey, loadSavedGMKey,
  };
})();

/* ═══════════════════════════════════════════════
   GOOGLE MAPS DARK STYLE
═══════════════════════════════════════════════ */
const DARK_MAP_STYLE = [
  {elementType:'geometry',stylers:[{color:'#1a2535'}]},
  {elementType:'labels.text.stroke',stylers:[{color:'#0d1623'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#746855'}]},
  {featureType:'administrative.locality',elementType:'labels.text.fill',stylers:[{color:'#d59563'}]},
  {featureType:'poi',elementType:'labels.text.fill',stylers:[{color:'#d59563'}]},
  {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#263c3f'}]},
  {featureType:'poi.park',elementType:'labels.text.fill',stylers:[{color:'#6b9a76'}]},
  {featureType:'road',elementType:'geometry',stylers:[{color:'#263548'}]},
  {featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#212a37'}]},
  {featureType:'road',elementType:'labels.text.fill',stylers:[{color:'#9ca5b3'}]},
  {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#746855'}]},
  {featureType:'road.highway',elementType:'geometry.stroke',stylers:[{color:'#1f2835'}]},
  {featureType:'transit',elementType:'geometry',stylers:[{color:'#2f3948'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#0c111f'}]},
  {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#515c6d'}]},
];

/* ═══════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════ */
const App = (() => {

  /* ── STATE ── */
  const state = {
    screen: 'home',
    mode: 'sim',
    speedMode: 'walk',
    session: { active: false, paused: false, startTime: 0, distance: 0, time: 0 },
    dpad: { interval: null },
    simPos: { lat: 51.505, lng: -0.09 },
    quests: { tab: 'daily' },
    leader: { tab: 'local' },
    coachHistory: [],
    sessionTrailPoints: [],
  };

  let _sessionTimer = null;

  /* ── STATIC DATA ── */
  const DAILY_QUESTS = [
    { id:'q1', icon:'🚶', name:'Walk 5,000 Steps',     sub:'Daily step goal',   xp:50,  progress:72, color:'green' },
    { id:'q2', icon:'🗺️', name:'Capture 1 Territory',  sub:'Claim new land',    xp:100, progress:0,  color:'blue' },
    { id:'q3', icon:'🔥', name:'Maintain Streak',       sub:'Stay consistent',   xp:30,  progress:100,color:'orange' },
    { id:'q4', icon:'🏃', name:'Run 2km',               sub:'Cardio challenge',  xp:80,  progress:45, color:'green' },
  ];
  const WEEKLY_QUESTS = [
    { id:'w1', icon:'🏆', name:'Run 20km This Week',    sub:'Weekly distance',   xp:300, progress:55, color:'green' },
    { id:'w2', icon:'🏙️', name:'Capture 3 Territories', sub:'Expand your empire',xp:500, progress:33, color:'blue' },
    { id:'w3', icon:'👥', name:'Beat 5 Rivals',          sub:'Competitive mode',  xp:400, progress:20, color:'purple' },
    { id:'w4', icon:'🔥', name:'5-Day Streak',           sub:'Consistency is key',xp:200, progress:100,color:'orange' },
  ];
  const BADGES = [
    { em:'🏃', name:'First Run',   unlocked:true  },
    { em:'🔥', name:'7-Day Streak',unlocked:false },
    { em:'🏙️', name:'Urban Runner',unlocked:false },
    { em:'🛡️', name:'Defender',    unlocked:false },
    { em:'🗺️', name:'Explorer',    unlocked:false },
    { em:'⚡', name:'Speed King',  unlocked:false },
    { em:'🏆', name:'Legend',      unlocked:false },
    { em:'🌍', name:'Global Top10',unlocked:false },
  ];
  const LEADERBOARD = {
    local: [
      { name:'Smarty',    emoji:'🏃', xp:700, area:'24.5k m²', you:true, rank:1 },
      { name:'RocketRaj', emoji:'🦁', xp:640, area:'22.1k m²', rank:2 },
      { name:'FoxFit',    emoji:'🦊', xp:590, area:'18.3k m²', rank:3 },
      { name:'SwiftSara', emoji:'⚡', xp:550, area:'17.0k m²', rank:4 },
      { name:'ZenRunner', emoji:'🧘', xp:480, area:'14.9k m²', rank:5 },
    ],
    global: [
      { name:'BlazeMaster',emoji:'🔥', xp:4200,area:'180k m²', rank:1 },
      { name:'NightOwl',   emoji:'🦉', xp:3900,area:'162k m²', rank:2 },
      { name:'VaultX',     emoji:'⚡', xp:3450,area:'144k m²', rank:3 },
    ],
  };

  /* ── NAVIGATION ── */
  function navigate(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const screen = el(`screen-${screenId}`);
    if (screen) screen.classList.add('active');
    const tab = document.querySelector(`.nav-tab[data-screen="${screenId}"]`);
    if (tab) tab.classList.add('active');
    state.screen = screenId;

    switch (screenId) {
      case 'home':        renderHome();        break;
      case 'map':         MapEngine.init(); renderMapUI(); break;
      case 'defense':     renderDefense();     break;
      case 'challenges':  renderChallenges();  break;
      case 'leaderboard': renderLeaderboard(); break;
      case 'coach':       renderCoach();       break;
      case 'profile':     renderProfile();     break;
    }
  }

  /* ── HEADER ── */
  function updateHeader() {
    const u = GameData.getUser();
    if (!u) return;
    el('topName').textContent = u.name;
    el('topAvatar').textContent = u.emoji || '🏃';
    el('topLevel').textContent = `Level ${u.level} · ${getLevelTitle(u.level)}`;
    el('streakNum').textContent = u.streak || 0;
    el('topXP').textContent = `${u.xp} XP`;
    el('xpBarFill').style.width = `${Math.min((u.xp / u.xpNext) * 100, 100)}%`;
    el('xpBarNums').textContent = `${u.xp} / ${u.xpNext} XP`;
    if (el('levelFrom')) el('levelFrom').textContent = `Level ${u.level}`;
    if (el('levelTo'))   el('levelTo').textContent = `Level ${u.level+1}`;
    el('healthScore').textContent = u.healthScore || 80;
    el('todayDist').innerHTML = `${((u.totalDist||0)/1000).toFixed(1)}<span style="font-size:0.6em">km</span>`;
    const terrs = GameData.getTerritories();
    const avgStr = terrs.length ? Math.round(terrs.reduce((s,t) => s+t.strength,0)/terrs.length) : 0;
    el('terrStrength').innerHTML = `${avgStr}<span style="font-size:0.6em">%</span>`;
  }

  function getLevelTitle(lvl) {
    const titles = ['','Newcomer','Explorer','Trailblazer','Conqueror','Legend','Supreme'];
    return titles[Math.min(lvl, titles.length-1)] || 'Legend';
  }

  function setGreeting() {
    const u = GameData.getUser();
    const hour = new Date().getHours();
    let greet = 'Good Morning';
    if (hour >= 12 && hour < 17) greet = 'Good Afternoon';
    else if (hour >= 17) greet = 'Good Evening';
    if (el('greetMsg')) el('greetMsg').textContent = `${greet}, ${u?.name || 'Runner'}! 👋`;
  }

  /* ── HOME ── */
  function renderHome() {
    updateHeader();
    setGreeting();
    renderHomeQuests();
  }

  function renderHomeQuests() {
    const container = el('homeQuestList');
    if (!container) return;
    container.innerHTML = '';
    DAILY_QUESTS.slice(0,3).forEach(q => container.appendChild(buildQuestCard(q)));
  }

  function buildQuestCard(q) {
    const div = document.createElement('div');
    div.className = `quest-card ${q.progress >= 100 ? 'done' : ''}`;
    div.innerHTML = `
      <div class="quest-top">
        <div class="quest-left">
          <span class="quest-icon">${q.icon}</span>
          <div>
            <div class="quest-name">${q.progress>=100?'✅ ':''}${q.name}</div>
            <div class="quest-sub">${q.sub}</div>
          </div>
        </div>
        <span class="quest-xp">+${q.xp} XP</span>
      </div>
      <div class="quest-bar-track">
        <div class="quest-bar-fill ${q.color}" style="width:0%" data-target="${q.progress}"></div>
      </div>
      <div class="quest-progress-label">${q.progress}% complete</div>
    `;
    setTimeout(() => {
      const fill = div.querySelector('.quest-bar-fill');
      if (fill) fill.style.width = fill.dataset.target + '%';
    }, 100);
    return div;
  }

  /* ── MAP UI ── */
  function renderMapUI() {
    // Show/hide panels based on mode
    setMode(state.mode);
    // Load GM key into input
    MapEngine.loadSavedGMKey();
  }

  function startActivity() {
    navigate('map');
    showToast('📍 Map opened — press Start Capture to begin!');
  }

  /* ── MODE & SPEED ── */
  function setMode(mode) {
    state.mode = mode;
    el('modeSimBtn').classList.toggle('active', mode === 'sim');
    el('modeGpsBtn').classList.toggle('active', mode === 'gps');
    el('dpadContainer').classList.toggle('hidden', mode === 'gps');
    el('speedPills').style.display = mode === 'gps' ? 'none' : 'flex';

    const gpsPanel = el('gpsStatusPanel');
    if (gpsPanel) gpsPanel.classList.toggle('hidden', mode === 'sim');

    if (mode === 'gps') {
      // Show permission overlay if GPS not yet active
      if (GPS.getState() === 'idle' || GPS.getState() === 'error') {
        el('gpsOverlay').classList.remove('hidden');
      } else {
        GPS.startWatch();
        showToast('📡 GPS mode active — walk to capture territory!');
      }
    } else {
      el('gpsOverlay').classList.add('hidden');
      el('gpsBadge').classList.add('hidden');
      showToast('🎮 Simulation mode — use D-Pad to move!');
    }
  }

  function setSpeed(speed) {
    state.speedMode = speed;
    document.querySelectorAll('.speed-pill').forEach(b => b.classList.remove('active'));
    const ids = { walk:'spWalk', jog:'spJog', run:'spRun' };
    if (ids[speed]) el(ids[speed]).classList.add('active');
    const kmh = { walk:'4.7 km/h', jog:'10.8 km/h', run:'19.8 km/h' };
    showToast(`${speed==='walk'?'🚶':speed==='jog'?'🏃':'⚡'} Speed: ${kmh[speed]}`);
  }

  function getSimSpeed() {
    return { walk:1.4, jog:3.0, run:5.5 }[state.speedMode] || 1.4; // m/s
  }

  /* ── SESSION ── */
  function startSession() {
    if (state.session.active) return;
    state.session.active = true;
    state.session.paused = false;
    state.session.distance = 0;
    state.session.time = 0;
    state.session.startTime = Date.now();
    state.sessionTrailPoints = [];
    MapEngine.clearTrail();

    // Add start point
    if (state.mode === 'sim') {
      const c = MapEngine.getCenter();
      state.simPos = { lat: c.lat, lng: c.lng };
      state.sessionTrailPoints.push([c.lat, c.lng]);
      MapEngine.addTrailPoint(c.lat, c.lng);
    } else if (GPS.getLastPos()) {
      const p = GPS.getLastPos().coords;
      state.sessionTrailPoints.push([p.latitude, p.longitude]);
    }

    el('startBtn').classList.add('hidden');
    el('stopBtn').classList.remove('hidden');
    el('pauseBtn').classList.remove('hidden');

    clearInterval(_sessionTimer);
    _sessionTimer = setInterval(() => {
      if (!state.session.paused) {
        state.session.time++;
        updateHUD();
      }
    }, 1000);

    showToast('🎯 Capture session started! Move to claim territory!');
  }

  function stopSession() {
    if (!state.session.active) return;
    clearInterval(_sessionTimer);
    state.session.active = false;
    state.session.paused = false;

    el('stopBtn').classList.add('hidden');
    el('pauseBtn').classList.add('hidden');
    el('startBtn').classList.remove('hidden');

    // Stop GPS watch
    if (state.mode === 'gps') GPS.stopWatch();

    // Get all trail points
    const trail = state.mode === 'sim'
      ? state.sessionTrailPoints
      : MapEngine.getTrailPoints();

    const dist = state.session.distance;
    const km = parseFloat((dist / 1000).toFixed(2));

    if (trail.length >= 3) {
      // Compute territory polygon
      const hull = expandHull(convexHull(trail));
      const area = Math.round(polygonArea(hull));

      // Draw on map
      MapEngine.drawTerritoryPolygon(trail, '#10B981', 'Your New Territory');

      // Save territory
      const territory = {
        id: Date.now(),
        name: getRandomZoneName(),
        emoji: '🗺️',
        area,
        strength: 100,
        status: 'safe',
        hull,
        capturedAt: Date.now(),
        distKm: km,
        isGPS: state.mode === 'gps',
      };
      GameData.addTerritory(territory);

      // XP earned
      const xpEarned = Math.round(km * 60 + area / 50 + 20);
      awardXP(xpEarned);

      el('captureDetails').textContent = `${territory.name} — ${area.toLocaleString()} m² captured! +${xpEarned} XP`;
      el('captureXP').textContent = `+${xpEarned} XP`;
      showModal('captureModal');

    } else if (dist > 50) {
      const xpEarned = Math.round(km * 40 + 10);
      awardXP(xpEarned);
      showToast(`✅ Session ended! +${xpEarned} XP earned. Walk more to capture territory!`);
    } else {
      showToast('Session ended. Walk or move more to capture territory!');
    }

    // Update stats
    GameData.updateUser({
      totalDist: (GameData.getUser()?.totalDist || 0) + dist,
      sessions:  (GameData.getUser()?.sessions  || 0) + 1,
    });

    resetHUD();
    updateHeader();
  }

  function pauseSession() {
    state.session.paused = !state.session.paused;
    el('pauseBtn').innerHTML = state.session.paused
      ? '<i class="fa-solid fa-play"></i> Resume'
      : '<i class="fa-solid fa-pause"></i> Pause';
    showToast(state.session.paused ? '⏸ Session paused' : '▶️ Session resumed!');
  }

  function awardXP(amount) {
    const u = GameData.getUser();
    if (!u) return;
    let xp = (u.xp || 0) + amount;
    let level = u.level || 1;
    let xpNext = u.xpNext || 500;
    if (xp >= xpNext) {
      xp -= xpNext;
      level++;
      xpNext = Math.round(xpNext * 1.25);
      setTimeout(() => {
        el('modalBadge').textContent = `Level ${level}`;
        showModal('levelModal');
      }, 2000);
    }
    GameData.updateUser({ xp, level, xpNext });
    updateHeader();
  }

  function getRandomZoneName() {
    const names = ['Riverside District','City Heights','West Quarter','Harbor Zone','Summit Point','Park District','Market Square','Old Town','Innovation Hub','East End'];
    return names[Math.floor(Math.random() * names.length)];
  }

  function resetHUD() {
    el('hudDist').textContent = '0.00';
    el('hudTime').textContent = '00:00';
    el('hudSpeed').textContent = '0.0';
    el('hudArea').textContent = '0';
  }

  function updateHUD() {
    const s = state.session;
    const km = (s.distance / 1000).toFixed(2);
    const mins = String(Math.floor(s.time / 60)).padStart(2,'0');
    const secs = String(s.time % 60).padStart(2,'0');
    const speed = s.distance > 0 && s.time > 0
      ? ((s.distance/1000)/(s.time/3600)).toFixed(1) : '0.0';
    const area = state.sessionTrailPoints.length >= 3
      ? Math.round(polygonArea(expandHull(convexHull(state.sessionTrailPoints)))) : 0;
    el('hudDist').textContent = km;
    el('hudTime').textContent = `${mins}:${secs}`;
    el('hudSpeed').textContent = speed;
    el('hudArea').textContent = area;
  }

  /* ── GPS CALLBACKS ── */
  function _onGPSUpdate(lat, lng, accuracy, speed) {
    if (!state.session.active || state.session.paused) return;
    const trail = state.sessionTrailPoints;
    if (trail.length > 0) {
      const [lastLat, lastLng] = trail[trail.length-1];
      const dist = haversine(lastLat, lastLng, lat, lng);
      if (dist > 3) { // only add if moved more than 3 meters
        trail.push([lat, lng]);
        MapEngine.addTrailPoint(lat, lng);
        state.session.distance += dist;
      }
    } else {
      trail.push([lat, lng]);
      MapEngine.addTrailPoint(lat, lng);
    }

    // Update GPS status
    const coordsEl = el('gpsCoords');
    if (coordsEl) coordsEl.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    if (el('gpsAccText')) el('gpsAccText').textContent = `GPS: ±${Math.round(accuracy||0)}m`;
  }

  /* ── SIM MOVEMENT ── */
  function _onSimMove(lat, lng) {
    if (!state.session.active || state.session.paused) return;
    const trail = state.sessionTrailPoints;
    if (trail.length > 0) {
      const [lastLat, lastLng] = trail[trail.length-1];
      const dist = haversine(lastLat, lastLng, lat, lng);
      trail.push([lat, lng]);
      MapEngine.addTrailPoint(lat, lng);
      state.session.distance += dist;
    } else {
      trail.push([lat, lng]);
    }
    state.simPos = { lat, lng };
  }

  /* ── D-PAD ── */
  function dpadStart(dir) {
    if (state.dpad.interval) clearInterval(state.dpad.interval);
    doSimMove(dir);
    state.dpad.interval = setInterval(() => doSimMove(dir), 80);
  }

  function dpadStop() {
    clearInterval(state.dpad.interval);
    state.dpad.interval = null;
  }

  function doSimMove(dir) {
    const step = getSimSpeed() * 0.00001;
    const moves = { N:[step,0], S:[-step,0], E:[0,step*1.5], W:[0,-step*1.5] };
    const [dLat, dLng] = moves[dir] || [0,0];
    MapEngine.movePlayerSim(dLat, dLng);
  }

  function centerMap() {
    const lastPos = GPS.getLastPos();
    if (lastPos) {
      MapEngine.flyTo(lastPos.coords.latitude, lastPos.coords.longitude, 16);
    } else {
      MapEngine.flyTo(state.simPos.lat, state.simPos.lng, 16);
    }
  }

  /* ── DEFENSE ── */
  function renderDefense() {
    const terrs = GameData.getTerritories();
    renderDecayPills(terrs);
    renderTerritoryList(terrs);
  }

  function renderDecayPills(terrs) {
    const c = el('decayPillsRow');
    if (!c) return;
    c.innerHTML = '';
    const total = terrs.length;
    const safe = terrs.filter(t => t.strength >= 60).length;
    const danger = terrs.filter(t => t.strength < 40).length;
    const avg = total ? Math.round(terrs.reduce((s,t) => s+t.strength,0)/total) : 0;
    const pills = [
      { val:total,  lbl:'Zones',    color:'var(--blue)' },
      { val:safe,   lbl:'Safe',     color:'var(--primary)' },
      { val:danger, lbl:'Critical', color:'var(--red)' },
      { val:`${avg}%`, lbl:'Avg Str', color:'var(--orange)' },
    ];
    pills.forEach(p => {
      const div = document.createElement('div');
      div.className = 'decay-pill';
      div.innerHTML = `<div class="dp-val" style="color:${p.color}">${p.val}</div><div class="dp-lbl">${p.lbl}</div>`;
      c.appendChild(div);
    });
  }

  function renderTerritoryList(terrs) {
    const c = el('territoryList');
    if (!c) return;
    c.innerHTML = '';
    if (el('terrCount')) el('terrCount').textContent = `${terrs.length} Active`;

    if (!terrs.length) {
      c.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:32px 0">No territories yet.<br>Go for a walk to capture your first zone! 🗺️</p>';
      return;
    }

    terrs.forEach((t, i) => {
      const status = t.strength < 40 ? 'danger' : t.strength < 60 ? 'warning' : '';
      const barColor = t.strength >= 60
        ? 'linear-gradient(90deg,#10B981,#34D399)'
        : t.strength >= 40
          ? 'linear-gradient(90deg,#F59E0B,#FBBF24)'
          : 'linear-gradient(90deg,#EF4444,#F87171)';
      const strColor = t.strength >= 60 ? 'var(--primary)' : t.strength >= 40 ? 'var(--orange)' : 'var(--red)';
      const div = document.createElement('div');
      div.className = `territory-card ${status}`;
      div.innerHTML = `
        <div class="terr-row">
          <div>
            <div class="terr-name">${t.emoji} ${t.name}</div>
            <div class="terr-area">${(t.area||0).toLocaleString()} m² &nbsp;
              <span class="terr-badge ${t.isGPS?'gps':'sim'}">${t.isGPS?'📡 GPS':'🎮 Sim'}</span>
            </div>
          </div>
          <div class="terr-strength-val" style="color:${strColor}">${t.strength}%</div>
        </div>
        <div class="terr-bar-track">
          <div class="terr-bar-fill" style="width:0%;background:${barColor}" data-target="${t.strength}"></div>
        </div>
        <div class="terr-actions" style="margin-top:10px">
          <button class="terr-btn primary" onclick="App.defendTerritory(${i})">🛡️ Defend</button>
          <button class="terr-btn secondary" onclick="App.viewTerritory(${i})">📍 View on Map</button>
        </div>
      `;
      c.appendChild(div);
      setTimeout(() => {
        const fill = div.querySelector('.terr-bar-fill');
        if (fill) fill.style.width = fill.dataset.target + '%';
      }, 100);
    });
  }

  function defendTerritory(i) {
    const terrs = GameData.getTerritories();
    if (!terrs[i]) return;
    terrs[i].strength = Math.min(100, terrs[i].strength + 25);
    GameData.saveTerritories(terrs);
    showToast(`🛡️ ${terrs[i].name} defended! Strength +25%`);
    renderDefense();
  }

  function viewTerritory(i) {
    navigate('map');
    const terrs = GameData.getTerritories();
    const t = terrs[i];
    if (t?.hull?.length) {
      setTimeout(() => MapEngine.flyTo(t.hull[0][0], t.hull[0][1], 16), 300);
    }
  }

  function fastForward(days) {
    const terrs = GameData.getTerritories();
    terrs.forEach(t => {
      t.strength = Math.max(5, t.strength - days * 10);
      if (t.strength < 40) t.status = 'danger';
      else if (t.strength < 60) t.status = 'warning';
      else t.status = 'safe';
    });
    GameData.saveTerritories(terrs);
    showToast(`⏩ Fast-forwarded ${days} day${days>1?'s':''}! Territory decayed.`);
    renderDefense();
  }

  /* ── CHALLENGES ── */
  function renderChallenges() {
    const c = el('challengeList');
    if (!c) return;
    c.innerHTML = '';
    const quests = state.quests.tab === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS;
    quests.forEach(q => c.appendChild(buildQuestCard(q)));
    renderBadges();
  }

  function setQuestTab(tab) {
    state.quests.tab = tab;
    el('tabDaily').classList.toggle('active', tab==='daily');
    el('tabWeekly').classList.toggle('active', tab==='weekly');
    renderChallenges();
  }

  function renderBadges() {
    const u = GameData.getUser();
    const b = [...BADGES];
    if (u) {
      if (u.sessions >= 1) b[0].unlocked = true;
      if (u.streak >= 7)   b[1].unlocked = true;
      if ((u.totalArea||0) > 10000) b[2].unlocked = true;
    }
    const c = el('badgesGrid');
    if (!c) return;
    c.innerHTML = '';
    b.forEach(badge => {
      const div = document.createElement('div');
      div.className = `badge-item ${badge.unlocked?'':'locked'}`;
      div.innerHTML = `<div class="badge-em">${badge.em}</div><div class="badge-name">${badge.name}</div>`;
      c.appendChild(div);
    });
  }

  /* ── LEADERBOARD ── */
  function renderLeaderboard() {
    const data = LEADERBOARD[state.leader.tab];
    renderPodium(data);
    renderLeaderList(data);
  }

  function setLeaderTab(tab) {
    state.leader.tab = tab;
    document.querySelectorAll('#screen-leaderboard .tab-pill').forEach((b,i) => {
      b.classList.toggle('active', (i===0 && tab==='local') || (i===1 && tab==='global'));
    });
    renderLeaderboard();
  }

  function renderPodium(data) {
    const top3 = data.slice(0,3);
    const order = [top3[1], top3[0], top3[2]].filter(Boolean);
    const ranks = [2,1,3];
    const crowns = ['🥈','🥇','🥉'];
    const c = el('podium');
    if (!c) return;
    c.innerHTML = '';
    order.forEach((p, idx) => {
      const rank = ranks[idx];
      const div = document.createElement('div');
      div.className = `podium-item rank-${rank}`;
      div.innerHTML = `
        <div class="podium-crown">${crowns[idx]}</div>
        <div class="podium-avatar">${p.emoji}</div>
        <div class="podium-name">${p.name}${p.you?' (You)':''}</div>
        <div class="podium-xp">${p.xp} XP</div>
        <div class="podium-platform">${rank}</div>
      `;
      c.appendChild(div);
    });
  }

  function renderLeaderList(data) {
    const c = el('leaderList');
    if (!c) return;
    c.innerHTML = '';
    const rankColors = {1:'#FBBF24',2:'#CBD5E1',3:'#D97706'};
    data.forEach(p => {
      const div = document.createElement('div');
      div.className = `leader-item ${p.you?'you':''}`;
      div.innerHTML = `
        <div class="leader-rank" style="color:${rankColors[p.rank]||'var(--text-muted)'}">${p.rank}</div>
        <div class="leader-avatar">${p.emoji}</div>
        <div class="leader-info">
          <div class="leader-name">${p.name}${p.you?' 👈 You':''}</div>
          <div class="leader-sub">${p.area} captured</div>
        </div>
        <div class="leader-xp">${p.xp} XP</div>
      `;
      c.appendChild(div);
    });
  }

  /* ── AI COACH ── */
  const COACH_RULES = [
    { kw:['streak','protect'],    reply:'🔥 To protect your streak, any 5+ min activity counts. Short walk > nothing. Consistency is the #1 predictor of fitness success!' },
    { kw:['week','recap','doing'],reply:'📊 This week you\'re performing great! Based on your sessions, you\'ve covered good ground. Keep expanding your territory to dominate the local leaderboard.' },
    { kw:['tomorrow','goal','plan'],reply:'🎯 Tomorrow\'s plan: Target a 20-30 minute walk/jog. Focus on areas you haven\'t captured yet. New territory = bonus XP multiplier!' },
    { kw:['overtraining','tired','fatigue','rest'],reply:'😴 Rest is training! Your muscles grow during recovery. If you\'re tired, a slow 10-min walk still preserves your streak without overloading your body.' },
    { kw:['territory','defend','zone'],reply:'🗺️ Territory strength decays ~10% per day without activity. A 5-minute jog through your zone resets it to 100%. Try the Defense tab to monitor all zones!' },
    { kw:['gps','real','location','tracking'],reply:'📡 GPS tracking uses your device\'s location sensor. Make sure Location is enabled in browser settings. For best accuracy, keep your phone horizontal and outdoors.' },
    { kw:['xp','level','points'],reply:'⚡ Earn XP by: capturing territory (+50-150 XP), running distance (+60 XP/km), and maintaining your streak (+30 XP/day). Level up for leaderboard rank boost!' },
    { kw:['rival','compete','beat'],reply:'🏆 Check your local Leaderboard — you\'re close to overtaking rivals! A 2km capture session could leapfrog you past 2-3 players today.' },
    { kw:['google','maps','api'],reply:'🗺️ To use Google Maps: go to Profile → Google Maps Setup. Get a free API key from Google Cloud Console. The app works perfectly on OpenStreetMap too!' },
    { kw:['otp','register','login','account'],reply:'🔐 My Territory uses phone OTP for secure registration. Your account is stored locally on your device. Password protects daily login.' },
  ];

  function renderCoach() {
    const c = el('chatMessages');
    if (!c) return;
    c.innerHTML = '';
    if (!state.coachHistory.length) {
      const u = GameData.getUser();
      state.coachHistory = [
        { role:'bot', text:`👋 Hey ${u?.name||'Runner'}! I'm Terry, your AI fitness coach.` },
        { role:'bot', text:'📍 GPS territory tracking is active! When you start a session in GPS mode, I\'ll track every step you take.' },
        { role:'bot', text:'💡 Tip: Walk in a loop to capture a larger territory polygon. The more area you cover, the bigger your zone!' },
      ];
    }
    state.coachHistory.forEach(m => {
      const div = document.createElement('div');
      div.className = `chat-bubble ${m.role}`;
      div.textContent = m.text;
      c.appendChild(div);
    });
    setTimeout(() => c.scrollTop = c.scrollHeight, 100);
  }

  function sendChat() {
    const input = el('chatInput');
    const text = (input?.value || '').trim();
    if (!text) return;
    input.value = '';
    _addMsg('user', text);
    _showTyping();
    setTimeout(() => {
      _removeTyping();
      _addMsg('bot', _getReply(text.toLowerCase()));
    }, 700 + Math.random()*600);
  }

  function sendPrompt(text) {
    if (el('chatInput')) el('chatInput').value = text;
    sendChat();
  }

  function _addMsg(role, text) {
    const c = el('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-bubble ${role}`;
    div.textContent = text;
    c?.appendChild(div);
    state.coachHistory.push({ role, text });
    setTimeout(() => c && (c.scrollTop = c.scrollHeight), 100);
  }

  function _showTyping() {
    const c = el('chatMessages');
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.className = 'chat-typing';
    div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    c?.appendChild(div);
    setTimeout(() => c && (c.scrollTop = c.scrollHeight), 50);
  }

  function _removeTyping() {
    el('typingIndicator')?.remove();
  }

  function _getReply(text) {
    for (const rule of COACH_RULES) {
      if (rule.kw.some(k => text.includes(k))) return rule.reply;
    }
    return `🤖 Great question! Based on your activity data, I recommend exploring new routes to expand your territory. Variety keeps both your body AND your leaderboard rank improving! 🗺️`;
  }

  /* ── PROFILE ── */
  function renderProfile() {
    const u = GameData.getUser();
    if (!u) return;
    el('profileAvatar').textContent = u.emoji || '🏃';
    el('profileName').textContent = u.name;
    el('profileLevel').textContent = `Level ${u.level} · ${getLevelTitle(u.level)}`;
    el('profilePhone').textContent = u.phone || '';
    el('pStreak').textContent = `${u.streak||0} Days 🔥`;
    el('pHealth').textContent = `${u.healthScore||80}/100 ❤️`;
    const terrs = GameData.getTerritories();
    const totalArea = terrs.reduce((s,t) => s+(t.area||0), 0);
    el('pTotalArea').textContent = totalArea.toLocaleString() + ' m²';
    el('pTotalDist').textContent = ((u.totalDist||0)/1000).toFixed(1) + ' km';
    el('pSessions').textContent = u.sessions || 0;
    MapEngine.loadSavedGMKey();
  }

  function setEmoji(btn) {
    document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const em = btn.dataset.em;
    GameData.updateUser({ emoji: em });
    el('profileAvatar').textContent = em;
    el('topAvatar').textContent = em;
    showToast(`Avatar updated to ${em}`);
  }

  function spawnRivals() {
    const names = ['BlazeDash','SwiftWolf','NeonPace','UrbanFox'];
    const emojis = ['🔥','🐺','⚡','🦊'];
    const i = Math.floor(Math.random() * names.length);
    showToast(`⚡ ${emojis[i]} ${names[i]} just entered your local area!`);
  }

  /* ── MODALS ── */
  function showModal(id) {
    const m = el(id);
    if (m) m.classList.remove('hidden');
  }

  function closeModal(id) {
    const m = el(id);
    if (m) m.classList.add('hidden');
  }

  /* ── KEYBOARD ── */
  document.addEventListener('keydown', e => {
    if (state.screen !== 'map') return;
    if (state.mode !== 'sim') return;
    const map = { ArrowUp:'N', ArrowDown:'S', ArrowLeft:'W', ArrowRight:'E' };
    if (map[e.key]) { e.preventDefault(); doSimMove(map[e.key]); }
  });

  return {
    navigate, startActivity,
    setMode, setSpeed,
    startSession, stopSession, pauseSession,
    dpadStart, dpadStop, centerMap,
    defendTerritory, viewTerritory, fastForward,
    setQuestTab, setLeaderTab,
    sendChat, sendPrompt,
    setEmoji, spawnRivals,
    showModal, closeModal,
    _onGPSUpdate, _onSimMove,
    updateHeader,
  };
})();

/* ═══════════════════════════════════════════════
   INIT GAME DATA (called after registration)
═══════════════════════════════════════════════ */
function initGameData(phone) {
  GameData.init(phone);
}

/* ═══════════════════════════════════════════════
   BOOT SEQUENCE
═══════════════════════════════════════════════ */
function bootApp() {
  // Run splash
  const splashBar = el('splashBar');
  if (splashBar) setTimeout(() => splashBar.style.width = '100%', 80);

  // Hints cycle
  const hints = ['Locating territories...','Loading your map...','Syncing leaderboard...','Ready!'];
  let hi = 0;
  const hintInterval = setInterval(() => {
    hi++;
    if (el('splashHint')) el('splashHint').textContent = hints[hi] || 'Ready!';
    if (hi >= hints.length - 1) clearInterval(hintInterval);
  }, 500);

  setTimeout(() => {
    const splash = el('splash');
    if (splash) splash.classList.add('fade-out');
    setTimeout(() => {
      if (splash) splash.style.display = 'none';
      const app = el('app');
      if (app) app.classList.remove('hidden');

      // Init game data
      const u = Auth.currentUser();
      if (u) GameData.init(u.phone);

      // Render
      App.updateHeader();
      App.navigate('home');

      setTimeout(() => {
        const u = GameData.getUser();
        showToast(`👋 Welcome back, ${u?.name || 'Runner'}! Let's capture territory!`);
      }, 600);
    }, 600);
  }, 2200);
}

/* ═══════════════════════════════════════════════
   ENTRY POINT
═══════════════════════════════════════════════ */
window.addEventListener('load', () => {
  // Check auth: if logged in, boot directly; else show auth overlay
  if (Auth.check()) {
    bootApp();
  }
  // Auth overlay is already visible if not logged in
  // (shown by default in HTML, hidden after successful auth)
});
