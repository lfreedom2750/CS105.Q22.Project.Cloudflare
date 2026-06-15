import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { CONFIG as GAME_CONFIG } from '../../src/Config.js';
import { Environment } from '../../src/entities/Environment.js';

const ASSET_ROOT = '/assets/';

const ASSETS = [
    { id: 'player_v1', label: 'Nhan vat chinh - Chien si', type: 'glb', file: 'player_v1.glb', scale: 0.02, rotationY: Math.PI, hasSkeleton: true },
    { id: 'super_bunny', label: 'Nhan vat phu - Super Bunny', type: 'glb', file: 'super_bunny_final.glb', scale: 1, rotationY: Math.PI / 2, hasSkeleton: true },
    { id: 'monster', label: 'Quai vat truy duoi', type: 'glb', file: 'demon.glb', scale: 2, rotationY: Math.PI, hasSkeleton: true },
    { id: 'dragon', label: 'Su kien rong mua xuan', type: 'glb', file: 'chinese_dragon.glb', scale: 1.2, rotationY: Math.PI, hasSkeleton: true },
    { id: 'plane', label: 'May bay tha bom', type: 'glb', file: 'cartoon_plane.glb', scale: 0.8, rotationY: Math.PI },
    { id: 'elk', label: 'Elk bang duong', type: 'glb', file: 'elk_wip.glb', scale: 1, rotationY: Math.PI / 2, hasSkeleton: true },
    { id: 'sakura', label: 'Cay hoa anh dao', type: 'glb', file: 'sakura_tree.glb', scale: 10 },
    { id: 'palm', label: 'Cay dua mua he', type: 'glb', file: 'palm_tree.glb', scale: 2.5 },
    { id: 'maple', label: 'Cay phong mua thu', type: 'glb', file: 'autumn_maple.glb', scale: 5 },
    { id: 'winter_tree', label: 'Cay thong mua dong', type: 'glb', file: 'christmas_tree_2.glb', scale: 0.25 },
    { id: 'magnet', label: 'Power-up nam cham', type: 'glb', file: 'magnet.glb', scale: 0.01 },
    { id: 'pumpkin', label: 'Chuong ngai bi ngo', type: 'glb', file: 'pumpkin.glb', scale: 1 },
    { id: 'candy_cane', label: 'Chuong ngai keo giang sinh', type: 'glb', file: 'candy_cane.glb', scale: 2 },
    { id: 'lantern', label: 'Den long Viet Nam', type: 'glb', file: 'vietnamese_lantern.glb', scale: 1.25 },
    { id: 'coin', label: 'Dong xu thu thap', type: 'coin' },
    { id: 'portal', label: 'Cong chuyen mua', type: 'portal' },
    { id: 'river', label: 'Suoi nuoc / vat can', type: 'river' },
    { id: 'obstacle_set', label: 'Bo vat can co ban', type: 'obstacleSet' },
    { id: 'season_overview', label: 'Bo minh hoa 4 mua', type: 'seasonOverview' }
];

const SEASONS = {
    spring: {
        name: 'Mua xuan',
        bgColor: 0xdff6dd,
        fogColor: 0xdff6dd,
        roadTexture: 'road_spring.jpg',
        treeModel: 'sakura_tree.glb',
        treeScale: 8,
        treeColor: 0xffb7d5,
        accent: 0xff9ecf,
        ground: 0xb9e7bc,
        skyLight: 0xffffff,
        sun: 0xfff1d0
    },
    summer: {
        name: 'Mua he',
        bgColor: 0xfff0b3,
        fogColor: 0xfff0b3,
        roadTexture: 'road_summer.jpg',
        treeModel: 'palm_tree.glb',
        treeScale: 2.2,
        treeColor: 0x2e8b57,
        accent: 0x0099cc,
        ground: 0xd6b96b,
        skyLight: 0xffefbd,
        sun: 0xfff1a8
    },
    autumn: {
        name: 'Mua thu',
        bgColor: 0x1b1024,
        fogColor: 0x2a1433,
        roadTexture: 'road_autumn.jpg',
        treeModel: 'autumn_maple.glb',
        treeScale: 4.5,
        treeColor: 0xd97706,
        accent: 0xff9a3d,
        ground: 0x3b2435,
        skyLight: 0x6a4a7a,
        sun: 0xffbd7a
    },
    winter: {
        name: 'Mua dong',
        bgColor: 0xcceeff,
        fogColor: 0xcceeff,
        roadTexture: 'road_winter.jpg',
        treeModel: 'christmas_tree_2.glb',
        treeScale: 0.24,
        treeColor: 0xe5f3ff,
        accent: 0x8fd3ff,
        ground: 0xdff6ff,
        skyLight: 0xffffff,
        sun: 0xeaf8ff
    }
};

const BACKGROUNDS = {
    studio: {
        clear: 0xe8edf4,
        fog: 0xe8edf4,
        floor: 0xd7dee8,
        hemi: 0xffffff,
        key: 0xffffff,
        accent: 0xffc777
    },
    dark: {
        clear: 0x101827,
        fog: 0x101827,
        floor: 0x1f2937,
        hemi: 0xc8d7ff,
        key: 0xffffff,
        accent: 0xffb86b
    },
    warm: {
        clear: 0xf2d7a6,
        fog: 0xf2d7a6,
        floor: 0xd6b06e,
        hemi: 0xffe0b0,
        key: 0xfff4dd,
        accent: 0xff8c42
    },
    transparent: {
        clear: null,
        fog: 0xe8edf4,
        floor: 0xd7dee8,
        hemi: 0xffffff,
        key: 0xffffff,
        accent: 0xffc777
    }
};

const viewport = document.getElementById('viewport');
const assetSelect = document.getElementById('assetSelect');
const sceneModeSelect = document.getElementById('sceneModeSelect');
const backgroundSelect = document.getElementById('backgroundSelect');
const autoRotateInput = document.getElementById('autoRotate');
const showGridInput = document.getElementById('showGrid');
const modelScaleInput = document.getElementById('modelScale');
const modelRotationSelect = document.getElementById('modelRotation');
const captureSizeSelect = document.getElementById('captureSize');
const resetViewButton = document.getElementById('resetView');
const downloadButton = document.getElementById('downloadPng');
const statusEl = document.getElementById('status');
const captionTitle = document.getElementById('captionTitle');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xe8edf4, 0.018);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2000);
camera.position.set(7, 4.5, 9);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;
controls.target.set(0, 1.6, 0);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x344055, 1.4);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(7, 10, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(4096, 4096);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 80;
keyLight.shadow.camera.left = -20;
keyLight.shadow.camera.right = 20;
keyLight.shadow.camera.top = 20;
keyLight.shadow.camera.bottom = -20;
keyLight.shadow.bias = -0.00012;
keyLight.shadow.normalBias = 0.025;
scene.add(keyLight);

const shadowTarget = new THREE.Object3D();
shadowTarget.position.set(0, 1, -6);
scene.add(shadowTarget);
keyLight.target = shadowTarget;

const fillLight = new THREE.DirectionalLight(0x8fb6ff, 1.1);
fillLight.position.set(-6, 6, -5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffc777, 2.2);
rimLight.position.set(-5, 5, 7);
scene.add(rimLight);

const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 96),
    new THREE.MeshStandardMaterial({ color: 0xd7dee8, roughness: 0.78, metalness: 0.02 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.02;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(24, 24, 0x8c9aad, 0xb7c0cc);
grid.position.y = 0.01;
grid.material.transparent = true;
grid.material.opacity = 0.38;
scene.add(grid);

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
let activeObject = null;
let activeModelRoot = null;
let activeBaseScale = 1;
let activeBaseRotationY = 0;
let gameEnvironment = null;
const modelCache = new Map();
const textureCache = new Map();
const clock = new THREE.Clock();

function setStatus(message) {
    statusEl.textContent = message;
}

function populateAssetSelect() {
    ASSETS.forEach((asset) => {
        const option = document.createElement('option');
        option.value = asset.id;
        option.textContent = asset.label;
        assetSelect.appendChild(option);
    });
}

function disposeObject(object) {
    if (!object) return;
    scene.remove(object);
}

function clearGameEnvironment() {
    if (!gameEnvironment) return;

    gameEnvironment.floorTiles?.forEach((object) => scene.remove(object));
    gameEnvironment.trees?.forEach((object) => scene.remove(object));
    gameEnvironment.lamps?.forEach((object) => scene.remove(object));

    if (gameEnvironment.activeBridge) {
        scene.remove(gameEnvironment.activeBridge.model);
        scene.remove(gameEnvironment.activeBridge.road);
    }

    gameEnvironment = null;
}

function getSceneModeSeasonIndex() {
    const mode = sceneModeSelect.value;
    if (!mode.startsWith('game-')) return -1;

    const seasonId = mode.replace('game-', '');
    return GAME_CONFIG.SEASONS.findIndex((season) => season.id === seasonId);
}

async function setupGameEnvironment() {
    clearGameEnvironment();

    const seasonIndex = getSceneModeSeasonIndex();
    if (seasonIndex < 0) return false;

    floor.visible = false;
    grid.visible = false;
    backgroundSelect.disabled = true;

    gameEnvironment = new Environment(scene, hemiLight, keyLight);
    gameEnvironment.currentSeasonIndex = seasonIndex;
    await gameEnvironment.init();
    if (gameEnvironment.initLampsForSeason) {
        await gameEnvironment.initLampsForSeason();
    }
    enhanceGameGroundForCapture();
    configureGameCaptureLighting(seasonIndex);

    return true;
}

function enhanceGameGroundForCapture() {
    if (!gameEnvironment) return;

    gameEnvironment.floorTiles?.forEach((tile) => {
        tile.receiveShadow = true;
        if (tile.material) {
            tile.material.roughness = 0.9;
            tile.material.metalness = 0;
            tile.material.needsUpdate = true;
            if (tile.material.map) {
                tile.material.map.colorSpace = THREE.SRGBColorSpace;
                tile.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                tile.material.map.needsUpdate = true;
            }
        }
    });

    gameEnvironment.trees?.forEach((tree) => {
        tree.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    });

    const seasonIndex = getSceneModeSeasonIndex();
    const season = GAME_CONFIG.SEASONS[seasonIndex];
    if (season?.id === 'autumn') {
        enhanceAutumnLampsForCapture();
    }
}

function enhanceAutumnLampsForCapture() {
    if (!gameEnvironment?.lamps?.length) return;

    const lampX = 6.35;
    const visibleRows = [-12, -30, -50];

    gameEnvironment.lamps.forEach((lamp, index) => {
        const side = lamp.position.x < 0 ? -1 : 1;
        const row = Math.floor(index / 2);
        if (row >= visibleRows.length) {
            lamp.visible = false;
            return;
        }

        lamp.visible = true;
        lamp.position.x = side * lampX;
        lamp.position.z = visibleRows[row];

        lamp.traverse((child) => {
            if (child.isSpotLight || child.isPointLight) {
                child.intensity *= 1.45;
                child.distance *= 1.05;
                child.castShadow = false;
            }

            if (child.isMesh && child.userData?.isLampBulb && child.material) {
                child.material.emissiveIntensity = 3.0;
                child.material.needsUpdate = true;
            }

            if (
                child.isMesh &&
                child.material &&
                child.material.transparent &&
                child.geometry?.type === 'CircleGeometry'
            ) {
                child.material.opacity = 0.42;
                child.scale.set(0.95, 1.45, 1);
                child.position.z = side < 0 ? -1.15 : 1.15;
                child.position.x = side < 0 ? 0.75 : -0.75;
                child.material.needsUpdate = true;
            }
        });
    });
}

function configureGameCaptureLighting(seasonIndex) {
    const season = GAME_CONFIG.SEASONS[seasonIndex] || GAME_CONFIG.SEASONS[0];
    const isAutumn = season.id === 'autumn';

    scene.background = isAutumn ? new THREE.Color(0x261633) : season.bgColor;
    if (scene.fog) {
        scene.fog.color.copy(isAutumn ? new THREE.Color(0x2f1c3f) : season.fogColor);
    }

    if (gameEnvironment?.applySeasonLighting) {
        gameEnvironment.applySeasonLighting();
    }

    if (isAutumn) {
        hemiLight.intensity = 0.54;
        keyLight.intensity = 0.42;
    }

    keyLight.position.set(5, 25, 4);
    shadowTarget.position.set(0, 1.1, -6);
    keyLight.target = shadowTarget;

    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(4096, 4096);
    keyLight.shadow.camera.left = -28;
    keyLight.shadow.camera.right = 28;
    keyLight.shadow.camera.top = 28;
    keyLight.shadow.camera.bottom = -28;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 70;
    keyLight.shadow.bias = -0.00008;
    keyLight.shadow.normalBias = 0.018;
    keyLight.shadow.camera.updateProjectionMatrix();

    fillLight.intensity = 0;
    rimLight.intensity = 0;
}

function placeModelOnGameRoad(object) {
    object.position.set(0, 0, -6);
    object.rotation.y = 0;
    normalizeToGround(object);
    shadowTarget.position.set(0, 1.1, -6);
}

function frameGameEnvironment() {
    controls.target.set(0, 1.6, -28);
    camera.position.set(0, 5.8, 11.5);
    camera.fov = 56;
    camera.near = 0.1;
    camera.far = 900;
    camera.updateProjectionMatrix();
    controls.update();
}

function normalizeToGround(object) {
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    object.position.x += object.position.x - center.x;
    object.position.z += object.position.z - center.z;
    object.position.y += -box.min.y + 0.02;
    object.updateWorldMatrix(true, true);
}

function frameObject(object) {
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const distance = maxDim * 1.8;

    controls.target.copy(center);
    controls.target.y = Math.max(center.y, size.y * 0.45);
    camera.position.set(center.x + distance, controls.target.y + maxDim * 0.55, center.z + distance * 1.15);
    camera.near = Math.max(0.01, maxDim / 1000);
    camera.far = Math.max(200, maxDim * 20);
    camera.updateProjectionMatrix();
    controls.update();
}

function applyModelScale() {
    if (!activeModelRoot) return;
    if (activeObject?.userData?.isSeasonScene) {
        activeObject.scale.setScalar(Number(modelScaleInput.value));
        frameSeasonScene();
        return;
    }

    const multiplier = Number(modelScaleInput.value);
    const isGameMode = sceneModeSelect.value.startsWith('game-');
    if (isGameMode && activeObject) {
        activeObject.position.set(0, 0, 0);
    }

    activeModelRoot.position.set(0, 0, 0);
    activeModelRoot.scale.setScalar(activeBaseScale * multiplier);
    normalizeToGround(activeModelRoot);
    if (isGameMode && activeObject) {
        activeObject.position.set(0, 0, -6);
        frameGameEnvironment();
        return;
    }

    if (activeObject) frameObject(activeObject);
}

function applyModelRotation() {
    if (!activeModelRoot) return;

    const extraRotation = THREE.MathUtils.degToRad(Number(modelRotationSelect.value || 0));
    activeModelRoot.rotation.y = activeBaseRotationY + extraRotation;
    normalizeToGround(activeModelRoot);

    if (sceneModeSelect.value.startsWith('game-')) {
        if (activeObject) activeObject.position.set(0, 0, -6);
        frameGameEnvironment();
    } else if (activeObject?.userData?.isSeasonScene) {
        frameSeasonScene();
    } else if (activeObject) {
        frameObject(activeObject);
    }
}

async function loadGLB(asset) {
    const cached = modelCache.get(asset.file);
    if (cached) return asset.hasSkeleton ? cloneSkeleton(cached) : cached.clone(true);

    const gltf = await loader.loadAsync(`${ASSET_ROOT}${asset.file}`);
    const root = gltf.scene;
    root.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material.needsUpdate = true;
            }
        }
    });
    modelCache.set(asset.file, root);
    return asset.hasSkeleton ? cloneSkeleton(root) : root.clone(true);
}

function loadTexture(file, repeatX = 1, repeatY = 1) {
    const key = `${file}:${repeatX}:${repeatY}`;
    if (textureCache.has(key)) return textureCache.get(key);

    const texture = textureLoader.load(`${ASSET_ROOT}${file}`);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    textureCache.set(key, texture);
    return texture;
}

function createCoin() {
    const group = new THREE.Group();
    const coin = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.22, 24, 80),
        new THREE.MeshStandardMaterial({
            color: 0xffd45a,
            emissive: 0x4a2a00,
            metalness: 1,
            roughness: 0.18
        })
    );
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    group.add(coin);
    return group;
}

function createPortal() {
    const group = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6d7280, roughness: 0.75 });
    const portalMat = new THREE.MeshStandardMaterial({
        color: 0xff9ecf,
        emissive: 0xff5fae,
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.25
    });
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0xff9ecf,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide
    });

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6, 0.7), pillarMat);
    const right = left.clone();
    const top = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.7, 0.7), pillarMat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.22, 24, 96), portalMat);
    const core = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 3.7), coreMat);

    left.position.set(-2.4, 3, 0);
    right.position.set(2.4, 3, 0);
    top.position.set(0, 6, 0);
    ring.position.set(0, 3.1, 0);
    core.position.set(0, 3.1, -0.05);

    [left, right, top, ring].forEach((mesh) => {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    });
    group.add(left, right, top, ring, core);
    return group;
}

function createRiver() {
    const group = new THREE.Group();
    const water = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.15, 4),
        new THREE.MeshStandardMaterial({
            color: 0x0099cc,
            transparent: true,
            opacity: 0.86,
            roughness: 0.25,
            metalness: 0.08
        })
    );
    water.position.y = 0.08;
    water.receiveShadow = true;
    group.add(water);

    for (let i = 0; i < 7; i++) {
        const foam = new THREE.Mesh(
            new THREE.PlaneGeometry(1.6, 0.08),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
        );
        foam.rotation.x = -Math.PI / 2;
        foam.position.set(-4 + i * 1.35, 0.18, Math.sin(i) * 1.2);
        group.add(foam);
    }

    return group;
}

function createObstacleSet() {
    const group = new THREE.Group();
    const materials = [
        new THREE.MeshStandardMaterial({ color: 0xffb86b, roughness: 0.8 }),
        new THREE.MeshStandardMaterial({ color: 0x65b8ff, metalness: 0.4, roughness: 0.28 }),
        new THREE.MeshStandardMaterial({ color: 0xf87171, roughness: 0.6 })
    ];
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.1), materials[0]);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 24), materials[2]);
    const torus = new THREE.Mesh(new THREE.TorusKnotGeometry(0.75, 0.18, 96, 12), materials[1]);

    box.position.set(-2.4, 0.55, 0);
    cone.position.set(0, 0.9, 0);
    torus.position.set(2.4, 0.95, 0);
    [box, cone, torus].forEach((mesh) => {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    });
    return group;
}

function createSeasonOverview() {
    const group = new THREE.Group();
    const colors = [0xffb7d5, 0x2e8b57, 0xd97706, 0xe5f3ff];
    const labels = ['Spring', 'Summer', 'Autumn', 'Winter'];

    colors.forEach((color, index) => {
        const baseX = (index - 1.5) * 3.2;
        const road = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.08, 4.2),
            new THREE.MeshStandardMaterial({ color: index === 2 ? 0x2d2132 : 0x9ca3af, roughness: 0.85 })
        );
        road.position.set(baseX, 0.04, 0);

        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.14, 0.9, 10),
            new THREE.MeshStandardMaterial({ color: 0x5b3213, roughness: 1 })
        );
        trunk.position.y = 0.45;
        const top = new THREE.Mesh(
            new THREE.ConeGeometry(0.52, 1.25, 18),
            new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
        );
        top.position.y = 1.2;
        tree.add(trunk, top);
        tree.position.set(baseX - 0.72, 0, -1.25);

        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 24, 16),
            new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.35,
                roughness: 0.45
            })
        );
        marker.position.set(baseX + 0.72, 0.45, 1.3);

        road.castShadow = true;
        tree.traverse((child) => {
            if (child.isMesh) child.castShadow = true;
        });
        marker.castShadow = true;
        group.add(road, tree, marker);

        const label = makeTextSprite(labels[index]);
        label.position.set(baseX, 2.2, 0);
        group.add(label);
    });

    return group;
}

function createFallbackSeasonTree(season) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.25, 1.8, 10),
        new THREE.MeshStandardMaterial({ color: 0x5b3213, roughness: 1 })
    );
    trunk.position.y = 0.9;

    const top = new THREE.Mesh(
        season === SEASONS.summer
            ? new THREE.SphereGeometry(0.9, 16, 12)
            : new THREE.ConeGeometry(1, 2.6, 18),
        new THREE.MeshStandardMaterial({ color: season.treeColor, roughness: 0.9 })
    );
    top.position.y = 2.3;

    tree.add(trunk, top);
    tree.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    return tree;
}

async function createSeasonTree(season) {
    if (!season.treeModel) return createFallbackSeasonTree(season);

    try {
        const tree = await loadGLB({
            file: season.treeModel,
            hasSkeleton: false
        });
        tree.scale.setScalar(season.treeScale || 1);
        normalizeToGround(tree);
        tree.rotation.y = Math.random() * Math.PI * 2;
        return tree;
    } catch (error) {
        console.warn('Tree model fallback:', season.treeModel, error);
        return createFallbackSeasonTree(season);
    }
}

function createStreetLamp() {
    const lamp = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3b2f2a, roughness: 0.85, metalness: 0.2 });
    const lightMat = new THREE.MeshStandardMaterial({
        color: 0xffd19a,
        emissive: 0xff9a3d,
        emissiveIntensity: 2.5,
        roughness: 0.3
    });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.8, 12), poleMat);
    pole.position.y = 2.4;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.08), poleMat);
    arm.position.set(0.45, 4.55, 0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), lightMat);
    bulb.position.set(0.95, 4.4, 0);
    const glow = new THREE.PointLight(0xff9a3d, 2.5, 14, 1.6);
    glow.position.copy(bulb.position);

    [pole, arm, bulb].forEach((mesh) => {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    });
    lamp.add(pole, arm, bulb, glow);
    return lamp;
}

function createSceneCoinLine(zStart = -12) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffd45a,
        emissive: 0x3a2300,
        metalness: 1,
        roughness: 0.2
    });

    for (let i = 0; i < 10; i++) {
        const coin = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 12, 32), mat);
        coin.rotation.x = Math.PI / 2;
        coin.position.set(0, 1.15, zStart - i * 2.4);
        coin.castShadow = true;
        group.add(coin);
    }

    return group;
}

function addSceneAtmosphere(group, seasonId, season) {
    if (seasonId === 'spring') {
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff9ecf,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide
        });
        for (let i = 0; i < 70; i++) {
            const petal = new THREE.Mesh(new THREE.CircleGeometry(0.07 + Math.random() * 0.05, 6), mat);
            petal.position.set((Math.random() - 0.5) * 18, 2 + Math.random() * 6, -Math.random() * 64);
            petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            group.add(petal);
        }
    }

    if (seasonId === 'summer') {
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x0099cc,
            transparent: true,
            opacity: 0.72,
            roughness: 0.2,
            metalness: 0.05
        });
        const leftWater = new THREE.Mesh(new THREE.PlaneGeometry(20, 90), waterMat);
        const rightWater = leftWater.clone();
        leftWater.rotation.x = -Math.PI / 2;
        rightWater.rotation.x = -Math.PI / 2;
        leftWater.position.set(-18, -0.05, -34);
        rightWater.position.set(18, -0.05, -34);
        group.add(leftWater, rightWater);
    }

    if (seasonId === 'autumn') {
        const leafMats = [0xd97706, 0xb45309, 0x92400e, 0xffb45c].map((color) => (
            new THREE.MeshStandardMaterial({ color, roughness: 1 })
        ));
        for (let i = 0; i < 130; i++) {
            const leaf = new THREE.Mesh(
                new THREE.CircleGeometry(0.06 + Math.random() * 0.07, 5),
                leafMats[Math.floor(Math.random() * leafMats.length)]
            );
            leaf.rotation.x = -Math.PI / 2;
            leaf.rotation.z = Math.random() * Math.PI * 2;
            const nearRoad = Math.random() > 0.45;
            leaf.position.set(
                nearRoad ? (Math.random() > 0.5 ? 5.5 + Math.random() * 6 : -5.5 - Math.random() * 6) : (Math.random() - 0.5) * 8,
                0.04,
                4 - Math.random() * 74
            );
            group.add(leaf);
        }
    }

    if (seasonId === 'winter') {
        const snowGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(350 * 3);
        for (let i = 0; i < 350; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 1] = 1 + Math.random() * 11;
            positions[i * 3 + 2] = 6 - Math.random() * 78;
        }
        snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const snow = new THREE.Points(
            snowGeo,
            new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.9 })
        );
        group.add(snow);
    }
}

async function createSeasonScene(seasonId) {
    const season = SEASONS[seasonId] || SEASONS.spring;
    const group = new THREE.Group();
    group.userData.isSeasonScene = true;
    group.userData.seasonId = seasonId;

    const roadMat = new THREE.MeshStandardMaterial({
        map: loadTexture(season.roadTexture, 1, 7),
        color: 0xffffff,
        roughness: 0.82
    });
    const shoulderMat = new THREE.MeshStandardMaterial({ color: season.ground, roughness: 0.95 });

    const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(46, 90), shoulderMat);
    shoulder.rotation.x = -Math.PI / 2;
    shoulder.position.set(0, -0.03, -34);
    shoulder.receiveShadow = true;
    group.add(shoulder);

    for (let i = 0; i < 4; i++) {
        const tile = new THREE.Mesh(new THREE.PlaneGeometry(14, 24), roadMat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(0, 0, 2 - i * 24);
        tile.receiveShadow = true;
        group.add(tile);
    }

    const laneMat = new THREE.MeshBasicMaterial({
        color: seasonId === 'autumn' ? 0xffc27a : 0xffffff,
        transparent: true,
        opacity: 0.45
    });
    [-1.5, 1.5].forEach((x) => {
        for (let i = 0; i < 14; i++) {
            const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1.7), laneMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(x, 0.035, 2 - i * 5.2);
            group.add(dash);
        }
    });

    const treePromises = [];
    for (let i = 0; i < 16; i++) {
        const z = 5 - i * 5.2;
        [-1, 1].forEach((side) => {
            treePromises.push(createSeasonTree(season).then((tree) => {
                const offset = 8.6 + Math.random() * 3.8;
                tree.position.set(side * offset, 0, z + (Math.random() - 0.5) * 1.7);
                tree.rotation.y += side < 0 ? Math.PI * 0.08 : -Math.PI * 0.08;
                group.add(tree);
            }));
        });
    }
    await Promise.all(treePromises);

    if (seasonId === 'autumn') {
        for (let i = 0; i < 7; i++) {
            const z = 1 - i * 10;
            [-1, 1].forEach((side) => {
                const lamp = createStreetLamp();
                lamp.position.set(side * 6.2, 0, z);
                lamp.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
                group.add(lamp);
            });
        }
    }

    const obstacleMat = new THREE.MeshStandardMaterial({ color: season.accent, roughness: 0.55, metalness: 0.12 });
    const obstacle = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.1), obstacleMat);
    obstacle.position.set(-3, 0.55, -18);
    obstacle.castShadow = true;
    group.add(obstacle);

    group.add(createSceneCoinLine(-8));
    addSceneAtmosphere(group, seasonId, season);

    return group;
}

function makeTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.roundRect(44, 28, 424, 72, 16);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(2.2, 0.55, 1);
    return sprite;
}

async function createAssetObject(asset) {
    if (asset.type === 'seasonScene') {
        const object = await createSeasonScene(asset.season);
        return { object, modelRoot: object, baseScale: 1, baseRotationY: 0 };
    }

    if (asset.type === 'glb') {
        const model = await loadGLB(asset);
        const object = new THREE.Group();
        object.add(model);
        model.scale.setScalar(asset.scale || 1);
        model.rotation.y = asset.rotationY || 0;
        normalizeToGround(model);
        return {
            object,
            modelRoot: model,
            baseScale: asset.scale || 1,
            baseRotationY: asset.rotationY || 0
        };
    }

    const procedural = {
        coin: createCoin,
        portal: createPortal,
        river: createRiver,
        obstacleSet: createObstacleSet,
        seasonOverview: createSeasonOverview
    }[asset.type]?.();

    return { object: procedural, modelRoot: procedural, baseScale: 1, baseRotationY: 0 };
}

async function selectAsset(assetId) {
    const asset = ASSETS.find((item) => item.id === assetId) || ASSETS[0];
    setStatus(`Dang tai: ${asset.label}...`);
    captionTitle.textContent = asset.label;
    disposeObject(activeObject);
    activeObject = null;
    activeModelRoot = null;

    try {
        const { object, modelRoot, baseScale, baseRotationY } = await createAssetObject(asset);
        activeObject = object;
        activeModelRoot = modelRoot;
        activeBaseScale = baseScale;
        activeBaseRotationY = baseRotationY || 0;
        modelScaleInput.value = '1';
        modelRotationSelect.value = '0';

        const usingGameEnvironment = await setupGameEnvironment();
        if (usingGameEnvironment) {
            placeModelOnGameRoad(activeObject);
        }

        scene.add(activeObject);

        if (usingGameEnvironment) {
            autoRotateInput.checked = false;
            frameGameEnvironment();
        } else if (asset.type === 'seasonScene') {
            applySeasonSceneLook(asset.season);
            autoRotateInput.checked = false;
            frameSeasonScene();
        } else {
            restoreStudioLook();
            frameObject(activeObject);
        }

        setStatus(`Da tai xong: ${asset.label}. Chon "Tai PNG" de xuat anh.`);
    } catch (error) {
        console.error(error);
        setStatus(`Khong tai duoc ${asset.label}. Kiem tra file trong public/assets.`);
    }
}

function applyBackground() {
    const preset = BACKGROUNDS[backgroundSelect.value] || BACKGROUNDS.studio;
    scene.background = preset.clear === null ? null : new THREE.Color(preset.clear);
    scene.fog.color.set(preset.fog);
    floor.material.color.set(preset.floor);
    hemiLight.color.set(preset.hemi);
    keyLight.color.set(preset.key);
    rimLight.color.set(preset.accent);
}

function restoreStudioLook() {
    clearGameEnvironment();
    backgroundSelect.disabled = false;
    floor.visible = true;
    grid.visible = showGridInput.checked;
    hemiLight.intensity = 1.4;
    hemiLight.groundColor.set(0x344055);
    keyLight.intensity = 3.2;
    keyLight.position.set(7, 10, 6);
    shadowTarget.position.set(0, 1, 0);
    keyLight.target = shadowTarget;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 80;
    keyLight.shadow.bias = -0.00012;
    keyLight.shadow.normalBias = 0.025;
    keyLight.shadow.camera.updateProjectionMatrix();
    fillLight.intensity = 1.1;
    fillLight.color.set(0x8fb6ff);
    fillLight.position.set(-6, 6, -5);
    rimLight.intensity = 2.2;
    rimLight.position.set(-5, 5, 7);
    camera.fov = 42;
    camera.updateProjectionMatrix();
    applyBackground();
}

function applySeasonSceneLook(seasonId) {
    const season = SEASONS[seasonId] || SEASONS.spring;
    floor.visible = false;
    grid.visible = false;

    scene.background = new THREE.Color(season.bgColor);
    scene.fog.color.set(season.fogColor);
    hemiLight.color.set(season.skyLight);
    keyLight.color.set(season.sun);
    rimLight.color.set(season.accent);
    hemiLight.intensity = seasonId === 'autumn' ? 0.8 : 1.35;
    keyLight.intensity = seasonId === 'autumn' ? 1.75 : 3.0;
    rimLight.intensity = seasonId === 'autumn' ? 2.8 : 1.8;
}

function frameSeasonScene() {
    controls.target.set(0, 1.4, -28);
    camera.position.set(0, 6.6, 13.5);
    camera.fov = 50;
    camera.near = 0.1;
    camera.far = 900;
    camera.updateProjectionMatrix();
    controls.update();
}

function resize() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
}

function downloadURI(uri, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function capturePNG() {
    const [width, height] = captureSizeSelect.value.split('x').map(Number);
    const oldSize = new THREE.Vector2();
    renderer.getSize(oldSize);
    const oldAspect = camera.aspect;
    const oldPixelRatio = renderer.getPixelRatio();

    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    controls.update();
    keyLight.shadow.needsUpdate = true;
    renderer.render(scene, camera);

    const asset = ASSETS.find((item) => item.id === assetSelect.value) || ASSETS[0];
    const uri = renderer.domElement.toDataURL('image/png');
    downloadURI(uri, `${asset.id}-${width}x${height}.png`);

    renderer.setPixelRatio(oldPixelRatio);
    renderer.setSize(oldSize.x, oldSize.y, false);
    camera.aspect = oldAspect;
    camera.updateProjectionMatrix();
    setStatus(`Da xuat PNG: ${asset.label} (${width} x ${height}).`);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    controls.autoRotate = autoRotateInput.checked;
    controls.update();

    if (activeObject) {
        const asset = ASSETS.find((item) => item.id === assetSelect.value);
        if (asset?.type === 'coin') activeObject.rotation.y += delta * 0.9;
        if (asset?.type === 'portal') activeObject.children.forEach((child) => {
            if (child.geometry?.type === 'TorusGeometry') child.rotation.z += delta * 0.8;
        });
    }

    renderer.render(scene, camera);
}

populateAssetSelect();
applyBackground();
resize();
selectAsset(ASSETS[0].id);
animate();

assetSelect.addEventListener('change', () => selectAsset(assetSelect.value));
sceneModeSelect.addEventListener('change', () => selectAsset(assetSelect.value));
backgroundSelect.addEventListener('change', () => {
    if (sceneModeSelect.value.startsWith('game-')) {
        const seasonIndex = getSceneModeSeasonIndex();
        const seasonId = GAME_CONFIG.SEASONS[seasonIndex]?.id;
        if (seasonId) {
            const isAutumn = seasonId === 'autumn';
            scene.background = isAutumn
                ? new THREE.Color(0x261633)
                : GAME_CONFIG.SEASONS[seasonIndex].bgColor;
            scene.fog.color.copy(isAutumn
                ? new THREE.Color(0x2f1c3f)
                : GAME_CONFIG.SEASONS[seasonIndex].fogColor);
        }
    } else {
        const asset = ASSETS.find((item) => item.id === assetSelect.value);
        if (asset?.type === 'seasonScene') applySeasonSceneLook(asset.season);
        else applyBackground();
    }
});
showGridInput.addEventListener('change', () => {
    if (activeObject?.userData?.isSeasonScene || sceneModeSelect.value.startsWith('game-')) {
        grid.visible = false;
    } else {
        grid.visible = showGridInput.checked;
    }
});
modelScaleInput.addEventListener('input', applyModelScale);
modelRotationSelect.addEventListener('change', applyModelRotation);
resetViewButton.addEventListener('click', () => {
    if (!activeObject) return;
    if (sceneModeSelect.value.startsWith('game-')) frameGameEnvironment();
    else if (activeObject.userData?.isSeasonScene) frameSeasonScene();
    else frameObject(activeObject);
});
downloadButton.addEventListener('click', capturePNG);
window.addEventListener('resize', resize);
