// ============================================================
// LEGENDICE - dice3d.js (С ЦЕНТРИРОВАНИЕМ ДЛЯ ТЕЛЕФОНА)
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
let cameraAnimDuration = 1200;

// ------ СООТВЕТСТВИЕ ЭМОДЗИ → ЗНАЧЕНИЕ ------
const EMOJI_TO_VALUE = {
    '⚀': 1,
    '⚁': 2,
    '⚂': 3,
    '⚃': 4,
    '⚄': 5,
    '⚅': 6
};

// ----- ИНИЦИАЛИЗАЦИЯ -----
export function initDice3D() {
    const container = document.getElementById('dice-canvas-container');
    if (!container) return;
    
    // Функция обновления размеров
    function updateSize() {
        const rect = container.getBoundingClientRect();
        const width = rect.width || container.clientWidth || 300;
        const height = rect.height || container.clientHeight || 400;
        
        if (camera) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
        if (renderer) {
            renderer.setSize(width, height);
        }
    }
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 400;
    
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4, 6);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);
    
    const backLight = new THREE.DirectionalLight(0x8888ff, 0.5);
    backLight.position.set(-3, 5, -5);
    scene.add(backLight);
    
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
    
    // Ресайз с улучшенной обработкой
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateSize, 100);
    });
    
    window.addEventListener('orientationchange', () => {
        setTimeout(updateSize, 300);
    });
    
    setTimeout(updateSize, 50);
    
    animate();
    console.log('🎲 3D сцена инициализирована');
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (cameraAnimStartTime !== null && cameraStartPos !== null && cameraEndPos !== null) {
        const elapsed = Date.now() - cameraAnimStartTime;
        const progress = Math.min(elapsed / cameraAnimDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        camera.position.x = cameraStartPos.x + (cameraEndPos.x - cameraStartPos.x) * eased;
        camera.position.y = cameraStartPos.y + (cameraEndPos.y - cameraStartPos.y) * eased;
        camera.position.z = cameraStartPos.z + (cameraEndPos.z - cameraStartPos.z) * eased;
        
        if (cameraStartLook && cameraEndLook) {
            const lookX = cameraStartLook.x + (cameraEndLook.x - cameraStartLook.x) * eased;
            const lookY = cameraStartLook.y + (cameraEndLook.y - cameraStartLook.y) * eased;
            const lookZ = cameraStartLook.z + (cameraEndLook.z - cameraStartLook.z) * eased;
            camera.lookAt(lookX, lookY, lookZ);
        }
        
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

function animateCameraToTop() {
    cameraStartPos = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
    };
    
    cameraEndPos = {
        x: 0,
        y: 5.5,
        z: 0.01
    };
    
    cameraStartLook = { x: 0, y: 0, z: 0 };
    cameraEndLook = { x: 0, y: 0, z: 0 };
    
    cameraAnimStartTime = Date.now();
}

// ============================================================
// ТЕКСТУРА С ЭМОДЗИ (УВЕЛИЧЕННЫЙ ШРИФТ)
// ============================================================
function createFaceTexture(emoji, bgColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 128, 128);
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(2, 2, 124, 124);
    
    ctx.font = '200px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(emoji, 64, 70);
    
    return new THREE.CanvasTexture(canvas);
}

// ============================================================
// ОПРЕДЕЛЕНИЕ ЗНАЧЕНИЯ ПО ТЕКСТУРЕ ВЕРХНЕЙ ГРАНИ
// ============================================================
function getValueFromTopFace(mesh) {
    const material = mesh.material[2];
    if (!material || !material.map) return 0;
    
    const canvas = material.map.image;
    if (!canvas) return 0;
    
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.getImageData(30, 30, 68, 68);
    const data = imageData.data;
    let blackCount = 0;
    let totalChecked = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r < 50 && g < 50 && b < 50) {
            blackCount++;
        }
        totalChecked++;
    }
    
    const ratio = blackCount / totalChecked;
    let value = 1;
    if (ratio < 0.01) value = 1;
    else if (ratio < 0.03) value = 2;
    else if (ratio < 0.06) value = 3;
    else if (ratio < 0.10) value = 4;
    else if (ratio < 0.15) value = 5;
    else value = 6;
    
    return value;
}

// ============================================================
// СОЗДАНИЕ КУБИКА
// ============================================================
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
    mesh.userData.value = value;
    return mesh;
}

// ============================================================
// ОПРЕДЕЛЕНИЕ ЗНАЧЕНИЙ ПОСЛЕ ОСТАНОВКИ
// ============================================================
function getDiceValues() {
    const values = [];
    diceMeshes.forEach(mesh => {
        const value = getValueFromTopFace(mesh);
        values.push(value);
    });
    return values;
}

// ============================================================
// БРОСОК КУБИКОВ
// ============================================================
export function rollDiceWithValues(values, callback = null) {
    if (isRolling) return;
    isRolling = true;
    rollCompleteCallback = callback;
    
    clearDice();
    
    const container = document.getElementById('dice-container');
    const result = document.getElementById('dice-result');
    container.style.display = 'flex';
    result.style.display = 'none';
    
    cameraAnimStartTime = null;
    cameraStartPos = null;
    cameraEndPos = null;
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
        
        const targetRotX = (Math.random() - 0.5) * Math.PI * 2;
        const targetRotY = (Math.random() - 0.5) * Math.PI * 2;
        const targetRotZ = (Math.random() - 0.5) * Math.PI * 2;
        
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
                    
                    if (!alignStarted) {
                        alignStarted = true;
                        setTimeout(() => {
                            animateCameraToTop();
                        }, 200);
                    }
                    
                    setTimeout(() => {
                        const detectedValues = getDiceValues();
                        console.log('🎲 Определённые значения:', detectedValues);
                        
                        result.style.display = 'block';
                        if (rollCompleteCallback) {
                            if (detectedValues.length === count && detectedValues.every(v => v > 0)) {
                                rollCompleteCallback(detectedValues);
                            } else {
                                rollCompleteCallback(values);
                            }
                        }
                    }, 1500);
                }
            }
        }
        setTimeout(updateFall, i * 100);
    });
}

// ============================================================
// ОЧИСТКА И ЗАКРЫТИЕ
// ============================================================
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

export function closeDiceModal() {
    clearDice();
    document.getElementById('dice-container').style.display = 'none';
    document.getElementById('dice-result').style.display = 'none';
    document.getElementById('dice-close-btn').style.display = 'none';
    isRolling = false;
    
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
