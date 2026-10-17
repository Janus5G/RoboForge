# RoboForge v0.4.1 — Coding Agent module 11 verification

This is a **local source candidate, not a public production release**. No GitHub push, release or ChromaNeural edit was performed.

## Implemented

- 11 bundled modules; 10 prior IDs preserved in order
- ChromaPlex Coding Agent optional frontend tabs: source review, mandatory ClamAV source preflight, existing artifact SHA-256/security manifest verification
- Single-file target-aware bridge invokes upstream Python APIs from an operator-installed separate Coding Agent
- Separate operator-controlled file-root allowance for verification; disabled by default
- Installed package SHA256SUMS inventory validation before importing packaged Python modules
- Review of AI-generated code from Code Workspace (session-only transfer)
- Managed ChromaNeural mode preserves REST execution denial
- Existing three MCP tool-definition contracts unchanged; new controlled execution tools deliberately not advertised without ChromaNeural approval
- ChromaPlex OS v2, ChromaNeural, Coding Agent repository, and ChromaPress not changed

## Tests and limitations

- Backend automated regression: **36/36 PASS**
- Public website documentation check: **PASS**
- TypeScript/TSX syntax parser: **55/55 PASS** (not typecheck)
- Real Node→Python subprocess: **PASS** with an explicitly mocked installed upstream package
- Simulated missing mandatory scanner / fail-closed result: **PASS**
- Installed SHA256SUMS tamper test: **PASS**
- Real official Coding Agent checkout and real ClamAV preflight: **NOT VERIFIED**
- Full Secure Compile Gate binary release: **NOT PERFORMED** (remains standalone app responsibility)
- React/Vite typecheck & production build: **NOT VERIFIED** (npm `@types/react` not available offline)
- Clean installed Linux `.deb` runtime acceptance: **NOT VERIFIED**
- Physical ESP32/Arduino/Raspberry Pi tests: **NOT VERIFIED**
- Actual ChromaNeural MCP interoperability for coding functionality: **NOT ENABLED** (no extra MCP execution tool)

Do not label this feature as fully integrated and production-ready until real installed-upstream and Linux acceptance tests have passed. Standalone Coding Agent continues to own its complete, mandatory Secure Compile Gate.
