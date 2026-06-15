import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class ElkEvent {
    constructor(scene, env) {
        this.scene = scene;
        this.env = env;

        this.elk = null;
        this.mixer = null;
        this.active = false;
        this.direction = 1;
        this.targetZ = 0;
    }

    async loadModel() {
        const elkConfig = CONFIG.ELK_CROSSING;
        if (!elkConfig?.file) return;

        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${elkConfig.file}`);

            this.elk = gltf.scene;
            this.elk.scale.setScalar(elkConfig.scale || 1);
            this.elk.position.y = elkConfig.positionY || 0;
            this.elk.visible = false;
            this.elk.userData = { type: 'elk', isAnimal: true };

            this.elk.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            if (gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.elk);
                const runClip = THREE.AnimationClip.findByName(gltf.animations, 'Run') || gltf.animations[0];
                this.mixer.clipAction(runClip).setLoop(THREE.LoopRepeat).play();
            }

            this.scene.add(this.elk);

            console.log('ElkEvent: loaded elk_wip.glb', {
                scale: elkConfig.scale,
                seasons: elkConfig.seasons
            });
        } catch (err) {
            console.error('ElkEvent: failed to load elk model', err);
            this.elk = null;
        }
    }

    isAllowedSeason() {
        const elkConfig = CONFIG.ELK_CROSSING || {};
        const currentSeason = CONFIG.SEASONS[this.env.currentSeasonIndex]?.id;
        return !elkConfig.seasons?.length || elkConfig.seasons.includes(currentSeason);
    }

    start(playerZ) {
        if (!this.elk || this.active || !this.isAllowedSeason()) return;

        const elkConfig = CONFIG.ELK_CROSSING || {};
        const sideOffset = elkConfig.sideOffset || 13;

        this.active = true;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.targetZ = playerZ - (elkConfig.spawnAhead || 45);

        this.elk.visible = true;
        this.elk.position.set(-this.direction * sideOffset, elkConfig.positionY || 0, this.targetZ);
        this.elk.rotation.set(0, this.direction * (elkConfig.rotationY || Math.PI / 2), 0);

        console.log('ElkEvent: spawn', {
            season: CONFIG.SEASONS[this.env.currentSeasonIndex]?.id,
            direction: this.direction > 0 ? 'left-to-right' : 'right-to-left',
            startX: this.elk.position.x,
            z: this.elk.position.z
        });
    }

    reset() {
        if (this.active) {
            console.log('ElkEvent: reset');
        }

        this.active = false;

        if (this.elk) {
            this.elk.visible = false;
        }
    }

    update(delta, player, onDeath) {
        if (!this.elk) return;
        if (this.mixer) this.mixer.update(delta);

        if (!this.active) return;

        if (!this.isAllowedSeason()) {
            this.reset();
            return;
        }

        const elkConfig = CONFIG.ELK_CROSSING || {};
        const sideOffset = elkConfig.sideOffset || 13;
        const moveSpeed = elkConfig.speed || 9;

        this.elk.position.x += this.direction * moveSpeed * delta;

        const playerX = player.model ? player.model.position.x : player.group.position.x;
        const playerY = player.group.position.y;
        const playerZ = player.group.position.z;

        const dx = Math.abs(this.elk.position.x - playerX);
        const dz = Math.abs(this.elk.position.z - playerZ);

        if (
            dx < (elkConfig.collisionX || 1.6) &&
            dz < (elkConfig.collisionZ || 2.4) &&
            playerY < (elkConfig.collisionHeight || 2.6)
        ) {
            console.log('ElkEvent: hit player', { dx, dz, playerY });
            onDeath('BẠN ĐÃ ĐỤNG TRÚNG ELK!');
            return;
        }

        const passedRoad = Math.abs(this.elk.position.x) > sideOffset + 4;
        const passedPlayer = this.elk.position.z > playerZ + 20;

        if (passedRoad || passedPlayer) {
            this.reset();
        }
    }
}
