import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class CherryBlossomEffect {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.isActive = false;
        this.particleCount = 100;
        this.petalModel = null;
        this.lastSpawnTime = 0;
        this.spawnInterval = 100; // ms giữa mỗi lần spawn
    }

    async loadModel() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load(
                '/assets/cherry_blossom_petal.glb',
                (gltf) => {
                    this.petalModel = gltf.scene;

                    // Xác định pivot point và điều chỉnh
                    const box = new THREE.Box3().setFromObject(this.petalModel);
                    const center = new THREE.Vector3();
                    const size = new THREE.Vector3();
                    box.getCenter(center);
                    box.getSize(size);

                    console.log('Cherry blossom petal model loaded');
                    console.log('  Center:', center);
                    console.log('  Size:', size);
                    console.log('  Min Y:', box.min.y, 'Max Y:', box.max.y);

                    // Lưu thông tin để sử dụng khi spawn
                    this.petalOffset = {
                        center: center,
                        size: size,
                        bottomY: box.min.y
                    };

                    resolve();
                },
                undefined,
                (error) => {
                    console.error('Error loading cherry blossom petal:', error);
                    reject(error);
                }
            );
        });
    }

    activate() {
        if (this.isActive) return;
        this.isActive = true;
    }

    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;

        // Xóa tất cả petals
        this.particles.forEach(p => this.scene.remove(p.mesh));
        this.particles = [];
    }

    setSeason(isSpring) {
        if (isSpring) {
            this.activate();
        } else {
            this.deactivate();
        }
    }

    createPetal() {
        if (!this.petalModel) return null;

        const petal = this.petalModel.clone(true);

        // Điều chỉnh pivot point - đưa đáy về Y = 0
        if (this.petalOffset) {
            petal.position.x -= this.petalOffset.center.x;
            petal.position.y -= this.petalOffset.bottomY;
            petal.position.z -= this.petalOffset.center.z;
        }

        // Random vị trí - spawn phía trước player trong tầm nhìn camera
        const spreadX = 30; // Phạm vi ngang
        const spreadZ = 30; // Phạm vi dọc phía trước
        petal.position.x += (Math.random() - 0.5) * spreadX;
        petal.position.y += 8 + Math.random() * 8; // Thấp hơn, gần mặt người
        petal.position.z -= 5 + Math.random() * spreadZ; // Phía trước người chơi

        // Random kích thước (nhỏ hơn)
        const scale = 0.3 + Math.random() * 0.4;
        petal.scale.set(scale, scale, scale);

        // Random rotation ban đầu
        petal.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        petal.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
            }
        });

        this.scene.add(petal);

        return {
            mesh: petal,
            // Vận tốc rơi chậm hơn
            velocity: {
                x: (Math.random() - 0.5) * 0.02,
                y: -0.03 - Math.random() * 0.02,
                z: (Math.random() - 0.5) * 0.02
            },
            rotationSpeed: {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            },
            swayPhase: Math.random() * Math.PI * 2,
            swaySpeed: 1.5 + Math.random() * 1
        };
    }

    update(delta, time, playerZ) {
        if (!this.isActive || !this.petalModel) return;

        // Spawn nhiều petals cùng lúc
        const spawnCount = 3;
        const now = performance.now();
        if (now - this.lastSpawnTime > this.spawnInterval && this.particles.length < this.particleCount) {
            for (let i = 0; i < spawnCount; i++) {
                const petal = this.createPetal();
                if (petal) {
                    // Spawn phía trước người chơi
                    petal.mesh.position.z = playerZ - 10 - Math.random() * 30;
                    petal.mesh.position.x = (Math.random() - 0.5) * 30;
                    petal.mesh.position.y = 5 + Math.random() * 10;
                    this.particles.push(petal);
                }
            }
            this.lastSpawnTime = now;
        }

        // Update all petals
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Di chuyển với delta time
            const swayX = Math.sin(time * p.swaySpeed + p.swayPhase) * 0.02;
            const swayZ = Math.cos(time * p.swaySpeed + p.swayPhase) * 0.02;

            p.mesh.position.x += (p.velocity.x + swayX);
            p.mesh.position.y += p.velocity.y;
            p.mesh.position.z += (p.velocity.z + swayZ);

            // Xoay
            p.mesh.rotation.x += p.rotationSpeed.x;
            p.mesh.rotation.y += p.rotationSpeed.y;
            p.mesh.rotation.z += p.rotationSpeed.z;

            // Reset petals khi đã rơi qua khỏi tầm nhìn hoặc quá thấp
            if (p.mesh.position.y < -2 || p.mesh.position.z > playerZ + 10) {
                p.mesh.position.z = playerZ - 10 - Math.random() * 30;
                p.mesh.position.x = (Math.random() - 0.5) * 30;
                p.mesh.position.y = 5 + Math.random() * 10;
            }
        }
    }
}
