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
        map: [],
        bossDefeated: false
    };
    
    for (let floor = 1; floor <= totalFloors; floor++) {
        const floorData = generateFloor(floor, totalFloors);
        dungeon.rooms = { ...dungeon.rooms, ...floorData.rooms };
        dungeon.map.push(floorData.map);
    }
    
    return dungeon;
}

// ----- ГЕНЕРАЦИЯ ОДНОГО ЭТАЖА -----
function generateFloor(floorNum, totalFloors) {
    const numRooms = Math.floor(Math.random() * 3) + 3;
    const rooms = {};
    const map = [];
    
    const isBossFloor = floorNum === totalFloors;
    const roomTypes = ['combat', 'combat', 'chest', 'rest', 'shop'];
    if (isBossFloor) roomTypes.push('boss');
    
    for (let i = 0; i < numRooms; i++) {
        const roomId = `floor${floorNum}_room${i+1}`;
        const type = roomTypes[i % roomTypes.length] || 'combat';
        
        rooms[roomId] = {
            id: roomId,
            type: type,
            floor: floorNum,
            isCleared: false,
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
        
        map.push(roomId);
    }
    
    return { rooms, map };
}

// ----- ГЕНЕРАЦИЯ ВРАГОВ -----
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

// ----- ГЕНЕРАЦИЯ СУНДУКОВ -----
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
        
        // Выбираем случайный предмет
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

// ----- ГЕНЕРАЦИЯ ТОВАРОВ В МАГАЗИНЕ -----
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

// ----- ПОЛУЧИТЬ ТЕКУЩУЮ КОМНАТУ ИГРОКА -----
export function getPlayerRoom(dungeon, player) {
    if (!player || !player.position) return null;
    return getRoom(dungeon, player.position);
}

// ----- ПРОВЕРИТЬ, ЗАЧИЩЕНА ЛИ КОМНАТА -----
export function isRoomCleared(room) {
    if (!room) return false;
    if (room.type === 'rest' || room.type === 'shop') return true;
    if (room.enemies) {
        return room.enemies.every(enemy => !enemy.isAlive);
    }
    return room.isCleared;
}

// ----- ОБНОВИТЬ КОМНАТУ ПОСЛЕ БОЯ -----
export function updateRoomAfterCombat(room) {
    if (!room) return;
    if (room.enemies) {
        const allDead = room.enemies.every(enemy => !enemy.isAlive);
        if (allDead) room.isCleared = true;
    }
}

// ----- ОТКРЫТЬ СУНДУК -----
export function openChest(chest, player) {
    if (chest.isOpened) return null;
    chest.isOpened = true;
    
    // Добавляем предмет в инвентарь игрока
    if (chest.item) {
        if (!player.inventory) player.inventory = [];
        player.inventory.push(chest.item);
        return chest.item;
    }
    return null;
}

// ----- КУПИТЬ ТОВАР В МАГАЗИНЕ -----
export function buyShopItem(shopItem, player) {
    // Проверяем, есть ли у игрока золото (пока нет системы золота)
    // Просто добавляем предмет
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

// ----- ЭКСПОРТ -----
export default {
    generateDungeon,
    generateFloor,
    generateEnemies,
    generateChests,
    generateShopItems,
    getRoom,
    getPlayerRoom,
    isRoomCleared,
    updateRoomAfterCombat,
    openChest,
    buyShopItem
};
