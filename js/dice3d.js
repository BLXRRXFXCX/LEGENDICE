// ============================================================
// LEGENDICE - dice3d.js
// 3D кубики с физикой (Three.js + Cannon.js)
// ============================================================

let scene, camera, renderer;
let diceMeshes = [];
let isRolling = false;
let animationId = null;
let rollCompleteCallback = null;
let positions = [];

// ----- ИНИЦИАЛИЗАЦИЯ 3D СЦЕНЫ -----
export function initDice3D() {
    const container = document.getElementById('dice-canvas-container');
    if (!container) return;
    
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 400;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 6, 8);
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

// ----- БРОСОК КУБИКОВ (ГЕНЕРИРУЕТ ЗНАЧЕНИЯ) -----
export function rollDice(count = 2, callback = null) {
    const values = [];
    for (let i = 0; i < count; i++) {
        values.push(Math.floor(Math.random() * 6) + 1);
    }
    rollDiceWithValues(values, callback);
}

// ----- БРОСОК КУБИКОВ С ЗАДАННЫМИ ЗНАЧЕНИЯМИ -----
export function rollDiceWithValues(values, callback = null) {
    if (isRolling) return;
    isRolling = true;
    rollCompleteCallback = callback;
    
    clearDice();
    
    const count = values.length;
    const spacing = 1.2;
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
        dice.position.set(x, 4 + Math.random() * 2, (Math.random() - 0.5) * 1);
        dice.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
        scene.add(dice);
        diceMeshes.push(dice);
        
        const targetY = -0.3 + Math.random() * 0.1;
        const duration = 800 + Math.random() * 400;
        const startTime = Date.now();
        const startY = dice.position.y;
        const startRotX = dice.rotation.x;
        const startRotZ = dice.rotation.z;
        const targetRotX = (value - 1) * (Math.PI / 2) + Math.random() * 0.2;
        const targetRotZ = (value - 1) * (Math.PI / 2) + Math.random() * 0.2;
        const offsetX = (Math.random() - 0.5) * 0.3;
        const offsetZ = (Math.random() - 0.5) * 0.3;
        
        function updateFall() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            dice.position.x = x + offsetX * (1 - eased);
            dice.position.y = startY + (targetY - startY) * eased;
            dice.position.z = offsetZ * (1 - eased);
            dice.rotation.x = startRotX + (targetRotX - startRotX) * eased;
            dice.rotation.z = startRotZ + (targetRotZ - startRotZ) * eased;
            dice.rotation.y += 0.03;
            
            if (progress < 1) {
                requestAnimationFrame(updateFall);
            } else {
                dice.position.y = targetY;
                dice.position.x = x;
                dice.position.z = 0;
                completed++;
                if (completed === count) {
                    isRolling = false;
                    alignDice(values);
                    if (rollCompleteCallback) rollCompleteCallback(values);
                }
            }
        }
        updateFall();
    });
}

function createDiceMesh(value) {
    const size = 0.8;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const materials = [];
    for (let i = 0; i < 6; i++) {
        const isSelected = (i + 1) === value;
        materials.push(new THREE.MeshStandardMaterial({
            color: isSelected ? 0xffff88 : 0xf0f0ff,
            roughness: 0.3,
            metalness: 0.1,
            emissive: isSelected ? 0x444422 : 0x000000,
            emissiveIntensity: isSelected ? 0.3 : 0
        }));
    }
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function alignDice(values) {
    const count = diceMeshes.length;
    const spacing = 1.5;
    const totalWidth = (count - 1) * spacing;
    const startX = -totalWidth / 2;
    
    diceMeshes.forEach((mesh, i) => {
        const targetX = startX + i * spacing;
        const targetY = -0.3;
        const startTime = Date.now();
        const duration = 600;
        const startXPos = mesh.position.x;
        const startYPos = mesh.position.y;
        
        function updateAlign() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            mesh.position.x = startXPos + (targetX - startXPos) * eased;
            mesh.position.y = startYPos + (targetY - startYPos) * eased;
            mesh.position.z = 0;
            mesh.rotation.x *= 0.95;
            mesh.rotation.z *= 0.95;
            mesh.rotation.y += 0.01;
            
            if (progress < 1) {
                requestAnimationFrame(updateAlign);
            } else {
                mesh.position.x = targetX;
                mesh.position.y = targetY;
                mesh.position.z = 0;
                mesh.rotation.x = 0;
                mesh.rotation.z = 0;
                highlightDiceValue(mesh, values[i]);
            }
        }
        updateAlign();
    });
}

function highlightDiceValue(mesh, value) {
    if (mesh.material && Array.isArray(mesh.material)) {
        mesh.material.forEach((mat, i) => {
            if (mat.emissive) {
                mat.emissive.setHex(i + 1 === value ? 0x444422 : 0x000000);
                mat.emissiveIntensity = i + 1 === value ? 0.3 : 0;
            }
        });
    }
}

function clearDice() {
    diceMeshes.forEach(mesh => {
        scene.remove(mesh);
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
}

export function closeDiceModal() {
    clearDice();
    document.getElementById('dice-container').style.display = 'none';
    document.getElementById('dice-result').style.display = 'none';
    document.getElementById('dice-close-btn').style.display = 'none';
    isRolling = false;
}

export default {
    initDice3D,
    rollDice,
    rollDiceWithValues,
    closeDiceModal
};
