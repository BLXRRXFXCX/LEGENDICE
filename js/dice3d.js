// ============================================================
// LEGENDICE - dice3d.js
// 3D кубики с физикой (Three.js + Cannon.js)
// ============================================================

// ----- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ -----
let scene, camera, renderer;
let diceMeshes = [];
let diceBodies = [];
let isRolling = false;
let rollCompleteCallback = null;
let animationId = null;

// ----- ИНИЦИАЛИЗАЦИЯ 3D СЦЕНЫ -----
export function initDice3D() {
    const container = document.getElementById('dice-canvas-container');
    
    // Создаем сцену
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Камера
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 400;
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 8, 10);
    camera.lookAt(0, 0, 0);
    
    // Рендерер
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
    
    // Стол (прозрачная плоскость)
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
    
    // Сетка на столе для красоты
    const gridHelper = new THREE.GridHelper(6, 6, 0x444466, 0x333355);
    gridHelper.position.y = -0.4;
    scene.add(gridHelper);
    
    // Обработка ресайза
    window.addEventListener('resize', () => {
        const w = container.clientWidth || 300;
        const h = container.clientHeight || 400;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
    
    // Запускаем рендер-цикл
    animate();
    
    console.log('🎲 3D сцена инициализирована');
}

// ----- АНИМАЦИОННЫЙ ЦИКЛ -----
function animate() {
    animationId = requestAnimationFrame(animate);
    
    // Обновляем физику (если есть Cannon)
    // (Пока используем только Three.js)
    
    // Вращение кубиков (если они не в процессе броска)
    // (Пока оставим статичными)
    
    renderer.render(scene, camera);
}

// ----- БРОСОК КУБИКОВ -----
export function rollDice(count = 2, callback = null) {
    if (isRolling) {
        console.warn('⚠️ Бросок уже выполняется');
        return;
    }
    
    isRolling = true;
    rollCompleteCallback = callback;
    
    // Очищаем старые кубики
    clearDice();
    
    // Создаем новые кубики
    const positions = [];
    const spacing = 1.2;
    const totalWidth = (count - 1) * spacing;
    for (let i = 0; i < count; i++) {
        const x = (i / (count - 1 || 1)) * totalWidth - totalWidth / 2;
        positions.push(x);
    }
    
    // Генерируем случайные значения
    const values = [];
    for (let i = 0; i < count; i++) {
        values.push(Math.floor(Math.random() * 6) + 1);
    }
    
    // Создаем кубики с анимацией падения
    positions.forEach((x, i) => {
        const value = values[i];
        const dice = createDiceMesh(value);
        dice.position.set(x, 4 + Math.random() * 2, (Math.random() - 0.5) * 1);
        dice.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        scene.add(dice);
        diceMeshes.push(dice);
        
        // Анимация падения
        const targetY = -0.3 + Math.random() * 0.1;
        const targetRotX = (value - 1) * (Math.PI / 2) + Math.random() * 0.2;
        const targetRotZ = (value - 1) * (Math.PI / 2) + Math.random() * 0.2;
        
        animateDiceFall(dice, x, targetY, targetRotX, targetRotZ, i, count, values);
    });
}

// ----- СОЗДАНИЕ ОДНОГО КУБИКА -----
function createDiceMesh(value) {
    const size = 0.8;
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    // Создаем текстуры для каждой грани с точками
    const materials = createDiceMaterials(value);
    
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
}

// ----- СОЗДАНИЕ МАТЕРИАЛОВ ДЛЯ ГРАНЕЙ КУБИКА -----
function createDiceMaterials(value) {
    // Стандартные материалы для граней
    const baseColor = 0xffffff;
    const dotColor = 0x000000;
    const edgeColor = 0x222244;
    
    // Создаем материалы для каждой грани
    const materials = [];
    
    // Для упрощения пока просто белые грани с черными точками
    // В будущем можно сделать полноценные текстуры
    
    // Пока делаем простые грани с отображением значения
    for (let i = 0; i < 6; i++) {
        const isSelected = (i + 1) === value;
        const color = isSelected ? 0xffff88 : 0xf0f0ff;
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.1,
            emissive: isSelected ? 0x444422 : 0x000000,
            emissiveIntensity: isSelected ? 0.3 : 0
        });
        materials.push(mat);
    }
    
    return materials;
}

// ----- АНИМАЦИЯ ПАДЕНИЯ КУБИКА -----
function animateDiceFall(mesh, targetX, targetY, targetRotX, targetRotZ, index, total, values) {
    const startY = mesh.position.y;
    const startRotX = mesh.rotation.x;
    const startRotZ = mesh.rotation.z;
    const duration = 1000 + Math.random() * 500; // 1-1.5 сек
    const startTime = Date.now();
    
    // Небольшое случайное смещение
    const offsetX = (Math.random() - 0.5) * 0.3;
    const offsetZ = (Math.random() - 0.5) * 0.3;
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // EaseOutBounce эффект
        const eased = easeOutBounce(progress);
        
        mesh.position.x = targetX + offsetX * (1 - eased);
        mesh.position.y = startY + (targetY - startY) * eased;
        mesh.position.z = offsetZ * (1 - eased);
        
        // Вращение
        mesh.rotation.x = startRotX + (targetRotX - startRotX) * eased;
        mesh.rotation.z = startRotZ + (targetRotZ - startRotZ) * eased;
        mesh.rotation.y += 0.02;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            // Завершаем анимацию для этого кубика
            mesh.position.y = targetY;
            mesh.position.x = targetX;
            mesh.position.z = 0;
            
            // Проверяем, все ли кубики завершили анимацию
            checkRollComplete(values);
        }
    }
    
    update();
}

// ----- EASE OUT BOUNCE -----
function easeOutBounce(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
        return n1 * t * t;
    } else if (t < 2 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
}

// ----- ПРОВЕРКА ЗАВЕРШЕНИЯ БРОСКА -----
let completedDice = 0;
let diceResults = [];

function checkRollComplete(values) {
    completedDice++;
    if (completedDice === diceMeshes.length) {
        // Все кубики упали
        isRolling = false;
        completedDice = 0;
        
        // Выравниваем кубики в ряд
        alignDice(values);
        
        // Вызываем колбэк с результатами
        if (rollCompleteCallback) {
            rollCompleteCallback(values);
        }
        
        // Показываем результат через UI
        // (это обрабатывается в main.js)
    }
}

// ----- ВЫРАВНИВАНИЕ КУБИКОВ В РЯД -----
function alignDice(values) {
    const count = diceMeshes.length;
    const spacing = 1.5;
    const totalWidth = (count - 1) * spacing;
    const startX = -totalWidth / 2;
    
    // Анимируем выравнивание
    diceMeshes.forEach((mesh, i) => {
        const targetX = startX + i * spacing;
        const targetY = -0.3;
        const targetRotX = 0;
        const targetRotZ = 0;
        
        // Плавное перемещение
        const startTime = Date.now();
        const duration = 800;
        const startXPos = mesh.position.x;
        const startYPos = mesh.position.y;
        
        function alignUpdate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            mesh.position.x = startXPos + (targetX - startXPos) * eased;
            mesh.position.y = startYPos + (targetY - startYPos) * eased;
            mesh.position.z = 0;
            
            // Показываем верхнюю грань
            mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.05;
            mesh.rotation.z += (targetRotZ - mesh.rotation.z) * 0.05;
            mesh.rotation.y += 0.01;
            
            if (progress < 1) {
                requestAnimationFrame(alignUpdate);
            } else {
                mesh.position.x = targetX;
                mesh.position.y = targetY;
                mesh.position.z = 0;
                mesh.rotation.x = targetRotX;
                mesh.rotation.z = targetRotZ;
                
                // Показываем значение на кубике (подсветка)
                highlightDiceValue(mesh, values[i]);
            }
        }
        
        alignUpdate();
    });
}

// ----- ПОДСВЕТКА ЗНАЧЕНИЯ КУБИКА -----
function highlightDiceValue(mesh, value) {
    // Подсвечиваем верхнюю грань
    if (mesh.material && Array.isArray(mesh.material)) {
        // Верхняя грань (индекс 4, если правильно настроено)
        // Пока просто делаем все грани светящимися
        mesh.material.forEach(mat => {
            if (mat.emissive) {
                mat.emissive.setHex(0x444422);
                mat.emissiveIntensity = 0.2;
            }
        });
    }
}

// ----- ОЧИСТКА КУБИКОВ -----
function clearDice() {
    diceMeshes.forEach(mesh => {
        scene.remove(mesh);
        // Очистка геометрии и материалов
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
            } else {
                mesh.material.dispose();
            }
        }
    });
    diceMeshes = [];
    diceBodies = [];
    completedDice = 0;
    diceResults = [];
}

// ----- ЗАКРЫТИЕ МОДАЛКИ С КУБИКАМИ -----
export function closeDiceModal() {
    clearDice();
    document.getElementById('dice-container').style.display = 'none';
    document.getElementById('dice-result').style.display = 'none';
    isRolling = false;
}

// ----- ЭКСПОРТ -----
export default {
    initDice3D,
    rollDice,
    closeDiceModal
};
