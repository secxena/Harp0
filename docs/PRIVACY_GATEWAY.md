Here’s a detailed markdown file you can drop in your fork as
`docs/PRIVACY_GATEWAY_PLAN.md` (or `ZYHPERPUNK_PLAN.md`) and hand to Codex.

---

# Zypherpunk x 5ire – Privacy-Preserving AI Gateway

## 1. What we’re building

We’re forking **[5ire](https://github.com/nanbingxyz/5ire)** – a cross-platform desktop AI assistant & MCP client that already integrates with multiple AI providers and supports local knowledge bases and tools:contentReference[oaicite:0]{index=0}:contentReference[oaicite:1]{index=1} – and turning it into a:

> **Privacy-Preserving AI Gateway**  
> A desktop app that routes all AI traffic through a local “privacy firewall” with:
> - Leak-detection  
> - Policy-based routing (local vs remote models)  
> - Redaction & selective disclosure  
> - Optional Zcash/ZK-based proofs or payments

This gateway will be our submission for the **ZYPHERPUNK – Zcash Privacy Hackathon**, under the **Privacy-Preserving AI & Computation** theme.

### High-level goals

1. **Never send secrets blindly to external models.**  
   All prompts pass through a local leak-detection & policy engine.

2. **Use the best model for each task while respecting privacy.**  
   Sensitive content → local/self-hosted models.  
   Non-sensitive content → external providers (OpenAI, Anthropic, etc.).

3. **Give the user visibility & control.**  
   Show which providers saw what, what was redacted, and why.

4. **Integrate with Zcash / ZK where it makes sense.**  
   For example: ZK proofs of ownership/attributes, or Zcash-backed payments for usage.

---

## 2. What 5ire already gives us

Per the 5ire README, key features include:

- **Cross-platform AI assistant & MCP client**: supports major providers like OpenAI, Anthropic, Google, Mistral, DeepSeek, Ollama, etc:contentReference[oaicite:2]{index=2}.
- **MCP tools integration**: via MCP servers, allowing access to file system, system info, databases, remote data, etc:contentReference[oaicite:3]{index=3}.
- **Local Knowledge Base**:  
  - Uses `bge-m3` as a local embedding model.  
  - Parses and vectorizes `docx, xlsx, pptx, pdf, txt, csv` into a local RAG store:contentReference[oaicite:4]{index=4}.
- **Usage Analytics**: tracks API usage and spend, to understand and optimize consumption:contentReference[oaicite:5]{index=5}.
- **Prompt Library, Bookmarks, Search**: UI features for organizing prompts, bookmarking conversations, and searching across chats:contentReference[oaicite:6]{index=6}.

This means we already have:

- Desktop shell + UI framework
- Provider abstraction & routing
- Local embeddings & document ingestion
- MCP tooling system
- Analytics and history

Our work is primarily *augmenting* this with robust privacy features, not re-building the assistant from scratch.

---

## 3. Target architecture after our modifications

### 3.1 New components we’ll add

1. **Leak-Detection Module**
   - Regex-based detectors:
     - Emails, phone numbers, addresses
     - API keys / secrets / JWT / private keys
     - Wallet seeds / mnemonics
   - ML / NER-based detectors:
     - Person names, organizations, locations
   - Output:
     - List of entities with types and spans
     - Overall `sensitivity_score` (0–1)

2. **Redaction & Mapping Layer**
   - Takes raw user prompt (and any context from local memory).
   - Replaces sensitive spans with tokens like `[SECRET_1]`, `[EMAIL_2]`.
   - Maintains a secure mapping (local only) for reinsertion in the UI, **never sent to providers**.

3. **Policy Engine**
   - Configurable rules in YAML/JSON. Example:

     ```yaml
     entities:
       SECRET_KEY: local_only
       ACCOUNT_NUMBER: local_only
       EMAIL: redact

     sensitivity_thresholds:
       high: 0.7  # above => only local models
     ```

   - For a given request:
     - Reads leak-detection output.
     - Chooses which provider(s) can be called.
     - Decides which entities must be redacted or blocked.

4. **Privacy-Aware Router**
   - Wraps the existing provider routing in 5ire.
   - Flow:
     1. UI request → privacy pipeline
     2. Leak-detect + redact
     3. Policy decision
     4. Call chosen provider(s) with transformed prompt
     5. Return response + metadata (which providers saw what).

5. **Audit & Transparency Layer**
   - Per-request log:
     - Original prompt (stored locally, encrypted)
     - Detected entities & sensitivity
     - Providers called
     - Redactions applied
   - UI panel showing what happened for each request.

6. **Zcash / ZK Integration (Hackathon-Flavor)**
   - Minimal but concrete:
     - A simple ZK proof demo (e.g. “I own a Zcash address with ≥ X balance” without revealing the address).
     - Optional integration with a Zcash SDK for fetching testnet balances or shielded transaction info.
   - Exposed in the UI as a “Privacy Proof” card to show judges.

---

## 4. How we’ll explore the 5ire codebase (instructions for Codex)

We want Codex to help us quickly map the architecture and find integration points.

### 4.1 First pass – project structure

Ask Codex:

> 1. **List the top-level directories and important config files** in this repo and briefly describe the purpose of each.  
> 2. Identify which stack is used for the desktop app (Electron, Tauri, etc.) and which framework is used for the frontend (React, Vue, etc.).  
> 3. Point out where the “main process” / app bootstrap lives and where the “renderer” / UI code lives.

Expected output: a short summary of directories like:

- `src/` or `app/` – core logic
- `packages/` – shared modules
- `frontend/` or `renderer/` – UI
- `mcp/` – MCP clients/servers
- `config/` – model/provider configuration
- etc.

We’ll use this to anchor deeper dives.

---

### 4.2 Second pass – chat flow & provider routing

Ask Codex:

1. **Trace the path of a chat request from UI to provider call.**  
   - “Find the component that sends a new chat message and show the chain of function calls that eventually reaches the model/provider call.”  
   - “Identify the function or module that directly calls external AI APIs (OpenAI/Anthropic/etc.).”
2. **Show where providers are configured.**
   - “Locate the configuration objects or files that define which AI providers 5ire supports and how they are called.”
3. **Locate the MCP integration points.**
   - “Find the code that initializes MCP servers/clients in 5ire and show how they are wired into the assistant.”

Our goal: identify a central place where **all provider calls** pass through – this is where we insert the **Privacy-Aware Router**.

---

### 4.3 Third pass – knowledge base & embeddings

Ask Codex:

1. “Find the code that implements the local knowledge base and embeddings (bge-m3). Which module handles document ingestion and vector storage?”
2. “Show how the app retrieves relevant documents and passes them into prompts (RAG).”
3. “Identify where on-disk data is stored (paths, DB, file formats).”

We’ll later hook the **policy engine** here to ensure that retrieved context also goes through leak-detection/redaction before hitting external providers.

---

### 4.4 Fourth pass – analytics, history, and UI

Ask Codex:

1. “Locate the module that tracks usage analytics (API usage & spending). How is it wired into the provider calls?”
2. “Find where conversations are stored and fetched (bookmarks, search, history).”
3. “Identify the main chat UI component and any side panels (settings, analytics, knowledge base).”

We’ll use this to:
- Add a **Privacy/Audit panel**.
- Possibly extend analytics to include **privacy metrics**: redactions per request, local vs external calls, etc.

---

## 5. Integration plan – where to insert our new pieces

Once Codex has mapped the codebase, we will:

### 5.1 Privacy-Aware Router

**Target:** The function/module that currently orchestrates calls to model providers.

Steps:

1. Create a new module, e.g. `packages/privacy-router/`.
2. Export a function:

   ```ts
   async function runWithPrivacyPipeline(request: ChatRequest): Promise<ChatResponseWithMeta>
   ```
3. Inside this function:

   * Call **Leak-Detection Module**.
   * Run **Policy Engine** on detection results + request metadata.
   * Transform/redact the prompt.
   * Delegate to the existing provider routing logic (we’ll refactor the original router into a callable function).
   * Return response + metadata (providers used, redactions).

4. Update the app’s main chat handler to use `runWithPrivacyPipeline` instead of calling providers directly.

---

### 5.2 Leak-Detection Module

**Target:** New shared package, e.g. `packages/leak-detector/`.

Implementation:

* Use Codex to scaffold:

  * A set of **regex detectors** (`email`, `secret`, `address`, etc.).
  * A unified API:

    ```ts
    interface DetectionResult {
      entities: { type: string; start: number; end: number; text: string }[];
      sensitivity: number;
    }

    function detectLeaks(text: string): DetectionResult
    ```

* Later: optionally integrate an ML model (spaCy/transformers) for NER if time permits.

---

### 5.3 Policy Engine

**Target:** New package, e.g. `packages/policy-engine/`.

Implementation:

1. Define a lightweight rule format (YAML/JSON) in `config/privacy-policy.yaml`.

2. Implement:

   ```ts
   interface PolicyDecision {
     allowedProviders: string[];
     redactions: string[]; // entity types to redact
     block: boolean;
   }

   function evaluatePolicy(
     detection: DetectionResult,
     requestContext: RequestContext
   ): PolicyDecision
   ```

3. Use Codex to generate test cases for:

   * High sensitivity → local only.
   * Detection of secrets → block or local only.
   * Normal prompts → allow external providers.

---

### 5.4 Redaction & Mapping

**Target:** New utility module, e.g. `packages/privacy-router/redaction.ts`.

Implementation:

* Given a `DetectionResult` and original text, produce:

  * `redactedText`
  * `mapping` of placeholders → original text
* Persist `mapping` only locally (encrypted if possible).
* UI can use `mapping` to show the **full** text back to the user while external providers only see the redacted version.

---

### 5.5 Audit & UI

**Target UI components:**

* Main chat view: add a per-message “Privacy details” button.
* Side panel: new **Privacy** tab showing:

  * For each request:

    * Sensitivity score
    * Entities detected
    * Providers used
    * Whether any content was blocked

Implementation (with Codex):

* Identify the chat message component and extend its model to store the metadata from `ChatResponseWithMeta`.
* Build a simple panel that reads from the message history and renders the metadata.

> **Status:** Each chat message now stores leak-detection metadata (saved in `memo`) and exposes a “Privacy details” dialog inside the chat UI so we can inspect detections/redactions before building the dedicated privacy panel.

---

### 5.6 Zcash / ZK Integration

**Where to put it:**

* A dedicated “Proofs & Payments” panel or card.
* One or more MCP tools that:

  * Interact with Zcash SDK (testnet).
  * Generate or verify basic zk proofs.

Possible steps:

1. Create a simple local service or MCP server for Zcash:

   * `get_balance(address)`
   * `create_proof_of_balance(address, threshold)`
2. Expose this as a tool the models can call inside 5ire.
3. Build a minimal UI showing:

   * “Generate proof that my ZEC balance ≥ X”
   * “Use this proof in AI conversations without revealing my address.”

---

## 6. Milestone checklist

**Milestone 1 – Codebase understanding**

* [ ] Codex summary of project structure.
* [ ] Identified provider router & chat flow.
* [ ] Identified KB/RAG modules.
* [ ] Identified analytics and chat UI.

**Milestone 2 – Privacy Router MVP**

* [ ] Leak-detection module with regex rules.
* [ ] Policy engine with YAML-configured rules.
* [ ] Redaction module wired into provider calls.
* [ ] Basic audit metadata returned in responses.

**Milestone 3 – UX & Transparency**

* [ ] Privacy panel in UI.
* [ ] Per-message privacy info (what was sent where).
* [ ] Simple config screen for policies.

**Milestone 4 – Zcash/ZK demo**

* [ ] Minimal Zcash integration (testnet balance or transaction display).
* [ ] Simple zk proof demo wired into MCP/tooling or UI.

**Milestone 5 – Polish & Docs**

* [ ] README updated describing the privacy gateway.
* [ ] Short demo script for judges.
* [ ] Screenshots or short GIF of privacy panel in action.

---

## 7. How to use this file with Codex

When you open the repo in Codex:

1. Paste or open this `PRIVACY_GATEWAY_PLAN.md`.
2. Use the “exploration prompts” in sections **4.1–4.4** to have Codex:

   * Map the codebase.
   * Find integration points.
3. Then iterate milestone by milestone, asking Codex to:

   * Scaffold new packages/modules.
   * Refactor routing to pass through the privacy pipeline.
   * Generate tests and fix type errors.

This keeps the hackathon work focused and makes sure we leverage 5ire’s strengths while layering in the Zypherpunk-grade privacy features we want.
