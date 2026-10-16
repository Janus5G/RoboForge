# API/Integration compatibility report

Source: RoboForge.zip as uploaded. This is a corrected *new copy*, not a patch applied to any existing deployment.

| Previous API | Preserved? | Note |
| --- | --- | --- |
| `GET /api/plugins` | Yes | Legacy `siemens` id preserved; new `canonicalId` `siemens-xcelerator`. Other six ids unchanged. |
| `POST /api/generate` | Yes | `{prompt,provider}` accepted. Response retains `technologies`, `code`, `files`, `integrationGuide`. Adds provider, model and file contents. |
| `provider=ollama` | Yes | Defaults to local Ollama. Explicit model choice optional. |
| `provider=codex` | Compatibility alias only | Maps to configured OpenAI-compatible chat completion API. **Does not provide Codex CLI authorization, workspace access or agent execution.** |
| `GET /api/health` | New | Health check; reports the repository version (0.3.2), rather than the outdated 0.2.0 response value. |
| `GET /api/config` | New | Public provider configuration flags only; no secrets. |
| `POST /api/providers/test` | New | Explicit outbound model call. |
| `POST /api/opcua/browse`, `/read` | New | Optional node-opcua-client; loopback only. |
| `POST /api/siemens/inspect` | New | Explicit server-configured Siemens API; GET only. |

`/api/generate` accepts JSON Content-Type and a prompt from 3 to 12000 characters. Codes other than 2xx include `{"error":"description"}`. JSON payloads are capped at 32 KiB. `files[]` includes `path`, `lines` and new `content` field. Unsafe generated file paths are not parsed.

Browser cross-origin users: `ALLOWED_ORIGINS` accepts an explicit comma-separated list of fully qualified origins, for example `http://127.0.0.1:5173,https://your-app.example`. Default is same origin plus loopback development ports 3000/3001. Do not use `*`. Third-party applications sending requests directly (no `Origin`) are subject to local network binding; no service is publicly exposed by default.

**Known unverified integration areas:** no existing third-party application source code was available. Its use of this API cannot be end-to-end regression tested from this ZIP alone. Existing integrations may require custom contract tests beyond these stable routes. No physical equipment, simulated Isaac Sim runtime or Siemens tenant was available for end-to-end tests.

## Optional REA integration (0.3.2)

Additive API routes: `GET /api/rea/status` and `POST /api/rea/analyze` (allowlisted static actions only). Requires explicit server configuration. The original seven plugins and existing routes are unchanged. REA is independently installed and its full MCP interface is not proxied by RoboForge.
