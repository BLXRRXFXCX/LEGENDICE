// ============================================================
// LEGENDICE - main.js (ПОЛНАЯ ВЕРСИЯ)
// Все механики: лобби, подземелье, бой, инвентарь, чат, пинги
// ============================================================

import './firebase.js';
import {
    signInAnonymously,
    getCurrentUser,
    createGame,
    joinGame,
    subscribeToGame,
    unsubscribeFromGame,
    updateGameState,
    sendChatMessage,
    sendPing,
    setPlayerReady,
    updatePlayerPosition,
    getGameData
} from './firebase.js';
import {
    CLASSES, SLOT_TYPES, ENEMIES, BOSS, COMBOS,
    RARITY, ITEMS, CONSUMABLES, COMBO_EMOJI
} from './constants.js';
import {
    initUI, showLobby, showGame, updateUI,
    openModal, closeModal, showDiceModal, closeDiceModal,
    showItemInfo
} from './ui.js';
import { initDice3D, rollDice, closeDiceModal as closeDice3D } from './dice3d.js';
import {
    generateDungeon, getRoom, updateRoomAfterCombat,
    isRoomCleared, openChest, buyShopItem
} from './game.js';

// ----- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ -----
let gameState = null;
let currentPlayerId = null;
let currentGameId = null;
let isMyTurn = false;
let myClass = null;
let unsubscribeGame = null;
let diceValues = [];
let diceSelections = {};
let selectedEnemyIndex = null;
let selectedAllyId = null;


// ----- ГЛОБАЛЬНЫЕ ОБЪЕКТЫ ДЛЯ UI -----
window.currentDiceValues = [];
window.diceSelections = {};


// ============================================================
// 1. ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎲 LEGENDICE - загрузка...');
    
    try {
        const user = await signInAnonymously();
        console.log('✅ Вход выполнен! UID:', user.uid);
        
        initUI();
        initDice3D();
        
        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';
        
        showLobbyScreen();
        
        const playerIdEl = document.getElementById('lobby-player-id');
        if (playerIdEl) playerIdEl.textContent = user.uid.slice(0, 8) + '...';
        
        // Проверка параметра ?game= в URL
        const urlParams = new URLSearchParams(window.location.search);
        const gameIdParam = urlParams.get('game');
        if (gameIdParam) {
            document.getElementById('join-game-id').value = gameIdParam;
            setTimeout(() => {
                document.getElementById('btn-join-game')?.click();
            }, 500);
        }
        
        console.log('✅ LEGENDICE загружена!');
    } catch (error) {
        console.error('❌ Ошибка:', error);
        document.getElementById('loading-screen').innerHTML = `
            <h1>❌ Ошибка</h1>
            <p style="color:#ff6b6b;">${error.message}</p>
            <button onclick="location.reload()" style="padding:10px 20px; border-radius:8px; border:none; background:#f0c040; color:#000; font-weight:bold; margin-top:15px; cursor:pointer;">
                Перезагрузить
            </button>
        `;
    }
});

// ============================================================
// 2. ЛОББИ
// ============================================================

function showLobbyScreen() {
    const lobbyScreen = document.getElementById('lobby-screen');
    const gameScreen = document.getElementById('game-screen');
    if (lobbyScreen) lobbyScreen.style.display = 'flex';
    if (gameScreen) gameScreen.style.display = 'none';
    
    const content = document.getElementById('lobby-content');
    if (content) {
        content.innerHTML = `
            <div style="margin-bottom:6px; color:#888; font-size:13px;">
                🆔 ID: <span id="lobby-player-id">${getCurrentUser()?.uid?.slice(0,8) || '...'}</span>
            </div>
            <div class="class-select" id="class-select">
                ${Object.entries(CLASSES).map(([key, cls]) => `
                    <button class="class-btn" data-class="${key}">
                        ${cls.emoji}
                        <span class="class-name">${cls.name}</span>
                    </button>
                `).join('')}
            </div>
            <input type="text" id="player-name" placeholder="Ваше имя..." maxlength="20" value="Игрок">
            <button class="btn-primary" id="btn-create-game">🎲 Создать игру</button>
            <div style="display:flex; gap:8px; margin-top:4px;">
                <input type="text" id="join-game-id" placeholder="Код игры..." style="flex:1; padding:10px; border-radius:8px; border:none; background:#1e2337; color:#fff; font-size:14px;">
                <button class="btn-secondary" id="btn-join-game">Подключиться</button>
            </div>
            <div id="lobby-status" style="color:#888; font-size:14px; margin-top:8px; min-height:20px;">👋 Выберите класс и создайте игру</div>
            <div id="invite-section" style="display:none; margin-top:8px; padding:10px; background:#1e2337; border-radius:8px;">
                <div style="color:#888; font-size:11px;">🔗 Ссылка для приглашения:</div>
                <div style="display:flex; gap:6px; align-items:center; margin-top:4px;">
                    <input id="invite-link-input" type="text" readonly style="flex:1; padding:6px 10px; border-radius:6px; border:none; background:#0B0E1A; color:#f0c040; font-size:13px;">
                    <button id="invite-copy-btn" style="padding:6px 14px; border-radius:6px; border:none; background:#f0c040; color:#000; font-weight:bold; cursor:pointer;">📋</button>
                </div>
            </div>
        `;
    }
    
    // Выбор класса
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            myClass = this.dataset.class;
        });
    });
    const firstBtn = document.querySelector('.class-btn');
    if (firstBtn) { firstBtn.classList.add('selected'); myClass = firstBtn.dataset.class; }
    
    // Создать игру
    document.getElementById('btn-create-game').addEventListener('click', async function() {
        const name = document.getElementById('player-name')?.value || 'Игрок';
        const status = document.getElementById('lobby-status');
        if (!myClass) { if (status) status.textContent = '⚠️ Выберите класс!'; return; }
        
        if (status) status.textContent = '⏳ Создание игры...';
        try {
            const gameId = await createGame(name, myClass);
            currentGameId = gameId;
            currentPlayerId = 'player1';
            if (status) status.textContent = `✅ Игра создана! Код: ${gameId}`;
            
            // Показываем ссылку для приглашения
            const inviteSection = document.getElementById('invite-section');
            const inviteInput = document.getElementById('invite-link-input');
            if (inviteSection && inviteInput) {
                const link = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
                inviteInput.value = link;
                inviteSection.style.display = 'block';
                document.getElementById('invite-copy-btn')?.addEventListener('click', () => {
                    navigator.clipboard.writeText(link).then(() => {
                        status.textContent = '✅ Ссылка скопирована!';
                    }).catch(() => {
                        // Fallback
                        inviteInput.select();
                        document.execCommand('copy');
                        status.textContent = '✅ Ссылка скопирована!';
                    });
                });
            }
            
            if (unsubscribeGame) unsubscribeGame();
            unsubscribeGame = subscribeToGame(gameId, handleGameUpdate);
            
            await initializeGame(gameId);
        } catch (error) {
            console.error(error);
            if (status) status.textContent = `❌ Ошибка: ${error.message}`;
        }
    });
    
    // Подключиться к игре
    document.getElementById('btn-join-game').addEventListener('click', async function() {
        const gameId = document.getElementById('join-game-id')?.value.trim();
        const name = document.getElementById('player-name')?.value || 'Игрок';
        const status = document.getElementById('lobby-status');
        if (!gameId) { if (status) status.textContent = '⚠️ Введите код игры!'; return; }
        if (!myClass) { if (status) status.textContent = '⚠️ Выберите класс!'; return; }
        
        if (status) status.textContent = '⏳ Подключение...';
        try {
            await joinGame(gameId, name, myClass);
            currentGameId = gameId;
            currentPlayerId = 'player2';
            if (status) status.textContent = `✅ Подключено к игре: ${gameId}`;
            
            if (unsubscribeGame) unsubscribeGame();
            unsubscribeGame = subscribeToGame(gameId, handleGameUpdate);
            
            await initializeGame(gameId);
        } catch (error) {
            console.error(error);
            if (status) status.textContent = `❌ Ошибка: ${error.message}`;
        }
    });
}

// ============================================================
// 3. ИНИЦИАЛИЗАЦИЯ ИГРЫ
// ============================================================

async function initializeGame(gameId) {
    // Проверяем, есть ли уже данные игры
    const data = await getGameData(gameId);
    
    if (!data.dungeon) {
        // Генерируем подземелье
        const totalFloors = 5;
        const dungeon = generateDungeon(totalFloors);
        const firstRoom = Object.keys(dungeon.rooms)[0];
        
        // Обновляем позиции игроков
        const updates = {
            dungeon: dungeon,
            status: 'dungeon',
            turn: {
                currentPlayer: 'player1',
                phase: 'idle',
                order: ['player1', 'player2'],
                index: 0,
                diceValues: [],
                selectedAttack: [],
                selectedDefense: [],
                targetAttack: null,
                targetDefense: null,
                combo: null
            }
        };
        
        // Обновляем позиции
        if (data.players.player1) {
            updates[`players.player1.position`] = firstRoom;
        }
        if (data.players.player2) {
            updates[`players.player2.position`] = firstRoom;
        }
        
        await updateGameState(gameId, updates);
    }
    
    // Переключаем экраны
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    
    // Настраиваем UI
    setupGameUI();
}

// ============================================================
// 4. ОБРАБОТКА ОБНОВЛЕНИЙ ИГРЫ (Firebase)
// ============================================================

function handleGameUpdate(data) {
    if (!data) {
        console.warn('⚠️ Нет данных игры');
        return;
    }
    
    // Инициализируем logs, если их нет
    if (!data.logs) data.logs = [];
    if (!data.chat) data.chat = [];
    if (!data.pings) data.pings = [];
    
    gameState = data;
    
    const user = getCurrentUser();
    let myPlayerId = null;
    if (data.players?.player1?.uid === user?.uid) myPlayerId = 'player1';
    else if (data.players?.player2?.uid === user?.uid) myPlayerId = 'player2';
    
    if (!myPlayerId) {
        console.warn('⚠️ Игрок не найден');
        return;
    }
    
    currentPlayerId = myPlayerId;
    isMyTurn = data.turn?.currentPlayer === myPlayerId;
    
    if (data.status === 'finished') {
        alert('🎉 Подземелье пройдено!');
    }
    
    // Обновляем UI
    updateUI(data, myPlayerId, isMyTurn);
    
    // Проверяем, нужно ли начать бой (с защитой от бесконечного цикла)
    checkAndStartCombat(data, myPlayerId);
}
// ============================================================
// 5. НАСТРОЙКА UI
// ============================================================

function setupGameUI() {
    // Кнопка броска
    document.getElementById('btn-roll').addEventListener('click', function() {
        if (!isMyTurn) { alert('⏳ Сейчас не ваш ход!'); return; }
        const room = getRoom(gameState.dungeon, gameState.players[currentPlayerId]?.position);
        if (!room || room.isCleared || room.type === 'rest' || room.type === 'shop') {
            alert('⏳ Здесь нельзя бросить кубики');
            return;
        }
        handleRollDice();
    });
    
    // Инвентарь
    document.getElementById('btn-inventory').addEventListener('click', showInventoryModal);
    
    // Карта
    document.getElementById('btn-map').addEventListener('click', showMapModal);
    
    // Закрытие 3D модалки
    document.getElementById('dice-close-btn')?.addEventListener('click', () => {
        closeDiceModal();
    });
    
    // Чат
    document.getElementById('chat-send')?.addEventListener('click', sendChat);
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChat();
    });
    
    // Пинги
    document.querySelectorAll('.ping-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const emoji = this.dataset.emoji;
            if (gameState && currentPlayerId) {
                const roomId = gameState.players[currentPlayerId]?.position || 'room_1';
                sendPing(currentGameId, currentPlayerId, roomId, emoji);
            }
        });
    });
}

// ============================================================
// 6. НАЧАЛО БОЯ
// ============================================================

function checkAndStartCombat(data, myPlayerId) {
    const room = getRoom(data.dungeon, data.players[myPlayerId]?.position);
    if (!room) return;
    if (room.type !== 'combat' && room.type !== 'boss') return;
    if (room.isCleared) return;
    
    // Проверяем, есть ли живые враги
    const hasAlive = room.enemies?.some(e => e.isAlive);
    if (!hasAlive) {
        room.isCleared = true;
        updateGameState(currentGameId, { dungeon: data.dungeon });
        return;
    }
    
    // Если ход текущего игрока и бой ещё не начат
    if (data.turn?.currentPlayer === myPlayerId && data.turn?.phase === 'idle') {
        // Показываем уведомление
        const msg = room.type === 'boss' ? '👑 БОСС!' : '⚔️ Начинается бой!';
        addLog(msg);
        // Переводим в фазу броска
        data.turn.phase = 'roll';
        updateGameState(currentGameId, { turn: data.turn });
    }
}

// ============================================================
// 7. БРОСОК КУБИКОВ
// ============================================================

function handleRollDice() {
    if (!gameState) return;
    const player = gameState.players[currentPlayerId];
    if (!player || !player.isAlive) {
        alert('Вы не можете ходить!');
        return;
    }
    
    // Бросаем 2d6
    const count = 2;
    diceValues = [];
    for (let i = 0; i < count; i++) {
        diceValues.push(Math.floor(Math.random() * 6) + 1);
    }
    
    console.log('🎲 Выпало:', diceValues);
    
    // Проверяем комбинации
    const combo = checkCombo(player.class, diceValues);
    
    // Сохраняем в состояние
    gameState.turn.diceValues = diceValues;
    gameState.turn.phase = 'distribute';
    gameState.turn.combo = combo;
    
    updateGameState(currentGameId, { turn: gameState.turn });
    
    // Показываем модалку
    window.currentDiceValues = diceValues;
    window.diceSelections = {};
    
    if (combo) {
        showDiceModal(diceValues, combo.name, combo.description);
        // Применяем комбинацию автоматически, если не требует выбора цели
        if (combo.target === 'self' || combo.target === 'all_allies' || combo.target === 'all_enemies') {
            setTimeout(() => {
                applyCombo(currentPlayerId, combo);
                closeDiceModal();
                nextTurn();
            }, 2500);
        } else {
            // Требует выбора цели
            gameState.turn.phase = 'select_target';
            updateGameState(currentGameId, { turn: gameState.turn });
            // Показываем подсветку целей в UI
            updateUI(gameState, currentPlayerId, isMyTurn);
        }
    } else {
        showDiceModal(diceValues, null, null);
        // Ждём распределения через кнопки в модалке
    }
}

// ----- ПРОВЕРКА КОМБИНАЦИЙ -----
function checkCombo(className, diceValues) {
    const combos = COMBOS[className];
    if (!combos) return null;
    
    const sorted = [...diceValues].sort((a, b) => a - b);
    const sortedStr = sorted.join(',');
    
    for (const combo of combos) {
        const comboDice = [...combo.dice].sort((a, b) => a - b);
        const comboStr = comboDice.join(',');
        if (sortedStr === comboStr) return combo;
    }
    return null;
}

// ----- ПРИМЕНЕНИЕ КОМБИНАЦИИ -----
function applyCombo(playerId, combo) {
    const player = gameState.players[playerId];
    if (!player) return;
    
    console.log(`🔥 Применяем: ${combo.name}`);
    const room = getRoom(gameState.dungeon, player.position);
    
    switch (combo.effect) {
        case 'heal_all':
            Object.keys(gameState.players).forEach(id => {
                const p = gameState.players[id];
                if (p && p.isAlive) {
                    p.hp = Math.min(p.hp + combo.value, p.maxHp);
                }
            });
            addLog(`💚 ${player.name} лечит всех на ${combo.value} HP`);
            break;
            
        case 'damage_all':
            if (room?.enemies) {
                room.enemies.forEach(enemy => {
                    if (enemy.isAlive) {
                        enemy.hp -= combo.value;
                        if (enemy.hp <= 0) {
                            enemy.isAlive = false;
                            enemy.hp = 0;
                            addLog(`💀 ${enemy.name} убит!`);
                        }
                    }
                });
                updateRoomAfterCombat(room);
            }
            addLog(`🔥 ${player.name} наносит ${combo.value} урона всем врагам!`);
            break;
            
        case 'shield':
            const allyId = combo.target === 'ally' ? 
                Object.keys(gameState.players).find(id => id !== playerId && gameState.players[id]?.isAlive) : 
                playerId;
            if (allyId && gameState.players[allyId]) {
                if (!gameState.players[allyId].shield) gameState.players[allyId].shield = 0;
                gameState.players[allyId].shield += combo.value;
                addLog(`🛡️ ${player.name} даёт щит ${combo.value} HP ${gameState.players[allyId].name}`);
            }
            break;
            
        case 'defense_boost':
            player.defense += combo.value;
            addLog(`🪨 ${player.name} получает +${combo.value} к защите`);
            break;
            
        case 'stun':
            if (room?.enemies) {
                const target = room.enemies.find(e => e.isAlive);
                if (target) {
                    target.stunned = true;
                    addLog(`⚡ ${player.name} оглушает ${target.name}!`);
                }
            }
            break;
            
        case 'instant_kill':
            if (room?.enemies) {
                const target = room.enemies.find(e => e.isAlive && e.type !== 'boss');
                if (target) {
                    target.isAlive = false;
                    target.hp = 0;
                    addLog(`🗡️ ${player.name} мгновенно убивает ${target.name}!`);
                } else {
                    // Если босс — наносим урон x3
                    const boss = room.enemies.find(e => e.isAlive && e.type === 'boss');
                    if (boss) {
                        const damage = combo.value || 15;
                        boss.hp -= damage * 3;
                        if (boss.hp <= 0) {
                            boss.isAlive = false;
                            boss.hp = 0;
                            addLog(`👑 Босс повержен!`);
                        } else {
                            addLog(`💥 ${player.name} наносит ${damage * 3} урона боссу!`);
                        }
                    }
                }
            }
            break;
            
        case 'damage':
            if (room?.enemies) {
                const target = room.enemies.find(e => e.isAlive);
                if (target) {
                    target.hp -= combo.value;
                    if (target.hp <= 0) {
                        target.isAlive = false;
                        target.hp = 0;
                        addLog(`💀 ${target.name} убит!`);
                    } else {
                        addLog(`⚔️ ${player.name} наносит ${combo.value} урона ${target.name}`);
                    }
                }
            }
            break;
            
        default:
            console.log(`⚠️ Неизвестный эффект: ${combo.effect}`);
    }
    
    // Проверяем, зачищена ли комната
    if (room) updateRoomAfterCombat(room);
    
    // Синхронизируем
    updateGameState(currentGameId, {
        players: gameState.players,
        dungeon: gameState.dungeon,
        logs: gameState.logs
    });
}

// ----- ПОДТВЕРЖДЕНИЕ РАСПРЕДЕЛЕНИЯ КУБИКОВ -----
window.confirmDiceDistribution = function(attackSum, defenseSum, selections) {
    const player = gameState.players[currentPlayerId];
    if (!player) return;
    
    const room = getRoom(gameState.dungeon, player.position);
    if (!room) return;
    
    // Сохраняем выбор
    gameState.turn.selectedAttack = Object.keys(selections).filter(i => selections[i] === 'attack').map(i => parseInt(i));
    gameState.turn.selectedDefense = Object.keys(selections).filter(i => selections[i] === 'defense').map(i => parseInt(i));
    
    // Применяем атаку и защиту
    if (attackSum > 0) {
        const target = room.enemies?.find(e => e.isAlive);
        if (target) {
            const damage = attackSum - (target.defense || 0);
            const finalDamage = Math.max(damage, 1);
            target.hp -= finalDamage;
            if (target.hp <= 0) {
                target.isAlive = false;
                target.hp = 0;
                addLog(`💀 ${target.name} убит!`);
            } else {
                addLog(`⚔️ ${player.name} наносит ${finalDamage} урона ${target.name}`);
            }
        }
    }
    
    if (defenseSum > 0) {
        if (!player.shield) player.shield = 0;
        player.shield += defenseSum;
        addLog(`🛡️ ${player.name} получает щит ${defenseSum} HP`);
    }
    
    // Проверяем, зачищена ли комната
    updateRoomAfterCombat(room);
    
    // Синхронизируем
    updateGameState(currentGameId, {
        players: gameState.players,
        dungeon: gameState.dungeon,
        turn: gameState.turn,
        logs: gameState.logs
    });
    
    // Переход хода
    nextTurn();
};

// ============================================================
// 8. ХОДЫ
// ============================================================

function nextTurn() {
    if (!gameState) return;
    
    // Проверяем, есть ли живые враги
    const player = gameState.players[currentPlayerId];
    const room = getRoom(gameState.dungeon, player?.position);
    
    // Если комната зачищена или нет врагов — переход
    if (!room || room.isCleared || room.type === 'rest' || room.type === 'shop') {
        // Переключаем ход
        const order = ['player1', 'player2'];
        const currentIdx = gameState.turn.index || 0;
        const nextIdx = (currentIdx + 1) % order.length;
        const nextPlayer = order[nextIdx];
        
        gameState.turn.currentPlayer = nextPlayer;
        gameState.turn.index = nextIdx;
        gameState.turn.phase = 'idle';
        gameState.turn.diceValues = [];
        gameState.turn.selectedAttack = [];
        gameState.turn.selectedDefense = [];
        gameState.turn.combo = null;
        
        updateGameState(currentGameId, { turn: gameState.turn });
        return;
    }
    
    // Проверяем, все ли враги мертвы
    const hasAlive = room.enemies?.some(e => e.isAlive);
    if (!hasAlive) {
        room.isCleared = true;
        addLog(`✅ Комната зачищена!`);
        updateGameState(currentGameId, { dungeon: gameState.dungeon });
        
        // Переключаем ход
        const order = ['player1', 'player2'];
        const currentIdx = gameState.turn.index || 0;
        const nextIdx = (currentIdx + 1) % order.length;
        const nextPlayer = order[nextIdx];
        
        gameState.turn.currentPlayer = nextPlayer;
        gameState.turn.index = nextIdx;
        gameState.turn.phase = 'idle';
        updateGameState(currentGameId, { turn: gameState.turn });
        return;
    }
    
    // Переключаем ход
    const order = ['player1', 'player2'];
    const currentIdx = gameState.turn.index || 0;
    const nextIdx = (currentIdx + 1) % order.length;
    const nextPlayer = order[nextIdx];
    
    // Проверяем, жив ли следующий игрок
    const nextPlayerData = gameState.players[nextPlayer];
    if (!nextPlayerData || !nextPlayerData.isAlive) {
        gameState.turn.index = nextIdx;
        addLog(`⏭️ Ход ${nextPlayerData?.name || 'игрока'} пропущен (мёртв)`);
        nextTurn();
        return;
    }
    
    gameState.turn.currentPlayer = nextPlayer;
    gameState.turn.index = nextIdx;
    gameState.turn.phase = 'idle';
    gameState.turn.diceValues = [];
    gameState.turn.selectedAttack = [];
    gameState.turn.selectedDefense = [];
    gameState.turn.combo = null;
    
    updateGameState(currentGameId, { turn: gameState.turn });
    addLog(`🎯 Ход переходит к ${nextPlayerData.name}`);
}

// ============================================================
// 9. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function addLog(text) {
    if (!gameState.logs) gameState.logs = [];
    gameState.logs.push({ text, timestamp: Date.now() });
    console.log('📜', text);
}

function sendChat() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (text && currentGameId && currentPlayerId) {
        sendChatMessage(currentGameId, currentPlayerId, text);
        input.value = '';
    }
}

// ----- ВЫБОР КОМНАТЫ -----
window.selectRoom = function(roomId) {
    if (!gameState || !currentPlayerId) return;
    const player = gameState.players[currentPlayerId];
    if (!player) return;
    
    const currentRoom = getRoom(gameState.dungeon, player.position);
    if (currentRoom && !currentRoom.isCleared && currentRoom.type === 'combat') {
        alert('⚔️ Сначала завершите бой!');
        return;
    }
    
    const targetRoom = getRoom(gameState.dungeon, roomId);
    if (!targetRoom) return;
    
    // Обновляем позицию
    player.position = roomId;
    if (!targetRoom.players) targetRoom.players = [];
    if (!targetRoom.players.includes(currentPlayerId)) {
        targetRoom.players.push(currentPlayerId);
    }
    
    // Удаляем игрока из старой комнаты
    if (currentRoom && currentRoom.players) {
        currentRoom.players = currentRoom.players.filter(id => id !== currentPlayerId);
    }
    
    updateGameState(currentGameId, {
        players: gameState.players,
        dungeon: gameState.dungeon
    });
};

// ----- ВЫБОР ЦЕЛИ ДЛЯ АТАКИ -----
window.selectEnemyTarget = function(index) {
    if (!gameState || !isMyTurn) return;
    const room = getRoom(gameState.dungeon, gameState.players[currentPlayerId]?.position);
    if (!room || !room.enemies) return;
    
    const enemy = room.enemies[index];
    if (!enemy || !enemy.isAlive) return;
    
    gameState.turn.targetAttack = index;
    gameState.turn.phase = 'apply';
    
    // Применяем комбинацию или атаку
    const combo = gameState.turn.combo;
    if (combo) {
        // Применяем комбинацию к выбранному врагу
        applyComboToTarget(currentPlayerId, combo, enemy);
    }
    
    updateGameState(currentGameId, { turn: gameState.turn });
    closeDiceModal();
    nextTurn();
};

// ----- ПРИМЕНЕНИЕ КОМБО К ЦЕЛИ -----
function applyComboToTarget(playerId, combo, enemy) {
    const player = gameState.players[playerId];
    if (!player) return;
    
    switch (combo.effect) {
        case 'instant_kill':
            enemy.isAlive = false;
            enemy.hp = 0;
            addLog(`🗡️ ${player.name} мгновенно убивает ${enemy.name}!`);
            break;
        case 'damage':
            enemy.hp -= combo.value;
            if (enemy.hp <= 0) {
                enemy.isAlive = false;
                enemy.hp = 0;
                addLog(`💀 ${enemy.name} убит!`);
            } else {
                addLog(`⚔️ ${player.name} наносит ${combo.value} урона ${enemy.name}`);
            }
            break;
        case 'stun':
            enemy.stunned = true;
            addLog(`⚡ ${player.name} оглушает ${enemy.name}!`);
            break;
        case 'bleed':
            if (!enemy.bleed) enemy.bleed = 0;
            enemy.bleed += combo.value;
            addLog(`🩸 ${enemy.name} получает кровотечение!`);
            break;
        default:
            // Другие эффекты
            addLog(`✨ ${player.name} применяет ${combo.name} к ${enemy.name}`);
    }
    
    updateRoomAfterCombat(getRoom(gameState.dungeon, player.position));
}

// ----- ОТКРЫТЬ СУНДУК -----
window.openChestAction = function(index) {
    if (!gameState || !currentPlayerId) return;
    const room = getRoom(gameState.dungeon, gameState.players[currentPlayerId]?.position);
    if (!room || !room.chests) return;
    
    const chest = room.chests[index];
    if (!chest || chest.isOpened) return;
    
    const item = openChest(chest, gameState.players[currentPlayerId]);
    if (item) {
        const rarityInfo = RARITY[item.rarity] || { label: 'Обычный', color: '#888' };
        addLog(`📦 ${gameState.players[currentPlayerId].name} нашёл ${item.name} (${rarityInfo.label})!`);
        updateGameState(currentGameId, {
            dungeon: gameState.dungeon,
            players: gameState.players
        });
        updateUI(gameState, currentPlayerId, isMyTurn);
    }
};

// ----- КУПИТЬ В МАГАЗИНЕ -----
window.buyShopAction = function(index) {
    if (!gameState || !currentPlayerId) return;
    const room = getRoom(gameState.dungeon, gameState.players[currentPlayerId]?.position);
    if (!room || !room.shopItems) return;
    
    const item = room.shopItems[index];
    if (!item) return;
    
    // Проверяем золото (пока нет)
    const bought = buyShopItem(item, gameState.players[currentPlayerId]);
    if (bought) {
        addLog(`🛒 ${gameState.players[currentPlayerId].name} купил ${item.name}`);
        // Удаляем товар из магазина
        room.shopItems.splice(index, 1);
        updateGameState(currentGameId, {
            dungeon: gameState.dungeon,
            players: gameState.players
        });
        updateUI(gameState, currentPlayerId, isMyTurn);
    }
};

// ----- ОТДОХНУТЬ -----
window.restHealAction = function() {
    if (!gameState || !currentPlayerId) return;
    const player = gameState.players[currentPlayerId];
    if (!player) return;
    
    const healAmount = Math.floor(player.maxHp * 0.5);
    player.hp = Math.min(player.hp + healAmount, player.maxHp);
    const room = getRoom(gameState.dungeon, player.position);
    if (room) room.isCleared = true;
    
    addLog(`🏥 ${player.name} отдохнул и восстановил ${healAmount} HP`);
    updateGameState(currentGameId, {
        players: gameState.players,
        dungeon: gameState.dungeon
    });
    updateUI(gameState, currentPlayerId, isMyTurn);
    
    // Переход хода
    nextTurn();
};

// ============================================================
// 10. ИНВЕНТАРЬ И КАРТА
// ============================================================

function showInventoryModal() {
    const player = gameState?.players[currentPlayerId];
    if (!player) {
        alert('Нет данных игрока');
        return;
    }
    
    let html = `
        <button class="modal-close" onclick="window.closeModal()">✕</button>
        <div class="modal-title">📦 Инвентарь</div>
        <div class="modal-body">
            <div style="margin-bottom:10px;">
                <strong>${player.name || 'Игрок'}</strong> 
                ❤️ ${player.hp}/${player.maxHp}
                ${player.shield ? `🛡️ +${player.shield}` : ''}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
    `;
    
    const slotKeys = ['head', 'leftHand', 'rightHand', 'body', 'legs', 'amulet'];
    slotKeys.forEach(key => {
        const slot = player.slots?.[key];
        const slotEmoji = SLOT_TYPES[key]?.emoji || '❓';
        if (slot) {
            const rarityClass = slot.rarity || 'common';
            html += `
                <div class="slot-item ${rarityClass}" style="padding:6px; border-radius:6px; background:#1e2337; text-align:center; font-size:14px; cursor:pointer;" onclick="window.closeModal();">
                    ${slot.emoji || slotEmoji} ${slot.name || key} (${slot.stat || 0})
                </div>
            `;
        } else {
            html += `
                <div style="padding:6px; border-radius:6px; background:#0B0E1A; text-align:center; color:#444; font-size:11px;">
                    ${slotEmoji} пусто
                </div>
            `;
        }
    });
    
    html += `
            </div>
            <div style="margin-top:12px; border-top:1px solid #2a2f45; padding-top:8px;">
                <div style="color:#888; font-size:11px;">📦 Инвентарь (${player.inventory?.length || 0} предметов)</div>
    `;
    
    if (player.inventory && player.inventory.length > 0) {
        player.inventory.forEach((item, idx) => {
            const rarityInfo = RARITY[item.rarity] || { color: '#888' };
            html += `
                <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #1a1f30; font-size:13px; color:${rarityInfo.color};">
                    <span>${item.emoji || '📦'} ${item.name}</span>
                    <span style="color:#888; font-size:11px;">${item.stat || ''}</span>
                </div>
            `;
        });
    } else {
        html += `<div style="color:#444; font-size:12px;">Пусто</div>`;
    }
    
    html += `
            </div>
            <button class="btn-secondary" onclick="window.closeModal()" style="margin-top:12px; padding:8px; width:100%;">Закрыть</button>
        </div>
    `;
    
    openModal(html);
}

function showMapModal() {
    const dungeon = gameState?.dungeon;
    if (!dungeon) {
        alert('Карта не загружена');
        return;
    }
    
    const roomIds = Object.keys(dungeon.rooms);
    let html = `
        <button class="modal-close" onclick="window.closeModal()">✕</button>
        <div class="modal-title">🗺️ Карта подземелья</div>
        <div class="modal-body">
            <div style="color:#888; font-size:13px; margin-bottom:8px;">
                Этаж ${dungeon.floor}/${dungeon.totalFloors}
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(70px, 1fr)); gap:6px;">
    `;
    
    roomIds.forEach(roomId => {
        const room = dungeon.rooms[roomId];
        const isCurrent = roomId === gameState.players[currentPlayerId]?.position;
        const isCleared = room.isCleared;
        
        let icon = '🏚️';
        if (room.type === 'combat') icon = '💀';
        else if (room.type === 'chest') icon = '💎';
        else if (room.type === 'rest') icon = '🏥';
        else if (room.type === 'shop') icon = '🏪';
        else if (room.type === 'boss') icon = '👑';
        
        const playersInRoom = room.players || [];
        const playerIcons = playersInRoom.map(id => {
            const p = gameState.players[id];
            return p ? CLASSES[p.class]?.emoji || '👤' : '';
        }).join('');
        
        html += `
            <div style="padding:10px 4px; border-radius:8px; background:${isCurrent ? '#2a2f45' : '#1e2337'}; border:2px solid ${isCurrent ? '#f0c040' : '#2a2f45'}; text-align:center; ${isCleared ? 'opacity:0.5;' : ''} cursor:pointer;" onclick="window.closeModal(); window.selectRoom('${roomId}');">
                <div style="font-size:22px;">${icon}</div>
                <div style="font-size:9px; color:#888;">${roomId.replace('floor','F').replace('_room','R')}</div>
                ${playerIcons ? `<div style="font-size:12px;">${playerIcons}</div>` : ''}
                ${isCurrent ? '<div style="font-size:9px; color:#f0c040;">📍</div>' : ''}
            </div>
        `;
    });
    
    html += `
            </div>
            <button class="btn-secondary" onclick="window.closeModal()" style="margin-top:12px; padding:8px; width:100%;">Закрыть</button>
        </div>
    `;
    
    openModal(html);
}

// ============================================================
// 11. ГЛОБАЛЬНЫЕ ФУНКЦИИ
// ============================================================

window.closeModal = closeModal;
window.closeDiceModal = closeDiceModal;
window.selectRoom = window.selectRoom;
window.selectEnemyTarget = window.selectEnemyTarget;

console.log('🎲 LEGENDICE - main.js загружен!');
