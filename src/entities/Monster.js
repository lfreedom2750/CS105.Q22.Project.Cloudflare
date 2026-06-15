import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class Monster {
    constructor(scene) {
        this.group = new THREE.Group();
        // Đặt vị trí ban đầu
        this.group.position.set(0, 0, 15);
        scene.add(this.group);

        // --- State GLB & Animation ---
        this.model = null;
        this.mixer = null;
        this.animationsMap = {};
        this.currentAction = null;
    }

    // THÊM MỚI: Hàm load model giống hệt Player
    async loadModel(monsterId) {
        // Tìm thông tin file từ ID
        const monsterInfo = CONFIG.MONSTERS.find(m => m.id === monsterId);
        const fileName = monsterInfo ? monsterInfo.file : CONFIG.MONSTERS[0].file;

        const loader = new GLTFLoader();
        // Load file .glb
        const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${fileName}`);
        
        this.model = gltf.scene;
        // Bật đổ bóng
        this.model.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; }});
        
        // Tăng scale lên gấp 100000 lần để monster khổng lồ
        this.model.scale.set(2, 2, 2); 
        
        // Xoay 180 độ
        this.model.rotation.y = Math.PI; 

        this.group.add(this.model);

        // --- XỬ LÝ HOẠT ẢNH ---
        if (gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.model);
            
            // Giả sử quái vật có animation 'Run' hoặc lấy đại animation đầu tiên
            const clipRun = THREE.AnimationClip.findByName(gltf.animations, 'Run') || gltf.animations[0];
            
            // Ép quái vật chạy lặp vô hạn
            this.animationsMap['Run'] = this.mixer.clipAction(clipRun).setLoop(THREE.LoopRepeat);
            
            this.currentAction = this.animationsMap['Run'];
            if(this.currentAction) this.currentAction.play();
        }
    }

    // SỬA: update nhận thêm `delta` và `targetX`
    update(delta, time, targetX, playerZ = 0) {
        // --- 1. Cập nhật Animation Mixer ---
        if (this.mixer) this.mixer.update(delta);

        // --- 2. Cập nhật Vị trí (Di chuyển mượt) ---
        // X: Chạy theo làn của Player
        this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, targetX, 0.04);

        // Y: Nâng monster lên cao hơn
        this.group.position.y = 1;

        // Z: Monster ở phía SAU player, tăng khoảng cách lên
        this.group.position.z = playerZ + 20 + Math.sin(time) * 1.5;
    }
}