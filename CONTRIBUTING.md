# Contributing to RoboForge

Thank you for your interest. Before opening a pull request, please open an issue describing the change, particularly for protocol adapters, industrial command paths or new plugins.

1. Fork / clone this repository and use Node.js 22 (or >=20.19).
2. Make changes in a separate branch. Keep existing plugin IDs and the documented API contract unless a migration is agreed.
3. Run `npm --prefix backend test` and `npm --prefix frontend run build` with dependencies installed.
4. Describe test evidence, known limitations and whether actual equipment was involved.
5. Never include API keys, real PLC credentials, customer telemetry or other private data in tests or screenshots.

New plugins are discovered at frontend **build time** from trusted `frontend/src/plugins/*/index.ts` modules. This is not a remote plugin marketplace or unrestricted third-party code loader. Include a manifest, tested UI capabilities, and clear failure behavior. Avoid hardware writes as defaults.

RoboForge Studio is distributed under the [MIT License](LICENSE). By submitting a contribution, you confirm you have the right to submit it under the project’s MIT license. Keep third-party notices intact and disclose incompatible licenses before proposing an addition.
