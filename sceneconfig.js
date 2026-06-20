let deckLights = [];
let ambientParticles = [];

// Obstacle collision data for drone detection and scoring
let obstacleData = {
  columns: [],  // will store {position, radius}
  rings: [],    // will store {position, radius, normal, scored}
};

function setupLightingArray() {
    // 1. Sky Hemisphere Light — cooler tint for cyberpunk atmosphere
    const hemiLight = new THREE.HemisphereLight(0x3388ff, 0x111a33, 0.8);
    scene.add(hemiLight);

    // 2. Low ambient light — keep shadows dramatic
    const ambientLight = new THREE.AmbientLight(0x222a45, 0.6);
    scene.add(ambientLight);

    // 3. Main overhead directional — magenta cast with crisp shadows
    const deckLight = new THREE.DirectionalLight(0xff0066, 3.5);
    deckLight.position.set(12, 22, 8);
    deckLight.castShadow = true;
    deckLight.shadow.mapSize.width = 2048;
    deckLight.shadow.mapSize.height = 2048;
    deckLight.shadow.bias = -0.0002;
    scene.add(deckLight);
    deckLights.push(deckLight);

    // 4. Cyan rim light from opposite corner
    const rimLight = new THREE.DirectionalLight(0x00ffcc, 2.5);
    rimLight.position.set(-12, 8, -12);
    scene.add(rimLight);
    deckLights.push(rimLight);

    // 5. Overhead purple spot
    const ceilingSpot = new THREE.SpotLight(0x6666ff, 1.5, 60, Math.PI / 4, 0.5, 1);
    ceilingSpot.position.set(0, 22, 0);
    scene.add(ceilingSpot);
    deckLights.push(ceilingSpot);

    // 6. Corner accent point lights — red glow from floor level
    [[-26, 0.3, -26], [26, 0.3, -26], [-26, 0.3, 26], [26, 0.3, 26]].forEach(pos => {
        const accent = new THREE.PointLight(0xff0055, 1.2, 18);
        accent.position.set(pos[0], pos[1], pos[2]);
        scene.add(accent);
        deckLights.push(accent);
    });
}

function setupLabEnvironment() {
    // ===== FLOOR =====
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; 
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Dark metallic base
    ctx.fillStyle = '#14141e'; 
    ctx.fillRect(0, 0, size, size);
    
    // Clean neon cyan grid border
    ctx.strokeStyle = '#00ffcc'; 
    ctx.lineWidth = 6; 
    ctx.strokeRect(2, 2, size - 4, size - 4);

    const textureCanvas = new THREE.CanvasTexture(canvas);
    textureCanvas.wrapS = THREE.RepeatWrapping; 
    textureCanvas.wrapT = THREE.RepeatWrapping;
    textureCanvas.repeat.set(16, 16);

    // ===== PROCEDURAL NORMAL MAP
    const nmSize = 256;
    const nmCanvas = document.createElement('canvas');
    nmCanvas.width = nmSize;
    nmCanvas.height = nmSize;
    const nmCtx = nmCanvas.getContext('2d');
    // Base normal (flat - 128,128,255)
    nmCtx.fillStyle = '#8080ff';
    nmCtx.fillRect(0, 0, nmSize, nmSize);
    // Add random bumps
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * nmSize;
        const y = Math.random() * nmSize;
        const r = 1 + Math.random() * 3;
        const bump = Math.floor(100 + Math.random() * 110);
        nmCtx.fillStyle = `rgb(${bump},${bump},255)`;
        nmCtx.beginPath();
        nmCtx.arc(x, y, r, 0, Math.PI * 2);
        nmCtx.fill();
    }
    const normalTexture = new THREE.CanvasTexture(nmCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(32, 32);

    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({ 
        map: textureCanvas,
        roughnessMap: textureCanvas,
        normalMap: normalTexture,
        normalScale: new THREE.Vector2(0.4, 0.4),
        roughness: 0.3, 
        metalness: 0.9,
        envMapIntensity: 0.6
    });

    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // ===== IMPROVED LANDING PAD =====
    // Outer glow ring
    const outerPad = new THREE.Mesh(
        new THREE.RingGeometry(2.8, 3.0, 48),
        new THREE.MeshBasicMaterial({ color: 0xff0055, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    );
    outerPad.rotation.x = -Math.PI / 2;
    outerPad.position.y = 0.015;
    scene.add(outerPad);

    // Middle ring (cyan)
    const midPad = new THREE.Mesh(
        new THREE.RingGeometry(2.2, 2.4, 48),
        new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    midPad.rotation.x = -Math.PI / 2;
    midPad.position.y = 0.02;
    scene.add(midPad);

    // Inner solid disk (dark)
    const innerPad = new THREE.Mesh(
        new THREE.CircleGeometry(1.8, 32),
        new THREE.MeshStandardMaterial({ color: 0x0a0a14, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide })
    );
    innerPad.rotation.x = -Math.PI / 2;
    innerPad.position.y = 0.01;
    scene.add(innerPad);

    // Center H marker (four small bars)
    const barMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const barPositions = [[-0.5, 0, 0, 1, 0.06], [0.5, 0, 0, 1, 0.06], [0, 0, -0.4, 0.06, 0.8]];
    barPositions.forEach(b => {
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(b[3], b[4]), barMat);
        bar.rotation.x = -Math.PI / 2;
        bar.position.set(b[0], 0.025, b[2]);
        scene.add(bar);
    });

    // ===== SUBTLE BOUNDARY GLOW STRIPS =====
    const barrierMat = new THREE.MeshStandardMaterial({
        color: 0xff0055, emissive: 0xff0055, emissiveIntensity: 0.3, transparent: true, opacity: 0.12
    });
    const barrierPositions = [
        { x: 0, z: -29.5, sx: 58, sz: 0.3 },
        { x: 0, z: 29.5, sx: 58, sz: 0.3 },
        { x: -29.5, z: 0, sx: 0.3, sz: 58 },
        { x: 29.5, z: 0, sx: 0.3, sz: 58 }
    ];
    barrierPositions.forEach(bp => {
        const wall = new THREE.Mesh(
            new THREE.PlaneGeometry(bp.sx, 0.5),
            barrierMat
        );
        wall.rotation.x = -Math.PI / 2;
        wall.position.set(bp.x, 0.25, bp.z);
        scene.add(wall);
    });

    // ===== NEON BOUNDARY POSTS =====
    const postMat = new THREE.MeshStandardMaterial({
        color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.8, transparent: true, opacity: 0.4
    });
    const postCount = 12;
    for (let i = 0; i < postCount; i++) {
        const angle = (i / postCount) * Math.PI * 2;
        const r = 29.2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5, 0.12), postMat);
        post.position.set(x, 2.5, z);
        scene.add(post);
        
        // Small glow light at base of each post
        const glow = new THREE.PointLight(0x00ffcc, 0.3, 6);
        glow.position.set(x, 0.2, z);
        scene.add(glow);
    }

    
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = 90 + Math.random() * 50;
        starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i*3+1] = Math.abs(r * Math.cos(phi));
        starPos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
        const b = 0.4 + Math.random() * 0.6;
        starCol[i*3] = 0.5 * b; starCol[i*3+1] = 0.7 * b; starCol[i*3+2] = b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
        size: 0.25, vertexColors: true, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(stars);

    // ===== AMBIENT FLOATING PARTICLES (subtle) =====
    const pCount = 80;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pVel = [];
    for (let i = 0; i < pCount; i++) {
        pPos[i*3] = (Math.random() - 0.5) * 56;
        pPos[i*3+1] = Math.random() * 12 + 0.3;
        pPos[i*3+2] = (Math.random() - 0.5) * 56;
        pVel.push({ x: (Math.random()-0.5)*0.005, y: (Math.random()-0.5)*0.002, z: (Math.random()-0.5)*0.005 });
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pSys = new THREE.Points(pGeo, new THREE.PointsMaterial({
        color: 0x00ffcc, size: 0.04, transparent: true, opacity: 0.15,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    pSys.userData.velocities = pVel;
    scene.add(pSys);
    ambientParticles.push(pSys);
}

function setupObstacleCourse() {
    // Shared materials for the course obstacles
    const columnGeo = new THREE.CylinderGeometry(0.8, 1.2, 8, 6);
    const columnMat = new THREE.MeshStandardMaterial({ color: 0x2d2d38, metalness: 0.8, roughness: 0.3 });
    const neonRingMat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xff0055, emissiveIntensity: 1.5 });

    // Target positions to place the obstacles around the arena floor
    const columnPositions = [
        { x: -10, z: -10 }, { x: 10, z: -10 },
        { x: -12, z: 12 },  { x: 12, z: 12 },
        { x: 0, z: -18 }
    ];

    columnPositions.forEach(pos => {
        const columnGroup = new THREE.Group();
        columnGroup.position.set(pos.x, 4, pos.z); // Lift vertical center half-height above ground

        const pillarMesh = new THREE.Mesh(columnGeo, columnMat);
        pillarMesh.castShadow = true;
        pillarMesh.receiveShadow = true;
        columnGroup.add(pillarMesh);

        // Add complex structural details: double glowing neon bands around pillars
        const bandGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.2, 6);
        const band1 = new THREE.Mesh(bandGeo, neonRingMat); band1.position.y = 2; columnGroup.add(band1);
        const band2 = new THREE.Mesh(bandGeo, neonRingMat); band2.position.y = -2; columnGroup.add(band2);

        scene.add(columnGroup);

        // Register column for collision detection
        obstacleData.columns.push({ position: new THREE.Vector3(pos.x, 4, pos.z), radius: 1.2 });
    });

    // Spawn flying target rings to practice flying straight through
    const ringPositions = [
        { x: -6, y: 3, z: 4, rotY: Math.PI / 4 },
        { x: 6, y: 4, z: -4, rotY: -Math.PI / 4 },
        { x: 0, y: 5, z: 10, rotY: 0 }
    ];

    ringPositions.forEach(pos => {
        const torusGeo = new THREE.TorusGeometry(1.8, 0.15, 8, 24);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 1.5 });
        const ringMesh = new THREE.Mesh(torusGeo, ringMat);
        
        ringMesh.position.set(pos.x, pos.y, pos.z);
        ringMesh.rotation.y = pos.rotY;
        ringMesh.castShadow = true;
        
        scene.add(ringMesh);

        // Register ring for collision/scoring
        const normal = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), pos.rotY);
        obstacleData.rings.push({ position: new THREE.Vector3(pos.x, pos.y, pos.z), radius: 1.8, normal: normal, scored: false, mesh: ringMesh });
    });
}


function updateObstacleAnimations(dt, time) {
    // Animate rings: gentle rotation + vertical bobbing
    obstacleData.rings.forEach((ring, i) => {
        if (ring.mesh && !ring.scored) {
            ring.mesh.rotation.y += dt * 0.6;
            ring.mesh.position.y += Math.sin(time * 0.8 + i * 2.1) * dt * 0.15;
        }
    });
}

function updateAmbientParticles(dt) {
    ambientParticles.forEach(sys => {
        const pos = sys.geometry.attributes.position.array;
        const vel = sys.userData.velocities;
        for (let i = 0; i < pos.length / 3; i++) {
            const i3 = i * 3;
            pos[i3] += vel[i].x * dt * 30;
            pos[i3+1] += vel[i].y * dt * 30;
            pos[i3+2] += vel[i].z * dt * 30;
            // Wrap around within arena
            if (pos[i3] > 28) pos[i3] = -28;
            if (pos[i3] < -28) pos[i3] = 28;
            if (pos[i3+1] > 16) pos[i3+1] = 0.3;
            if (pos[i3+1] < 0.3) pos[i3+1] = 16;
            if (pos[i3+2] > 28) pos[i3+2] = -28;
            if (pos[i3+2] < -28) pos[i3+2] = 28;
        }
        sys.geometry.attributes.position.needsUpdate = true;
    });
}
