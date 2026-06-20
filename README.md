<div align="center">

# 🚁 CYBERPUNK DRONE LAB

**Interactive 3D Graphics Simulation Environment**

[![Three.js](https://img.shields.io/badge/Three.js-r128-cyan?style=flat-square&logo=three.js)](https://threejs.org/)
[![WebGL](https://img.shields.io/badge/WebGL-2.0-magenta?style=flat-square&logo=webgl)](https://www.khronos.org/webgl/)
[![GLSL](https://img.shields.io/badge/GLSL-4.6-gold?style=flat-square&logo=opengl)](https://www.khronos.org/opengl/wiki/Core_Language_(GLSL))

**Interactive Graphics — Final Project** · Sapienza University of Rome · A.Y. 2025/2026

</div>

> A real-time 3D cyberpunk drone flight simulator built with **Three.js**. Pilot a quadrotor drone through a neon-lit laboratory arena, collect target rings while avoiding obstacles, and rack up combo-scored points — all within a 45-second time attack. Features hierarchical 3D modelling, custom GLSL shaders, procedural textures, multi-source lighting, and a full arcade game loop.

---

## 🔷 Requirements Coverage

| # | Requirement | Implementation |
|:-:|:------------|:---------------|
| **1** | **Hierarchical Models** (≥3 nesting levels) | 4-level drone hierarchy: `Scene` → `Group` → chassis + 4 rotor arms → propeller groups → individual blades |
| **2** | **Lights & Textures** (≥3 light types) | 10-light array (hemisphere, directional ×2, spot, point ×6) + procedural grid colour map + procedural normal (bump) map |
| **3** | **User Interaction** (keyboard + mouse + UI) | WASD/arrows flight, Q/E altitude, Space engine, C camera, R reset, ESC kill switch + HUD buttons + throttle slider + colour configurator |
| **4** | **Animations** (mechanical + env + GPU + camera) | Rotor spin (fps-independent), ring bob/rotate, chase-cam lerp, burst particles, score popups, ambient drift, Tween.js takeoff/landing, **custom GLSL shader** |
| **5** | **Report** (5–10 pages) | [`report.pdf`](./report.pdf) — 16 pages with full technical breakdown and code snippets |

---

## 🎮 Features

| Category | Details |
|:---------|:--------|
| 🚁 **Hierarchical Drone** | Chassis, 4 rotor arms, spinning propellers, and a custom GLSL energy-shield visor shader |
| 🟣 **Custom GLSL Shader** | Animated matrix-style lattice grid with Fresnel edge glow — colour configurable at runtime (Cyan / Magenta / Gold) |
| 🟦 **Procedural Textures** | Neon grid floor map + random bump normal map, both generated in-memory via Canvas API |
| 📷 **3 Camera Modes** | **Orbit** (free look), **Follow** (dynamic chase-cam with speed-based offset), **Long Shot** (cinematic orbit) |
| ⏱ **Time Attack Mode** | 45-second countdown, collect rings for points, chain combos up to **8× multiplier** |
| 🔗 **Combo Scoring** | Collect rings within 5 seconds to stack multipliers; combo resets on timeout or collision |
| 🔋 **Battery System** | Drains while flying; column collisions drain extra; remaining battery = bonus points at game over |
| 🎨 **Drone Colour Config** | Switch between <span style="color:#00FFFF">**Cyan**</span>, <span style="color:#FF00AA">**Magenta**</span>, and <span style="color:#FFDD00">**Gold**</span> visor colours at runtime |
| ✨ **Particle FX** | Ring collection bursts, ambient floating particles, 3D floating score popups with fade |
| 🏗 **Obstacle Course** | 6 cylindrical columns with collision pushback; 3 respawning target rings |
| 🏆 **High Score** | Persistent high score saved to `localStorage` |
| 📊 **Full HUD** | Altitude, RPM, battery, score, rings collected, countdown timer, combo indicator |

---

## 🕹 Controls

### Keyboard

| Key | Action |
|:---:|:-------|
| `W` / `↑` | Move forward |
| `S` / `↓` | Move backward |
| `A` / `←` | Strafe left |
| `D` / `→` | Strafe right |
| `Q` | Ascend |
| `E` | Descend |
| `Space` / `Enter` | Toggle engine ignition |
| `C` | Cycle camera: Orbit → Follow → Long Shot |
| `R` | Reset simulation |
| `ESC` | Kill engine immediately |

### HUD Panel

| Control | Function |
|:--------|:---------|
| **Throttle Slider** | Rotor speed multiplier (20%–250%) |
| **Colour Buttons** | Switch drone visor colour |
| **Deck Lights** | Show/hide environment point lights |
| **Reset** | Full simulation reset |

---

## 🚀 How to Run

### Option A — Local (no server needed)

```bash
# Simply open the file in any modern browser
open index.html
```

### Option B — GitHub Pages

🌐 [**https://sapienzainteractivegraphicscourse.github.io/final-project-burntships/**](https://sapienzainteractivegraphicscourse.github.io/final-project-burntships/)

**No build tools, bundlers, or servers required.** All dependencies load from CDN — just open and fly.

### Internet Dependencies

| Library | CDN |
|:--------|:----|
| [Three.js r128](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) | `cdnjs` |
| [OrbitControls](https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js) | `jsdelivr` |
| [Tween.js v18.6.4](https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js) | `cdnjs` |

---

## 📁 File Structure

```
IG Final Project Part B/
├── 📄 index.html         # Entry point, HUD layout, CSS styling
├── 📄 app.js             # Game loop, input handling, camera management, scoring         [Partner A]
├── 📄 drone.js           # Hierarchical drone model, flight physics, collision detection  [Partner A]
├── 📄 sceneconfig.js     # Lighting array, procedural textures, obstacle course           [Partner B]
├── 📄 shaders.js         # Custom GLSL programmable shader pipeline                       [Partner B]
├── 📄 report.pdf         # 16-page project report with code snippets and diagrams
└── 📄 README.md          # This file
```

### Module Roles

| File | Partner | Responsibilities |
|:-----|:--------|:-----------------|
| `app.js` | **A** (Zeyad) | Core game loop, FPS-independent update, keyboard/mouse input, camera state machine, HUD rendering, combo scoring, battery logic, particle systems, `localStorage` persistence |
| `drone.js` | **A** (Zeyad) | `CyberpunkDrone` class with 4-level hierarchical assembly, arm anchor positioning, propeller counter-rotation, smooth rotor lerp, column/ring collision detection, visor shader uniform management |
| `sceneconfig.js` | **B** (Rayan) | `setupScene()` — 60×60 arena with 4 walls, 6 column obstacles, 3 target rings, terrain floor. `setupLightingArray()` — 10-light configuration. Procedural colour + normal map generation via Canvas API |
| `shaders.js` | **B** (Rayan) | `vertexShader` and `fragmentShader` strings for `ShaderMaterial`. Fresnel edge-glow computation, animated lattice grid pattern, colour uniform interface, additive alpha blending |

---

## 🧠 Technical Highlights

### Hierarchical Transform Tree

```
Scene
└── Group: drone.mesh (root)
    ├── Group: chassisGroup
    │   ├── Mesh: Body capsule (CylinderGeometry)
    │   ├── Mesh: Visor cone (ShaderMaterial — GLSL)
    │   └── PointLight: Cockpit core
    └── Group: armAnchor ×4 (positioned at (±1, 0, ±1))
        ├── Mesh: Arm beam (BoxGeometry)
        ├── Mesh: Motor cap (SphereGeometry)
        └── Group: propGroup (spinning — local Y rotation)
            ├── Mesh: Blade (BoxGeometry, flattened)
            └── Mesh: Center nut (SphereGeometry)
```

### Lighting Topology

| Source | Count | Colour | Role |
|:-------|:-----:|:-------|:-----|
| `HemisphereLight` | 1 | `0x4466aa` / `0x0a0a1a` | Ambient sky/ground fill |
| `DirectionalLight` | 2 | `0xffffff` | Primary shadow + fill |
| `SpotLight` | 1 | `0x88ccff` | Follows drone position — dramatic overhead spot |
| `PointLight` (deck) | 6 | `0x4488ff` | Arena corners + centre — toggleable |
| `PointLight` (drone) | 1 | user colour | Cockpit core light |

### Game State Machine

```
┌─────────┐  Space/Enter   ┌─────────┐  timer ≤ 0   ┌───────────┐
│  IDLE   │ ─────────────> │ FLYING  │ ────────────> │ GAME OVER │
│         │                │         │               │           │
│ engine  │                │ 45s     │               │ final     │
│ off     │                │ scoring │               │ score +   │
│ timer=0 │ <───────────── │ active  │               │ battery   │
└─────────┘    Reset R     └─────────┘               │ bonus     │
                                                      └───────────┘
```

### Scoring Formula

```
score += BASE_POINTS × combo_multiplier
```

- **BASE_POINTS** = 1,000 per ring
- **combo_multiplier** = `min(ringStreak, 8)` — resets if >5s between collections
- **Collision penalty**: −500 points + 10% battery drain per column hit
- **Final bonus**: `remainingBattery × 100` added at game over

---

## 🧑‍💻 Authors

| Name | Matricola | Role |
|:-----|:----------|:-----|
| **Zeyad Kandil** | 2262749 | Core engine, flight physics, drone model, HUD, game loop |
| **Rayan Naceur** | 2251772 | Custom shaders, lighting topology, procedural environment, obstacle course |

---

## 📄 Submission

**Course:** Interactive Graphics — Final Project  
**Professor:** [**Prof. Marco Schaerf**](mailto:marco.schaerf@uniroma1.it)  
**University:** Sapienza University of Rome  
**Academic Year:** 2025/2026

---

<div align="center">

**🟦 Built with Three.js · WebGL · GLSL · JavaScript ES6+ 🟪**

</div>
