import * as THREE from 'three';

export class WaterEffect {
    constructor(scene) {
        this.scene = scene;
        this.leftWater = null;
        this.rightWater = null;
        this.isActive = false;
        this.waterMaterial = null;
        this.waterSpeed = 0.02;
        this.waterCanvas = null;
        this.waterContext = null;
        this.waterTexture = null;
    }

    async init() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        this.waterCanvas = canvas;
        this.waterContext = canvas.getContext('2d');

        this.waterTexture = new THREE.CanvasTexture(canvas);
        this.waterTexture.wrapS = THREE.RepeatWrapping;
        this.waterTexture.wrapT = THREE.RepeatWrapping;
        this.waterTexture.repeat.set(4, 20);

        this.waterMaterial = new THREE.MeshStandardMaterial({
            map: this.waterTexture,
            color: 0x4a90d9,
            roughness: 0.3,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9
        });

        this.createWaterPlanes();
        return Promise.resolve();
    }

    createWaterPlanes() {
        const roadWidth = 14;
        const waterSize = 2000; // Rất lớn để bao phủ không gian

        // Plane nước phủ toàn bộ phía dưới - bên dưới cả ground
        const mainGeo = new THREE.PlaneGeometry(waterSize, waterSize);
        this.mainWater = new THREE.Mesh(mainGeo, this.waterMaterial);
        this.mainWater.rotation.x = -Math.PI / 2;
        this.mainWater.position.set(0, -3, -waterSize / 2 + 200); // Dưới ground
        this.mainWater.receiveShadow = true;
        this.mainWater.visible = false;
        this.scene.add(this.mainWater);

        // Plane bên trái
        const leftGeo = new THREE.PlaneGeometry(waterSize, waterSize);
        this.leftWater = new THREE.Mesh(leftGeo, this.waterMaterial);
        this.leftWater.rotation.x = -Math.PI / 2;
        this.leftWater.rotation.z = -Math.PI / 2;
        this.leftWater.position.set(-roadWidth / 2 - waterSize / 2, -2, -waterSize / 2);
        this.leftWater.receiveShadow = true;
        this.leftWater.visible = false;
        this.scene.add(this.leftWater);

        // Plane bên phải
        const rightGeo = new THREE.PlaneGeometry(waterSize, waterSize);
        this.rightWater = new THREE.Mesh(rightGeo, this.waterMaterial);
        this.rightWater.rotation.x = -Math.PI / 2;
        this.rightWater.rotation.z = Math.PI / 2;
        this.rightWater.position.set(roadWidth / 2 + waterSize / 2, -2, -waterSize / 2);
        this.rightWater.receiveShadow = true;
        this.rightWater.visible = false;
        this.scene.add(this.rightWater);
    }

    updateTexture() {
        const ctx = this.waterContext;
        const width = this.waterCanvas.width;
        const height = this.waterCanvas.height;

        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#0077b6');
        gradient.addColorStop(0.3, '#00a8e8');
        gradient.addColorStop(0.5, '#00a8e8');
        gradient.addColorStop(0.7, '#0077b6');
        gradient.addColorStop(1, '#0077b6');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 8; i++) {
            const y = (Math.sin(Date.now() * 0.001 + i) * 20) + i * 32;
            ctx.beginPath();
            ctx.ellipse(width / 2, y, width * 0.4, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let i = 0; i < 5; i++) {
            const x = (Math.cos(Date.now() * 0.0005 + i * 2) * 50) + width / 2;
            const y = (Math.sin(Date.now() * 0.0008 + i * 1.5) * 40) + height / 2;
            ctx.beginPath();
            ctx.ellipse(x, y, 20, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.waterTexture) {
            this.waterTexture.needsUpdate = true;
        }
    }

    setSeason(isSummer) {
        if (isSummer && !this.isActive) {
            this.activate();
        } else if (!isSummer && this.isActive) {
            this.deactivate();
        }
    }

    activate() {
        if (this.isActive) return;
        this.isActive = true;

        if (this.mainWater) this.mainWater.visible = true;
        if (this.leftWater) this.leftWater.visible = true;
        if (this.rightWater) this.rightWater.visible = true;
    }

    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;

        if (this.mainWater) this.mainWater.visible = false;
        if (this.leftWater) this.leftWater.visible = false;
        if (this.rightWater) this.rightWater.visible = false;
    }

    update(playerZ) {
        if (!this.isActive) return;

        this.updateTexture();

        // Không cần di chuyển theo player - water plane đã đủ lớn và đứng yên
        // Chỉ animation texture offset để tạo hiệu ứng nước chảy
        if (this.waterTexture) {
            this.waterTexture.offset.y -= this.waterSpeed;
        }
    }
}
