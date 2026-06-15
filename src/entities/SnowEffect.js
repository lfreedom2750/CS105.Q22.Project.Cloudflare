import * as THREE from 'three';

export class SnowEffect {
    constructor(scene) {
        this.scene = scene;
        this.particles = null;
        this.particleCount = 3000;
        this.isActive = false;

        this.init();
    }

    init() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const velocities = new Float32Array(this.particleCount);

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
            velocities[i] = 0.02 + Math.random() * 0.03;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.15,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.particles.visible = false;
        this.scene.add(this.particles);
    }

    activate() {
        if (this.isActive) return;
        this.isActive = true;
        this.particles.visible = true;
    }

    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;
        this.particles.visible = false;
    }

    setSeason(isWinter) {
        if (isWinter) {
            this.activate();
        } else {
            this.deactivate();
        }
    }

    update(playerZ, delta) {
        if (!this.isActive || !this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;
        const velocities = this.particles.geometry.attributes.velocity.array;

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3 + 1] -= velocities[i] * 60 * delta;

            positions[i * 3] += (Math.random() - 0.5) * 0.05;

            if (positions[i * 3 + 1] < -2) {
                positions[i * 3 + 1] = 50;
                positions[i * 3] = (Math.random() - 0.5) * 100;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
            }
        }

        this.particles.position.z = playerZ;
        this.particles.geometry.attributes.position.needsUpdate = true;
    }
}
