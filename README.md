# 🚁 Cyberpunk Drone Lab — Interactive Graphics Project

**Interactive Graphics — Final Project** 
Sapienza University of Rome · A.Y. 2025/2026

A real-time 3D cyberpunk drone flight simulator built with Three.js, featuring hierarchical modeling, custom GLSL shaders, procedural textures, and a full arcade-style scoring game.

\---

## 📋 Requirements Coverage

|#|Requirement|Implementation|
|-|-|-|
|1|**Hierarchical Models**|4-level drone hierarchy: `Group` → chassis + 4 rotor arms → propeller groups → individual blades, each with local transforms|
|2|**Lights \& Textures**|8-light array (hemisphere, ambient, directional ×2, spot, point ×4) + procedural grid color map + procedural normal (bump) map|
|3|**User Interaction**|WASD/arrows for flight, Q/E for altitude, Space for engine, C for camera, R for reset, ESC for kill switch + clickable HUD buttons + throttle slider + color configurator|
|4|**Animations**|Rotor spin (frame-rate independent), ring bob + rotate, camera chase cam lerp, burst particles, floating score popups, ambient particle drift, Tween.js takeoff/landing|
|5|**Report (5–10 pages)**|`report.pdf` included in this repository|

\---

## 🎮 Features

* **Hierarchical drone** with chassis, 4 rotor arms, spinning propeller blades, and a custom GLSL visor shader
* **Custom GLSL shader** — animated matrix-style lattice grid with Fresnel edge glow, color configurable at runtime
* **Procedural textures** — neon grid floor map + random bump normal map, both generated in-memory via Canvas API
* **3 camera modes** — Orbit (free look), Follow (dynamic chase cam with speed-based offset), Long Shot (cinematic orbit)
* **Time Attack game mode** — 45-second countdown, collect rings for points, chain combos up to 8× multiplier
* **Combo scoring** — collect rings within 5 seconds to stack multipliers
* **Battery system** — drains while flying, hits to columns drain extra, battery bonus at game over
* **Drone color config** — switch between Cyan, Magenta, and Gold visor colors at runtime
* **Particle FX** — ring collection bursts, ambient floating particles, 3D floating score popups
* **Obstacle course** — 5 hexagonal columns with collision pushback, 3 respawning target rings
* **Persistent high score** — saved to `localStorage`
* **Full HUD** — altitude, RPM, battery, score, rings collected, countdown timer, combo indicator

\---

## 🕹️ Controls

|Key|Action|
|-|-|
|`W` / `↑`|Move forward|
|`S` / `↓`|Move backward|
|`A` / `←`|Strafe left|
|`D` / `→`|Strafe right|
|`Q`|Ascend|
|`E`|Descend|
|`Space` / `Enter`|Toggle engine|
|`C`|Cycle camera (Orbit → Follow → Long Shot)|
|`R`|Reset simulation|
|`ESC`|Kill engine|

Additional controls are available via the on-screen HUD buttons:

* **Throttle slider** — adjusts rotor speed multiplier (20%–250%)
* **Color buttons** — change drone visor color
* **Deck Lights toggle** — show/hide environment lights
* **Reset button** — full simulation reset

\---

## 🚀 How to Run

Simply open `index.html` in any modern web browser

No build tools, servers, or installations required — everything runs from CDN-loaded Three.js and plain JavaScript.

#OR
**Click on this link:
* https://sapienzainteractivegraphicscourse.github.io/final-project-burntships/

### Internet Requirements

The project loads the following libraries from CDN:

* [Three.js r128](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js)
* [OrbitControls](https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js)
* [Tween.js v18.6.4](https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js)

\---

## 📁 File Structure

```
IG Final Project Part B/
├── index.html         # Entry point, HUD layout, and CSS styling
├── app.js             # Game loop, input handling, camera management, scoring (Partner A)
├── drone.js           # Hierarchical drone model and collision detection (Partner A)
├── sceneconfig.js     # Lighting array, procedural textures, obstacle course (Partner B)
├── shaders.js         # Custom GLSL programmable shader pipeline (Partner B)
├── report.pdf         # Project report with full documentation
└── README.md          # This file
```

\---

## 🧑‍💻 Authors

* **Zeyad** — Core engine, flight physics, drone model, HUD, game loop
* **Ryan** — Custom shaders, lighting topology, procedural environment, obstacle course

\---

## 📄 Submission

Submitted to: **Prof. Marco Schaerf** — [marco.schaerf@uniroma1.it](mailto:marco.schaerf@uniroma1.it)

