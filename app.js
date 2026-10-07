import { Engine, WEBLLM_MODELS } from "./engine.js";
import { planPrompt, parsePlan, stopCount } from "./plan.js";
import { marks, startWalk, renderLog } from "./walk.js";

// ---------- UI ----------
const $ = id => document.getElementById(id);
let plan = null, engine = null;

const params = new URLSearchParams(location.search);
const kindSel = $("engineKind");
WEBLLM_MODELS.forEach(m => $("model").add(new Option(m.label, m.id)));
if (params.get("engine")) kindSel.value = params.get("engine");
function syncEngineUI() {
  const k = kindSel.value;
  $("model").classList.toggle("hidden", k !== "webllm");
  $("ollamaModel").classList.toggle("hidden", k !== "ollama");
  $("modelBox").classList.toggle("hidden", k === "demo");
  $("engineNote").textContent = k === "ollama" ? "Start Ollama with OLLAMA_ORIGINS set to this site's address." : "";
  engine = null;
}
kindSel.onchange = syncEngineUI; $("model").onchange = () => engine = null; syncEngineUI();

function status(t, p) { $("status").textContent = t; if (p != null) $("bar").style.width = Math.round(p * 100) + "%"; }

$("planBtn").onclick = async () => {
  $("planBtn").disabled = true;
  try {
    const kind = kindSel.value;
    const model = kind === "ollama" ? $("ollamaModel").value.trim() : $("model").value;
    if (!engine || engine.kind !== kind || engine.model !== model) {
      engine = new Engine(kind, model);
      status("Loading the model. The first time takes a few minutes; after that it is cached on this computer.", 0);
      await engine.load((t, p) => status(t, p));
    }
    status("Planning the walk...", 1);
    const mins = Number($("mins").value);
    const { system, user, n } = planPrompt($("who").value.trim(), $("notes").value.trim(), $("goal").value.trim(), mins);
    const raw = await engine.ask(system, user);
    plan = parsePlan(raw, n);
    plan.mins = mins; plan.who = $("who").value.trim();
    renderPlan();
    status(plan.fromModel ? "Plan ready. Edit it, then go outside." : "The model's answer was not usable, so a standard plan was filled in. Edit it to fit.", 1);
  } catch (e) { status("Problem: " + e.message, 0); }
  $("planBtn").disabled = false;
};

function renderPlan() {
  const m = marks(plan);
  const box = $("stops"); box.innerHTML = "";
  const add = (title, key, idx, field) => {
    const d = document.createElement("div"); d.className = "stop";
    d.innerHTML = `<b>${title}</b>`;
    const t = document.createElement("textarea");
    t.value = idx == null ? plan[key] : plan.stops[idx][field];
    t.oninput = () => { if (idx == null) plan[key] = t.value; else plan.stops[idx][field] = t.value; };
    d.appendChild(t); box.appendChild(d); return d;
  };
  add("Start, as you step outside", "opener");
  plan.stops.forEach((s, i) => {
    const d = add(`Minute ${m[i]}: ask`, null, i, "ask");
    const l = document.createElement("textarea"); l.value = s.listen; l.oninput = () => plan.stops[idx].listen = l.value;
    const lb = document.createElement("b"); lb.textContent = "Listen for";
    d.appendChild(lb); d.appendChild(l);
  });
  add(`Minute ${plan.mins}: walk back in`, "close");
  $("plan").classList.remove("hidden");
  $("phoneBox").classList.add("hidden");
}

// ---------- phone hand-off ----------
function encodePlan(p) {
  const slim = { o: p.opener, c: p.close, m: p.mins, w: p.who, s: p.stops.map(s => [s.ask, s.listen]) };
  return btoa(unescape(encodeURIComponent(JSON.stringify(slim))));
}
function decodePlan(h) {
  const x = JSON.parse(decodeURIComponent(escape(atob(h))));
  return { opener: x.o, close: x.c, mins: x.m, who: x.w, stops: x.s.map(([ask, listen]) => ({ ask, listen })) };
}
$("phoneBtn").onclick = async () => {
  const url = location.origin + location.pathname + "#plan=" + encodePlan(plan);
  $("phoneLink").href = url; $("phoneBox").classList.remove("hidden"); $("qr").textContent = "";
  try {
    await new Promise((ok, bad) => { if (window.qrcode) return ok(); const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
    const q = window.qrcode(0, "L"); q.addData(url); q.make();
    $("qr").innerHTML = q.createImgTag(4, 8);
  } catch { $("qr").textContent = "QR code needs a connection. Use the link instead."; }
};
$("printBtn").onclick = () => window.print();
$("startBtn").onclick = () => startWalk(plan);


// A plan sent from the laptop arrives in the URL hash.
if (location.hash.startsWith("#plan=")) {
  try { plan = decodePlan(location.hash.slice(6)); renderPlan(); $("setup").classList.add("hidden"); status("", null); }
  catch { status("That plan link looks broken. Plan the walk again on the laptop.", 0); }
}

// exposed for the test page
window.__walk = { parsePlan, marks, encodePlan, decodePlan, stopCount };
