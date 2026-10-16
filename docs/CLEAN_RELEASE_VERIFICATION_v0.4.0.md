# RoboForge Studio v0.4.0 — Clean source package validation

**Scope:** One GitHub-ready source tree with no nested `RoboForge/` directory. No remote GitHub write, merge or release is included.

## Verified in this packaging environment

- `npm test`: **PASS (16/16)** — Node backend regression and MCP contract tests.
- `npm run docs:check`: **PASS** — required web assets, local references, MIT metadata and README images.
- `node --check backend/server.js` and `node --check backend/mcp/gateway.js`: **PASS**.
- `bash -n scripts/build-deb.sh`: **PASS**.
- Manual MCP process smoke test with `ROBOFORGE_MCP_ENABLED=1`, bound to loopback: **PASS**. Three tools discovered and ten module records returned.
- Debian packaging script exercised against **disposable placeholder frontend assets** to verify its fixed filename-glob detection: **PASS**. Package metadata, contents and checksum were inspected. This does **not** verify a distributable UI or Linux installation; the test package was discarded.
- Source ZIP: root-directory layout and CRC integrity checked during packaging; no `node_modules`, credentials, generated build output, or duplicate nested project.

## Not independently verified in this environment

- Fresh `npm --prefix frontend install` + React/Vite production build: npm dependencies unavailable locally. A preceding GitHub Actions run compiled the v0.4.0 frontend but failed at the formerly broken Debian packager; the clean ZIP requires a new CI pass.
- Complete Debian package built with real frontend output, installation/startup/uninstall on a clean supported Linux machine: **BLOCKED**.
- REA executable, official Refract compiler runtime, Janus model inference and physical industrial systems: **NOT VERIFIED**.
- Real ChromaNeural SDK-to-RoboForge MCP interoperability: **NOT VERIFIED**; the standalone MCP contract tests are not acceptance of ChromaNeural's module 9.

## Required release gate

On a fresh Linux checkout run:

```sh
npm --prefix frontend install --no-audit --no-fund
npm run docs:check
npm --prefix frontend run build
npm test
npm run mcp:smoke  # Start an enabled local server first (see README)
bash scripts/build-deb.sh
dpkg-deb --info dist-packages/roboforge-studio_0.4.0_all.deb
```

Then verify actual desktop launch, MCP approval isolation, Debian install/reinstall/uninstall and optional integrations. Publish the `.deb` only after those gates succeed. Generated code or external tool results never imply operator approval.
