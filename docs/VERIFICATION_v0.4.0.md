> **Historical development record.** For the latest clean ZIP checks, including the corrected Debian asset glob, see [CLEAN_RELEASE_VERIFICATION_v0.4.0.md](CLEAN_RELEASE_VERIFICATION_v0.4.0.md).

# RoboForge Studio v0.4.0 — initial development verification (historical)

Date: 2026-10-16. Baseline: owner-provided `RoboForge-Studio-v0.3.2-REA-GitHub.zip`, compared against selected current GitHub source files. Recorded GitHub main refs during assessment: RoboForge `2067afeb2cd0519784aeda0097f94fec3074aefa`; ChromaNeural `f0cc9ea2fb8fd130f2e914f70ffcacdbf1989c05`; Refract Studio `4c9c81ee29d02d765b2d45a507cea1841acee9f5`. GitHub may have changed subsequently; no remote repository was mutated.

## PASS locally

- Backend Node built-in test runner: 16/16 PASS, covering the prior 11 tests and five new MCP protocol, failure and optional-Refract mock tests.
- Live, separate backend process: MCP initialize, tool discovery (3), catalog (10 modules), HTTP JSON response and loopback endpoint PASS.
- MCP gateway disabled by default, malformed inputs rejected, unknown tools and unauthorized Origin/Host rejected in automated tests.
- REA status and prior REST routes retained in regression tests. Existing first eight module IDs, capabilities and API shape preserved.
- 50/50 frontend TypeScript/TSX files parsed syntactically with global TypeScript `transpileModule` diagnostics (NOT an end-to-end typecheck or bundle).
- Static website and README local resource/anchor checks PASS (external shield badges are not network-tested).
- Node.js JS syntax checks for new components and package scripts PASS.
- Debian build script intentionally refuses to package without a compiled Vite frontend (`BLOCKED` correctly observed with exit code 2).

## BLOCKED / NOT VERIFIED

- Complete frontend `npm run build` (external npm packages absent in this offline environment). GitHub CI is configured to test/build on push; an actual CI run has not been observed.
- Real ChromaNeural MCP SDK connection. The local protocol-smoke test is not equivalent to SDK-level acceptance.
- Real Refract Studio compiler backend and Linux runtime (only mock trusted adapter called in tests).
- DeepSeek Janus inference, model weights, GPU support and license acceptance. A status-only plugin was added; no inference claims.
- Industrial connections, physical devices, end-to-end enterprise integrations, hardware safety verification.
- Debian installer on a clean Ubuntu system. The script is prepared to build only after a successful frontend bundle; no `.deb` artifact is certified by this handover.

## Follow-up acceptance gates

1. On a Linux machine with npm access: install frontend dependencies, run `npm --prefix frontend run build`, `npm run docs:check` and `npm --prefix backend test`; inspect resulting GUI in dark/light modes.
2. Enable gateway explicitly on localhost and run `npm run mcp:smoke`.
3. Build CI Debian package with `bash scripts/build-deb.sh` and test clean Ubuntu install, startup, GUI navigation, file permissions and uninstall.
4. Use actual current ChromaNeural MCP SDK/client and explicit approval UI to check module 9 without affecting modules 1–8. Reconfirm its baseline commit.
5. Approve separate optional Refract and Janus runtime test plans if needed.

**Policy:** No implicit permission escalation, installation, automatic downloads, machine actuation, storage publication, or modification of ChromaNeural protected subsystems.
