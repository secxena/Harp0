# HARP0 – Privacy-Preserving AI Gateway

HARP0 is our Zypherpunk x 5ire fork for the Zcash Privacy Hackathon. We turned the original 5ire desktop assistant into a privacy firewall for LLM workflows:

* **Privacy pipeline** – leak detection, redaction, and policy routing run before any provider call.
* **Per‑message transparency** – every reply carries metadata showing what was redacted and where it was routed.
* **Privacy drawer & panel** – live configuration for providers, detectors, and custom literals plus a sidebar dashboard summarising recent detections.
* **Zcash/ZK demo** – mock testnet balances and threshold proofs (balance ≥ X) surfaced directly in the UI for judging.

![HARP0 screenshot](docs/assets/privacy-panel.png)

> This repository already contains the privacy features described below. Follow the quick-start instructions to build or run the desktop app.

---

## Table of contents

1. [Features](#features)
2. [Quick start](#quick-start)
3. [Development](#development)
4. [Privacy controls](#privacy-controls)
5. [Zcash proof demo](#zcash-proof-demo)
6. [Project structure](#project-structure)

---

## Features

### Privacy pipeline
* Regex-based leak detector with severity scoring (emails, API keys, wallets, credit cards, etc.)
* Policy engine chooses local vs. remote providers, blocks requests, and dictates redaction rules.
* Redaction mapping is preserved locally so UI can restore the original text for the user.

### Privacy UI
* **Message toolbar** shows per-message privacy status and opens the detector detail dialog.
* **Privacy config drawer** (shield icon in chat header) lets users:
  - Edit default/local provider lists and sensitivity thresholds.
  - Register custom strings that must always be redacted.
  - Enable/disable every detector category via checkboxes.
* **Sidebar privacy panel** summarises total messages inspected, high-sensitivity counts, redactions, top entity types, and recent events.

### Zcash/ZK demo
* Mock testnet balance lookup based on a deterministic hash of the address.
* Threshold proof generator (proof shows commitment, balance, threshold, validity) to illustrate future ZK integrations.

### MCP + multi-provider support
* Everything from upstream 5ire remains: multi-provider chat interface (OpenAI, Anthropic, Google, Ollama, etc.), MCP tools, knowledge base, bookmarks, prompt library, analytics, and one-click packaging.

---

## Quick start

> Building requires Node.js 18+ and npm. For MCP tooling you’ll also need Python + uv (see [INSTALLATION.md](INSTALLATION.md)).

```bash
# install dependencies
npm install

# run in development mode
npm start

# package desktop app
npm run package
```

Environment variables for providers, Axiom telemetry, or MCP servers follow the upstream 5ire instructions (see [INSTALLATION.md](INSTALLATION.md) and [DEVELOPMENT.md](DEVELOPMENT.md)).

---

## Development

Useful scripts:

```bash
npm run lint        # eslint + prettier
npm run test        # jest (ts-jest)
npm run build:main  # build electron main process
npm run build:renderer
npm run start:main
npm run start:renderer
```

The project uses Electron + React (Electron React Boilerplate). Source lives in `src/` with the usual separation:

* `src/main` – Electron main process, privacy policy loader, mock Zcash endpoints.
* `src/renderer` – React UI (chat, privacy drawer, sidebar).
* `src/privacy` – leak detector, policy engine, privacy router.
* `src/intellichat` – chat services, provider integration.

---

## Privacy controls

1. **Privacy button (chat header)** – opens the drawer.
   - Configure routing: default providers vs. local-only.
   - Set sensitivity thresholds.
   - Register custom literals for forced redaction.
   - Toggle any detector category via checkboxes.
2. **Message toolbar** – shows privacy status for individual replies; click to view detections/redactions.
3. **Sidebar panel** – switch to the “Privacy” tab to see aggregate analytics per chat.

Configuration is saved to `privacy-policy.yaml` in your user data directory (e.g., `~/Library/Application Support/5ire/`). Restart the app if you edit the file manually; changes via the drawer take effect immediately.

---

## Zcash proof demo

Inside the privacy drawer you’ll find the **Zcash demo** section:

1. Enter any address (string). We hash it to produce a deterministic mock balance.
2. Click **Fetch balance** to view the pseudo testnet balance.
3. Set a threshold and click **Generate proof** to produce a mock commitment indicating whether the balance meets the threshold.

The proof object is available to future MCP/ZK integrations, and we emit telemetry events via the existing Axiom pipeline.

---

## Project structure

```
├── config/                     # privacy-policy examples
├── docs/                       # hackathon plan + assets
├── src/
│   ├── main/                   # electron main process
│   ├── renderer/               # React UI
│   ├── privacy/                # leak detector, policy engine, router
│   ├── intellichat/            # chat services/providers
│   └── vendors/axiom.ts        # telemetry wrapper
├── test/privacy                # leak detector jest tests
├── INSTALLATION.md             # detailed install guide
├── DEVELOPMENT.md              # development environment guide
└── README.md                   # (this file)
```

---

## License

HARP0 inherits the 5ire license (Modified Apache-2.0). See [LICENSE](LICENSE).
