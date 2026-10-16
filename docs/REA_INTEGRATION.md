# REA integration — security and acceptance

**Status:** Experimental and disabled by default. RoboForge calls the separately installed [REA](https://github.com/morluto/rea) CLI by morluto. No code from REA is distributed in RoboForge.

## Installation

1. Use Node.js 22.19+ (22.x), 24.11+ (24.x), or 26+.
2. Install official CLI separately: `npm install --global rea-agents`.
3. Verify it with `rea --version` and `rea --help`.
4. Set `.env` server variables `REA_ENABLED=1` and `REA_ALLOWED_ROOTS=/absolute/approved/folder` (multiple roots separated by the platform PATH delimiter). Restart the backend.
5. In GUI, open **Experimental Lab → REA Analysis** and check CLI readiness. Select static analysis and confirm permission for each target.

REA analyzes paths on the machine running RoboForge's backend, not arbitrary browser-client files. An absolute path is required. Symbolic links cannot escape authorized roots. Each operation has a runtime deadline and output limit. This is not a general shell endpoint. **Do not expose the backend over WAN.**

## Commands exposed

- `analyze-javascript-application PATH --json`: JS/Electron directory or ASAR.
- `inspect-managed-artifact PATH --json`: .NET DLL or EXE metadata.
- `inspect-go-binary PATH --json`: Go build metadata.
- `inspect-rust-binary PATH --json`: Rust build metadata.

Other REA abilities are available only through REA itself or its agent MCP client, not through this RoboForge wrapper. Full REA functionality is not claimed. No external REA runtimes/disassemblers were exercised here.

## Evidence

Local backend tests use a simulated REA subprocess and validate argv, JSON Evidence shape, disabled-by-default behavior, traversal/symlink protections and error paths. These are **integration contract tests**, not proof that a real REA version was executed. Run a real artifact end-to-end before public release.

### License

REA © 2026 morluto — [MIT License](https://github.com/morluto/rea/blob/main/LICENSE). RoboForge © 2026 Janus5G — MIT License. External REA software and its dependencies are never copied into the RoboForge distribution.
