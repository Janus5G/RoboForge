# RoboForge v0.3.1 — theme acceptance

- Palette: graphite #1b2229 / #212a31, silver #d9e0e4 / #edf1f2, cyan #42d5f2 (dark mode) / #086b86 (light mode).
- Dark: graphite backgrounds, silver text, cyan interactive markers.
- Light: light silver backgrounds, dark graphite text, deeper cyan interactive markers.
- No titanium gloss/3D or purple/violet accents. Existing panel geometry unchanged.
- Color inversion controlled by the existing appearance toggle; persisted under `roboforge.theme`.
- No logo/image lifted from the reference picture; only color inspiration.
- Compatibility: backend API routes, plugin identifiers and AI provider selection unchanged.
- Testing gates: backend regression test + HTML/CSS smoke render at desktop and mobile. Full React build and hardware/provider integration requires target environment.
