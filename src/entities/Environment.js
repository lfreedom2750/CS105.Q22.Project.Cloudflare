import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class Environment {
    constructor(scene, hemiLight, sunLight) {
        this.scene = scene;
        this.hemiLight = hemiLight;
        this.sunLight = sunLight;

        this.currentSeasonIndex = 0;

        this.floorTiles = [];
        this.trees = [];
        this.lamps = [];

        this.tileLength = CONFIG.TILE_LENGTH || 50;
        this.treeSpacing = 20;
        this.treeModel = null;
        this.lampModel = null;
        this.lampSpacing = CONFIG.STREET_LAMP?.spacing || 80;

        this.bridgeModel = null;
        this.activeBridge = null;
        this.defaultHemiIntensity = hemiLight?.intensity ?? 1.2;
        this.defaultSunIntensity = sunLight?.intensity ?? 1.5;
        this.turnSectionActive = false;

        // Load texture đường cho từng mùa
        this.roadTextures = CONFIG.SEASONS.map((season, index) => {
            console.log(`Loading texture ${index}: ${CONFIG.PATH_ASSETS}${season.roadTexture}`);
            const loader = new THREE.TextureLoader();
            const tex = loader.load(`${CONFIG.PATH_ASSETS}${season.roadTexture}`,
                undefined, undefined,
                (err) => console.error(`FAILED loading texture: ${season.roadTexture}`, err)
            );
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            // Texture 768x768, tile 14x50 -> repeat theo tỷ lệ
            const tileWidth = 14;
            const tileLength = this.tileLength || 50;
            tex.repeat.set(1, tileLength / 10); // Điều chỉnh theo ý muốn
            tex.anisotropy = 16;
            return tex;
        });

        // Material mặt đường theo mùa
        this.groundMats = {};
        CONFIG.SEASONS.forEach((season, index) => {
            this.groundMats[season.id] = new THREE.MeshStandardMaterial({
                map: this.roadTextures[index],
                color: 0xffffff,
                roughness: 0.8
            });
        });

        // Material cây code tay
        this.trunkMat = new THREE.MeshStandardMaterial({
            color: 0x331a00,
            roughness: 1
        });

        this.treeFoliageMats = {
            spring: new THREE.MeshStandardMaterial({ color: 0xffb7d5, roughness: 1 }),
            summer: new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 1 }),
            autumn: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 1 }),
            winter: new THREE.MeshStandardMaterial({ color: 0xe5f3ff, roughness: 1 })
        };

        // chỉ init ground trước
        this.initGround();
    }

    getCurrentSeason() {
        return CONFIG.SEASONS[this.currentSeasonIndex];
    }

    getCurrentSeasonId() {
        return this.getCurrentSeason().id;
    }

    getCurrentGroundMat() {
        return this.groundMats[this.getCurrentSeasonId()];
    }

    getNextSeasonIndex() {
        return (this.currentSeasonIndex + 1) % CONFIG.SEASONS.length;
    }

    getNextSeason() {
        return CONFIG.SEASONS[this.getNextSeasonIndex()];
    }

    applySeasonLighting() {
        const season = this.getCurrentSeason();

        if (this.hemiLight) {
            this.hemiLight.color.copy(season.hemiLightColor);
            this.hemiLight.intensity = season.id === 'autumn' ? 0.45 : this.defaultHemiIntensity;
        }

        if (this.sunLight) {
            this.sunLight.intensity = season.id === 'autumn' ? 0.35 : this.defaultSunIntensity;
        }
    }

    async loadBridgeModel() {
        if (this.bridgeModel) return;

        console.log('=== LOADING BRIDGE MODEL ===');
        console.log('File:', `${CONFIG.PATH_ASSETS}${CONFIG.BRIDGE.file}`);

        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${CONFIG.BRIDGE.file}`);
            this.bridgeModel = gltf.scene;
            console.log('Bridge model loaded OK');
            
            this.bridgeModel.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
        } catch (err) {
            console.error('=== ERROR LOADING BRIDGE MODEL ===');
            console.error(err);
        }
    }

    async spawnBridgeSegment(z) {
    if (this.activeBridge) return;

    await this.loadBridgeModel();

    const bridge = this.bridgeModel.clone(true);
    bridge.scale.set(
        CONFIG.BRIDGE.scale,
        CONFIG.BRIDGE.scale,
        CONFIG.BRIDGE.scale
    );

    bridge.traverse(c => {
        if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
        }
    });

    const box = new THREE.Box3().setFromObject(bridge);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    console.log('=== BRIDGE DEBUG ===');
    console.log('SIZE:', size);
    console.log('CENTER:', center);
    console.log('MIN Y:', box.min.y);
    console.log('MAX Y:', box.max.y);

    // đưa về giữa X/Z
    bridge.position.x -= center.x;
    bridge.position.z -= center.z;

    // đưa đáy về 0 trước
    bridge.position.y -= box.min.y;

    // rồi hạ thêm bằng offset tay
    bridge.position.y += CONFIG.BRIDGE.modelOffsetY;

    // đặt ra vị trí thật
    bridge.position.z += z;

    this.scene.add(bridge);

    const bridgeRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(CONFIG.ROAD_WIDTH || 14, CONFIG.BRIDGE.length),
        this.getCurrentGroundMat()
    );
    bridgeRoad.rotation.x = -Math.PI / 2;
    bridgeRoad.position.set(0, 0.05, z);
    bridgeRoad.receiveShadow = true;
    bridgeRoad.userData.isBridgeRoad = true;

    this.scene.add(bridgeRoad);

    this.activeBridge = {
        model: bridge,
        road: bridgeRoad,
        startZ: z + CONFIG.BRIDGE.length / 2,
        endZ: z - CONFIG.BRIDGE.length / 2
    };
    }

    getBridgeHeightAt(playerZ) {
        if (!this.activeBridge) return 0;

        const { startZ, endZ } = this.activeBridge;

        if (playerZ <= startZ && playerZ >= endZ) {
            return CONFIG.BRIDGE.roadY;
        }

        return 0;
    }

    async loadTreeModelForSeason() {
        const season = this.getCurrentSeason();

        // nếu mùa này không có treeModel thì fallback sang cây code tay
        if (!season.treeModel) {
            this.treeModel = null;
            return;
        }

        console.log('=== LOADING TREE MODEL ===');
        console.log('Season:', season.id);
        console.log('File:', `${CONFIG.PATH_ASSETS}${season.treeModel}`);

        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${season.treeModel}`);

            this.treeModel = gltf.scene;
            console.log('Tree model loaded OK');
        } catch (err) {
            console.error('=== ERROR LOADING TREE MODEL ===');
            console.error(err);
            this.treeModel = null;
        }
    }

    normalizeModelToGround(root) {
        const box = new THREE.Box3().setFromObject(root);
        const center = new THREE.Vector3();

        box.getCenter(center);
        root.position.x -= center.x;
        root.position.z -= center.z;
        root.position.y -= box.min.y;
    }

    async loadLampModel() {
        if (this.lampModel) return;

        const lampConfig = CONFIG.STREET_LAMP;
        if (!lampConfig?.file) return;

        console.log('=== LOADING STREET LAMP MODEL ===');
        console.log('File:', `${CONFIG.PATH_ASSETS}${lampConfig.file}`);

        try {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${lampConfig.file}`);

            this.lampModel = gltf.scene;

            const box = new THREE.Box3().setFromObject(this.lampModel);
            const size = new THREE.Vector3();
            box.getSize(size);

            if (lampConfig.targetHeight && size.y > 0) {
                this.lampModel.scale.setScalar(lampConfig.targetHeight / size.y);
            } else {
                const scale = lampConfig.scale || 1;
                this.lampModel.scale.set(scale, scale, scale);
            }

            this.normalizeModelToGround(this.lampModel);

            this.lampModel.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });

            console.log('Street lamp model loaded OK');
        } catch (err) {
            console.error('=== ERROR LOADING STREET LAMP MODEL ===');
            console.error(err);
            this.lampModel = null;
        }
    }

    createTree() {
        let tree;
        const season = this.getCurrentSeason();
        const seasonId = season.id;

        if (this.treeModel) {
            tree = this.treeModel.clone(true);

            const scale = season.treeScale || 0.3;
            tree.scale.set(scale, scale, scale);

            // random nhẹ cho tự nhiên
            const rand = 0.9 + Math.random() * 0.2;
            tree.scale.multiplyScalar(rand);
            tree.rotation.y = Math.random() * Math.PI * 2;

            tree.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
        } else {
            tree = new THREE.Group();

            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.3, 2, 8),
                this.trunkMat
            );
            trunk.position.y = 1;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            tree.add(trunk);

            const foliage = new THREE.Mesh(
                new THREE.ConeGeometry(1.5, 4, 12),
                this.treeFoliageMats[seasonId]
            );
            foliage.position.y = 3.5;
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            foliage.userData.isFoliage = true;
            tree.add(foliage);

            tree.rotation.y = Math.random() * Math.PI * 2;
        }

        return tree;
    }

    initGround() {
        this.floorTiles.forEach(t => this.scene.remove(t));
        this.floorTiles = [];
        this.turnSectionActive = false;

        const groundMat = this.getCurrentGroundMat();
        const roadWidth = CONFIG.ROAD_WIDTH || 14;

        for (let i = -1; i < 10; i++) {
            const z = i * -this.tileLength;
            const geo = new THREE.PlaneGeometry(roadWidth, this.tileLength);
            const tile = new THREE.Mesh(geo, groundMat);

            tile.rotation.x = -Math.PI / 2;
            tile.position.set(0, 0, z);
            tile.receiveShadow = true;

            this.scene.add(tile);
            this.floorTiles.push(tile);
        }
    }

    createNewTile(z, isTurn = false) {
        const roadWidth = CONFIG.ROAD_WIDTH || 14;
        const width = isTurn ? 150 : roadWidth;
        const geo = new THREE.PlaneGeometry(width, this.tileLength);
        const tile = new THREE.Mesh(geo, this.getCurrentGroundMat());

        tile.rotation.x = -Math.PI / 2;
        tile.position.set(0, 0, z);
        tile.receiveShadow = true;
        tile.userData.isTurn = isTurn;

        this.scene.add(tile);
        this.floorTiles.push(tile);
    }

    createTurnSection(z, dir) {
        const groundMat = this.getCurrentGroundMat();
        const roadWidth = CONFIG.ROAD_WIDTH || 14;
        const tileLength = this.tileLength || 50;
        this.turnSectionActive = true;

        // Xóa đoạn đường thẳng phía trước ngã rẽ (xóa hết)
        this.floorTiles = this.floorTiles.filter(tile => {
            if (!tile.userData.isTurnVisual && !tile.userData.isTurn) {
                if (tile.position.z < z + roadWidth) {
                    this.scene.remove(tile);
                    return false;
                }
            }
            return true;
        });

        // Xóa hết cây phía trước điểm rẽ
        this.trees = this.trees.filter(tree => {
            if (tree.position.z < z + roadWidth) {
                this.scene.remove(tree);
                return false;
            }
            return true;
        });

        this.lamps = this.lamps.filter(lamp => {
            if (lamp.position.z < z + roadWidth) {
                this.scene.remove(lamp);
                return false;
            }
            return true;
        });

        const side = dir === 'left' ? -1 : 1;

        // Mép trên của đường thẳng = z (điểm bắt đầu rẽ)
        // Tile đường thẳng đặt tại mép này, kéo dài về phía player (Z lớn hơn)
        const straightStartZ = z;

        // 1. Thêm tile đường thẳng tại mép điểm rẽ
        const straightTile = new THREE.Mesh(
            new THREE.PlaneGeometry(roadWidth, roadWidth),
            groundMat
        );
        straightTile.rotation.x = -Math.PI / 2;
        straightTile.position.set(0, 0, straightStartZ - roadWidth / 2);
        straightTile.receiveShadow = true;
        straightTile.userData.isTurnVisual = true;
        this.scene.add(straightTile);
        this.floorTiles.push(straightTile);

        // 2. Miếng góc vuông tại điểm rẽ
        const cornerTile = new THREE.Mesh(
            new THREE.PlaneGeometry(roadWidth, roadWidth),
            groundMat
        );
        cornerTile.rotation.x = -Math.PI / 2;
        cornerTile.position.set(side * roadWidth / 2, 0, straightStartZ - roadWidth / 2);
        cornerTile.receiveShadow = true;
        cornerTile.userData.isTurnVisual = true;
        this.scene.add(cornerTile);
        this.floorTiles.push(cornerTile);

        // 3. Đoạn đường đi thẳng theo chiều ngang
        for (let i = 1; i <= 6; i++) {
            const tile = new THREE.Mesh(
                new THREE.PlaneGeometry(roadWidth, roadWidth),
                groundMat
            );

            tile.rotation.x = -Math.PI / 2;
            tile.position.set(side * (roadWidth / 2 + i * roadWidth), 0, straightStartZ - roadWidth / 2);
            tile.receiveShadow = true;
            tile.userData.isTurnVisual = true;

            this.scene.add(tile);
            this.floorTiles.push(tile);
        }
    }

    initTrees() {
        this.trees.forEach(t => this.scene.remove(t));
        this.trees = [];

        const totalRows = 40;
        const roadEdge = (CONFIG.ROAD_WIDTH || 14) / 2;

        for (let i = 0; i < totalRows; i++) {
            const z = -i * this.treeSpacing;

            // Đặt cây bên trong mép đường
            const leftTree = this.createTree();
            leftTree.position.set(-roadEdge + 0.8, 0, z);
            this.scene.add(leftTree);
            this.trees.push(leftTree);

            const rightTree = this.createTree();
            rightTree.position.set(roadEdge - 0.8, 0, z);
            this.scene.add(rightTree);
            this.trees.push(rightTree);
        }
    }

    createLamp(side) {
        if (!this.lampModel) return null;

        const lampConfig = CONFIG.STREET_LAMP || {};
        const lamp = this.lampModel.clone(true);
        lamp.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;

        lamp.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });

        const lightColor = lampConfig.lightColor || 0xff9a3d;
        const lightHeight = lampConfig.lightHeight || 5.3;

        const spotTarget = new THREE.Object3D();
        spotTarget.position.set(0, 0, side < 0 ? -1.5 : 1.5);
        lamp.add(spotTarget);

        const glow = new THREE.SpotLight(
            lightColor,
            lampConfig.lightIntensity || 8,
            lampConfig.lightDistance || 30,
            lampConfig.lightAngle || Math.PI * 0.28,
            lampConfig.lightPenumbra ?? 0.5,
            1.2
        );
        glow.position.set(0, lightHeight, 0);
        glow.target = spotTarget;
        glow.castShadow = false;
        lamp.add(glow);

        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(lampConfig.bulbSize || 0.18, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0xffd19a,
                emissive: lightColor,
                emissiveIntensity: 2.5,
                roughness: 0.25
            })
        );
        bulb.position.copy(glow.position);
        bulb.userData.isLampBulb = true;
        lamp.add(bulb);

        const pool = new THREE.Mesh(
            new THREE.CircleGeometry(lampConfig.poolRadius || 3.2, 32),
            new THREE.MeshBasicMaterial({
                color: lightColor,
                transparent: true,
                opacity: lampConfig.poolOpacity ?? 0.28,
                depthWrite: false,
                side: THREE.DoubleSide
            })
        );
        pool.rotation.x = -Math.PI / 2;
        pool.scale.set(0.75, 1.35, 1);
        pool.position.set(0, 0.035, side < 0 ? -0.7 : 0.7);
        pool.renderOrder = 1;
        lamp.add(pool);

        return lamp;
    }

    clearLamps() {
        this.lamps.forEach(l => this.scene.remove(l));
        this.lamps = [];
    }

    async initLampsForSeason() {
        this.clearLamps();

        const season = this.getCurrentSeason();
        if (season.id !== 'autumn') return;

        await this.loadLampModel();
        if (!this.lampModel) return;

        const lampConfig = CONFIG.STREET_LAMP || {};
        const rows = lampConfig.rows || 12;
        const spacing = lampConfig.spacing || this.lampSpacing;
        const startOffset = lampConfig.startOffset || 0;
        const roadEdge = (CONFIG.ROAD_WIDTH || 14) / 2;
        const offset = lampConfig.offsetFromRoad || 1.2;

        for (let i = 0; i < rows; i++) {
            const z = -startOffset - i * spacing;

            const leftLamp = this.createLamp(-1);
            if (leftLamp) {
                leftLamp.position.set(-roadEdge + offset, 0, z);
                this.scene.add(leftLamp);
                this.lamps.push(leftLamp);
            }

            const rightLamp = this.createLamp(1);
            if (rightLamp) {
                rightLamp.position.set(roadEdge - offset, 0, z);
                this.scene.add(rightLamp);
                this.lamps.push(rightLamp);
            }
        }
    }

    async init() {
        const season = this.getCurrentSeason();

        this.scene.background = season.bgColor;
        if (this.scene.fog) this.scene.fog.color.copy(season.fogColor);
        this.applySeasonLighting();

        await this.loadTreeModelForSeason();
        this.initGround();
        this.initTrees();
        await this.initLampsForSeason();
    }

    // async triggerSeasonChange() {
    //     this.currentSeasonIndex = (this.currentSeasonIndex + 1) % CONFIG.SEASONS.length;
    //     const season = this.getCurrentSeason();

    //     this.scene.background = season.bgColor;
    //     if (this.scene.fog) this.scene.fog.color.copy(season.fogColor);
    //     this.hemiLight.color.copy(season.hemiLightColor);

    //     const newGroundMat = this.getCurrentGroundMat();
    //     this.floorTiles.forEach(tile => {
    //         tile.material = newGroundMat;
    //     });

    //     await this.loadTreeModelForSeason();
    //     this.initTrees();
    // }

    // async triggerSeasonChange() {
    //     const nextIndex = (this.currentSeasonIndex + 1) % CONFIG.SEASONS.length;
    //     const nextSeason = CONFIG.SEASONS[nextIndex];

    //     // load trước
    //     let nextTreeModel = null;

    //     if (nextSeason.treeModel) {
    //         const loader = new GLTFLoader();
    //         const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${nextSeason.treeModel}`);
    //         nextTreeModel = gltf.scene;
    //         nextTreeModel.traverse(c => {
    //             if (c.isMesh) {
    //                 c.castShadow = true;
    //                 c.receiveShadow = true;
    //             }
    //         });
    //     }

    //     // chỉ commit khi mọi thứ OK
    //     this.currentSeasonIndex = nextIndex;
    //     this.treeModel = nextTreeModel;

    //     this.scene.background = nextSeason.bgColor;
    //     if (this.scene.fog) this.scene.fog.color.copy(nextSeason.fogColor);
    //     this.hemiLight.color.copy(nextSeason.hemiLightColor);

    //     const newGroundMat = this.getCurrentGroundMat();
    //     this.floorTiles.forEach(tile => {
    //         tile.material = newGroundMat;
    //     });

    //     this.initTrees();
    // }

    async triggerSeasonChange() {
        const oldSeason = CONFIG.SEASONS[this.currentSeasonIndex].id;
        const nextIndex = (this.currentSeasonIndex + 1) % CONFIG.SEASONS.length;
        const nextSeason = CONFIG.SEASONS[nextIndex];

        console.log('Chuyển mùa:', oldSeason, '->', nextSeason.id);
        console.log('roadTexture:', nextSeason.roadTexture);
        console.log('treeModel:', nextSeason.treeModel);

        this.currentSeasonIndex = nextIndex;

        this.scene.background = nextSeason.bgColor;
        if (this.scene.fog) this.scene.fog.color.copy(nextSeason.fogColor);
        this.applySeasonLighting();

        const newGroundMat = this.getCurrentGroundMat();
        this.floorTiles.forEach(tile => {
            tile.material = newGroundMat;
        });

        await this.loadTreeModelForSeason();
        this.initTrees();
        await this.initLampsForSeason();
    }

    update(speed, playerZ) {
        if (!this.turnSectionActive) {
            this.floorTiles.forEach(tile => {
                if (tile.position.z > playerZ + this.tileLength) {
                    let minZ = 0;
                    this.floorTiles.forEach(t => {
                        if (t.position.z < minZ) minZ = t.position.z;
                    });
                    tile.position.z = minZ - this.tileLength;
                }
            });
        }

        if (!this.turnSectionActive) {
            this.trees.forEach(tree => {
                if (tree.position.z > playerZ + 30) {
                    let farthestZ = playerZ;
                    this.trees.forEach(t => {
                        if (t.position.z < farthestZ) farthestZ = t.position.z;
                    });

                    tree.position.z = farthestZ - this.treeSpacing;
                    const roadEdge = (CONFIG.ROAD_WIDTH || 14) / 2;
                    const isLeftTree = tree.position.x < 0;
                    tree.position.x = isLeftTree
                        ? -roadEdge + 0.8
                        : roadEdge - 0.8;
                }
            });

            this.lamps.forEach(lamp => {
                if (lamp.position.z > playerZ + 30) {
                    let farthestZ = playerZ;
                    this.lamps.forEach(l => {
                        if (l.position.z < farthestZ) farthestZ = l.position.z;
                    });

                    lamp.position.z = farthestZ - this.lampSpacing;
                }
            });
        }

        if (this.activeBridge) {
            const { model, road, startZ } = this.activeBridge;

            // khi cầu đã đi qua hẳn phía sau player
            if (model.position.z > playerZ + 40) {
                this.scene.remove(model);
                this.scene.remove(road);
                this.activeBridge = null;
            }
        }
    }
}
