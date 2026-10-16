# RoboForge resource-based ChromaNeural Fair Use — LOCAL acceptance report

**Source basis:** `RoboForge-Studio-v0.4.0-CLEAN-RELEASE.zip` present in this local workspace. No `.git` directory accompanied the archive. Owner's current PC repository HEAD was **not** independently observed. This does not claim to match uninspected local changes.

STARTING COMMIT = NOT AVAILABLE IN THE PROVIDED SOURCE ARCHIVE (no VCS provenance; do not fabricate SHA)

CHROMANEURAL-MANAGED MODE = PASS (synthetic local gateway tests only; real client acceptance pending)

ROBOFORGE HAS CHROMAPOINTS LEDGER = NO

ROBOFORGE HAS POINT NORMALIZATION = NO

ONE TOOL = ONE POINT LOGIC PRESENT = NO (old `usageUnits` field is rejected)

CHROMANEURAL REMAINS FAIR USE AUTHORITY = PASS (application boundary; external settlement not verified)

EXECUTION GRANT SCHEMA = v1 revised resource authorization format; earlier experimental `usageUnits` V1 rejected

SIGNATURE = Ed25519 signed with domain-separated canonical JSON; pinned public SPKI only

ARGUMENT BINDING = PASS (SHA-256 canonical JSON + negative mutation)

RESOURCE ENVELOPE = PASS for `maxWallMillis`, `maxInputBytes`, `maxOutputBytes`; `maxCpuMicros`, `maxMemoryBytes`, `maxProcesses` deliberately BLOCKED because no trusted enforcement exists in this runtime

RESOURCE ENVELOPE CALCULATES POINTS = NO

VALID SINGLE-USE AUTHORIZATION = PASS (Node + independently Python-generated signed payload)

REPLAY PROTECTION = PASS (exclusive durable journal, synthetic concurrent/restart tests)

CONTROLLED TOOL WITHOUT GRANT = BLOCKED (expected)

MANAGED REST BYPASS = BLOCKED (expected); REA GET status avoids spawning CLI in managed mode

TELEMETRY AUTHORITATIVE FOR POINTS = NO (explicit `advisoryOnly: true`, `authoritativeForChromaPoints: false`)

FUTURE PLUGINS DEFAULT CONTROLLED = PASS

EXISTING TOOL DEFINITIONS CHANGED = NO; exact source tool-definition block SHA-256 `9140c5af98010ee45778368b46fda40796c9936329ef27f8a77819fb512a0519` before/after

STANDALONE ROBOFORGE = PASS (existing backend tests); full GUI build NOT VERIFIED here (npm offline cache lacks `@types/react`)

EXISTING MCP REGRESSION = PASS (31/31 combined backend Node tests)

INTEROPERABILITY DOCUMENT = `docs/CHROMANEURAL_FAIR_USE_COMPATIBILITY.md`

FOCUSED TESTS = 31/31 Node backend tests PASS; docs asset/link check PASS; Python independently signed revised V1 resource-envelope grant, Node verified and consumed once PASS; bounded actual Python worker timeout PASS; no actual ChromaNeural client or independent resource meter end-to-end test

FILES CHANGED = `README.md`, `backend/adapters/refract.js`, `backend/mcp/managed-grants.js`, `backend/mcp/gateway.js`, `backend/server.js`, `backend/tests/managed-grants.test.js`, `docs/MCP_GATEWAY_HANDOVER.md`, `docs/CHROMANEURAL_FAIR_USE_COMPATIBILITY.md`, `docs/CHROMANEURAL_RESOURCE_FAIR_USE_GATE_REPORT.md`

PUSH PERFORMED = NO

PUBLICATION PERFORMED = NO

## External verification required before enabling managed mode

1. ChromaNeural must adapt its actual Python MCP client to send `params._meta` on `tools/call` **and extract `CallToolResult._meta` correlation** (the previously inspected MCP client kept only `text` and `is_error`), under a negotiated MCP revision whose schema permits it. Earlier revisions and actual SDK forwarding are not proven.
2. ChromaNeural must reserve, independently measure, normalize and settle resource consumption. RoboForge returns only advisory wall/input/output telemetry. On another host ChromaNeural needs trusted external measurement or attestation, not trust in values supplied by the tool server.
3. To support signed CPU, RAM, process-tree or GPU limits, define and verify an OS-backed containment contract. Until then requests containing unsupported ceilings are denied by RoboForge rather than falsely treated as enforced.
4. Verify actual Refract checkout under Linux, file permissions of persistent anti-replay storage, untrusted output handling, restart/error/timeout accounting, and the real ChromaNeural module-9 connection without changing its eight preexisting core modules.
5. Build/test the unchanged React frontend in an npm-equipped CI system and verify `.deb` clean install separately. No public deployment, tag, release or GitHub alteration is authorized.
