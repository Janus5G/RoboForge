# ChromaPlex Coding Agent — optional RoboForge module 11

Status: **local source integration candidate; not an accepted production/secure-build deployment**.

Sources: [Chromaplex Coding Agent](https://github.com/Janus5G/Chromaplex-Coding-Agent) and [RoboForge](https://github.com/Janus5G/RoboForge). Both programs remain separate. RoboForge redistributes **no Coding Agent source, binaries, vendor compilers, or model weights**.

## What is implemented

The integrated plugin is registered as `coding-agent`, with three GUI tabs:

1. **Review source** — read-only, target-aware static checks from the official `chromaplex_agent.security.scan_files` and `chromaplex_agent.memory_safety.scan_memory_safety`. It accepts **one short source file**, selected target and language. It never runs this code. This is **not** a passed Secure Compile Gate.
2. **Secure preflight** — invokes the official `chromaplex_agent.secure_compile.preflight_sources` with required ClamAV scanning, required memory safety, and no implicit acceptance of manual-review findings. If an upstream check, dependency or antivirus scan is unavailable, the operation **fails closed**. Even PASS is **source preflight only**, NOT final compilation, quarantine output scan, release approval or signature.
3. **Verify build** — invokes the upstream `verify_security_manifest` for a pre-existing binary and its `.security.json` only from a specifically operator-approved directory. Disabled until verification roots are configured. This is SHA-256 / manifest verification, **not publisher-authenticity validation**.

The GUI has a **Review in Coding Agent** button in the AI Studio code workspace, so locally or externally generated AI code can be reviewed without automatic execution. Source content stays in the current browser session and is not persisted into plugin settings.

## Linux host setup

Install Coding Agent separately through its own official Linux `.deb` (or a trusted checkout). For the ChromaLinux custom ISO, import that `.deb` through **ChromaPress** as a separate normal Linux application. RoboForge does not embed or replace that package, the PySide6 GUI or the security gate.

Example admin configuration (`.env` on the RoboForge host):

```dotenv
CHROMAPLEX_AGENT_ENABLED=1
CHROMAPLEX_AGENT_ROOT=/opt/chromaplex-coding-agent
CHROMAPLEX_AGENT_PYTHON=python3
# Optional, read-only build verification. Omit to keep verification disabled:
CHROMAPLEX_AGENT_VERIFY_ROOTS=/home/operator/approved-builds
```

Only a trusted operator may set these variables. The adapter resolves and validates required Python modules in an existing absolute checkout, then launches a **fixed RoboForge Python bridge script** using `python3 -I` without shell interpretation. There is no automatic installation or model download. An empty/disabled setting makes requests fail closed.

ClamAV must be installed and its local virus definitions available for **secure preflight**. The upstream scanner must report PASS. A diagnostic review does not include ClamAV and must never be labeled an approved build. For full compile/build outputs, use the Coding Agent's **standalone Secure Compile Gate**, which additionally controls quarantine compilation, binary scanning, integrity manifests, and output release.

## REST contracts

- `GET /api/coding-agent/status` — metadata only, no subprocess.
- `POST /api/coding-agent/review` — `{"target":"linux-desktop","filename":"main.py","language":"Python (Linux)","source":"print(1)"}`.
- `POST /api/coding-agent/preflight` — same body, but **mandatory secure source preflight**.
- `POST /api/coding-agent/verify` — `{"path":"/home/operator/approved-builds/program.bin"}`; read-only path verification.

Only one file at a time; 12,000 UTF-8 source bytes maximum and bounded subprocess/output/time limits. If checks fail, report `ok:false`; if Python cannot run, return an error. No write/flash/build/run control is exposed through these endpoints.

## ChromaNeural / MCP boundary

The existing three MCP tools, their definitions and fingerprints remain untouched. The new plugin appears in catalog/metadata, **but no Coding Agent execution tool is exposed through MCP in this candidate**. Exposing such a capability later requires a separate explicitly versioned MCP tool, ChromaNeural tool approval, single-use signed execution grant, resource-budget enforcement and real cross-project verification.

When `ROBOFORGE_CHROMANEURAL_MANAGED=1`, all execution `POST /api/*` routes (including these new routes) are denied as before, avoiding REST bypass of ChromaNeural's resource-based Fair Use. ChromaNeural owns all ChromaPoints accounting and resource normalization.

## Verification and limitations

Automated Node tests cover registration, defaults, input validation, a real Python subprocess against a controlled fake upstream checkout, a forced upstream preflight failure, standalone REST and managed REST denial. They are **contract tests**, not proof of successful official ClamAV scans, Secure Compile Gate end-to-end, a genuine installed Coding Agent, or physical ESP32/Raspberry Pi hardware. The complete React/Vite build must be checked by CI because local npm dependencies were unavailable. No production `.deb` is released from this unverified build.

No changes are made to Coding Agent, ChromaPress, ChromaLinux, ChromaNeural, or ChromaPlex OS v2.

### Installed package integrity

When the trusted root includes the official Coding Agent `.deb`-generated `SHA256SUMS` file, RoboForge verifies the complete checksum inventory before importing any Python modules. Missing, symlinked or mismatching inventoried files fail closed. A manually trusted source checkout without `SHA256SUMS` is an explicit **operator trust decision** and is not represented as authenticated by RoboForge.
