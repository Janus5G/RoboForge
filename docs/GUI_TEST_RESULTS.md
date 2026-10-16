# RoboForge Studio v0.3.0 — build and UI review report

Run on 2026-10-15 in an isolated Linux analysis container; **not on a target workstation**.

| Gate | Result | Evidence / boundary |
| --- | --- | --- |
| Node backend regression tests | PASS 7/7 | `npm --prefix backend test` |
| Frontend TS/TSX *syntax parser* | PASS 43/43 | TypeScript transpileModule parser only; **NOT a complete typecheck** |
| CSS visual layout smoke test | PASS | Chromium static-markup fixture matching overview classes, 375, 768, 1280, 1680 px; no horizontal document overflow. This is **not a React browser runtime test** |
| Plugin loader | Existing preserved implementation | Build-time discovery via Vite import.meta.glob; requires actual Vite compilation to verify runtime |
| Frontend `npm run build` | NOT VERIFIED | React/Vite packages unavailable in current offline environment; npm install --offline reports ENOTCACHED |
| AI inference / external providers | NOT VERIFIED | Requires network, credentials and selected runtime |
| ROS 2 / MQTT / OPC UA physical connections | NOT VERIFIED | Requires user-owned hardware/services and safety approvals |
| Siemens/Arduino/Isaac Sim/Home Assistant | NOT VERIFIED | Functionality bounded as documented in ACCEPTANCE.md |
| Debian source package | Verified via `dpkg-deb -I/-c` and source comparison | Requires npm network on first start; not a fully offline binary |

**Claim limitation**: Neither this document nor the package claims end-to-end production readiness. A full React/Vite build plus browser interaction tests must run in the target environment before release as a verified GUI.
