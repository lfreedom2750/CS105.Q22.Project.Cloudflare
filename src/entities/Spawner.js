import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class Spawner {
    constructor(scene, environment) {
        this.scene = scene;
        this.env = environment;

        this.obstacles = [];
        this.collectibles = [];
        this.portals = [];

        this.activeTurnWall = null;
        this.obstacleModelCache = {};
        this.magnetModel = null;
        this.fighterJetModel = null;

        this.forceSpawnSeasonPortal = false;
        this.shieldActive = false;  // Shield từ phoenix
        this.magnetActive = false;
        this.magnetTimer = 0;
        this.magnetAura = null;
        this.fighterJetActive = false;
        this.fighterJetTimer = 0;
        this.activeFighterJet = null;
        this.fighterJetShots = [];

        // Tạo texture nước động cho suối
        this.initRiverTexture();

        this.coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 1,
            roughness: 0.2
        });

        this.portalMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffd700,
            emissiveIntensity: 2
        });

        this.codeObstacleMats = {
            spring: new THREE.MeshStandardMaterial({ color: 0xffb7d5, roughness: 1 }),
            summer: new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 1 }),
            autumn: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 1 }),
            winter: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 1 })
        };

        this.obstacleColors = {
            torus: new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.8, roughness: 0.2 }),
            trefoil: new THREE.MeshStandardMaterial({ color: 0x44aaff, metalness: 0.8, roughness: 0.2 })
        };

        // Cache texture cho obstacle
        this.textureCache = {};
        
        // River texture
        this.riverCanvas = null;
        this.riverContext = null;
        this.riverTexture = null;
        this.riverWaveTime = 0;
    }

    initRiverTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        this.riverCanvas = canvas;
        this.riverContext = canvas.getContext('2d');
        
        this.riverTexture = new THREE.CanvasTexture(canvas);
        this.riverTexture.wrapS = THREE.RepeatWrapping;
        this.riverTexture.wrapT = THREE.RepeatWrapping;
        this.riverTexture.repeat.set(4, 1);
        
        // Vẽ texture ban đầu
        this.updateRiverTexture();
    }

    updateRiverTexture() {
        if (!this.riverContext) return;
        
        const ctx = this.riverContext;
        const width = this.riverCanvas.width;
        const height = this.riverCanvas.height;
        
        this.riverWaveTime += 0.02;
        
        // Màu nước biển xanh trời
        ctx.fillStyle = '#0099cc';
        ctx.fillRect(0, 0, width, height);

        // Sóng nước sáng hơn
        ctx.fillStyle = 'rgba(0, 150, 200, 0.5)';
        for (let i = 0; i < 6; i++) {
            const y = (Math.sin(this.riverWaveTime + i * 0.8) * 15) + (i * height / 6);
            ctx.beginPath();
            ctx.ellipse(width / 2, y, width * 0.4, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Bóng sáng trắng
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        for (let i = 0; i < 4; i++) {
            const x = (Math.cos(this.riverWaveTime * 0.5 + i * 1.5) * 40) + width / 2;
            const y = (Math.sin(this.riverWaveTime * 0.7 + i * 1.2) * 30) + height / 2;
            ctx.beginPath();
            ctx.ellipse(x, y, 18, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.riverTexture) {
            this.riverTexture.needsUpdate = true;
        }
    }

    // Load texture cho obstacle
    loadObstacleTexture(texturePath) {
        if (this.textureCache[texturePath]) {
            return Promise.resolve(this.textureCache[texturePath]);
        }

        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                texturePath,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.repeat.set(4, 1);
                    this.textureCache[texturePath] = texture;
                    console.log('Texture loaded:', texturePath);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.error('Error loading texture:', texturePath, error);
                    reject(error);
                }
            );
        });
    }

    getCurrentSeasonId() {
        return CONFIG.SEASONS[this.env.currentSeasonIndex].id;
    }

    getPlayerLaneX(player) {
        if (player.model) return player.model.position.x;
        return player.group.position.x;
    }

    createCodeObstacle(def, texture) {
        const seasonId = this.getCurrentSeasonId();
        const mat = this.codeObstacleMats[seasonId] || this.codeObstacleMats.summer;

        let obs = null;
        let finalMat = mat;

        if (def.geometry === 'torus') {
            // Nếu có texture thì dùng texture với nền trắng
            if (texture) {
                // Texture dạng vòng tròn - điều chỉnh để vừa khít
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.repeat.set(1, 1);
                texture.offset.set(0, 0);

                finalMat = new THREE.MeshStandardMaterial({
                    map: texture,
                    color: 0xffffff,  // Nền trắng
                    metalness: 0.2,
                    roughness: 0.5,
                    transparent: true,
                    alphaTest: 0.1,
                    side: THREE.DoubleSide  // Hiển thị cả 2 mặt
                });
            } else {
                // Không có texture thì dùng màu trắng
                finalMat = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    metalness: 0.2,
                    roughness: 0.5
                });
            }

            obs = new THREE.Mesh(
                new THREE.TorusGeometry(
                    def.radius || 1.5,
                    def.tube || 0.4,
                    def.radialSegments || 16,
                    def.tubularSegments || 100
                ),
                finalMat
            );
        } else if (def.geometry === 'trefoil') {
            obs = new THREE.Mesh(
                new THREE.TorusKnotGeometry(
                    def.radius || 1,
                    def.tube || 0.3,
                    def.tubularSegments || 64,
                    def.radialSegments || 8
                ),
                this.obstacleColors.trefoil
            );
        } else if (def.geometry === 'box') {
            obs = new THREE.Mesh(
                new THREE.BoxGeometry(
                    def.size?.x || 3,
                    def.size?.y || 1.2,
                    def.size?.z || 1
                ),
                mat
            );
        } else if (def.geometry === 'cone') {
            obs = new THREE.Mesh(
                new THREE.ConeGeometry(
                    def.radius || 1,
                    def.height || 2,
                    def.radialSegments || 8
                ),
                mat
            );
        } else if (def.geometry === 'sphere') {
            let sphereMat;

            if (texture) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.repeat.set(1, 1);

                sphereMat = new THREE.MeshStandardMaterial({
                    map: texture,
                    color: 0xffffff,
                    metalness: 0.2,
                    roughness: 0.7
                });
            } else {
                sphereMat = new THREE.MeshStandardMaterial({
                    color: def.color || 0xffffff,
                    metalness: 0.2,
                    roughness: 0.7
                });
            }

            obs = new THREE.Mesh(
                new THREE.SphereGeometry(
                    def.radius || 1,
                    def.widthSegments || 32,
                    def.heightSegments || 32
                ),
                sphereMat
            );
        } else if (def.geometry === 'cylinder') {
            obs = new THREE.Mesh(
                new THREE.CylinderGeometry(
                    def.radiusTop || 0.8,
                    def.radiusBottom || 0.8,
                    def.height || 2,
                    def.radialSegments || 10
                ),
                mat
            );
        } else {
            obs = new THREE.Mesh(
                new THREE.BoxGeometry(3, 1.2, 1),
                mat
            );
        }

        obs.castShadow = true;
        obs.receiveShadow = true;

        if (def.rotation) {
            obs.rotation.set(
                def.rotation.x || 0,
                def.rotation.y || 0,
                def.rotation.z || 0
            );
        }

        return obs;
    }

    // async createGLBObstacle(def) {
    //     try {
    //         console.log('Đang load obstacle GLB:', def.file);

    //         if (!this.obstacleModelCache[def.file]) {
    //             const loader = new GLTFLoader();
    //             const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${def.file}`);
    //             this.obstacleModelCache[def.file] = gltf.scene;
    //         }

    //         const obs = this.obstacleModelCache[def.file].clone(true);

    //         const scale = def.scale || 1;
    //         obs.scale.set(scale, scale, scale);

    //         obs.traverse(c => {
    //             if (c.isMesh) {
    //                 c.castShadow = true;
    //                 c.receiveShadow = true;
    //             }
    //         });

    //         if (def.rotation) {
    //             obs.rotation.set(
    //                 def.rotation.x || 0,
    //                 def.rotation.y || 0,
    //                 def.rotation.z || 0
    //             );
    //         }

    //         return obs;
    //     } catch (err) {
    //         console.error('Lỗi load obstacle GLB:', def.file, err);
    //         return null;
    //     }
    // }

    async createGLBObstacle(def) {
    try {
        console.log('Đang load obstacle GLB:', def.file);

        if (!this.obstacleModelCache[def.file]) {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${def.file}`);
            this.obstacleModelCache[def.file] = gltf.scene;
        }

        const model = this.obstacleModelCache[def.file].clone(true);

        // 1. scale trước
        const scale = def.scale || 1;
        model.scale.set(scale, scale, scale);

        // 2. rotation trước
        if (def.rotation) {
            model.rotation.set(
                def.rotation.x || 0,
                def.rotation.y || 0,
                def.rotation.z || 0
            );
        }

        // 3. shadow
        model.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });

        // 4. Bọc model vào wrapper để dễ chỉnh pivot
        const wrapper = new THREE.Group();
        wrapper.add(model);

        // 5. Tính bounding box sau khi scale/rotation
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        console.log('SIZE:', size);
        console.log('CENTER:', center);
        console.log('MIN Y:', box.min.y);
        console.log('MAX Y:', box.max.y);

        // 6. Kéo model về giữa local origin theo X/Z
        model.position.x -= center.x;
        model.position.z -= center.z;

        // 7. Kéo đáy model chạm mặt đất local y = 0
        model.position.y -= box.min.y;

        // Nếu muốn debug trực quan thì mở 2 dòng này:
        // const axes = new THREE.AxesHelper(5);
        // wrapper.add(axes);

        return wrapper;
    } catch (err) {
        console.error('Lỗi load GLB obstacle:', def.file, err);
        return null;
    }
}
    
    async spawnObstacle(lane, spawnZ) {
        const seasonId = this.getCurrentSeasonId();

        const candidates = CONFIG.OBSTACLE_TYPES.filter(def => {
            return !def.seasons || def.seasons.includes(seasonId);
        });

        if (candidates.length === 0) return;

        const obstacleDef = candidates[Math.floor(Math.random() * candidates.length)];

        let obs = null;

        if (obstacleDef.spawnMode === 'code') {
            // Load texture nếu có
            let texture = null;
            if (obstacleDef.texture) {
                try {
                    texture = await this.loadObstacleTexture(obstacleDef.texture);
                } catch (e) {
                    console.warn('Could not load texture:', obstacleDef.texture);
                }
            }
            obs = this.createCodeObstacle(obstacleDef, texture);
        } else if (obstacleDef.spawnMode === 'glb') {
            obs = await this.createGLBObstacle(obstacleDef);
            if (!obs) {
                console.warn('Fallback to code obstacle for', obstacleDef.id);
                obs = this.createCodeObstacle({
                    geometry: 'box',
                    size: obstacleDef.size || { x: 3, y: 1.2, z: 1 },
                    rotation: obstacleDef.rotation,
                    positionY: obstacleDef.positionY ?? 0.6
                }, null);
            }
        }

        if (!obs) return;

        const y = obstacleDef.positionY ?? (obstacleDef.type === 'high' ? 3.5 : 0.6);
        obs.position.set(lane, y, spawnZ);

        obs.userData = {
            type: obstacleDef.type,
            obstacleId: obstacleDef.id,
            isSeasonalObstacle: true
        };

        this.scene.add(obs);
        this.obstacles.push(obs);
    }

    async loadMagnetModel() {
        if (this.magnetModel) return this.magnetModel;

        const magnetConfig = CONFIG.MAGNET_POWERUP;
        if (!magnetConfig?.file) return null;

        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${magnetConfig.file}`);
            this.magnetModel = gltf.scene;

            this.magnetModel.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });

            console.log('Magnet power-up loaded:', magnetConfig.file);
            return this.magnetModel;
        } catch (err) {
            console.error('Failed to load magnet power-up:', err);
            return null;
        }
    }

    async spawnMagnet(lane, spawnZ) {
        const magnetConfig = CONFIG.MAGNET_POWERUP || {};
        const model = await this.loadMagnetModel();
        if (!model) return false;

        const magnet = model.clone(true);
        const scale = magnetConfig.scale || 1;
        magnet.scale.set(scale, scale, scale);
        magnet.position.set(lane, magnetConfig.positionY ?? 1.3, spawnZ);
        magnet.userData = { type: 'magnet' };

        this.scene.add(magnet);
        this.collectibles.push(magnet);
        return true;
    }

    spawnCoin(lane, spawnZ) {
        const coin = new THREE.Mesh(
            new THREE.TorusGeometry(0.4, 0.1, 8, 16),
            this.coinMat
        );
        coin.position.set(lane, 1.5, spawnZ);
        coin.userData = { type: 'coin' };

        this.scene.add(coin);
        this.collectibles.push(coin);
        return coin;
    }

    spawnCoinLine(lane, spawnZ) {
        const lineConfig = CONFIG.COIN_LINE || {};
        const minCount = lineConfig.minCount || 10;
        const maxCount = lineConfig.maxCount || 20;
        const spacing = lineConfig.spacing || 3.2;
        const count = Math.floor(minCount + Math.random() * (maxCount - minCount + 1));

        for (let i = 0; i < count; i++) {
            this.spawnCoin(lane, spawnZ - i * spacing);
        }
    }

    activateMagnet(player) {
        const magnetConfig = CONFIG.MAGNET_POWERUP || {};

        this.magnetActive = true;
        this.magnetTimer = magnetConfig.duration || 5;

        if (!this.magnetAura) {
            this.magnetAura = new THREE.Mesh(
                new THREE.SphereGeometry(magnetConfig.auraRadius || 2.2, 32, 32),
                new THREE.MeshBasicMaterial({
                    color: 0xffd700,
                    transparent: true,
                    opacity: 0.28,
                    side: THREE.DoubleSide,
                    depthWrite: false
                })
            );
            this.scene.add(this.magnetAura);
        }

        this.updateMagnetAura(player);
    }

    deactivateMagnet() {
        this.magnetActive = false;
        this.magnetTimer = 0;

        if (this.magnetAura) {
            this.scene.remove(this.magnetAura);
            this.magnetAura = null;
        }
    }

    updateMagnetAura(player) {
        if (!this.magnetAura) return;

        const pX = this.getPlayerLaneX(player);
        const pY = player.group.position.y;
        const pZ = player.group.position.z;

        this.magnetAura.position.set(pX, pY + 1.1, pZ);
        this.magnetAura.rotation.y += 0.04;

        const pulse = 1 + Math.sin(Date.now() * 0.012) * 0.05;
        this.magnetAura.scale.setScalar(pulse);
    }

    async loadFighterJetModel() {
        if (this.fighterJetModel) return this.fighterJetModel;

        const jetConfig = CONFIG.FIGHTER_JET_POWERUP;
        if (!jetConfig?.file) return null;

        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${jetConfig.file}`);
            this.fighterJetModel = gltf.scene;

            this.fighterJetModel.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });

            console.log('Fighter jet power-up loaded:', jetConfig.file);
            return this.fighterJetModel;
        } catch (err) {
            console.error('Failed to load fighter jet power-up:', err);
            return null;
        }
    }

    async spawnFighterJet(lane, spawnZ) {
        const jetConfig = CONFIG.FIGHTER_JET_POWERUP || {};
        const model = await this.loadFighterJetModel();
        if (!model) return false;

        const jet = model.clone(true);
        const scale = jetConfig.pickupScale || jetConfig.scale || 0.35;
        jet.scale.set(scale, scale, scale);
        jet.rotation.y = jetConfig.rotationY ?? Math.PI;
        jet.position.set(lane, jetConfig.pickupY ?? 1.4, spawnZ);
        jet.userData = { type: 'fighterJet' };

        this.scene.add(jet);
        this.collectibles.push(jet);
        return true;
    }

    activateFighterJet(player) {
        const jetConfig = CONFIG.FIGHTER_JET_POWERUP || {};

        this.deactivateFighterJet();
        this.fighterJetActive = true;
        this.fighterJetTimer = jetConfig.duration || 10;

        if (this.fighterJetModel) {
            this.activeFighterJet = this.fighterJetModel.clone(true);
            const scale = jetConfig.activeScale || jetConfig.scale || 0.35;
            this.activeFighterJet.scale.set(scale, scale, scale);
            this.activeFighterJet.rotation.y = jetConfig.rotationY ?? Math.PI;
            this.activeFighterJet.userData.isActiveFighterJet = true;
            this.scene.add(this.activeFighterJet);
            this.updateFighterJetFollow(player, 1);
        }
    }

    deactivateFighterJet() {
        this.fighterJetActive = false;
        this.fighterJetTimer = 0;

        if (this.activeFighterJet) {
            this.scene.remove(this.activeFighterJet);
            this.activeFighterJet = null;
        }
    }

    clearFighterJetShots() {
        this.fighterJetShots.forEach(shot => this.scene.remove(shot));
        this.fighterJetShots = [];
    }

    updateFighterJetFollow(player, delta) {
        if (!this.activeFighterJet) return;

        const jetConfig = CONFIG.FIGHTER_JET_POWERUP || {};
        const pX = this.getPlayerLaneX(player);
        const pY = player.group.position.y;
        const pZ = player.group.position.z;

        const target = new THREE.Vector3(
            pX + (jetConfig.followOffsetX || 1.6),
            pY + (jetConfig.followOffsetY || 2.1),
            pZ + (jetConfig.followOffsetZ || 0.5)
        );

        this.activeFighterJet.position.lerp(target, Math.min(10 * delta, 1));
        this.activeFighterJet.rotation.z = Math.sin(Date.now() * 0.008) * 0.08;
    }

    shootFighterJet(player) {
        if (!this.fighterJetActive) return false;

        const jetConfig = CONFIG.FIGHTER_JET_POWERUP || {};
        const pX = this.getPlayerLaneX(player);
        const pZ = player.group.position.z;
        const laneX = CONFIG.LANES.reduce((closest, lane) => (
            Math.abs(lane - pX) < Math.abs(closest - pX) ? lane : closest
        ), CONFIG.LANES[1] || 0);
        const shotLength = jetConfig.shotLength || 55;
        const forwardOffset = jetConfig.shotForwardOffset || 2.4;
        const start = this.activeFighterJet
            ? new THREE.Vector3(
                this.activeFighterJet.position.x,
                this.activeFighterJet.position.y,
                Math.min(this.activeFighterJet.position.z, pZ) - forwardOffset
            )
            : new THREE.Vector3(
                pX + (jetConfig.followOffsetX || 1.6),
                player.group.position.y + (jetConfig.followOffsetY || 3.0),
                pZ - forwardOffset
            );
        const end = new THREE.Vector3(laneX, start.y, start.z - shotLength);
        const direction = new THREE.Vector3().subVectors(end, start);
        const visualLength = direction.length();

        const shot = new THREE.Mesh(
            new THREE.CylinderGeometry(
                jetConfig.shotRadius || 0.08,
                jetConfig.shotRadius || 0.08,
                visualLength,
                12
            ),
            new THREE.MeshBasicMaterial({
                color: jetConfig.shotColor || 0xffd400,
                transparent: true,
                opacity: 0.9
            })
        );

        shot.position.copy(start).add(end).multiplyScalar(0.5);
        shot.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );
        shot.userData = {
            type: 'fighterJetShot',
            ttl: jetConfig.shotDuration || 0.22
        };

        this.scene.add(shot);
        this.fighterJetShots.push(shot);
        this.clearObstaclesInShot(laneX, start.z, end.z);
        return true;
    }

    clearObstaclesInShot(laneX, startZ, endZ) {
        const jetConfig = CONFIG.FIGHTER_JET_POWERUP || {};
        const minZ = Math.min(startZ, endZ);
        const maxZ = Math.max(startZ, endZ);

        this.obstacles = this.obstacles.filter(o => {
            if (o.userData.isAnimal || o.userData.type === 'elk') {
                return true;
            }

            if (o.userData.type === 'turn' || o.userData.type === 'portal' || o.userData.type === 'river') {
                return true;
            }

            const dx = Math.abs(o.position.x - laneX);
            const inZ = o.position.z <= maxZ + (jetConfig.obstacleClearZ || 2.2) &&
                o.position.z >= minZ - (jetConfig.obstacleClearZ || 2.2);

            if (dx < (jetConfig.obstacleClearX || 1.8) && inZ) {
                this.scene.remove(o);
                return false;
            }

            return true;
        });
    }

    clearObjectsNearZ(centerZ, behind = 120, ahead = 35) {
        const isInClearZone = (object) => {
            const z = object.position?.z ?? 0;
            return z <= centerZ + ahead && z >= centerZ - behind;
        };

        this.obstacles = this.obstacles.filter((object) => {
            if (isInClearZone(object)) {
                this.scene.remove(object);
                if (object === this.activeTurnWall) {
                    this.activeTurnWall = null;
                }
                return false;
            }

            return true;
        });

        this.collectibles = this.collectibles.filter((object) => {
            if (isInClearZone(object)) {
                this.scene.remove(object);
                return false;
            }

            return true;
        });

        this.portals = this.portals.filter((object) => {
            if (isInClearZone(object)) {
                this.scene.remove(object);
                return false;
            }

            return true;
        });
    }

    // async spawn(score, playerZ) {
    //     if (this.activeTurnWall) return;

    //     const lane = CONFIG.LANES[Math.floor(Math.random() * CONFIG.LANES.length)];
    //     const type = Math.random();
    //     const spawnZ = playerZ - 60;

    //     if (type < 0.05 && score > 1500) {
    //         const portal = this.createSeasonPortal(spawnZ);

    //         portal.userData = { type: 'portal' };

    //         this.scene.add(portal);
    //         this.portals.push(portal);
    //     }
    //     else if (type > 0.85 && score > 500) {
    //         const dir = Math.random() > 0.5 ? 'left' : 'right';
    //         const turnZ = playerZ - CONFIG.TURN_DISTANCE;

    //         const turnMarker = new THREE.Group();
    //         turnMarker.position.set(0, 0, turnZ);
    //         turnMarker.userData = { type: 'turn', dir };

    //         this.scene.add(turnMarker);
    //         this.obstacles.push(turnMarker);
    //         this.activeTurnWall = turnMarker;

    //         this.env.createTurnSection(turnZ, dir);
    //     }
    //     else if (type > 0.7 && type <= 0.85) {
    //         const river = new THREE.Mesh(
    //             new THREE.BoxGeometry(30, 0.2, 5),
    //             this.waterMat
    //         );
    //         river.position.set(0, 0.1, spawnZ);
    //         river.userData = { type: 'river' };

    //         this.scene.add(river);
    //         this.obstacles.push(river);
    //     }
    //     else if (type < 0.45) {
    //         const coin = new THREE.Mesh(
    //             new THREE.TorusGeometry(0.4, 0.1, 8, 16),
    //             this.coinMat
    //         );
    //         coin.position.set(lane, 1.5, spawnZ);
    //         coin.userData = { type: 'coin' };

    //         this.scene.add(coin);
    //         this.collectibles.push(coin);
    //     }
    //     else {
    //         await this.spawnObstacle(lane, spawnZ);
    //     }
    // }

    async spawn(score, playerZ) {
        if (this.env.activeBridge) return;

        if (this.forceSpawnSeasonPortal && this.portals.length === 0) {
            const portal = this.createSeasonPortal(playerZ - 45);
            this.scene.add(portal);
            this.portals.push(portal);
            this.forceSpawnSeasonPortal = false;
            return;
        }
        
        if (this.activeTurnWall) return;

        const lane = CONFIG.LANES[Math.floor(Math.random() * CONFIG.LANES.length)];
        const type = Math.random();
        const spawnZ = playerZ - 100;
        const magnetConfig = CONFIG.MAGNET_POWERUP || {};
        const jetConfig = CONFIG.FIGHTER_JET_POWERUP || {};

        if (type > 0.95 && score > 1000) {
            const dir = Math.random() > 0.5 ? 'left' : 'right';
            const turnZ = playerZ - CONFIG.TURN_DISTANCE;

            this.clearObjectsNearZ(turnZ);

            const turnMarker = new THREE.Group();
            turnMarker.position.set(0, 0, turnZ);
            turnMarker.userData = { type: 'turn', dir };

            this.scene.add(turnMarker);
            this.obstacles.push(turnMarker);
            this.activeTurnWall = turnMarker;

            this.env.createTurnSection(turnZ, dir);
        }
        else if (
            type > 0.45 &&
            type <= 0.45 + (magnetConfig.spawnChance || 0) &&
            score > (magnetConfig.minScore || 0)
        ) {
            await this.spawnMagnet(lane, spawnZ);
        }
        else if (
            type > 0.45 + (magnetConfig.spawnChance || 0) &&
            type <= 0.45 + (magnetConfig.spawnChance || 0) + (jetConfig.spawnChance || 0) &&
            score > (jetConfig.minScore || 0)
        ) {
            await this.spawnFighterJet(lane, spawnZ);
        }
        else if (type > 0.7 && type <= 0.85) {
            const roadWidth = CONFIG.ROAD_WIDTH || 14;
            const currentSeason = CONFIG.SEASONS[this.env.currentSeasonIndex];
            
            // Lấy màu bg của mùa hè (season index 1) làm màu nước
            const summerBgColor = CONFIG.SEASONS[1].bgColor;
            // River material - bằng với lane
            let riverMat;
            if (currentSeason.id === 'winter') {
                // Mùa đông: đóng băng
                riverMat = new THREE.MeshStandardMaterial({
                    color: 0xADD8E6,
                    roughness: 0.95,
                    metalness: 0.3,
                    transparent: true,
                    opacity: 0.85
                });
            } else {
                // Xuân, Hè, Thu: dùng texture nước động
                riverMat = new THREE.MeshStandardMaterial({
                    map: this.riverTexture,
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide
                });
            }
            
            const riverHeight = currentSeason.id === 'winter' ? 0.1 : 0.08;
            const riverY = riverHeight / 2;  // Đặt bằng với mặt đất
            
            const river = new THREE.Mesh(
                new THREE.BoxGeometry(roadWidth, riverHeight, 5),
                riverMat
            );
            river.position.set(0, riverY, spawnZ);
            river.receiveShadow = true;
            river.userData = { type: 'river', isIce: currentSeason.id === 'winter', hasWave: currentSeason.id !== 'winter' };

            this.scene.add(river);
            this.obstacles.push(river);
        }
        else if (type < 0.45) {
            if (Math.random() < (CONFIG.COIN_LINE?.chance || 0)) {
                this.spawnCoinLine(lane, spawnZ);
            } else {
                this.spawnCoin(lane, spawnZ);
            }
        }
        else {
            await this.spawnObstacle(lane, spawnZ);
        }
    }

    createSeasonPortal(spawnZ) {
        const nextSeason = this.env.getNextSeason
            ? this.env.getNextSeason()
            : CONFIG.SEASONS[(this.env.currentSeasonIndex + 1) % CONFIG.SEASONS.length];

        const portalGroup = new THREE.Group();

        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.8
        });

        const ringMat = new THREE.MeshStandardMaterial({
            color: nextSeason.portalColor,
            emissive: nextSeason.portalColor,
            emissiveIntensity: 2.5,
            metalness: 0.2,
            roughness: 0.2
        });

        const coreMat = new THREE.MeshBasicMaterial({
            color: nextSeason.portalColor,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        const leftPillar = new THREE.Mesh(
            new THREE.BoxGeometry(1, 10, 1),
            pillarMat
        );
        leftPillar.position.set(-3.5, 5, 0);
        leftPillar.castShadow = true;
        leftPillar.receiveShadow = true;

        const rightPillar = new THREE.Mesh(
            new THREE.BoxGeometry(1, 10, 1),
            pillarMat
        );
        rightPillar.position.set(3.5, 5, 0);
        rightPillar.castShadow = true;
        rightPillar.receiveShadow = true;

        const topBar = new THREE.Mesh(
            new THREE.BoxGeometry(8, 1, 1),
            pillarMat
        );
        topBar.position.set(0, 10, 0);
        topBar.castShadow = true;
        topBar.receiveShadow = true;

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(3, 0.4, 16, 64),
            ringMat
        );
        ring.position.set(0, 5, 0);

        const core = new THREE.Mesh(
            new THREE.PlaneGeometry(5.5, 5.5),
            coreMat
        );
        core.position.set(0, 5, -0.15);

        portalGroup.add(leftPillar, rightPillar, topBar, ring, core);
        portalGroup.position.set(0, 0, spawnZ);

        portalGroup.userData = {
            type: 'portal',
            nextSeasonId: nextSeason.id,
            ring,
            core
        };

        return portalGroup;
    }

    clearWorld() {
        this.obstacles.forEach(o => this.scene.remove(o));
        this.collectibles.forEach(c => this.scene.remove(c));
        this.portals.forEach(p => this.scene.remove(p));

        this.obstacles = [];
        this.collectibles = [];
        this.portals = [];
        this.activeTurnWall = null;
        this.shieldActive = false;  // Reset shield
        this.deactivateMagnet();
        this.deactivateFighterJet();
        this.clearFighterJetShots();
    }

    setShield(active) {
        this.shieldActive = active;
    }

    isShieldActive() {
        return this.shieldActive;
    }

    update(speed, player, onCoinAdd, onDeath, onSeasonChange, delta = 0) {
        // Cập nhật texture nước động
        this.updateRiverTexture();
        
        const pX = this.getPlayerLaneX(player);
        const pY = player.group.position.y;
        const pZ = player.group.position.z;

        if (this.magnetActive) {
            this.magnetTimer -= delta;
            this.updateMagnetAura(player);

            if (this.magnetTimer <= 0) {
                this.deactivateMagnet();
            }
        }

        if (this.fighterJetActive) {
            this.fighterJetTimer -= delta;
            this.updateFighterJetFollow(player, delta);

            if (this.fighterJetTimer <= 0) {
                this.deactivateFighterJet();
            }
        }

        for (let i = this.fighterJetShots.length - 1; i >= 0; i--) {
            const shot = this.fighterJetShots[i];
            shot.userData.ttl -= delta;
            shot.material.opacity = Math.max(shot.userData.ttl / (CONFIG.FIGHTER_JET_POWERUP?.shotDuration || 0.22), 0);

            if (shot.userData.ttl <= 0) {
                this.scene.remove(shot);
                this.fighterJetShots.splice(i, 1);
            }
        }

        for (let i = this.portals.length - 1; i >= 0; i--) {
            const p = this.portals[i];
            p.rotation.y += 0.05;

            if (Math.abs(p.position.z - pZ) < 2) {
                onSeasonChange();
                this.scene.remove(p);
                this.portals.splice(i, 1);
            } else if (p.position.z > pZ + 20) {
                this.scene.remove(p);
                this.portals.splice(i, 1);
            }
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            const dx = Math.abs(o.position.x - pX);
            const dz = Math.abs(o.position.z - pZ);

            if (o.userData.type === 'river' && o.userData.hasWave) {
                // Animation gợn sóng cho suối
                o.userData.waveTime = (o.userData.waveTime || 0) + 0.05;
                o.position.y = 0.04 + Math.sin(o.userData.waveTime) * 0.02;
                
                // Mùa đông: đóng băng, player có thể chạy qua
                // Các mùa khác: rơi xuống suối nếu không nhảy (shield bảo vệ được)
                const currentSeason = CONFIG.SEASONS[this.env.currentSeasonIndex];
                if (!this.shieldActive && currentSeason.id !== 'winter' && dz < 2.5 && pY < 0.5) {
                    onDeath("BẠN ĐÃ RƠI XUỐNG SUỐI!");
                }
            }
            else if (o.userData.type === 'turn') {
                // Để main.js hoặc logic khác xử lý việc player có rẽ đúng hay không
            }
            else {
                // Shield bảo vệ khỏi tất cả chướng ngại vật
                if (!this.shieldActive && dx < 1.8 && dz < 1.5) {
                    if (o.userData.type === 'low' && pY < 1.2) {
                        onDeath("VẤP CHƯỚNG NGẠI VẬT!");
                    } else if (o.userData.type === 'high' && !player.isSliding) {
                        onDeath("ĐỤNG CHƯỚNG NGẠI VẬT!");
                    }
                }
            }

            if (o.position.z > pZ + 20) {
                this.scene.remove(o);
                this.obstacles.splice(i, 1);

                if (o === this.activeTurnWall) {
                    this.activeTurnWall = null;
                }
            }
        }

        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const c = this.collectibles[i];
            c.rotation.y += 0.1;

            if (c.userData.type === 'coin' && this.magnetActive) {
                const dx = c.position.x - pX;
                const dz = c.position.z - pZ;
                const distance = Math.sqrt(dx * dx + dz * dz);
                const magnetConfig = CONFIG.MAGNET_POWERUP || {};

                if (distance < (magnetConfig.attractionRadius || 16)) {
                    const target = new THREE.Vector3(pX, pY + 1.2, pZ);
                    c.position.lerp(target, Math.min((magnetConfig.attractionSpeed || 18) * delta, 1));
                }
            }

            const collectDistance = c.userData.type === 'coin' && this.magnetActive
                ? (CONFIG.MAGNET_POWERUP?.collectDistance || 1.1)
                : 1.5;

            if (Math.abs(c.position.x - pX) < collectDistance && Math.abs(c.position.z - pZ) < collectDistance) {
                if (c.userData.type === 'magnet') {
                    this.activateMagnet(player);
                } else if (c.userData.type === 'fighterJet') {
                    this.activateFighterJet(player);
                } else {
                    onCoinAdd();
                }

                this.scene.remove(c);
                this.collectibles.splice(i, 1);
            } else if (c.position.z > pZ + 20) {
                this.scene.remove(c);
                this.collectibles.splice(i, 1);
            }
        }
    }
}
