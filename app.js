/**
 * FINAL: 
 * - Pie ADRESE/LOKĀCIJA ir poga “Rādīt kartē”:
 *   - ja ir LAT/LNG -> uzreiz fokusē kartē
 *   - ja nav -> geocode pēc adreses, saglabā LAT/LNG, un fokusē kartē
 *
 * - Kartē var ielikt koordinātes ar long-press (Leaflet 'contextmenu' notikums):
 *   - ilgi turi pirkstu uz kartes -> LAT/LNG tiek ielikti pašreizējam objektam un saglabāti
 *
 * - Auto režīms (ja ieslēdz) atver tuvākā objekta popup tikai kartes skatā un netraucē izveides sākumā.
 */

const STORAGE_KEY_OBJECTS = "objekti_v1";
const STORAGE_KEY_CURRENT = "objekti_current_id_v1";
const STORAGE_KEY_AUTOMODE = "objekti_auto_open_enabled_v1";
const STORAGE_KEY_AUTORADIUS = "objekti_auto_open_radius_v1";

const AUTO_COOLDOWN_MS = 15000;

const schema = [
  { key: "ADRESE_LOKACIJA", label: "ADRESE/LOKĀCIJA", type: "text" },
  { key: "ADRESES_LOKACIJAS_PIEZIMES", label: "ADRESES/LOKĀCIJAS PIEZĪMES", type: "textarea" },
  { key: "DURVJU_KODS_PIEKLUVE", label: "DURVJU KODS/PIEKĻUVE", type: "textarea" },
  { key: "PIEKLUVES_KONTAKTI", label: "PIEKĻUVES KONTAKTI", type: "text" },
  { key: "PANELIS_MARKA", label: "PANELIS MARKA", type: "text" },
  { key: "PAROLE1", label: "PAROLE1", type: "text" },
  { key: "PAROLE2", label: "PAROLE2", type: "text" },
  { key: "PAROLE3", label: "PAROLE3", type: "text" },
  { key: "REMOTEPAROLE", label: "REMOTEPAROLE", type: "text" },
  { key: "OBJEKTA_NR", label: "OBJEKTA NR", type: "text" },
  { key: "PIEZIMES1", label: "PIEZĪMES1", type: "textarea" },
  { key: "PIEZIMES2", label: "PIEZĪMES2", type: "textarea" },
  { key: "KONFIGURACIJA", label: "KONFIGURĀCIJA", type: "text" },
  { key: "LAT", label: "LAT (koordinātes)", type: "text" },
  { key: "LNG", label: "LNG (koordinātes)", type: "text" },
];

function $(id){ return document.getElementById(id); }
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function loadObjects(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OBJECTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  // demo (vari izdzēst)
  return [{
    id: uid(),
    ADRESE_LOKACIJA: "Fridriha Candera 24, Rīga",
    ADRESES_LOKACIJAS_PIEZIMES: "Pagrabā, durvis no pagalma",
    DURVJU_KODS_PIEKLUVE: "1234atsl1234rest234 UN zvanīt zvanu",
    PIEKLUVES_KONTAKTI: "12345678",
    PANELIS_MARKA: "ESMI FX",
    REMOTEPAROLE: "megasargs",
    OBJEKTA_NR: "1234",
    PIEZIMES1: "Viskautkas",
    PIEZIMES2: "Arī viskautkas",
    KONFIGURACIJA: "Parastā",
    LAT: "",
    LNG: ""
  }];
}
function saveObjects(list){ localStorage.setItem(STORAGE_KEY_OBJECTS, JSON.stringify(list)); }

function loadCurrentId(objects){
  const id = localStorage.getItem(STORAGE_KEY_CURRENT);
  if (id && objects.some(o => o.id === id)) return id;
  return objects[0]?.id ?? null;
}
function saveCurrentId(id){ if (id) localStorage.setItem(STORAGE_KEY_CURRENT, id); }

function getCurrentObject(objects, id){ return objects.find(o => o.id === id) ?? null; }

function setStatus(msg){ $("status").textContent = msg; }
function setMapStatus(msg){ $("mapStatus").textContent = msg; }

function buildForm(root, obj){
  root.innerHTML = "";
  for (const f of schema){
    const wrap = document.createElement("div");
    wrap.className = "field";

    const label = document.createElement("label");
    label.textContent = f.label;
    label.htmlFor = f.key;

    let input;
    if (f.type === "textarea"){
      input = document.createElement("textarea");
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.autocapitalize = "sentences";
    }

    input.id = f.key;
    input.name = f.key;
    input.value = obj?.[f.key] ?? "";

    input.addEventListener("input", () => {
      persistFromForm();
      setStatus("Saglabāts lokāli.");
      refreshList();
      refreshMarkers();
    });

    wrap.appendChild(label);
    wrap.appendChild(input);

    // Pie adreses – poga "Rādīt kartē"
    if (f.key === "ADRESE_LOKACIJA") {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "8px";
      row.style.marginTop = "8px";
      row.style.flexWrap = "wrap";

      const btnShow = document.createElement("button");
      btnShow.type = "button";
      btnShow.className = "btn primary";
      btnShow.textContent = "Rādīt kartē";
      btnShow.addEventListener("click", () => showCurrentOnMap());

      row.appendChild(btnShow);
      wrap.appendChild(row);
    }

    root.appendChild(wrap);
  }
}

function readForm(){
  const data = {};
  for (const f of schema){
    const el = document.getElementById(f.key);
    data[f.key] = el ? el.value : "";
  }
  return data;
}

let objects = [];
let currentId = null;

// ---------- Tabs ----------
let activeTab = "card";
function switchTab(name){
  activeTab = name;
  for (const el of document.querySelectorAll(".panel")) el.classList.add("hidden");
  $("tab-" + name).classList.remove("hidden");
  for (const b of document.querySelectorAll(".tab")){
    b.classList.toggle("active", b.dataset.tab === name);
  }

  if (name === "map"){
    ensureMap();
    setTimeout(() => map.invalidateSize(), 50);
    refreshMarkers();
    maybeStartAutoWatch();
  } else {
    stopAutoWatch();
  }
}

// ---------- Picker / CRUD ----------
function refreshPicker(){
  const sel = $("objectPicker");
  sel.innerHTML = "";
  for (const o of objects){
    const opt = document.createElement("option");
    const title = (o.OBJEKTA_NR ? `#${o.OBJEKTA_NR} ` : "") + (o.ADRESE_LOKACIJA || "(bez adreses)");
    opt.value = o.id;
    opt.textContent = title;
    if (o.id === currentId) opt.selected = true;
    sel.appendChild(opt);
  }
}

function createNewObject(){
  const o = { id: uid() };
  for (const f of schema) o[f.key] = "";
  objects.unshift(o);
  currentId = o.id;
  saveCurrentId(currentId);
  saveObjects(objects);
  refreshPicker();
  buildForm($("formRoot"), o);
  setStatus("Izveidots jauns objekts.");
  refreshList();
  refreshMarkers();
}

function deleteCurrent(){
  if (!currentId) return;
  objects = objects.filter(o => o.id !== currentId);
  saveObjects(objects);
  currentId = objects[0]?.id ?? null;
  saveCurrentId(currentId);
  refreshPicker();
  buildForm($("formRoot"), getCurrentObject(objects, currentId) || {});
  setStatus("Dzēsts.");
  refreshList();
  refreshMarkers();
}

function persistFromForm(){
  const obj = getCurrentObject(objects, currentId);
  if (!obj) return;
  Object.assign(obj, readForm());
  saveObjects(objects);
}

// ---------- Google Maps deep link ----------
function openInGoogleMaps(address){
  const q = encodeURIComponent(address || "");
  const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  window.open(url, "_blank", "noopener");
}

// ---------- Distance / GPS ----------
function haversineMeters(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getCoords(){
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation nav pieejams."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  });
}

function parseLatLng(o){
  const lat = Number(String(o.LAT || "").replace(",", "."));
  const lng = Number(String(o.LNG || "").replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function findNearestTo(lat, lng){
  let best = null;
  for (const o of objects){
    const c = parseLatLng(o);
    if (!c) continue;
    const d = haversineMeters(lat, lng, c.lat, c.lng);
    if (!best || d < best.d) best = { o, d, c };
  }
  return best;
}

// ---------- Geocoding (Nominatim) ----------
async function geocodeAddress(address){
  const q = encodeURIComponent(address || "");
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Geocoding kļūda: " + res.status);
  const arr = await res.json();
  if (!arr?.length) return null;
  return { lat: Number(arr[0].lat), lng: Number(arr[0].lon) };
}

// ---------- Show current on map (address -> coords -> map) ----------
async function showCurrentOnMap(){
  const obj = getCurrentObject(objects, currentId);
  if (!obj) return;

  switchTab("map");
  ensureMap();
  refreshMarkers();

  let c = parseLatLng(obj);
  if (c){
    focusObjectOnMap(obj);
    setStatus("Parādīts kartē.");
    return;
  }

  const address = (obj.ADRESE_LOKACIJA || "").trim();
  if (!address){
    setStatus("Nav adreses, ko rādīt kartē.");
    return;
  }

  try{
    setStatus("Nav LAT/LNG — meklēju koordinātes pēc adreses…");
    const geo = await geocodeAddress(address);
    if (!geo){
      setStatus("Koordinātes neatradu. Precizē adresi vai ieliec LAT/LNG manuāli.");
      return;
    }

    obj.LAT = String(geo.lat);
    obj.LNG = String(geo.lng);
    saveObjects(objects);

    const latEl = $("LAT"); const lngEl = $("LNG");
    if (latEl) latEl.value = String(geo.lat);
    if (lngEl) lngEl.value = String(geo.lng);

    refreshMarkers();
    focusObjectOnMap(obj);
    setStatus("Koordinātes atrastas un parādīts kartē.");
  } catch {
    setStatus("Geocoding neizdevās (internets / serviss).");
  }
}

// ---------- List ----------
function refreshList(){
  const root = $("listRoot");
  if (!root) return;
  const q = ($("search").value || "").toLowerCase().trim();
  const items = objects.filter(o => {
    const t = `${o.OBJEKTA_NR || ""} ${o.ADRESE_LOKACIJA || ""}`.toLowerCase();
    return !q || t.includes(q);
  });

  root.innerHTML = "";
  for (const o of items){
    const el = document.createElement("div");
    el.className = "listItem";

    const title = document.createElement("div");
    title.className = "t";
    title.textContent = (o.OBJEKTA_NR ? `#${o.OBJEKTA_NR} ` : "") + (o.ADRESE_LOKACIJA || "(bez adreses)");

    const meta = document.createElement("div");
    meta.className = "m";
    const c = parseLatLng(o);
    meta.textContent = c ? `lat/lng: ${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}` : "lat/lng: nav";

    const actions = document.createElement("div");
    actions.className = "a";

    const btnOpen = document.createElement("button");
    btnOpen.className = "btn";
    btnOpen.textContent = "Atvērt kartītē";
    btnOpen.onclick = () => {
      currentId = o.id;
      saveCurrentId(currentId);
      refreshPicker();
      buildForm($("formRoot"), o);
      switchTab("card");
      setStatus("Atvērts.");
    };

    const btnMap = document.createElement("button");
    btnMap.className = "btn";
    btnMap.textContent = "Skatīt kartē";
    btnMap.onclick = () => {
      switchTab("map");
      ensureMap();
      focusObjectOnMap(o);
    };

    actions.appendChild(btnOpen);
    actions.appendChild(btnMap);

    el.appendChild(title);
    el.appendChild(meta);
    el.appendChild(actions);
    root.appendChild(el);
  }
}

// ---------- Map ----------
let map = null;
let markersLayer = null;
let meMarker = null;

function ensureMap(){
  if (map) return;
  map = L.map("map", { zoomControl: true });
  map.setView([56.9496, 24.1052], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // Long-press / right click => ieliek LAT/LNG pašreizējam objektam
  map.on("contextmenu", (e) => {
    const obj = getCurrentObject(objects, currentId);
    if (!obj) return;

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    obj.LAT = String(lat);
    obj.LNG = String(lng);
    saveObjects(objects);

    const latEl = $("LAT"); const lngEl = $("LNG");
    if (latEl) latEl.value = String(lat);
    if (lngEl) lngEl.value = String(lng);

    refreshMarkers();
    setMapStatus(`Ielikts LAT/LNG no kartes: ${lat.toFixed(6)}, ${lng.toFixed(6)} (objekts saglabāts).`);
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function objectPopupHtml(o){
  const lines = [
    `<div style="font-weight:900;margin-bottom:6px;">${(o.OBJEKTA_NR ? "#" + o.OBJEKTA_NR + " " : "")}${escapeHtml(o.ADRESE_LOKACIJA || "(bez adreses)")}</div>`,
    o.ADRESES_LOKACIJAS_PIEZIMES ? `<div><b>Piezīmes:</b> ${escapeHtml(o.ADRESES_LOKACIJAS_PIEZIMES)}</div>` : "",
    o.DURVJU_KODS_PIEKLUVE ? `<div><b>Kods:</b> ${escapeHtml(o.DURVJU_KODS_PIEKLUVE)}</div>` : "",
    o.PIEKLUVES_KONTAKTI ? `<div><b>Kontakti:</b> ${escapeHtml(o.PIEKLUVES_KONTAKTI)}</div>` : "",
    `<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">` +
      `<button data-open="${o.id}" style="padding:6px 10px;border-radius:10px;border:1px solid #1f2a44;background:#1e293b;color:#e2e8f0;font-weight:800;">Atvērt</button>` +
      `<button data-nav="${o.id}" style="padding:6px 10px;border-radius:10px;border:1px solid transparent;background:#2563eb;color:#e2e8f0;font-weight:900;">Navigēt</button>` +
    `</div>`
  ].filter(Boolean);
  return `<div style="font-size:13px;line-height:1.25">${lines.join("")}</div>`;
}

function refreshMarkers(){
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();

  for (const o of objects){
    const c = parseLatLng(o);
    if (!c) continue;
    const m = L.marker([c.lat, c.lng]);
    m.bindPopup(objectPopupHtml(o), { maxWidth: 320 });
    m.addTo(markersLayer);

    m.on("popupopen", (e) => {
      const node = e.popup.getElement();
      if (!node) return;

      node.querySelectorAll("button[data-open]").forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-open");
          const obj = getCurrentObject(objects, id);
          if (!obj) return;
          currentId = id;
          saveCurrentId(currentId);
          refreshPicker();
          buildForm($("formRoot"), obj);
          switchTab("card");
          setStatus("Atvērts no kartes.");
        };
      });

      node.querySelectorAll("button[data-nav]").forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-nav");
          const obj = getCurrentObject(objects, id);
          if (!obj) return;
          openInGoogleMaps(obj.ADRESE_LOKACIJA || "");
        };
      });
    });
  }
}

function focusObjectOnMap(o){
  const c = parseLatLng(o);
  if (!c || !map) return;
  map.setView([c.lat, c.lng], 17);
  markersLayer.eachLayer(layer => {
    const ll = layer.getLatLng?.();
    if (ll && Math.abs(ll.lat - c.lat) < 1e-6 && Math.abs(ll.lng - c.lng) < 1e-6){
      layer.openPopup();
    }
  });
}

async function centerOnMe(){
  setMapStatus("Nosaku lokāciju…");
  const me = await getCoords();
  ensureMap();
  if (!meMarker){
    meMarker = L.circleMarker([me.lat, me.lng], { radius: 8 });
    meMarker.addTo(map);
  } else {
    meMarker.setLatLng([me.lat, me.lng]);
  }
  map.setView([me.lat, me.lng], 16);
  setMapStatus(`Tu: ${me.lat.toFixed(5)}, ${me.lng.toFixed(5)} (±${Math.round(me.acc)}m)`);
  return me;
}

async function findNearestToMeAndOpenOnMap(){
  const me = await centerOnMe();
  const best = findNearestTo(me.lat, me.lng);
  if (!best){
    setMapStatus("Nav objektu ar koordinātēm (lat/lng).");
    return;
  }
  setMapStatus(`Tuvākais: ~${Math.round(best.d)}m.`);
  focusObjectOnMap(best.o);
}

// ---------- Auto-open (popup only, map tab only) ----------
let watchId = null;
let lastAutoSwitchAt = 0;

function isAutoEnabled(){ return localStorage.getItem(STORAGE_KEY_AUTOMODE) === "1"; }
function setAutoEnabled(on){ localStorage.setItem(STORAGE_KEY_AUTOMODE, on ? "1" : "0"); }
function getAutoRadius(){
  const raw = localStorage.getItem(STORAGE_KEY_AUTORADIUS);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 20 ? n : 80;
}
function setAutoRadius(n){ localStorage.setItem(STORAGE_KEY_AUTORADIUS, String(n)); }

function maybeStartAutoWatch(){
  if (activeTab !== "map") return;
  if (!isAutoEnabled()) return;
  if (watchId !== null) return;
  if (!navigator.geolocation){
    setMapStatus("Auto: geolocation nav pieejams.");
    return;
  }

  watchId = navigator.geolocation.watchPosition((pos) => {
    const now = Date.now();
    if (now - lastAutoSwitchAt < AUTO_COOLDOWN_MS) return;

    const me = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
    ensureMap();

    if (!meMarker){
      meMarker = L.circleMarker([me.lat, me.lng], { radius: 8 });
      meMarker.addTo(map);
    } else {
      meMarker.setLatLng([me.lat, me.lng]);
    }

    const best = findNearestTo(me.lat, me.lng);
    if (!best) return;

    const radius = getAutoRadius();
    if (best.d > radius) {
      setMapStatus(`Auto: tuvākais ${Math.round(best.d)}m (ārpus ${radius}m).`);
      return;
    }

    lastAutoSwitchAt = now;
    setMapStatus(`Auto: atrasts tuvākais ~${Math.round(best.d)}m (popup atvērts).`);
    focusObjectOnMap(best.o);
  }, () => {
    setMapStatus("Auto: lokācija nav pieejama (atļaujas / GPS).");
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 });
}

function stopAutoWatch(){
  if (watchId === null) return;
  try{ navigator.geolocation.clearWatch(watchId); } catch {}
  watchId = null;
}

// ---------- PWA ----------
async function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  try{ await navigator.serviceWorker.register("./service-worker.js"); } catch {}
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  objects = loadObjects();
  saveObjects(objects);
  currentId = loadCurrentId(objects);

  buildForm($("formRoot"), getCurrentObject(objects, currentId) || {});
  refreshPicker();
  refreshList();

  // restore auto settings
  $("autoOpenToggle").checked = isAutoEnabled();
  $("autoRadius").value = String(getAutoRadius());

  $("autoOpenToggle").addEventListener("change", () => {
    setAutoEnabled($("autoOpenToggle").checked);
    if ($("autoOpenToggle").checked) {
      setMapStatus("Auto: ieslēgts (darbojas tikai kartes skatā).");
      maybeStartAutoWatch();
    } else {
      setMapStatus("Auto: izslēgts.");
      stopAutoWatch();
    }
  });
  $("autoRadius").addEventListener("change", () => {
    const n = Number($("autoRadius").value);
    setAutoRadius(Number.isFinite(n) ? n : 80);
  });

  $("objectPicker").addEventListener("change", (e) => {
    currentId = e.target.value;
    saveCurrentId(currentId);
    buildForm($("formRoot"), getCurrentObject(objects, currentId) || {});
    setStatus("Pārslēgts objekts.");
  });

  $("btnSave").addEventListener("click", () => {
    persistFromForm();
    setStatus("Saglabāts lokāli.");
    refreshMarkers();
  });

  $("btnNew").addEventListener("click", createNewObject);
  $("btnDelete").addEventListener("click", deleteCurrent);

  $("btnOpenMaps").addEventListener("click", () => {
    const obj = getCurrentObject(objects, currentId);
    openInGoogleMaps(obj?.ADRESE_LOKACIJA || "");
  });

  $("btnHere").addEventListener("click", async () => {
    try{
      const me = await getCoords();
      const best = findNearestTo(me.lat, me.lng);
      if (!best){
        setStatus("Nav objektu ar koordinātēm (LAT/LNG).");
        return;
      }
      currentId = best.o.id;
      saveCurrentId(currentId);
      refreshPicker();
      buildForm($("formRoot"), best.o);
      setStatus(`Atrasts tuvākais (~${Math.round(best.d)}m) un atvērts kartītē.`);
    } catch {
      setStatus("Neizdevās noteikt lokāciju (atļaujas / GPS).");
    }
  });

  $("btnGeocode").addEventListener("click", async () => {
    const obj = getCurrentObject(objects, currentId);
    const address = obj?.ADRESE_LOKACIJA || "";
    if (!address.trim()){
      setStatus("Nav adreses, ko geocodot.");
      return;
    }
    try{
      setStatus("Meklēju koordinātes pēc adreses…");
      const c = await geocodeAddress(address);
      if (!c){
        setStatus("Koordinātes neatradu (pārbaudi adresi).");
        return;
      }
      $("LAT").value = String(c.lat);
      $("LNG").value = String(c.lng);
      persistFromForm();
      setStatus("Koordinātes ieliktas (LAT/LNG) un saglabātas.");
      refreshMarkers();
    } catch {
      setStatus("Geocoding neizdevās (internets / serviss).");
    }
  });

  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  $("btnCenterMe").addEventListener("click", () => centerOnMe());
  $("btnFindNearest").addEventListener("click", () => findNearestToMeAndOpenOnMap());

  $("search").addEventListener("input", refreshList);
  $("btnExport").addEventListener("click", () => {
    const box = $("exportBox");
    box.value = JSON.stringify(objects, null, 2);
    box.classList.remove("hidden");
    setStatus("JSON eksports sagatavots (nokopē un saglabā).");
  });

  registerSW();
});
