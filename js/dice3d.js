// ============================================================
// LEGENDICE - dice3d.js (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ============================================================

let scene, camera, renderer;
let diceMeshes = [];
let isRolling = false;
let animationId = null;
let rollCompleteCallback = null;

// ----- ИНИЦИАЛИЗАЦИЯ 3D СЦЕНЫ -----
export function initDice3D() {
    const container = document.getElementById('dice-canvas-container');
    if (!container) return;
    
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 400;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 7);
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
    
    // Ресайз
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

function animate() {
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// ----- СОЗДАНИЕ ТЕКСТУРЫ ДЛЯ ГРАНИ С ЭМОДЗИ (УВЕЛИЧЕННЫЙ ШРИФТ) -----
function createFaceTexture(emoji, bgColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Фон
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 128, 128);
    
    // Рамка (тонкая)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 124, 124);
    
    // Текст (эмодзи) — увеличен до 120px для заполнения всей грани
    ctx.font = '120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(emoji, 64, 68);
    
    return new THREE.CanvasTexture(canvas);
}

// ----- ПОВОРОТ КУБИКА ДЛЯ НУЖНОЙ ГРАНИ СВЕРХУ -----
function getRotationForValue(value) {
    // Вращения для каждой грани, чтобы она оказалась сверху
    switch(value) {
        case 1: return { x: 0, y: 0, z: 0 };           // ⚀
        case 2: return { x: 0, y: 0, z: -Math.PI / 2 }; // ⚁
        case 3: return { x: 0, y: 0, z: Math.PI };      // ⚂
        case 4: return { x: 0, y: 0, z: Math.PI / 2 };  // ⚃
        case 5: return { x: Math.PI / 2, y: 0, z: 0 };  // ⚄
        case 6: return { x: -Math.PI / 2, y: 0, z: 0 }; // ⚅
        default: return { x: 0, y: 0, z: 0 };
    }
}

// ----- СОЗДАНИЕ КУБИКА С ТЕКСТУРАМИ -----
function createDiceMesh(value) {
    const size = 0.9;
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    // Эмодзи для граней (1-6)
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

// ----- БРОСОК КУБИКОВ С ЗАДАННЫМИ ЗНАЧЕНИЯМИ -----
export function rollDiceWithValues(values, callback = null) {
    if (isRolling) return;
    isRolling = true;
    rollCompleteCallback = callback;
    
    clearDice();
    
    const container = document.getElementById('dice-container');
    const result = document.getElementById('dice-result');
    container.style.display = 'flex';
    result.style.display = 'none';
    
    const count = values.length;
    const spacing = 1.4;
    const totalWidth = (count - 1) * spacing;
    const positions = [];
    for (let i = 0; i < count; i++) {
        const x = (count > 1) ? (i / (count - 1)) * totalWidth - totalWidth / 2 : 0;
        positions.push(x);
    }
    
    let completed = 0;
    positions.forEach((x, i) => {
        const value = values[i];
        const dice = createDiceMesh(value);
        // Начальная позиция: высоко и со случайным смещением
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
        // Ускоренное падение (600-1000 мс)
        const duration = 600 + Math.random() * 400;
        const startTime = Date.now();
        const startY = dice.position.y;
        const startRotX = dice.rotation.x;
        const startRotY = dice.rotation.y;
        const startRotZ = dice.rotation.z;
        
        // Целевое вращение для нужной грани сверху
        const targetRot = getRotationForValue(value);
        const targetRotX = targetRot.x;
        const targetRotY = targetRot.y;
        const targetRotZ = targetRot.z;
        
        const offsetX = (Math.random() - 0.5) * 0.4;
        const offsetZ = (Math.random() - 0.5) * 0.4;
        
        function updateFall() {
            const elapsed = Date.now() - startTime;
            let progress = Math.min(elapsed / duration, 1);
            
            // Easing с отскоком в конце
            let eased;
            if (progress < 0.7) {
                const p = progress / 0.7;
                eased = p * p;
            } else {
                const p = (progress - 0.7) / 0.3;
                const bounce = Math.sin(p * Math.PI * 2) * 0.15 * (1 - p);
                eased = 1 + bounce;
            }
            
            // Позиция Y
            const currentY = startY + (targetY - startY) * Math.min(eased, 1.1);
            dice.position.y = Math.max(currentY, targetY);
            
            // Смещение по X и Z (качение)
            const rollX = offsetX * (1 - progress);
            const rollZ = offsetZ * (1 - progress);
            dice.position.x = x + rollX;
            dice.position.z = rollZ;
            
            // Вращение с замедлением к целевым значениям
            const rotProgress = 1 - Math.pow(1 - progress, 2);
            dice.rotation.x = startRotX + (targetRotX - startRotX) * rotProgress;
            dice.rotation.y = startRotY + (targetRotY - startRotY) * rotProgress * 1.5;
            dice.rotation.z = startRotZ + (targetRotZ - startRotZ) * rotProgress;
            
            if (progress < 1) {
                requestAnimationFrame(updateFall);
            } else {
                // Фиксация
                dice.position.y = targetY;
                dice.position.x = x;
                dice.position.z = 0;
                dice.rotation.x = targetRotX;
                dice.rotation.y = targetRotY;
                dice.rotation.z = targetRotZ;
                
                completed++;
                if (completed === count) {
                    isRolling = false;
                    // Показываем результат
                    setTimeout(() => {
                        result.style.display = 'block';
                        if (rollCompleteCallback) rollCompleteCallback(values);
                    }, 500);
                }
            }
        }
        // Каскадная задержка
        setTimeout(updateFall, i * 100);
    });
}

// ----- ОЧИСТКА КУБИКОВ -----
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

// ----- ЗАКРЫТИЕ МОДАЛКИ -----
export function closeDiceModal() {
    clearDice();
    document.getElementById('dice-container').style.display = 'none';
    document.getElementById('dice-result').style.display = 'none';
    document.getElementById('dice-close-btn').style.display = 'none';
    isRolling = false;
}

// ----- БРОСОК (ГЕНЕРАЦИЯ) -----
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
