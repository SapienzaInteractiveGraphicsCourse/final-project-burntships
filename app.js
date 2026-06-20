let scene, camera, renderer, controls, drone;
let lastFrameTime = performance.now();
const activeKeys = {};
let score = 0;
let ringsScored = 0;
let timerRunning = false;
let missionComplete = false;
let burstParticles = [];

// === TIME ATTACK MODE ===
const TIME_LIMIT = 45;        // countdown from 45 seconds
let gameTimeRemaining = 45;
let comboCount = 0;
let lastRingTime = -10;
const COMBO_WINDOW = 5;       // seconds to maintain combo
let scorePopups = [];         // floating "+" text popups
let gameOver = false;

// Camera View Mode Configuration Matrix — start in Follow mode for game feel
const cameraModes = ['orbit', 'follow', 'longshot'];
let currentCameraModeIndex = 1; // 0=orbit, 1=follow, 2=longshot

function initEngine() {
    // FORCE DISMISS LOADER IMMEDIATELY ON STARTUP
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.opacity = 0;
        setTimeout(() => loader.style.display = 'none', 500);
    }
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x0a0a20, 0.015);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    
    setupLightingArray();
    setupLabEnvironment();
    setupObstacleCourse();
    
    if (document.getElementById('val-rings') && obstacleData && obstacleData.rings) {
        document.getElementById('val-rings').innerText = `0 / ${obstacleData.rings.length}`;
    }

    
    drone = new CyberpunkDrone();
    scene.add(drone.mesh);

    
    document.getElementById('btn-camera').innerText = "[ C ] View: Follow Drone";
    controls.enabled = false;

    setupInteractions();
    animateLoop();
}

function setupInteractions() {
    const powerBtn = document.getElementById('btn-power');
    const cameraBtn = document.getElementById('btn-camera');
    const throttleSlider = document.getElementById('slider-throttle');
    const throttleDisplay = document.getElementById('val-throttle-display');

    powerBtn.addEventListener('click', () => {
        if (missionComplete) return;
        const isRunning = drone.toggleEngine();
        if (isRunning) {
            powerBtn.innerText = "[ SPACE ] Kill Engine";
            powerBtn.style.boxShadow = "0 0 15px #ff0055";
            const currentFactor = parseFloat(throttleSlider.value) / 100;
            drone.targetRotorSpeed = drone.maxRotorSpeedSetting * currentFactor;
            
            // Start game timer
            timerRunning = true;
            
            // Smooth vertical takeoff utilizing Tween.js [cite: 29]
            new TWEEN.Tween(drone.mesh.position).to({ y: 1.5 }, 1800).easing(TWEEN.Easing.Cubic.Out).start();
        } else {
            powerBtn.innerText = "[ SPACE ] Start Ignition";
            powerBtn.style.boxShadow = "none";
            drone.targetRotorSpeed = 0;
            timerRunning = false;
            
            // Smooth vertical bounce touchdown utilizing Tween.js [cite: 29]
            new TWEEN.Tween(drone.mesh.position).to({ y: 0, x: 0, z: 0 }, 1500).easing(TWEEN.Easing.Bounce.Out).start();
        }
    });

    cameraBtn.addEventListener('click', () => {
        currentCameraModeIndex = (currentCameraModeIndex + 1) % cameraModes.length;
        const activeMode = cameraModes[currentCameraModeIndex];
        
        if (activeMode === 'orbit') {
            cameraBtn.innerText = "View: Orbit Lab";
            controls.enabled = true; 
        } else if (activeMode === 'follow') {
            cameraBtn.innerText = "View: Follow Drone";
            controls.enabled = false; 
        } else if (activeMode === 'longshot') {
            cameraBtn.innerText = "View: Long Shot";
            controls.enabled = false;
            camera.position.set(22, 12, 22);
        }
    });

    throttleSlider.addEventListener('input', (e) => {
        const percentage = parseFloat(e.target.value);
        const multiplier = percentage / 100;
        throttleDisplay.innerText = `x${multiplier.toFixed(1)}`;
        if (drone.engineRunning) {
            drone.targetRotorSpeed = drone.maxRotorSpeedSetting * multiplier;
        }
    });

    // Map synchronous keystrokes into our activeKeys tracker object
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        activeKeys[key] = true;
        
        // === KEYBOARD SHORTCUTS ===
        if (key === ' ' || key === 'enter') {
            e.preventDefault();
            if (!missionComplete) powerBtn.click();
        }
        if (key === 'r' && !e.ctrlKey) {
            e.preventDefault();
            document.getElementById('btn-reset').click();
        }
        if (key === 'c') {
            e.preventDefault();
            cameraBtn.click();
        }
        if (key === 'escape') {
            e.preventDefault();
            if (drone.engineRunning) {
                drone.toggleEngine();
                powerBtn.innerText = "[ SPACE ] Start Ignition";
                powerBtn.style.boxShadow = "none";
                drone.targetRotorSpeed = 0;
                timerRunning = false;
            }
        }
    });
    window.addEventListener('keyup', (e) => { activeKeys[e.key.toLowerCase()] = false; });

   
    document.getElementById('btn-light').addEventListener('click', () => {
        deckLights.forEach(light => light.visible = !light.visible);
    });

    // Reset simulation button
    document.getElementById('btn-reset').addEventListener('click', resetSimulation);

    // ===== DRONE COLOR CONFIGURATION =====
    function setDroneColor(colorName, hexColor, emissiveHex) {
        if (!drone) return;
        // Update visor shader uniform
        if (drone.shaderUniforms && drone.shaderUniforms.uColor) {
            drone.shaderUniforms.uColor.value.setHex(hexColor);
        }
        // Update core cockpit light
        if (drone.mesh && drone.mesh.children.length > 0) {
            const chassisGroup = drone.mesh.children[0];
            if (chassisGroup) {
                chassisGroup.children.forEach(child => {
                    if (child.isPointLight) child.color.setHex(hexColor);
                });
            }
        }
        // Highlight active color button, reset others
        ['cyan', 'magenta', 'gold'].forEach(c => {
            const btn = document.getElementById(`btn-color-${c}`);
            if (btn) btn.style.background = 'transparent';
        });
        const activeBtn = document.getElementById(`btn-color-${colorName}`);
        if (activeBtn) activeBtn.style.background = '#ffffff22';
    }
    document.getElementById('btn-color-cyan').addEventListener('click', () => setDroneColor('cyan', 0x00ffcc));
    document.getElementById('btn-color-magenta').addEventListener('click', () => setDroneColor('magenta', 0xff0055));
    document.getElementById('btn-color-gold').addEventListener('click', () => setDroneColor('gold', 0xffaa00, 0xff8800));

    // Load high score on init
    const hs = parseInt(localStorage.getItem('droneHighScore') || '0');
    document.getElementById('val-highscore').innerText = hs;

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

/**
 * Iterates asynchronous multi-key chording maps to scale movement speeds by rotor RPM
 */
function createRingBurst(position) {
    const colors = [0x00ffcc, 0xff0055, 0xffff00, 0xff00ff];
    for (let i = 0; i < 20; i++) {
        const size = 0.08 + Math.random() * 0.12;
        const geo = new THREE.SphereGeometry(size, 4, 4);
        const mat = new THREE.MeshBasicMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            transparent: true,
            opacity: 1.0
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        const dir = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(1.5 + Math.random() * 2.5);
        mesh.userData = { velocity: dir, life: 1.0 };
        scene.add(mesh);
        burstParticles.push(mesh);
    }
}

function updateBurstParticles(dt) {
    for (let i = burstParticles.length - 1; i >= 0; i--) {
        const p = burstParticles[i];
        p.position.add(p.userData.velocity.clone().multiplyScalar(dt));
        p.userData.velocity.multiplyScalar(0.97);
        p.userData.life -= dt * 1.2;
        p.material.opacity = Math.max(0, p.userData.life);
        p.scale.setScalar(0.3 + p.userData.life * 0.7);
        if (p.userData.life <= 0) {
            scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
            burstParticles.splice(i, 1);
        }
    }
}

/**
 * Creates a floating score popup that drifts up and fades
 */
function createScorePopup(position, text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color || '#00ffcc';
    ctx.shadowBlur = 12;
    ctx.fillStyle = color || '#00ffcc';
    ctx.fillText(text, 128, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(position);
    sprite.position.y += 1.5;
    sprite.scale.set(4, 1, 1);
    sprite.userData = { life: 1.5, vy: 1.2 };
    scene.add(sprite);
    scorePopups.push(sprite);
}

function updateScorePopups(dt) {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const s = scorePopups[i];
        s.position.y += s.userData.vy * dt;
        s.userData.life -= dt;
        s.material.opacity = Math.max(0, s.userData.life / 1.5);
        const scale = 4 * (0.5 + s.userData.life / 3);
        s.scale.set(scale, scale * 0.25, 1);
        if (s.userData.life <= 0) {
            scene.remove(s);
            s.material.dispose();
            s.material.map.dispose();
            scorePopups.splice(i, 1);
        }
    }
}

/**
 * Respawns a ring at a new random position after it's been collected
 */
function respawnRing(ringData) {
    // Random position within arena, not too close to center
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 18;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 1.5 + Math.random() * 10;
    const rotY = Math.random() * Math.PI * 2;
    
    ringData.position.set(x, y, z);
    ringData.mesh.position.set(x, y, z);
    ringData.mesh.rotation.y = rotY;
    
    // Reset visual
    if (ringData.mesh && ringData.mesh.material) {
        ringData.mesh.material.color.setHex(0x00ffcc);
        ringData.mesh.material.emissive.setHex(0x00ffcc);
        ringData.mesh.material.emissiveIntensity = 1.5;
        ringData.mesh.material.transparent = false;
        ringData.mesh.material.opacity = 1.0;
        ringData.mesh.material.needsUpdate = true;
    }
    ringData.scored = false;
}

function processFlightInputs() {
    if (!drone.engineRunning || missionComplete || gameOver) return;
    
    // Reset velocity targets each frame — only keys held down will set them
    drone.targetVelocity.x = 0;
    drone.targetVelocity.z = 0;
    drone.targetVelocity.y = 0;
    
    // Core mechanical dependency: kinetic velocity scales with rotor speed
    const thrustForce = drone.rotorSpeed * 0.75; 
    
    // WASD controls
    if (activeKeys['w']) drone.targetVelocity.z = -thrustForce;
    if (activeKeys['s']) drone.targetVelocity.z = thrustForce;
    if (activeKeys['a']) drone.targetVelocity.x = -thrustForce;
    if (activeKeys['d']) drone.targetVelocity.x = thrustForce;
    
    // Arrow key controls (same as WASD)
    if (activeKeys['arrowup']) drone.targetVelocity.z = -thrustForce;
    if (activeKeys['arrowdown']) drone.targetVelocity.z = thrustForce;
    if (activeKeys['arrowleft']) drone.targetVelocity.x = -thrustForce;
    if (activeKeys['arrowright']) drone.targetVelocity.x = thrustForce;
    
    // Vertical lift
    if (activeKeys['q']) drone.targetVelocity.y = thrustForce * 0.6;
    if (activeKeys['e']) drone.targetVelocity.y = -thrustForce * 0.6;
}


function manageCameraPerspectives() {
    const activeMode = cameraModes[currentCameraModeIndex];
    if (activeMode === 'orbit') {
        controls.target.copy(drone.mesh.position);
    } 
    else if (activeMode === 'follow') {
        const speed = drone.velocity.length();
        
        
        const distOffset = 5.0 + Math.min(speed * 1.5, 3.0);
        const heightOffset = 2.5 + Math.min(speed * 0.8, 2.0);
        
        
        const targetPos = new THREE.Vector3(
            drone.mesh.position.x,
            drone.mesh.position.y + heightOffset,
            drone.mesh.position.z + distOffset
        );
        
        
        const lerpFactor = Math.min(0.12 + speed * 0.06, 0.22);
        camera.position.lerp(targetPos, lerpFactor);
        
        
        camera.lookAt(drone.mesh.position.x, drone.mesh.position.y + 0.3, drone.mesh.position.z);
    } 
    else if (activeMode === 'longshot') {
        const time = performance.now() * 0.0001;
        const orbitRadius = 25;
        const orbitHeight = 15;
        const tx = drone.mesh.position.x + Math.cos(time) * orbitRadius;
        const tz = drone.mesh.position.z + Math.sin(time) * orbitRadius;
        camera.position.lerp(new THREE.Vector3(tx, orbitHeight, tz), 0.03);
        camera.lookAt(drone.mesh.position);
    }
}

/**
 * Resets the drone and simulation state to defaults
 */
function resetSimulation() {
  // Clean up particles
  burstParticles.forEach(p => { scene.remove(p); p.geometry.dispose(); p.material.dispose(); });
  burstParticles = [];
  scorePopups.forEach(s => { scene.remove(s); s.material.dispose(); s.material.map.dispose(); });
  scorePopups = [];
  
  drone.mesh.position.set(0, 0, 0);
  drone.velocity.set(0, 0, 0);
  drone.targetVelocity.set(0, 0, 0);
  drone.rotorSpeed = 0;
  drone.targetRotorSpeed = 0;
  drone.hitColumn = false;
  if (drone.engineRunning) drone.toggleEngine();
  document.getElementById('btn-power').innerText = "[ SPACE ] Start Ignition";
  document.getElementById('btn-power').style.boxShadow = "none";
  document.getElementById('val-battery').innerText = "100.0%";
  document.getElementById('val-timer').innerText = "0:45";
  document.getElementById('val-timer').style.color = '#fff';
  document.getElementById('val-timer').style.textShadow = 'none';
  document.getElementById('val-combo').innerText = '';
  document.getElementById('val-score').style.color = '#fff';
  document.getElementById('gameover-overlay').style.display = 'none';
  
  score = 0;
  ringsScored = 0;
  gameTimeRemaining = TIME_LIMIT;
  comboCount = 0;
  lastRingTime = -10;
  timerRunning = false;
  missionComplete = false;
  gameOver = false;
  
  // Reset all rings to their original positions
  const originalPositions = [
    { x: -6, y: 3, z: 4, rotY: Math.PI / 4 },
    { x: 6, y: 4, z: -4, rotY: -Math.PI / 4 },
    { x: 0, y: 5, z: 10, rotY: 0 }
  ];
  obstacleData.rings.forEach((r, i) => {
    const orig = originalPositions[i] || { x: (Math.random()-0.5)*20, y: 3+Math.random()*6, z: (Math.random()-0.5)*20, rotY: Math.random()*6 };
    r.position.set(orig.x, orig.y, orig.z);
    r.mesh.position.set(orig.x, orig.y, orig.z);
    r.mesh.rotation.y = orig.rotY;
    r.scored = false;
    if (r.mesh && r.mesh.material) {
      r.mesh.material.color.setHex(0x00ffcc);
      r.mesh.material.emissive.setHex(0x00ffcc);
      r.mesh.material.emissiveIntensity = 1.5;
      r.mesh.material.transparent = false;
      r.mesh.material.opacity = 1.0;
      r.mesh.material.needsUpdate = true;
    }
  });
  document.getElementById('val-score').innerText = "0";
  if (document.getElementById('val-rings')) {
      document.getElementById('val-rings').innerText = `0 / ${obstacleData.rings.length}`;
  }
  
  const hs = parseInt(localStorage.getItem('droneHighScore') || '0');
  document.getElementById('val-highscore').innerText = hs;
}

/**
 * Central loop step — Time Attack mode with combos + penalties
 */
function animateLoop() {
    requestAnimationFrame(animateLoop);
    const currentTime = performance.now();
    const timeDelta = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    const dtSec = Math.min(timeDelta * 0.001, 0.1);

    processFlightInputs();
    TWEEN.update();
    drone.update(timeDelta);

    // ===== COLLISION & SCORING =====
    const newScoredRings = drone.checkCollisions(obstacleData);
    
    // --- Column collision penalty ---
    if (drone.hitColumn && timerRunning && !gameOver) {
        score = Math.max(0, score - 500);
        document.getElementById('val-score').innerText = score.toString();
        
        // Drain battery on hit
        const batVal = parseFloat(document.getElementById('val-battery').innerText) || 100;
        const newBat = Math.max(0, batVal - 10);
        document.getElementById('val-battery').innerText = newBat.toFixed(1) + '%';
        
        // Small burst at drone position to show impact
        createRingBurst(drone.mesh.position);
        
        // Flash score red briefly (via CSS class would be complex, just do text color)
        const scoreEl = document.getElementById('val-score');
        scoreEl.style.color = '#ff0055';
        setTimeout(() => scoreEl.style.color = '#fff', 200);
        
        drone.hitColumn = false;
    }
    
    // --- Ring scoring ---
    newScoredRings.forEach(idx => {
        if (gameOver) return;
        
        const now = currentTime / 1000;
        
        // Combo: rings collected within COMBO_WINDOW seconds stack
        if (now - lastRingTime < COMBO_WINDOW) {
            comboCount++;
        } else {
            comboCount = 1;
        }
        lastRingTime = now;
        
        const multiplier = Math.min(comboCount, 8);
        const basePts = 1000;
        const ptsAwarded = basePts * multiplier;
        score += ptsAwarded;
        ringsScored++;
        
        // Update HUD
        document.getElementById('val-score').innerText = score.toString();
        document.getElementById('val-rings').innerText = `${ringsScored} / ${obstacleData.rings.length}`;
        document.getElementById('val-combo').innerText = 
            multiplier > 1 ? `${multiplier}x COMBO!` : '';
        
        const ringData = obstacleData.rings[idx];
        const ringPos = ringData.position.clone();
        
        // Particle burst
        createRingBurst(ringPos);
        
        // Score popup
        const popupText = multiplier > 1 ? `+${ptsAwarded} (${multiplier}x)` : `+${ptsAwarded}`;
        const popupColor = multiplier > 2 ? '#ffff00' : (multiplier > 1 ? '#ff8800' : '#00ffcc');
        createScorePopup(ringPos, popupText, popupColor);
        
        // Respawn ring at new position instead of dimming it
        respawnRing(ringData);
    });

    // ===== TIME ATTACK COUNTDOWN =====
    if (timerRunning && !gameOver) {
        gameTimeRemaining -= dtSec;
        document.getElementById('val-timer').innerText = formatCountdown(gameTimeRemaining);
        
        // Flash timer red when < 10 seconds
        const timerEl = document.getElementById('val-timer');
        if (gameTimeRemaining < 10) {
            timerEl.style.color = '#ff0055';
            timerEl.style.textShadow = '0 0 10px #ff0055';
        } else {
            timerEl.style.color = '#fff';
            timerEl.style.textShadow = 'none';
        }
        
        // GAME OVER
        if (gameTimeRemaining <= 0) {
            gameOver = true;
            timerRunning = false;
            gameTimeRemaining = 0;
            document.getElementById('val-timer').innerText = '0:00';
            
            // Kill engine
            if (drone.engineRunning) drone.toggleEngine();
            document.getElementById('btn-power').innerText = "[ SPACE ] Start Ignition";
            document.getElementById('btn-power').style.boxShadow = "none";
            drone.targetRotorSpeed = 0;
            
            // Calculate final score with battery bonus
            const batVal = parseFloat(document.getElementById('val-battery').innerText) || 0;
            const batBonus = Math.round(batVal * 5);
            const finalScore = score + batBonus;
            
            // Show GAME OVER overlay
            document.getElementById('go-rings').innerText = ringsScored;
            document.getElementById('go-score').innerText = finalScore;
            document.getElementById('go-bonus').innerText = `+${batBonus} battery bonus`;
            document.getElementById('gameover-overlay').style.display = 'flex';
            
            // High score
            const prev = parseInt(localStorage.getItem('droneHighScore') || '0');
            if (finalScore > prev) {
                localStorage.setItem('droneHighScore', finalScore.toString());
                document.getElementById('val-highscore').innerText = finalScore;
                document.getElementById('go-newrecord').style.display = 'block';
            } else {
                document.getElementById('go-newrecord').style.display = 'none';
            }
        }
    }

    // ===== UPDATE PARTICLES & POPUPS =====
    updateBurstParticles(dtSec);
    updateScorePopups(dtSec);
    if (typeof updateAmbientParticles === 'function') {
        updateAmbientParticles(dtSec);
    }

    // ===== OBSTACLE ANIMATIONS (rings bob + rotate) =====
    if (typeof updateObstacleAnimations === 'function') {
        updateObstacleAnimations(dtSec, currentTime / 1000);
    }

    manageCameraPerspectives();

    // ===== HUD =====
    document.getElementById('val-altitude').innerText = `${drone.mesh.position.y.toFixed(2)} m`;
    document.getElementById('val-rpm').innerText = `${Math.round(drone.rotorSpeed * 12000)} RPM`;
    
    if (drone.engineRunning) {
        const curBat = parseFloat(document.getElementById('val-battery').innerText);
        if (curBat > 0) {
            const drainageRate = 0.003 * (drone.rotorSpeed / 0.4);
            document.getElementById('val-battery').innerText = `${(curBat - drainageRate).toFixed(1)}%`;
        }
        const batVal = parseFloat(document.getElementById('val-battery').innerText);
        if (batVal <= 0 && !gameOver) {
            if (drone.engineRunning) drone.toggleEngine();
            document.getElementById('btn-power').innerText = "[ SPACE ] Start Ignition";
            document.getElementById('btn-power').style.boxShadow = "none";
            drone.targetRotorSpeed = 0;
            document.getElementById('val-battery').innerText = "0.0%";
            timerRunning = false;
        }
    }

    if (controls.enabled) controls.update();
    renderer.render(scene, camera);
}

function formatCountdown(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

window.addEventListener('DOMContentLoaded', initEngine);
