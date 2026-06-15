import * as THREE from 'three';

export const CONFIG = {
    LANE_WIDTH: 3,
    LANES: [-3, 0, 3],
    ROAD_WIDTH: 14, 
    START_SPEED: 0.5,
    SPEED_INC: 0.00005, // Tốc độ tăng chậm hơn, mỗi mùa 10s
    
    // --- CÁC THÔNG SỐ VỀ KÍCH THƯỚC ĐƯỜNG ---
    TILE_LENGTH: 50,      // Độ dài mỗi mảnh đường (khớp với Environment.js)
    TURN_DISTANCE: 60,    // Khoảng cách xuất hiện ngã rẽ (khớp với Spawner.js)
    
    SEASONS: [
        {
            id: 'spring',
            name: 'Xuân',
            bgColor: new THREE.Color(0xdff6dd),
            fogColor: new THREE.Color(0xdff6dd),
            hemiLightColor: new THREE.Color(0xdff6dd),
            portalColor: 0xff9ecf,
            roadTexture: 'road_spring.jpg',
            treeModel: 'sakura_tree.glb',
            treeScale: 10,
            obstacleTheme: 'spring',
            riverColor: 0x0099cc  // Cùng màu bg mùa hè
        },
        {
            id: 'summer',
            name: 'Hạ',
            bgColor: new THREE.Color(0xfff0b3),
            fogColor: new THREE.Color(0xfff0b3),
            hemiLightColor: new THREE.Color(0xfff0b3),
            portalColor: 0xffc300,
            roadTexture: 'road_summer.jpg',
            treeModel: 'palm_tree.glb',
            treeScale: 2.5,
            obstacleTheme: 'summer',
            riverColor: 0x0099cc  // Cùng màu bg mùa hè
        },
        {
            id: 'autumn',
            name: 'Thu',
            bgColor: new THREE.Color(0x1b1024),
            fogColor: new THREE.Color(0x2a1433),
            hemiLightColor: new THREE.Color(0x6a4a7a),
            portalColor: 0xff7a00,
            roadTexture: 'road_autumn.jpg',
            treeModel: 'autumn_maple.glb',
            treeScale: 5.0,
            obstacleTheme: 'autumn',
            riverColor: 0x0099cc  // Cùng màu bg mùa hè
        },
        {
            id: 'winter',
            name: 'Đông',
            bgColor: new THREE.Color(0xcceeff),
            fogColor: new THREE.Color(0xcceeff),
            hemiLightColor: new THREE.Color(0xcceeff),
            portalColor: 0x8fd3ff,
            roadTexture: 'road_winter.jpg',
            treeModel: 'christmas_tree_2.glb',
            treeScale: 0.25,
            obstacleTheme: 'winter',
            riverColor: 0xADD8E6  // Light blue đóng băng
        }
    ],

    OBSTACLE_TYPES: [
        {
            id: 'rock_box',
            type: 'low',
            spawnMode: 'code',
            geometry: 'box',
            size: { x: 3, y: 1.2, z: 1 },
            positionY: 0.6,
            seasons: []
        },
        {
            id: 'table_flower',
            type: 'low',
            spawnMode: 'glb',
            file: 'table_with_flowers.glb',
            scale: 1,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['spring']
        },
        {
            id: 'sunflower',
            type: 'low',
            spawnMode: 'glb',
            file: 'sunflower.glb',
            scale: 0.015,
            positionY: 0,
            rotation: { x: 0, y: -Math.PI / 2, z: 0 },
            seasons: ['spring']
        },
        {
            id: 'vietnamese_lantern',
            type: 'low',
            spawnMode: 'glb',
            file: 'vietnamese_lantern.glb',
            scale: 1.25,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['spring']
        },
        {
            id: 'flower_lib',
            type: 'low',
            spawnMode: 'glb',
            file: 'flowers_lib.glb',
            scale: 1,
            positionY: -1.5,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['spring']
        },
        {
            id: 'cone_spike',
            type: 'low',
            spawnMode: 'code',
            geometry: 'cone',
            radius: 1,
            height: 2,
            radialSegments: 8,
            positionY: 1,
            seasons: ['summer'],
            texture: '/assets/textures/cone_spike.png'
        },
        {
            id: 'torus_obstacle',
            type: 'low',
            spawnMode: 'code',
            geometry: 'torus',
            radius: 1.2,        // Vòng tròn ở giữa nhỏ lại
            tube: 0.5,          // Thanh vòng dày hơn
            radialSegments: 16,
            tubularSegments: 100,
            positionY: 1.5,
            rotation: { x: 0, y: 0, z: 0 },  // Không xoay - hướng về phía player
            seasons: ['summer'],
            texture: '/assets/textures/torus_rainbow.jpg'
        },
        {
            id: 'beach_ball',
            type: 'low',
            spawnMode: 'code',
            geometry: 'sphere',
            radius: 1,
            widthSegments: 32,
            heightSegments: 32,
            positionY: 1,
            color: 0xffffff,
            seasons: ['summer'],
            texture: '/assets/textures/beach_ball.png'
        },
        {
            id: 'pumpkin',
            type: 'low',
            spawnMode: 'glb',
            file: 'pumpkin.glb',
            scale: 1,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['autumn']
        },
        {
            id: 'trefoil_obstacle',
            type: 'low',
            spawnMode: 'code',
            geometry: 'trefoil',
            radius: 1.2,
            tube: 0.3,
            tubularSegments: 64,
            radialSegments: 8,
            positionY: 1.5,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['summer']
        },
        {
            id: 'candy_cane',
            type: 'low',
            spawnMode: 'glb',
            file: 'candy_cane.glb',
            scale: 2,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['winter']
        },
        {
            id: 'santa_claus',
            type: 'low',
            spawnMode: 'glb',
            file: 'santa_claus.glb',
            scale: 0.01,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['winter']
        },
        {
            id: 'nutcracker',
            type: 'low',
            spawnMode: 'glb',
            file: 'nutcracker.glb',
            scale: 2,
            positionY: 0,
            rotation: { x: 0, y: -Math.PI / 2, z: 0 },
            seasons: ['winter', 'autumn', 'spring', 'summer']
        }
    ],

    PATH_ASSETS: 'https://r2-proxy.23520899.workers.dev/public/assets/', 

    STREET_LAMP: {
        file: 'simple_street_lamp.glb',
        targetHeight: 7,
        spacing: 120,
        rows: 7,
        startOffset: 90,
        offsetFromRoad: 1.4,
        lightColor: 0xff9a3d,
        lightIntensity: 8,
        lightDistance: 30,
        lightHeight: 5.3,
        lightAngle: Math.PI * 0.28,
        lightPenumbra: 0.5,
        bulbSize: 0.18,
        poolRadius: 4.4,
        poolOpacity: 0.3
    },

    ELK_CROSSING: {
        file: 'elk_wip.glb',
        seasons: ['spring', 'autumn'],
        scale: 1,
        rotationY: Math.PI / 2,
        positionY: 0,
        spawnAhead: 45,
        sideOffset: 13,
        speed: 9,
        minScore: 30,
        spawnChance: 0.006,
        collisionX: 1.35,
        collisionZ: 1.7,
        collisionHeight: 1.25
    },

    DRAGON_EVENT: {
        season: 'spring',
        minScore: 100,
        spawnChance: 0.008
    },

    MAGNET_POWERUP: {
        file: 'magnet.glb',
        scale: 0.01,
        positionY: 1.3,
        minScore: 80,
        spawnChance: 0.18,
        duration: 5,
        attractionRadius: 16,
        attractionSpeed: 18,
        collectDistance: 1.1,
        auraRadius: 2.2
    },

    COIN_LINE: {
        minCount: 10,
        maxCount: 20,
        spacing: 3.2,
        chance: 0.65
    },

    FIGHTER_JET_POWERUP: {
        file: 'fighter_jet.glb',
        activeScale: 0.01,
        pickupScale: 0.018,
        pickupY: 1.8,
        minScore: 120,
        spawnChance: 0.08,
        duration: 10,
        followOffsetX: 1.05,
        followOffsetY: 3.0,
        followOffsetZ: 0.5,
        rotationY: Math.PI / 2,
        shotLength: 55,
        shotRadius: 0.08,
        shotDuration: 0.22,
        shotForwardOffset: 6,
        shotColor: 0xffd400,
        obstacleClearX: 1.8,
        obstacleClearZ: 2.2
    },
    
    PLAYERS: [
        { id: 'player_v1', name: 'Chiến Sĩ', file: 'player_v1.glb', scale: 0.02, rotationY: Math.PI, positionY: 0 },
        { id: 'super_bunny', name: 'Super Bunny', file: 'super_bunny_final.glb', scale: 1, rotationY: Math.PI / 2, positionY: 1 }
    ],
    MONSTERS: [
        { id: 'demon_v1', name: 'Quỷ Lửa', file: 'demon.glb', scale: 1.5, rotationY: 0, positionY: 0 }, // Đổi tên file cho đúng
    ],

    BRIDGE: {
        file: 'bridge.glb',
        interval: 30,
        scale: 0.25,
        length: 58,
        spawnAhead: 80,
        modelOffsetY: -12.6
    }
};
