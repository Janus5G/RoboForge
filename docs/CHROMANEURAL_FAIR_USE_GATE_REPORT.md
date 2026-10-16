# RoboForge ChromaNeural Fair-Use Gate — Local Test Report

STARTING COMMIT = NOT AVAILABLE (the inspected local source is `RoboForge-Studio-v0.4.0-CLEAN-RELEASE.zip` without Git history; the owner's actual PC working tree has not been inspected)

ROBOFORGE CHROMANEURAL-MANAGED MODE = PASS (local synthetic tests; *not* actual ChromaNeural end-to-end acceptance)

CHROMAPOINTS IMPLEMENTED IN ROBOFORGE = NO

CHROMANEURAL REMAINS POINT AUTHORITY = PASS (RoboForge never reads, stores or calculates a balance, price or point debit)

EXECUTION GRANT SCHEMA VERSION = 1

SIGNATURE = Ed25519, domain separated, SHA-256 of canonical arguments, verified using pinned public SPKI key

PRIVATE SIGNING KEY PRESENT IN ROBOFORGE = NO (only synthetic test keys generated in memory)

TOOLS/LIST WITHOUT GRANT = PASS

METADATA-ONLY ACCESS = PASS (catalog and module status)

CONTROLLED TOOL WITHOUT GRANT = BLOCKED (expected behavior)

VALID SINGLE-USE GRANT = PASS (local HTTP test with mock Refract adapter)

ARGUMENT BINDING = PASS (nested objects, Unicode, altered argument rejection; independently Python-generated SHA-256 vectors)

EXPIRED/FORGED GRANT REJECTION = PASS (wrong signature/issuer/audience/tool/session/key/clock/expiry rejected)

REPLAY PROTECTION = PASS (single-use marker persists across verifier object reinitialization; same authorization cannot be reused)

AUTHORIZATION CONSUMED BEFORE DISPATCH = PASS (mock invocation counter, including after adapter errors)

MANAGED REST BYPASS = BLOCKED (expected; all action POST APIs fail with 403 in managed mode)

STANDALONE ROBOFORGE REGRESSION = PASS (the original backend regression tests remain green; separate full GUI runtime acceptance not performed)

EXISTING MCP TOOL CONTRACTS CHANGED = NO (original 3 names, descriptions, input schemas and annotations preserved)

FUTURE PLUGIN MODEL = EXPLICIT VERSIONED ROBOFORGE MCP TOOLS; UNKNOWN DEFAULT CONTROLLED

CHROMANEURAL EIGHT EXISTING MODULES REQUIRE CHANGE = NO (MCP client metadata forwarding and signing require separate ChromaNeural-side work; not changes to the eight modules)

INTEROPERABILITY DOCUMENT = `docs/CHROMANEURAL_FAIR_USE_COMPATIBILITY.md`

FOCUSED TESTS = 22/22 automated Node backend tests PASS; site/docs check PASS; Python cryptography independently signed a synthetic Ed25519 grant that RoboForge verified and consumed once PASS; real ChromaNeural interoperability NOT TESTED; frontend offline build BLOCKED due to unavailable npm cache; no industrial hardware or model execution conducted.

FILES CHANGED = `.env.example`; `backend/mcp/gateway.js`; `backend/mcp/managed-grants.js` (new); `backend/server.js`; `backend/tests/managed-grants.test.js` (new); `docs/MCP_GATEWAY_HANDOVER.md`; `docs/CHROMANEURAL_FAIR_USE_COMPATIBILITY.md` (new); `docs/CHROMANEURAL_FAIR_USE_GATE_REPORT.md` (new).

PUSH PERFORMED = NO

PUBLICATION PERFORMED = NO

## Explicit remaining acceptance blockers

1. Validate ChromaNeural's currently evolving Python MCP SDK can submit namespaced `params._meta` without changing tool-definition fingerprints.
2. Test exact ChromaNeural-generated Ed25519 grants against the actual RoboForge managed server on one trusted local machine. The independent Python test so far was synthetic.
3. Exercise real reservation/settlement/ambiguous execution outcomes and owner approval with ChromaNeural; RoboForge cannot perform ChromaPoints reconciliation.
4. Confirm managed service account permissions and durable local journal are suitable for clean-install Linux deployment.
5. Re-run frontend build and clean Debian installation on a connected CI runner. GUI was deliberately not edited in this gate.
