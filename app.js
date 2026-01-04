const APP_VERSION = "v1.1.6";
const APP_DATE = "2026-01-04";

// Storage
const STORAGE_KEY_OBJECTS = "vajagman_objects_v2";
const STORAGE_KEY_CURRENT = "vajagman_current_id_v2";
const STORAGE_KEY_AUTOMODE = "vajagman_auto_open_enabled_v2";
const STORAGE_KEY_AUTORADIUS = "vajagman_auto_open_radius_v2";
const STORAGE_KEY_ADDR_SYSTEM = "vajagman_addr_system_ids_v2"; // set of ids where address is system-validated

const AUTO_COOLDOWN_MS = 15000;

// Schema (fields)
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

function setStatus(msg, dirty=false){
  const el = $("status");
  el.textContent = msg;
  el.classList.toggle("dirty", !!dirty);
}
function setMapStatus(msg){ $("mapStatus").textContent = msg; }

// ---------- Data model rules (discipline) ----------
// - Only SAVED objects exist in catalog.
// - New record exists only in memory until Save.
// - If you leave Record tab without saving (dirty), changes are discarded (your choice: B discipline).

let objects = [];           // saved objects
let currentId = null;       // selected saved object id
let working = null;         // working copy for record tab
let workingIsNew = false;   // true if new record not yet saved
let dirtyFields = new Set();// keys
let addrSystemIds = new Set(); // ids where address was system-validated (ALL CAPS semantics)

function loadJson(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  }catch{}
  return fallback;
}
function saveJson(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function loadObjects(){
  const list = loadJson(STORAGE_KEY_OBJECTS, []);
  // if empty, keep empty (no demo auto-insert; discipline)
  return Array.isArray(list) ? list : [];
}
function saveObjects(){ saveJson(STORAGE_KEY_OBJECTS, objects); }

function loadCurrentId(){
  const id = localStorage.getItem(STORAGE_KEY_CURRENT);
  if (id && objects.some(o => o.id === id)) return id;
  return objects[0]?.id ?? null;
}
function saveCurrentId(id){ if (id) localStorage.setItem(STORAGE_KEY_CURRENT, id); }

function loadAddrSystemIds(){
  const arr = loadJson(STORAGE_KEY_ADDR_SYSTEM, []);
  return new Set(Array.isArray(arr) ? arr : []);
}
function saveAddrSystemIds(){
  saveJson(STORAGE_KEY_ADDR_SYSTEM, Array.from(addrSystemIds));
}

function getSavedById(id){ return objects.find(o => o.id === id) || null; }

function displayTitleFor(o){
  const nr = (o?.OBJEKTA_NR || "").trim();
  const adr = (o?.ADRESE_LOKACIJA || "").trim();
  const title = (nr ? `#${nr} ` : "") + (adr || "—");
  return title || "—";
}

// ---------- Tabs / navigation ----------
let activeTab = "record";
function switchTab(name){
  // leaving record with dirty => discard changes (no blocking)
  if (activeTab === "record" && name !== "record"){
    discardUnsavedChangesIfNeeded();
  }

  activeTab = name;
  for (const el of document.querySelectorAll(".panel")) el.classList.add("hidden");
  $("tab-" + name).classList.remove("hidden");
  for (const b of document.querySelectorAll(".tab")){
    b.classList.toggle("active", b.dataset.tab === name);
  }

  renderHeaderActions();

  if (name === "map"){
    ensureMap();
    setTimeout(() => map.invalidateSize(), 50);
    refreshMarkers();
    maybeStartAutoWatch();
  } else {
    stopAutoWatch();
  }

  if (name === "catalog"){
    refreshCatalog();
  }
}

function renderHeaderActions(){
  const root = $("hdrActions");
  root.innerHTML = "";

  if (activeTab === "record"){
    const btnSave = document.createElement("button");
    btnSave.className = "btn primary";
    btnSave.textContent = "SAGLABĀT";
    btnSave.onclick = saveWorking;
    root.appendChild(btnSave);

    const btnNew = document.createElement("button");
    btnNew.className = "btn";
    btnNew.textContent = "JAUNS";
    btnNew.onclick = createNewRecord;
    root.appendChild(btnNew);
  } else {
    // no global actions for map/catalog (per spec)
  }
}

// ---------- Working copy handling ----------
function blankObject(){
  const o = { id: uid() };
  for (const f of schema) o[f.key] = "";
  return o;
}

function loadWorkingFromSaved(id){
  const saved = getSavedById(id);
  if (!saved) return null;
  return structuredClone(saved);
}

function setWorking(o, isNew){
  working = o;
  workingIsNew = !!isNew;
  dirtyFields.clear();
  updateCtxTitle();
  buildForm($("formRoot"), working);
  applySystemAddressStyle();
  setStatus(workingIsNew ? "Jauns ieraksts (nav saglabāts)." : "Gatavs.");
  updateMiniMap();
}

function updateCtxTitle(){
  $("ctxTitle").textContent = displayTitleFor(working);
}

function markDirty(key){
  dirtyFields.add(key);
  // status dirty
  setStatus("Ir nesaglabāti dati — nospied SAGLABĀT.", true);
  // mark field wrapper
  const wrap = document.querySelector(`.field[data-key="${CSS.escape(key)}"]`);
  if (wrap) wrap.classList.add("dirty");
}

function clearDirtyUI(){
  for (const el of document.querySelectorAll(".field.dirty")) el.classList.remove("dirty");
  setStatus("Saglabāts.");
}

function discardUnsavedChangesIfNeeded(){
  if (dirtyFields.size === 0) return;

  if (workingIsNew){
    // discard the new record entirely
    working = null;
    workingIsNew = false;
    dirtyFields.clear();
    setStatus("Nesaglabāts JAUNS ieraksts atmests.", false);

    // return to some existing record if any
    if (objects.length){
      currentId = currentId || objects[0].id;
      setWorking(loadWorkingFromSaved(currentId), false);
    } else {
      // no records
      setWorking(blankObject(), true);
      // but immediately mark as new & empty? We'll keep as new, but not dirty until user types.
      dirtyFields.clear();
      setStatus("Nav ierakstu. Izveido jaunu un saglabā.");
    }
    return;
  }

  // existing record: revert to saved snapshot
  const saved = getSavedById(currentId);
  working = structuredClone(saved);
  dirtyFields.clear();
  buildForm($("formRoot"), working);
  applySystemAddressStyle();
  updateCtxTitle();
  setStatus("Nesaglabātas izmaiņas atmestas.", false);
  updateMiniMap();
}

// ---------- Form ----------
function buildForm(root, obj){
  root.innerHTML = "";
  for (const f of schema){
    const wrap = document.createElement("div");
    wrap.className = "field";
    wrap.dataset.key = f.key;

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
      if (!working) return;
      working[f.key] = input.value;
      if (f.key === "ADRESE_LOKACIJA"){
        // If user edits the address manually, it is no longer "system-validated"
        if (workingIsNew){
          working.__addrSystem = false;
        } else {
          addrSystemIds.delete(working.id);
          saveAddrSystemIds();
        }
        applySystemAddressStyle();
      }
      markDirty(f.key);
      updateCtxTitle();
      updateMiniMapDebounced();
    });

    wrap.appendChild(label);

    if (f.key === "ADRESE_LOKACIJA"){
      // Horizontal layout: [address input] [ADRESES VALIDĀCIJA]
      wrap.classList.add("addressRow");

      const row = document.createElement("div");
      row.className = "addressRowInner";

      row.appendChild(input);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.textContent = "ADRESES VALIDĀCIJA";
      btn.addEventListener("click", validateAddress);
      row.appendChild(btn);

      wrap.appendChild(row);
    } else {
      wrap.appendChild(input);
    }

    root.appendChild(wrap);
  }
}

function applySystemAddressStyle(){
  const wrap = document.querySelector(`.field[data-key="ADRESE_LOKACIJA"]`);
  if (!wrap) return;
  const isSystem = (!workingIsNew && addrSystemIds.has(working.id)) || (workingIsNew && working.__addrSystem === true);
  wrap.classList.toggle("system", !!isSystem);

  // Address remains editable (user can correct). If user edits manually, we drop "system" marker.
  const inp = document.getElementById("ADRESE_LOKACIJA");
  if (inp){
    inp.disabled = false;
  }
}

// ---------- Save / New ----------
function saveWorking(){
  if (!working) return;

  // if new, add to objects list
  if (workingIsNew){
    // remove private marker
    delete working.__addrSystem;
    objects.unshift(structuredClone(working));
    saveObjects();
    currentId = working.id;
    saveCurrentId(currentId);
    workingIsNew = false;
  } else {
    const idx = objects.findIndex(o => o.id === working.id);
    if (idx >= 0){
      objects[idx] = structuredClone(working);
      saveObjects();
    }
  }

  // apply address system tracking if needed
  if (addrSystemIds.has(working.id) || working.__addrSystem === true){
    addrSystemIds.add(working.id);
    saveAddrSystemIds();
  }

  dirtyFields.clear();
  clearDirtyUI();
  applySystemAddressStyle();
  refreshCatalog();
  refreshMarkers();
  updateMiniMap();
}

function createNewRecord(){
  // Starting state A: blank, not in catalog until Save
  currentId = currentId; // keep reference to return if needed
  const o = blankObject();
  o.__addrSystem = false;
  setWorking(o, true);
  // do not mark dirty until user edits
  dirtyFields.clear();
  setStatus("Jauns ieraksts (nav saglabāts). Aizpildi un nospied SAGLABĀT.");
}

// ---------- Address validation (A: overwrite address ALL CAPS) ----------
async function validateAddress(){
  if (!working) return;
  const address = (working.ADRESE_LOKACIJA || "").trim();
  if (!address){
    setStatus("Nav adreses, ko validēt.", true);
    return;
  }

  try{
    setStatus("Validēju adresi un meklēju koordinātes…", false);
    const geo = await geocodeAddress(address);
    if (!geo){
      setStatus("Validācija: koordinātes neatradu (precizē adresi).", true);
      return;
    }
    working.LAT = String(geo.lat);
    working.LNG = String(geo.lng);

    // Get grammatically correct address name from coordinates (reverse geocoding)
    let pretty = "";
    try{
      pretty = await reverseGeocode(geo.lat, geo.lng);
    } catch {}
    const finalAddr = (pretty || address).trim();
    // overwrite address ALL CAPS (system semantics)
    working.ADRESE_LOKACIJA = finalAddr.toUpperCase();

    // mark system
    if (workingIsNew){
      working.__addrSystem = true;
    } else {
      addrSystemIds.add(working.id);
      saveAddrSystemIds();
    }

    // reflect to inputs
    $("ADRESE_LOKACIJA").value = working.ADRESE_LOKACIJA;
    try{ $("ADRESE_LOKACIJA").disabled = false; } catch {}
    $("LAT").value = working.LAT;
    $("LNG").value = working.LNG;

    markDirty("ADRESE_LOKACIJA");
    markDirty("LAT");
    markDirty("LNG");
    applySystemAddressStyle();
    updateCtxTitle();
    refreshMarkers();
    updateMiniMap();
    setStatus("Adreses validācija pabeigta (ALL CAPS) + koordinātes ieliktas. Nospied SAGLABĀT.", true);
  } catch {
    setStatus("Adreses validācija neizdevās (internets / serviss).", true);
  }
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


async function reverseGeocode(lat, lng){
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Reverse geocoding kļūda: " + res.status);
  const data = await res.json();
  const a = data && data.address ? data.address : {};
  const road = a.road || a.pedestrian || a.footway || a.cycleway || "";
  const house = a.house_number || "";
  const city = a.city || a.town || a.village || a.municipality || "";
  const county = a.county || "";
  const state = a.state || "";
  let line1 = [road, house].filter(Boolean).join(" ").trim();
  let line2 = city || county || state || "";
  let out = [line1, line2].filter(Boolean).join(", ").trim();
  if (!out) out = (data && data.display_name) ? String(data.display_name) : "";
  return out;
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

// ---------- Mini map (always visible in record) ----------
let miniMap = null;
let miniMarker = null;
let miniTile = null;

function ensureMiniMap(){
  if (miniMap) return;
  miniMap = L.map("miniMap", { zoomControl: false, attributionControl:false, dragging:true, scrollWheelZoom:false, doubleClickZoom:false });
  miniMap.setView([56.9496, 24.1052], 12);
  miniTile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 });
  miniTile.addTo(miniMap);
}

function updateMiniMap(){
  ensureMiniMap();
  setTimeout(() => miniMap.invalidateSize(), 50);

  if (!working){
    miniMap.setView([56.9496, 24.1052], 12);
    if (miniMarker){ miniMap.removeLayer(miniMarker); miniMarker = null; }
    return;
  }

  const c = parseLatLng(working);
  if (!c){
    miniMap.setView([56.9496, 24.1052], 12);
    if (miniMarker){ miniMap.removeLayer(miniMarker); miniMarker = null; }
    return;
  }

  if (!miniMarker){
    miniMarker = L.marker([c.lat, c.lng]).addTo(miniMap);
  } else {
    miniMarker.setLatLng([c.lat, c.lng]);
  }
  miniMap.setView([c.lat, c.lng], 16);
}

let miniMapDebounce = null;
function updateMiniMapDebounced(){
  clearTimeout(miniMapDebounce);
  miniMapDebounce = setTimeout(updateMiniMap, 200);
}

// Buttons
async function showOnMap(){
  switchTab("map");
  ensureMap();
  refreshMarkers();

  // if current is new (not saved), we can still focus its coords if any
  const target = workingIsNew ? working : getSavedById(currentId);
  if (!target) return;
  const c = parseLatLng(target);
  if (!c){
    setMapStatus("Nav LAT/LNG. Izmanto ADRESES VALIDĀCIJA vai ieliec koordinātes manuāli.");
    return;
  }
  map.setView([c.lat, c.lng], 17);
}


// ---------- Main map ----------
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

  // Long-press/right click: set LAT/LNG to WORKING record (even if new)
  map.on("contextmenu", (e) => {
    if (!working) return;
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    working.LAT = String(lat);
    working.LNG = String(lng);

    $("LAT").value = working.LAT;
    $("LNG").value = working.LNG;

    markDirty("LAT");
    markDirty("LNG");

    refreshMarkers();
    updateMiniMap();
    setMapStatus(`Ielikts LAT/LNG: ${lat.toFixed(6)}, ${lng.toFixed(6)}. Nospied SAGLABĀT.`);
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function objectPopupHtml(o){
  const title = displayTitleFor(o).toUpperCase();
  const lines = [
    `<div style="font-weight:900;margin-bottom:6px;">${escapeHtml(title)}</div>`,
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

  // show only saved objects on map markers (catalog concept). working new isn't in catalog.
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
        btn.onclick = () => openRecordById(btn.getAttribute("data-open"));
      });
      node.querySelectorAll("button[data-nav]").forEach(btn => {
        btn.onclick = () => {
          const obj = getSavedById(btn.getAttribute("data-nav"));
          if (!obj) return;
          openInGoogleMaps(obj.ADRESE_LOKACIJA || "");
        };
      });
    });
  }
}

function openRecordById(id){
  // if record tab dirty, changes were discarded by switchTab logic already when leaving
  const saved = getSavedById(id);
  if (!saved) return;
  currentId = id;
  saveCurrentId(currentId);
  setWorking(loadWorkingFromSaved(id), false);
  switchTab("record");
}

// ---------- Map helpers ----------
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

async function findNearestToMeAndFocus(){
  const me = await centerOnMe();
  const best = findNearestTo(me.lat, me.lng);
  if (!best){
    setMapStatus("Nav objektu ar koordinātēm (LAT/LNG).");
    return;
  }
  map.setView([best.c.lat, best.c.lng], 17);
  setMapStatus(`Tuvākais: ~${Math.round(best.d)}m.`);
}

// ---------- Auto-open nearest (1:C) ----------
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

    const best = findNearestTo(me.lat, me.lng);
    if (!best) return;

    const radius = getAutoRadius();
    if (best.d > radius) {
      if (activeTab === "map") setMapStatus(`Auto: tuvākais ${Math.round(best.d)}m (ārpus ${radius}m).`);
      return;
    }

    lastAutoSwitchAt = now;

    // If we currently have dirty edits, we discard (discipline) before switching
    if (activeTab === "record" && dirtyFields.size > 0){
      discardUnsavedChangesIfNeeded();
    }

    // Open record automatically (C)
    currentId = best.o.id;
    saveCurrentId(currentId);
    setWorking(loadWorkingFromSaved(currentId), false);
    switchTab("record");
    setStatus(`Auto: atvērts tuvākais (~${Math.round(best.d)}m).`);
  }, () => {
    if (activeTab === "map") setMapStatus("Auto: lokācija nav pieejama (atļaujas / GPS).");
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 });
}

function stopAutoWatch(){
  if (watchId === null) return;
  try{ navigator.geolocation.clearWatch(watchId); } catch {}
  watchId = null;
}

// ---------- Catalog ----------
function refreshCatalog(){
  const root = $("listRoot");
  if (!root) return;

  const q = ($("search").value || "").toLowerCase().trim();
  const list = objects.filter(o => {
    const t = `${o.OBJEKTA_NR||""} ${o.ADRESE_LOKACIJA||""}`.toLowerCase();
    return !q || t.includes(q);
  });

  root.innerHTML = "";
  if (!list.length){
    const empty = document.createElement("div");
    empty.className = "item";
    empty.innerHTML = `<div class="itemTitle">Nav ierakstu</div><div class="itemMeta">Spied IERAKSTS → JAUNS, aizpildi un SAGLABĀT.</div>`;
    root.appendChild(empty);
    return;
  }

  for (const o of list){
    const el = document.createElement("div");
    el.className = "item";

    const top = document.createElement("div");
    top.className = "itemTop";

    const left = document.createElement("div");
    left.style.flex = "1";
    left.style.minWidth = "0";

    const title = document.createElement("div");
    title.className = "itemTitle";
    title.textContent = displayTitleFor(o).toUpperCase();

    const meta = document.createElement("div");
    meta.className = "itemMeta";
    const c = parseLatLng(o);
    meta.textContent = c ? `LAT/LNG: ${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}` : "LAT/LNG: nav";

    left.appendChild(title);
    left.appendChild(meta);

    const btnOpen = document.createElement("button");
    btnOpen.className = "btn primary";
    btnOpen.textContent = "ATVĒRT";
    btnOpen.onclick = () => openRecordById(o.id);

    top.appendChild(left);
    top.appendChild(btnOpen);

    const btns = document.createElement("div");
    btns.className = "itemBtns";

    const btnMap = document.createElement("button");
    btnMap.className = "btn";
    btnMap.textContent = "KARTE";
    btnMap.onclick = () => {
      switchTab("map");
      ensureMap();
      refreshMarkers();
      const c = parseLatLng(o);
      if (c){ map.setView([c.lat, c.lng], 17); }
    };

    const btnDel = document.createElement("button");
    btnDel.className = "btn danger";
    btnDel.textContent = "DZĒST";
    btnDel.onclick = () => {
      if (!confirm("Dzēst ierakstu?")) return;
      objects = objects.filter(x => x.id !== o.id);
      saveObjects();
      addrSystemIds.delete(o.id);
      saveAddrSystemIds();

      if (currentId === o.id){
        currentId = objects[0]?.id ?? null;
        if (currentId){
          setWorking(loadWorkingFromSaved(currentId), false);
        } else {
          setWorking(blankObject(), true);
          dirtyFields.clear();
          setStatus("Nav ierakstu. Izveido jaunu un saglabā.");
        }
        saveCurrentId(currentId || "");
      }

      refreshCatalog();
      refreshMarkers();
      setStatus("Dzēsts.");
    };

    btns.appendChild(btnMap);
    btns.appendChild(btnDel);

    el.appendChild(top);
    el.appendChild(btns);

    // tap anywhere (A) => open record
    el.addEventListener("click", (ev) => {
      // avoid double on button
      if (ev.target && ev.target.closest("button")) return;
      openRecordById(o.id);
    });

    root.appendChild(el);
  }
}

// ---------- Export ----------
function exportJson(){
  const box = $("exportBox");
  box.value = JSON.stringify(objects, null, 2);
  box.classList.remove("hidden");
  setStatus("JSON eksports sagatavots (nokopē un saglabā).");
}

// ---------- PWA ----------
async function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  try{ await navigator.serviceWorker.register("./service-worker.js"); } catch {}
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  objects = loadObjects();
  addrSystemIds = loadAddrSystemIds();
  currentId = loadCurrentId();

  // if no saved objects, start in new record state but not dirty until editing
  if (currentId){
    setWorking(loadWorkingFromSaved(currentId), false);
  } else {
    setWorking(blankObject(), true);
    dirtyFields.clear();
    setStatus("Nav ierakstu. Izveido jaunu un SAGLABĀT.");
  }

  // header actions for initial tab
  renderHeaderActions();

  // tabs
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // map buttons
  $("btnCenterMe").addEventListener("click", () => centerOnMe());
  $("btnFindNearest").addEventListener("click", () => findNearestToMeAndFocus());

  // auto settings restore
  $("autoOpenToggle").checked = isAutoEnabled();
  $("autoRadius").value = String(getAutoRadius());
  $("autoOpenToggle").addEventListener("change", () => {
    setAutoEnabled($("autoOpenToggle").checked);
    if ($("autoOpenToggle").checked){
      setMapStatus("Auto: ieslēgts.");
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

  // catalog
  $("search").addEventListener("input", refreshCatalog);
  $("btnExport").addEventListener("click", exportJson);

  // initial mini map
  updateMiniMap();

  // SW
  registerSW();
});
