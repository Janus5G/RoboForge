# RoboForge Studio — kort dansk introduktion

RoboForge Studio v0.3.2 er et lokalt udviklingsmiljø til robotik, industrielle protokoller og AI-assisteret kodearbejde. Projektet er **ikke** en hardwareverificeret industriel styreenhed.

Programmet omfatter otte indbyggede integrationskategorier: ROS 2, OPC UA, MQTT/EMQX, NVIDIA Isaac Sim, Siemens Xcelerator, Arduino, Home Assistant og REA Analysis. De første tre er kernefunktioner; de øvrige er eksperimentelle. REA-pluginet kræver separat installation af `rea-agents`, kompatibel Node.js og en godkendt analysemappe; integrationen er deaktiveret som standard. Flere funktioner er begrænset til læsning eller kræver udtrykkelig bekræftelse, før data kan sendes. Nye betroede plugins registreres automatisk ved *build-tid* fra kildekodemapperne, ikke ved at køre ukendt kode fra nettet.

AI Studio kan bruge lokal Ollama eller frivilligt vælge OpenAI, DeepSeek eller en serverkonfigureret kompatibel AI-tjeneste. Eksterne tjenester og legitimationsoplysninger er ikke påkrævet for at starte programmet. AI-genereret kode må ikke installeres på robotter eller industriudstyr uden gennemgang og særskilt test.

## Installation

Du skal have Node.js 20.19+ (eller 22+) og npm. Pak ZIP-arkivet ud i sin egen mappe. Kør `start-windows.cmd` på Windows eller `./start-linux.sh` på Linux. Efter installation og build åbnes `http://127.0.0.1:3001`.

Se den primære [README](../README.md) for alle installationskommandoer, API-kompatibilitet og de konkrete funktionsgrænser. Projektets [præsentationswebside](index.html) beskriver anvendelsesområderne og kan udgives med GitHub Pages fra `/docs`.

## Design og teststatus

Designretningen er godkendt med grafitgråt/sølvgråt og cyanblåt, i både mørkt og lyst tema. Billederne i README er **statiske designforhåndsvisninger**, ikke skærmbilleder fra en verificeret React-build. Backendens 11 automatiske tests bestod i integrationsmiljøet. React/Vite-build, fysiske enheder og eksterne modeltjenester er endnu ikke verificeret her.

**Licens:** RoboForge Studio udgives under [MIT-licensen](../LICENSE), Copyright (c) 2026 Janus5G. Tredjepartsafhængigheder og eksterne aktiver kan have egne licensvilkår.
