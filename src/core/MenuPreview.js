import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

// === MENU PREVIEW — phép chiếu song song (Orthographic) ===
// menuScene: preview nhỏ ở menu chính (chỉ player đang chọn)
// reviewScene: preview lớn ở subscreen (chọn bất kỳ nhân vật nào)
// Cả 2 model đều XOAY 180° (để mặt hướng về phía trước camera) + phát animation

// Gộp PLAYERS + MONSTERS thành 1 danh sách
const ALL_CHARACTERS = [
    ...CONFIG.PLAYERS.map(p => ({ ...p, kind: 'player' })),
    ...CONFIG.MONSTERS.map(m => ({ ...m, kind: 'monster' })),
];

let menuScene, menuOrthoCam, menuRenderer, menuGroup, menuCanvasEl, menuMixer;
let reviewScene, reviewOrthoCam, reviewRenderer, reviewGroup, reviewCanvasEl, reviewMixer;

let currentMenuConfig = null;
let currentReviewConfig = null;

let menuAnimating = true;
let reviewAnimating = false;
const clock = new THREE.Clock();

const FLIP_180 = Math.PI;

const makeRenderer = (canvas) => {
    const r = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: false,
    });
    r.setPixelRatio(window.devicePixelRatio);
    r.setClearColor(0x000000, 0);
    return r;
};

const fitOrthoToCanvas = (cam, canvas) => {
    if (!cam || !canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const baseScale = 100;
    cam.left = -w / baseScale;
    cam.right = w / baseScale;
    cam.top = h / baseScale;
    cam.bottom = -h / baseScale;
    cam.updateProjectionMatrix();
};

const onResize = () => {
    if (menuCanvasEl && menuRenderer) {
        menuRenderer.setSize(menuCanvasEl.clientWidth, menuCanvasEl.clientHeight, false);
        fitOrthoToCanvas(menuOrthoCam, menuCanvasEl);
    }
    if (reviewCanvasEl && reviewRenderer) {
        reviewRenderer.setSize(reviewCanvasEl.clientWidth, reviewCanvasEl.clientHeight, false);
        fitOrthoToCanvas(reviewOrthoCam, reviewCanvasEl);
    }
};

const pickAnimClip = (animations) => {
    if (!animations || animations.length === 0) return null;
    const idleNames = ['Idle', 'idle', 'IDLE', 'Stand', 'stand', 'T-Pose'];
    for (const n of idleNames) {
        const c = THREE.AnimationClip.findByName(animations, n);
        if (c) return c;
    }
    const runNames = ['Run', 'run', 'RUN', 'Walk', 'walk', 'WALK'];
    for (const n of runNames) {
        const c = THREE.AnimationClip.findByName(animations, n);
        if (c) return c;
    }
    return animations[0];
};

const loadCharacterIntoGroup = (config, targetGroup, onLoaded) => {
    return new Promise((resolve) => {
        if (!config) {
            while (targetGroup.children.length) {
                const c = targetGroup.children[0];
                targetGroup.remove(c);
                if (c.geometry) c.geometry.dispose();
                if (c.material) {
                    if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                    else c.material.dispose();
                }
            }
            if (onLoaded) onLoaded(null);
            resolve();
            return;
        }

        const loader = new GLTFLoader();
        const filePath = (CONFIG.PATH_ASSETS || '/assets/') + config.file;

        loader.load(
            filePath,
            (gltf) => {
                if (!gltf || !gltf.scene) {
                    console.warn(`[MenuPreview] GLTF invalid cho ${config.file}`);
                    if (onLoaded) onLoaded(null);
                    resolve();
                    return;
                }

                while (targetGroup.children.length) {
                    targetGroup.remove(targetGroup.children[0]);
                }

                const root = gltf.scene;

                const scale = config.scale !== undefined ? config.scale : 1;
                const baseRotationY = config.rotationY !== undefined ? config.rotationY : 0;
                // Cộng thêm 180° để mặt nhân vật hướng về phía camera
                const finalRotationY = baseRotationY + FLIP_180;
                const positionY = config.positionY !== undefined ? config.positionY : 0;

                root.scale.setScalar(scale);
                root.rotation.y = finalRotationY;
                root.position.y = positionY;

                targetGroup.add(root);

                // Auto-fit: đặt đáy nhân vật ở y = 0
                const box = new THREE.Box3().setFromObject(root);
                const minY = box.min.y;
                root.position.y -= minY;
                root.position.y += positionY;

                root.traverse(c => {
                    if (c.isMesh) {
                        c.castShadow = false;
                        c.receiveShadow = false;
                    }
                });

                // Setup animation
                let mixer = null;
                if (gltf.animations && gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(root);
                    const clip = pickAnimClip(gltf.animations);
                    if (clip) {
                        const action = mixer.clipAction(clip);
                        action.setLoop(THREE.LoopRepeat);
                        action.play();
                        console.log(`[MenuPreview] Playing animation: "${clip.name}" for ${config.id}`);
                    }
                }

                if (onLoaded) onLoaded(mixer);
                resolve();
            },
            undefined,
            (err) => {
                console.warn(`[MenuPreview] Không load được ${config.file}:`, err);
                if (onLoaded) onLoaded(null);
                resolve();
            }
        );
    });
};

const tick = () => {
    requestAnimationFrame(tick);

    const delta = clock.getDelta();

    if (menuMixer && menuAnimating) {
        menuMixer.update(delta);
    }
    if (reviewMixer && reviewAnimating) {
        reviewMixer.update(delta);
    }

    if (menuGroup && menuOrthoCam && menuRenderer && menuScene && menuAnimating) {
        menuOrthoCam.position.set(0, 2, 4);
        menuOrthoCam.lookAt(0, 0.8, 0);
        menuRenderer.render(menuScene, menuOrthoCam);
    }

    if (reviewGroup && reviewOrthoCam && reviewRenderer && reviewScene && reviewAnimating) {
        reviewOrthoCam.position.set(0, 2, 4);
        reviewOrthoCam.lookAt(0, 0.8, 0);
        reviewRenderer.render(reviewScene, reviewOrthoCam);
    }
};

const setupStage = (sceneRef, canvasEl) => {
    if (!canvasEl) return;
    const scene = new THREE.Scene();
    scene.background = null;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.6);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(3, 5, 4);
    scene.add(dir);
    const back = new THREE.DirectionalLight(0xffeebb, 0.8);
    back.position.set(-3, 3, -4);
    scene.add(back);
    const rim = new THREE.DirectionalLight(0xffaa66, 0.5);
    rim.position.set(0, 3, -5);
    scene.add(rim);

    const baseGeom = new THREE.CylinderGeometry(1.6, 1.6, 0.12, 32);
    const baseMat = new THREE.MeshStandardMaterial({
        color: 0x334455,
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x222233,
        emissiveIntensity: 0.2,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = -0.06;
    scene.add(base);

    const ringGeom = new THREE.RingGeometry(1.6, 1.9, 32);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffd54a,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    const group = new THREE.Group();
    scene.add(group);

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    const renderer = makeRenderer(canvasEl);

    if (sceneRef === 'menu') {
        menuScene = scene;
        menuOrthoCam = cam;
        menuRenderer = renderer;
        menuGroup = group;
        menuCanvasEl = canvasEl;
    } else if (sceneRef === 'review') {
        reviewScene = scene;
        reviewOrthoCam = cam;
        reviewRenderer = renderer;
        reviewGroup = group;
        reviewCanvasEl = canvasEl;
    }
};

export const initMenuPreview = ({ scene, renderer, camera }) => {
    // Menu chính
    const menuCanvas = document.getElementById('preview-player-canvas');
    setupStage('menu', menuCanvas);
    currentMenuConfig = CONFIG.PLAYERS[0];
    loadCharacterIntoGroup(currentMenuConfig, menuGroup, (mixer) => {
        menuMixer = mixer;
    });

    // Subscreen review
    const reviewCanvas = document.getElementById('review-canvas');
    setupStage('review', reviewCanvas);

    window.addEventListener('resize', onResize);
    setTimeout(onResize, 50);

    tick();
};

export const setPreviewPlayer = (playerId) => {
    const cfg = CONFIG.PLAYERS.find(p => p.id === playerId);
    if (!cfg || !menuGroup) return;
    currentMenuConfig = cfg;
    loadCharacterIntoGroup(cfg, menuGroup, (mixer) => {
        menuMixer = mixer;
    });
};

export const openReviewScreen = (initialCharacterId, onSelect) => {
    const screen = document.getElementById('review-screen');
    if (!screen || !reviewGroup) return;

    const container = document.getElementById('review-container-character');
    container.innerHTML = '';

    // 1 dải nút cho cả player + monster
    ALL_CHARACTERS.forEach((c) => {
        const btn = document.createElement('button');
        btn.className = `select-btn ${c.id === initialCharacterId ? 'active' : ''}`;
        btn.innerText = c.name;
        btn.dataset.id = c.id;
        btn.dataset.kind = c.kind;
        btn.onclick = () => {
            container.querySelectorAll('.select-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentReviewConfig = c;
            loadCharacterIntoGroup(c, reviewGroup, (mixer) => {
                reviewMixer = mixer;
            });
            const nameEl = document.getElementById('review-character-name');
            if (nameEl) nameEl.innerText = c.name;
            if (onSelect) onSelect(c.id, c.kind);
        };
        container.appendChild(btn);
    });

    // Load nhân vật đầu tiên (ưu tiên player đang chọn)
    const first = ALL_CHARACTERS.find(c => c.id === initialCharacterId) || ALL_CHARACTERS[0];
    currentReviewConfig = first;
    loadCharacterIntoGroup(first, reviewGroup, (mixer) => {
        reviewMixer = mixer;
    });
    const nameEl = document.getElementById('review-character-name');
    if (nameEl) nameEl.innerText = first.name;

    screen.classList.add('show');
    reviewAnimating = true;
    menuAnimating = false;

    setTimeout(() => onResize(), 100);
};

export const closeReviewScreen = () => {
    const screen = document.getElementById('review-screen');
    if (!screen) return;
    screen.classList.remove('show');
    reviewAnimating = false;
    menuAnimating = true;
};
