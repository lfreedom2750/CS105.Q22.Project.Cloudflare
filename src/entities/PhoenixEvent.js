import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class PhoenixEvent {
    constructor(scene, environment, player) {
        this.scene = scene;
        this.env = environment;
        this.player = player;

        this.phoenix = null;
        this.mixer = null;
        this.actions = [];
        this.activeAction = null;
        this.gems = [];
        this.active = false;
        this.phase = 'idle';

        this.attackDuration = 10;
        this.attackTimer = 0;
        this.dropInterval = 2;
        this.dropTimer = 0;

        this.followDistance = 40;  // Giữ khoảng cách với player
        this.leaveDistance = 100;

        this.approachSpeed = 1.5;
        this.leaveSpeed = 2;

        this.dropSpeed = -0.15;
        this.gravity = -0.02;

        // Shield
        this.shieldMesh = null;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldDuration = 10;

        // Gem material
        this.gemMat = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.9
        });
    }

    async loadModel() {
        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}phoenix_bird.glb`);

            this.phoenix = gltf.scene;
            this.phoenix.traverse(c => { if(c.isMesh) { c.castShadow = true; }});

            // Scale cố định
            this.phoenix.scale.set(2, 2, 2);

            // Setup animation - GIỐNG PLAYER
            if (gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.phoenix);
                this.animationsMap = {};
                
                // Lấy tất cả animation
                gltf.animations.forEach((clip, index) => {
                    const name = clip.name || `Anim_${index}`;
                    this.animationsMap[name] = this.mixer.clipAction(clip);
                    console.log('Phoenix anim:', name);
                });

                // Play animation đầu tiên
                const firstAnim = Object.values(this.animationsMap)[0];
                if (firstAnim) {
                    firstAnim.play();
                    this.currentAction = firstAnim;
                }
            }

            this.scene.add(this.phoenix);
            this.phoenix.visible = false;
            console.log('Phoenix model loaded OK');
        } catch (error) {
            console.log('Phoenix model load failed, using placeholder');
            this.createPhoenixPlaceholder();
        }
    }

    createPhoenixPlaceholder() {
        const group = new THREE.Group();

        const body = new THREE.Mesh(
            new THREE.ConeGeometry(2, 6, 8),
            new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        body.rotation.x = Math.PI / 2;
        group.add(body);

        const wings = new THREE.Mesh(
            new THREE.BoxGeometry(10, 0.3, 2),
            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
        );
        wings.position.z = -0.5;
        group.add(wings);

        const tail = new THREE.Mesh(
            new THREE.ConeGeometry(0.8, 5, 6),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        tail.rotation.x = -Math.PI / 2;
        tail.position.z = 4;
        group.add(tail);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xffdd00 })
        );
        head.position.z = -3;
        group.add(head);

        this.phoenix = group;
        this.scene.add(this.phoenix);
        this.phoenix.visible = false;
    }

    start(playerX, playerZ) {
        if (!this.phoenix || this.active) return;
        if (this.env.currentSeasonIndex !== 0) return;

        this.active = true;
        this.phase = 'approach';
        this.attackTimer = this.attackDuration;
        this.dropTimer = 1;

        this.phoenix.visible = true;

        // Spawn phía trước player
        const sideOffset = Math.random() > 0.5 ? -10 : 10;
        this.phoenix.position.set(playerX + sideOffset, 10, playerZ - 40);

        console.log('Phoenix spawned! PlayerZ:', playerZ, 'PhoenixZ:', this.phoenix.position.z);
    }

    dropGem(playerZ) {
        const lanes = [...CONFIG.LANES];
        lanes.sort(() => Math.random() - 0.5);
        const lane = lanes[0];

        const gem = new THREE.Mesh(
            new THREE.OctahedronGeometry(1),
            this.gemMat.clone()
        );

        gem.rotation.z = Math.PI / 4;
        // Rơi phía trước player
        gem.position.set(lane, this.phoenix.position.y - 2, playerZ - 50);

        gem.userData = {
            type: 'shieldGem',
            falling: true,
            velocity: this.dropSpeed
        };

        this.scene.add(gem);
        this.gems.push(gem);
    }

    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = this.shieldDuration;

        if (this.scene.userData.spawner) {
            this.scene.userData.spawner.setShield(true);
        }

        this.shieldMesh = new THREE.Mesh(
            new THREE.SphereGeometry(2, 32, 32),
            new THREE.MeshBasicMaterial({
                color: 0x00ffaa,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            })
        );

        this.scene.add(this.shieldMesh);
        console.log('Shield activated!');
    }

    deactivateShield() {
        this.shieldActive = false;
        this.shieldTimer = 0;

        if (this.scene.userData.spawner) {
            this.scene.userData.spawner.setShield(false);
        }

        if (this.shieldMesh) {
            this.scene.remove(this.shieldMesh);
            this.shieldMesh = null;
        }
    }

    update(delta, time, playerX, playerZ) {
        if (!this.active || !this.phoenix) return;

        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(delta);
        }

        console.log('Phoenix update | Phase:', this.phase, '| PlayerZ:', playerZ.toFixed(0), '| PhoenixZ:', this.phoenix.position.z.toFixed(0));

        const targetX = playerX;
        const targetY = 10 + Math.sin(time * 2) * 0.5;
        const targetZ = playerZ - this.followDistance;

        // APPROACH: Di chuyển về phía player (tăng z)
        if (this.phase === 'approach') {
            this.phoenix.position.x = THREE.MathUtils.lerp(this.phoenix.position.x, targetX, 0.02);
            this.phoenix.position.y = THREE.MathUtils.lerp(this.phoenix.position.y, targetY, 0.03);
            this.phoenix.position.z += this.approachSpeed;

            if (this.phoenix.position.z >= targetZ) {
                this.phase = 'drop';
            }
        }
        // DROP: Thả gem
        else if (this.phase === 'drop') {
            this.attackTimer -= delta;
            this.dropTimer -= delta;

            this.phoenix.position.x = THREE.MathUtils.lerp(this.phoenix.position.x, targetX, 0.03);
            this.phoenix.position.y = THREE.MathUtils.lerp(this.phoenix.position.y, targetY, 0.05);
            this.phoenix.position.z = THREE.MathUtils.lerp(this.phoenix.position.z, targetZ, 0.05);

            if (this.dropTimer <= 0) {
                this.dropGem(playerZ);
                this.dropTimer = this.dropInterval;
            }

            if (this.attackTimer <= 0) {
                this.phase = 'leave';
            }
        }
        // LEAVE: Bay đi
        else if (this.phase === 'leave') {
            this.phoenix.position.y = THREE.MathUtils.lerp(this.phoenix.position.y, targetY + 5, 0.03);
            this.phoenix.position.z -= this.leaveSpeed;

            if (this.phoenix.position.z < playerZ - this.leaveDistance) {
                this.reset();
                return;
            }
        }

        // Animation quay
        this.phoenix.rotation.y += 0.01;

        // Update gems
        const playerY = this.player.model ? this.player.model.position.y : 0;
        this.updateGems(delta, playerX, playerY, playerZ);

        // Update shield
        this.updateShield(delta, playerX, playerY, playerZ);
    }

    updateGems(delta, playerX, playerY, playerZ) {
        for (let i = this.gems.length - 1; i >= 0; i--) {
            const gem = this.gems[i];

            if (gem.userData.falling) {
                gem.userData.velocity += this.gravity * delta * 60;
                gem.position.y += gem.userData.velocity * delta * 60;
                gem.rotation.y += 0.05;

                if (gem.position.y <= 1) {
                    gem.position.y = 1;
                    gem.userData.falling = false;
                }
            } else {
                gem.rotation.y += 0.02;
            }

            // Va chạm với player
            const dx = Math.abs(gem.position.x - playerX);
            const dz = Math.abs(gem.position.z - playerZ);
            const dy = Math.abs(gem.position.y - playerY);

            if (dx < 2 && dz < 2 && dy < 2) {
                this.activateShield();
                this.scene.remove(gem);
                this.gems.splice(i, 1);
                continue;
            }

            // Xóa gem quá xa
            if (gem.position.z > playerZ + 20) {
                this.scene.remove(gem);
                this.gems.splice(i, 1);
            }
        }
    }

    updateShield(delta, playerX, playerY, playerZ) {
        if (!this.shieldActive) return;

        this.shieldTimer -= delta;

        if (this.shieldMesh) {
            this.shieldMesh.position.set(playerX, playerY + 0.5, playerZ);
            this.shieldMesh.rotation.y += 0.02;
            const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.05;
            this.shieldMesh.scale.setScalar(pulse);
        }

        if (this.shieldTimer <= 0) {
            this.deactivateShield();
        }
    }

    updateShieldPosition(delta, playerX, playerY, playerZ) {
        if (!this.shieldActive) return;
        this.updateShield(delta, playerX, playerY, playerZ);
    }

    reset() {
        this.active = false;
        this.phase = 'idle';
        this.attackTimer = 0;
        this.dropTimer = 0;

        if (this.phoenix) {
            this.phoenix.visible = false;
        }

        if (this.mixer) {
            this.mixer.stopAllAction();
        }

        this.gems.forEach(gem => this.scene.remove(gem));
        this.gems = [];

        this.deactivateShield();
    }
}
