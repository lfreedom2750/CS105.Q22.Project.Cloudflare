import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class PlaneEvent {
    constructor(scene) {
        this.scene = scene;

        this.plane = null;
        this.drops = [];

        this.active = false;
        this.phase = 'idle'; // idle | approach | attack | leave

        this.attackDuration = 10;   // giữ khoảng cách trong 10 giây
        this.attackTimer = 0;

        this.dropInterval = 3;    // mỗi 3 giây thả 1 đợt
        this.dropTimer = 0;

        this.followDistance = 50;  // máy bay giữ cách player 120 đơn vị phía trước
        this.leaveDistance = 260;   // khoảng cách bay đi

        this.approachSpeed = 1.2;
        this.leaveSpeed = 3.2;

        this.dropSpeed = -0.18;
        this.gravity = -0.025;

        this.bombTexture = null;
    }

    async loadModel() {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}cartoon_plane.glb`);

        this.plane = gltf.scene;

        this.plane.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });

        // chỉnh tùy model của bạn
        this.plane.scale.set(0.8, 0.8, 0.8);
        this.plane.rotation.y = Math.PI;

        this.scene.add(this.plane);
        this.plane.visible = false;

        // Load bomb texture
        this.loadBombTexture();
    }

    loadBombTexture() {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            '/assets/war.jpg',
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                this.bombTexture = texture;
                console.log('Bomb texture loaded successfully');
            },
            undefined,
            (error) => {
                console.error('Error loading bomb texture:', error);
            }
        );
    }

    start(playerX, playerZ) {
        if (!this.plane || this.active) return;

        this.active = true;
        this.phase = 'approach';

        this.attackTimer = this.attackDuration;
        this.dropTimer = 0.8; // cho player một chút thời gian trước đợt đầu

        this.plane.visible = true;

        // xuất hiện rất xa và lệch sang 1 bên
        const sideOffset = Math.random() > 0.5 ? -16 : 16;
        this.plane.position.set(playerX, 5, playerZ - 40);
    }

    dropBombs(playerZ) {
        const lanes = [...CONFIG.LANES];
        lanes.sort(() => Math.random() - 0.5);

        // mỗi đợt thả 1 hoặc 2 bom
        const count = Math.random() > 0.7 ? 2 : 1; // 30% thả 2 bom, 70% thả 1 bom

        for (let i = 0; i < count; i++) {
            const lane = lanes[i];

            const bombMaterial = this.bombTexture
                ? new THREE.MeshStandardMaterial({
                    map: this.bombTexture,
                    color: 0xffffff
                })
                : new THREE.MeshStandardMaterial({ color: 0xaa0000 });

            const bomb = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                bombMaterial
            );

            // rơi xuống ở phía trước player
            const dropZ = playerZ - 55 - i * 12;

            bomb.position.set(lane, this.plane.position.y - 2, dropZ);
            bomb.castShadow = true;
            bomb.receiveShadow = true;

            bomb.userData = {
                type: 'low',
                falling: true,
                velocity: this.dropSpeed
            };

            this.scene.add(bomb);
            this.drops.push(bomb);
        }
    }

    updateDrops(delta, obstaclesArray) {
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];

            if (d.userData.falling) {
                d.userData.velocity += this.gravity * delta * 60;
                d.position.y += d.userData.velocity * delta * 60;

                if (d.position.y <= 1) {
                    d.position.y = 1;
                    d.userData.falling = false;

                    // thành obstacle thật
                    obstaclesArray.push(d);
                }
            }
        }
    }

    update(delta, time, playerX, playerZ, obstaclesArray) {
        if (!this.active || !this.plane) return;

        const targetX = playerX;
        const targetY = 18 + Math.sin(time * 1.2) * 0.2;
        const targetZ = playerZ - this.followDistance;

        // PHASE 1: xuất hiện từ xa rồi tiến tới vị trí bám
        if (this.phase === 'approach') {
            this.plane.position.x = THREE.MathUtils.lerp(this.plane.position.x, targetX, 0.01);
            this.plane.position.y = THREE.MathUtils.lerp(this.plane.position.y, targetY, 0.04);
            this.plane.position.z += this.approachSpeed;

            if (this.plane.position.z >= targetZ) {
                this.phase = 'attack';
            }
        }

        // PHASE 2: giữ khoảng cách với player trong 10 giây và thả bom nhiều lần
        else if (this.phase === 'attack') {
            this.attackTimer -= delta;
            this.dropTimer -= delta;

            // giữ máy bay luôn ở trước player một khoảng cố định
            this.plane.position.x = THREE.MathUtils.lerp(this.plane.position.x, targetX, 0.03);
            this.plane.position.y = THREE.MathUtils.lerp(this.plane.position.y, targetY, 0.05);
            this.plane.position.z = THREE.MathUtils.lerp(this.plane.position.z, targetZ, 0.08);

            if (this.dropTimer <= 0) {
                this.dropBombs(playerZ);
                this.dropTimer = this.dropInterval;
            }

            if (this.attackTimer <= 0) {
                this.phase = 'leave';
            }
        }

        // PHASE 3: bay đi
        else if (this.phase === 'leave') {
            this.plane.position.x = THREE.MathUtils.lerp(this.plane.position.x, targetX, 0.01);
            this.plane.position.y = THREE.MathUtils.lerp(this.plane.position.y, targetY + 4, 0.04);
            this.plane.position.z -= this.leaveSpeed;

            if (this.plane.position.z < playerZ - this.leaveDistance) {
                this.reset();
                return;
            }
        }

        // lắc nhẹ
        this.plane.rotation.z = Math.sin(time * 2.0) * 0.01;
        this.plane.rotation.x = Math.sin(time * 1.5) * 0.005;

        this.updateDrops(delta, obstaclesArray);
    }

    reset() {
        this.active = false;
        this.phase = 'idle';
        this.attackTimer = 0;
        this.dropTimer = 0;

        if (this.plane) {
            this.plane.visible = false;
        }

        this.drops = [];
    }
}