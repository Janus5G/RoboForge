# RoboForge Studio 0.3.0 — GUI redesign

This is an additive GUI redesign of the working v0.2.1 source project, *not* a new industrial-control backend.

## Main changes

- New responsive left navigation, mobile drawer, breadcrumb, workspace search (Ctrl/Cmd+K), and persistent dark/light appearance.
- Overview with engineering entry points, live local API health polling, connector discovery count, and a clearly labeled architecture **design** view. No fabricated PLC, telemetry, or AI-provider connection statuses.
- Functional core/experimental connector filter, clickable integration tiles and architecture links.
- Dedicated AI Studio with prompt templates, character limit, result summary, provider shortcut, and bounded error display.
- Provider selection tiles and explicit provider connection test for Ollama/OpenAI/DeepSeek/compatible API, with temporary keys only in browser memory.
- Individual plugin workspaces and capability tabs; bundled plugin discovery remains `import.meta.glob` at build time.
- The backend API route names and schemas remain unchanged. `/api/health` and `/api/config` deliberately continue to return the previous API version, preserving existing consumers.

## Truthful readiness indicators

- Local API status comes only from `/api/health` and is polled every 15 seconds.
- AI model status is *not tested* until the selected provider's Test Connection button succeeds.
- Individual device statuses are only read and controlled in their own adapters. This dashboard **does not claim live device connectivity**.
- The integration architecture diagram is a software topology map, not a telemetry graph.

## Build and verification

```sh
npm --prefix backend test
npm --prefix frontend install --no-audit --no-fund
npm --prefix frontend run build
node backend/server.js
```

The source was syntax-checked against TypeScript parsing and backend regression tested in the creation environment. Because the environment has no cached React/Vite packages and no npm registry access, the **actual frontend TypeScript typecheck, Vite bundling, browser runtime tests and production equipment acceptance remain unverified here**. The ZIP contains source, not a falsely advertised prebuilt binary.

## Desktop release

The Debian package has a new versioned user workspace (`~/.local/share/roboforge/releases/0.3.0`) so upgrades cannot silently continue to launch the old 0.2.1 GUI. The prior workspace is never deleted or overwritten, and configuration is not imported automatically except a local `.env` if one exists at the prior user workspace root. The `.deb` still needs Node, npm, and npm registry access to compile frontend dependencies on first launch.
