import * as THREE from 'three';
import { CONFIG } from '../Config.js';

export function initScene() {
    const scene = new THREE.Scene();
    scene.background = CONFIG.WINTER_BG;
    scene.fog = new THREE.FogExp2(CONFIG.WINTER_BG, 0.025);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 14);
    camera.lookAt(0, 3, -10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xccffff, 0x111122, 1.2);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 25, 10);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -30; sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30; sunLight.shadow.camera.bottom = -30;
    scene.add(sunLight);

    // Xử lý resize màn hình
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer, sunLight, hemiLight };
}