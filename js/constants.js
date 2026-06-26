// ============================================================
// LEGENDICE - constants.js
// Все константы игры: классы, предметы, враги, комбинации
// ============================================================

// ----- КЛАССЫ -----
export const CLASSES = {
    tank: {
        id: 'tank',
        name: 'Защитник',
        emoji: '🛡️',
        hp: 30,
        maxHp: 30,
        attack: 2,
        defense: 5,
        speed: 1,
        evasion: 5,
        parry: 15,
        provoke: 8,
        stealth: 1,
        description: 'Принимает урон на себя, защищает союзников'
    },
    dd: {
        id: 'dd',
        name: 'Воин',
        emoji: '⚔️',
        hp: 20,
        maxHp: 20,
        attack: 8,
        defense: 1,
        speed: 3,
        evasion: 10,
        parry: 5,
        provoke: 3,
        stealth: 5,
        description: 'Наносит огромный урон, убивает врагов'
    },
    healer: {
        id: 'healer',
        name: 'Жрец',
        emoji: '💚',
        hp: 22,
        maxHp: 22,
        attack: 1,
        defense: 2,
        speed: 2,
        evasion: 8,
        parry: 5,
        provoke: 2,
        stealth: 3,
        description: 'Лечит союзников, поддерживает команду'
    },
    mage: {
        id: 'mage',
        name: 'Маг',
        emoji: '🧙',
        hp: 18,
        maxHp: 18,
        attack: 6,
        defense: 1,
        speed: 2,
        evasion: 12,
        parry: 3,
        provoke: 1,
        stealth: 6,
        description: 'Магический урон, контроль поля боя'
    }
};

// ----- КОМБИНАЦИИ ДЛЯ КЛАССОВ -----
export const COMBOS = {
    tank: [
        { dice: [1, 1], name: 'Каменная кожа', effect: 'defense_boost', value: 3, duration: 2, target: 'self', description: '+3 к защите на 2 хода' },
        { dice: [3, 3], name: 'Отражение', effect: 'reflect', value: 50, duration: 1, target: 'self', description: 'Отражает 50% урона' },
        { dice: [5, 5], name: 'Удар щитом', effect: 'stun', value: 1, duration: 1, target: 'enemy', description: 'Оглушает врага на 1 ход' },
        { dice: [2, 2, 2], name: 'Несокрушимость', effect: 'invincible', value: 0, duration: 1, target: 'self', description: 'Не получает урон в этом ходу' },
        { dice: [1, 2, 3], name: 'Щит предков', effect: 'shield', value: 5, duration: 2, target: 'ally', description: 'Даёт щит 5 HP союзнику' },
        { dice: [6, 5, 4], name: 'Гнев земли', effect: 'damage_all', value: 10, duration: 0, target: 'all_enemies', description: '10 урона всем врагам' }
    ],
    dd: [
        { dice: [6, 6], name: 'Тихое убийство', effect: 'instant_kill', value: 0, duration: 0, target: 'enemy', description: 'Мгновенно убивает врага' },
        { dice: [4, 5], name: 'Кровотечение', effect: 'bleed', value: 2, duration: 2, target: 'enemy', description: '+2 урона в следующие 2 хода' },
        { dice: [2, 3, 4], name: 'Двойной удар', effect: 'double_attack', value: 0, duration: 1, target: 'enemy', description: '2 атаки за ход' },
        { dice: [1, 6], name: 'Смертельный выпад', effect: 'crit', value: 2, duration: 0, target: 'enemy', description: 'Критический урон x2' },
        { dice: [6, 5, 4], name: 'Разрыв', effect: 'damage', value: 15, duration: 0, target: 'enemy', description: '15 урона одному врагу' }
    ],
    healer: [
        { dice: [5, 5], name: 'Массовое лечение', effect: 'heal_all', value: 5, duration: 0, target: 'all_allies', description: 'Лечит всех союзников на 5 HP' },
        { dice: [3, 4], name: 'Регенерация', effect: 'regen', value: 2, duration: 3, target: 'ally', description: '+2 HP/ход, 3 хода' },
        { dice: [2, 6], name: 'Щит веры', effect: 'shield', value: 5, duration: 2, target: 'ally', description: 'Щит 5 HP союзнику' },
        { dice: [1, 1, 6], name: 'Изгнание', effect: 'damage_undead', value: 2, duration: 0, target: 'enemy', description: 'Урон нежити x2' },
        { dice: [4, 4, 4], name: 'Воскрешение', effect: 'revive', value: 50, duration: 0, target: 'dead_ally', description: 'Воскрешает павшего союзника с 50% HP' },
        { dice: [1, 2, 3], name: 'Священный свет', effect: 'heal_all', value: 3, duration: 0, target: 'all_allies', description: 'Лечит всех на 3 HP' }
    ],
    mage: [
        { dice: [1, 4], name: 'Огненный шар', effect: 'damage', value: 8, duration: 0, target: 'enemy', description: '8 урона одному врагу' },
        { dice: [3, 6], name: 'Ледяная стена', effect: 'freeze', value: 1, duration: 1, target: 'enemy', description: 'Замораживает врага на 1 ход' },
        { dice: [2, 2, 5], name: 'Молния', effect: 'damage_all', value: 6, duration: 0, target: 'all_enemies', description: '6 урона всем врагам' },
        { dice: [4, 4, 6], name: 'Портал', effect: 'teleport', value: 0, duration: 0, target: 'ally', description: 'Телепортирует союзника' },
        { dice: [5, 5, 5], name: 'Метеорит', effect: 'damage_all', value: 12, duration: 0, target: 'all_enemies', description: '12 урона всем врагам' },
        { dice: [6, 5, 4], name: 'Временная петля', effect: 'repeat_last', value: 0, duration: 0, target: 'self', description: 'Повторяет последнее действие' }
    ]
};

// ----- РЕДКОСТЬ ПРЕДМЕТОВ -----
export const RARITY = {
    common: { label: 'Обычный', color: '#888', emoji: '⚪', chance: 40 },
    uncommon: { label: 'Необычный', color: '#4caf50', emoji: '🟢', chance: 25 },
    rare: { label: 'Редкий', color: '#2196f3', emoji: '🔵', chance: 18 },
    epic: { label: 'Эпический', color: '#9c27b0', emoji: '🟣', chance: 10 },
    legendary: { label: 'Легендарный', color: '#ffd700', emoji: '🟡', chance: 6 },
    familiar: { label: 'Фамильярный', color: '#ff6b00', emoji: '🟠', chance: 1 }
};

// ----- ТИПЫ СЛОТОВ -----
export const SLOT_TYPES = {
    head: { label: 'Голова', emoji: '🧠' },
    leftHand: { label: 'Левая рука', emoji: '🤚' },
    rightHand: { label: 'Правая рука', emoji: '✋' },
    body: { label: 'Тело', emoji: '🛡️' },
    legs: { label: 'Ноги', emoji: '🦵' },
    amulet: { label: 'Амулет', emoji: '💍' }
};

// ----- ВРАГИ -----
export const ENEMIES = {
    skeleton: { id: 'skeleton', name: 'Скелет', emoji: '💀', hp: 8, attack: 3, speed: 1, exp: 2 },
    goblin: { id: 'goblin', name: 'Гоблин', emoji: '👺', hp: 6, attack: 4, speed: 2, exp: 3 },
    spider: { id: 'spider', name: 'Паук', emoji: '🕷️', hp: 5, attack: 5, speed: 2, exp: 3, poison: 1 },
    slime: { id: 'slime', name: 'Слизень', emoji: '🟢', hp: 12, attack: 2, speed: 0, exp: 2 },
    ghost: { id: 'ghost', name: 'Призрак', emoji: '👻', hp: 7, attack: 4, speed: 2, exp: 4, evasion: 20 },
    orc: { id: 'orc', name: 'Орк', emoji: '🗿', hp: 15, attack: 6, speed: 1, exp: 5 }
};

// ----- МИНИ-БОССЫ -----
export const MINI_BOSSES = {
    golem: { id: 'golem', name: 'Каменный голем', emoji: '🗿', hp: 30, attack: 8, speed: 1, exp: 15, defense: 3 },
    goblinKing: { id: 'goblin_king', name: 'Король гоблинов', emoji: '👑', hp: 25, attack: 10, speed: 2, exp: 20, summon: 'goblin' },
    iceDragon: { id: 'ice_dragon', name: 'Ледяной дракон', emoji: '🐉', hp: 40, attack: 12, speed: 2, exp: 25, freeze: 1 }
};

// ----- ФИНАЛЬНЫЙ БОСС -----
export const BOSS = {
    id: 'bone_lord',
    name: 'Повелитель костей',
    emoji: '💀👑',
    hp: 60,
    attack: 15,
    speed: 2,
    exp: 50,
    defense: 2,
    summon: 'skeleton'
};

// ----- ПРЕДМЕТЫ (БАЗОВЫЙ НАБОР) -----
export const ITEMS = {
    sword_common: { id: 'sword_common', name: 'Меч', emoji: '🗡️', slot: 'leftHand', stat: 2, rarity: 'common' },
    sword_uncommon: { id: 'sword_uncommon', name: 'Стальной меч', emoji: '🗡️', slot: 'leftHand', stat: 3, rarity: 'uncommon' },
    sword_rare: { id: 'sword_rare', name: 'Рунический меч', emoji: '🗡️', slot: 'leftHand', stat: 5, rarity: 'rare', effects: ['bleed'] },
    sword_epic: { id: 'sword_epic', name: 'Меч Огня', emoji: '🗡️', slot: 'leftHand', stat: 6, rarity: 'epic', effects: ['fire', 'crit_chance'] },
    sword_legendary: { id: 'sword_legendary', name: 'Экскалибур', emoji: '🗡️', slot: 'leftHand', stat: 8, rarity: 'legendary', effects: ['double_attack', 'life_steal'] },
    shield_common: { id: 'shield_common', name: 'Щит', emoji: '🛡️', slot: 'rightHand', stat: 2, rarity: 'common' },
    shield_uncommon: { id: 'shield_uncommon', name: 'Стальной щит', emoji: '🛡️', slot: 'rightHand', stat: 3, rarity: 'uncommon' },
    shield_rare: { id: 'shield_rare', name: 'Щит провокатора', emoji: '🛡️', slot: 'rightHand', stat: 4, rarity: 'rare', effects: ['provoke'] },
    shield_epic: { id: 'shield_epic', name: 'Адамантовый щит', emoji: '🛡️', slot: 'rightHand', stat: 5, rarity: 'epic', effects: ['reflect'] },
    shield_legendary: { id: 'shield_legendary', name: 'Щит Света', emoji: '🛡️', slot: 'rightHand', stat: 6, rarity: 'legendary', effects: ['block_all', 'heal'] },
    armor_common: { id: 'armor_common', name: 'Кожаная броня', emoji: '🧥', slot: 'body', stat: 1, rarity: 'common' },
    armor_uncommon: { id: 'armor_uncommon', name: 'Кольчуга', emoji: '🧥', slot: 'body', stat: 2, rarity: 'uncommon' },
    armor_rare: { id: 'armor_rare', name: 'Латы', emoji: '🧥', slot: 'body', stat: 3, rarity: 'rare' },
    armor_epic: { id: 'armor_epic', name: 'Мифриловая броня', emoji: '🧥', slot: 'body', stat: 4, rarity: 'epic', effects: ['evasion'] },
    armor_legendary: { id: 'armor_legendary', name: 'Броня Дракона', emoji: '🧥', slot: 'body', stat: 5, rarity: 'legendary', effects: ['fire_resist', 'thorns'] },
    helm_common: { id: 'helm_common', name: 'Шлем', emoji: '🧠', slot: 'head', stat: 1, rarity: 'common' },
    helm_uncommon: { id: 'helm_uncommon', name: 'Стальной шлем', emoji: '🧠', slot: 'head', stat: 2, rarity: 'uncommon' },
    helm_rare: { id: 'helm_rare', name: 'Шлем Мудрости', emoji: '🧠', slot: 'head', stat: 3, rarity: 'rare', effects: ['mana'] },
    helm_epic: { id: 'helm_epic', name: 'Корона Теней', emoji: '🧠', slot: 'head', stat: 4, rarity: 'epic', effects: ['stealth'] },
    helm_legendary: { id: 'helm_legendary', name: 'Венец Бессмертия', emoji: '🧠', slot: 'head', stat: 5, rarity: 'legendary', effects: ['revive'] },
    boots_common: { id: 'boots_common', name: 'Сапоги', emoji: '🥾', slot: 'legs', stat: 1, rarity: 'common' },
    boots_uncommon: { id: 'boots_uncommon', name: 'Кожаные сапоги', emoji: '🥾', slot: 'legs', stat: 2, rarity: 'uncommon' },
    boots_rare: { id: 'boots_rare', name: 'Сапоги Скорости', emoji: '🥾', slot: 'legs', stat: 3, rarity: 'rare', effects: ['speed'] },
    boots_epic: { id: 'boots_epic', name: 'Семьмильные сапоги', emoji: '🥾', slot: 'legs', stat: 4, rarity: 'epic', effects: ['teleport'] },
    boots_legendary: { id: 'boots_legendary', name: 'Сапоги Меркурия', emoji: '🥾', slot: 'legs', stat: 5, rarity: 'legendary', effects: ['dodge', 'speed'] },
    ring_common: { id: 'ring_common', name: 'Кольцо', emoji: '💍', slot: 'amulet', stat: 1, rarity: 'common' },
    ring_uncommon: { id: 'ring_uncommon', name: 'Серебряное кольцо', emoji: '💍', slot: 'amulet', stat: 2, rarity: 'uncommon' },
    ring_rare: { id: 'ring_rare', name: 'Кольцо Удачи', emoji: '💍', slot: 'amulet', stat: 3, rarity: 'rare', effects: ['luck'] },
    ring_epic: { id: 'ring_epic', name: 'Кольцо Жизни', emoji: '💍', slot: 'amulet', stat: 4, rarity: 'epic', effects: ['regen'] },
    ring_legendary: { id: 'ring_legendary', name: 'Кольцо Власти', emoji: '💍', slot: 'amulet', stat: 6, rarity: 'legendary', effects: ['all_stats'] }
};

// ----- РАСХОДНИКИ -----
export const CONSUMABLES = {
    potion_health: { id: 'potion_health', name: 'Зелье здоровья', emoji: '🩸', type: 'consumable', heal: 5 },
    potion_greater: { id: 'potion_greater', name: 'Большое зелье', emoji: '🧪', type: 'consumable', heal: 12 },
    potion_defense: { id: 'potion_defense', name: 'Зелье защиты', emoji: '🛡️', type: 'consumable', shield: 5 },
    potion_strength: { id: 'potion_strength', name: 'Зелье силы', emoji: '⚔️', type: 'consumable', attack_boost: 2 },
    scroll_peace: { id: 'scroll_peace', name: 'Свиток мира', emoji: '📜', type: 'consumable', avoid_combat: true },
    scroll_teleport: { id: 'scroll_teleport', name: 'Свиток телепортации', emoji: '🌀', type: 'consumable', teleport: true }
};

// ----- ЭМОДЗИ КОМБИНАЦИЙ -----
export const COMBO_EMOJI = {
    'Каменная кожа': '🪨',
    'Отражение': '🔄',
    'Удар щитом': '🛡️',
    'Несокрушимость': '💎',
    'Щит предков': '🛡️',
    'Гнев земли': '🌍',
    'Тихое убийство': '🗡️',
    'Кровотечение': '🩸',
    'Двойной удар': '⚔️',
    'Смертельный выпад': '💀',
    'Разрыв': '🔥',
    'Массовое лечение': '💚',
    'Регенерация': '🌿',
    'Щит веры': '✨',
    'Изгнание': '✝️',
    'Воскрешение': '🌟',
    'Священный свет': '☀️',
    'Огненный шар': '🔥',
    'Ледяная стена': '❄️',
    'Молния': '⚡',
    'Портал': '🌀',
    'Метеорит': '☄️',
    'Временная петля': '⏳'
};

// ----- ЦВЕТА ДЛЯ РЕДКОСТИ (CSS-классы) -----
export const RARITY_CLASS = {
    common: 'common',
    uncommon: 'uncommon',
    rare: 'rare',
    epic: 'epic',
    legendary: 'legendary',
    familiar: 'familiar'
};
