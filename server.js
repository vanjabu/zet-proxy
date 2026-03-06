<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZET Tracker – Zagreb u pokretu</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>

<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, sendEmailVerification, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
  import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAD-q4EZj80uPg6CefCEC7qZrZByrwRdBE",
    authDomain: "zet-tracker.firebaseapp.com",
    projectId: "zet-tracker",
    storageBucket: "zet-tracker.firebasestorage.app",
    messagingSenderId: "280987693637",
    appId: "1:280987693637:web:3d6330159faa41a11ce92c"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const googleProvider = new GoogleAuthProvider();

  window._firebase = { auth, db, googleProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, sendEmailVerification, updateProfile, doc, setDoc, getDoc, serverTimestamp };

  onAuthStateChanged(auth, (user) => {
    if (user) window.setUser({ name: user.displayName || user.email.split('@')[0], email: user.email, uid: user.uid });
    else window.setUser(null);
  });
</script>

<style>
:root {
  --bg: #f5f4f1; --surface: #fff; --surface2: #f0ede8; --border: #e2ddd6;
  --text: #1a1816; --text2: #6b6560; --text3: #a09a94;
  --accent: #1a3faa; --accent-light: #e8edfc;
  --tram: #1a3faa; --bus: #2a9d5c;
  --red: #e63946; --green: #2a9d5c; --orange: #f4a261;
  --radius: 14px; --radius-sm: 8px;
  --shadow: 0 2px 16px rgba(0,0,0,0.08); --shadow-lg: 0 8px 40px rgba(0,0,0,0.12);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); height: 100dvh; overflow: hidden; display: flex; flex-direction: column; }

/* TOPBAR */
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; height: 60px; background: var(--surface); border-bottom: 1px solid var(--border); z-index: 1000; flex-shrink: 0; }
.logo { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 17px; letter-spacing: -0.3px; }
.logo-icon { width: 32px; height: 32px; background: var(--accent); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; }
.topbar-right { display: flex; align-items: center; gap: 10px; }
.lang-btn { font-family: 'DM Mono', monospace; font-size: 12px; padding: 5px 10px; border: 1px solid var(--border); border-radius: 6px; background: none; color: var(--text2); cursor: pointer; transition: all 0.2s; }
.lang-btn:hover { background: var(--surface2); }

/* BUTTONS */
.btn { padding: 8px 18px; border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.18s; border: none; }
.btn-outline { background: none; border: 1px solid var(--border); color: var(--text); }
.btn-outline:hover { background: var(--surface2); }
.btn-primary { background: var(--accent); color: white; }
.btn-primary:hover { background: #152f85; }
.btn-sm { padding: 6px 14px; font-size: 13px; }
.btn-danger { background: var(--red); color: white; }

/* MAIN */
.main { display: flex; flex: 1; overflow: hidden; }
#map { flex: 1; z-index: 1; }

/* PANEL */
.panel { width: 380px; background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
.panel-tabs { display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.tab { flex: 1; padding: 14px 0; text-align: center; font-size: 13px; font-weight: 500; color: var(--text2); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.18s; }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab:hover:not(.active) { background: var(--surface2); }
.panel-content { flex: 1; overflow-y: auto; }
.tab-panel { display: none; padding: 16px; }
.tab-panel.active { display: block; }

/* FILTER BAR */
.filter-bar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
.filter-input { flex: 1; min-width: 120px; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 13px; background: var(--surface2); }
.filter-input:focus { outline: none; border-color: var(--accent); background: white; }
.filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--surface2); color: var(--text2); transition: all 0.15s; white-space: nowrap; }
.chip.active { background: var(--accent); color: white; border-color: var(--accent); }
.chip.tram-chip.active { background: var(--tram); border-color: var(--tram); }
.chip.bus-chip.active { background: var(--bus); border-color: var(--bus); }

/* LIVE */
.live-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.live-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--green); font-weight: 500; }
.pulse { width: 8px; height: 8px; background: var(--green); border-radius: 50%; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.3); } }
.section-title { font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text3); }
.vehicle-count { font-size: 11px; color: var(--text3); font-family: 'DM Mono', monospace; }

.vehicle-list { display: flex; flex-direction: column; gap: 6px; }
.vehicle-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--surface2); border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
.vehicle-card:hover, .vehicle-card.selected { border-color: var(--accent); background: var(--accent-light); }
.vehicle-badge { width: 38px; height: 38px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: white; flex-shrink: 0; }
.vehicle-badge.tram { background: var(--tram); }
.vehicle-badge.bus { background: var(--bus); }
.vehicle-info { flex: 1; min-width: 0; }
.vehicle-route { font-weight: 600; font-size: 13px; }
.vehicle-dest { font-size: 11px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vehicle-status { font-family: 'DM Mono', monospace; font-size: 11px; flex-shrink: 0; }

/* VEHICLE DETAIL */
.vehicle-detail { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 14px; }
.detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.detail-badge { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 18px; font-weight: 600; color: white; }
.detail-badge.tram { background: var(--tram); }
.detail-badge.bus { background: var(--bus); }
.detail-title { font-size: 18px; font-weight: 600; }
.detail-sub { font-size: 13px; color: var(--text2); }
.detail-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.stat-box { background: var(--surface2); border-radius: 8px; padding: 10px; text-align: center; }
.stat-val { font-family: 'DM Mono', monospace; font-size: 16px; font-weight: 500; color: var(--accent); }
.stat-lbl { font-size: 10px; color: var(--text3); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.3px; }
.close-detail { background: var(--surface2); border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; color: var(--text2); margin-top: 4px; }
.close-detail:hover { background: var(--border); }

/* JOURNEY */
.journey-locked { text-align: center; padding: 40px 16px; }
.lock-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.4; }
.journey-form { display: flex; flex-direction: column; gap: 10px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-label { font-size: 11px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px; }
.form-input { padding: 10px 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 14px; background: var(--surface); color: var(--text); transition: border-color 0.18s; }
.form-input:focus { outline: none; border-color: var(--accent); }
.location-btn { display: flex; align-items: center; gap: 8px; padding: 10px 13px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface2); font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--accent); cursor: pointer; font-weight: 500; transition: all 0.18s; }
.location-btn:hover { background: var(--accent-light); border-color: var(--accent); }

/* URGENCY */
.urgency-card { border-radius: var(--radius); padding: 16px; margin-bottom: 14px; text-align: center; transition: all 0.5s; }
.urgency-card.green { background: linear-gradient(135deg,#d4f4e2,#edfaf3); border: 1px solid #2a9d5c33; }
.urgency-card.blue { background: linear-gradient(135deg,#e0e8ff,#eef2ff); border: 1px solid #1a3faa33; }
.urgency-card.red { background: linear-gradient(135deg,#ffe0e2,#fff0f1); border: 1px solid #e6394633; animation: urgentPulse 0.8s ease infinite alternate; }
@keyframes urgentPulse { from { box-shadow: 0 0 0 0 rgba(230,57,70,0.1); } to { box-shadow: 0 0 20px 4px rgba(230,57,70,0.15); } }
.urgency-arrow { font-size: 44px; line-height: 1; margin-bottom: 6px; }
.urgency-label { font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
.urgency-card.green .urgency-label { color: var(--green); }
.urgency-card.blue .urgency-label { color: var(--accent); }
.urgency-card.red .urgency-label { color: var(--red); }
.urgency-detail { font-size: 12px; color: var(--text2); margin-top: 4px; }

/* ROUTE RESULT */
.route-result { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
.route-summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; padding: 12px; background: var(--accent-light); border-radius: var(--radius-sm); border: 1px solid rgba(26,63,170,0.15); margin-bottom: 4px; }
.summary-item { display: flex; flex-direction: column; gap: 2px; text-align: center; }
.summary-val { font-family: 'DM Mono', monospace; font-size: 16px; font-weight: 500; color: var(--accent); }
.summary-lbl { font-size: 10px; color: var(--text3); }
.route-step { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: var(--surface2); border-radius: var(--radius-sm); border-left: 3px solid transparent; }
.route-step.walk { border-left-color: var(--text3); }
.route-step.tram { border-left-color: var(--tram); }
.route-step.bus { border-left-color: var(--bus); }
.route-step.arrive { border-left-color: var(--green); }
.step-icon { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
.step-main { flex: 1; }
.step-title { font-size: 13px; font-weight: 600; }
.step-detail { font-size: 11px; color: var(--text2); margin-top: 2px; }
.step-time { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text3); flex-shrink: 0; }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 9000; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.25s; }
.modal-overlay.open { opacity: 1; pointer-events: all; }
.modal { background: var(--surface); border-radius: 20px; padding: 32px; width: 420px; max-width: calc(100vw - 40px); box-shadow: var(--shadow-lg); transform: translateY(20px); transition: transform 0.25s; position: relative; }
.modal-overlay.open .modal { transform: translateY(0); }
.modal-title { font-size: 22px; font-weight: 600; letter-spacing: -0.5px; margin-bottom: 6px; }
.modal-sub { font-size: 14px; color: var(--text2); margin-bottom: 24px; }
.modal-tabs { display: flex; background: var(--surface2); border-radius: var(--radius-sm); padding: 3px; margin-bottom: 24px; }
.modal-tab { flex: 1; padding: 8px; text-align: center; font-size: 13px; font-weight: 500; border-radius: 6px; cursor: pointer; color: var(--text2); transition: all 0.18s; }
.modal-tab.active { background: white; color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.modal-form { display: flex; flex-direction: column; gap: 12px; }
.divider { display: flex; align-items: center; gap: 12px; color: var(--text3); font-size: 12px; margin: 4px 0; }
.divider::before,.divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.google-btn { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 11px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.18s; color: var(--text); }
.google-btn:hover { background: var(--surface2); }
.modal-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border: none; background: var(--surface2); border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; color: var(--text2); }
.modal-close:hover { background: var(--border); }
.modal-note { font-size: 12px; color: var(--text3); text-align: center; margin-top: 8px; line-height: 1.5; }

/* MAP LEGEND */
.map-legend { position: absolute; bottom: 32px; left: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; z-index: 500; display: flex; flex-direction: column; gap: 6px; box-shadow: var(--shadow); }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text2); }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

/* USER */
.user-menu-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); color: white; border: none; cursor: pointer; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.user-menu-btn:hover { opacity: 0.85; }

/* TOAST */
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(80px); background: var(--text); color: white; padding: 12px 20px; border-radius: 100px; font-size: 13px; font-weight: 500; z-index: 9999; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); white-space: nowrap; box-shadow: var(--shadow-lg); }
.toast.show { transform: translateX(-50%) translateY(0); }

/* SKELETON */
.skeleton { background: linear-gradient(90deg,var(--surface2) 25%,var(--border) 50%,var(--surface2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; height: 56px; margin-bottom: 6px; }
@keyframes shimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }

/* RESPONSIVE */
@media (max-width:700px) {
  .panel { width: 100%; border-left: none; border-top: 1px solid var(--border); }
  .main { flex-direction: column; }
  #map { height: 45dvh; flex: none; }
  .panel { height: 55dvh; }
}
</style>
</head>
<body>

<!-- TOPBAR -->
<header class="topbar">
  <div class="logo">
    <div class="logo-icon">🚋</div>
    <span>ZET Tracker</span>
  </div>
  <div class="topbar-right">
    <button class="lang-btn" onclick="toggleLang()" id="langBtn">EN</button>
    <div id="authArea">
      <button class="btn btn-outline btn-sm" onclick="openModal('login')">Prijava</button>
      <button class="btn btn-primary btn-sm" onclick="openModal('register')">Registracija</button>
    </div>
    <div id="userArea" style="display:none">
      <button class="user-menu-btn" id="userInitials" onclick="handleLogout()">?</button>
    </div>
  </div>
</header>

<!-- MAIN -->
<div class="main">
  <div id="map">
    <div class="map-legend">
      <div class="legend-item"><div class="legend-dot" style="background:var(--tram)"></div><span id="leg-tram">Tramvaj</span></div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--bus)"></div><span id="leg-bus">Autobus</span></div>
      <div class="legend-item"><div class="legend-dot" style="background:#1a3faa;border:2px solid white;box-shadow:0 0 0 3px rgba(26,63,170,0.3)"></div><span id="leg-you">Vi ste ovdje</span></div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-tabs">
      <div class="tab active" onclick="switchTab('live')" id="tab-live">🔴 Uživo</div>
      <div class="tab" onclick="switchTab('journey')" id="tab-journey">🗺 Ruta</div>
    </div>

    <div class="panel-content">

      <!-- LIVE TAB -->
      <div class="tab-panel active" id="panel-live">

        <!-- SELECTED VEHICLE DETAIL -->
        <div id="vehicleDetail" style="display:none"></div>

        <!-- FILTERS -->
        <div class="filter-bar">
          <input class="filter-input" type="text" id="lineSearch" placeholder="Pretraži liniju..." oninput="applyFilters()">
          <div class="filter-chips">
            <div class="chip tram-chip active" id="chip-tram" onclick="toggleChip('tram')">🚋 Tramvaji</div>
            <div class="chip bus-chip active" id="chip-bus" onclick="toggleChip('bus')">🚌 Autobusi</div>
          </div>
        </div>

        <div class="live-header">
          <span class="section-title" id="vehicleCountLabel">Vozila</span>
          <div class="live-badge"><div class="pulse"></div><span id="liveLabel">Podaci uživo</span></div>
        </div>

        <div class="vehicle-list" id="vehicleList">
          <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton" style="opacity:.6"></div>
        </div>
      </div>

      <!-- JOURNEY TAB -->
      <div class="tab-panel" id="panel-journey">
        <div class="journey-locked" id="journeyLocked">
          <div class="lock-icon">🔒</div>
          <h3 style="font-size:16px;font-weight:600;margin-bottom:8px" id="plannerTitle">Planer rute</h3>
          <p style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:20px" id="plannerDesc">Planiranje rute dostupno je registriranim korisnicima.</p>
          <button class="btn btn-primary" onclick="openModal('register')" id="registerFreeBtn">Registriraj se besplatno</button>
        </div>

        <div id="journeyUnlocked" style="display:none">
          <div class="urgency-card green" id="urgencyCard" style="display:none">
            <div class="urgency-arrow" id="urgencyArrow">↑</div>
            <div class="urgency-label" id="urgencyLabel">Možeš sporije</div>
            <div class="urgency-detail" id="urgencyDetail">Stići ćeš 3 min ranije</div>
          </div>

          <div class="journey-form">
            <div class="form-group">
              <label class="form-label" id="fromLabel">Polazište</label>
              <button class="location-btn" onclick="useMyLocation()" id="locationBtn">📍 <span id="myLocLabel">Moja lokacija</span></button>
            </div>
            <div class="form-group">
              <label class="form-label" id="toLabel">Odredište</label>
              <input class="form-input" type="text" id="destinationInput" placeholder="npr. Glavni kolodvor">
            </div>
            <button class="btn btn-primary" onclick="planRoute()" id="findRouteBtn">Pronađi rutu →</button>
          </div>

          <div class="route-result" id="routeResult" style="display:none"></div>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- AUTH MODAL -->
<div class="modal-overlay" id="authModal">
  <div class="modal">
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div class="modal-title">ZET Tracker</div>
    <div class="modal-sub" id="modalSub">Dobrodošli natrag!</div>
    <div class="modal-tabs">
      <div class="modal-tab active" id="mtab-login" onclick="switchModalTab('login')">Prijava</div>
      <div class="modal-tab" id="mtab-register" onclick="switchModalTab('register')">Registracija</div>
    </div>

    <div id="mform-login">
      <div class="modal-form">
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="loginEmail" placeholder="vas@email.com"></div>
        <div class="form-group"><label class="form-label">Lozinka</label><input class="form-input" type="password" id="loginPassword" placeholder="••••••••"></div>
        <button class="btn btn-primary" onclick="handleLogin()">Prijavi se</button>
        <div class="divider">ili</div>
        <button class="google-btn" onclick="handleGoogleLogin()">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Nastavi s Googleom
        </button>
      </div>
    </div>

    <div id="mform-register" style="display:none">
      <div class="modal-form">
        <div class="form-group"><label class="form-label">Ime i prezime</label><input class="form-input" type="text" id="regName" placeholder="Ivo Horvat"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="regEmail" placeholder="vas@email.com"></div>
        <div class="form-group"><label class="form-label">Lozinka</label><input class="form-input" type="password" id="regPassword" placeholder="min. 8 znakova"></div>
        <div style="font-size:12px;color:var(--text2);padding:10px 12px;background:var(--surface2);border-radius:8px;line-height:1.6">📍 Aplikacija će tražiti pristup lokaciji za izračun vremena hodanja do stanice.</div>
        <button class="btn btn-primary" onclick="handleRegister()">Kreiraj račun</button>
        <div class="divider">ili</div>
        <button class="google-btn" onclick="handleGoogleLogin()">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Nastavi s Googleom
        </button>
        <p class="modal-note">Registracijom prihvaćaš uvjete korištenja i politiku privatnosti.</p>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
// ═══════════════════════════════════════════════
// I18N
// ═══════════════════════════════════════════════
let lang = 'hr';
const i18n = {
  hr: { tram:'Tramvaj', bus:'Autobus', youAreHere:'Vi ste ovdje', liveData:'Podaci uživo', vehicles:'vozila', searchLine:'Pretraži liniju...', plannerTitle:'Planer rute', plannerDesc:'Planiranje rute dostupno je registriranim korisnicima. Prijavite se za pristup GPS navođenju.', registerFree:'Registriraj se besplatno', from:'Polazište', to:'Odredište', myLocation:'Moja lokacija', findRoute:'Pronađi rutu →', urgGreen:'Možeš sporije', urgBlue:'Nastavi hodati', urgRed:'Požuri! 🏃', walk:'Hod', arrive:'Dolazak', min:'min', transfer:'Presjedanje', totalTime:'Ukupno', walking:'Hod', transfers:'Presj.', onTime:'Na vrijeme', ahead:'Ispred', delay:'kašnjenje', speed:'brzina', route:'linija', close:'Zatvori', welcomeBack:'Dobrodošli natrag!', createAccount:'Kreiraj besplatan račun.' },
  en: { tram:'Tram', bus:'Bus', youAreHere:'You are here', liveData:'Live data', vehicles:'vehicles', searchLine:'Search line...', plannerTitle:'Journey Planner', plannerDesc:'Journey planning is available to registered users. Log in to access GPS navigation.', registerFree:'Register for free', from:'From', to:'To', myLocation:'My location', findRoute:'Find route →', urgGreen:'You can slow down', urgBlue:'Keep walking', urgRed:'Hurry up! 🏃', walk:'Walk', arrive:'Arrive', min:'min', transfer:'Transfer', totalTime:'Total', walking:'Walk', transfers:'Trans.', onTime:'On time', ahead:'Ahead', delay:'delay', speed:'speed', route:'line', close:'Close', welcomeBack:'Welcome back!', createAccount:'Create your free account.' }
};
const t = k => i18n[lang][k] || k;

function applyTranslations() {
  document.getElementById('leg-tram').textContent = t('tram');
  document.getElementById('leg-bus').textContent = t('bus');
  document.getElementById('leg-you').textContent = t('youAreHere');
  document.getElementById('liveLabel').textContent = t('liveData');
  document.getElementById('plannerTitle').textContent = t('plannerTitle');
  document.getElementById('plannerDesc').textContent = t('plannerDesc');
  document.getElementById('registerFreeBtn').textContent = t('registerFree');
  document.getElementById('fromLabel').textContent = t('from');
  document.getElementById('toLabel').textContent = t('to');
  document.getElementById('myLocLabel').textContent = t('myLocation');
  document.getElementById('findRouteBtn').textContent = t('findRoute');
  document.getElementById('lineSearch').placeholder = t('searchLine');
  renderVehicleList();
}

function toggleLang() {
  lang = lang === 'hr' ? 'en' : 'hr';
  document.getElementById('langBtn').textContent = lang === 'hr' ? 'EN' : 'HR';
  document.documentElement.lang = lang;
  applyTranslations();
}

// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════
let currentUser = null;
let userLocation = null;

window.setUser = function(user) {
  currentUser = user;
  if (user) {
    document.getElementById('authArea').style.display = 'none';
    document.getElementById('userArea').style.display = 'flex';
    const initials = (user.name||'?').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('userInitials').textContent = initials;
    document.getElementById('userInitials').title = user.email + ' (klikni za odjavu)';
    document.getElementById('journeyLocked').style.display = 'none';
    document.getElementById('journeyUnlocked').style.display = 'block';
    requestLocation();
  } else {
    document.getElementById('authArea').style.display = 'flex';
    document.getElementById('userArea').style.display = 'none';
    document.getElementById('journeyLocked').style.display = 'block';
    document.getElementById('journeyUnlocked').style.display = 'none';
  }
};

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if (!email || !pw) { showToast('⚠️ Unesite email i lozinku'); return; }
  const fb = window._firebase;
  if (!fb) { showToast('⚠️ Firebase se učitava...'); return; }
  try {
    showToast('⏳ Prijava...');
    const cred = await fb.signInWithEmailAndPassword(fb.auth, email, pw);
    if (!cred.user.emailVerified) { showToast('⚠️ Verificirajte email!'); await fb.signOut(fb.auth); return; }
    closeModal(); showToast('✓ Prijavljeni ste!');
  } catch(e) {
    const msgs = {'auth/user-not-found':'Email nije pronađen.','auth/wrong-password':'Pogrešna lozinka.','auth/invalid-credential':'Pogrešan email ili lozinka.','auth/too-many-requests':'Previše pokušaja.'};
    showToast('❌ ' + (msgs[e.code] || e.message));
  }
}

async function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pw = document.getElementById('regPassword').value;
  if (!name||!email||!pw) { showToast('⚠️ Ispunite sva polja'); return; }
  if (pw.length < 8) { showToast('⚠️ Min. 8 znakova'); return; }
  const fb = window._firebase;
  if (!fb) { showToast('⚠️ Firebase se učitava...'); return; }
  try {
    showToast('⏳ Kreiram račun...');
    const cred = await fb.createUserWithEmailAndPassword(fb.auth, email, pw);
    await fb.updateProfile(cred.user, {displayName: name});
    await fb.setDoc(fb.doc(fb.db,'users',cred.user.uid), {name, email, createdAt: fb.serverTimestamp(), plan:'free'});
    await fb.sendEmailVerification(cred.user);
    await fb.signOut(fb.auth);
    closeModal(); showToast('✓ Račun kreiran! Provjerite email.');
  } catch(e) {
    const msgs = {'auth/email-already-in-use':'Email već postoji.','auth/invalid-email':'Nevažeći email.','auth/weak-password':'Lozinka preslaba.'};
    showToast('❌ ' + (msgs[e.code] || e.message));
  }
}

async function handleGoogleLogin() {
  const fb = window._firebase;
  if (!fb) { showToast('⚠️ Firebase se učitava...'); return; }
  try {
    const result = await fb.signInWithPopup(fb.auth, fb.googleProvider);
    const user = result.user;
    const userRef = fb.doc(fb.db,'users',user.uid);
    const snap = await fb.getDoc(userRef);
    if (!snap.exists()) await fb.setDoc(userRef, {name:user.displayName, email:user.email, createdAt:fb.serverTimestamp(), plan:'free', provider:'google'});
    closeModal(); showToast('✓ Prijavljeni putem Googlea!');
  } catch(e) {
    if (e.code !== 'auth/popup-closed-by-user') showToast('❌ Google prijava nije uspjela.');
  }
}

async function handleLogout() {
  if (!confirm('Odjava?')) return;
  const fb = window._firebase;
  if (fb) await fb.signOut(fb.auth);
  userLocation = null;
  showToast('Odjavljeni ste');
  document.getElementById('routeResult').style.display = 'none';
  document.getElementById('urgencyCard').style.display = 'none';
  selectedVehicleId = null;
  document.getElementById('vehicleDetail').style.display = 'none';
}

// ═══════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════
let map;
const vehicleMarkers = {};
let userMarker = null;
let selectedVehicleId = null;

function makeIcon(type, line, selected) {
  const bg = type === 'tram' ? '#1a3faa' : '#2a9d5c';
  const emoji = type === 'tram' ? '🚋' : '🚌';
  const border = selected ? '3px solid #f4a261' : '2px solid white';
  const shadow = selected ? '0 2px 12px rgba(244,162,97,0.6)' : '0 2px 8px rgba(0,0,0,0.2)';
  const scale = selected ? 'scale(1.2)' : 'scale(1)';
  return L.divIcon({
    className: '',
    html: `<div style="background:${bg};color:white;border-radius:8px;padding:4px 7px;font-family:'DM Mono',monospace;font-size:11px;font-weight:600;box-shadow:${shadow};border:${border};white-space:nowrap;transform:${scale};transform-origin:center;transition:all 0.2s">${emoji} ${line}</div>`,
    iconAnchor: [22, 14]
  });
}

// ═══════════════════════════════════════════════
// VEHICLE DATA
// ═══════════════════════════════════════════════
const PROXY_URL = 'https://zet-proxy.onrender.com';

const ROUTE_INFO = {
  '1':{ type:'tram', from:'Zapadni kolodvor', to:'Borongaj' },
  '2':{ type:'tram', from:'Črnomerec', to:'Savišće' },
  '3':{ type:'tram', from:'Ljubljanica', to:'Savišće' },
  '4':{ type:'tram', from:'Savski most', to:'Dubec' },
  '5':{ type:'tram', from:'Prečko', to:'Maksimir' },
  '6':{ type:'tram', from:'Črnomerec', to:'Sopot' },
  '7':{ type:'tram', from:'Savski most', to:'Dubrava' },
  '8':{ type:'tram', from:'Mihaljevac', to:'Dragonožec' },
  '9':{ type:'tram', from:'Ljubljanica', to:'Borongaj' },
  '11':{ type:'tram', from:'Črnomerec', to:'Dubec' },
  '12':{ type:'tram', from:'Savski most', to:'Dubrava' },
  '13':{ type:'tram', from:'Kvaternikov trg', to:'Žitnjak' },
  '14':{ type:'tram', from:'Mihaljevac', to:'Zapruđe' },
  '17':{ type:'tram', from:'Prečko', to:'Borongaj' },
};

function getRouteInfo(routeId) {
  if (ROUTE_INFO[routeId]) return ROUTE_INFO[routeId];
  const num = parseInt(routeId);
  if (!isNaN(num) && num <= 20) return { type:'tram', from:'Zagreb', to:'—' };
  return { type:'bus', from:'Zagreb', to:'—' };
}

let allVehicles = [];
let filterTram = true;
let filterBus = true;

function getFilteredVehicles() {
  const q = document.getElementById('lineSearch').value.trim().toLowerCase();
  return allVehicles.filter(v => {
    if (v.type === 'tram' && !filterTram) return false;
    if (v.type === 'bus' && !filterBus) return false;
    if (q && !v.line.toLowerCase().includes(q) && !v.from.toLowerCase().includes(q) && !v.to.toLowerCase().includes(q)) return false;
    return true;
  });
}

function toggleChip(type) {
  if (type === 'tram') { filterTram = !filterTram; document.getElementById('chip-tram').classList.toggle('active', filterTram); }
  else { filterBus = !filterBus; document.getElementById('chip-bus').classList.toggle('active', filterBus); }
  applyFilters();
}

function applyFilters() {
  const filtered = getFilteredVehicles();
  // Show/hide markers
  allVehicles.forEach(v => {
    const marker = vehicleMarkers[v.id];
    if (!marker) return;
    const show = filtered.find(f => f.id === v.id);
    if (show) { if (!map.hasLayer(marker)) marker.addTo(map); }
    else { if (map.hasLayer(marker)) map.removeLayer(marker); }
  });
  renderVehicleList();
}

async function fetchVehicles() {
  try {
    const res = await fetch(`${PROXY_URL}/vehicles`);
    const data = await res.json();
    if (!data.vehicles || !data.vehicles.length) return false;

    allVehicles = data.vehicles
      .filter(v => v.lat && v.lng)
      .map(v => {
        const info = getRouteInfo(v.routeId);
        return { id:v.id, type:info.type, line:v.routeId||'?', from:info.from, to:info.to, lat:v.lat, lng:v.lng, bearing:v.bearing||0, speed:v.speed||0, nearStop:v.nearStop||null };
      });

    // Update markers
    allVehicles.forEach(v => {
      const selected = v.id === selectedVehicleId;
      const icon = makeIcon(v.type, v.line, selected);
      if (vehicleMarkers[v.id]) {
        vehicleMarkers[v.id].setLatLng([v.lat, v.lng]);
        vehicleMarkers[v.id].setIcon(icon);
      } else {
        const marker = L.marker([v.lat, v.lng], {icon})
          .addTo(map)
          .on('click', () => selectVehicle(v.id));
        vehicleMarkers[v.id] = marker;
      }
    });

    applyFilters();
    return true;
  } catch(e) {
    console.warn('Fetch error:', e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════
// VEHICLE SELECTION & DETAIL
// ═══════════════════════════════════════════════
let routeLayer = null;

function selectVehicle(id) {
  selectedVehicleId = id;
  const v = allVehicles.find(x => x.id === id);
  if (!v) return;

  // Update marker styles
  allVehicles.forEach(x => {
    if (vehicleMarkers[x.id]) vehicleMarkers[x.id].setIcon(makeIcon(x.type, x.line, x.id === id));
  });

  // Focus on map
  map.setView([v.lat, v.lng], 14);

  // Draw route on map
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  if (v.line && v.line !== '?') {
    fetch(`${PROXY_URL}/route/${v.line}?lat=${v.lat}&lng=${v.lng}`)
      .then(r => r.json())
      .then(data => {
        if (data.points && data.points.length > 0) {
          const color = v.type === 'tram' ? '#1a3faa' : '#2a9d5c';
          routeLayer = L.polyline(data.points, {
            color, weight: 4, opacity: 0.7, smoothFactor: 1
          }).addTo(map);
        }
      })
      .catch(() => {});
  }

  // Show detail panel
  const detail = document.getElementById('vehicleDetail');
  detail.style.display = 'block';
  detail.innerHTML = `
    <div class="vehicle-detail">
      <div class="detail-header">
        <div class="detail-badge ${v.type}">${v.line}</div>
        <div>
          <div class="detail-title">${v.type === 'tram' ? t('tram') : t('bus')} ${v.line}</div>
          <div class="detail-sub">${v.from} → ${v.to}</div>
        </div>
      </div>
      <div class="detail-stats">
        <div class="stat-box">
          <div class="stat-val">${v.speed || 0}</div>
          <div class="stat-lbl">km/h</div>
        </div>
        <div class="stat-box">
          <div class="stat-val" style="font-size:10px;color:var(--text2)">${v.nearStop ? v.nearStop.substring(0,10) : '—'}</div>
          <div class="stat-lbl">stanica</div>
        </div>
        <div class="stat-box">
          <div class="stat-val" style="color:var(--green);font-size:13px">✓</div>
          <div class="stat-lbl">uživo</div>
        </div>
      </div>
      <button class="close-detail" onclick="clearSelection()">✕ ${t('close')}</button>
    </div>`;

  switchTab('live');
  document.querySelector('.panel-content').scrollTop = 0;
  renderVehicleList();
}

function clearSelection() {
  selectedVehicleId = null;
  document.getElementById('vehicleDetail').style.display = 'none';
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  allVehicles.forEach(v => {
    if (vehicleMarkers[v.id]) vehicleMarkers[v.id].setIcon(makeIcon(v.type, v.line, false));
  });
  renderVehicleList();
}

// ═══════════════════════════════════════════════
// VEHICLE LIST
// ═══════════════════════════════════════════════
function renderVehicleList() {
  const list = document.getElementById('vehicleList');
  const filtered = getFilteredVehicles();

  document.getElementById('vehicleCountLabel').textContent = `${filtered.length} ${t('vehicles')}`;

  if (!filtered.length) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text2);font-size:13px">Nema vozila za odabrane filtre.</div>';
    return;
  }

  const sorted = [...filtered].sort((a,b) => {
    if (a.id === selectedVehicleId) return -1;
    if (b.id === selectedVehicleId) return 1;
    return a.line.localeCompare(b.line, undefined, {numeric:true});
  });

  list.innerHTML = sorted.slice(0, 50).map(v => {
    const isSelected = v.id === selectedVehicleId;
    return `
    <div class="vehicle-card${isSelected ? ' selected' : ''}" onclick="selectVehicle('${v.id}')">
      <div class="vehicle-badge ${v.type}">${v.line}</div>
      <div class="vehicle-info">
        <div class="vehicle-route">${v.from} → ${v.to}</div>
        <div class="vehicle-dest">${v.type === 'tram' ? t('tram') : t('bus')} · ${v.speed} km/h</div>
      </div>
      <div class="vehicle-status" style="color:var(--green)">●</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
// LOCATION
// ═══════════════════════════════════════════════
function requestLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.watchPosition(pos => {
    userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    const ll = [userLocation.lat, userLocation.lng];
    if (userMarker) { userMarker.setLatLng(ll); }
    else {
      userMarker = L.marker(ll, { icon: L.divIcon({ className:'', html:'<div style="width:16px;height:16px;background:#1a3faa;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(26,63,170,0.2)"></div>', iconAnchor:[8,8] }) }).addTo(map).bindPopup(t('youAreHere'));
      map.setView(ll, 15);
    }
    if (currentRoute) updateUrgency();
  }, err => {
    if (err.code === 1) showToast('⚠️ Lokacija nije odobrena.');
  }, { enableHighAccuracy:true, maximumAge:5000 });
}

function useMyLocation() {
  if (!userLocation) { showToast('📍 Tražim lokaciju...'); requestLocation(); return; }
  const btn = document.getElementById('locationBtn');
  btn.innerHTML = '📍 <span>Lokacija ✓</span>';
  btn.style.color = 'var(--green)';
  showToast('✓ Lokacija pronađena');
}

// ═══════════════════════════════════════════════
// JOURNEY PLANNER
// ═══════════════════════════════════════════════
let currentRoute = null;
const DESTINATIONS = {
  'glavni kolodvor': { lat:45.8046, lng:15.9784, name:'Glavni kolodvor' },
  'jelačić': { lat:45.8131, lng:15.9767, name:'Trg bana Jelačića' },
  'trg bana': { lat:45.8131, lng:15.9767, name:'Trg bana Jelačića' },
  'maksimir': { lat:45.8208, lng:16.0180, name:'Maksimir' },
  'bundek': { lat:45.7897, lng:15.9858, name:'Bundek' },
  'jarun': { lat:45.7889, lng:15.9336, name:'Jarun' },
  'črnomerec': { lat:45.8164, lng:15.9314, name:'Črnomerec' },
  'dubrava': { lat:45.8297, lng:16.0497, name:'Dubrava' },
  'aerodrom': { lat:45.7429, lng:16.0688, name:'Aerodrom Zagreb' },
  'sesvete': { lat:45.8342, lng:16.1092, name:'Sesvete' },
  'špansko': { lat:45.8138, lng:15.8933, name:'Špansko' },
  'prečko': { lat:45.8057, lng:15.9119, name:'Prečko' },
  'borongaj': { lat:45.8180, lng:16.0550, name:'Borongaj' },
  'savski most': { lat:45.7883, lng:15.9714, name:'Savski most' },
};

function planRoute() {
  if (!userLocation) { showToast('📍 Dopustite pristup lokaciji'); requestLocation(); return; }
  const dest = document.getElementById('destinationInput').value.toLowerCase().trim();
  if (!dest) { showToast('⚠️ Unesite odredište'); return; }

  let destInfo = null;
  for (const [key, val] of Object.entries(DESTINATIONS)) {
    if (dest.includes(key)) { destInfo = val; break; }
  }
  if (!destInfo) destInfo = { lat:45.79 + Math.random()*0.06, lng:15.92 + Math.random()*0.12, name:document.getElementById('destinationInput').value };

  const now = new Date();
  const walkMin = Math.floor(Math.random()*6)+2;
  const waitMin = Math.floor(Math.random()*7)+1;
  const rideMin = Math.floor(Math.random()*18)+5;
  const hasTransfer = Math.random() > 0.55;
  const transferMin = hasTransfer ? Math.floor(Math.random()*4)+1 : 0;
  const ride2Min = hasTransfer ? Math.floor(Math.random()*8)+3 : 0;
  const walkEndMin = Math.floor(Math.random()*4)+1;
  const totalMin = walkMin + waitMin + rideMin + (hasTransfer ? transferMin+ride2Min : 0) + walkEndMin;
  const boardTime = new Date(now.getTime() + (walkMin+waitMin)*60000);
  const arrivalTime = new Date(now.getTime() + totalMin*60000);

  // Pick a nearby real vehicle if available
  const trams = allVehicles.filter(v => v.type === 'tram');
  const buses = allVehicles.filter(v => v.type === 'bus');
  const tramLine = trams.length ? trams[Math.floor(Math.random()*trams.length)] : {line:'6', from:'Črnomerec', to:'Sopot'};
  const busLine = buses.length ? buses[Math.floor(Math.random()*buses.length)] : {line:'109', from:'Britanski trg', to:'Gornji Stenjevec'};

  currentRoute = { walkMin, waitMin, rideMin, hasTransfer, transferMin, ride2Min, walkEndMin, totalMin, boardTime, arrivalTime, tramLine, busLine, destInfo };

  renderRoute(currentRoute);
  updateUrgency();

  L.marker([destInfo.lat, destInfo.lng], { icon: L.divIcon({ className:'', html:`<div style="background:#e63946;color:white;border-radius:8px;padding:4px 8px;font-size:11px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:2px solid white">📍 ${destInfo.name}</div>`, iconAnchor:[40,14] }) }).addTo(map);

  map.fitBounds([[userLocation.lat, userLocation.lng],[destInfo.lat, destInfo.lng]], {padding:[60,60]});
}

function fmt(d) { return d.toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'}); }

function renderRoute(r) {
  const res = document.getElementById('routeResult');
  res.style.display = 'flex';
  res.innerHTML = `
    <div class="route-summary">
      <div class="summary-item"><div class="summary-val">${r.totalMin}</div><div class="summary-lbl">${t('min')}</div></div>
      <div class="summary-item"><div class="summary-val">${r.walkMin+r.walkEndMin}</div><div class="summary-lbl">${t('walking')} ${t('min')}</div></div>
      <div class="summary-item"><div class="summary-val">${r.hasTransfer?'1':'0'}</div><div class="summary-lbl">${t('transfers')}</div></div>
      <div class="summary-item"><div class="summary-val">${fmt(r.arrivalTime)}</div><div class="summary-lbl">${t('arrive')}</div></div>
    </div>
    <div class="route-step walk"><div class="step-icon">🚶</div><div class="step-main"><div class="step-title">${t('walk')} do stanice</div><div class="step-detail">~${r.walkMin} ${t('min')}</div></div><div class="step-time">${fmt(new Date())}</div></div>
    <div class="route-step tram"><div class="step-icon">🚋</div><div class="step-main"><div class="step-title">Linija ${r.tramLine.line} → ${r.tramLine.to}</div><div class="step-detail">Čekanje: ${r.waitMin} ${t('min')} · Vožnja: ${r.rideMin} ${t('min')}</div></div><div class="step-time">${fmt(r.boardTime)}</div></div>
    ${r.hasTransfer ? `<div class="route-step bus"><div class="step-icon">🔄</div><div class="step-main"><div class="step-title">${t('transfer')} → Linija ${r.busLine.line}</div><div class="step-detail">Čekanje: ${r.transferMin} ${t('min')}</div></div><div class="step-time">${fmt(new Date(r.boardTime.getTime()+r.rideMin*60000))}</div></div>` : ''}
    <div class="route-step walk"><div class="step-icon">🚶</div><div class="step-main"><div class="step-title">${t('walk')} do odredišta</div><div class="step-detail">~${r.walkEndMin} ${t('min')}</div></div><div class="step-time">${fmt(new Date(r.arrivalTime.getTime()-r.walkEndMin*60000))}</div></div>
    <div class="route-step arrive"><div class="step-icon">📍</div><div class="step-main"><div class="step-title">${t('arrive')}: ${r.destInfo.name}</div></div><div class="step-time" style="color:var(--green);font-weight:600">${fmt(r.arrivalTime)}</div></div>`;
}

function updateUrgency() {
  if (!currentRoute || !userLocation) return;
  const card = document.getElementById('urgencyCard');
  card.style.display = 'block';
  const minsLeft = Math.round((currentRoute.boardTime.getTime() - Date.now()) / 60000);
  const buffer = minsLeft - currentRoute.walkMin;
  if (buffer < -1) {
    card.className = 'urgency-card red';
    document.getElementById('urgencyArrow').textContent = '↑';
    document.getElementById('urgencyLabel').textContent = t('urgRed');
    document.getElementById('urgencyDetail').textContent = `Kasniš ${Math.abs(buffer)} ${t('min')}`;
  } else if (buffer <= 2) {
    card.className = 'urgency-card blue';
    document.getElementById('urgencyArrow').textContent = '↑';
    document.getElementById('urgencyLabel').textContent = t('urgBlue');
    document.getElementById('urgencyDetail').textContent = `${minsLeft} ${t('min')} do polaska`;
  } else {
    card.className = 'urgency-card green';
    document.getElementById('urgencyArrow').textContent = '↑';
    document.getElementById('urgencyLabel').textContent = t('urgGreen');
    document.getElementById('urgencyDetail').textContent = `Stići ćeš ${buffer} ${t('min')} ranije`;
  }
}

// ═══════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`panel-${tab}`).classList.add('active');
}

function openModal(tab) { document.getElementById('authModal').classList.add('open'); switchModalTab(tab); }
function closeModal() { document.getElementById('authModal').classList.remove('open'); }

function switchModalTab(tab) {
  ['login','register'].forEach(t => {
    document.getElementById(`mtab-${t}`).classList.toggle('active', t===tab);
    document.getElementById(`mform-${t}`).style.display = t===tab ? 'block' : 'none';
  });
  document.getElementById('modalSub').textContent = tab==='login' ? t('welcomeBack') : t('createAccount');
}

document.getElementById('authModal').addEventListener('click', e => { if (e.target===document.getElementById('authModal')) closeModal(); });

let toastTimeout;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function init() {
  applyTranslations();
  map = L.map('map', {zoomControl:false}).setView([45.815, 15.982], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {attribution:'© OpenStreetMap © CARTO', subdomains:'abcd', maxZoom:19}).addTo(map);
  L.control.zoom({position:'topright'}).addTo(map);
  showToast('📡 Učitavam ZET podatke...');
  const ok = await fetchVehicles();
  if (ok) showToast(`✓ ${allVehicles.length} vozila učitano uživo`);
  else showToast('⚠️ Privremeno nedostupno');

  setInterval(async () => {
    await fetchVehicles();
    if (currentRoute) updateUrgency();
  }, 30000);
}

</script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  window.addEventListener('load', init);
</script>
</body>
</html>
