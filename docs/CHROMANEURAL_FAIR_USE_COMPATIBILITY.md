# ChromaNeural ↔ RoboForge — Resource-Based Fair Use Compatibility

**Status:** local *unpublished* RoboForge compatibility candidate; **NOT** accepted with the real ChromaNeural MCP client, independent OS resource meter or settlement engine. No ChromaNeural files were modified. Based on the available RoboForge v0.4.0 Clean Release sources, **not** a verified checkout of the owner's current PC working tree. See `CHROMANEURAL_RESOURCE_FAIR_USE_GATE_REPORT.md`.

## Locked allocation of responsibilities

**ChromaNeural** remains the sole authority for contribution measurement, normalization, ChromaPoints, user/connection/tool approval, resource allowance, reservation, measured consumption, refunds/release and reconciliation. ChromaNeural must apply the **same normalization policy to verified contributed resources and consumed resources**. Resource dimensions can include CPU time, memory multiplied by time, data and GPU time. Nothing in RoboForge converts raw dimensions to ChromaPoints, implements an economic policy, stores a balance or determines how much any execution costs. A call may consume less than one point, one point, or many points according to ChromaNeural's independently verified and normalized resource consumption; **there is no one-tool/one-point rule**.

**RoboForge** exposes only its curated MCP tools, verifies a signed one-use authorization for controlled calls, enforces the technical limits it can reliably enforce, prevents replay and emits **non-authoritative** diagnostic correlation information. The grant is not a payment, credit, debit, point, or price; it means only: **“ChromaNeural approved this exact bounded execution.”**

RoboForge remains optional ChromaNeural **module 9**. ChromaNeural's existing eight modules, Internet Identity, blockchain/storage, ChromaSpeechAI, WorkQueue and permission/publication rules are untouched. Future RoboForge capabilities require explicit separately fingerprinted and approved MCP tool definitions, never a generic `execute(plugin, action, payload)` proxy.

## Availability and standalone isolation

- Default **standalone**: `ROBOFORGE_CHROMANEURAL_MANAGED=0`; existing non-managed APIs and gateway operation unchanged.
- Opt-in **managed**: `ROBOFORGE_CHROMANEURAL_MANAGED=1` plus `ROBOFORGE_MCP_ENABLED=1`. A local trusted Ed25519 public PEM key, explicit pinned session ID and private durable replay directory are mandatory for controlled tool calls; failure to initialize the verifier **denies execution** while discovery/status remain usable.
- Environment variables: `ROBOFORGE_CHROMANEURAL_PUBLIC_KEY_FILE` (absolute path), `ROBOFORGE_CHROMANEURAL_SESSION_ID` (ASCII identifier), `ROBOFORGE_GRANT_STATE_DIR` (absolute, owner-owned mode 0700 directory; durable filesystem).
- Managed operation accepts loopback traffic only and denies browser frontend access on the same instance. All existing execution-capable `POST /api/*` endpoints are HTTP 403 in managed mode, preventing an equivalent REST route from bypassing the MCP gate. Health and other harmless status/config GET APIs remain available. A separately started standalone RoboForge process is **outside** the managed instance protection; isolate such processes appropriately.
- `initialize`, `ping`, `tools/list` and pure local catalog/status `tools/call` remain available without an execution grant. The Refract compilation tool is **CONTROLLED**. Any newly exposed or unclassified MCP tool defaults to CONTROLLED. MCP being enabled does not activate Refract, REA, Janus or hardware access.

## Execution grant V1 — exact wire contract

`tools/call.params._meta["net.aagii.chromaneural/execution-grant"]` contains `{keyId,payload,signature}`. The key is an application-specific namespace, not the protocol-reserved `mcp`/`modelcontextprotocol` namespace. **MCP 2025-11-25 explicitly describes `CallToolRequestParams._meta`; compatibility with the particular ChromaNeural Python SDK and earlier negotiated MCP revisions remains a blocker that requires a real client test.** Changing the existing tool input schemas or tool fingerprints is neither required nor permitted merely for authorization.

The signed JSON `payload` must contain **exactly**:

- `schemaVersion`: numeric `1`
- `issuer`: `"ChromaNeural"`
- `audience`: `"RoboForge"`
- `sessionId`: pinned session identifier
- `authorizationId`: unique unpredictable restricted identifier
- `reservationId`: ChromaNeural's operation/reservation correlation ID
- `tool`: exact MCP tool name
- `argumentsSha256`: 64 lower-case hex characters
- `issuedAtMs`, `expiresAtMs`: integer Unix milliseconds
- `nonce`: unpadded base64url for 16–48 random bytes
- `resourceEnvelope`: **OPTIONAL** object of validated technical execution ceilings; see below.

**No `usageUnits`, point count, point price, monetary balance, earned/spent points, or normalization formula is permitted.** The previous pre-release `usageUnits=1` grant format is **deliberately incompatible** with this revised V1 candidate and is rejected. The actual ChromaNeural implementer must explicitly adopt and test the revised format prior to enabling managed operation.

Example shape with non-secret fictitious values (not a runnable authorization):

```json
{
  "jsonrpc":"2.0","id":1,"method":"tools/call",
  "params":{
    "name":"roboforge_refract_compile_cpl_v1",
    "arguments":{"source":"var x = 1"},
    "_meta":{"net.aagii.chromaneural/execution-grant":{
      "keyId":"<SHA256-of-public-key-DER-SPKI>",
      "payload":{
        "schemaVersion":1,"issuer":"ChromaNeural","audience":"RoboForge",
        "sessionId":"pinned-session","authorizationId":"unique-auth-id",
        "reservationId":"operation-id","tool":"roboforge_refract_compile_cpl_v1",
        "argumentsSha256":"<sha256-canonical-arguments>",
        "issuedAtMs":1790000000000,"expiresAtMs":1790000015000,
        "nonce":"<16-48-bytes-base64url>",
        "resourceEnvelope":{"maxWallMillis":1500,"maxInputBytes":1024,"maxOutputBytes":4096}
      },
      "signature":"<64-byte-Ed25519-signature-base64url>"
    }}
  }
}
```

**Signature algorithm:** Ed25519 over the literal UTF-8 bytes `RoboForge/ChromaNeural-Grant/v1\n` concatenated with canonical JSON of **the entire signed payload including resourceEnvelope**. No prehash. `signature` is exactly 64 bytes, encoded as unpadded base64url. `keyId` is lower-case SHA-256 of the verification key's DER SubjectPublicKeyInfo, independently pinned by RoboForge. RoboForge has **no private signing key**. Public key and replay-directory file paths are server-only configuration; the browser and model never provide them.

**Canonical argument JSON:** recursively sorted Unicode-code-point object keys, original array order, no extra whitespace, lowercase `true/false/null`, Python-compatible `json.dumps(..., ensure_ascii=True, sort_keys=True, separators=(',', ':'), allow_nan=False)` escaping for the accepted value set. Integers must fit the JavaScript safe integer range; decimals, negative zero, out-of-range integers and invalid Unicode surrogates are rejected in V1. Argument binding is `SHA256(UTF8(canonical_json(arguments)))` in lower-case hex. The `_meta` envelope is **excluded from the argument hash**. `issuedAtMs` can be at most 5 seconds in the future; lifetime at most 30 seconds; the grant must not have expired on dispatch.

## Resource envelope — enforcement vs. authority

This **technical envelope is optional**. Every included field must be a strictly positive safe integer and is part of the signed payload. There is **no global economic conversion** in RoboForge. Values above local safety bounds are clamped to the lower existing bound, never treated as permission to increase it.

| Ceiling | Meaning / actual handling in this limited version |
| --- | --- |
| `maxWallMillis` | Enforced on the **Refract Python subprocess** with an actual kill timer; cannot exceed existing 5500 ms. This is subprocess wall time, not an OS CPU budget or end-to-end MCP latency. |
| `maxInputBytes` | Enforced **before consuming** the grant against the UTF-8 byte size of canonicalized MCP tool arguments; local ceiling 8192 bytes. |
| `maxOutputBytes` | Enforced against UTF-8 serialized successful tool output; adapter stdout is also bounded while reading. Max authorized 30000 bytes, but Refract keeps its lower existing stdout cap of 26000 bytes. Error/status envelopes are separate protocol diagnostics, not unbounded payloads. |
| `maxCpuMicros` | **NOT enforceable** without verified OS process/cgroup accounting: grants specifying it are rejected rather than silently accepted. |
| `maxMemoryBytes` | **NOT enforceable** by this Node application: grants specifying it are rejected. |
| `maxProcesses` | **NOT enforceable** as a true process-tree ceiling: grants specifying it are rejected. RoboForge spawns at most one direct Refract process but does not claim to constrain descendants. |

No GPU, CPU, RAM×time, or network-data normalization is implemented in RoboForge. **ChromaNeural must independently account for actual CPU/RAM/data/GPU usage in its trusted OS-backed execution environment**, and settle the difference between reserved and verified consumption under its own policy. On a different physical host, ChromaNeural cannot automatically infer RoboForge's true CPU/GPU usage from RoboForge-reported measurements; the trusted monitoring/attestation boundary is an *external integration blocker*, not something achieved by this grant verifier. Sending all unsupported ceilings will safely block execution until trustworthy containment is established. For permitted tools without a resourceEnvelope, pre-existing RoboForge safety limits still apply. These are *execution gates*, not proof of complete Fair Use accounting.

## Replay safety and correlation

Sequence: verify tool and tool arguments → verify key, signed payload, expiry, resourceEnvelope and input ceiling → **atomically persist consumed marker** → dispatch to adapter. The consumed marker remains consumed after success, exception, timeout, crash, ambiguous completion or restart; the same grant cannot be used for a free retry. The journal stores only SHA-256 authorization IDs, expiry and consumption timestamp with bounded capacity, no source, token, response, user secret or points data. A corrupt/symlinked/unwritable or full journal causes controlled calls to fail closed.

For a dispatched call, success **and** tool error return:

- `CallToolResult._meta["net.aagii.chromaneural/authorization-receipt"]`: `{authorizationId,reservationId,authorizationAccepted:true,tool}` (execution authorized and consumed; **not** settlement receipt).
- `CallToolResult._meta["net.aagii.chromaneural/execution-telemetry"]`: `{authorizationId,reservationId,advisoryOnly:true,authoritativeForChromaPoints:false,startedAtMs,wallElapsedMillis,inputBytes,outputBytes,state,enforcedCeilings}`. Only observed local diagnostics are reported; no point cost or GPU/CPU accounting assertion. The `enforcedCeilings` list refers only to fields accepted and enforced by this implementation.

ChromaNeural must not determine a debit from these RoboForge telemetry fields alone. A local monotonic wall timer is not CPU utilization, nor RAM×time. In an ambiguous timeout/no-receipt case ChromaNeural must reconcile reservations independently; RoboForge does not refund or calculate compensation.

## Interoperability and verification boundary

Synthetic local tests verify grant scope, Ed25519, argument binding, envelope signing, expiry, replay after verifier restart, bounded Refract subprocess timeout, output size, fail-closed REST route restrictions, old standalone mode and existing three *unchanged* MCP tool fingerprints. Test vectors for independent cross-runtime verification:

| Tool arguments | SHA-256 hex |
| --- | --- |
| `{}` | `44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a` |
| `{"source":"Hej København — æøå 😀"}` | `5b8bf5d0137e6b1d13d54561cd5a184873ede0bc10fe19f09e0f9a01e6606ae7` |
| `{"z":[true,3,{"k":"værdi"}],"a":false}` | `a4532b493ebc67117718d2483224a78acdf058abf89fd805286513a660dcb21e` |
| `{"nums":[0,13,9007199254740991],"nested":{"æ":"blå","Z":"x"}}` | `cc7118bc8556ee7787198f165907895bafdd43d05f6e8aff22f843fff3b3ef24` |

Pending external acceptance: (1) exact Python ChromaNeural SDK request metadata forwarding and `CallToolResult._meta` receipt/telemetry extraction (the previously inspected client extracted text and `is_error` only), plus protocol revision negotiation; (2) trusted OS-backed measurement of the *RoboForge* controlled process and independent normalization; (3) actual reservation, settlement and cancellation/retry ambiguity; (4) Linux clean-install service account/replay journal permissions; (5) full frontend build on npm-equipped host and actual Refract checkout; (6) ChromaNeural module-9 regression acceptance. No ChromaNeural repository edits, network publication, release tags or GitHub rule changes are made by this gate.
