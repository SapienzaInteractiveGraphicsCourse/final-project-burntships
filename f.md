cyberpunk-drone-lab/
│
├── index.html       ├── shaders.js       ├── sceneConfig.js   ├── drone.js         └── app.js           ```

As **Partner B (The Architect)**, you will focus almost entirely on **`shaders.js`** and **`sceneConfig.js`** during Day 1 and Day 2. Here is your complete guide, explanation, and production code to execute this phase immediately.

---

## Day 1: Architecture, HUD Layout, & Shading Sandbox

### Goal
Establish the environment framework, mount the WebGL viewport, and write the custom programmable GPU pipeline strings.

### Explanation of Concepts
* **The Programmable Graphics Pipeline:** Standard Three.js materials hide the math. By writing a custom `ShaderMaterial`, you write code that runs directly on the graphics card (GPU). Data flows from your CPU script into the GPU using **Uniforms** (variables like time or colors that stay constant for all pixels in a frame) and **Varyings** (variables passed from the vertex shader to the fragment shader that interpolate across the face of a 3D geometric shape).
* **Vertex Shader:** Runs first. It takes the raw 3D coordinates of your shape's points (vertices) and projects them onto your flat 2D screen using a projection matrix transformation.
* **Fragment Shader:** Runs second. It calculates the final RGBA color of *every single pixel* inside that projected shape. We use a **Fresnel effect** calculation ($1.0 - \text{abs}(vPosition.z)$) to check if a pixel is near the edge of the object's 3D horizon, creating a glowing neon shield outline.

### Day 1 Codebase

Create these two files in your folder:

#### 1. `index.html` (The Unified Entry Portal)
This file sets up your user interface panels and tells the browser exactly which script files to execute in sequence.


### Day 2: Advanced Illumination Arrays & Procedural Environments
Goal
Inject the maximum brightness environment lighting layout, generate high-performance procedural canvas floor maps, and build complex obstacles to turn the blank space into a flight testing course.

### Explanation of Concepts
* **Hemisphere vs. Directional Lighting:** A HemisphereLight models natural sky reflections, casting color gradients from a sky value down to a ground value uniformly across all meshes. A DirectionalLight mimics an overhead spotlight, throwing parallel rays in a specific direction. Turning on castShadow = true forces the graphics card to calculate real-time occlusion silhouettes across your scene graph.

* **Procedural Texturing via Canvas:** Loading external .jpg or .png texture image files over a server slows down your load times and can break if file paths are slightly off. Instead, we write a quick sub-script that draws a neon grid pattern onto a standard 2D HTML <canvas> element entirely in memory, and immediately pass it into a THREE.CanvasTexture. This satisfies the Color and Roughness/Specular texture map requirement using pure code with zero file sizes.







TECHNICAL REPORT: 
### PHASE 1 (DAYS 1 & 2)
* **Module: Graphics Pipeline Infrastructure, Procedural Environments & Lighting Arrays**
1. Programmable Graphics Pipeline & Custom Shaders (Day 1)To go beyond standard, fixed-function shading configurations, the project uses a custom, low-level programmable pipeline written in Graphics Library Shading Language (GLSL) via Three.js ShaderMaterial wrappers. This approach moves the rendering math directly onto the GPU, which is optimal for real-time graphics applications.  
    1.1. Structural Data FlowData passes from the CPU execution script to the GPU memory registers through two main channels:Uniforms (uTime, uColor): Global variables that remain constant for all vertices and fragments during a single draw call. The uTime clock increment allows for smooth, time-dependent procedural animations calculated per-frame.Varyings (vUv, vPosition): Assigned within the Vertex Shader, these variables pass interpolated values down to the Fragment Shader across the primitive triangle faces.
    1.2. Algorithmic Fragment ManipulationThe Fragment Shader code in shaders.js runs a custom matrix lattice pattern. It uses high-frequency trigonometric functions combined with a conditional step threshold to generate sharp neon lines:
    $$\text{gridLattice} = \text{step}(0.92, \sin(u \cdot 40.0 + t \cdot 2.0) \cdot \cos(v \cdot 40.0 - t \cdot 3.0))$$
    To accentuate the 3D form, a Fresnel-style edge glow is simulated by evaluating the local fragment position depth ($z$-axis depth component):
    $$\text{edgeGlow} = (1.0 - |vPosition.z|)^4$$
    This ensures the visor mesh exhibits high transparency on front-facing normals while blending into an intense neon pink and cyan glow at steep viewing angles.
2. Radiosity Topology & Procedural Texturing (Day 2)To maximize visual fidelity and highlight surface details without relying on slow external image asset requests, Day 2 focused on advanced lighting arrays and procedural physically based texturing.  
    2.1. Lighting Array SpecificationThe testing bay environment uses a multi-layered illumination topology to balance clear visibility with high-contrast cyberpunk styling:  Hemisphere Sky Fill: A HemisphereLight creates an overarching blue-to-grey environmental gradient, preventing flat, pitch-black shadows in unlit areas.Directional Shadow Spotlight: An intense directional key light projects parallel rays across the scene. To ensure crisp rendering and prevent pixelated shadow boundaries, a high-resolution $2048 \times 2048$ shadow map texture buffer is allocated to the GPU.  Localized Highlights: A high-output white SpotLight acts as an overhead diagnostic lamp directly above the center launch ring, while an opposing cyan rim light sharpens object silhouettes.
    2.2. Procedural Canvas Texturing Map WorkflowsTo fulfill the requirement for comprehensive texture types (color, roughness, specular) under a tight deadline, maps are generated programmatically using an in-memory HTML5 2D canvas.  A grid layout is drawn via the Canvas API and fed into a THREE.CanvasTexture wrapper with wrapping parameters set to THREE.RepeatWrapping ($16 \times 16$ tiles). This procedural map is assigned to the floor's MeshStandardMaterial to dictate both the diffuse color channel (map) and the surface reflectivity spectrum (roughnessMap), allowing light sources to gleam realistically off metallic plates while catching cleanly on panel gaps.  
3. Level Geometry & Compound ObstaclesTo transform the environment from a blank space into an interactive flight testing course, complex structural obstacles were generated programmatically in sceneConfig.js.  The obstacle course includes:Hexagonal Columns: Built using modified CylinderGeometry boundaries to act as heavy concrete structural pillars. Each column is turned into a compound model by grouping it with double-nested neon structural rings that glow using high-intensity emissive materials.  Hovering Rings: Suspended TorusGeometry rings are placed at various heights and angles across the room. These act as aerial target gates, giving you clear targets to practice flying through using the drone's flight controls



### Day 3: Kinematics, Asynchronous Chords, & Viewport Interpolation
* **Goal**
    Implement a frame-rate independent velocity integration loop for smooth flight kinetics, handle asynchronous multi-key inputs simultaneously, and engineer a dynamic camera perspective state machine (Orbit, Follow, Long Shot).  Explanation of ConceptsAsynchronous Key Chording: Standard browser keydown events have an annoying built-in delay meant for typing text. If you hold down W and then press A, the browser will often drop or pause the W signal. To achieve responsive flight controls, we use an active dictionary object (activeKeys) that tracks the hardware states (true/false) of keys simultaneously.Frame-Rate Independent Inertia: If you move an object by a fixed amount every frame (e.g., position.z -= 0.1), the drone will fly faster on a high-end $140\text{Hz}$ screen than on a $60\text{Hz}$ screen. To make physics identical across all computers, we calculate the elapsed time since the last frame (timeDelta) and scale all velocities by this fraction of a second (dt).Camera Coordinate Lerping (Chase Cam): Instead of pinning the camera directly to the drone, which looks rigid and robotic, we calculate a target chase position slightly behind and above the drone's position matrix. We then use Linear Interpolation (.lerp()) to smoothly glide the camera toward that target, creating a dynamic, fluid tracking effect that mimics real-world drone camera operators.


### Day 4: Boundary Safety Cages, Multi-File Verification, & Pre-Submission Testing
 * **Goal**
Implement hard algorithmic boundary restrictions to lock the quadcopter inside the workspace view, optimize cross-module interactions, and test the code layout thoroughly to prepare it for deployment.  Explanation of ConceptsAlgorithmic Position Clamping: To prevent the drone from flying off-screen if you hold a movement key down for too long, we create a strict coordinate constraint system. The code checks the drone's position matrix vector components ($X, Y, Z$) every frame. If it exceeds a boundary wall coordinate (like $25\text{m}$ out), it overrides the position coordinate instantly, forcing it to stick to that wall boundary, and clears out the velocity vector along that specific axis to prevent continuous force accumulations.Module Compilations: By referencing everything cleanly through descriptive functions, all separate scripts (shaders.js, sceneConfig.js, drone.js, and app.js) can easily interact with one another. They use shared, global scene parameters while keeping their structural logic completely isolated.