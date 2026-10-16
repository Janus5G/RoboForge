# RoboForge Studio 0.3.1 — Theme release test evidence

Theme-only patch to 0.3.0. No intentional change to backend routes, plugin IDs or AI-provider API.

- Node backend regression tests: PASS 7 / 7.
- TypeScript + TSX transpile syntax diagnostics: checked via global TypeScript compiler. Not equivalent to typecheck or full Vite build.
- Chromium static HTML/CSS smoke renders: dark and light at 1440 px, and overflow probes at smaller viewports. Not a React runtime test.
- Dark tokens (surface / text): 11.47:1 contrast; light tokens: 11.75:1. Brand accents against surface: 7.61:1 dark / 5.49:1 light. Token contrasts only, not a complete WCAG audit.
- Debian packaging: `dpkg-deb` archive validation, control version and launcher release path.
- React/Vite end-to-end build and external AI, ROS, MQTT, OPC, Siemens, Arduino, Isaac, Home Assistant tests: NOT VERIFIED in this environment.

Live deployment requires independent hardware, service, and local machine acceptance.
