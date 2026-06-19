/**
 * App Module — Partner A & B (Integrated)
 * Core Engine, Input, HUD, Scoring, and Game Loop
 *
 * Integrates Partner B's environment (sceneconfig.js), shaders (shaders.js),
 * and Partner A's hierarchical drone model (drone.js) + game loop.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { CyberpunkDrone } from './drone.js';
import {
  setupLightingArray,
  setupLabEnvironment,
  setupObstacleCourse,
  updateObstacleAnimations,
  updateAmbientParticles,
  obstacleData,
  deckLights,
  resetSceneData,
} from './sceneconfig.js';
import './style.css';

// ================================================================
//  SCENE, CAMERA, RENDERER
// ================================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.fog = new THREE.FogExp2(0x0a0a20, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const container = document.getElementById('canvas-container');
if (container) container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.enabled = false; // Start in Follow mode

// ================================================================
//  GAME STATE
// ================================================================

const activeKeys = {};
let score = 0;
let ringsScored = 0;
let timerRunning = false;
let missionComplete = false;
let burstParticles = [];

// Time Attack mode
const TIME_LIMIT = 45;
let gameTimeRemaining = 45;
let comboCount = 0;
let lastRingTime = -10;
const COMBO_WINDOW = 5;
let scorePopups = [];
let gameOver = false;

// Camera modes
const cameraModes = ['orbit', 'follow', 'longshot'];
let currentCameraModeIndex = 1;

// Drone
let drone = null;
let lastFrameTime = performance.now();

// ================================================================
//  PARTICLE EFFECTS
// ================================================================

function createRingBurst(position) {
  const colors = [0x00ffcc, 0xff0055, 0xffff00, 0xff00ff];
  for (let i = 0; i < 20; i++) {
    const size = 0.08 + Math.random() * 0.12;
    const geo = new THREE.SphereGeometry(size, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 1.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 2,
      (Math.random() - 0.5) * 2,
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

// ================================================================
//  SCORE POPUPS (3D floating sprites)
// ================================================================

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
  const mat = new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
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

// ================================================================
//  RING RESPAWN
// ================================================================

function respawnRing(ringData) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 6 + Math.random() * 18;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = 1.5 + Math.random() * 10;
  const rotY = Math.random() * Math.PI * 2;

  ringData.position.set(x, y, z);
  ringData.mesh.position.set(x, y, z);
  ringData.mesh.rotation.y = rotY;

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

// ================================================================
//  FLIGHT INPUTS
// ================================================================

function processFlightInputs() {
  if (!drone.engineRunning || missionComplete || gameOver) return;

  drone.targetVelocity.x = 0;
  drone.targetVelocity.z = 0;
  drone.targetVelocity.y = 0;

  const thrustForce = drone.rotorSpeed * 0.75;

  if (activeKeys['w']) drone.targetVelocity.z = -thrustForce;
  if (activeKeys['s']) drone.targetVelocity.z = thrustForce;
  if (activeKeys['a']) drone.targetVelocity.x = -thrustForce;
  if (activeKeys['d']) drone.targetVelocity.x = thrustForce;

  if (activeKeys['arrowup']) drone.targetVelocity.z = -thrustForce;
  if (activeKeys['arrowdown']) drone.targetVelocity.z = thrustForce;
  if (activeKeys['arrowleft']) drone.targetVelocity.x = -thrustForce;
  if (activeKeys['arrowright']) drone.targetVelocity.x = thrustForce;

  if (activeKeys['q']) drone.targetVelocity.y = thrustForce * 0.6;
  if (activeKeys['e']) drone.targetVelocity.y = -thrustForce * 0.6;
}

// ================================================================
//  CAMERA MANAGEMENT
// ================================================================

function manageCameraPerspectives() {
  const activeMode = cameraModes[currentCameraModeIndex];

  if (activeMode === 'orbit') {
    controls.target.copy(drone.mesh.position);
  } else if (activeMode === 'follow') {
    const speed = drone.velocity.length();
    const distOffset = 5.0 + Math.min(speed * 1.5, 3.0);
    const heightOffset = 2.5 + Math.min(speed * 0.8, 2.0);

    const targetPos = new THREE.Vector3(
      drone.mesh.position.x,
      drone.mesh.position.y + heightOffset,
      drone.mesh.position.z + distOffset,
    );

    const lerpFactor = Math.min(0.12 + speed * 0.06, 0.22);
    camera.position.lerp(targetPos, lerpFactor);
    camera.lookAt(drone.mesh.position.x, drone.mesh.position.y + 0.3, drone.mesh.position.z);
  } else if (activeMode === 'longshot') {
    const time = performance.now() * 0.0001;
    const orbitRadius = 25;
    const orbitHeight = 15;
    const tx = drone.mesh.position.x + Math.cos(time) * orbitRadius;
    const tz = drone.mesh.position.z + Math.sin(time) * orbitRadius;
    camera.position.lerp(new THREE.Vector3(tx, orbitHeight, tz), 0.03);
    camera.lookAt(drone.mesh.position);
  }
}

// ================================================================
//  RESET SIMULATION
// ================================================================

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

  const powerBtn = document.getElementById('btn-power');
  if (powerBtn) {
    powerBtn.innerText = '[ SPACE ] Start Ignition';
    powerBtn.style.boxShadow = 'none';
  }
  setEl('val-battery', '100.0%');
  setEl('val-timer', '0:45');
  setElStyle('val-timer', 'color', '#fff');
  setElStyle('val-timer', 'textShadow', 'none');
  setEl('val-combo', '');
  setElStyle('val-score', 'color', '#fff');
  const go = document.getElementById('gameover-overlay');
  if (go) go.style.display = 'none';

  score = 0;
  ringsScored = 0;
  gameTimeRemaining = TIME_LIMIT;
  comboCount = 0;
  lastRingTime = -10;
  timerRunning = false;
  missionComplete = false;
  gameOver = false;

  // Reset rings to original positions
  const originalPositions = [
    { x: -6, y: 3, z: 4, rotY: Math.PI / 4 },
    { x: 6, y: 4, z: -4, rotY: -Math.PI / 4 },
    { x: 0, y: 5, z: 10, rotY: 0 },
  ];
  obstacleData.rings.forEach((r, i) => {
    const orig = originalPositions[i] || {
      x: (Math.random() - 0.5) * 20, y: 3 + Math.random() * 6,
      z: (Math.random() - 0.5) * 20, rotY: Math.random() * 6,
    };
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

  setEl('val-score', '0');
  const ringsEl = document.getElementById('val-rings');
  if (ringsEl) ringsEl.innerText = `0 / ${obstacleData.rings.length}`;

  const hs = parseInt(localStorage.getItem('droneHighScore') || '0');
  setEl('val-highscore', hs.toString());
}

// ================================================================
//  UI HELPERS
// ================================================================

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function setElStyle(id, prop, value) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = value;
}

function formatCountdown(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// ================================================================
//  INPUT SETUP
// ================================================================

function setupInteractions() {
  const powerBtn = document.getElementById('btn-power');
  const cameraBtn = document.getElementById('btn-camera');
  const throttleSlider = document.getElementById('slider-throttle');
  const throttleDisplay = document.getElementById('val-throttle-display');

  // ── Engine ──
  powerBtn?.addEventListener('click', () => {
    if (missionComplete) return;
    const isRunning = drone.toggleEngine();
    if (isRunning) {
      powerBtn.innerText = '[ SPACE ] Kill Engine';
      powerBtn.style.boxShadow = '0 0 15px #ff0055';
      const currentFactor = parseFloat(throttleSlider.value) / 100;
      drone.targetRotorSpeed = drone.maxRotorSpeedSetting * currentFactor;
      timerRunning = true;
      new TWEEN.Tween(drone.mesh.position)
        .to({ y: 1.5 }, 1800)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();
    } else {
      powerBtn.innerText = '[ SPACE ] Start Ignition';
      powerBtn.style.boxShadow = 'none';
      drone.targetRotorSpeed = 0;
      timerRunning = false;
      new TWEEN.Tween(drone.mesh.position)
        .to({ y: 0, x: 0, z: 0 }, 1500)
        .easing(TWEEN.Easing.Bounce.Out)
        .start();
    }
  });

  // ── Camera ──
  cameraBtn?.addEventListener('click', () => {
    currentCameraModeIndex = (currentCameraModeIndex + 1) % cameraModes.length;
    const mode = cameraModes[currentCameraModeIndex];
    const labels = { orbit: 'Orbit Lab', follow: 'Follow Drone', longshot: 'Long Shot' };
    cameraBtn.innerText = `[ C ] View: ${labels[mode]}`;
    controls.enabled = (mode === 'orbit');
    if (mode === 'longshot') camera.position.set(22, 12, 22);
  });

  // ── Throttle ──
  throttleSlider?.addEventListener('input', (e) => {
    const pct = parseFloat(e.target.value);
    throttleDisplay.innerText = `x${(pct / 100).toFixed(1)}`;
    if (drone.engineRunning) {
      drone.targetRotorSpeed = drone.maxRotorSpeedSetting * (pct / 100);
    }
  });

  // ── Keyboard ──
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    activeKeys[key] = true;
    if (key === ' ' || key === 'enter') { e.preventDefault(); if (!missionComplete) powerBtn?.click(); }
    if (key === 'r' && !e.ctrlKey) { e.preventDefault(); document.getElementById('btn-reset')?.click(); }
    if (key === 'c') { e.preventDefault(); cameraBtn?.click(); }
    if (key === 'escape') {
      e.preventDefault();
      if (drone.engineRunning) {
        drone.toggleEngine();
        if (powerBtn) { powerBtn.innerText = '[ SPACE ] Start Ignition'; powerBtn.style.boxShadow = 'none'; }
        drone.targetRotorSpeed = 0;
        timerRunning = false;
      }
    }
  });
  window.addEventListener('keyup', (e) => { activeKeys[e.key.toLowerCase()] = false; });

  // ── Deck Lights ──
  document.getElementById('btn-light')?.addEventListener('click', () => {
    deckLights.forEach(light => { light.visible = !light.visible; });
  });

  // ── Reset ──
  document.getElementById('btn-reset')?.addEventListener('click', resetSimulation);

  // ── Drone Color ──
  function setDroneColor(colorName, hexColor) {
    if (!drone) return;
    if (drone.shaderUniforms && drone.shaderUniforms.uColor) {
      drone.shaderUniforms.uColor.value.setHex(hexColor);
    }
    if (drone.mesh && drone.mesh.children.length > 0) {
      const chassisGroup = drone.mesh.children[0];
      if (chassisGroup) {
        chassisGroup.children.forEach(child => {
          if (child.isPointLight) child.color.setHex(hexColor);
        });
      }
    }
    ['cyan', 'magenta', 'gold'].forEach(c => {
      const btn = document.getElementById(`btn-color-${c}`);
      if (btn) btn.style.background = 'transparent';
    });
    const active = document.getElementById(`btn-color-${colorName}`);
    if (active) active.style.background = '#ffffff22';
  }
  document.getElementById('btn-color-cyan')?.addEventListener('click', () => setDroneColor('cyan', 0x00ffff));
  document.getElementById('btn-color-magenta')?.addEventListener('click', () => setDroneColor('magenta', 0xff00aa));
  document.getElementById('btn-color-gold')?.addEventListener('click', () => setDroneColor('gold', 0xffdd00));

  // ── High Score ──
  const hs = parseInt(localStorage.getItem('droneHighScore') || '0');
  setEl('val-highscore', hs.toString());

  // ── Resize ──
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ================================================================
//  ANIMATION LOOP
// ================================================================

function animateLoop() {
  requestAnimationFrame(animateLoop);

  const now = performance.now();
  const dtMs = now - lastFrameTime;
  lastFrameTime = now;
  const dt = Math.min(dtMs * 0.001, 0.1);

  processFlightInputs();
  TWEEN.update();
  drone.update(dtMs);

  // ── Collision & Scoring ──
  const newScoredRings = drone.checkCollisions(obstacleData);

  // Column penalty
  if (drone.hitColumn && timerRunning && !gameOver) {
    score = Math.max(0, score - 500);
    setEl('val-score', score.toString());

    const batVal = parseFloat(document.getElementById('val-battery')?.innerText) || 100;
    setEl('val-battery', `${Math.max(0, batVal - 10).toFixed(1)}%`);
    createRingBurst(drone.mesh.position);

    const scoreEl = document.getElementById('val-score');
    if (scoreEl) { scoreEl.style.color = '#ff0055'; setTimeout(() => { scoreEl.style.color = '#fff'; }, 200); }
    drone.hitColumn = false;
  }

  // Ring scoring
  newScoredRings.forEach(idx => {
    if (gameOver) return;

    const currentTime = now / 1000;
    if (currentTime - lastRingTime < COMBO_WINDOW) { comboCount++; }
    else { comboCount = 1; }
    lastRingTime = currentTime;

    const multiplier = Math.min(comboCount, 8);
    const ptsAwarded = 1000 * multiplier;
    score += ptsAwarded;
    ringsScored++;

    setEl('val-score', score.toString());
    const ringsEl = document.getElementById('val-rings');
    if (ringsEl) ringsEl.innerText = `${ringsScored} / ${obstacleData.rings.length}`;
    setEl('val-combo', multiplier > 1 ? `${multiplier}x COMBO!` : '');

    const ringData = obstacleData.rings[idx];
    const ringPos = ringData.position.clone();
    createRingBurst(ringPos);

    const popupText = multiplier > 1 ? `+${ptsAwarded} (${multiplier}x)` : `+${ptsAwarded}`;
    const popupColor = multiplier > 2 ? '#ffff00' : (multiplier > 1 ? '#ff8800' : '#00ffcc');
    createScorePopup(ringPos, popupText, popupColor);

    respawnRing(ringData);
  });

  // ── Time Attack Countdown ──
  if (timerRunning && !gameOver) {
    gameTimeRemaining -= dt;
    setEl('val-timer', formatCountdown(gameTimeRemaining));

    const timerEl = document.getElementById('val-timer');
    if (timerEl) {
      if (gameTimeRemaining < 10) {
        timerEl.style.color = '#ff0055';
        timerEl.style.textShadow = '0 0 10px #ff0055';
      } else {
        timerEl.style.color = '#fff';
        timerEl.style.textShadow = 'none';
      }
    }

    if (gameTimeRemaining <= 0) {
      gameOver = true;
      timerRunning = false;
      gameTimeRemaining = 0;
      setEl('val-timer', '0:00');

      if (drone.engineRunning) drone.toggleEngine();
      const powerBtn = document.getElementById('btn-power');
      if (powerBtn) { powerBtn.innerText = '[ SPACE ] Start Ignition'; powerBtn.style.boxShadow = 'none'; }
      drone.targetRotorSpeed = 0;

      const batVal = parseFloat(document.getElementById('val-battery')?.innerText) || 0;
      const batBonus = Math.round(batVal * 5);
      const finalScore = score + batBonus;

      setEl('go-rings', ringsScored.toString());
      setEl('go-score', finalScore.toString());
      setEl('go-bonus', `+${batBonus} battery bonus`);

      const go = document.getElementById('gameover-overlay');
      if (go) go.style.display = 'flex';

      const prev = parseInt(localStorage.getItem('droneHighScore') || '0');
      if (finalScore > prev) {
        localStorage.setItem('droneHighScore', finalScore.toString());
        setEl('val-highscore', finalScore.toString());
        const nr = document.getElementById('go-newrecord');
        if (nr) nr.style.display = 'block';
      } else {
        const nr = document.getElementById('go-newrecord');
        if (nr) nr.style.display = 'none';
      }
    }
  }

  // ── Update particles & popups ──
  updateBurstParticles(dt);
  updateScorePopups(dt);
  updateAmbientParticles(dt);

  // ── Obstacle animations ──
  updateObstacleAnimations(dt, now / 1000);

  // ── Camera ──
  manageCameraPerspectives();

  // ── HUD telemetry ──
  setEl('val-altitude', `${drone.mesh.position.y.toFixed(2)} m`);
  setEl('val-rpm', `${Math.round(drone.rotorSpeed * 12000)} RPM`);

  if (drone.engineRunning) {
    const curBat = parseFloat(document.getElementById('val-battery')?.innerText);
    if (curBat > 0) {
      const drainage = 0.003 * (drone.rotorSpeed / 0.4);
      setEl('val-battery', `${(curBat - drainage).toFixed(1)}%`);
    }
    const batVal = parseFloat(document.getElementById('val-battery')?.innerText);
    if (batVal <= 0 && !gameOver) {
      if (drone.engineRunning) drone.toggleEngine();
      const powerBtn = document.getElementById('btn-power');
      if (powerBtn) { powerBtn.innerText = '[ SPACE ] Start Ignition'; powerBtn.style.boxShadow = 'none'; }
      drone.targetRotorSpeed = 0;
      setEl('val-battery', '0.0%');
      timerRunning = false;
    }
  }

  if (controls.enabled) controls.update();
  renderer.render(scene, camera);
}

// ================================================================
//  INIT ENGINE
// ================================================================

function initEngine() {
  // Dismiss loader
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 500);
  }

  // Partner B: Environment
  setupLightingArray(scene);
  setupLabEnvironment(scene);
  setupObstacleCourse(scene);

  // Initialize rings display
  const ringsEl = document.getElementById('val-rings');
  if (ringsEl && obstacleData.rings) {
    ringsEl.innerText = `0 / ${obstacleData.rings.length}`;
  }

  // Partner A: Drone
  drone = new CyberpunkDrone();
  scene.add(drone.mesh);

  // Set initial camera label
  const cameraBtn = document.getElementById('btn-camera');
  if (cameraBtn) cameraBtn.innerText = '[ C ] View: Follow Drone';
  controls.enabled = false;

  // Input
  setupInteractions();

  // Start loop
  lastFrameTime = performance.now();
  animateLoop();
}

// ================================================================
//  BOOT
// ================================================================

window.addEventListener('DOMContentLoaded', initEngine);
