# Walk It Off

A walking debrief planner for contact centre team leads. Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 1 (Touch Grass), between 6 and 11 October 2026.

After a hard shift, the usual debrief happens at a desk in front of the QA screen. Walk It Off moves it outside. The lead types what happened, an open-weight model running on the lead's own computer turns it into a short walk plan (an opener, two to five questions at time marks, a line for the walk back), and then the phone goes in a pocket. At each time mark the phone vibrates and reads the next question aloud.

## Why it runs on open models

The notes are about a person's bad day at work. They should not go to a cloud API. The model runs in the browser tab (MLC WebLLM on WebGPU) or in Ollama on the same machine, so nothing typed into the form leaves the computer. Once the model is cached it works offline and costs nothing per walk.

## Run it

Open the page (GitHub Pages) in a recent Chrome or Edge on a laptop.
- **In the browser:** pick Gemma 2 2B (default), Qwen 2.5 1.5B or Llama 3.2 3B. The first load downloads the weights once (about 1.6 to 2.3 GB) and caches them.
- **Ollama:** `ollama pull gemma3:4b`, then start Ollama with `OLLAMA_ORIGINS` set to the page's address and pick Ollama.
- **Demo:** add `?engine=demo` to the URL to see the flow with scripted output and no model.

"Send to my phone" puts the plan (not the notes) into the part of the link after `#`, which browsers do not send to the server, and shows a QR code.

## Files

- `index.html`: the page and its styles
- `engine.js`: WebLLM, Ollama and demo backends
- `plan.js`: the prompt, and a parser that repairs small-model JSON (wrong stop count, broken JSON, empty fields) from a fixed question bank
- `walk.js`: walk mode (clock-based timer, speech, vibration, screen wake lock) and the local walk log with CSV export
- `app.js`: wires it together

## Credits

Uses [MLC WebLLM](https://github.com/mlc-ai/web-llm) (Apache 2.0) and [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT). Built by directing AI coding tools.

MIT licence.
