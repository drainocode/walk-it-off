// ---------- planning ----------
import { systemPrompt } from "./prompt.js";
export const stopCount = mins => Math.max(2, Math.min(5, Math.round(mins / 5)));

export function planPrompt(who, notes, goal, mins) {
  const n = stopCount(mins);
  const system = systemPrompt(n);
  const user = `Walking with: ${who || "the agent"} Walk length: ${mins} minutes What happened: ${notes || "(no notes)"} What the lead wants them to leave with: ${goal || "(not given)"} JSON only.`;
  return { system, user, n };
}

const FALLBACK = [
  { ask: "What part of today went better than you expected?", listen: "Let them pick it. Agree with something specific." },
  { ask: "Talk me through the call that stuck with you. What was going on for you in that moment?", listen: "Do not fix yet. Ask what they noticed in themselves." },
  { ask: "If that same customer rang tomorrow, what would you say in the first thirty seconds?", listen: "Help them land one real sentence they could say." },
  { ask: "What would make tomorrow's first hour easier for you?", listen: "Offer one thing you can do as their lead." },
  { ask: "What is the one thing you will try on your next hard call?", listen: "Get it in their words. Repeat it back once." }
];

// Small models break JSON and miscount. Pull out the object, keep only clean
// strings, and fill or trim to the right number of stops from a tested bank.
export function parsePlan(raw, n) {
  let obj = null;
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a >= 0 && b > a) { try { obj = JSON.parse(raw.slice(a, b + 1)); } catch { obj = null; } }
  const clean = s => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, 240) : "");
  const stops = (obj && Array.isArray(obj.stops) ? obj.stops : []).map(s => ({ ask: clean(s && s.ask), listen: clean(s && s.listen) })).filter(s => s.ask.length > 8);
  const used = new Set(stops.map(s => s.ask));
  const bank = FALLBACK.filter(f => !used.has(f.ask));
  while (stops.length < n && bank.length) {
    // keep the commitment question last
    stops.push(bank.splice(stops.length === n - 1 ? bank.length - 1 : 0, 1)[0]);
  }
  // too many: keep the opening ones and the final commitment question
  if (stops.length > n) stops.splice(n - 1, stops.length - n);
  return {
    opener: clean(obj && obj.opener) || "Let's get some air. Phones away, we will just walk for a bit.",
    stops,
    close: clean(obj && obj.close) || "Good walk. Let's head back, and say that one thing again on the way in.",
    fromModel: !!obj
  };
}

export function demoPlan(user) {
  const who = (user.match(/Walking with: (.*)/) || [])[1] || "them";
  const mins = (user.match(/Walk length: (\d+)/) || [])[1] || "15";
  const notes = ((user.match(/What happened: (.*)/) || [])[1] || "").toLowerCase();
  const hard = /refund/.test(notes) ? "that refund call" : /supervisor|escalat/.test(notes) ? "the call that got escalated" : "the hard call";
  return JSON.stringify({
    opener: `Come on ${who}, ${mins} minutes of fresh air. No screens, no stats.`,
    stops: [
      { ask: "What went well today, even something small?", listen: "Name back one thing you saw them do well." },
      { ask: `Take me back to ${hard}. What were you thinking when it started to go wrong?`, listen: "Listen for the moment they froze. Do not judge it." },
      { ask: "If it happened again tomorrow, what would you want to say first?", listen: "Help them shape one short sentence." },
      { ask: "What is one thing you will try on the next tough call?", listen: "Get it in their words. Repeat it once." }
    ],
    close: "Right, let's head back in. You did fine today."
  });
}

