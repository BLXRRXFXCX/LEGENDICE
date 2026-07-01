// ============================================================
// LEGENDICE - game.js
// Генерация подземелья, комнаты, враги, боссы
// ============================================================

import { ENEMIES, MINI_BOSSES, BOSS, ITEMS, CONSUMABLES, RARITY } from './constants.js';

// ----- ГЕНЕРАЦИЯ ПОДЗЕМЕЛЬЯ -----
export function generateDungeon(totalFloors) {
    const dungeon = {
        floor: 1,
        totalFloors: totalFloors || 5,
        rooms: {},
        // map удалён для совместимости с Firestore
        bossDefeated: false,
        currentFloor: 1
    };
    
    for (let floor = 1; floor <= totalFloors; floor++) {
        const floorData = generateFloor(floor, totalFloors);
        dungeon.rooms = { ...dungeon.rooms, ...floorData.rooms };
    }
    
    return dungeon;
}

// ----- ГЕНЕРАЦИЯ КОЛИЧЕСТВА ЭТАЖЕЙ НА ОСНОВЕ БРОСКОВ -----
export function generateFloorsFromDice() {
    // Каждый игрок бросает 1d6
    const player1Roll = Math.floor(Math.random() * 6) + 1;
    const player2Roll = Math.floor(Math.random() * 6) + 1;
    const totalFloors = player1Roll + player2Roll;
    return {
        player1Roll,
        player2Roll,
        totalFloors: Math.min(totalFloors, 12) // Максимум 12 этажей
    };
}


// ----- ГЕНЕРАЦИЯ ОДНОГО ЭТАЖА -----
function generateFloor(floorNum, totalFloors) {
    const numRooms = Math.floor(Math.random() * 3) + 3; // 3-5 комнат
    const rooms = {};
    
    const isBossFloor = floorNum === totalFloors;
    // Всегда добавляем комнаты боя, сундуки, отдых, магазин
    const roomTypes = ['combat', 'combat', 'chest', 'rest', 'shop'];
    if (isBossFloor) roomTypes.push('boss');
    
    // Добавляем выход (exit) в конце этажа, кроме последнего босса
    if (!isBossFloor) {
        roomTypes.push('exit');
    }
    
    // Перемешиваем типы, чтобы выход не всегда был последним
    shuffleArray(roomTypes);
    
    for (let i = 0; i < roomTypes.length; i++) {
        const roomId = `floor${floorNum}_room${i+1}`;
        const type = roomTypes[i] || 'combat';
        
        rooms[roomId] = {
            id: roomId,
            type: type,
            floor: floorNum,
            isCleared: false,
            isRevealed: false,   // Новая опция: показана ли комната игрокам
            players: [],
            enemies: [],
            chests: [],
            shopItems: []
        };
        
        if (type === 'combat' || type === 'boss') {
            const enemyCount = type === 'boss' ? 1 : (Math.floor(Math.random() * 2) + 1);
            rooms[roomId].enemies = generateEnemies(enemyCount, floorNum, type === 'boss');
        }
        
        if (type === 'chest') {
            const chestCount = Math.floor(Math.random() * 2) + 1;
            rooms[roomId].chests = generateChests(chestCount, floorNum);
        }
        
        if (type === 'shop') {
            rooms[roomId].shopItems = generateShopItems(floorNum);
        }
        
        // Выход не требует врагов или предметов
        if (type === 'exit') {
            rooms[roomId].isCleared = true; // доступен сразу
        }
    }
    
    return { rooms };
}

// ----- ВСПОМОГАТЕЛЬНАЯ: ПЕРЕМЕШИВАНИЕ МАССИВА -----
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ----- ГЕНЕРАЦИЯ ВРАГОВ (без изменений) -----
function generateEnemies(count, floor, isBoss) {
    const enemies = [];
    if (isBoss) {
        const boss = { ...BOSS };
        boss.hp = Math.floor(boss.hp * (1 + (floor - 1) * 0.2));
        boss.maxHp = boss.hp;
        boss.isAlive = true;
        boss.id = `boss_${Date.now()}`;
        enemies.push(boss);
        return enemies;
    }
    
    const enemyKeys = Object.keys(ENEMIES);
    for (let i = 0; i < count; i++) {
        const key = enemyKeys[Math.floor(Math.random() * enemyKeys.length)];
        const enemy = { ...ENEMIES[key] };
        const scale = 1 + (floor - 1) * 0.15;
        enemy.hp = Math.floor(enemy.hp * scale);
        enemy.maxHp = enemy.hp;
        enemy.attack = Math.floor(enemy.attack * scale);
        enemy.isAlive = true;
        enemy.id = `${enemy.id}_${Date.now()}_${i}`;
        enemies.push(enemy);
    }
    return enemies;
}

// ----- ГЕНЕРАЦИЯ СУНДУКОВ (без изменений) -----
function generateChests(count, floor) {
    const chests = [];
    const rarityChance = { common: 40, uncommon: 25, rare: 18, epic: 10, legendary: 6, familiar: 1 };
    
    for (let i = 0; i < count; i++) {
        const roll = Math.random() * 100;
        let rarity = 'common';
        let cumulative = 0;
        for (const [key, chance] of Object.entries(rarityChance)) {
            cumulative += chance;
            if (roll < cumulative) { rarity = key; break; }
        }
        
        const itemKeys = Object.keys(ITEMS);
        const itemKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
        const item = { ...ITEMS[itemKey] };
        item.rarity = rarity;
        
        chests.push({
            id: `chest_${Date.now()}_${i}`,
            rarity: rarity,
            isOpened: false,
            item: item
        });
    }
    return chests;
}

// ----- ГЕНЕРАЦИЯ ТОВАРОВ В МАГАЗИНЕ (без изменений) -----
function generateShopItems(floor) {
    const items = [
        { name: 'Зелье здоровья', emoji: '🩸', price: 10, effect: { heal: 5 } },
        { name: 'Большое зелье', emoji: '🧪', price: 20, effect: { heal: 12 } },
        { name: 'Зелье защиты', emoji: '🛡️', price: 15, effect: { shield: 5 } },
        { name: 'Зелье силы', emoji: '⚔️', price: 15, effect: { attack_boost: 2 } },
        { name: 'Свиток мира', emoji: '📜', price: 25, effect: { avoid_combat: true } }
    ];
    
    const shopItems = [];
    const numItems = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < numItems && i < items.length; i++) {
        const item = { ...items[i] };
        item.price = Math.floor(item.price * (1 + (floor - 1) * 0.1));
        shopItems.push(item);
    }
    return shopItems;
}

// ----- ПОЛУЧИТЬ КОМНАТУ -----
export function getRoom(dungeon, roomId) {
    return dungeon?.rooms?.[roomId] || null;
}

// ----- ПОЛУЧИТЬ КОМНАТЫ ТЕКУЩЕГО ЭТАЖА -----
export function getCurrentFloorRooms(dungeon) {
    if (!dungeon || !dungeon.rooms) return [];
    const floor = dungeon.currentFloor || 1;
    const roomIds = Object.keys(dungeon.rooms);
    return roomIds.filter(id => dungeon.rooms[id].floor === floor);
}

// ----- ПРОВЕРИТЬ, ЗАЧИЩЕН ЛИ ЭТАЖ -----
export function isFloorCleared(dungeon) {
    const rooms = getCurrentFloorRooms(dungeon);
    // Все комнаты должны быть зачищены или быть выходом
    return rooms.every(roomId => {
        const room = dungeon.rooms[roomId];
        return room.isCleared || room.type === 'exit';
    });
}

// ----- ПЕРЕЙТИ НА СЛЕДУЮЩИЙ ЭТАЖ -----
export function goToNextFloor(dungeon) {
    if (dungeon.currentFloor < dungeon.totalFloors) {
        dungeon.currentFloor++;
        return true;
    }
    return false;
}

// ----- ОБНОВИТЬ КОМНАТУ ПОСЛЕ БОЯ -----
export function updateRoomAfterCombat(room) {
    if (!room) return;
    if (room.enemies) {
        const allDead = room.enemies.every(enemy => !enemy.isAlive);
        if (allDead) {
            room.isCleared = true;
            room.isRevealed = true;
        }
    }
}

// ----- ОТКРЫТЬ СУНДУК (без изменений) -----
export function openChest(chest, player) {
    if (chest.isOpened) return null;
    chest.isOpened = true;
    if (chest.item) {
        if (!player.inventory) player.inventory = [];
        player.inventory.push(chest.item);
        return chest.item;
    }
    return null;
}

// ----- КУПИТЬ В МАГАЗИНЕ (без изменений) -----
export function buyShopItem(shopItem, player) {
    if (!player.inventory) player.inventory = [];
    const item = {
        id: `shop_${Date.now()}`,
        name: shopItem.name,
        emoji: shopItem.emoji,
        type: 'consumable',
        ...shopItem.effect
    };
    player.inventory.push(item);
    return item;
}

export default {
    generateDungeon,
    getRoom,
    getCurrentFloorRooms,
    isFloorCleared,
    goToNextFloor,
    updateRoomAfterCombat,
    openChest,
    buyShopItem
};
