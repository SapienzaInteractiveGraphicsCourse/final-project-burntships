import * as THREE from "three";
import GUI from "lil-gui";

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Temporary drone placeholder (a simple box)
const geometry = new THREE.BoxGeometry(1, 0.3, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ffff });
const drone = new THREE.Mesh(geometry, material);
scene.add(drone);

// Keyboard input tracker
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// Physics variables
const velocity = new THREE.Vector3(0, 0, 0);
const params = { gravity: 9.8, thrust: 15 };
const dampening = 0.9;

// Dashboard UI
const gui = new GUI();
gui.add(params, "gravity", 0, 30).name("Gravity");
gui.add(params, "thrust", 0, 40).name("Thrust");

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const delta = 0.016;

  // Gravity pulls drone down
  velocity.y -= params.gravity * delta;

  // Space = go up (thrust)
  if (keys["Space"]) velocity.y += params.thrust * delta;

  // Shift = go down faster
  if (keys["ShiftLeft"]) velocity.y -= params.thrust * 0.5 * delta;

  // WASD = move forward/back/left/right
  if (keys["KeyW"]) velocity.z -= params.thrust * 0.5 * delta;
  if (keys["KeyS"]) velocity.z += params.thrust * 0.5 * delta;
  if (keys["KeyA"]) velocity.x -= params.thrust * 0.5 * delta;
  if (keys["KeyD"]) velocity.x += params.thrust * 0.5 * delta;

  // Apply dampening
  velocity.multiplyScalar(dampening);

  // Move the drone
  drone.position.add(velocity);

  // Stop drone from falling below the floor
  if (drone.position.y < 0) {
    drone.position.y = 0;
    velocity.y = 0;
  }

  renderer.render(scene, camera);
}
animate();
