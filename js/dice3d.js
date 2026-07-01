// ============================================================
// LEGENDICE - dice3d.js (С АНИМАЦИЕЙ КАМЕРЫ)
// ============================================================

let scene, camera, renderer;
let diceMeshes = [];
let isRolling = false;
let animationId = null;
let rollCompleteCallback = null;

// ------ ПАРАМЕТРЫ КАМЕРЫ ДЛЯ АНИМАЦИИ ------
let cameraStartPos = null;
let cameraEndPos = null;
let cameraStartLook = null;
let cameraEndLook = null;
let cameraAnimStartTime = null;
let cameraAnimDuration = 1200; // 1.2 секунды

// ----- ИНИЦИАЛИЗАЦИЯ 3D СЦЕНЫ -----
export function initDice3D() {
    const container = document.getElementById('dice-canvas-container');
    if (!container) return;
    
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 400;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // Начальная позиция: вид под углом 45 градусов
    camera.position.set(0, 4, 6);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Свет
    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);
    
    const backLight = new THREE.DirectionalLight(0x8888ff, 0.5);
    backLight.position.set(-3, 5, -5);
    scene.add(backLight);
    
    // Стол
    const tableGeo = new THREE.PlaneGeometry(6, 6);
    const tableMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a4a,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.5;
    table.receiveShadow = true;
    scene.add(table);
    
    const gridHelper = new THREE.GridHelper(6, 6, 0x444466, 0x333355);
    gridHelper.position.y = -0.4;
    scene.add(gridHelper);
    
    window.addEventListener('resize', () => {
        const w = container.clientWidth || 300;
        const h = container.clientHeight || 400;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
    
    animate();
    console.log('🎲 3D сцена инициализирована');
}

// ----- ГЛАВНЫЙ ЦИКЛ АНИМАЦИИ (С ДВИЖЕНИЕМ КАМЕРЫ) -----
function animate() {
    animationId = requestAnimationFrame(animate);
    
    // Анимация камеры
    if (cameraAnimStartTime !== null && cameraStartPos !== null && cameraEndPos !== null) {
        const elapsed = Date.now() - cameraAnimStartTime;
        const progress = Math.min(elapsed / cameraAnimDuration, 1);
        
        // Плавное замедление (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // Интерполяция позиции камеры
        camera.position.x = cameraStartPos.x + (cameraEndPos.x - cameraStartPos.x) * eased;
        camera.position.y = cameraStartPos.y + (cameraEndPos.y - cameraStartPos.y) * eased;
        camera.position.z = cameraStartPos.z + (cameraEndPos.z - cameraStartPos.z) * eased;
        
        // Интерполяция точки, куда смотрит камера
        if (cameraStartLook && cameraEndLook) {
            const lookX = cameraStartLook.x + (cameraEndLook.x - cameraStartLook.x) * eased;
            const lookY = cameraStartLook.y + (cameraEndLook.y - cameraStartLook.y) * eased;
            const lookZ = cameraStartLook.z + (cameraEndLook.z - cameraStartLook.z) * eased;
            camera.lookAt(lookX, lookY, lookZ);
        }
        
        // Завершение анимации камеры
        if (progress >= 1) {
            cameraAnimStartTime = null;
            cameraStartPos = null;
            cameraEndPos = null;
            cameraStartLook = null;
            cameraEndLook = null;
        }
    }
    
    renderer.render(scene, camera);
}

// ----- ЗАПУСК АНИМАЦИИ КАМЕРЫ К ВИДУ СВЕРХУ -----
function animateCameraToTop() {
    // Запоминаем текущее состояние камеры
    cameraStartPos = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
    };
    
    // Целевая позиция: вид сверху (90 градусов)
    cameraEndPos = {
        x: 0,
        y: 5.5,
        z: 0.01  // небольшое смещение, чтобы не было точного 0, иначе камера может "зависнуть"
    };
    
    // Запоминаем текущую точку обзора
    const lookTarget = new THREE.Vector3(0, 0, 0);
    camera.getWorldDirection(lookTarget);
    const currentLook = new THREE.Vector3(0, 0, 0);
    camera.getWorldPosition(currentLook);
    // Проще: просто запоминаем, куда смотрит камера
    const lookAtTarget = new THREE.Vector3(0, 0, 0);
    camera.lookAt(lookAtTarget);
    
    cameraStartLook = { x: 0, y: 0, z: 0 };
    cameraEndLook = { x: 0, y: 0, z: 0 };
    
    cameraAnimStartTime = Date.now();
}

// ----- ТЕКСТУРА С ЭМОДЗИ -----
function createFaceTexture(emoji, bgColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 128, 128);
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 124, 124);
    
    ctx.font = '120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(emoji, 64, 68);
    
    return new THREE.CanvasTexture(canvas);
}

// ----- ПРАВИЛЬНЫЕ ВРАЩЕНИЯ ДЛЯ КАЖДОЙ ГРАНИ -----
function getRotationForValue(value) {
    switch(value) {
        case 1: return { x: 0, y: -Math.PI / 2, z: 0 };  // ⚀
        case 2: return { x: 0, y: 0, z: 0 };              // ⚁
        case 3: return { x: 0, y: 0, z: -Math.PI / 2 };   // ⚂
        case 4: return { x: 0, y: 0, z: Math.PI / 2 };    // ⚃
        case 5: return { x: Math.PI / 2, y: 0, z: 0 };    // ⚄
        case 6: return { x: 0, y: Math.PI, z: 0 };        // ⚅
        default: return { x: 0, y: 0, z: 0 };
    }
}

// ----- СОЗДАНИЕ КУБИКА -----
function createDiceMesh(value) {
    const size = 0.9;
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const materials = emojis.map((emoji, index) => {
        const isSelected = (index + 1) === value;
        const texture = createFaceTexture(emoji, isSelected ? '#ffffaa' : '#f0f0ff');
        return new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.3,
            metalness: 0.1,
            emissive: isSelected ? new THREE.Color(0x444422) : new THREE.Color(0x000000),
            emissiveIntensity: isSelected ? 0.3 : 0
        });
    });
    
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// ----- БРОСОК КУБИКОВ -----
export function rollDiceWithValues(values, callback = null) {
    if (isRolling) return;
    isRolling = true;
    rollCompleteCallback = callback;
    
    clearDice();
    
    const container = document.getElementById('dice-container');
    const result = document.getElementById('dice-result');
    container.style.display = 'flex';
    result.style.display = 'none';
    
    // Сбрасываем анимацию камеры
    cameraAnimStartTime = null;
    cameraStartPos = null;
    cameraEndPos = null;
    
    // Возвращаем камеру в исходное положение (вид под углом)
    camera.position.set(0, 4, 6);
    camera.lookAt(0, 0, 0);
    
    const count = values.length;
    const spacing = 1.4;
    const totalWidth = (count - 1) * spacing;
    const positions = [];
    for (let i = 0; i < count; i++) {
        const x = (count > 1) ? (i / (count - 1)) * totalWidth - totalWidth / 2 : 0;
        positions.push(x);
    }
    
    let completed = 0;
    let alignStarted = false;
    
    positions.forEach((x, i) => {
        const value = values[i];
        const dice = createDiceMesh(value);
        dice.position.set(
            x + (Math.random() - 0.5) * 0.5,
            3 + Math.random() * 2,
            (Math.random() - 0.5) * 1.5
        );
        dice.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        scene.add(dice);
        diceMeshes.push(dice);
        
        const targetY = -0.3 + Math.random() * 0.1;
        const duration = 600 + Math.random() * 400;
        const startTime = Date.now();
        const startY = dice.position.y;
        const startRotX = dice.rotation.x;
        const startRotY = dice.rotation.y;
        const startRotZ = dice.rotation.z;
        
        const targetRot = getRotationForValue(value);
        const targetRotX = targetRot.x;
        const targetRotY = targetRot.y;
        const targetRotZ = targetRot.z;
        
        const offsetX = (Math.random() - 0.5) * 0.4;
        const offsetZ = (Math.random() - 0.5) * 0.4;
        
        function updateFall() {
            const elapsed = Date.now() - startTime;
            let progress = Math.min(elapsed / duration, 1);
            
            let eased;
            if (progress < 0.7) {
                const p = progress / 0.7;
                eased = p * p;
            } else {
                const p = (progress - 0.7) / 0.3;
                const bounce = Math.sin(p * Math.PI * 2) * 0.15 * (1 - p);
                eased = 1 + bounce;
            }
            
            const currentY = startY + (targetY - startY) * Math.min(eased, 1.1);
            dice.position.y = Math.max(currentY, targetY);
            
            const rollX = offsetX * (1 - progress);
            const rollZ = offsetZ * (1 - progress);
            dice.position.x = x + rollX;
            dice.position.z = rollZ;
            
            const rotProgress = 1 - Math.pow(1 - progress, 2);
            dice.rotation.x = startRotX + (targetRotX - startRotX) * rotProgress;
            dice.rotation.y = startRotY + (targetRotY - startRotY) * rotProgress * 1.5;
            dice.rotation.z = startRotZ + (targetRotZ - startRotZ) * rotProgress;
            
            if (progress < 1) {
                requestAnimationFrame(updateFall);
            } else {
                dice.position.y = targetY;
                dice.position.x = x;
                dice.position.z = 0;
                dice.rotation.x = targetRotX;
                dice.rotation.y = targetRotY;
                dice.rotation.z = targetRotZ;
                
                completed++;
                if (completed === count) {
                    isRolling = false;
                    
                    // ЗАПУСКАЕМ АНИМАЦИЮ КАМЕРЫ В МОМЕНТ ВЫРАВНИВАНИЯ
                    if (!alignStarted) {
                        alignStarted = true;
                        // Небольшая задержка перед движением камеры
                        setTimeout(() => {
                            animateCameraToTop();
                        }, 200);
                    }
                    
                    // Показываем результат через 1.5 секунды (после движения камеры)
                    setTimeout(() => {
                        result.style.display = 'block';
                        if (rollCompleteCallback) rollCompleteCallback(values);
                    }, 1500);
                }
            }
        }
        setTimeout(updateFall, i * 100);
    });
}

// ----- ОЧИСТКА -----
function clearDice() {
    diceMeshes.forEach(mesh => {
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => {
                    if (m.map) m.map.dispose();
                    m.dispose();
                });
            } else {
                if (mesh.material.map) mesh.material.map.dispose();
                mesh.material.dispose();
            }
        }
    });
    diceMeshes = [];
}

// ----- ЗАКРЫТИЕ -----
export function closeDiceModal() {
    clearDice();
    document.getElementById('dice-container').style.display = 'none';
    document.getElementById('dice-result').style.display = 'none';
    document.getElementById('dice-close-btn').style.display = 'none';
    isRolling = false;
    
    // Возвращаем камеру в исходное положение
    camera.position.set(0, 4, 6);
    camera.lookAt(0, 0, 0);
    cameraAnimStartTime = null;
    cameraStartPos = null;
    cameraEndPos = null;
}

export function rollDice(count = 2, callback = null) {
    const values = [];
    for (let i = 0; i < count; i++) {
        values.push(Math.floor(Math.random() * 6) + 1);
    }
    rollDiceWithValues(values, callback);
}

export default {
    initDice3D,
    rollDice,
    rollDiceWithValues,
    closeDiceModal
};
