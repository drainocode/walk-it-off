import { demoPlan } from "./plan.js";

// ---------- model backends (all open-weight, all local) ----------
export const WEBLLM_MODELS = [
  { id: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma 2 2B (about 1.9 GB, cached after first load)" },
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 1.5B (about 1.6 GB)" },
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B (about 2.3 GB)" }
];

export class Engine {
  constructor(kind, model) { this.kind = kind; this.model = model; }
  async load(onProgress) {
    if (this.kind === "webllm") {
      if (!("gpu" in navigator)) throw new Error("No WebGPU in this browser. Use recent Chrome or Edge on a laptop, or pick Ollama.");
      const webllm = await import("https://esm.run/@mlc-ai/web-llm");
      this.mlc = await webllm.CreateMLCEngine(this.model, { initProgressCallback: p => onProgress(p.text || "", p.progress || 0) });
    } else if (this.kind === "ollama") {
      const r = await fetch("http://localhost:11434/api/tags");
      if (!r.ok) throw new Error("Ollama answered " + r.status);
      const names = ((await r.json()).models || []).map(m => m.name);
      if (!names.some(n => n === this.model || n.startsWith(this.model + ":"))) throw new Error("Ollama is running but " + this.model + " is not pulled. Run: ollama pull " + this.model);
      onProgress("Connected to Ollama", 1);
    } else onProgress("Demo mode, no model loaded", 1);
  }
  async ask(system, user) {
    if (this.kind === "webllm") {
      // Gemma's chat template has no system role, so fold it into the user turn.
      const msgs = /gemma/i.test(this.model) ? [{ role: "user", content: system + " " + user }] : [{ role: "system", content: system }, { role: "user", content: user }];
      const r = await this.mlc.chat.completions.create({ messages: msgs, temperature: 0.5, max_tokens: 700 });
      return r.choices[0].message.content || "";
    }
    if (this.kind === "ollama") {
      const r = await fetch("http://localhost:11434/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, stream: false, format: "json", options: { temperature: 0.5 }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }) });
      if (!r.ok) throw new Error("Ollama error " + r.status);
      return ((await r.json()).message || {}).content || "";
    }
    return demoPlan(user);
  }
}
