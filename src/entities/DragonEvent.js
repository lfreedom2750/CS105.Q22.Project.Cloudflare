import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class DragonEvent {
    constructor(scene, env, player) {
        this.scene = scene;
        this.env = env;
        this.player = player;

        this.dragon = null;
        this.active = false;
        this.completed = false;
        this.speed = 14;
        this.startOffset = 10;
        this.height = 8;
        this.appearDuration = 0.8;
        this.waitDuration = 10;
        this.elapsed = 0;
        this.direction = 1;
        this.state = 'idle';
        this.spawnZ = 0;
        this.followDistance = this.startOffset;
        this.targetX = 0;
        this.flySpeed = 18;
        this.flyRange = 40;
        this.lastPlayerZ = null;
        this.dropInterval = 3;
        this.dropTimer = 1.5;
        this.dropSpeed = -0.12;
        this.gravity = -0.02;
        this.diamonds = [];
        this.shieldMesh = null;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldDuration = 10;
        this.diamondMat = new THREE.MeshStandardMaterial({
            color: 0x4caf50,
            transparent: true,
            opacity: 0.9,
            emissive: 0x0a7f35,
            metalness: 0.3,
            roughness: 0.4
        });
        this.mixer = null;
        this.animationsMap = {};
        this.currentAction = null;
    }

    async loadModel() {
        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}chinese_dragon.glb`);
            console.log('DragonEvent: loaded GLB, animation clips =', gltf.animations.length, gltf.animations.map((clip) => clip.name));
            this.dragon = gltf.scene;
            this.dragon.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.dragon.scale.set(1.2, 1.2, 1.2);
            this.dragon.rotation.y = Math.PI; // nhìn về phía trước
            this.dragon.visible = false;

            if (gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.dragon);
                const clip = gltf.animations[0];
                this.animationsMap['Idle'] = this.mixer.clipAction(clip).setLoop(THREE.LoopRepeat);
                this.currentAction = this.animationsMap['Idle'];
                this.currentAction.play();
                console.log('DragonEvent: playing animation clip', clip.name);
            }

            this.scene.add(this.dragon);
            console.log('DragonEvent: dragon model loaded');
        } catch (err) {
            console.error('DragonEvent: failed to load chinese_dragon.glb', err);
        }
    }

    start(playerX, playerZ) {
        if (!this.dragon || this.active || this.completed) return;
        if (this.env.currentSeasonIndex !== 0) return; // chỉ mùa xuân

        this.active = true;
        this.elapsed = 0;
        this.state = 'appearing';
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.dragon.visible = true;

        this.targetX = CONFIG.LANES[1] ?? 0;
        this.followDistance = this.startOffset;
        const startZ = playerZ - this.followDistance;

        this.spawnZ = startZ;
        this.lastPlayerZ = playerZ;
        this.dropTimer = 1;
        this.diamonds = [];
        this.dragon.scale.set(0.2, 0.2, 0.2);
        this.dragon.position.set(this.targetX, this.height - 2, startZ);
        this.dragon.rotation.set(0, Math.PI, 0);

        console.log('DragonEvent.start', {
            state: this.state,
            targetX: this.targetX,
            spawnZ: this.spawnZ,
            direction: this.direction,
            waitDuration: this.waitDuration,
            appearDuration: this.appearDuration
        });
    }

    update(delta, time, playerX, playerZ) {
        if (!this.dragon) return;

        if (this.env.currentSeasonIndex !== 0 && this.completed) {
            this.completed = false;
        }

        this.elapsed += delta;
        const laneX = this.targetX;
        const playerZDelta = this.lastPlayerZ !== null ? playerZ - this.lastPlayerZ : 0;
        this.lastPlayerZ = playerZ;

        if (this.mixer) this.mixer.update(delta);

        const playerY = this.player.group.position.y;
        if (this.shieldActive) {
            this.updateShield(delta, playerX, playerY, playerZ);
        }

        if (!this.active) {
            return;
        }

        if (this.state === 'appearing') {
            const scale = THREE.MathUtils.lerp(this.dragon.scale.x, 1.2, 0.08);
            this.dragon.scale.set(scale, scale, scale);
            this.dragon.position.y = THREE.MathUtils.lerp(this.dragon.position.y, this.height, 0.08);
            this.dragon.position.z = playerZ - this.followDistance;

            if (this.elapsed >= this.appearDuration) {
                this.state = 'idle';
                this.elapsed = 0;
                this.dragon.position.y = this.height;
                this.dragon.position.z = playerZ - this.followDistance;
                console.log('DragonEvent: appeared and now waiting', {
                    state: this.state,
                    targetX: laneX,
                    dragonZ: this.dragon.position.z,
                    followDistance: this.followDistance
                });
            }
            return;
        }

        if (this.state === 'idle') {
            this.dragon.position.x = laneX;
            this.dragon.position.y = this.height + Math.sin(time * 1.8) * 1.2;
            this.dragon.position.z = playerZ - this.followDistance;

            this.dropTimer -= delta;
            if (this.dropTimer <= 0) {
                this.dropDiamond(playerZ);
                this.dropTimer = this.dropInterval;
            }

            this.updateDiamonds(delta, playerX, playerY, playerZ);

            if (this.elapsed >= this.waitDuration) {
                this.state = 'flying';
                this.elapsed = 0;
                console.log('DragonEvent: waiting complete, now flying', {
                    state: this.state,
                    targetX: laneX,
                    dragonZ: this.dragon.position.z,
                    playerZ
                });
            }
            return;
        }

        if (this.state === 'flying') {
            this.dragon.position.x = laneX;
            this.dragon.position.z += playerZDelta;
            this.dragon.position.z -= this.flySpeed * delta;
            this.dragon.position.y = this.height + Math.sin(time * 1.8) * 1.2;

            this.updateDiamonds(delta, playerX, playerY, playerZ);

            const exitZ = playerZ - (this.followDistance + this.flyRange);
            if (this.dragon.position.z < exitZ || this.elapsed >= 4) {
                console.log('DragonEvent: exiting after flying', {
                    state: this.state,
                    dragonZ: this.dragon.position.z,
                    exitZ,
                    playerZ,
                    elapsed: this.elapsed
                });
                this.reset();
            }
        }
    }

    reset(clearCompleted = false) {
        if (!this.dragon) return;
        console.log('DragonEvent: reset', {
            state: this.state,
            spawnZ: this.spawnZ,
            targetX: this.targetX,
            active: this.active,
            shieldActive: this.shieldActive,
            clearCompleted
        });
        this.active = false;
        this.dragon.visible = false;
        this.state = 'idle';

        this.diamonds.forEach(d => this.scene.remove(d));
        this.diamonds = [];
        this.dropTimer = 1;

        if (clearCompleted) {
            this.completed = false;
        } else {
            this.completed = true;
        }
    }

    dropDiamond(playerZ) {
        const lanes = [...CONFIG.LANES];
        lanes.sort(() => Math.random() - 0.5);
        const lane = lanes[0];

        const diamond = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.8),
            new THREE.MeshStandardMaterial({
                color: 0x4caf50,
                emissive: 0x1aff80,
                emissiveIntensity: 0.8,
                metalness: 0.6,
                roughness: 0.1,
                transparent: true,
                opacity: 0.95
            })
        );
        diamond.rotation.z = Math.PI / 4;
        diamond.scale.setScalar(0.75);
        diamond.position.set(lane, this.dragon.position.y - 2, playerZ - 45);

        diamond.userData = {
            type: 'dragonDiamond',
            falling: true,
            velocity: this.dropSpeed
        };

        this.scene.add(diamond);
        this.diamonds.push(diamond);
    }

    updateDiamonds(delta, playerX, playerY, playerZ) {
        for (let i = this.diamonds.length - 1; i >= 0; i--) {
            const diamond = this.diamonds[i];

            if (diamond.userData.falling) {
                diamond.userData.velocity += this.gravity * delta * 60;
                diamond.position.y += diamond.userData.velocity * delta * 60;
                diamond.rotation.y += 0.05;

                if (diamond.position.y <= 1) {
                    diamond.position.y = 1;
                    diamond.userData.falling = false;
                }
            } else {
                diamond.rotation.y += 0.02;
            }

            const sparkle = 0.85 + Math.sin(Date.now() * 0.01 + i) * 0.05;
            diamond.scale.setScalar(sparkle);

            const dx = Math.abs(diamond.position.x - playerX);
            const dz = Math.abs(diamond.position.z - playerZ);
            const dy = Math.abs(diamond.position.y - playerY);

            if (dx < 2 && dz < 2 && dy < 2) {
                this.activateShield();
                this.scene.remove(diamond);
                this.diamonds.splice(i, 1);
                continue;
            }

            if (diamond.position.z > playerZ + 20) {
                this.scene.remove(diamond);
                this.diamonds.splice(i, 1);
            }
        }
    }

    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = this.shieldDuration;

        if (this.scene.userData.spawner) {
            this.scene.userData.spawner.setShield(true);
        }

        if (!this.shieldMesh) {
            this.shieldMesh = new THREE.Mesh(
                new THREE.SphereGeometry(1.8, 32, 32),
                new THREE.MeshBasicMaterial({
                    color: 0x4caf50,
                    transparent: true,
                    opacity: 0.35,
                    side: THREE.DoubleSide
                })
            );
            this.scene.add(this.shieldMesh);
        }

        console.log('Dragon shield activated!');
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

    updateShield(delta, playerX, playerY, playerZ) {
        if (!this.shieldActive) return;

        this.shieldTimer -= delta;

        if (this.shieldMesh) {
            this.shieldMesh.position.set(playerX, playerY + 0.5, playerZ);
            this.shieldMesh.rotation.y += 0.03;
            const pulse = 0.9 + Math.sin(Date.now() * 0.02) * 0.05;
            this.shieldMesh.scale.setScalar(pulse);
        }

        if (this.shieldTimer <= 0) {
            this.deactivateShield();
        }
    }
}
