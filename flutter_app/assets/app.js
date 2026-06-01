// Auto-hide bottom nav while scrolling or interacting (mobile)
function initAutoHideBottomNav() {
  const nav = document.querySelector('.app-nav-bar');
  if (!nav) return;

  let lastShownAt = 0;
  let hideTimer = null;
  let idleTimer = null;

  const MIN_VISIBLE_MS = 4000; // show for at least 4s when touched
  const HIDE_AFTER_RELEASE_MS = 2000; // hide 2s after touchend
  const SCROLL_DELTA = 6;
  const IDLE_SHOW_MS = 900;

  function showNav() {
    nav.classList.remove('nav-hidden');
    lastShownAt = Date.now();
  }

  function hideNav() {
    nav.classList.add('nav-hidden');
  }

  // Handle scroll in scrollable containers
  let lastScroll = 0;
  const scrollables = Array.from(document.querySelectorAll('.scroll-container'));
  scrollables.forEach(el => {
    el.addEventListener('scroll', (ev) => {
      const st = el.scrollTop || 0;
      const delta = st - lastScroll;
      if (delta > SCROLL_DELTA) { // scrolling down
        hideNav();
      } else if (delta < -SCROLL_DELTA) { // scrolling up
        showNav();
      }
      lastScroll = st;
      // show nav after idle
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { showNav(); }, IDLE_SHOW_MS);
    }, { passive: true });
  });

  // Also hide when interacting with the map (touchmove / pointermove)
  const mapEl = document.getElementById('map-container');
  if (mapEl) {
    ['touchmove', 'pointermove'].forEach(evt => {
      mapEl.addEventListener(evt, () => {
        hideNav();
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { showNav(); }, IDLE_SHOW_MS);
      }, { passive: true });
    });
  }

  // Show nav when user touches/presses the screen. Keep visible at least MIN_VISIBLE_MS.
  function onPointerDown(e) {
    // ignore interactions that originate inside the nav itself
    if (e.target.closest && e.target.closest('.app-nav-bar')) return;
    showNav();
    clearTimeout(hideTimer);
  }

  // When the user releases (lifts finger), hide after HIDE_AFTER_RELEASE_MS,
  // but ensure nav has been visible for at least MIN_VISIBLE_MS.
  function onPointerUp(e) {
    if (e.target.closest && e.target.closest('.app-nav-bar')) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      const elapsed = Date.now() - lastShownAt;
      if (elapsed >= MIN_VISIBLE_MS) {
        hideNav();
      } else {
        const remaining = MIN_VISIBLE_MS - elapsed;
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => { hideNav(); }, remaining);
      }
    }, HIDE_AFTER_RELEASE_MS);
  }

  ['touchstart', 'pointerdown', 'mousedown'].forEach(evt => {
    document.addEventListener(evt, onPointerDown, { passive: true });
  });
  ['touchend', 'pointerup', 'pointercancel', 'mouseup'].forEach(evt => {
    document.addEventListener(evt, onPointerUp, { passive: true });
  });

  // Ensure nav is visible when switching screens via JS navigation
  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-tab') || e.target.closest('.menu-item') || e.target.closest('.ls-item')) {
      showNav();
    }
  });
}

// Initialize auto-hide after DOM ready
document.addEventListener('DOMContentLoaded', initAutoHideBottomNav);
/* ==========================================================================
   MY TERRITORY - APP LOGIC & ENGINE (EXPANDED)
   "Walk. Run. Capture. Maintain."
   ========================================================================== */

// --- Audio Synthesizer (Web Audio API) ---
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(freq, type, duration, delay = 0) {
    if (!this.enabled) return;
    this.init();
    
    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        console.warn("Audio Context failed to play tone:", e);
      }
    }, delay * 1000);
  }

  playClick() {
    this.playTone(600, 'sine', 0.08);
  }

  playCapture() {
    // Triumphant major chord arpeggio
    this.playTone(261.63, 'triangle', 0.2, 0);   // C4
    this.playTone(329.63, 'triangle', 0.2, 0.08); // E4
    this.playTone(392.00, 'triangle', 0.2, 0.16); // G4
    this.playTone(523.25, 'triangle', 0.4, 0.24); // C5
  }

  playLevelUp() {
    // Game level-up fanfare
    this.playTone(349.23, 'sawtooth', 0.15, 0);    // F4
    this.playTone(440.00, 'sawtooth', 0.15, 0.1);   // A4
    this.playTone(523.25, 'sawtooth', 0.15, 0.2);   // C5
    this.playTone(587.33, 'sawtooth', 0.15, 0.3);   // D5
    this.playTone(659.25, 'sawtooth', 0.4, 0.4);    // E5
    this.playTone(880.00, 'sawtooth', 0.6, 0.55);   // A5
  }

  playAlert() {
    this.playTone(150, 'sawtooth', 0.3); // Low frequency buzz
    this.playTone(150, 'sawtooth', 0.3, 0.15);
  }
}

const sounds = new SoundEngine();

// --- Core State Management ---
const DEFAULT_STATE = {
  user: {
    username: "Smarty",
    level: 12,
    xp: 700,
    xpMax: 1000,
    streak: 7,
    healthScore: 82,
    longestStreak: 18,
    avatar: "🏃‍♂️",
    avatarImage: "", // Base64 image upload
    isLoggedIn: false, // Default logged out for prototype setup
    totalCapturedArea: 125400
  },
  settings: {
    soundEnabled: true,
    simulationSpeed: "walk",
    trackingMode: "sim" // sim (simulator) vs device (actual Geolocation API)
  },
  territories: [
    {
      id: "zone-park",
      owner: "zone",
      name: "Stanford Oval Green",
      strength: 100,
      points: [
        [37.4276, -122.1706],
        [37.4282, -122.1702],
        [37.4280, -122.1694],
        [37.4274, -122.1697]
      ]
    },
    {
      id: "user-t1",
      owner: "user",
      name: "Home Base",
      strength: 90,
      area: 24500, // square meters pre-defined for MVP start
      points: [
        [37.4265, -122.1712],
        [37.4269, -122.1712],
        [37.4269, -122.1705],
        [37.4265, -122.1705]
      ]
    },
    {
      id: "ai-alpha-t1",
      owner: "alpha",
      name: "Alpha Kingdom",
      strength: 70,
      points: [
        [37.4285, -122.1690],
        [37.4290, -122.1690],
        [37.4290, -122.1680],
        [37.4285, -122.1680]
      ]
    },
    {
      id: "ai-beta-t1",
      owner: "beta",
      name: "Beta Outpost",
      strength: 35,
      points: [
        [37.4258, -122.1698],
        [37.4262, -122.1698],
        [37.4262, -122.1690],
        [37.4258, -122.1690]
      ]
    }
  ],
  challenges: [
    { id: "c1", title: "Walk 2 km", desc: "Track movement to complete", xpReward: 100, progress: 0.8, max: 2, unit: "km", type: "daily", completed: false, badge: "🏃‍♂️" },
    { id: "c2", title: "Earn 150 XP", desc: "Gain XP from capturing zones", xpReward: 50, progress: 50, max: 150, unit: "XP", type: "daily", completed: false, badge: "⚡" },
    { id: "c3", title: "Maintain Territory", desc: "Revisit and boost your Home Base", xpReward: 70, progress: 0, max: 1, unit: "revisit", type: "daily", completed: false, badge: "🛡️" },
    { id: "c4", title: "Weekend Warrior", desc: "Capture 3 separate regions", xpReward: 300, progress: 1, max: 3, unit: "captures", type: "weekly", completed: false, badge: "👑" },
    { id: "c5", title: "Decay Defender", desc: "Boost a decaying zone (below 50% strength)", xpReward: 150, progress: 0, max: 1, unit: "defend", type: "weekly", completed: false, badge: "🔥" }
  ],
  leaderboard: [
    { rank: 1, name: "TerritoryKing", avatar: "👑🏃‍♂️", score: 14800, size: "95,000m²", isUser: false },
    { rank: 2, name: "AlphaRunner", avatar: "🏃‍♀️", score: 12500, size: "84,300m²", isUser: false },
    { rank: 3, name: "BetaRunner", avatar: "🚴‍♂️", score: 9200, size: "62,100m²", isUser: false },
    { rank: 4, name: "Smarty", avatar: "🏃‍♂️", score: 7800, size: "24,500m²", isUser: true },
    { rank: 5, name: "JoggerMax", avatar: "🦁", score: 6200, size: "18,400m²", isUser: false }
  ],
  badges: [
    { id: "b1", name: "First Claim", icon: "🗺️", unlocked: true, desc: "Captured your first territory." },
    { id: "b2", name: "Week Streak", icon: "🔥", unlocked: true, desc: "Maintained a 7-day walking streak." },
    { id: "b3", name: "Defender", icon: "🛡️", unlocked: false, desc: "Revisited a territory to boost strength." },
    { id: "b4", name: "Legendary Walk", icon: "👑", unlocked: false, desc: "Walked a total of 50 km." }
  ]
};

let appState = {};
let activeChallengeFilter = "daily";

function loadState() {
  const saved = localStorage.getItem("my_territory_state");
  if (saved) {
    try {
      appState = JSON.parse(saved);
      // Sync leaderboard user stats
      const userRank = appState.leaderboard.find(l => l.isUser);
      if (userRank) {
        userRank.name = appState.user.username;
        userRank.avatar = appState.user.avatarImage ? "🖼️" : appState.user.avatar;
        userRank.score = appState.user.level * 1000 + appState.user.xp;
        userRank.size = appState.user.totalCapturedArea.toLocaleString() + "m²";
      }
    } catch (e) {
      console.error("Failed to parse saved state, resetting:", e);
      appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  } else {
    appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveState() {
  localStorage.setItem("my_territory_state", JSON.stringify(appState));
}

// --- Authentication UI Logic ---
let tempUploadedPhotoBase64 = "";

function initAuth() {
  const authScreen = document.getElementById("auth-screen");
  const mainApp = document.getElementById("main-app");

  const toLoginBtn = document.getElementById("to-login-btn");
  const toRegisterBtn = document.getElementById("to-register-btn");
  
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  
  const authTitle = document.getElementById("auth-title");
  const authSubtitle = document.getElementById("auth-subtitle");

  const authPhotoInput = document.getElementById("auth-photo-file");
  const authAvatarPreview = document.getElementById("auth-avatar-preview");

  // Load avatar photo uploading trigger inside Auth
  authPhotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      compressAndReadPhoto(file, (base64) => {
        tempUploadedPhotoBase64 = base64;
        authAvatarPreview.style.backgroundImage = `url(${base64})`;
        authAvatarPreview.innerText = ""; // Clear emoji placeholder
        authAvatarPreview.classList.add("has-image");
        sounds.playClick();
      });
    }
  });

  // Switch to Login screen
  toLoginBtn.addEventListener("click", () => {
    sounds.playClick();
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    authTitle.innerText = "Welcome Back";
    authSubtitle.innerText = "Log in to reclaim your kingdom!";
  });

  // Switch to Register screen
  toRegisterBtn.addEventListener("click", () => {
    sounds.playClick();
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    authTitle.innerText = "Create Account";
    authSubtitle.innerText = "Join the territory battles!";
  });

  // Form Submit: Register
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sounds.playClick();
    
    const username = document.getElementById("reg-username").value.trim();
    if (!username) return;

    appState.user.username = username;
    appState.user.isLoggedIn = true;
    
    // Save image if uploaded
    if (tempUploadedPhotoBase64) {
      appState.user.avatarImage = tempUploadedPhotoBase64;
    }
    
    saveState();
    
    // Switch Views
    authScreen.classList.add("hidden");
    mainApp.classList.remove("hidden");
    
    // Initialize Dashboard UI Values
    syncStatsUI();
    renderMissions();
    renderLeaderboard();
    if (map) {
      map.invalidateSize();
    }
    
    showToast("🎉 Welcome!", `Account created! Good luck capturing, ${username}.`);
    sounds.playLevelUp();
  });

  // Form Submit: Login
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sounds.playClick();

    const username = document.getElementById("login-username").value.trim();
    if (!username) return;

    appState.user.username = username;
    appState.user.isLoggedIn = true;

    saveState();
    
    authScreen.classList.add("hidden");
    mainApp.classList.remove("hidden");

    syncStatsUI();
    renderMissions();
    renderLeaderboard();
    if (map) {
      map.invalidateSize();
    }

    showToast("👋 Welcome Back!", `Logged in as ${username}.`);
  });

  // Handle Logout Button
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
      sounds.playClick();
      appState.user.isLoggedIn = false;
      saveState();

      // Show auth screens
      mainApp.classList.add("hidden");
      authScreen.classList.remove("hidden");
      
      // Reset inputs
      document.getElementById("reg-username").value = "";
      document.getElementById("login-username").value = "";
      authAvatarPreview.style.backgroundImage = "none";
      authAvatarPreview.innerText = "🏃‍♂️";
      authAvatarPreview.classList.remove("has-image");
      tempUploadedPhotoBase64 = "";
    }
  });
}

// Compress and read image as Base64 (cropped max 200x200 to protect local storage)
function compressAndReadPhoto(file, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      const MAX_WIDTH = 200;
      const MAX_HEIGHT = 200;
      let width = img.width;
      let height = img.height;

      // Crop to square coordinates
      let sx = 0, sy = 0, size = Math.min(width, height);
      if (width > height) {
        sx = (width - height) / 2;
      } else {
        sy = (height - width) / 2;
      }

      canvas.width = MAX_WIDTH;
      canvas.height = MAX_HEIGHT;
      
      ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_WIDTH, MAX_HEIGHT);
      
      // Export as compressed JPEG
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
      callback(compressedDataUrl);
    };
  };
}

// ------------------- Phone OTP + Password Auth (Client-side prototype) -------------------
// NOTE: This is a client-only prototype. In production, OTPs must be delivered by SMS
// and user credentials stored on a secure server. Here we use localStorage for demo.

async function hashPassword(password) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
  try { return JSON.parse(localStorage.getItem('my_territory_users') || '{}'); }
  catch (e) { return {}; }
}

function saveUsers(users) { localStorage.setItem('my_territory_users', JSON.stringify(users)); }

function createOrUpdateUser(phone, username, passwordHash) {
  const users = getUsers();
  users[phone] = users[phone] || {};
  users[phone].phone = phone;
  users[phone].username = username || users[phone].username || ('user'+phone.slice(-4));
  if (passwordHash) users[phone].passwordHash = passwordHash;
  saveUsers(users);
}

function verifyPasswordHash(phone, hash) {
  const users = getUsers();
  if (!users[phone] || !users[phone].passwordHash) return false;
  return users[phone].passwordHash === hash;
}

// In-memory OTP store for the session
window._otpStore = window._otpStore || {};

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendOtpToPhone(phone) {
  const code = generateOtpCode();
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
  window._otpStore[phone] = { code, expires };
  // For this prototype, display in UI (dev only). In real app send via SMS gateway.
  const dev = document.getElementById('dev-otp-display');
  if (dev) dev.innerText = code;
  return code;
}

function verifyOtpForPhone(phone, code) {
  const entry = window._otpStore[phone];
  if (!entry) return { ok: false, reason: 'no_otp' };
  if (Date.now() > entry.expires) return { ok: false, reason: 'expired' };
  if (entry.code !== code) return { ok: false, reason: 'mismatch' };
  delete window._otpStore[phone];
  return { ok: true };
}

// UI helpers for OTP modal
function openOtpModal(phone, pending) {
  const modal = document.getElementById('otp-modal');
  if (!modal) return;
  const strong = document.getElementById('otp-phone-display').querySelector('strong');
  if (strong) strong.innerText = phone;
  document.getElementById('otp-code-input').value = '';
  modal.classList.remove('hidden');
  // store pending action
  window._pendingAuth = pending || null;
}

function closeOtpModal() {
  const modal = document.getElementById('otp-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  window._pendingAuth = null;
}

function finishLoginForPhone(phone) {
  const users = getUsers();
  const u = users[phone] || { phone, username: 'user'+phone.slice(-4) };
  // set appState user and UI
  appState.user = appState.user || {};
  appState.user.username = u.username;
  appState.user.avatar = u.avatar || appState.user.avatar || '🏃‍♂️';
  appState.user.isLoggedIn = true;
  saveState();
  // update UI
  const authScreen = document.getElementById('auth-screen');
  const mainApp = document.getElementById('main-app');
  if (authScreen) authScreen.classList.add('hidden');
  if (mainApp) mainApp.classList.remove('hidden');
  const headerName = document.getElementById('header-username'); if (headerName) headerName.innerText = appState.user.username;
  const sideName = document.getElementById('sidebar-username-txt'); if (sideName) sideName.innerText = appState.user.username;
  showToast('✅ Logged in', `Welcome back, ${appState.user.username}`);
}

// Wire auth form actions after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const sendOtpBtn = document.getElementById('send-otp-btn');
  const otpVerifyBtn = document.getElementById('otp-verify-btn');
  const otpResendBtn = document.getElementById('otp-resend-btn');
  const otpCancelBtn = document.getElementById('otp-cancel-btn');

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;
      if (!phone || !password) { showToast('Missing', 'Please enter phone and password'); return; }
      const pwdHash = await hashPassword(password);
      // send OTP and open modal; pending action will create user on verify
      sendOtpToPhone(phone);
      openOtpModal(phone, { type: 'register', phone, username, passwordHash: pwdHash });
      showToast('OTP Sent', `A verification code was sent to ${phone} (dev display)`);
    });
  }

  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', (e) => {
      const phone = document.getElementById('login-phone').value.trim();
      if (!phone) { showToast('Missing', 'Enter phone number to receive OTP'); return; }
      sendOtpToPhone(phone);
      openOtpModal(phone, { type: 'login-otp', phone });
      showToast('OTP Sent', `A verification code was sent to ${phone} (dev display)`);
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = document.getElementById('login-phone').value.trim();
      const password = document.getElementById('login-password').value || '';
      if (password && phone) {
        const hash = await hashPassword(password);
        if (verifyPasswordHash(phone, hash)) {
          finishLoginForPhone(phone);
        } else {
          showToast('Error', 'Invalid phone or password');
        }
        return;
      }
      // if no password provided, prompt to use OTP
      showToast('Info', 'Enter your phone and press "Send OTP" to login via code');
    });
  }

  if (otpVerifyBtn) {
    otpVerifyBtn.addEventListener('click', (e) => {
      const code = document.getElementById('otp-code-input').value.trim();
      const pending = window._pendingAuth;
      if (!pending) { showToast('Error', 'No pending action'); return; }
      const phone = pending.phone;
      const res = verifyOtpForPhone(phone, code);
      if (!res.ok) { showToast('OTP Error', res.reason || 'Invalid code'); return; }
      if (pending.type === 'register') {
        createOrUpdateUser(pending.phone, pending.username, pending.passwordHash);
        closeOtpModal();
        finishLoginForPhone(pending.phone);
        showToast('Welcome', 'Account created and logged in');
      } else if (pending.type === 'login-otp') {
        closeOtpModal();
        finishLoginForPhone(pending.phone);
      }
    });
  }

  if (otpResendBtn) {
    otpResendBtn.addEventListener('click', (e) => {
      const pending = window._pendingAuth;
      if (!pending) { showToast('Error', 'No pending phone to resend'); return; }
      sendOtpToPhone(pending.phone);
      showToast('OTP Sent', `Resent to ${pending.phone} (dev display)`);
    });
  }

  if (otpCancelBtn) {
    otpCancelBtn.addEventListener('click', (e) => {
      closeOtpModal();
    });
  }
});

// --- Dynamic Navigation & View System ---
function initNavigation() {
  const tabs = document.querySelectorAll(".nav-tab, .menu-item");
  const screens = document.querySelectorAll(".app-screen");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      sounds.playClick();
      const targetScreen = tab.dataset.screen;
      if (!targetScreen) return; // e.g. logout button
      
      tabs.forEach(t => {
        if (t.dataset.screen === targetScreen) {
          t.classList.add("active");
        } else {
          t.classList.remove("active");
        }
      });
      
      screens.forEach(s => s.classList.remove("active"));
      
      const targetEl = document.getElementById(`screen-${targetScreen}`);
      if (targetEl) {
        targetEl.classList.add("active");
      }

      if (targetScreen === "map") {
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 100);
      }

      // Re-render decay dashboard whenever Defense or Decay Watch is opened
      if (targetScreen === "defense" || targetScreen === "decay") {
        renderDecayDashboard();
      }

      syncStatsUI();
    });
  });

  // Bind Desktop Sidebar Logout button
  const dLogout = document.getElementById("sidebar-btn-logout");
  if (dLogout) {
    dLogout.addEventListener("click", () => {
      document.getElementById("btn-logout").click();
    });
  }
}

// --- Map Capture & GPS Simulation Engine ---
let map;
let userMarker;
let activePolyline;
let userPos = [37.4270, -122.1700]; // Stanford Oval center coords
let simulatedPath = [];
let isTracking = false;
let trackingStartTime = null;
let durationTimer = null;
let activeTerritoryLayers = [];
let mockCompetitorTimers = [];

// Geolocation GPS variables
let gpsWatchId = null;
let currentTrackingMode = "sim"; // 'sim' or 'device'
let currentSpeedMode = "walk";

const SPEED_FACTORS = {
  walk: { mS: 1.39, deg: 0.000012 },
  run:  { mS: 4.17, deg: 0.000036 }
};

// Auto speed tracking — records peak speed seen in a session
let sessionPeakSpeedKmH = 0;
const SPEED_CHEAT_THRESHOLD_KMH = 30; // > 30 km/h = suspected vehicle

function initMap() {
  map = L.map('map-container', {
    zoomControl: true,
    attributionControl: false
  }).setView(userPos, 16);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20
  }).addTo(map);

  // Load custom icon
  updateMapUserMarker();

  // Load existing territories
  renderTerritories();

  // D-Pad simulator handlers
  document.getElementById("key-up").addEventListener("click", () => moveUser(0.0001, 0));
  document.getElementById("key-down").addEventListener("click", () => moveUser(-0.0001, 0));
  document.getElementById("key-left").addEventListener("click", () => moveUser(0, -0.00012));
  document.getElementById("key-right").addEventListener("click", () => moveUser(0, 0.00012));
  
  // Closing loop pin
  document.getElementById("key-center").addEventListener("click", () => {
    sounds.playClick();
    if (isTracking && simulatedPath.length > 2) {
      simulatedPath.push([simulatedPath[0][0], simulatedPath[0][1]]);
      activePolyline.setLatLngs(simulatedPath);
      completeCapture();
    }
  });

  // Keyboard keys listener
  document.addEventListener("keydown", (e) => {
    const activeScreen = document.querySelector(".app-screen.active");
    if (!activeScreen || activeScreen.id !== "screen-map" || currentTrackingMode !== "sim") return;

    if (e.key === "ArrowUp") moveUser(0.00008, 0);
    else if (e.key === "ArrowDown") moveUser(-0.00008, 0);
    else if (e.key === "ArrowLeft") moveUser(0, -0.0001);
    else if (e.key === "ArrowRight") moveUser(0, 0.0001);
  });

  // Track button triggers
  document.getElementById("tracker-start-btn").addEventListener("click", startTracking);
  document.getElementById("tracker-pause-btn").addEventListener("click", pauseTracking);
  document.getElementById("tracker-stop-btn").addEventListener("click", stopTracking);

  // Speed selectors (walk / run only — car removed, speed is auto-detected)
  const speedPills = document.querySelectorAll(".speed-pill");
  speedPills.forEach(pill => {
    pill.addEventListener("click", () => {
      sounds.playClick();
      speedPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentSpeedMode = pill.dataset.speed;
    });
  });

  // Initialize GPS Tracking Mode Switching
  initGpsModeSelector();

  // Spawn AI competitors
  startCompetitorSimulation();
}

function updateMapUserMarker() {
  if (!map) return;
  
  let html = "";
  if (appState.user.avatarImage) {
    html = `<div class="user-pulse"></div><div class="user-emoji user-avatar-small has-image" style="background-image: url(${appState.user.avatarImage}); width: 40px; height: 40px; border-radius: 50%;"></div>`;
  } else {
    html = `<div class="user-pulse"></div><div class="user-emoji">${appState.user.avatar}</div>`;
  }

  const userIcon = L.divIcon({
    className: 'custom-user-marker',
    html: html,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  if (userMarker) {
    userMarker.setIcon(userIcon);
  } else {
    userMarker = L.marker(userPos, { icon: userIcon }).addTo(map);
  }
}

// GPS Mode Selection: Simulator vs Actual Device GPS
function initGpsModeSelector() {
  const btnSim = document.getElementById("gps-mode-sim");
  const btnDevice = document.getElementById("gps-mode-device");
  
  const panelKeypad = document.getElementById("sim-keypad-panel");
  const panelInstructions = document.getElementById("sim-instructions-panel");
  const panelSpeed = document.getElementById("sim-speed-panel");

  btnSim.addEventListener("click", () => {
    sounds.playClick();
    if (isTracking) {
      alert("Please stop your active capture session first.");
      return;
    }
    
    currentTrackingMode = "sim";
    btnSim.classList.add("active");
    btnDevice.classList.remove("active");
    
    // Show simulator guides
    panelKeypad.classList.remove("hidden");
    panelInstructions.classList.remove("hidden");
    panelSpeed.classList.remove("hidden");
    
    stopDeviceGpsWatch();
    showToast("🎮 Simulator Mode Active", "Use keyboard arrow keys or D-Pad controls.");
  });

  btnDevice.addEventListener("click", () => {
    sounds.playClick();
    if (isTracking) {
      alert("Please stop your active capture session first.");
      return;
    }

    currentTrackingMode = "device";
    btnDevice.classList.add("active");
    btnSim.classList.remove("active");

    // Hide simulator panels
    panelKeypad.classList.add("hidden");
    panelInstructions.classList.add("hidden");
    panelSpeed.classList.add("hidden");

    // Initiate device GPS tracking permission request
    startDeviceGpsWatch();
  });
}

function startDeviceGpsWatch() {
  if (!navigator.geolocation) {
    showToast("⚠️ Geolocation Error", "This browser doesn't support GPS tracking. Falling back to Simulator.");
    document.getElementById("gps-mode-sim").click();
    return;
  }

  showToast("📡 Requesting GPS", "Awaiting location permission from your device...");

  gpsWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      
      // Update coordinates
      userPos = [lat, lng];
      userMarker.setLatLng(userPos);
      map.setView(userPos, 17);

      // Handle speed mapping
      let speedKmH = 0;
      if (position.coords.speed !== null && position.coords.speed !== undefined) {
        speedKmH = position.coords.speed * 3.6; // convert m/s to km/h
      } else {
        // Fallback speed simulation
        speedKmH = isTracking ? 5.2 : 0;
      }
      
      if (isTracking && activePolyline) {
        simulatedPath.push([lat, lng]);
        activePolyline.setLatLngs(simulatedPath);
        activePolyline.bringToFront();
        
        // Calculate statistics and check loops
        calculateStats();
        checkLoopClosure();
        
        // Auto speed cheat detection — block if speed > 30 km/h
        if (speedKmH > sessionPeakSpeedKmH) sessionPeakSpeedKmH = speedKmH;
        const cheatAlertEl = document.getElementById("cheat-alert");
        if (speedKmH > SPEED_CHEAT_THRESHOLD_KMH) {
          cheatAlertEl.classList.remove("hidden");
          sounds.playAlert();
        } else {
          cheatAlertEl.classList.add("hidden");
        }
      }

      document.getElementById("track-speed").innerText = `${speedKmH.toFixed(1)} km/h`;
    },
    (err) => {
      console.warn("GPS tracking error:", err);
      showToast("⚠️ GPS Location Failure", "Could not capture device location. Switching to Simulator.");
      document.getElementById("gps-mode-sim").click();
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    }
  );
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
    let color = "#9ca3af";
    let fillOpacity = 0.2;
    let className = 'territory-layer';

    if (terr.owner === 'user') {
      color = "#3B82F6";
      fillOpacity = terr.strength / 200;
      className = `territory-user glow-strength-${Math.ceil(terr.strength / 20)}`;
    } else if (terr.owner === 'alpha') {
      color = "#A855F7";
      fillOpacity = terr.strength / 200;
    } else if (terr.owner === 'beta') {
      color = "#EC4899";
      fillOpacity = terr.strength / 200;
    } else if (terr.owner === 'zone') {
      color = "#10B981";
      fillOpacity = 0.35;
    }

    const polygon = L.polygon(terr.points, {
      color: color,
      fillColor: color,
      fillOpacity: fillOpacity,
      weight: terr.owner === 'user' ? 3 : 2,
      dashArray: terr.strength < 40 && terr.owner !== 'zone' ? '5, 5' : null,
      className: className
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
  if (terr) {
    if (terr.owner !== 'user') {
      showToast("🛡️ Battle!", "You must capture this enemy zone by walking around it!");
      return;
    }
    terr.strength = Math.min(100, terr.strength + 20);
    
    // Add revisit quest progress
    const revisitQuest = appState.challenges.find(c => c.id === "c3");
    if (revisitQuest && !revisitQuest.completed) {
      revisitQuest.progress = 1;
      checkQuestCompletion();
    }
    const defQuest = appState.challenges.find(c => c.id === "c5");
    if (defQuest && !defQuest.completed && terr.strength - 20 < 50) {
      defQuest.progress = 1;
      checkQuestCompletion();
    }

    addXP(30);
    showToast("🛡️ Territory Boosted!", `Revisited ${terr.name}. Strength increased to ${terr.strength}% (+30 XP)`);
    renderTerritories();
    saveState();
    syncStatsUI();
  }
};

function moveUser(latOffset, lngOffset) {
  if (currentTrackingMode !== "sim") return; // Keypad movements blocked in Device mode

  const currentSpeedObj = SPEED_FACTORS[currentSpeedMode];
  const factor = currentSpeedMode === "walk" ? 1 : (currentSpeedMode === "run" ? 2.5 : 5);
  
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

  window.maxSessionDist = 0;  // Reset session distance tracker
  sessionPeakSpeedKmH = 0;    // Reset peak speed for this session
  isTracking = true;
  simulatedPath = [[userPos[0], userPos[1]]];
  trackingStartTime = new Date();

  // Show active bar
  document.getElementById("active-workout-bar").classList.remove("hidden");
  document.getElementById("active-workout-text").innerText = currentTrackingMode === "sim" ? "Active Session • Simulating Movement" : "Active Session • Real GPS Tracking";
  
  document.getElementById("tracker-start-btn").classList.add("hidden");
  document.getElementById("tracker-pause-btn").classList.remove("hidden");
  document.getElementById("tracker-stop-btn").classList.remove("hidden");

  // Reset stats
  document.getElementById("track-distance").innerText = "0.00 km";
  document.getElementById("track-duration").innerText = "00:00";
  document.getElementById("track-live-area").innerText = "0 m²";
  document.getElementById("track-speed").innerText = currentTrackingMode === "sim" ? (currentSpeedMode === "walk" ? "5.0 km/h" : "15.0 km/h") : "0.0 km/h";

  // Create line (Neon Yellow/Gold with thick stroke for high visibility)
  activePolyline = L.polyline(simulatedPath, {
    color: '#FBBF24',
    weight: 5,
    opacity: 0.95,
    className: 'active-capture-line'
  }).addTo(map);
  activePolyline.bringToFront();

  let seconds = 0;
  durationTimer = setInterval(() => {
    seconds++;
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    document.getElementById("track-duration").innerText = `${mins}:${secs}`;
    
    // Simulated minor GPS drift (Simulator mode only)
    if (currentTrackingMode === "sim" && Math.random() > 0.8) {
      moveUser((Math.random() - 0.5) * 0.00001, (Math.random() - 0.5) * 0.00001);
    }
  }, 1000);

  showToast("🏃‍♂️ Capture Started!", "Walk around an area and complete the loop to capture it!");
}

function pauseTracking() {
  sounds.playClick();
  isTracking = false;
  clearInterval(durationTimer);
  document.getElementById("tracker-pause-btn").innerText = "Resume";
  // Remove pause listener to bind resume handler
  document.getElementById("tracker-pause-btn").removeEventListener("click", pauseTracking);
  document.getElementById("tracker-pause-btn").addEventListener("click", resumeTracking, { once: true });
}

function resumeTracking() {
  sounds.playClick();
  isTracking = true;
  document.getElementById("tracker-pause-btn").innerText = "Pause";
  
  // Re-start clock
  let timeStr = document.getElementById("track-duration").innerText;
  let timeParts = timeStr.split(":");
  let seconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);

  durationTimer = setInterval(() => {
    seconds++;
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    document.getElementById("track-duration").innerText = `${mins}:${secs}`;
  }, 1000);

  document.getElementById("tracker-pause-btn").removeEventListener("click", resumeTracking);
  document.getElementById("tracker-pause-btn").addEventListener("click", pauseTracking);
}

function stopTracking() {
  sounds.playClick();
  isTracking = false;
  clearInterval(durationTimer);

  document.getElementById("active-workout-bar").classList.add("hidden");
  document.getElementById("tracker-start-btn").classList.remove("hidden");
  document.getElementById("tracker-pause-btn").classList.add("hidden");
  document.getElementById("tracker-stop-btn").classList.add("hidden");
  document.getElementById("cheat-alert").classList.add("hidden");

  if (activePolyline) {
    map.removeLayer(activePolyline);
  }

  showToast("⏹️ Session Finished", "Workout summary generated. Keep walking to claim areas!");
}

// Compute live real-time polygon area during active session (before closing loop)
function calculateLiveEstArea() {
  if (simulatedPath.length < 3) return 0;

  // Temporarily clone the path and append user's start position to form a closed polygon
  const pathClone = JSON.parse(JSON.stringify(simulatedPath));
  pathClone.push([pathClone[0][0], pathClone[0][1]]);

  // Convert coords relative to origin to compute area in square meters
  const origin = pathClone[0];
  const x = [];
  const y = [];

  pathClone.forEach(coord => {
    const dx = (coord[1] - origin[1]) * 111300 * Math.cos(origin[0] * Math.PI / 180);
    const dy = (coord[0] - origin[0]) * 111300;
    x.push(dx);
    y.push(dy);
  });

  // Shoelace Area Formula
  let sum1 = 0;
  let sum2 = 0;
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
    const p1 = L.latLng(simulatedPath[i-1][0], simulatedPath[i-1][1]);
    const p2 = L.latLng(simulatedPath[i][0], simulatedPath[i][1]);
    distMeters += p1.distanceTo(p2);
  }

  const distKm = distMeters / 1000;
  document.getElementById("track-distance").innerText = `${distKm.toFixed(2)} km`;

  // Live estimated loop area
  const estArea = calculateLiveEstArea();
  document.getElementById("track-live-area").innerText = `${estArea.toLocaleString()} m²`;

  // ── Auto speed detection ────────────────────────────────────────────────
  // Simulator: use selected speed setting + minor drift
  // Real GPS:  derive from last two path points (steps fire ~1/s)
  let currentSpeedKmH = 0;
  if (currentTrackingMode === "sim") {
    const baseSpeed = currentSpeedMode === "walk" ? 5 : 15;
    currentSpeedKmH = baseSpeed + (Math.random() - 0.5) * 0.5;
  } else {
    if (simulatedPath.length >= 2) {
      const last = simulatedPath[simulatedPath.length - 1];
      const prev = simulatedPath[simulatedPath.length - 2];
      const stepM = L.latLng(prev[0], prev[1]).distanceTo(L.latLng(last[0], last[1]));
      currentSpeedKmH = stepM * 3.6; // m/s → km/h (1 step ≈ 1 s)
    }
  }

  document.getElementById("track-speed").innerText = `${currentSpeedKmH.toFixed(1)} km/h`;

  // Track peak speed for this session
  if (currentSpeedKmH > sessionPeakSpeedKmH) sessionPeakSpeedKmH = currentSpeedKmH;

  // ── Live cheat alert ────────────────────────────────────────────────────
  const cheatAlert = document.getElementById("cheat-alert");
  if (currentSpeedKmH > SPEED_CHEAT_THRESHOLD_KMH) {
    cheatAlert.classList.remove("hidden");
    sounds.playAlert();
  } else {
    cheatAlert.classList.add("hidden");
  }

  // Update Daily Challenge progress (c1: distance)
  const distQuest = appState.challenges.find(c => c.id === "c1");
  if (distQuest && !distQuest.completed) {
    distQuest.progress = Math.min(distQuest.max, 0.8 + distKm);
    checkQuestCompletion();
  }
}

function checkLoopClosure() {
  if (simulatedPath.length < 15) return; // Need more coordinates for valid loops

  const startPoint = L.latLng(simulatedPath[0][0], simulatedPath[0][1]);
  const head = L.latLng(simulatedPath[simulatedPath.length - 1][0], simulatedPath[simulatedPath.length - 1][1]);
  
  // Check user distance from the session start coordinate
  const currentDistFromStart = head.distanceTo(startPoint);
  
  if (!window.maxSessionDist) window.maxSessionDist = 0;
  if (currentDistFromStart > window.maxSessionDist) {
    window.maxSessionDist = currentDistFromStart;
  }

  // Prevent auto-closing loop unless user has traveled at least 20 meters away from start point first
  if (window.maxSessionDist < 20) return;

  // ONLY check for closure against the starting region of the path (indices 0 to 5)
  // This prevents the user from "colliding" with the path directly behind them while walking
  for (let i = 0; i < Math.min(6, simulatedPath.length - 10); i++) {
    const point = L.latLng(simulatedPath[i][0], simulatedPath[i][1]);
    const dist = head.distanceTo(point);

    if (dist < 15) { // 15 meters closure threshold to the start
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
    // ── Auto speed cheat check: reject if peak session speed > 30 km/h ──
    const isTooFast = sessionPeakSpeedKmH > SPEED_CHEAT_THRESHOLD_KMH;

    if (isTooFast) {
      sounds.playAlert();
      showToast("❌ Cheat Detected!", `Peak speed of ${sessionPeakSpeedKmH.toFixed(1)} km/h exceeded the 30 km/h limit. Walk or run to capture!`);
    } else {
      const newTerrId = "user-capture-" + Date.now();
      const newTerrName = "Sector " + (appState.territories.length + 1);
      
      const newTerr = {
        id: newTerrId,
        owner: "user",
        name: newTerrName,
        strength: 100,
        area: estArea, // save calculated area for decay calculations
        points: JSON.parse(JSON.stringify(simulatedPath))
      };

      appState.territories.push(newTerr);
      appState.user.totalCapturedArea += estArea;

      const xpGained = 50 + Math.floor(estArea / 500);
      addXP(xpGained);

      // Challenge update (Weekly c4: capture 3 separate regions)
      const captureWeekly = appState.challenges.find(c => c.id === "c4");
      if (captureWeekly && !captureWeekly.completed) {
        captureWeekly.progress = Math.min(captureWeekly.max, captureWeekly.progress + 1);
        checkQuestCompletion();
      }

      showToast("🎉 Area Captured!", `Successfully claimed ${newTerrName} (${estArea.toLocaleString()} m²)! Earned +${xpGained} XP.`);
      renderTerritories();
      saveState();
      syncStatsUI();
    }
  }

  // Restore screen layout
  document.getElementById("active-workout-bar").classList.add("hidden");
  document.getElementById("tracker-start-btn").classList.remove("hidden");
  document.getElementById("tracker-pause-btn").classList.add("hidden");
  document.getElementById("tracker-stop-btn").classList.add("hidden");
  document.getElementById("cheat-alert").classList.add("hidden");
  
  if (activePolyline) {
    map.removeLayer(activePolyline);
  }
}

// Simulate AI Runners capturing territories
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

      const newPt = [
        [startLoc[0] - 0.0004, startLoc[1] - 0.0005],
        [startLoc[0] + 0.0004, startLoc[1] - 0.0005],
        [startLoc[0] + 0.0004, startLoc[1] + 0.0005],
        [startLoc[0] - 0.0004, startLoc[1] + 0.0005]
      ];

      const newAiTerr = {
        id: `ai-${owner}-${Date.now()}`,
        owner: owner,
        name: `${owner === 'alpha' ? 'Alpha' : 'Beta'} Sector`,
        strength: 80,
        points: newPt
      };

      appState.territories.push(newAiTerr);
      renderTerritories();

      if (Math.random() > 0.6) {
        showGuardianNotification("⚔️ Territory Under Attack!", `Opponent ${owner.toUpperCase()} has captured territory near you! Go defend your turf.`);
      }
    }
  }, 10000);

  mockCompetitorTimers.push(cTimer);
}

// --- XP Level Management ---
const LEVEL_TITLES = [
  "Beginner",
  "Explorer",
  "Challenger",
  "Champion",
  "Legend"
];

function addXP(amount) {
  appState.user.xp += amount;
  
  const xpQuest = appState.challenges.find(c => c.id === "c2");
  if (xpQuest && !xpQuest.completed) {
    xpQuest.progress = Math.min(xpQuest.max, xpQuest.progress + amount);
    checkQuestCompletion();
  }

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
  const modal = document.getElementById("level-up-modal");
  const rankTitle = getRankTitle(appState.user.level);
  
  document.getElementById("modal-level-badge").innerText = rankTitle;
  document.getElementById("modal-level-num").innerText = appState.user.level;
  
  modal.classList.remove("hidden");
  sounds.playLevelUp();
  createConfetti();
}

function getRankTitle(level) {
  if (level <= 3) return LEVEL_TITLES[0];
  if (level <= 7) return LEVEL_TITLES[1];
  if (level <= 11) return LEVEL_TITLES[2];
  if (level <= 15) return LEVEL_TITLES[3];
  return LEVEL_TITLES[4];
}

function createConfetti() {
  const container = document.getElementById("confetti-canvas-container");
  container.innerHTML = "";
  const colors = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#EC4899", "#A855F7"];
  
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 2 + "s";
    piece.style.transform = `scale(${Math.random() * 0.8 + 0.4})`;
    container.appendChild(piece);
  }
}

// --- Challenges & Missions Cabinet ---
function renderMissions() {
  const dailyContainer = document.getElementById("daily-mission-list");
  const fullContainer = document.getElementById("challenges-list-full");
  const badgesContainer = document.getElementById("badges-grid-container");

  dailyContainer.innerHTML = "";
  fullContainer.innerHTML = "";
  badgesContainer.innerHTML = "";

  // Render Dashboard Daily items (always daily)
  appState.challenges.filter(c => c.type === "daily").forEach(quest => {
    const progressPercent = (quest.progress / quest.max) * 100;
    const card = document.createElement("div");
    card.className = `mission-card ${quest.completed ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="mission-badge-icon">${quest.badge}</div>
      <div class="mission-info">
        <h4>${quest.title}</h4>
        <div class="mission-reward-tag"><i class="fa-solid fa-bolt"></i> +${quest.xpReward} XP</div>
        <div class="mission-progress-bar">
          <div class="mission-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>
      <div class="mission-checkbox">
        <i class="fa-solid fa-check"></i>
      </div>
    `;
    dailyContainer.appendChild(card);
  });

  // Render filter list in challenges (Based on Daily / Weekly selected tab filter)
  const filteredQuests = appState.challenges.filter(c => c.type === activeChallengeFilter);
  
  filteredQuests.forEach(quest => {
    const progressPercent = (quest.progress / quest.max) * 100;
    const card = document.createElement("div");
    card.className = `mission-card ${quest.completed ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="mission-badge-icon">${quest.badge}</div>
      <div class="mission-info">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4>${quest.title}</h4>
          <span style="font-size:10px; opacity:0.6; text-transform:uppercase;">${quest.type}</span>
        </div>
        <p class="mission-desc">${quest.desc}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
          <div class="mission-reward-tag"><i class="fa-solid fa-bolt"></i> +${quest.xpReward} XP</div>
          <span style="font-size:11px; font-weight:700;">${quest.progress.toFixed(1)} / ${quest.max} ${quest.unit}</span>
        </div>
        <div class="mission-progress-bar">
          <div class="mission-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>
      <div class="mission-checkbox">
        <i class="fa-solid fa-check"></i>
      </div>
    `;
    fullContainer.appendChild(card);
  });

  // Render badges
  appState.badges.forEach(badge => {
    const item = document.createElement("div");
    item.className = `badge-item ${badge.unlocked ? '' : 'locked'}`;
    item.title = badge.desc;
    item.innerHTML = `
      <div class="badge-icon">${badge.icon}</div>
      <div class="badge-name">${badge.name}</div>
    `;
    badgesContainer.appendChild(item);
  });
}

function checkQuestCompletion() {
  appState.challenges.forEach(quest => {
    if (!quest.completed && quest.progress >= quest.max) {
      quest.completed = true;
      addXP(quest.xpReward);
      showToast("🏆 Challenge Completed!", `Nice job! Completed "${quest.title}" and earned +${quest.xpReward} XP.`);
      
      if (quest.id === "c3") {
        const badge = appState.badges.find(b => b.id === "b3");
        if (badge && !badge.unlocked) {
          badge.unlocked = true;
          showToast("🎖️ Badge Unlocked!", `Earned the "${badge.name}" Badge!`);
        }
      }
    }
  });
  saveState();
  renderMissions();
}

// Challenges Tab click handler initialization
function initChallengesFilter() {
  const tabs = document.querySelectorAll("#challenges-tabs .tab-sub");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      sounds.playClick();
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeChallengeFilter = tab.dataset.filter;
      renderMissions();
    });
  });
}

// --- Dynamic Leaderboards ---
function renderLeaderboard() {
  const itemsContainer = document.getElementById("leaderboard-items");
  itemsContainer.innerHTML = "";

  appState.leaderboard.sort((a, b) => b.score - a.score);

  appState.leaderboard.forEach((item, index) => {
    item.rank = index + 1;
    
    let medal = item.rank;
    if (item.rank === 1) medal = "🥇";
    else if (item.rank === 2) medal = "🥈";
    else if (item.rank === 3) medal = "🥉";

    // Setup custom visual avatar image overlay if user rank
    let avatarHtml = `<div class="leader-avatar">${item.avatar}</div>`;
    if (item.isUser && appState.user.avatarImage) {
      avatarHtml = `<div class="leader-avatar has-image" style="background-image: url(${appState.user.avatarImage});"></div>`;
    }

    const div = document.createElement("div");
    div.className = `leader-item ${item.isUser ? 'user-item' : ''}`;
    div.innerHTML = `
      <div class="leader-rank">${medal}</div>
      ${avatarHtml}
      <div class="leader-info">
        <div class="leader-name">${item.name}</div>
        <div class="leader-strength">Turf: ${item.size}</div>
      </div>
      <div class="leader-score">${item.score.toLocaleString()} XP</div>
    `;
    itemsContainer.appendChild(div);
  });
}

// --- Interactive AI Coach Chat ---
const COACH_RESPONSES = {
  default: "I analyze your logs, consistency, and active streaks. Walking at this time keeps your metabolism active! What training recommendation do you need today?",
  analyze: "📊 **Consistency Report**: You completed **3.5 km** today, matching your 7-day average. You captured 1 neutral zone and defended Home Base. Fatigue status is **Low**. Excellent rhythm!",
  target: "🎯 **Tomorrow's Goal**: Let's challenge ourselves. Walk **2.5 km** at the Stanford Oval and complete a full loop to expand your territory boundaries. This will secure you +100 XP!",
  fatigue: "🛡️ **Overtraining Check**: Your health consistency is at **82/100**. You completed workouts 4 days in a row. You are not overtraining, but I suggest focusing on short, low-intensity walks tomorrow to recover.",
  streak: "🔥 **Streak Protection**: Maintain active logs daily (minimum 100m walks or captures) to secure your streak rewards. At day 10, you unlock a **Territory Shield** which slows down decay by 50%!"
};

function initCoachChat() {
  const form = document.getElementById("coach-chat-form");
  const input = document.getElementById("coach-message-input");
  const chips = document.querySelectorAll(".prompt-chip");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const txt = input.value.trim();
    if (!txt) return;

    addUserBubble(txt);
    input.value = "";

    setTimeout(() => {
      let reply = COACH_RESPONSES.default;
      const lower = txt.toLowerCase();
      if (lower.includes("analyze") || lower.includes("performance") || lower.includes("workout")) reply = COACH_RESPONSES.analyze;
      else if (lower.includes("goal") || lower.includes("suggest") || lower.includes("tomorrow")) reply = COACH_RESPONSES.target;
      else if (lower.includes("overtrain") || lower.includes("fatigue") || lower.includes("recovery")) reply = COACH_RESPONSES.fatigue;
      else if (lower.includes("streak") || lower.includes("protection") || lower.includes("shield")) reply = COACH_RESPONSES.streak;

      addCoachBubble(reply);
    }, 800);
  });

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      sounds.playClick();
      const prompt = chip.dataset.prompt;
      addUserBubble(prompt);

      setTimeout(() => {
        let reply = COACH_RESPONSES.default;
        if (prompt.includes("consistency")) reply = COACH_RESPONSES.analyze;
        else if (prompt.includes("target")) reply = COACH_RESPONSES.target;
        else if (prompt.includes("overtraining")) reply = COACH_RESPONSES.fatigue;
        else if (prompt.includes("protection")) reply = COACH_RESPONSES.streak;

        addCoachBubble(reply);
      }, 700);
    });
  });
}

function addUserBubble(text) {
  const viewport = document.getElementById("chat-messages");
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement("div");
  div.className = "chat-bubble user";
  div.innerHTML = `
    <div class="bubble-content">${text}</div>
    <span class="bubble-time">${time}</span>
  `;
  viewport.appendChild(div);
  viewport.scrollTop = viewport.scrollHeight;
}

function addCoachBubble(text) {
  const viewport = document.getElementById("chat-messages");
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const parsedText = text
    .replace(/\*\*(.*?)\*\"/g, '<b>$1</b>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/📊|🎯|🛡️|🔥/g, (match) => `<span style="font-size: 1.1em">${match}</span>`);

  const div = document.createElement("div");
  div.className = "chat-bubble coach";
  div.innerHTML = `
    <div class="bubble-content">${parsedText}</div>
    <span class="bubble-time">${time}</span>
  `;
  viewport.appendChild(div);
  viewport.scrollTop = viewport.scrollHeight;
}

// --- Notifications & Toasts (Territory Guardian) ---
function initNotificationSimulator() {
  const triggerBtn = document.getElementById("notif-trigger-btn");
  const closeBtn = document.getElementById("notif-close-btn");
  
  triggerBtn.addEventListener("click", () => {
    sounds.playClick();
    const notifications = [
      "🏞️ Your territory misses you. A quick walk will keep it strong.",
      "🛡️ Your territory has lost 15% strength today. Time to defend it!",
      "🔥 You are on a 7-day streak. Keep it alive today!",
      "🏃 Only 500 steps left to complete today's walking challenge.",
      "👑 Opponent Alpha Runner is catching up. Secure your border now!"
    ];

    const randomNotif = notifications[Math.floor(Math.random() * notifications.length)];
    showGuardianNotification("🛡️ Territory Guardian", randomNotif);
  });

  closeBtn.addEventListener("click", () => {
    document.getElementById("notification-banner").classList.add("hidden");
  });
}

function showGuardianNotification(title, text) {
  const banner = document.getElementById("notification-banner");
  banner.querySelector(".notif-title").innerText = title;
  banner.querySelector(".notif-body").innerText = text;
  
  banner.classList.remove("hidden");
  sounds.playTone(440, 'sine', 0.25);

  setTimeout(() => {
    banner.classList.add("hidden");
  }, 6000);
}

function showToast(title, body) {
  showGuardianNotification(title, body);
}

// --- Territory Decay Simulation Logic ---
function fastForwardTime(days) {
  sounds.playClick();
  
  let userTerritories = appState.territories.filter(t => t.owner === 'user');
  if (userTerritories.length === 0) {
    showToast("⚠️ No Territories", "You do not own any territories to decay!");
    return;
  }

  let warningAlertTriggered = false;
  let lostAlertTriggered = false;

  userTerritories.forEach(terr => {
    // 15% decay per day Skips
    const decayAmount = days * 15;
    const oldStrength = terr.strength;
    terr.strength = Math.max(0, terr.strength - decayAmount);

    if (terr.strength === 0 && oldStrength > 0) {
      terr.owner = 'neutral'; // Reverted to neutral
      const lostArea = terr.area || 12000;
      appState.user.totalCapturedArea = Math.max(0, appState.user.totalCapturedArea - lostArea);
      lostAlertTriggered = true;
      showToast("❌ Territory Lost!", `"${terr.name}" decayed to 0% and was lost to neutral space!`);
    } else if (terr.strength <= 30 && oldStrength > 30) {
      warningAlertTriggered = true;
    }
  });

  if (lostAlertTriggered) {
    sounds.playAlert();
  } else if (warningAlertTriggered) {
    sounds.playTone(200, 'sawtooth', 0.4);
    showGuardianNotification("🛡️ Critical Decay Alert!", "One or more territories are below 30% strength! Revisit them to defend.");
  } else {
    showToast("⏳ Time Skips Forward", `Fast-forwarded ${days} day(s). Territories lost strength.`);
  }

  saveState();
  renderTerritories();
  syncStatsUI();
}

function renderDecayDashboard() {
  // Helper to build decay cards into a given container+badge pair
  function renderIntoContainer(containerId, badgeId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

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
      let healthClass = "healthy";
      let pctClass = "healthy";
      let icon = "🟢";

      if (terr.strength <= 15) {
        healthClass = "critical";
        pctClass = "critical";
        icon = "🚨";
      } else if (terr.strength <= 44) {
        healthClass = "fading";
        pctClass = "fading";
        icon = "⚠️";
      } else if (terr.strength <= 74) {
        healthClass = "stable";
        pctClass = "stable";
        icon = "🟡";
      }

      const card = document.createElement("div");
      card.className = `decay-card ${terr.strength <= 15 ? 'danger-state' : ''}`;
      card.innerHTML = `
        <div class="decay-icon">${icon}</div>
        <div class="decay-info-block">
          <div class="decay-row-top">
            <span class="decay-card-title">${terr.name}</span>
            <span class="decay-pct ${pctClass}">${terr.strength}%</span>
          </div>
          <div class="decay-area-label">${(terr.area || 12000).toLocaleString()} m²</div>
          <div class="decay-progress-track">
            <div class="decay-progress-bar ${healthClass}" style="width: ${terr.strength}%"></div>
          </div>
        </div>
        <button class="btn btn-outline decay-defend-btn" onclick="revisitTerritory('${terr.id}')">
          🛡️ Defend
        </button>
      `;
      container.appendChild(card);
    });
  }

  // Render into the Defense Center screen container
  renderIntoContainer("decay-list-container", "decay-count-badge");

  // Render into the Decay Watch screen container
  renderIntoContainer("decay-list-container-2", "decay-count-badge-2");

  // Update summary stat pills on the Decay Watch screen
  const userTerrs = appState.territories.filter(t => t.owner === 'user');
  const healthy  = userTerrs.filter(t => t.strength > 74).length;
  const fading   = userTerrs.filter(t => t.strength > 15 && t.strength <= 74).length;
  const critical = userTerrs.filter(t => t.strength <= 15).length;

  const totalEl    = document.getElementById("decay-total-count");
  const healthyEl  = document.getElementById("decay-healthy-count");
  const fadingEl   = document.getElementById("decay-fading-count");
  const criticalEl = document.getElementById("decay-critical-count");

  if (totalEl)    totalEl.innerText    = userTerrs.length;
  if (healthyEl)  healthyEl.innerText  = healthy;
  if (fadingEl)   fadingEl.innerText   = fading;
  if (criticalEl) criticalEl.innerText = critical;
}


function renderZarssTable() {
  const container = document.getElementById("dashboard-table-list");
  if (!container) return;
  container.innerHTML = "";

  // Combine user territories + mock competitor items to create a rich log history
  const userTerritories = appState.territories.filter(t => t.owner === 'user');
  
  const items = [];

  // 1. User territories
  userTerritories.forEach(terr => {
    let chipClass = "completed";
    let chipText = "Healthy";
    if (terr.strength < 45) {
      chipClass = "fading";
      chipText = "Fading";
    }
    
    let avatarContent = appState.user.avatar;
    let avatarStyle = "";
    if (appState.user.avatarImage) {
      avatarStyle = `background-image: url(${appState.user.avatarImage});`;
      avatarContent = "";
    }

    items.push({
      name: `You (${terr.name})`,
      value: `${(terr.area || 12000).toLocaleString()} m²`,
      chipClass: chipClass,
      chipText: chipText,
      avatarContent: avatarContent,
      avatarStyle: avatarStyle,
      timestamp: Date.now() - (terr.strength < 45 ? 86400000 : 3600000) // dynamic dates
    });
  });

  // 2. Competitors mock logs matching the mockup
  items.push({
    name: "David Astee (AI)",
    value: "14,560 m²",
    chipClass: "chargeback",
    chipText: "Captured",
    avatarContent: "🦁",
    avatarStyle: "",
    timestamp: Date.now() - 7200000
  });

  items.push({
    name: "Maria Hulama (AI)",
    value: "42,430 m²",
    chipClass: "completed",
    chipText: "Healthy",
    avatarContent: "🦉",
    avatarStyle: "",
    timestamp: Date.now() - 14400000
  });

  items.push({
    name: "Arnold Swarz (AI)",
    value: "3,412 m²",
    chipClass: "completed",
    chipText: "Healthy",
    avatarContent: "⚡",
    avatarStyle: "",
    timestamp: Date.now() - 28800000
  });

  // Sort logs by timestamp desc
  items.sort((a, b) => b.timestamp - a.timestamp);

  // Render logs
  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "zarss-table-row";
    
    // Format date in Zarss mockup format: "11 Sep 2022" or active date
    const dateObj = new Date(item.timestamp);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateStr = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    row.innerHTML = `
      <div class="ztr-left">
        <div class="ztr-avatar" style="${item.avatarStyle}">${item.avatarContent}</div>
        <div class="ztr-info">
          <span class="ztr-name">${item.name}</span>
        </div>
      </div>
      <div class="ztr-value">${item.value}</div>
      <div class="ztr-right">
        <span class="ztr-chip ${item.chipClass}">${item.chipText}</span>
        <span class="ztr-date">${dateStr}</span>
      </div>
    `;
    container.appendChild(row);
  });
}

function initZarssChart() {
  const chartColumns = document.querySelectorAll(".zarss-bar-graph .chart-col-track");
  
  // Weekly default mock area values (matching Wednesday's $33,567 / 33.5k m²)
  const dailyValues = {
    mon: { pct: 40, val: "16,240 m²" },
    tue: { pct: 65, val: "24,575 m²" },
    wed: { pct: 82, val: "33,567 m²" },
    thu: { pct: 30, val: "10,120 m²" },
    fri: { pct: 55, val: "18,450 m²" },
    sat: { pct: 75, val: "29,800 m²" },
    sun: { pct: 15, val: "0 m²" } // Will be updated dynamically for Sunday/today
  };

  // Initialize bar heights
  chartColumns.forEach(col => {
    const barFill = col.querySelector(".chart-bar-fill");
    const container = col.querySelector(".chart-bar-container");
    const dayLabel = col.querySelector(".chart-day-label").innerText.toLowerCase();
    
    // Add tooltip element if not present
    let tooltip = container.querySelector(".chart-tooltip-bubble");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "chart-tooltip-bubble";
      container.appendChild(tooltip);
    }

    // Set values based on day
    let pct = dailyValues[dayLabel]?.pct || 0;
    let val = dailyValues[dayLabel]?.val || "0 m²";

    if (dayLabel === "sun") {
      // sun is today/live
      pct = Math.min(100, appState.user.healthScore);
      val = `${appState.user.totalCapturedArea.toLocaleString()} m²`;
    }

    tooltip.innerText = val;
    barFill.style.height = `${pct}%`;

    // Click handler to select and slide tooltip
    col.addEventListener("click", () => {
      sounds.playClick();
      
      // Remove active-day class from all containers
      document.querySelectorAll(".zarss-bar-graph .chart-bar-container").forEach(c => {
        c.classList.remove("active-day");
      });
      
      // Add to this one
      container.classList.add("active-day");
    });
  });
}

function initTimeMachine() {
  // Defense Center buttons
  document.getElementById("tm-add-1d").addEventListener("click", () => fastForwardTime(1));
  document.getElementById("tm-add-3d").addEventListener("click", () => fastForwardTime(3));
  document.getElementById("tm-add-7d").addEventListener("click", () => fastForwardTime(7));
  // Decay Watch screen buttons
  document.getElementById("tm2-add-1d").addEventListener("click", () => fastForwardTime(1));
  document.getElementById("tm2-add-3d").addEventListener("click", () => fastForwardTime(3));
  document.getElementById("tm2-add-7d").addEventListener("click", () => fastForwardTime(7));
}

// --- Interface Synchronizer ---
function syncStatsUI() {
  const user = appState.user;
  
  // Name updates
  document.getElementById("header-username").innerText = user.username;
  document.getElementById("welcome-name").innerText = user.username;
  
  const sidebarUsername = document.getElementById("sidebar-username-txt");
  if (sidebarUsername) {
    sidebarUsername.innerText = user.username;
  }
  
  const nameBox = document.getElementById("profile-username-textbox");
  if (nameBox) {
    nameBox.value = user.username;
  }

  // Set Profile Avatars and crop images
  const headerAvatar = document.getElementById("header-avatar");
  const profileAvatar = document.getElementById("profile-avatar-emoji");
  const sidebarAvatar = document.getElementById("sidebar-avatar-img");
  
  if (user.avatarImage) {
    headerAvatar.style.backgroundImage = `url(${user.avatarImage})`;
    headerAvatar.classList.add("has-image");
    
    profileAvatar.style.backgroundImage = `url(${user.avatarImage})`;
    profileAvatar.classList.add("has-image");

    if (sidebarAvatar) {
      sidebarAvatar.style.backgroundImage = `url(${user.avatarImage})`;
      sidebarAvatar.classList.add("has-image");
      sidebarAvatar.innerText = "";
    }
  } else {
    headerAvatar.style.backgroundImage = "none";
    headerAvatar.classList.remove("has-image");
    headerAvatar.innerText = user.avatar;
    
    profileAvatar.style.backgroundImage = "none";
    profileAvatar.classList.remove("has-image");
    profileAvatar.innerText = user.avatar;

    if (sidebarAvatar) {
      sidebarAvatar.style.backgroundImage = "none";
      sidebarAvatar.classList.remove("has-image");
      sidebarAvatar.innerText = user.avatar;
    }
  }

  // Level markers
  document.getElementById("header-level").innerText = user.level;
  document.getElementById("header-streak").innerText = user.streak;
  document.getElementById("header-xp-current").innerText = user.xp;
  document.getElementById("header-xp-max").innerText = user.xpMax;
  
  const xpPercent = (user.xp / user.xpMax) * 100;
  document.getElementById("header-xp-bar").style.width = `${xpPercent}%`;
  
  const rankTitle = getRankTitle(user.level);
  document.getElementById("header-rank-title").innerText = rankTitle;

  document.getElementById("dashboard-health-score").innerText = `${user.healthScore}/100`;
  document.getElementById("dashboard-territory-size").innerText = `${user.totalCapturedArea.toLocaleString()} m²`;
  
  const healthRing = document.getElementById("health-ring-fill");
  const offset = 251.2 - (251.2 * user.healthScore) / 100;
  healthRing.style.strokeDashoffset = offset;

  document.getElementById("stat-territory-size").innerText = `${user.totalCapturedArea.toLocaleString()} m²`;
  
  let avgStrength = 0;
  let userTerritories = appState.territories.filter(t => t.owner === "user");
  if (userTerritories.length > 0) {
    const totalStrength = userTerritories.reduce((sum, curr) => sum + curr.strength, 0);
    avgStrength = Math.round(totalStrength / userTerritories.length);
  }
  document.getElementById("stat-territory-strength").innerText = `${avgStrength}%`;
  document.getElementById("stat-streak-val").innerText = `${user.streak} Days`;

  // Profile Elements
  document.getElementById("profile-level-badge").innerText = `Level ${user.level} ${rankTitle}`;
  document.getElementById("profile-total-captured").innerText = `${user.totalCapturedArea.toLocaleString()} m²`;
  document.getElementById("profile-max-streak").innerText = `${user.longestStreak} Days`;

  const chartToday = document.getElementById("chart-today-bar");
  if (chartToday) {
    chartToday.style.height = `${user.healthScore}%`;
  }
  
  // Redraw Territory decay dashboard list
  renderDecayDashboard();
  
  // Redraw Zarss activity table feed
  renderZarssTable();
}

// Customizable Profile actions
function initProfileActions() {
  const textbox = document.getElementById("profile-username-textbox");
  const photoInput = document.getElementById("profile-photo-upload-input");

  // Edit Username inline
  textbox.addEventListener("input", (e) => {
    const name = e.target.value.trim();
    if (name) {
      appState.user.username = name;
      
      // Update in leaderboard database
      const userRank = appState.leaderboard.find(l => l.isUser);
      if (userRank) userRank.name = name;

      saveState();
      
      // Update UI displays (header, dashboard greetings)
      document.getElementById("header-username").innerText = name;
      document.getElementById("welcome-name").innerText = name;
    }
  });

  // Custom Profile Image Upload
  photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      compressAndReadPhoto(file, (base64) => {
        appState.user.avatarImage = base64;
        
        // Update user map marker and avatar circles
        updateMapUserMarker();
        saveState();
        syncStatsUI();
        renderLeaderboard();
        
        showToast("🖼️ Profile Updated", "Your new custom photo has been applied successfully!");
      });
    }
  });

  document.getElementById("btn-reset-data").addEventListener("click", () => {
    if (confirm("Are you sure you want to reset all app progress and territories?")) {
      sounds.playClick();
      
      // Wipe profile back to Level 1 Beginner (true clean slate)
      appState.user = {
        username: "",
        level: 1,
        xp: 0,
        xpMax: 1000,
        streak: 0,
        healthScore: 0,
        longestStreak: 0,
        avatar: "🏃‍♂️",
        avatarImage: "",
        isLoggedIn: false,
        totalCapturedArea: 0
      };

      // Wipe all user territories, keeping only the starting zones (neutral, AI rivals)
      appState.territories = appState.territories.filter(t => t.owner !== 'user');
      
      // Reset all challenges/badges
      appState.challenges.forEach(c => {
        c.progress = 0;
        c.completed = false;
      });
      appState.badges.forEach(b => {
        b.unlocked = false;
      });

      saveState();
      
      // Force user back to authentication portal
      document.getElementById("main-app").classList.add("hidden");
      document.getElementById("auth-screen").classList.remove("hidden");
      
      // Sync UI and redraw map layers
      updateMapUserMarker();
      syncStatsUI();
      renderMissions();
      renderLeaderboard();
      renderTerritories();
      
      showToast("🗑️ Data Reset", "Reverted database to a clean Level 1 profile.");
    }
  });

  document.getElementById("btn-randomize-territories").addEventListener("click", () => {
    sounds.playClick();
    const center = userPos;
    const colors = ['alpha', 'beta'];

    for (let i = 0; i < 3; i++) {
      const owner = colors[Math.floor(Math.random() * colors.length)];
      const ox = (Math.random() - 0.5) * 0.003;
      const oy = (Math.random() - 0.5) * 0.003;
      const newPt = [
        [center[0] + ox - 0.0003, center[1] + oy - 0.0004],
        [center[0] + ox + 0.0003, center[1] + oy - 0.0004],
        [center[0] + ox + 0.0003, center[1] + oy + 0.0004],
        [center[0] + ox - 0.0003, center[1] + oy + 0.0004]
      ];

      appState.territories.push({
        id: `spawn-ai-${Date.now()}-${i}`,
        owner: owner,
        name: `Spawn Sector ${i+1}`,
        strength: 50 + Math.floor(Math.random() * 50),
        points: newPt
      });
    }

    renderTerritories();
    saveState();
    showToast("🎲 Territories Spawned!", "Created rival zones nearby. Defend your turf!");
  });

  // Emojis selector list
  const avatarOpts = document.querySelectorAll("#profile-emoji-selectors .avatar-opt");
  avatarOpts.forEach(opt => {
    opt.addEventListener("click", () => {
      sounds.playClick();
      avatarOpts.forEach(o => o.classList.remove("active"));
      opt.classList.add("active");
      
      const emoji = opt.dataset.emoji;
      appState.user.avatar = emoji;
      appState.user.avatarImage = ""; // Clear uploaded image if emoji selected
      
      updateMapUserMarker();
      saveState();
      syncStatsUI();
      renderLeaderboard();
    });
  });
}

// --- Initialization triggers ---
document.addEventListener("DOMContentLoaded", () => {
  loadState();

  // Handle Level Up close
  document.getElementById("modal-close-btn").addEventListener("click", () => {
    sounds.playClick();
    document.getElementById("level-up-modal").classList.add("hidden");
  });

  // Start activity dashboard CTA button
  document.getElementById("home-start-btn").addEventListener("click", () => {
    sounds.playClick();
    const mapTab = document.querySelector('.nav-tab[data-screen="map"]');
    if (mapTab) mapTab.click();
    setTimeout(() => {
      document.getElementById("tracker-start-btn").click();
    }, 300);
  });

  // ── Day / Night Mode Toggle ──────────────────────────────────────────────
  const themeBtn = document.getElementById("theme-toggle-btn");
  const themeIcon = themeBtn.querySelector("i");
  let isDayMode = localStorage.getItem("my_territory_theme") === "day";

  // Apply saved theme on page load
  function applyTheme(isDay) {
    document.body.classList.toggle("day-mode", isDay);
    themeBtn.classList.toggle("active", isDay);
    themeIcon.className = isDay ? "fa-solid fa-sun" : "fa-solid fa-moon";
    themeBtn.title = isDay ? "Switch to Night Mode" : "Switch to Day Mode";
  }

  applyTheme(isDayMode);

  themeBtn.addEventListener("click", () => {
    isDayMode = !isDayMode;
    applyTheme(isDayMode);
    localStorage.setItem("my_territory_theme", isDayMode ? "day" : "night");
    sounds.playClick();
  });

  // ── Mobile / Laptop View Toggle ──────────────────────────────────────────
  const viewBtn  = document.getElementById("view-toggle-btn");
  const viewIcon = viewBtn.querySelector("i");
  let isLaptopView = false;

  // Wire laptop-sidebar items to navigate like bottom-nav buttons do
  document.querySelectorAll("#laptop-sidebar-nav .ls-item").forEach(item => {
    item.addEventListener("click", () => {
      const target = item.dataset.screen;
      if (!target) return;
      // Navigate using the existing navigation system
      const existingNavBtn = document.querySelector(`.bottom-nav-btn[data-screen="${target}"], .menu-item[data-screen="${target}"]`);
      if (existingNavBtn) existingNavBtn.click();
      // Highlight active sidebar item
      document.querySelectorAll("#laptop-sidebar-nav .ls-item").forEach(el => el.classList.remove("active"));
      item.classList.add("active");
    });
  });

  viewBtn.addEventListener("click", () => {
    isLaptopView = !isLaptopView;
    document.body.classList.toggle("laptop-view", isLaptopView);
    viewBtn.classList.toggle("active", isLaptopView);
    viewIcon.className = isLaptopView ? "fa-solid fa-laptop" : "fa-solid fa-mobile-screen";
    viewBtn.title = isLaptopView ? "Switch to Mobile View" : "Switch to Laptop View";
    sounds.playClick();
  });



  // Renders
  renderMissions();
  renderLeaderboard();

  // Initialise
  initNavigation();
  initMap();
  initCoachChat();
  initNotificationSimulator();
  initProfileActions();
  initChallengesFilter();
  initAuth();
  initTimeMachine();
  initZarssChart();

  // Run Splash loading
  let width = 0;
  const fill = document.getElementById("splash-progress");
  const splashTimer = setInterval(() => {
    width += 5;
    fill.style.width = width + "%";
    if (width >= 100) {
      clearInterval(splashTimer);
      document.getElementById("splash-screen").classList.add("hidden");
      
      // Auth routing check
      if (appState.user.isLoggedIn) {
        document.getElementById("main-app").classList.remove("hidden");
        syncStatsUI();
        sounds.playTone(400, 'sine', 0.2);
      } else {
        document.getElementById("auth-screen").classList.remove("hidden");
      }
    }
  }, 60);
});
