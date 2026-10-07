// Walk mode: the phone speaks each prompt at its time mark, then saves the
 the agent said they will try. Nothing leaves the device.

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

export function marks(p) {
  // spread the stops across the walk, leaving the last couple of minutes for the walk back
  const usable = Math.max(p.mins - 2, p.stops.length);
  return p.stops.map((_, i) => Math.round(1 + (i * (usable - 1)) / Math.max(1, p.stops.length - 1 || 1)));
}

// ---------- walk mode ----------
let current = null, timer = null, startAt = 0, schedule = [], spoken = new Set(), lastSaid = "", wakeLock = null;
function say(text) {
  lastSaid = text; $("now").textContent = text;
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; speechSynthesis.speak(u); } catch {}
}
function fmt(s) { return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); }
export async function startWalk(p) {
  current = p;
  const m = marks(p);
  schedule = [{ at: 0, text: p.opener }, ...p.stops.map((s, i) => ({ at: m[i] * 60, text: s.ask, listen: s.listen })), { at: p.mins * 60, text: p.close, end: true }];
  spoken = new Set(); startAt = Date.now();
  $("walk").classList.remove("hidden"); $("after").classList.add("hidden");
  $("walkWho").textContent = p.who ? "Walking with " + p.who : "";
  try { wakeLock = await navigator.wakeLock.request("screen"); } catch {}
  tick(); timer = setInterval(tick, 1000);
}
function tick() {
  // Timing comes from the clock, not from counting intervals, so a throttled tab still fires on time.
  const el = (Date.now() - startAt) / 1000;
  $("clock").textContent = fmt(el);
  schedule.forEach((s, i) => {
    if (el >= s.at && !spoken.has(i)) {
      spoken.add(i);
      say(s.text);
      if (s.end) finishWalk(false);
    }
  });
  const nx = schedule.find((s, i) => !spoken.has(i));
  $("next").textContent = nx ? "Next prompt at " + fmt(nx.at) : "";
}
function finishWalk(early) {
  clearInterval(timer); timer = null;
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  if (early) { try { speechSynthesis.cancel(); } catch {} $("now").textContent = "Walk ended."; }
  $("after").classList.remove("hidden");
}
$("repeatBtn").onclick = () => lastSaid && say(lastSaid);
$("endBtn").onclick = () => finishWalk(true);
$("saveBtn").onclick = () => {
  const mins = Math.max(1, Math.round((Date.now() - startAt) / 60000));
  const log = store.get("walks", []);
  log.unshift({ date: new Date().toISOString().slice(0, 10), who: current.who || "", mins, commit: $("commit").value.trim() });
  store.set("walks", log.slice(0, 200));
  $("commit").value = ""; $("walk").classList.add("hidden"); renderLog();
};

export function renderLog() {
  const log = store.get("walks", []);
  $("logBody").innerHTML = log.length ? "" : '<tr><td colspan="4" class="note">No walks yet.</td></tr>';
  log.forEach(r => { const tr = document.createElement("tr"); [r.date, r.who, r.mins, r.commit].forEach(v => { const td = document.createElement("td"); td.textContent = v; tr.appendChild(td); }); $("logBody").appendChild(tr); });
}
$("csvBtn").onclick = () => {
  const q = v => '"' + String(v).replace(/"/g, '""') + '"';
  const rows = [["date", "with", "minutes", "will_try"], ...store.get("walks", []).map(r => [r.date, r.who, r.mins, r.commit])];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
  a.download = "walks.csv"; a.click();
};
renderLog();
