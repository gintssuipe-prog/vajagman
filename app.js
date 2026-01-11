
const APP_VERSION = "v3.2.17";
const APP_DATE = "2026-01-11";


// UI version stamp (single source of truth)
(function syncVersionStamp(){
  const t = document.getElementById("verText");
  if (t) t.textContent = `${APP_VERSION} · ${APP_DATE}`;
})();


// Add to Home Screen (5 taps on title)
let __a2hsTapCount = 0;
let __a2hsTapTimer = null;
let __deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  // Chrome/Edge (Android/Windows) will fire this when installable
  e.preventDefault();
  __deferredInstallPrompt = e;
});

function initAddToHomeScreen_(){
  const titleEl = document.getElementById("appTitleTap");
  if (!titleEl) return;

  titleEl.addEventListener("click", () => {
    __a2hsTapCount++;
    clearTimeout(__a2hsTapTimer);

    if (__a2hsTapCount >= 5) {
      __a2hsTapCount = 0;
      openAddToHomeScreen_();
      return;
    }
    __a2hsTapTimer = setTimeout(() => { __a2hsTapCount = 0; }, 1200);
  });
}

function isIOS_(){
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const isMSStream = (window).MSStream;
  return iOS && !isMSStream;
}

function openAddToHomeScreen_(){
  // close if already open
  const ex = document.getElementById("a2hsOverlay");
  if (ex) ex.remove();

  const wrap = document.createElement("div");
  wrap.id = "a2hsOverlay";
  wrap.style.position = "fixed";
  wrap.style.inset = "0";
  wrap.style.zIndex = "99998";
  wrap.style.background = "rgba(0,0,0,0.55)";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
  wrap.style.padding = "16px";

  const card = document.createElement("div");
  card.style.width = "min(520px, 100%)";
  card.style.background = "#0b1220";
  card.style.border = "1px solid rgba(255,255,255,0.12)";
  card.style.borderRadius = "16px";
  card.style.boxShadow = "0 16px 40px rgba(0,0,0,0.55)";
  card.style.padding = "14px 14px 12px";

  const h = document.createElement("div");
  h.textContent = "Pievienot sākuma ekrānam";
  h.style.fontWeight = "700";
  h.style.fontSize = "18px";
  h.style.marginBottom = "10px";

  const p = document.createElement("div");
  p.style.opacity = "0.92";
  p.style.lineHeight = "1.35";
  p.style.fontSize = "14px";

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "10px";
  btnRow.style.justifyContent = "flex-end";
  btnRow.style.marginTop = "12px";

  const btnClose = document.createElement("button");
  btnClose.className = "btn";
  btnClose.textContent = "AIZVĒRT";
  btnClose.onclick = () => wrap.remove();

  const btnAdd = document.createElement("button");
  btnAdd.className = "btn primary";
  btnAdd.textContent = "PIEVIENOT";

  if (__deferredInstallPrompt) {
    p.textContent = "Nospied “PIEVIENOT”, lai pievienotu VAJAGMAN kā ikonu uz sākuma ekrāna.";
    btnAdd.onclick = async () => {
      try {
        __deferredInstallPrompt.prompt();
        await __deferredInstallPrompt.userChoice;
      } catch(e) {}
      __deferredInstallPrompt = null;
      wrap.remove();
    };
  } else if (isIOS_()) {
    p.innerHTML = "iPhone/iPad: atver <b>Share</b> (⤴︎) un izvēlies <b>Add to Home Screen</b>.";
    btnAdd.style.display = "none";
  } else {
    p.textContent = "Atver pārlūka izvēlni un izvēlies “Pievienot sākuma ekrānam” / “Install app”.";
    btnAdd.style.display = "none";
  }

  card.appendChild(h);
  card.appendChild(p);
  btnRow.appendChild(btnAdd);
  btnRow.appendChild(btnClose);
  card.appendChild(btnRow);
  wrap.appendChild(card);

  wrap.addEventListener("click", (e) => { if (e.target === wrap) wrap.remove(); });

  document.body.appendChild(wrap);
}

// Admin diagnostics (5 taps on version)
let __diagTapCount = 0;
let __diagTapTimer = null;

function initDiagnostics_(){
  const verEl = document.getElementById("verText");
  if (!verEl) return;

  verEl.addEventListener("click", () => {
    __diagTapCount++;
    clearTimeout(__diagTapTimer);

    if (__diagTapCount >= 5) {
      __diagTapCount = 0;
      openDiagnostics_();
      return;
    }
    __diagTapTimer = setTimeout(() => { __diagTapCount = 0; }, 1200);
  });
}

function openDiagnostics_(){
  closeDiagnostics_();

  const outbox = loadOutbox();
  const pending = outbox.filter(o => o && o.status === "pending").length;
  const blocked = outbox.filter(o => o && o.status === "blocked").length;

  const ledEl = document.getElementById("dbLed");
  const ledState =
    ledEl?.classList.contains("online") ? "🟢" :
    ledEl?.classList.contains("offline") ? "🔴" :
    ledEl?.classList.contains("pending") ? "🟡" :
    ledEl?.classList.contains("local") ? "🟣" :
    "—";

  const lastSync = localStorage.getItem(STORAGE_KEY_LASTSYNC) || "—";
  const objCount = Array.isArray(objects) ? objects.length : 0;

  const wrap = document.createElement("div");
  wrap.id = "diagOverlay";
  wrap.style.position = "fixed";
  wrap.style.inset = "0";
  wrap.style.zIndex = "99999";
  wrap.style.background = "rgba(0,0,0,0.55)";
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
  wrap.style.padding = "16px";

  const box = document.createElement("div");
  box.style.width = "min(520px, 100%)";
  box.style.background = "#0b2a3f";
  box.style.color = "#fff";
  box.style.borderRadius = "14px";
  box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
  box.style.padding = "14px";

  box.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div style="font-weight:700;">Sistēmas diagnostika</div>
      <button id="diagCloseBtn" style="background:#1f2937;color:#fff;border:0;border-radius:10px;padding:8px 10px;">Aizvērt</button>
    </div>

    <div style="margin-top:10px;background:rgba(255,255,255,0.06);border-radius:12px;padding:10px;font-size:13px;line-height:1.45;white-space:pre-wrap;">
Versija: ${APP_VERSION} · ${APP_DATE}
LED: ${ledState}
Online (navigator): ${navigator.onLine ? "JĀ" : "NĒ"}
DB online (iekšēji): ${dbOnline ? "JĀ" : "NĒ"}
PIN lietotājs: ${userLabel || "—"}
Objekti lokāli: ${objCount}
Outbox kopā: ${outbox.length}
  pending: ${pending}
  blocked: ${blocked}
Pēdējais sync: ${lastSync}
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;">
      <button id="diagClearOutbox" style="flex:1;min-width:150px;background:#f59e0b;color:#111827;border:0;border-radius:12px;padding:10px 12px;font-weight:700;">Iztīrīt OUTBOX</button>
      <button id="diagClearCache" style="flex:1;min-width:150px;background:#ef4444;color:#fff;border:0;border-radius:12px;padding:10px 12px;font-weight:700;">Iztīrīt kešu</button>
      <button id="diagReload" style="flex:1;min-width:150px;background:#22c55e;color:#052e16;border:0;border-radius:12px;padding:10px 12px;font-weight:700;">Restartēt</button>
    </div>

    <div style="margin-top:10px;font-size:12px;opacity:0.85;">
      <div><b>Iztīrīt OUTBOX</b> – dzēš tikai lokālās neapstiprinātās darbības (DB neaiztiek).</div>
      <div><b>Iztīrīt kešu</b> – dzēš lokālos objektus + outbox šajā ierīcē (DB neaiztiek).</div>
    </div>
  `;

  wrap.appendChild(box);
  document.body.appendChild(wrap);
  document.body.style.overflow = "hidden";

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closeDiagnostics_();
  });

  box.querySelector("#diagCloseBtn")?.addEventListener("click", closeDiagnostics_);
  box.querySelector("#diagReload")?.addEventListener("click", () => location.reload());

  box.querySelector("#diagClearOutbox")?.addEventListener("click", () => {
    if (!confirm("Dzēst lokālās neapstiprinātās darbības (OUTBOX)?")) return;
    localStorage.removeItem(STORAGE_KEY_OUTBOX);
    alert("Outbox iztīrīts.");
    location.reload();
  });

  box.querySelector("#diagClearCache")?.addEventListener("click", () => {
    if (!confirm("DZĒST lokālos datus šajā ierīcē? DB netiks ietekmēta.")) return;
    localStorage.removeItem(STORAGE_KEY_OBJECTS);
    localStorage.removeItem(STORAGE_KEY_CURRENT);
    localStorage.removeItem(STORAGE_KEY_ADDR_SYSTEM);
    localStorage.removeItem(STORAGE_KEY_AUTOMODE);
    localStorage.removeItem(STORAGE_KEY_AUTORADIUS);
    localStorage.removeItem(STORAGE_KEY_OUTBOX);
    localStorage.removeItem(STORAGE_KEY_LASTSYNC);
    alert("Lokālais kešs iztīrīts.");
    location.reload();
  });
}

function closeDiagnostics_(){
  const el = document.getElementById("diagOverlay");
  if (el) el.remove();
  document.body.style.overflow = "";
}

const STORAGE_KEY_OBJECTS = "vajagman_objects_v3";
const STORAGE_KEY_CURRENT = "vajagman_current_id_v3";
const STORAGE_KEY_AUTOMODE = "vajagman_auto_open_enabled_v3";
const STORAGE_KEY_AUTORADIUS = "vajagman_auto_open_radius_v3";
const STORAGE_KEY_ADDR_SYSTEM = "vajagman_addr_system_ids_v3";
const STORAGE_KEY_OUTBOX = "vajagman_outbox_v3";

// --- Cloud DB (Google Apps Script WebApp) ---
const API_BASE = "https://script.google.com/macros/s/AKfycbxgH-TStlUKfmRclynoj5u6jTO2C7Bo6T0LaYDBLbi7EKRrx0SXT3Jj9KFQkyFPzc0E/exec"; // ieliec te savu WebApp /exec linku
const STORAGE_KEY_PIN_LABEL = "vajagman_pin_label_v1";
const STORAGE_KEY_LASTSYNC = "vajagman_last_sync_v1";

let userLabel = localStorage.getItem(STORAGE_KEY_PIN_LABEL) || "";
let dbOnline = false;
let dbSyncing = false;
let pendingSync = false; // saglabāts lokāli, bet vēl nav apstiprināts no servera
let catalogSortMode = localStorage.getItem("vajagman_catalog_sort_v1") || "date";

// Catalog render stability (avoid empty flicker during sync)
let lastCatalogHtml_ = '';
let lastCatalogHasItems_ = false;
function isSyncBusy_(){ return !!(dbSyncing || outboxFlushing); }









function setDbLed(state){
  const led = document.getElementById("dbLed");
  if (!led) return;
  led.classList.remove("offline","online","syncing","pending");
  led.classList.add(state);
  led.title = state === "online" ? "DB: sync" : (state === "syncing" ? "DB: sinhronizē..." : (state === "pending" ? "DB: saglabāts lokāli" : "DB: offline"));
}

async function apiCall(action, payload){
  if (!API_BASE) throw new Error("API_BASE nav iestatīts");
  // NOTE: Apps Script WebApp bieži noliek CORS preflight, ja sūti application/json.
  // Tāpēc sūtām kā text/plain (simple request) un ķermenis ir JSON.
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {"Content-Type":"text/plain;charset=utf-8"},
    cache: "no-store",
    body: JSON.stringify({action, ...payload})
  });
	// Ja WebApp nav publisks, Google mēdz atgriezt HTML (login/permission) un JSON parse izgāžas.
	let data = null;
	let rawText = "";
	try {
	  data = await res.json();
	} catch(e) {
	  try { rawText = await res.text(); } catch(_) {}
	}
	if (!data && rawText) {
	  const t = rawText.toLowerCase();
	  if (t.includes("<html") || t.includes("accounts.google.com") || t.includes("permission") ) {
	    throw new Error("Google WebApp nav publisks (Deploy: 'Who has access' -> 'Anyone').");
	  }
	  throw new Error("API atbilde nav JSON. Iespējams, CORS/redirect/proxy.");
	}
  if (!res.ok) throw new Error((data && data.error) ? data.error : ("HTTP " + res.status));
	if (!data) {
	  const hint = rawText && rawText.toLowerCase().includes("accounts.google.com")
	    ? "WebApp nav publisks (Deploy: 'Anyone')."
	    : "Tukša/nesaprotama atbilde no DB.";
	  throw new Error(hint);
	}
  return data;
}

function showPinOverlay(){
  const o = document.getElementById("pinOverlay");
  if (o) o.classList.remove("hidden");
  document.documentElement.classList.add("noScroll");
  document.body.classList.add("noScroll");
  setDbLed("offline");
}
function hidePinOverlay(){
  const o = document.getElementById("pinOverlay");
  if (o) o.classList.add("hidden");
  document.documentElement.classList.remove("noScroll");
  document.body.classList.remove("noScroll");
}
async function ensureAuth(){
  const sessionOk = (sessionStorage.getItem(SESSION_OK_KEY) === "1");
  if (userLabel && sessionOk) { hidePinOverlay(); return true; }
  showPinOverlay();
  const inp = document.getElementById("pinInput");
  const btn = document.getElementById("pinBtn");
  const msg = document.getElementById("pinMsg");
  const pad = document.getElementById("pinPad");
  const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (inp){
    inp.autocomplete = "one-time-code";
    inp.inputMode = isTouch ? "none" : "numeric";
    inp.readOnly = !!isTouch;
  }
  if (pad){
    pad.classList.toggle("hidden", !isTouch);
    if (isTouch && !pad.dataset.ready){
      pad.dataset.ready = "1";
      pad.innerHTML = "";
      const mkBtn = (label, cls, onClick) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pinKey" + (cls ? (" " + cls) : "");
        b.textContent = label;
        b.addEventListener("click", onClick);
        return b;
      };
      const addDigit = (d) => {
        const v = (inp?.value || "");
        if (v.length >= 8) return;
        inp.value = v + d;
      };
      const back = () => { inp.value = (inp.value || "").slice(0, -1); };
      const clear = () => { inp.value = ""; };

      const digits = ["1","2","3","4","5","6","7","8","9"];
      for (const d of digits){
        pad.appendChild(mkBtn(d, "", () => addDigit(d)));
      }
      pad.appendChild(mkBtn("C", "aux", clear));
      pad.appendChild(mkBtn("0", "", () => addDigit("0")));
      pad.appendChild(mkBtn("⌫", "aux", back));
    }
  }
  if (inp && !isTouch) inp.focus();
  const doLogin = async () => {
    const pin = (inp?.value || "").trim();
    if (!pin) { if (msg) msg.textContent="Ievadi PIN."; return; }
    try{
      if (msg) msg.textContent="Pārbaudu...";
      const r = await apiCall("checkPin", {pin});
      if (r && r.ok){
        userLabel = String(r.user || pin);
        localStorage.setItem(STORAGE_KEY_PIN_LABEL, userLabel);
        sessionStorage.setItem(SESSION_OK_KEY, "1");
        if (msg) msg.textContent="OK.";
        hidePinOverlay();
        await fullSync();
        await flushOutbox();
      } else {
        if (msg) msg.textContent = (r && r.error) ? r.error : "Nederīgs PIN.";
      }
    }catch(e){
      if (msg) msg.textContent = "DB nav sasniedzama.";
      setDbLed("offline");
    }
  };
  if (btn) btn.onclick = doLogin;
  if (inp) inp.onkeydown = (e)=>{ if(e.key==="Enter") doLogin(); };
  return false;
}

async function fullSync(){
  if (!userLabel) return;
  if (!API_BASE) { setDbLed("offline"); return; }
  try{
    dbSyncing = true; setDbLed("syncing");
    const since = localStorage.getItem(STORAGE_KEY_LASTSYNC) || "";
    const r = await apiCall("getAll", {since});
    if (r && r.ok){
      const remote = Array.isArray(r.records) ? r.records : [];
      const remoteObjs = remote.map(fromDbRecord_);

      // DB ir galvenā: ja ieraksts pazudis DB, tas pazūd arī lokāli (izņemot, ja ir pending/outbox).
      try{
        const remoteIds = new Set(remoteObjs.map(x => String(x.id||"").trim()).filter(Boolean));
        const q = loadOutbox();
        const hasOutbox = (id) => {
          const sid = String(id||"").trim();
          return q.some(it => it && String(it.id||"").trim() === sid);
        };
        const before = objects.slice();
        objects = objects.filter(o => {
          const id = String(o && o.id || "").trim();
          const v = Number(o && o.version || 0);
          if (v >= 1 && id && !remoteIds.has(id) && !hasOutbox(id)) {
            // remove also from special marker set
            addrSystemIds.delete(id);
            return false;
          }
          return true;
        });
        if (objects.length !== before.length) {
          saveObjects();
          saveAddrSystemIds();
        }
      }catch(e){ /* never block sync */ }

      mergeRemote(remoteObjs);
      localStorage.setItem(STORAGE_KEY_LASTSYNC, r.now || new Date().toISOString());
      dbOnline = true;
      setDbLed("online");
      setStatus("Sinhronizēts.");
      await flushOutbox();
    }
  }catch(e){
    dbOnline = false;
    setDbLed("offline");
    // nerakstām agresīvu error statusu, lai netraucē darbam offline
  }finally{
    dbSyncing = false;
    // pēc sinhronizācijas atjaunojam LED atbilstoši arī “lokāli saglabāts” stāvoklim
    if (!dbOnline) setDbLed("offline");
    else if (pendingSync) setDbLed("pending");
    else setDbLed("online");
    // Pēc sync atjaunojam KATALOGU/MARĶIERUS arī tad, ja DB atgriezās tukša (DB wipe).
    refreshCatalog();
    refreshMarkers();
  }
}

function mergeRemote(remote){
  // merge by id; remote can include isDeleted=true
  const byId = new Map(objects.map(o=>[o.id,o]));
  for (const ro of remote){
    if (!ro || !ro.id) continue;
    const lo = byId.get(ro.id);
    if (!lo){ 
      objects.push(ro);
      byId.set(ro.id, ro);
      continue;
    }
    // prefer newer version/updatedAt
    const lv = Number(lo.version || 0);
    const rv = Number(ro.version || 0);
    const lu = String(lo.updatedAt||"");
    const ru = String(ro.updatedAt||"");
    const remoteIsNewer = (rv>lv) || (rv===lv && ru && ru>lu);
    if (remoteIsNewer){
      Object.assign(lo, ro);
    }
  }
  saveObjects();
  refreshCatalog();
  refreshMarkers();
}


async function pushUpsert(record, baseVersion){
  if (!userLabel || !API_BASE) return;
  try{
    pendingSync = true;
    setDbLed("syncing");

    const dbRecord = toDbRecord_(record);
    const bv = Number(baseVersion||0);

    const r = await apiCall("save", {user:userLabel, record: dbRecord, baseVersion: bv});
    if (r && r.ok && r.record){
      const updated = fromDbRecord_(r.record);
      mergeRemote([updated]);

      // svarīgi: atjaunojam arī current working, lai nākamais baseVersion ir pareizs
      if (working && currentId && String(currentId)===String(updated.id)){
        working = structuredClone(updated);
        savedSnapshot = structuredClone(updated);
        dirtyFields.clear();
        refreshSaveButton();
      }

      pendingSync = false;
      setDbLed("online");
      if (dirtyFields.size === 0) setStatus("Saglabāts.", false);

      // pēc veiksmīga upsert varam pamēģināt iztukšot outbox (ja bija rindā)
      await flushOutbox();
      return;
    }

    // ja API atgrieza ne-ok, apstrādājam kā kļūdu
    const errMsg = String((r && (r.error||r.status)) || "save failed");
    if (errMsg.toLowerCase().includes("conflict")){
      // konfliktu automātiski nerisinām; atstājam lokāli, outbox neliekam, lai necilātos bezjēgā
      setDbLed("pending");
      setStatus("Konflikts: atjauno KATALOGU un saskaņo izmaiņas.", false);
      // conflict handled via outbox (blocked)
      return;
    }

    // cits errors — liekam outbox
    enqueueOutbox_(outboxUpsertItem_(record, bv));
  }catch(e){
    pendingSync = true;

    const msg = String(e && e.message ? e.message : e).toLowerCase();

    // tīkla kļūme => outbox
    if (msg.includes("failed") || msg.includes("fetch") || msg.includes("network")){
      setDbLed("offline");
      enqueueOutbox_(outboxUpsertItem_(record, Number(baseVersion||0)));
      return;
    }

    // konflikts (ja kļūda nāk kā exception string)
    if (msg.includes("conflict")){
      setDbLed("pending");
      // conflict handled via outbox (blocked)
      return;
    }

    setDbLed("pending");
  }
}

async function pushDelete(id, baseVersion){
  if (!userLabel || !API_BASE) return;

  const item = outboxDeleteItem_(id, Number(baseVersion||0));

  // If offline or session not verified, do not even try -> queue immediately
  if (!dbOnline || !sessionOkNow_()){
    enqueueOutbox_(item);
    return;
  }

  try{
    setDbLed("syncing");
    const r = await apiCall("delete", {user:userLabel, id, baseVersion: Number(baseVersion||0)});
    if (r && r.ok && r.record){
      mergeRemote([fromDbRecord_(r.record)]);
      setDbLed("online");
      return;
    }

    const errMsg = String((r && (r.error||r.status)) || "delete failed");
    if (errMsg.toLowerCase().includes("conflict")){
      item.state = "blocked";
      item.lastError = "conflict";
      saveOutbox([...loadOutbox(), item]);
      setDbLed("pending");
      return;
    }

    // other errors -> queue for retry
    enqueueOutbox_(item);
  }catch(e){
    setDbLed("offline");
    enqueueOutbox_(item);
  }
}
const AUTO_COOLDOWN_MS = 15000;

// Geocoding language control (avoid browser UI language affecting results).
const STORAGE_KEY_GEO_LANG = "vajagman_geo_lang_v1";
function getGeoLang(){
  const v = (localStorage.getItem(STORAGE_KEY_GEO_LANG) || "lv").trim();
  // allow values like "lv", "lv-LV", "en", "en-US"
  return v || "lv";
}


// Fields: address is handled separately (rendered above mini map), but still stored in object.
const schema = [
  // MAIN
  { key: "PIEKLUVES_KONTAKTI", label: "PIEKĻUVES KONTAKTS", type: "textarea" },
  { key: "VARDS", label: "VĀRDS", type: "textarea" },

  // AUATSS
  { key: "OBJEKTA_NR", label: "OBJEKTA NR", type: "textarea" },
  { key: "REMOTEPAROLE", label: "PULTS/REMOTE PAROLE", type: "textarea" },
  { key: "PANELIS_MARKA", label: "PANELIS MARKA/MODELIS", type: "textarea" },
  { key: "PAROLE1", label: "PAROLE1", type: "textarea" },
  { key: "PAROLE2", label: "PAROLE2", type: "textarea" },
  { key: "PAROLE3", label: "PAROLE3", type: "textarea" },

  // OTHER
  { key: "PIEZIMES1", label: "PIEZĪMES1", type: "textarea" },
  { key: "PIEZIMES2", label: "PIEZĪMES2", type: "textarea" },
  { key: "KONFIGURACIJA", label: "KONFIGURĀCIJA", type: "textarea" },
  { key: "LAT", label: "LAT (koordinātes)", type: "textarea" },
  { key: "LNG", label: "LNG (koordinātes)", type: "textarea" },
];

// ---- DB field mapping (Sheets headers <-> UI keys) ----
// Sheets headers are snake_case; UI uses legacy keys (UPPERCASE).
function toDbRecord_(o){
  const r = Object.assign({}, o);

  // UI -> DB
  r.adrese = (o.ADRESE_LOKACIJA ?? o.adrese ?? "");
  r.durvju_kods = (o.DURVJU_KODS_PIEKLUVE ?? o.durvju_kods ?? "");
  r.tel = (o.PIEKLUVES_KONTAKTI ?? o.tel ?? "");
  r.vards = (o.VARDS ?? o.vards ?? "");

  r.objekta_nr = (o.OBJEKTA_NR ?? o.objekta_nr ?? "");
  r.pults_remote_parole = (o.REMOTEPAROLE ?? o.pults_remote_parole ?? "");
  r.panelis_marka_modelis = (o.PANELIS_MARKA ?? o.panelis_marka_modelis ?? "");

  r.parole1 = (o.PAROLE1 ?? o.parole1 ?? "");
  r.parole2 = (o.PAROLE2 ?? o.parole2 ?? "");
  r.parole3 = (o.PAROLE3 ?? o.parole3 ?? "");

  r.piezimes1 = (o.PIEZIMES1 ?? o.piezimes1 ?? "");
  r.piezimes2 = (o.PIEZIMES2 ?? o.piezimes2 ?? "");
  r.konfiguracija = (o.KONFIGURACIJA ?? o.konfiguracija ?? "");

  r.lat = (o.LAT ?? o.lat ?? "");
  r.lng = (o.LNG ?? o.lng ?? "");

  return r;
}

function fromDbRecord_(o){
  const r = Object.assign({}, o);

  // DB -> UI (prefer UI keys if already present)
  if (r.ADRESE_LOKACIJA === undefined) r.ADRESE_LOKACIJA = (o.adrese ?? "");
  if (r.DURVJU_KODS_PIEKLUVE === undefined) r.DURVJU_KODS_PIEKLUVE = (o.durvju_kods ?? "");
  if (r.PIEKLUVES_KONTAKTI === undefined) r.PIEKLUVES_KONTAKTI = (o.tel ?? "");
  if (r.VARDS === undefined) r.VARDS = (o.vards ?? "");

  if (r.OBJEKTA_NR === undefined) r.OBJEKTA_NR = (o.objekta_nr ?? "");
  if (r.REMOTEPAROLE === undefined) r.REMOTEPAROLE = (o.pults_remote_parole ?? "");
  if (r.PANELIS_MARKA === undefined) r.PANELIS_MARKA = (o.panelis_marka_modelis ?? "");

  if (r.PAROLE1 === undefined) r.PAROLE1 = (o.parole1 ?? "");
  if (r.PAROLE2 === undefined) r.PAROLE2 = (o.parole2 ?? "");
  if (r.PAROLE3 === undefined) r.PAROLE3 = (o.parole3 ?? "");

  if (r.PIEZIMES1 === undefined) r.PIEZIMES1 = (o.piezimes1 ?? "");
  if (r.PIEZIMES2 === undefined) r.PIEZIMES2 = (o.piezimes2 ?? "");
  if (r.KONFIGURACIJA === undefined) r.KONFIGURACIJA = (o.konfiguracija ?? "");

  if (r.LAT === undefined) r.LAT = (o.lat ?? "");
  if (r.LNG === undefined) r.LNG = (o.lng ?? "");

  return r;
}



// IERAKSTS apakš-šķirkļi (UI filtrs; datu modelis nemainās)
const RECORD_SUBTABS = ["main","auatss","other"];
const RECORD_SUBTAB_LABELS = { main: "MAIN", auatss: "AUATSS", other: "OTHER" };
const SUBTAB_FOR_KEY = {
  PIEKLUVES_KONTAKTI: "main",
  VARDS: "main",

  OBJEKTA_NR: "auatss",
  REMOTEPAROLE: "auatss",
  PANELIS_MARKA: "auatss",
  PAROLE1: "auatss",
  PAROLE2: "auatss",
  PAROLE3: "auatss",

  PIEZIMES1: "other",
  PIEZIMES2: "other",
  KONFIGURACIJA: "other",
  LAT: "other",
  LNG: "other",
};

function getRecordSubtab(){
  const v = (localStorage.getItem("vm_record_subtab") || "main").toLowerCase();
  return RECORD_SUBTABS.includes(v) ? v : "main";
}
function setRecordSubtab(name){
  if (!RECORD_SUBTABS.includes(name)) name = "main";
  localStorage.setItem("vm_record_subtab", name);

  // buttons state
  document.querySelectorAll("#recordSubtabs .subtabBtn").forEach(b => {
    b.classList.toggle("active", b.dataset.subtab === name);
  });

  // hide/show fields
  document.querySelectorAll('#tab-record [data-subtab]:not(.subtabBtn)').forEach(el => {
    const st = (el.dataset.subtab || "main");
    el.classList.toggle("hiddenBySubtab", st !== name);
  });
}

function initRecordSubtabs(){
  const bar = document.getElementById("recordSubtabs");
  if (!bar) return;

  // click
  bar.querySelectorAll(".subtabBtn").forEach(btn => {
    btn.addEventListener("click", () => setRecordSubtab(btn.dataset.subtab));
  });
  // swipe disabled: lietotājs pārslēdz tabus tikai ar klikšķi (lai nepārslēdz pārlūku ar swipe)

  // initial state
  setRecordSubtab(getRecordSubtab());
}


function $(id){ return document.getElementById(id); }
function setValueSafe(id, v){ const el = $(id); if (el) el.value = v; }
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function pad2_(n){ return String(n).padStart(2,"0"); }
function fmtIsoLocal_(iso){
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2_(d.getMonth()+1)}-${pad2_(d.getDate())} ${pad2_(d.getHours())}:${pad2_(d.getMinutes())}`;
}

function loadJson(key, fallback){
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}
function saveJson(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

function setStatus(msg, dirty=false){
  // Galvenajā joslā nerādām tehniskos sinhronizācijas paziņojumus (tie dzīvo KATALOGĀ pie brāķiem).
  const s = String(msg || "");
  if (/^Saglabāts/i.test(s) || s.toLowerCase().includes("sinhroniz")) return;
  const el = $("status");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("dirty", !!dirty);
}
// Map feedback uses the same technical/status line placement as IERAKSTS.
function setMapStatus(msg, dirty=false){ setStatus(msg, dirty); }

let objects = [];
let currentId = null;
let working = null;          // working copy (may be new)
let workingIsNew = false;
let dirtyFields = new Set(); // keys changed (incl. ADRESE_LOKACIJA)
let savedSnapshot = null;   // last saved state snapshot for dirty comparisons
let addrSystemIds = new Set();

function loadObjects(){ return Array.isArray(loadJson(STORAGE_KEY_OBJECTS, [])) ? loadJson(STORAGE_KEY_OBJECTS, []) : []; }
function saveObjects(){ saveJson(STORAGE_KEY_OBJECTS, objects); }


// --- Outbox (offline queue) ---
// Glabā nesinhronizētos darbības soļus, lai pēc interneta atjaunošanās varētu automātiski iestumt DB.
let outboxFlushing = false;

function loadOutbox(){ return loadJson(STORAGE_KEY_OUTBOX, []); }
function saveOutbox(q){ saveJson(STORAGE_KEY_OUTBOX, q); }

function outboxStateForId_(id){
  const sid = String(id||"").trim();
  if (!sid) return null;
  const q = loadOutbox();
  if (!Array.isArray(q) || q.length === 0) return null;
  // newest first
  for (let i = q.length - 1; i >= 0; i--){
    const it = q[i];
    if (!it) continue;
    if (String(it.id||"") !== sid) continue;
    if (it.state === "pending" || it.state === "blocked") return it;
  }
  return null;
}

function removeOutboxForId_(id){
  const sid = String(id||"").trim();
  if (!sid) return;
  const q = loadOutbox();
  if (!Array.isArray(q) || q.length === 0) return;
  const next = q.filter(it => it && String(it.id||"") !== sid);
  if (next.length !== q.length) saveOutbox(next);
}


function outboxUpsertItem_(record, baseVersion){
  return {
    type: "upsert",
    id: String(record.id||""),
    user: userLabel || "",
    baseVersion: Number(baseVersion||0),
    record: toDbRecord_(record),
    ts: Date.now(),
    tries: 0,
    state: "pending", // pending | blocked
    lastError: ""
  };
}

function outboxDeleteItem_(id, baseVersion){
  return {
    type: "delete",
    id: String(id||""),
    user: userLabel || "",
    baseVersion: Number(baseVersion||0),
    ts: Date.now(),
    tries: 0,
    state: "pending",
    lastError: ""
  };
}

function enqueueOutbox_(item){
  if (!item || !item.id) return;
  const q = loadOutbox();
  const id = String(item.id);

  // Dedupe / precedence rules:
  // - DELETE overrides any pending work for the same id (drop older UPSERTs)
  // - UPSERT after DELETE means "undo delete" locally -> drop pending DELETE
  if (item.type === "delete"){
    for (let i = q.length - 1; i >= 0; i--){
      const x = q[i];
      if (!x) continue;
      if (x.state === "pending" && String(x.id) === id){
        q.splice(i, 1);
      }
    }
    q.push(item);
  } else {
    // upsert
    for (let i = q.length - 1; i >= 0; i--){
      const x = q[i];
      if (!x) continue;
      if (x.state === "pending" && x.type === "delete" && String(x.id) === id){
        q.splice(i, 1); // undo pending delete
      }
    }
    const idx = q.findIndex(x => x && x.state==="pending" && x.type==="upsert" && String(x.id)===id);
    if (idx >= 0) q[idx] = item; else q.push(item);
  }

  saveOutbox(q);

  // UI indikācija: lokāli saglabāts + rindā uz DB
  setDbLed(dbOnline ? "pending" : "offline");
  setStatus("Saglabāts lokāli (gaida sinhronizāciju).", false);
}

function sessionOkNow_(){
  return (sessionStorage.getItem(SESSION_OK_KEY) === "1");
}

async function flushOutbox(){
  if (outboxFlushing) return;
  if (!API_BASE) return;
  if (!dbOnline) return;
  if (!userLabel || !sessionOkNow_()) return;

  const q = loadOutbox();
  if (!Array.isArray(q) || q.length === 0) return;

  outboxFlushing = true;
  try{
    setDbLed("syncing");

    const next = [];
    for (const item of q){
      if (!item || item.state !== "pending") { next.push(item); continue; }

      try{
        item.tries = Number(item.tries||0) + 1;
        if (item.type === "upsert"){
          const r = await apiCall("save", {user:userLabel, record:item.record, baseVersion:Number(item.baseVersion||0)});
          if (r && r.ok && r.record){
            const updated = fromDbRecord_(r.record);
            mergeRemote([updated]);

            // ja lietotājs šobrīd rediģē to pašu ierakstu, atjaunojam version un snapshot
            if (working && currentId && String(currentId)===String(updated.id)){
              working = structuredClone(updated);
              savedSnapshot = structuredClone(updated);
              dirtyFields.clear();
              refreshSaveButton();
            }
            continue; // izņemts no outbox
          }
          // ja nav ok - interpretējam zemāk
          const errMsg = String((r && (r.error||r.status)) || "save failed");
          if (errMsg.toLowerCase().includes("conflict")){
            item.state = "blocked";
            item.lastError = "conflict";
            next.push(item);
            setDbLed("pending");
            setStatus("Saglabāts tikai šeit: DB versija atšķiras. Atver ierakstu un izvērtē, ko paturēt.", false);
            continue;
          }
          item.lastError = errMsg;
          next.push(item);
          setDbLed("pending");
          continue;
        }

        if (item.type === "delete"){
          const r = await apiCall("delete", {user:userLabel, id:item.id, baseVersion:Number(item.baseVersion||0)});
          if (r && r.ok && r.record){
            mergeRemote([fromDbRecord_(r.record)]);
            continue;
          }
          const errMsg = String((r && (r.error||r.status)) || "delete failed");
          if (errMsg.toLowerCase().includes("conflict")){
            item.state = "blocked";
            item.lastError = "conflict";
          } else {
            item.lastError = errMsg;
          }
          next.push(item);
          setDbLed("pending");
          continue;
        }

        // nezināms tips
        next.push(item);
      }catch(e){
        // tīkla/timeout gadījumā atstājam outboxā
        item.lastError = String(e && e.message ? e.message : e);
        next.push(item);
        setDbLed("offline");
      }
    }

    saveOutbox(next);

    // Ja outbox tukšs un nav dirty, atgriežam zaļo
    if (next.length === 0){
      setDbLed("online");
      if (dirtyFields.size === 0) setStatus("Sinhronizēts.", false);
    } else {
      // vēl ir darbi
      setDbLed(dbOnline ? "pending" : "offline");
    }
  }finally{
    outboxFlushing = false;
  }
}
function saveCurrentId(id){
  if (id) localStorage.setItem(STORAGE_KEY_CURRENT, id);
  else localStorage.removeItem(STORAGE_KEY_CURRENT);
}
function loadCurrentId(){
  const id = localStorage.getItem(STORAGE_KEY_CURRENT);
  if (id && objects.some(o => o.id === id)) return id;
  return objects[0]?.id ?? null;
}
function loadAddrSystemIds(){
  const arr = loadJson(STORAGE_KEY_ADDR_SYSTEM, []);
  return new Set(Array.isArray(arr) ? arr : []);
}
function saveAddrSystemIds(){ saveJson(STORAGE_KEY_ADDR_SYSTEM, Array.from(addrSystemIds)); }

function getSavedById(id){ return objects.find(o => o.id === id) || null; }

function parseLatLng(o){
  const lat = Number(String(o.LAT || "").replace(",", "."));
  const lng = Number(String(o.LNG || "").replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function titleFromRecord(o){
  const adr = String(o?.ADRESE_LOKACIJA || "").trim();
  const code = String(o?.DURVJU_KODS_PIEKLUVE || "").trim();
  const oneLineCode = code.split(/\\r?\\n/)[0].trim();
  const t = oneLineCode ? (adr + ", " + oneLineCode).trim() : adr;
  return t || "—";
}

// IMPORTANT: record title in header is based on SAVED record only.
// - New (unsaved) => "—"
// - Existing => derive from saved snapshot
function updateCtxTitle(){
  if (workingIsNew || !currentId){
    const _ctxEl = $("ctxTitle"); if (_ctxEl) _ctxEl.textContent = "—";
    return;
  }
  const saved = getSavedById(currentId);
  const _ctxEl2 = $("ctxTitle"); if (_ctxEl2) _ctxEl2.textContent = titleFromRecord(saved);
}

function applySystemAddressStyle(){ 
  const wrap = document.querySelector('.field.addressStandalone');
  if (!wrap) return;
  const isSystem = (!workingIsNew && currentId && addrSystemIds.has(currentId)) || (workingIsNew && working && working.__addrSystem === true);
  wrap.classList.toggle("system", !!isSystem);
}

// Save button state machine:
// - disabled if no changes (dirtyFields empty)
// - for NEW: also disabled if all fields empty (avoid empty record)
function hasMeaningfulData(obj){
  if (!obj) return false;
  const keys = ["ADRESE_LOKACIJA","ADRESES_LOKACIJAS_PIEZIMES","DURVJU_KODS_PIEKLUVE","PIEKLUVES_KONTAKTI","PANELIS_MARKA","PAROLE1","PAROLE2","PAROLE3","REMOTEPAROLE","OBJEKTA_NR","PIEZIMES1","PIEZIMES2","KONFIGURACIJA","LAT","LNG"];
  return keys.some(k => String(obj[k] || "").trim().length > 0);
}



function wireHeaderActions(){
  const btnSave = $("btnSave");
  const btnNew = $("btnNew");
  const btnVal = $("btnValidateAddress");
  const btnGps = $("btnGps");

  if (btnSave) btnSave.onclick = saveWorking;
  if (btnNew) btnNew.onclick = createNewRecord;
  if (btnVal) btnVal.onclick = validateAddress;
  if (btnGps) btnGps.onclick = fillFromGPS;

  refreshSaveButton();
}

function updateHdrActionBar(){
  const bar = $("hdrActionBar");
  if (!bar) return;
  bar.classList.toggle("hidden", activeTab !== "record");
}

function refreshSaveButton(){
  const btn = $("btnSave");
  if (!btn) return;
  const isDirty = dirtyFields.size > 0;
  const canSave = isDirty && (!workingIsNew || hasMeaningfulData(working));
  btn.disabled = !canSave;
  btn.classList.toggle("primary", canSave);
  // Status tekstu nerakstām agresīvi katru reizi, jo to izmanto arī “Saglabāts lokāli …”.
  // Te atjaunojam tikai tad, ja ir nesaglabātas izmaiņas.
  if (isDirty) {
    setStatus("Nesaglabātas izmaiņas — nospied SAGLABĀT.", true);
  } else {
    // Ja nav nesaglabātu izmaiņu, neturam iepriekšējo “dirty” statusu.
    // (Tehniskus sync paziņojumus rādam tikai KATALOGĀ.)
    setStatus("Gatavs.", false);
  }
}

function updateLocalOnlyHint_(){
  // We show "⚠️ Saglabāts tikai šeit" only in KATALOGS list items.
  // In record view we keep UI clean: hide the banner if it exists.
  const el = document.getElementById("localOnlyHint");
  if (el) el.classList.add("hidden");

  // Also ensure header/status text is not left in a confusing state.
  // (Actual status logic lives elsewhere; this is a safety no-op.)
}

function markDirty(key){
  dirtyFields.add(key);
  // mark field wrapper dirty (if present)
  const wrap = document.querySelector(`.field[data-key="${CSS.escape(key)}"]`);
  if (wrap) wrap.classList.add("dirty");
  // also mark the input itself dirty (for dynamically built fields without wrappers)
  const el = $(key);
  if (el) el.classList.add("dirty");
  refreshSaveButton();
}

function unmarkDirty(key){
  dirtyFields.delete(key);
  const wrap = document.querySelector(`.field[data-key="${CSS.escape(key)}"]`);
  if (wrap) wrap.classList.remove("dirty");
  const el = $(key);
  if (el) el.classList.remove("dirty");
  refreshSaveButton();
}

function syncDirtyForKey(key){
  // Compare current working value to the saved snapshot.
  // If there's no snapshot yet (new record), compare to empty.
  const base = (savedSnapshot && savedSnapshot[key] != null) ? String(savedSnapshot[key]) : "";
  const cur = (working && working[key] != null) ? String(working[key]) : "";
  if (cur !== base) markDirty(key);
  else unmarkDirty(key);
}

function clearDirtyUI(){
  document.querySelectorAll(".field.dirty").forEach(el => el.classList.remove("dirty"));
  document.querySelectorAll("textarea.dirty, input.dirty").forEach(el => el.classList.remove("dirty"));
  dirtyFields.clear();
  // snapshot remains; UI is reset only
  refreshSaveButton();
}

function blankObject(){
  const o = { id: uid(), ADRESE_LOKACIJA: "" };
  for (const f of schema) o[f.key] = "";
  return o;
}

function setWorking(o, isNew){
  working = o;
  workingIsNew = !!isNew;
  dirtyFields.clear();

  // establish snapshot baseline for dirty tracking
  savedSnapshot = JSON.parse(JSON.stringify(working || {}));

  // address input
  setValueSafe("ADRESE_LOKACIJA", String(working.ADRESE_LOKACIJA || ""));
  setValueSafe("DURVJU_KODS_PIEKLUVE", String(working.DURVJU_KODS_PIEKLUVE || ""));
  // clear dirty state on address field wrapper
  document.querySelector('.field.addressStandalone')?.classList.remove("dirty");
  document.querySelector('.field[data-key="DURVJU_KODS_PIEKLUVE"]')?.classList.remove("dirty");

  buildForm($("formRoot"), working);
  // Re-apply record subtab filtering after rebuilding form (e.g., after JAUNS)
  if (activeTab === "record") setRecordSubtab(getRecordSubtab());
  // Apply IERAKSTS subtab filter to freshly built fields
  setRecordSubtab(getRecordSubtab());
  applySystemAddressStyle();
  updateCtxTitle();

  if (workingIsNew) setStatus("Jauns ieraksts (nav saglabāts).");
  else setStatus("Saglabāts.");
  refreshSaveButton();
  updateMiniMap();
  updateLocalOnlyHint_();
}


function discardUnsavedChangesIfNeeded(){
  if (dirtyFields.size === 0) return;
  // --- metadata/versioning (DB sync) ---
  const baseVersion = Number(working.version || 0);
  const nowIso = new Date().toISOString();
  if (!working.createdAt) working.createdAt = nowIso;
  if (!working.createdBy) working.createdBy = userLabel || "";
  working.updatedAt = nowIso;
  working.updatedBy = userLabel || "";
  working.isDeleted = false;
  working.version = baseVersion + 1;


  if (workingIsNew){
    // discard completely (discipline)
    working = null;
    workingIsNew = false;
    dirtyFields.clear();
    setStatus("Nesaglabāts JAUNS ieraksts atmests.", false);

    if (objects.length){
      currentId = currentId || objects[0].id;
      setWorking(structuredClone(getSavedById(currentId)), false);
    } else {
      createNewRecord();
      // but don't mark dirty
      dirtyFields.clear();
      refreshSaveButton();
      setStatus("Nav ierakstu. Izveido jaunu un SAGLABĀT.");
    }
    return;
  }

  // existing record: revert
  const saved = getSavedById(currentId);
  if (saved){
    setWorking(structuredClone(saved), false);
    setStatus("Nesaglabātas izmaiņas atmestas.", false);
  }
}

async function saveWorking(){
  if (!working) return;

  // no-op if should not save
  if (dirtyFields.size === 0) return;
  if (workingIsNew && !hasMeaningfulData(working)) return;

  // system address marker persists only if still flagged
  if (working.__addrSystem === true) {
    // keep for save below
  }

  if (workingIsNew){
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

  // address system tracking
  if (!workingIsNew && currentId){
    if (working.__addrSystem === true) addrSystemIds.add(currentId);
    saveAddrSystemIds();
  }

  // refresh snapshot baseline after local save
  savedSnapshot = JSON.parse(JSON.stringify(working || {}));

  clearDirtyUI();
  updateCtxTitle(); // title appears/updates ONLY after save
  refreshCatalog();
  refreshMarkers();
  updateMiniMap();

  // Svarīgi: vispirms paziņojam par lokālo saglabāšanu, sinhronizācija nāk pēc tam.
  pendingSync = true;
  if (dbOnline) setDbLed("pending");
  setStatus("Saglabāts lokāli (sinhronizējas)...", false);

  // mēģinām uzreiz aizsūtīt uz DB (ja sesija ir ok)
  const sessionOkNow = (sessionStorage.getItem(SESSION_OK_KEY) === "1");
  if (userLabel && sessionOkNow && dbOnline){
    const baseVersion = Number(savedSnapshot.version || 0);
    await pushUpsert(structuredClone(savedSnapshot), baseVersion);
  }
}

function createNewRecord(){
  const o = blankObject();
  o.__addrSystem = false;
  currentId = null; // not in catalog until save
  setWorking(o, true);
  dirtyFields.clear();
  updateCtxTitle(); // shows —
  refreshSaveButton();
  setStatus("Jauns ieraksts (nav saglabāts). Aizpildi un nospied SAGLABĀT.");
}

function buildForm(root, obj){

  root.innerHTML = "";

  for (const f of schema){
    const wrap = document.createElement("div");
    wrap.className = "field";
    wrap.dataset.key = f.key;
    wrap.dataset.subtab = SUBTAB_FOR_KEY[f.key] || "other";

    const label = document.createElement("label");
    label.textContent = f.label;
    label.htmlFor = f.key;

    // Special row: phone + call button
    if (f.key === "PIEKLUVES_KONTAKTI"){
      wrap.appendChild(label);

      const row = document.createElement("div");
      row.className = "fieldRow phoneRow";

      const phone = document.createElement("textarea");
      phone.id = f.key;
      phone.className = "input autogrow phoneField";
      phone.rows = 1;
      phone.placeholder = "tālrunis (tikai cipari)";
      phone.inputMode = "numeric";
      phone.autocapitalize = "off";
      phone.autocomplete = "tel";
      phone.maxLength = 18;
      phone.value = String((obj && obj[f.key] != null) ? obj[f.key] : "");

      const callBtn = document.createElement("button");
      callBtn.type = "button";
      callBtn.className = "btn success call";
      callBtn.id = "btnCall";
      callBtn.textContent = "ZVANĪT";

      function syncCallBtn(){
        const digits = (phone.value || "").replace(/\D+/g,"");
        callBtn.disabled = digits.length === 0;
      }

      phone.addEventListener("input", () => {
        if (!working) return;
        // digits only + max 18
        const cleaned = (phone.value || "").replace(/\D+/g,"").slice(0, 18);
        if (phone.value !== cleaned) phone.value = cleaned;

        working[f.key] = phone.value;
        syncDirtyForKey(f.key);
        try { autoGrow(phone); } catch(e){}
        syncCallBtn();
      });

      callBtn.addEventListener("click", () => {
        const digits = (phone.value || "").replace(/\D+/g,"");
        if (!digits) return;
        window.location.href = "tel:" + digits;
      });

      row.appendChild(phone);
      row.appendChild(callBtn);
      wrap.appendChild(row);

      try { autoGrow(phone); } catch(e){}
      syncCallBtn();

      root.appendChild(wrap);
      continue;
    }

    // Default: textarea
    const input = document.createElement("textarea");
    input.id = f.key;
    input.className = "input autogrow";
    input.rows = 1;
    input.value = String((obj && obj[f.key] != null) ? obj[f.key] : "");

    input.addEventListener("input", () => {
      if (!working) return;
      working[f.key] = input.value;
      syncDirtyForKey(f.key);
      try { autoGrow(input); } catch(e){}
    });

    wrap.appendChild(label);
    wrap.appendChild(input);
    root.appendChild(wrap);

    try { autoGrow(input); } catch(e){}
  }
}


// Address input (special)
function wireAddressInput(){
  const inp = $("ADRESE_LOKACIJA");
  if (!inp) return;
  inp.addEventListener("input", () => {
    if (!working) return;
    working.ADRESE_LOKACIJA = inp.value;
    // if user edits manually, drop system marker
    if (workingIsNew){
      working.__addrSystem = false;
    } else if (currentId) {
      addrSystemIds.delete(currentId);
      saveAddrSystemIds();
    }
    applySystemAddressStyle();

    // mark dirty UI on wrapper
    document.querySelector('.field.addressStandalone')?.classList.add("dirty");
    markDirty("ADRESE_LOKACIJA");
  });
}


function wireDoorCodeInput(){
  const inp = $("DURVJU_KODS_PIEKLUVE");
  if (!inp) return;
  inp.addEventListener("input", () => {
    if (!working) return;
    working.DURVJU_KODS_PIEKLUVE = inp.value;
    syncDirtyForKey("DURVJU_KODS_PIEKLUVE");
    try { autoGrow(inp); } catch(e){}
  });
}


// Geocoding (Nominatim)
async function geocodeAddress(address){
  const q = encodeURIComponent(address || "");
  const lang = getGeoLang();
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&addressdetails=1&accept-language=${encodeURIComponent(lang)}`;
  const res = await fetch(url, { headers: { "Accept": "application/json", "Accept-Language": lang } });
  if (!res.ok) throw new Error("Geocoding kļūda: " + res.status);
  const arr = await res.json();
  if (!arr?.length) return null;
  const item = arr[0];
  const a = item && item.address ? item.address : {};
  const road = a.road || a.pedestrian || a.footway || a.cycleway || "";
  const house = a.house_number || "";
  const city = a.city || a.town || a.village || a.municipality || "";
  let line1 = [road, house].filter(Boolean).join(" ").trim();
  if (!line1 && item && item.display_name){
    const parts = String(item.display_name).split(",").map(s=>s.trim()).filter(Boolean);
    // If first part is a number, treat second as street
    if (parts.length >= 2 && /^\d+[a-zA-Z]?$/i.test(parts[0]) && parts[1]) line1 = (parts[1] + " " + parts[0]).trim();
    else if (parts.length >= 1) line1 = parts[0];
  }
  let out = [line1, city].filter(Boolean).join(", ").trim();
  if (!out) out = (item && item.display_name) ? String(item.display_name) : "";
  return { lat: Number(item.lat), lng: Number(item.lon), pretty: out };
}

async function reverseGeocode(lat, lng){
  const lang = getGeoLang();
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=${encodeURIComponent(lang)}`;
  const res = await fetch(url, { headers: { "Accept": "application/json", "Accept-Language": lang } });
  if (!res.ok) throw new Error("Reverse geocoding kļūda: " + res.status);
  const data = await res.json();
  const a = data && data.address ? data.address : {};
  const road = a.road || a.pedestrian || a.footway || a.cycleway || "";
  const house = a.house_number || "";
  const city = a.city || a.town || a.village || a.municipality || "";
  const county = a.county || "";
  const state = a.state || "";
  let line1 = [road, house].filter(Boolean).join(" ").trim();
  let line2 = city || "";
  let out = [line1, line2].filter(Boolean).join(", ").trim();
  if (!out) out = (data && data.display_name) ? String(data.display_name) : "";
  return out;
}

// Address validation (writes pretty address ALL CAPS + LAT/LNG)
async function fillFromGPS(){
  if (!working) return;
  try{
    setStatus("GPS: nosaku lokāciju…", false);
    const me = await getCoords();
    working.LAT = String(me.lat);
    working.LNG = String(me.lng);
    const elLat = $("LAT");
    const elLng = $("LNG");
    if (elLat) elLat.value = working.LAT;
    if (elLng) elLng.value = working.LNG;

    markDirty("LAT");
    markDirty("LNG");

    // Try reverse geocoding (with one quick retry for mobile networks)
    let pretty = "";
    try { pretty = await reverseGeocode(me.lat, me.lng); } catch {}
    if (!pretty){
      await new Promise(r => setTimeout(r, 500));
      try { pretty = await reverseGeocode(me.lat, me.lng); } catch {}
    }

    if (pretty){
      working.ADRESE_LOKACIJA = String(pretty).toUpperCase();
      const elA = $("ADRESE_LOKACIJA");
      if (elA){
        elA.value = working.ADRESE_LOKACIJA;
        // keep focus on mobile + ensure it's visible
        try{
          elA.focus({ preventScroll: true });
          const len = elA.value.length;
          elA.setSelectionRange(len, len);
          elA.scrollIntoView({ block: "center", behavior: "smooth" });
        }catch{}
      }
      markDirty("ADRESE_LOKACIJA");
      setStatus("GPS: adrese + koordinātes ieliktas. Nospied SAGLABĀT.", true);
    }else{
      setStatus("GPS: koordinātes ieliktas, bet adresi no servisa neizdevās dabūt (internets / limits).", true);
    }

    refreshMarkers();
    updateMiniMap();
  }catch{
    setStatus("GPS: neizdevās (atļaujas / GPS / internets).", true);
  }
}

async function validateAddress(){
  if (!working) return;

  // Stable behavior: validate primarily by the ADDRESS field.
  // If address is empty but coordinates exist, then validate by coords (reverse).
  const address = String(working.ADRESE_LOKACIJA || "").trim();
  const coords = parseLatLng(working);

  if (!address && coords){
    try{
      setStatus("Validēju pēc koordinātēm…", false);
      const pretty = await reverseGeocode(coords.lat, coords.lng);
      if (!pretty){
        setStatus("Validācija: koordinātes ir, bet adresi no servisa neizdevās dabūt.", true);
        return;
      }
      working.ADRESE_LOKACIJA = String(pretty).toUpperCase();
      const elA = $("ADRESE_LOKACIJA");
      if (elA) elA.value = working.ADRESE_LOKACIJA;
      markDirty("ADRESE_LOKACIJA");
      refreshMarkers();
      updateMiniMap();
      setStatus("Validācija pabeigta. Nospied SAGLABĀT.", true);
    }catch{
      setStatus("Validācija pēc koordinātēm neizdevās (internets / serviss).", true);
    }
    return;
  }

  if (!address){
    setStatus("Nav adreses, ko validēt.", true);
    return;
  }

  try {
    setStatus("Validēju adresi un meklēju koordinātes…", false);
    const geo = await geocodeAddress(address);
    if (!geo){
      setStatus("Validācija: koordinātes neatradu (precizē adresi).", true);
      return;
    }
    // Persist coords
    working.LAT = String(geo.lat);
    working.LNG = String(geo.lng);
    const elLat = $("LAT");
    const elLng = $("LNG");
    if (elLat) elLat.value = working.LAT;
    if (elLng) elLng.value = working.LNG;

    // Canonicalize address display to ALL CAPS (stable expectation)
    const sysAddr = (geo.pretty || address || "").trim();
    working.ADRESE_LOKACIJA = sysAddr ? sysAddr.toUpperCase() : address.toUpperCase();
    const elA = $("ADRESE_LOKACIJA");
    if (elA) elA.value = working.ADRESE_LOKACIJA;

    // Dirty tracking
    syncDirtyForKey("LAT");
    syncDirtyForKey("LNG");
    syncDirtyForKey("ADRESE_LOKACIJA");

    refreshMarkers();
    updateMiniMap();
    setStatus("Adreses validācija pabeigta. Nospied SAGLABĀT.", true);
  } catch {
    setStatus("Adreses validācija neizdevās (internets / serviss).", true);
  }
}

// Distance / GPS
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

// Mini map
let miniMap = null;
let miniMarker = null;
function ensureMiniMap(){
  if (miniMap) return;
  miniMap = L.map("miniMap", { zoomControl: false, attributionControl:false, dragging:true, scrollWheelZoom:false, doubleClickZoom:false });
  miniMap.setView([56.9496, 24.1052], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(miniMap);
}

function updateMiniMap(){
  ensureMiniMap();
  setTimeout(() => miniMap.invalidateSize(), 50);

  if (!working) return;
  const c = parseLatLng(working);
  if (!c){
    if (miniMarker) { miniMap.removeLayer(miniMarker); miniMarker = null; }
    miniMap.setView([56.9496, 24.1052], 12);
    return;
  }
  if (!miniMarker) miniMarker = L.marker([c.lat, c.lng]).addTo(miniMap);
  else miniMarker.setLatLng([c.lat, c.lng]);
  miniMap.setView([c.lat, c.lng], 16);
}

// Main map tab
let map = null;
let markersLayer = null;
let meMarker = null;

function ensureMap(){
  if (map) return;
  map = L.map("map", { zoomControl: true });
  map.setView([56.9496, 24.1052], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  // long-press/right click to set coords to working record
  map.on("contextmenu", (e) => {
    if (!working) return;
    working.LAT = String(e.latlng.lat);
    working.LNG = String(e.latlng.lng);
    $("LAT").value = working.LAT;
    $("LNG").value = working.LNG;
    markDirty("LAT");
    markDirty("LNG");
    refreshMarkers();
    updateMiniMap();
    setMapStatus(`Ielikts LAT/LNG: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}. Nospied SAGLABĀT.`, true);
  });
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }

function objectPopupHtml(o){
  const title = titleFromRecord(o);
  const lines = [
    `<div style="font-weight:900;margin-bottom:6px;">${escapeHtml(title)}</div>`,
    o.ADRESES_LOKACIJAS_PIEZIMES ? `<div><b>Piezīmes:</b> ${escapeHtml(o.ADRESES_LOKACIJAS_PIEZIMES)}</div>` : "",
    o.DURVJU_KODS_PIEKLUVE ? `<div><b>Kods:</b> ${escapeHtml(o.DURVJU_KODS_PIEKLUVE)}</div>` : "",
    o.PIEKLUVES_KONTAKTI ? `<div><b>Kontakti:</b> ${escapeHtml(o.PIEKLUVES_KONTAKTI)}</div>` : "",
    `<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">` +
      `<button data-open="${o.id}" style="padding:6px 10px;border-radius:10px;border:1px solid #1f2a44;background:#1e293b;color:#e2e8f0;font-weight:800;">Atvērt</button>` +
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
    const m = L.marker([c.lat, c.lng]).addTo(markersLayer);
    m.bindPopup(objectPopupHtml(o), { maxWidth: 320 });
    m.on("popupopen", (e) => {
      const node = e.popup.getElement();
      node?.querySelectorAll("button[data-open]").forEach(btn => {
        btn.onclick = () => openRecordById(btn.getAttribute("data-open"));
      });
    });
  }
}

function openRecordById(id){
  const saved = getSavedById(id);
  if (!saved) return;
  currentId = id;
  saveCurrentId(currentId);
  setWorking(structuredClone(saved), false);
  updateLocalOnlyHint_();
  switchTab("record");
}

async function centerOnMe(){
  setMapStatus("Nosaku lokāciju…");
  const me = await getCoords();
  ensureMap();
  if (!meMarker) {
    meMarker = L.circleMarker([me.lat, me.lng], { radius: 8 }).addTo(map);
  } else meMarker.setLatLng([me.lat, me.lng]);
  map.setView([me.lat, me.lng], 16);
  setMapStatus(`Tu: ${me.lat.toFixed(5)}, ${me.lng.toFixed(5)} (±${Math.round(me.acc)}m)`);
  return me;
}

async function findNearestToMeAndFocus(){
  const me = await centerOnMe();
  const best = findNearestTo(me.lat, me.lng);
  if (!best) { setMapStatus("Nav objektu ar koordinātēm (LAT/LNG)."); return; }
  map.setView([best.c.lat, best.c.lng], 17);
  setMapStatus(`Tuvākais: ~${Math.round(best.d)}m.`);
}

// Auto-open nearest (opens record automatically)
let watchId = null;
let lastAutoSwitchAt = 0;
function isAutoEnabled(){ return localStorage.getItem(STORAGE_KEY_AUTOMODE) === "1"; }
function setAutoEnabled(on){ localStorage.setItem(STORAGE_KEY_AUTOMODE, on ? "1" : "0"); }
function getAutoRadius(){ const n = Number(localStorage.getItem(STORAGE_KEY_AUTORADIUS)); return Number.isFinite(n) && n>=20 ? n : 80; }
function setAutoRadius(n){ localStorage.setItem(STORAGE_KEY_AUTORADIUS, String(n)); }

function maybeStartAutoWatch(){
  if (!isAutoEnabled()) return;
  if (watchId !== null) return;
  if (!navigator.geolocation) { setMapStatus("Auto: geolocation nav pieejams."); return; }
  watchId = navigator.geolocation.watchPosition((pos) => {
    const now = Date.now();
    if (now - lastAutoSwitchAt < AUTO_COOLDOWN_MS) return;
    const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    const best = findNearestTo(me.lat, me.lng);
    if (!best) return;
    const radius = getAutoRadius();
    if (best.d > radius) return;

    lastAutoSwitchAt = now;

    // discard unsaved if needed (discipline)
    if (activeTab === "record" && dirtyFields.size > 0) discardUnsavedChangesIfNeeded();

    currentId = best.o.id;
    saveCurrentId(currentId);
    setWorking(structuredClone(getSavedById(currentId)), false);
    switchTab("record");
    setStatus(`Auto: atvērts tuvākais (~${Math.round(best.d)}m).`);
  }, () => {
    setMapStatus("Auto: lokācija nav pieejama (atļaujas / GPS).");
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 });
}

function stopAutoWatch(){
  if (watchId === null) return;
  try { navigator.geolocation.clearWatch(watchId); } catch {}
  watchId = null;
}

// Tabs
let activeTab = "record";
function switchTab(name){
  if (activeTab === "record" && name !== "record") discardUnsavedChangesIfNeeded();

  activeTab = name;
  updateSubHeaders();
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  $("tab-" + name).classList.remove("hidden");
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));

  if (name === "record") {
    try { setRecordSubtab(getRecordSubtab()); } catch(e) {}
  }

  if (name === "map") {
    ensureMap();
    setTimeout(() => map.invalidateSize(), 50);
    refreshMarkers();
    maybeStartAutoWatch();
  } else {
    stopAutoWatch();
  }
  if (name === "catalog") refreshCatalog();
}

// Catalog

function initCatalogSortUI_(){
  const az = document.getElementById("sortAZ");
  const za = document.getElementById("sortZA");
  const dt = document.getElementById("sortDATE");
  if(!az||!za||!dt) return;

  function apply(mode){
    catalogSortMode = mode;
    localStorage.setItem("vajagman_catalog_sort_v1", mode);
    az.classList.toggle("active", mode==="az");
    za.classList.toggle("active", mode==="za");
    dt.classList.toggle("active", mode==="date");
  }

  function setMode(mode){
    apply(mode);
    if(activeTab==="catalog") refreshCatalog();
  }

  az.addEventListener("click", ()=>setMode("az"));
  za.addEventListener("click", ()=>setMode("za"));
  dt.addEventListener("click", ()=>setMode("date"));

  // init state (no refresh if not on catalog yet)
  apply(catalogSortMode || "date");
}

function refreshCatalog(){
  const root = $("listRoot");
  const q = ($("search").value || "").toLowerCase().trim();
  const list = objects.filter(o => {
    if (o.isDeleted) return false;
    const t = `${o.OBJEKTA_NR||""} ${o.ADRESE_LOKACIJA||""}`.toLowerCase();
    return !q || t.includes(q);
  });
  list.sort((a,b)=>{
    const ta = Date.parse(a.updatedAt||a.createdAt||'') || 0;
    const tb = Date.parse(b.updatedAt||b.createdAt||'') || 0;
    const hasA = ta > 0;
    const hasB = tb > 0;

    // Vispirms rādam tos, kam NAV datuma (lokālie / nesinhronizētie)
    if (hasA != hasB) return hasA ? 1 : -1;

    const titleA = `${a.OBJEKTA_NR||""} ${a.ADRESE_LOKACIJA||""}`.trim().toLowerCase();
    const titleB = `${b.OBJEKTA_NR||""} ${b.ADRESE_LOKACIJA||""}`.trim().toLowerCase();

    // Ja abiem nav datuma, turam to pašu secību (alfabēts), lai saraksts nelec
    if (!hasA && !hasB) {
      return titleA.localeCompare(titleB, 'lv');
    }

    if (catalogSortMode === "az") {
      return titleA.localeCompare(titleB, 'lv');
    }
    if (catalogSortMode === "za") {
      return titleB.localeCompare(titleA, 'lv');
    }

    // date (default): vissvaigākie augšā
    return tb - ta;
  });
;;;;

  // Avoid empty flicker during short sync windows: if list is temporarily empty while syncing, keep the last visible list.
  const syncingNow = isSyncBusy_();
  if (!list.length && syncingNow && lastCatalogHasItems_ && root.children.length > 0) {
    return;
  }

  root.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "item";
    empty.innerHTML = `<div class="itemTitle">Nav ierakstu</div><div class="itemMeta">IERAKSTS → JAUNS → SAGLABĀT.</div>`;
    root.appendChild(empty);
    lastCatalogHasItems_ = false;
    lastCatalogHtml_ = root.innerHTML;
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
    title.textContent = titleFromRecord(o);

    const meta = document.createElement("div");
    meta.className = "itemMeta";
    const ts = fmtIsoLocal_(o.updatedAt || o.createdAt);
    meta.textContent = ts ? `Pēdējā izmaiņa: ${ts}` : "";

    const obIt = outboxStateForId_(o.id);
    const isLocalOnly = !!obIt || !ts || Number(o.version || 0) <= 0;
    if (isLocalOnly){
      const flag = document.createElement('div');
      flag.className = 'itemFlag';
      let reason = '';
      if (!dbOnline) reason = 'nav interneta';
      else if (!sessionOkNow_()) reason = 'jāielogojas';
      else if (obIt && (obIt.state === 'blocked' || obIt.lastError)) reason = 'jāpārskata';
      flag.textContent = reason ? (`⚠️ Saglabāts tikai šeit — ${reason}`) : '⚠️ Saglabāts tikai šeit';
      left.appendChild(flag);
    }

    left.appendChild(title);
    left.appendChild(meta);

    top.appendChild(left);

    const btns = document.createElement("div");
    btns.className = "itemBtns";

    const btnOpen = document.createElement("button");
    btnOpen.className = "btn primary";
    btnOpen.textContent = "ATVĒRT";
    btnOpen.onclick = () => openRecordById(o.id);

    const btnMap = document.createElement("button");
    btnMap.className = "btn";
    btnMap.textContent = "KARTE";
    btnMap.onclick = () => {
      switchTab("map");
      ensureMap();
      refreshMarkers();
      const c = parseLatLng(o);
      if (c) map.setView([c.lat, c.lng], 17);
    };

    const btnDel = document.createElement("button");
    btnDel.className = "btn danger";
    btnDel.textContent = "DZĒST";
    btnDel.onclick = () => {
      if (!confirm("Dzēst ierakstu?")) return;
      const idx = objects.findIndex(x => x.id === o.id);
      if (idx < 0) return;
      const baseVersion = Number(objects[idx].version || 0);

      // Ja ieraksts vēl nav DB (version=0), tad DZĒST nozīmē: izdzēst tikai lokāli.
      if (baseVersion <= 0){
        objects.splice(idx, 1);
        saveObjects();
        removeOutboxForId_(o.id);
        addrSystemIds.delete(o.id);
        saveAddrSystemIds();
        if (currentId === o.id) {
          currentId = objects.find(x => !x.isDeleted)?.id ?? null;
          saveCurrentId(currentId);
        }
        refreshCatalog();
        refreshMarkers();
        if (currentId) setWorking(structuredClone(getSavedById(currentId)), false);
        else createNewRecord();
        setStatus("Izdzēsts lokāli.");
        return;
      }

      const nowIso = new Date().toISOString();
      objects[idx].isDeleted = true;
      objects[idx].updatedAt = nowIso;
      objects[idx].updatedBy = userLabel || "";
      objects[idx].version = baseVersion + 1;
      saveObjects();
      addrSystemIds.delete(o.id);
      saveAddrSystemIds();
      if (currentId === o.id) currentId = objects.find(x=>!x.isDeleted)?.id ?? null;
      refreshCatalog();
      refreshMarkers();
      if (currentId) setWorking(structuredClone(getSavedById(currentId)), false);
      else createNewRecord();
      pushDelete(o.id, baseVersion);
      setStatus("Dzēsts.");
    };

    btns.appendChild(btnOpen);
    btns.appendChild(btnMap);
    btns.appendChild(btnDel);

    el.appendChild(top);
    el.appendChild(btns);

    el.addEventListener("click", (ev) => {
      if (ev.target && ev.target.closest("button")) return;
      openRecordById(o.id);
    });

    root.appendChild(el);
  }

  // cache last render for UI stability
  lastCatalogHasItems_ = list.length > 0;
  lastCatalogHtml_ = root.innerHTML;
}


// Export JSON (vēsturiska funkcija) noņemts

// PWA
async function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  try { await navigator.serviceWorker.register("./service-worker.js"); } catch {}
}

// --- Session / resume handling (mobile browsers sometimes restore a "frozen" page) ---
// We keep the USER label in localStorage, but require PIN again for each new "session".
const SESSION_OK_KEY = "vm_session_ok";          // sessionStorage: "1" when PIN verified
const LAST_HIDDEN_TS_KEY = "vm_last_hidden_ts";  // sessionStorage: epoch ms

function clearSessionAuth_(){
  try { sessionStorage.removeItem(SESSION_OK_KEY); } catch {}
}

function markSessionAuthOk_(){
  try { sessionStorage.setItem(SESSION_OK_KEY, "1"); } catch {}
}

function isSessionAuthOk_(){
  try { return sessionStorage.getItem(SESSION_OK_KEY) === "1"; } catch { return false; }
}

function initResumeGuards_(){
  // If the page is restored from BFCache, do a clean reload (prevents "half-dead" JS state).
  window.addEventListener("pageshow", (ev) => {
    if (ev && ev.persisted) {
      clearSessionAuth_();
      try { sessionStorage.removeItem(LAST_HIDDEN_TS_KEY); } catch {}
      // local changes are persisted in localStorage, so reload is safe.
      window.location.reload();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      try { sessionStorage.setItem(LAST_HIDDEN_TS_KEY, String(Date.now())); } catch {}
      return;
    }
    // Visible again
    let lastHidden = 0;
    try { lastHidden = Number(sessionStorage.getItem(LAST_HIDDEN_TS_KEY) || 0); } catch {}
    const awayMs = lastHidden ? (Date.now() - lastHidden) : 0;
    // If the app was in background for a bit, re-auth and reload to avoid freezes.
    if (awayMs > 15000) {
      clearSessionAuth_();
      window.location.reload();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {

  initDiagnostics_();
  initAddToHomeScreen_();
  objects = loadObjects();
  addrSystemIds = loadAddrSystemIds();
  currentId = loadCurrentId();

  wireHeaderActions();
  updateHdrActionBar();
  initCatalogSortUI_();


  wireHeaderActions();
  updateHdrActionBar();

  // Address wire-up
  wireAddressInput();
  wireDoorCodeInput();
  initRecordSubtabs();
  // On app start, always open MAIN subtab (user can switch afterwards)
  localStorage.setItem("vm_record_subtab","main");
  setRecordSubtab("main");

  if (currentId) {
    setWorking(structuredClone(getSavedById(currentId)), false);
  } else {
    createNewRecord();
    dirtyFields.clear();
    refreshSaveButton();
    setStatus("Nav ierakstu. Izveido jaunu un SAGLABĀT.");
  }

  // Tabs
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

  // Map tab buttons
  $("btnCenterMe").addEventListener("click", () => centerOnMe());
  $("btnFindNearest").addEventListener("click", () => findNearestToMeAndFocus());

  // Validation button in map block (mini map header)
  
  // Auto settings
  $("autoOpenToggle").checked = isAutoEnabled();
  $("autoRadius").value = String(getAutoRadius());
  $("autoOpenToggle").addEventListener("change", () => {
    setAutoEnabled($("autoOpenToggle").checked);
    if ($("autoOpenToggle").checked) maybeStartAutoWatch();
    else stopAutoWatch();
  });
  $("autoRadius").addEventListener("change", () => {
    const n = Number($("autoRadius").value);
    setAutoRadius(Number.isFinite(n) ? n : 80);
  });

  // Catalog
  $("search").addEventListener("input", refreshCatalog);
  // Export JSON noņemts

  // Mini map
  updateMiniMap();

  // Auto-grow textareas
  wireAutoGrow();

  registerSW();

  // Page resume handling (Android/Chrome sometimes restores a frozen page)
  initResumeHandling();

  // --- Auth + initial DB sync ---
  ensureAuth();
  // Periodiska sinhronizācija (ja lietotājs ir autorizēts)
  setInterval(() => { if (userLabel) fullSync(); }, 30000);
});

function updateSubHeaders(){
  const rec=document.querySelector('.hdr-sub-record');
  const map=document.querySelector('.hdr-sub-map');
  const cat=document.querySelector('.hdr-sub-catalog');
  if(!rec||!map||!cat) return;
  rec.classList.toggle('hidden',activeTab!=='record');
  map.classList.toggle('hidden',activeTab!=='map');
  cat.classList.toggle('hidden',activeTab!=='catalog');
}

function autoGrow(el){
  if(!el) return;
  const rootStyle = getComputedStyle(document.documentElement);
  const minFromCss = parseInt(rootStyle.getPropertyValue('--control-h')) || 36;
  const min = minFromCss;
  el.style.height = "auto";
  const h = Math.max(min, el.scrollHeight);
  el.style.height = h + "px";
}
function wireAutoGrow(){
  document.querySelectorAll('textarea.autogrow').forEach(el=>{
    autoGrow(el);
    el.addEventListener('input', ()=>autoGrow(el));
  });
}

function initResumeHandling(){
  // If the page is restored from back/forward cache, force a clean reload.
  window.addEventListener("pageshow", (ev) => {
    if (ev && ev.persisted) {
      try { sessionStorage.removeItem(SESSION_OK_KEY); } catch {}
      // We rely on localStorage for unsaved data, so reload is safe.
      location.reload();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      try { sessionStorage.setItem(LAST_HIDDEN_TS_KEY, String(Date.now())); } catch {}
      return;
    }

    // When returning from background, request PIN again and reload to avoid UI freeze.
    let last = 0;
    try { last = Number(sessionStorage.getItem(LAST_HIDDEN_TS_KEY) || 0); } catch {}
    const dt = last ? (Date.now() - last) : 0;
    if (dt > 15000) {
      try { sessionStorage.removeItem(SESSION_OK_KEY); } catch {}
      location.reload();
    } else {
      // Quick alt-tab: just refresh status.
      updateDbLed(true);
    }
  });

  // Extra safety: on focus after a longer pause, require PIN.
  window.addEventListener("focus", () => {
    let last = 0;
    try { last = Number(sessionStorage.getItem(LAST_HIDDEN_TS_KEY) || 0); } catch {}
    if (last && (Date.now() - last) > 15000) {
      try { sessionStorage.removeItem(SESSION_OK_KEY); } catch {}
      // Do not reload here; visibilitychange should already have done it.
    }
  

// Online/offline triggeri: pēc interneta atjaunošanās mēģinām iestumt outbox uz DB
window.addEventListener("online", async () => {
  dbOnline = true;
  setDbLed("online");
  await flushOutbox();
});
window.addEventListener("offline", () => {
  dbOnline = false;
  setDbLed("offline");
});

// Periodiski mēģinām iztukšot outbox, ja viss ir OK (neuzbāzīgi)
setInterval(() => { flushOutbox(); }, 45000);
});
}