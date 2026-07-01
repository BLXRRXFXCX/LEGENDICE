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


// ----- ГЕНЕРАЦИЯ ОДНОГО ЭТАЖА (С БРОСКОМ КОМНАТ) -----
function generateFloor(floorNum, totalFloors) {
    // БРОСОК НА КОЛИЧЕСТВО КОМНАТ: 1d6
    const roomRoll = Math.floor(Math.random() * 6) + 1;
    // Минимум 2, максимум 6 комнат
    const numRooms = Math.min(Math.max(roomRoll, 2), 6);
    
    const rooms = {};
    const isBossFloor = floorNum === totalFloors;
    const roomTypes = ['combat', 'combat', 'chest', 'rest', 'shop'];
    if (isBossFloor) roomTypes.push('boss');
    if (!isBossFloor) roomTypes.push('exit');
    
    // Перемешиваем типы комнат
    shuffleArray(roomTypes);
    
    // Берём столько типов, сколько комнат выпало
    const usedTypes = [];
    for (let i = 0; i < numRooms; i++) {
        // Если типов меньше, чем комнат — повторяем
        const typeIndex = i % roomTypes.length;
        usedTypes.push(roomTypes[typeIndex]);
    }
    // Перемешиваем ещё раз, чтобы порядок был случайным
    shuffleArray(usedTypes);
    
    for (let i = 0; i < usedTypes.length; i++) {
        const roomId = `floor${floorNum}_room${i+1}`;
        const type = usedTypes[i] || 'combat';
        
        rooms[roomId] = {
            id: roomId,
            type: type,
            floor: floorNum,
            isCleared: false,
            isRevealed: false,
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
        
        if (type === 'exit') {
            rooms[roomId].isCleared = true;
        }
    }
    
    // Сохраняем результат броска для отображения
    rooms._meta = {
        roomRoll: roomRoll,
        numRooms: numRooms
    };
    
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
// ----- ПРОВЕРИТЬ, ЗАЧИЩЕН ЛИ ЭТАЖ (ТОЛЬКО БОЕВЫЕ КОМНАТЫ) -----
export function isFloorCleared(dungeon) {
    const rooms = getCurrentFloorRooms(dungeon);
    // Проверяем только комнаты с врагами (combat и boss)
    const combatRooms = rooms.filter(roomId => {
        const room = dungeon.rooms[roomId];
        return room.type === 'combat' || room.type === 'boss';
    });
    
    // Если нет боевых комнат — этаж считается зачищенным
    if (combatRooms.length === 0) return true;
    
    // Все боевые комнаты должны быть зачищены
    return combatRooms.every(roomId => {
        const room = dungeon.rooms[roomId];
        // Проверяем, что все враги мертвы
        if (room.enemies) {
            return room.enemies.every(enemy => !enemy.isAlive);
        }
        return room.isCleared;
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
