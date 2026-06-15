import './style.css';
import * as THREE from 'three';
import { CONFIG } from './Config.js';
import { initScene } from './core/SceneSetup.js';
import { UIManager } from './core/UIManager.js';
import { InputManager } from './core/InputManager.js';
import { Player } from './entities/Player.js';
import { Monster } from './entities/Monster.js';
import { Environment } from './entities/Environment.js';
import { Spawner } from './entities/Spawner.js';
import { PlaneEvent } from './entities/PlaneEvent.js';
import { DragonEvent } from './entities/DragonEvent.js';
import { ElkEvent } from './entities/ElkEvent.js';
import { SnowEffect } from './entities/SnowEffect.js';
import { CherryBlossomEffect } from './entities/CherryBlossomEffect.js';
import { WaterEffect } from './entities/WaterEffect.js';
import { SoundManager } from './core/SoundManager.js';
import { initMenuPreview } from './core/MenuPreview.js';

const { scene, camera, renderer, sunLight, hemiLight } = initScene();
const clock = new THREE.Clock();

let gameActive = false;
let spawnTimeout = null;

let bridgeTimer = 0;

// Entities
const player = new Player(scene);
const monster = new Monster(scene);
const env = new Environment(scene, hemiLight, sunLight);
const spawner = new Spawner(scene, env);
const planeEvent = new PlaneEvent(scene);
const dragonEvent = new DragonEvent(scene, env, player);
const elkEvent = new ElkEvent(scene, env);
const snowEffect = new SnowEffect(scene);
const cherryBlossom = new CherryBlossomEffect(scene);
const waterEffect = new WaterEffect(scene);
const soundManager = new SoundManager();

// Link spawner to scene for shield communication
scene.userData.spawner = spawner;

// Khởi tạo âm thanh sớm để phát nhạc menu
soundManager.init();

// Khởi tạo menu preview (ortho scene riêng để hiện nhân vật xoay 360°)
initMenuPreview({ scene, renderer, camera });

let cameraMode = 'thirdPerson';

// Camera intro state
let cameraIntro = {
    active: true,
    endTime: 0,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    duration: 5 // 5 giây
};

const updateCameraMode = () => {
    if (cameraMode === 'thirdPerson') {
        camera.position.set(0, 5, 12);
        camera.rotation.set(-0.2, 0, 0);

        if (player.model) player.model.visible = true;
    } else if (cameraMode === 'firstPerson') {
        const laneX = player.model ? player.model.position.x : 0;

        camera.position.set(laneX, 3.2, 0);
        camera.rotation.set(0, 0, 0);

        if (player.model) player.model.visible = false;
    }
};

const toggleCameraMode = () => {
    cameraMode = cameraMode === 'thirdPerson' ? 'firstPerson' : 'thirdPerson';
    updateCameraMode();
};

// const bindCameraButtons = () => {
//     const btn = document.getElementById('btn-camera');
//     if (btn) {
//         btn.onclick = () => {
//             toggleCameraMode();
//             btn.innerText = cameraMode === 'thirdPerson'
//                 ? 'Góc nhìn: 3rd'
//                 : 'Góc nhìn: 1st';
//         };
//     }

// //     const mobileBtn = document.getElementById('btn-camera-mobile');
// //     if (mobileBtn) {
// //         mobileBtn.onclick = () => {
// //             if (!gameActive) return;
// //             toggleCameraMode();

// //             const desktopBtn = document.getElementById('btn-camera');
// //             if (desktopBtn) {
// //                 desktopBtn.innerText = cameraMode === 'thirdPerson'
// //                     ? 'Góc nhìn: 3rd'
// //                     : 'Góc nhìn: 1st';
// //             }
// //         };
// //     }
// };

const bindCameraButtons = () => {
    const btn = document.getElementById('btn-camera');
    if (btn) {
        btn.onclick = () => {
            if (!gameActive) return;

            toggleCameraMode();
            btn.innerText = cameraMode === 'thirdPerson'
                ? 'Góc nhìn: 3rd'
                : 'Góc nhìn: 1st';
        };
    }
};

// Camera gắn vào player
player.group.add(camera);
updateCameraMode();

bindCameraButtons();

// State game
let score = 0;
let coins = 0;
let speed = CONFIG.START_SPEED;

let isTurning = false;
let turnTime = 0;
let turnDirection = 1;

let seasonTimer = 0;
const SEASON_DURATION = 5; // 20 giây đổi mùa
let waitingForSeasonPortal = false;
let isChangingSeason = false;

let lastFootstepTime = 0;
const FOOTSTEP_INTERVAL = 0.25; // seconds between footsteps

renderer.render(scene, camera);

const getSelectedCameraModeFromMenu = () => {
    const selected = document.querySelector('#container-camera .selected');
    return selected?.dataset.camera || 'thirdPerson';
};

const startGame = async (selectedPlayerId, selectedMonsterId) => {
    document.getElementById('ui').innerText = 'Loading Models...';

    cameraMode = getSelectedCameraModeFromMenu();

    try {
        await soundManager.init();

        // Dừng nhạc menu, bắt đầu nhạc game
        soundManager.stopMenuMusic();
        soundManager.stopAmbient(); // Đảm bảo dừng mọi nhạc đang phát
        // reset state nếu chơi lại
        gameActive = false;
        score = 0;
        coins = 0;
        speed = CONFIG.START_SPEED;
        isTurning = false;
        turnTime = 0;
        turnDirection = 1;

        spawner.clearWorld();
        planeEvent.reset();
        dragonEvent.reset(true);
        elkEvent.reset();
        snowEffect.deactivate();
        cherryBlossom.deactivate();
        waterEffect.deactivate();

        await Promise.all([
            player.loadModel(selectedPlayerId),
            monster.loadModel(selectedMonsterId),
            planeEvent.loadModel(),
            dragonEvent.loadModel(),
            elkEvent.loadModel(),
            cherryBlossom.loadModel(),
            waterEffect.init()
        ]);

        // Khởi tạo environment theo mùa hiện tại
        // Nếu bạn đã viết env.init() thì dùng env.init()
        if (env.loadTreeModelForSeason) {
            await env.loadTreeModelForSeason();
        } else if (env.loadTreeModel) {
            await env.loadTreeModel();
        }

        if (env.initGround) env.initGround();
        if (env.initTrees) env.initTrees();
        if (env.applySeasonLighting) env.applySeasonLighting();
        if (env.initLampsForSeason) await env.initLampsForSeason();

        // Camera intro: chỉ khi chọn góc nhìn thứ 3 (thấy được monster)
        const playerX = player.model?.position.x || 0;
        const playerZ = player.group.position.z;

        if (cameraMode === 'thirdPerson') {
            // Vị trí bắt đầu: xa phía sau player (để thấy monster)
            const introPos = new THREE.Vector3(playerX, 10, playerZ + 50);
            // Vị trí kết thúc: vị trí thirdPerson bình thường
            const normalPos = new THREE.Vector3(playerX, 5, playerZ + 12);

            cameraIntro.active = true;
            cameraIntro.endTime = performance.now() + cameraIntro.duration * 1000;
            cameraIntro.startPos.copy(introPos);
            cameraIntro.targetPos.copy(normalPos);

            camera.position.copy(introPos);
            camera.rotation.set(-0.2, 0, 0);
        } else {
            // Góc nhìn thứ 1: đặt luôn vị trí bình thường
            cameraIntro.active = false;
            updateCameraMode();
        }

        gameActive = true;

        soundManager.startAmbientForSeason(env.currentSeasonIndex);

        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) mobileControls.style.display = 'flex';
        document.getElementById('msg').style.display = 'none';
        document.getElementById('ui').innerHTML =
    'DIST: <span id="score">0</span>m<br>COINS: <span id="coinCount">0</span><br><button id="btn-camera">Góc nhìn: 3rd</button>';
        
        bindCameraButtons();

        clock.start();
        spawnLoop();
        animate();
    } catch (error) {
        console.error('LỖI TẢI MODEL:', error);
        document.getElementById('ui').innerText = 'LỖI TẢI MODEL!';
    }
};

new UIManager({ onStartGame: startGame });

// Hướng dẫn Modal
const helpBtn = document.getElementById('btn-help');
const helpModal = document.getElementById('help-modal');
const closeBtn = document.querySelector('.close-btn');

if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => {
        helpModal.classList.add('show');
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            helpModal.classList.remove('show');
        });
    }

    // Đóng modal khi click bên ngoài
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('show');
        }
    });

    // Đóng modal khi bấm ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && helpModal.classList.contains('show')) {
            helpModal.classList.remove('show');
        }
    });
}

document.querySelectorAll('#container-camera .camera-option').forEach(btn => {
    btn.addEventListener('click', () => {
        document
            .querySelectorAll('#container-camera .camera-option')
            .forEach(b => b.classList.remove('selected'));

        btn.classList.add('selected');
    });
});

const triggerFlash = () => {
    const flashEl = document.getElementById('flash');
    flashEl.classList.add('trigger-flash');
    setTimeout(() => flashEl.classList.remove('trigger-flash'), 500);
};

const attemptTurn = (dir) => {
    const marker = spawner.activeTurnWall;
    if (!marker) return false;

    const pZ = player.group.position.z;
    const mZ = marker.position.z;

    if (Math.abs(pZ - mZ) < 15 && marker.userData.dir === dir) {
        triggerFlash();

        isTurning = true;
        turnTime = 0.3;
        turnDirection = dir === 'left' ? 1 : -1;

        // reset world position để fake turn
        player.group.position.set(0, 0, 0);

        // Nếu Player.turn nhận direction thì truyền vào
        if (player.turn.length > 0) {
            player.turn(dir === 'left' ? 1 : -1);
        } else {
            player.turn();
        }

        spawner.clearWorld();
        elkEvent.reset();
        env.initGround();
        env.initTrees();
        if (env.initLampsForSeason) env.initLampsForSeason();

        return true;
    }

    return false;
};

new InputManager({
    onLeft: () => {
        if (!gameActive) return;
        if (!attemptTurn('left') && player.currentLane > 0) {
            player.currentLane--;
        }
    },
    onRight: () => {
        if (!gameActive) return;
        if (!attemptTurn('right') && player.currentLane < 2) {
            player.currentLane++;
        }
    },
    onJump: () => {
        if (gameActive) player.jump();
    }
});

window.addEventListener('keydown', (e) => {
    if ((e.key === 'c' || e.key === 'C') && gameActive) {
        toggleCameraMode();

        const btn = document.getElementById('btn-camera');
        if (btn) {
            btn.innerText = cameraMode === 'thirdPerson'
                ? 'Góc nhìn: 3rd'
                : 'Góc nhìn: 1st';
        }
    }

    if ((e.key === 'b' || e.key === 'B') && gameActive) {
        spawner.shootFighterJet(player);
    }
});

const addCoin = () => {
    coins++;
    document.getElementById('coinCount').innerText = coins;
    soundManager.playCoinSound();
};

const gameOver = (reason) => {
    gameActive = false;
    soundManager.stopAmbient();
    spawner.deactivateMagnet();
    spawner.deactivateFighterJet();
    spawner.clearFighterJetShots();

    if (spawnTimeout) {
        clearTimeout(spawnTimeout);
        spawnTimeout = null;
    }

    document.getElementById('msg').style.display = 'block';
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) mobileControls.style.display = 'none';
    document.getElementById('death-title').innerText = reason || 'GAME OVER';
    document.getElementById('final-stats').innerText =
        `Quãng đường: ${Math.floor(score / 10)}m | Vàng: ${coins}`;

    if (reason && reason.includes('SUỐI')) {
        soundManager.playRiverSound();
    } else {
        soundManager.playObstacleSound();
    }
};


// const seasonChange = async () => {
//     if (isChangingSeason) return;
//     isChangingSeason = true;

//     triggerFlash();
//     await env.triggerSeasonChange();

//     waitingForSeasonPortal = false;
//     isChangingSeason = false;
// };

const seasonChange = async () => {
    if (isChangingSeason) return;
    isChangingSeason = true;

    try {
        triggerFlash();
        await env.triggerSeasonChange();
        soundManager.startAmbientForSeason(env.currentSeasonIndex);
        waitingForSeasonPortal = false;
    } catch (err) {
        console.error('Lỗi chuyển mùa:', err);
    } finally {
        isChangingSeason = false;
    }
};

async function spawnLoop() {
    if (!gameActive) return;

    try {
        await spawner.spawn(score, player.group.position.z);
    } catch (err) {
        console.error('LỖI SPAWN:', err);
    }

    const delay = Math.max(200, 800 / (speed * 1.2));
    spawnTimeout = setTimeout(spawnLoop, delay);
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.elapsedTime;

    bridgeTimer += delta;

    // Bridge disabled
    // if (bridgeTimer >= CONFIG.BRIDGE.interval) {
    //     bridgeTimer = 0;
    //     if (!env.activeBridge) {
    //         env.spawnBridgeSegment(player.group.position.z - CONFIG.BRIDGE.spawnAhead);
    //     }
    // }

    if (!waitingForSeasonPortal) {
        seasonTimer += delta;

        if (seasonTimer >= SEASON_DURATION) {
            seasonTimer = 0;
            waitingForSeasonPortal = true;
            spawner.forceSpawnSeasonPortal = true;
        }
    }

    // 1. Player update
    player.update(delta, time, speed);

    // Âm thanh bước chân (không phải mùa đông)
    if (env.currentSeasonIndex !== 3) {
        lastFootstepTime += delta;
        if (lastFootstepTime >= FOOTSTEP_INTERVAL) {
            soundManager.playFootstepSound();
            lastFootstepTime = 0;
        }
    }


    // Camera intro: trong 5s đầu camera đứng xa sau player rồi bay về vị trí bình thường
    if (cameraIntro.active) {
        const elapsed = performance.now() - (cameraIntro.endTime - cameraIntro.duration * 1000);
        const progress = Math.min(elapsed / (cameraIntro.duration * 1000), 1);

        // Easing: easeOutCubic để bay mượt
        const eased = 1 - Math.pow(1 - progress, 3);

        // Interpolate vị trí camera
        camera.position.lerpVectors(cameraIntro.startPos, cameraIntro.targetPos, eased);

        if (progress >= 1) {
            cameraIntro.active = false;
            // Xóa monster khỏi scene sau intro
            if (monster.group) {
                scene.remove(monster.group);
            }
            // Đặt lại rotation về bình thường sau khi intro kết thúc
            camera.rotation.set(-0.2, 0, 0);
        }
    }

    // 1. First person camera follow
    if (cameraMode === 'firstPerson' && player.model) {
        const targetX = player.model.position.x;
        camera.position.x = THREE.MathUtils.lerp(
            camera.position.x,
            targetX,
            12 * delta
        );
    }

    // 2. Lấy vị trí player
    const pX = player.model ? player.model.position.x : player.group.position.x;
    const pZ = player.group.position.z;

    // 3. Event máy bay
    if (!planeEvent.active && !dragonEvent.active && score > 500 && Math.random() < 0.003) {
        planeEvent.start(pX, pZ);
    }

    // 3.5. Event rồng mùa xuân
    const dragonConfig = CONFIG.DRAGON_EVENT || {};
    const currentSeasonId = CONFIG.SEASONS[env.currentSeasonIndex]?.id;
    if (
        !dragonEvent.active &&
        !planeEvent.active &&
        currentSeasonId === (dragonConfig.season || 'spring') &&
        score > (dragonConfig.minScore || 100) &&
        Math.random() < (dragonConfig.spawnChance || 0.008)
    ) {
        dragonEvent.start(pX, pZ);
    }

    const elkConfig = CONFIG.ELK_CROSSING || {};
    if (
        !elkEvent.active &&
        score > (elkConfig.minScore || 150) &&
        Math.random() < (elkConfig.spawnChance || 0.004)
    ) {
        elkEvent.start(pZ);
    }

    // 4. Check vượt qua điểm rẽ
    if (spawner.activeTurnWall) {
        const mZ = spawner.activeTurnWall.position.z;
        if (pZ < mZ - 10) {
            gameOver('BẠN ĐÃ LAO RA KHỎI ĐƯỜNG!');
            return;
        }
    }

    // 5. Update entity
    monster.update(delta, time, pX, pZ);
    env.update(speed, pZ);
    spawner.update(speed, player, addCoin, gameOver, seasonChange, delta);
    planeEvent.update(delta, time, pX, pZ, spawner.obstacles);
    dragonEvent.update(delta, time, pX, pZ);
    elkEvent.update(delta, player, gameOver);
    
    snowEffect.setSeason(env.currentSeasonIndex === 3); // Chỉ mùa đông (index 3)
    snowEffect.update(pZ, delta);
    cherryBlossom.setSeason(env.currentSeasonIndex === 0); // Chỉ mùa xuân (index 0)
    cherryBlossom.update(delta, time, pZ);
    waterEffect.setSeason(env.currentSeasonIndex === 1); // Chỉ mùa hè (index 1)
    waterEffect.update(pZ);

    // 6. Ánh sáng
    sunLight.position.set(pX + 5, 25, pZ + 10);
    sunLight.target = player.group;

    // 7. Camera roll khi rẽ
    if (isTurning) {
        turnTime -= delta;
        camera.rotation.z = Math.sin(turnTime * Math.PI * 2) * 0.1 * turnDirection;

        if (turnTime <= 0) {
            isTurning = false;
            camera.rotation.z = 0;
        }
    }

    // 8. Score + speed
    score++;
    document.getElementById('score').innerText = Math.floor(score / 10);
    speed += CONFIG.SPEED_INC;

    renderer.render(scene, camera);
}
