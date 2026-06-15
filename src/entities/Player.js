import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class Player {
    constructor(scene) {
        this.group = new THREE.Group();
        scene.add(this.group);
        this.currentLane = 1; // 0: Trái, 1: Giữa, 2: Phải
        
        this.isJumping = false; this.jumpVel = 0;

        this.model = null;
        this.mixer = null;
        this.animationsMap = {};
        this.currentAction = null;
    }

    async loadModel(playerId) {
        try {
            const playerInfo = CONFIG.PLAYERS.find(p => p.id === playerId);
            const fileName = playerInfo ? playerInfo.file : CONFIG.PLAYERS[0].file;
            const modelScale = playerInfo?.scale ?? 0.01;
            const modelRotationY = playerInfo?.rotationY ?? Math.PI;
            const modelPositionY = playerInfo?.positionY ?? 0;

            console.log('=== LOADING PLAYER MODEL ===');
            console.log('File:', `${CONFIG.PATH_ASSETS}${fileName}`);
            console.log('Scale:', modelScale);
            console.log('RotationY:', modelRotationY);
            console.log('PositionY:', modelPositionY);

            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${fileName}`);

            this.model = gltf.scene;
            this.model.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; }});

            this.model.scale.set(modelScale, modelScale, modelScale);
            this.model.rotation.y = modelRotationY;
            this.model.position.y = modelPositionY;

            this.group.add(this.model);

            if (gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.model);

                const clips = ['Run', 'Jump'];
                clips.forEach((name, index) => {
                    const clip = THREE.AnimationClip.findByName(gltf.animations, name) || gltf.animations[index];
                    if (clip) {
                        this.animationsMap[name] = this.mixer.clipAction(clip);
                        if (name !== 'Run') {
                            this.animationsMap[name].setLoop(THREE.LoopOnce);
                            this.animationsMap[name].clampWhenFinished = true;
                        }
                    }
                });

                this.currentAction = this.animationsMap['Run'];
                if(this.currentAction) this.currentAction.play();

                console.log('Player model loaded OK, animations:', Object.keys(this.animationsMap));
            }
        } catch (err) {
            console.error('=== ERROR LOADING PLAYER MODEL ===');
            console.error(err);
        }
    }

    fadeAction(name) {
        if (!this.mixer || !this.animationsMap[name] || this.currentAction === this.animationsMap[name]) return;
        const nextAction = this.animationsMap[name];
        nextAction.reset().play();
        if (this.currentAction) this.currentAction.crossFadeTo(nextAction, 0.2, true);
        this.currentAction = nextAction;
    }

    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.jumpVel = 11.5;   // lực bật ban đầu
            this.fadeAction('Jump'); // phản hồi animation ngay khi bấm
        }
    }

    turn(direction) {
        // KHÔNG XOAY THẬT - Chỉ reset vị trí
        this.currentLane = 1;
        if (this.model) {
            this.model.position.x = 0;
        }
    }

    update(delta, time, speed) {
        if (!this.model) return; 
        if (this.mixer) this.mixer.update(delta);

        // 1. DI CHUYỂN TIẾN (Dùng translateZ để luôn tiến về hướng mặt)
        if (speed) {
            // Speed trong main.js là 0.5, delta ~0.016 => mỗi frame tiến ~0.008 unit
            this.group.translateZ(-speed * delta * 60); // Nhân 60 để bù trừ tốc độ frame rate
        }

        // 2. CHUYỂN LÀN (Lerp model X bên trong Group)
        // Cách này giúp Group luôn nằm chính giữa đường, chỉ có Model di chuyển qua lại giữa các làn
        const targetX = CONFIG.LANES[this.currentLane];
        this.model.position.x = THREE.MathUtils.lerp(this.model.position.x, targetX, 10 * delta);

        // 3. PHYSICS (Nhảy)
        if (this.isJumping) {
            this.group.position.y += this.jumpVel * delta;
            this.jumpVel -= 30 * delta;   // gravity mạnh hơn

            if (this.group.position.y <= 0) {
                this.group.position.y = 0;
                this.isJumping = false;
                this.jumpVel = 0;
            }
        }

        // 4. ANIMATION STATE
        if (this.isJumping) this.fadeAction('Jump');
        else this.fadeAction('Run');
    }
}