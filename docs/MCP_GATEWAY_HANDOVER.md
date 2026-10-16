# RoboForge v0.4.0 — MCP Gateway technical handover

**Owner:** Janus5G. **Source:** RoboForge only. **Target:** optional module 9 in ChromaNeural. **Interface status:** protocol-shape tests pass locally; actual ChromaNeural SDK connection not yet tested.

## Contract

- Endpoint: `http://127.0.0.1:3001/mcp` (same RoboForge backend port; change PORT only in RoboForge config).
- Enabled only with `ROBOFORGE_MCP_ENABLED=1`; otherwise returns HTTP 404.
- Streamable HTTP, stateless JSON-RPC 2.0 over POST, JSON responses, GET rejected with HTTP 405 (no SSE streaming), no sessions.
- Tested protocol version negotiation values: 2025-03-26, 2025-06-18 and 2025-11-25.
- Bind backend to 127.0.0.1, never `0.0.0.0` for gateway consumption. Origin/Host/remote-address checks deny cross-origin and non-loopback. No built-in bearer tokens: ChromaNeural's local `http` profile does not send tokens; its existing approval rules apply. Do not use for remote access.
- No active polling, automatic update, downloads, arbitrary plugins, shell, robot control, OPC UA writes, MQTT publishes, or external result publication.
- REST endpoints and original eight registered plugin IDs preserved. RoboForge has 10 internal modules; ChromaNeural still has eight **fixed ChromaNeural modules**, and RoboForge is the **ninth optional MCP module**, not a replacement.

## Stable MCP tool catalog — exactly 3 tools

| Name | Input JSON | Output | Default behavior |
| --- | --- | --- | --- |
| `roboforge_catalog_v1` | `{}` | JSON-encoded text inventory, statuses not asserted | Available after opt-in server start |
| `roboforge_module_status_v1` | `{"module_id":"janus"}` | JSON-encoded text for one module | Available after opt-in; no device probe |
| `roboforge_refract_compile_cpl_v1` | `{"source":"var x = 1"}` | JSON-encoded CPA text + dialect + `verified:false` | Refuses unless separately enabled, `REFRACT_ROOT` is an absolute trusted checkout |

MCP tool replies use the standard `content: [{type:'text',text:'{...}'}]`, `isError` boolean. Outputs must be treated as **untrusted data**. No tool can invoke further tools by passing instructions in its output. There are no generic module-dispatch tools. New tools may be published only after separate risk review, explicit schema version, bounded implementation and renewed ChromaNeural approval.

## Current ChromaNeural client constraints (observed October 2026)

Checked GitHub sources `client/chroma/mcp_client.py` and `client/chroma/mcp_config.py` (reconfirm against current commit): 32 tool definitions per MCP server, at most 16 approved tools per task, four calls per task, 15-second overall call timeout, 10-second SDK read timeout, 32-KiB text result, 8-KiB input args, explicit SHA-256 fingerprints for tool definitions. Configuration allows local HTTP on `127.0.0.1` or `::1` without a bearer token. RoboForge exposes three tools and limits request/response sizes. These source observations do **not** constitute an end-to-end acceptance test.

## Optional Refract Studio

- Refract Studio must be installed independently in a trusted local folder (not bundled).
- Set `REFRACT_ENABLED=1` and `REFRACT_ROOT=/absolute/path/to/Refract-Studio`. Optional `REFRACT_PYTHON=/usr/bin/python3`.
- Only the actual `refracteditor.cpl_adapter.compile_cpl` function is imported in an isolated Python process. Source max 4096 characters, deadline 5.5 seconds, bounded output. No execution of generated CPA.
- Real Refract compilation and Linux dependency acceptance **NOT VERIFIED** in this package; mock adapter test is **NOT** evidence of real compiler compatibility.
- ChromaPlex OS v2, original PRISME, Refract GUI/editor, simulator, optical routing code and storage are not modified or bundled.

## Optional DeepSeek Janus

- Registered in RoboForge as experimental, disabled by default; **status-only, no inference adapter** in v0.4.0.
- Separate model runtime, supported versions, model license, image source authorization, no automatic downloads and GPU resource constraints must be tested before a later release enables it. No Janus weight files are bundled.

## Test evidence and acceptance gate

- Run `npm --prefix backend test`: expect all tests to PASS including MCP on/off, version negotiation, discovery, invalid module IDs, overflow rejection, forged Host, cross-site Origin and explicit disabled Refract behavior.
- `npm run docs:check`: validates local site/resources/README assets; not a browser test.
- Real ChromaNeural client test **REQUIRED BEFORE ENABLEMENT IN PRODUCTION**: add one approved local HTTP server profile and approve each tool fingerprint separately, then verify `initialize`, `tools/list`, catalog, status, disabled Refract, schema-change reapproval, timeout, failure/offline behavior, restart, and absence of regressions to eight core modules. Do not alter Internet Identity, storage, WorkQueue or ChromaSpeechAI to accommodate gateway.
- Do not claim Janus inference, full REA MCP, Refract compilation or physical industrial services are production validated.
