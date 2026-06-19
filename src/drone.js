/**
 * Drone Module — Partner A
 * Implements Hierarchical 3D Assemblies & Kinematic Flight Vectors
 */

import * as THREE from 'three';
import { EnergyShieldShader } from './shaders.js';

export class CyberpunkDrone {
  constructor() {
    // Master Group: Root node of hierarchical system
    this.mesh = new THREE.Group();
    this.propellers = [];
    this.engineRunning = false;
    this.rotorSpeed = 0;
    this.maxRotorSpeedSetting = 0.4;
    this.targetRotorSpeed = 0;
    this.shaderUniforms = null;

    // Kinematic Physics Property Registers
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.targetVelocity = new THREE.Vector3(0, 0, 0);
    this.accelerationFactor = 0.1;
    this.dragCoefficient = 0.08;

    this._buildChassis();
    this._buildRotorSystems();
  }

  /**
   * Builds complex chassis geometry and integrates custom GLSL material
   */
  _buildChassis() {
    const chassisGroup = new THREE.Group();

    // Main Core Body Capsule
    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.4, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.9, roughness: 0.15 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    chassisGroup.add(bodyMesh);

    // Visor Assembly — custom GLSL shader
    const visorGeo = new THREE.ConeGeometry(0.4, 0.6, 4);
    visorGeo.rotateX(Math.PI / 2);
    visorGeo.translate(0, 0, 0.4);

    this.shaderUniforms = {
      uTime: { value: 0.0 },
      uColor: { value: new THREE.Color(0x00ffff) },
    };

    const customShaderMat = new THREE.ShaderMaterial({
      vertexShader: EnergyShieldShader.vertexShader,
      fragmentShader: EnergyShieldShader.fragmentShader,
      uniforms: this.shaderUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const visorMesh = new THREE.Mesh(visorGeo, customShaderMat);
    chassisGroup.add(visorMesh);

    // Core PointLight from inside the cockpit
    const coreLight = new THREE.PointLight(0x00ffcc, 3, 6);
    coreLight.position.set(0, 0, 0.3);
    chassisGroup.add(coreLight);

    this.mesh.add(chassisGroup);
  }

  /**
   * Constructs structural rotor arm nodes and links spinning child propellers
   */
  _buildRotorSystems() {
    const layoutPositions = [
      { x: 1, z: 1 }, { x: -1, z: 1 },
      { x: 1, z: -1 }, { x: -1, z: -1 },
    ];
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2e2e3a, metalness: 0.8, roughness: 0.3 });
    const rotorHubMat = new THREE.MeshStandardMaterial({
      color: 0xff0055, emissive: 0xff0055, emissiveIntensity: 1.2,
    });

    layoutPositions.forEach(pos => {
      const armAnchorGroup = new THREE.Group();
      armAnchorGroup.position.set(pos.x, 0, pos.z);

      const angle = Math.atan2(pos.z, pos.x);
      const armLength = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

      const beamGeo = new THREE.BoxGeometry(0.15, 0.1, armLength);
      beamGeo.translate(0, 0, -armLength / 2);
      const beamMesh = new THREE.Mesh(beamGeo, armMat);
      beamMesh.rotation.y = -angle + Math.PI / 2;
      beamMesh.castShadow = true;
      armAnchorGroup.add(beamMesh);

      const motorCapGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 8);
      motorCapGeo.translate(0, 0.1, 0);
      const motorCapMesh = new THREE.Mesh(motorCapGeo, rotorHubMat);
      armAnchorGroup.add(motorCapMesh);

      // Propeller blade assembly (child of arm anchor — spins)
      const propGroup = new THREE.Group();
      propGroup.position.set(0, 0.2, 0);

      const bladeGeo = new THREE.BoxGeometry(1.2, 0.02, 0.08);
      const bladeMesh = new THREE.Mesh(bladeGeo, armMat);
      bladeMesh.castShadow = true;
      propGroup.add(bladeMesh);

      const centerNutGeo = new THREE.SphereGeometry(0.06, 6, 6);
      const centerNutMesh = new THREE.Mesh(centerNutGeo, rotorHubMat);
      propGroup.add(centerNutMesh);

      armAnchorGroup.add(propGroup);
      this.mesh.add(armAnchorGroup);
      this.propellers.push(propGroup);
    });
  }

  /**
   * Updates local matrix transforms using time deltas
   * Integrates Autopilot Boundary Safety Subsystem
   */
  update(timeDelta) {
    const dt = Math.min(timeDelta * 0.001, 0.1);

    if (this.shaderUniforms) this.shaderUniforms.uTime.value += dt;

    if (this.engineRunning) {
      this.rotorSpeed = THREE.MathUtils.lerp(this.rotorSpeed, this.targetRotorSpeed, 0.05);
    } else {
      this.rotorSpeed = THREE.MathUtils.lerp(this.rotorSpeed, 0, 0.03);
      this.targetVelocity.set(0, 0, 0);
    }

    this.propellers.forEach((propeller, index) => {
      const direction = (index === 0 || index === 3) ? 1 : -1;
      propeller.rotation.y += this.rotorSpeed * direction * (timeDelta * 0.06);
    });

    if (this.rotorSpeed > 0.05) {
      this.velocity.lerp(this.targetVelocity, this.accelerationFactor);
      this.mesh.position.addScaledVector(this.velocity, dt * 60.0);

      // ============================================================
      // HARD BOUNDARY CAGE CLAMPING
      // ============================================================
      const roomBoundaryX = 28.0;
      const roomBoundaryZ = 28.0;
      const ceilingHeight = 15.0;
      const floorDeckLevel = 0.05;

      // Clamp X axes
      if (this.mesh.position.x > roomBoundaryX) {
        this.mesh.position.x = roomBoundaryX;
        this.velocity.setX(0);
      } else if (this.mesh.position.x < -roomBoundaryX) {
        this.mesh.position.x = -roomBoundaryX;
        this.velocity.setX(0);
      }

      // Clamp Z axes
      if (this.mesh.position.z > roomBoundaryZ) {
        this.mesh.position.z = roomBoundaryZ;
        this.velocity.setZ(0);
      } else if (this.mesh.position.z < -roomBoundaryZ) {
        this.mesh.position.z = -roomBoundaryZ;
        this.velocity.setZ(0);
      }

      // Clamp Y axes (ceiling / floor)
      if (this.mesh.position.y > ceilingHeight) {
        this.mesh.position.y = ceilingHeight;
        this.velocity.setY(0);
      } else if (this.mesh.position.y < floorDeckLevel) {
        this.mesh.position.y = floorDeckLevel;
        this.velocity.setY(0);
        if (this.targetVelocity.y < 0) this.targetVelocity.y = 0;
      }

      // Tilt based on velocity
      const tiltX = -this.velocity.z * 0.4;
      const tiltZ = this.velocity.x * 0.4;
      this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, tiltX, 0.1);
      this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, tiltZ, 0.1);

      // Subtle hover bob
      if (this.mesh.position.y > 0.2) {
        this.mesh.position.y += Math.sin(Date.now() * 0.004) * 0.0015;
      }

      this.targetVelocity.multiplyScalar(1.0 - this.dragCoefficient);
    } else {
      this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, 0.1);
      this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 0, 0.1);
    }
  }

  toggleEngine() {
    this.engineRunning = !this.engineRunning;
    return this.engineRunning;
  }

  /**
   * Collision detection against obstacleData from sceneConfig
   * Returns array of indices of newly scored rings
   */
  checkCollisions(obstacleData) {
    const scoredRingIndices = [];
    const dronePos = this.mesh.position;
    this.hitColumn = false;

    // --- Column collisions ---
    obstacleData.columns.forEach(col => {
      const dx = dronePos.x - col.position.x;
      const dz = dronePos.z - col.position.z;
      const distXZ = Math.sqrt(dx * dx + dz * dz);
      const collisionRadius = col.radius + 1.0;

      if (distXZ < collisionRadius &&
          dronePos.y > col.position.y - 4 &&
          dronePos.y < col.position.y + 4) {
        // Push drone away
        if (distXZ > 0.001) {
          const pushDir = new THREE.Vector3(dx, 0, dz).normalize();
          this.mesh.position.x = col.position.x + pushDir.x * collisionRadius;
          this.mesh.position.z = col.position.z + pushDir.z * collisionRadius;
        }
        this.velocity.set(0, 0, 0);
        this.hitColumn = true;
      }
    });

    // --- Ring scoring ---
    obstacleData.rings.forEach((ring, index) => {
      if (ring.scored) return;

      const dx = dronePos.x - ring.position.x;
      const dz = dronePos.z - ring.position.z;
      const distXZ = Math.sqrt(dx * dx + dz * dz);
      const dy = Math.abs(dronePos.y - ring.position.y);

      if (distXZ < ring.radius && dy < 0.8) {
        ring.scored = true;
        scoredRingIndices.push(index);
      }
    });

    return scoredRingIndices;
  }
}
