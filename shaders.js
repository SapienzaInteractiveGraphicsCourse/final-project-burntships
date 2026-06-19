/**
 * Shaders Module - Partner B
 * Custom GLSL Programmable Shader Pipeline
 */

const EnergyShieldShader = {
    // Vertex Shader: Projects local coordinates into camera screen clip coordinates
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
            vUv = uv;
            vPosition = position;
            
            // Transform object vertices using built-in Three.js matrices
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    // Fragment Shader: Formulates dynamic neon colors per-pixel directly on the GPU
    fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
            // High-frequency math generating moving matrix-style lattice grid lines
            float linesX = sin(vUv.x * 40.0 + uTime * 2.0);
            float linesY = cos(vUv.y * 40.0 - uTime * 3.0);
            float gridLattice = step(0.92, linesX * linesY);

            // Fresnel effect calculation to simulate an edge glow on a curved mesh surface
            float edgeGlow = pow(1.0 - abs(vPosition.z), 4.0);
            
            // Mix neon cyan base color with electric hot pink on grid hits
            vec3 finalColor = mix(uColor, vec3(1.0, 0.0, 0.5), gridLattice);
            
            // Assemble final fragments adding brightness on grid lattice lines
            gl_FragColor = vec4(finalColor * (edgeGlow + gridLattice * 1.5), 0.3 + gridLattice * 0.4);
        }
    `
};