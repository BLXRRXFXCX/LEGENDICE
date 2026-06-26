// ============================================================
// LEGENDICE - main.js (полная версия с Firebase)
// ============================================================

// ----- ИМПОРТЫ -----
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
    setPlayerReady
} from './firebase.js';
import { CLASSES, SLOT_TYPES, ENEMIES, BOSS, COMBOS, RARITY, ITEMS, CONSUMABLES } from './constants.js';
import { initUI, showLobby, showGame, updateUI, openModal, closeModal, showDiceModal, closeDiceModal, showItemInfo } from './ui.js';
import { initDice3D, rollDice, closeDiceModal as closeDice3D } from './dice3d.js';
import { generateDungeon, getRoom, updateRoomAfterCombat, isRoomCleared } from './game.js';

// ----- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ -----
let gameState = null;
let currentPlayerId = null;
let currentGameId = null;
let isMyTurn = false;
let myClass = null;
let unsubscribeGame = null;
let isGameStarted = false;

// ============================================================
// 1. ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎲 LEGENDICE - загрузка...');
    
    try {
        // 1. ВХОДИМ В FIREBASE АНОНИМНО
        console.log('🔐 Попытка входа в Firebase...');
        const user = await signInAnonymously();
        console.log('✅ Вход выполнен! UID:', user.uid);
        
        // 2. Инициализация UI
        initUI();
        
        // 3. Инициализация 3D кубиков
        initDice3D();
        
        // 4. Скрываем загрузку
        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';
        
        // 5. Показываем лобби
        showLobbyScreen();
        
        // 6. Показываем ID игрока в лобби
        const playerIdEl = document.getElementById('lobby-player-id');
        if (playerIdEl) {
            playerIdEl.textContent = user.uid.slice(0, 8) + '...';
        }
        
        console.log('✅ LEGENDICE загружена с Firebase!');
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        document.getElementById('loading-screen').innerHTML = `
            <h1>❌ Ошибка Firebase</h1>
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
            <div style="margin-bottom:10px; color:#888; font-size:14px;">
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
            <div style="display:flex; gap:10px; margin-top:10px;">
                <input type="text" id="join-game-id" placeholder="Код игры..." style="flex:1; padding:10px; border-radius:8px; border:none; background:#1e2337; color:#fff;">
                <button class="btn-secondary" id="btn-join-game">Подключиться</button>
            </div>
            <div id="lobby-status" style="color:#888; font-size:14px; margin-top:10px;">👋 Выберите класс и создайте игру</div>
        `;
    }
    
    // ----- ВЫБОР КЛАССА -----
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            myClass = this.dataset.class;
        });
    });
    // Выбираем первый класс по умолчанию
    const firstBtn = document.querySelector('.class-btn');
    if (firstBtn) {
        firstBtn.classList.add('selected');
        myClass = firstBtn.dataset.class;
    }
    
    // ----- СОЗДАТЬ ИГРУ -----
    document.getElementById('btn-create-game').addEventListener('click', async function() {
        const name = document.getElementById('player-name')?.value || 'Игрок';
        const status = document.getElementById('lobby-status');
        
        if (!myClass) {
            if (status) status.textContent = '⚠️ Выберите класс!';
            return;
        }
        
        if (status) status.textContent = '⏳ Создание игры...';
        
        try {
            const gameId = await createGame(name, myClass);
            currentGameId = gameId;
            currentPlayerId = 'player1';
            
            if (status) status.textContent = `✅ Игра создана! Код: ${gameId}`;
            
            // Подписываемся на обновления
            if (unsubscribeGame) unsubscribeGame();
            unsubscribeGame = subscribeToGame(gameId, handleGameUpdate);
            
            // Запускаем игру
            startGame(gameId);
        } catch (error) {
            console.error(error);
            if (status) status.textContent = `❌ Ошибка: ${error.message}`;
        }
    });
    
    // ----- ПОДКЛЮЧИТЬСЯ К ИГРЕ -----
    document.getElementById('btn-join-game').addEventListener('click', async function() {
        const gameId = document.getElementById('join-game-id')?.value.trim();
        const name = document.getElementById('player-name')?.value || 'Игрок';
        const status = document.getElementById('lobby-status');
        
        if (!gameId) {
            if (status) status.textContent = '⚠️ Введите код игры!';
            return;
        }
        if (!myClass) {
            if (status) status.textContent = '⚠️ Выберите класс!';
            return;
        }
        
        if (status) status.textContent = '⏳ Подключение...';
        
        try {
            await joinGame(gameId, name, myClass);
            currentGameId = gameId;
            currentPlayerId = 'player2';
            
            if (status) status.textContent = `✅ Подключено к игре: ${gameId}`;
            
            // Подписываемся на обновления
            if (unsubscribeGame) unsubscribeGame();
            unsubscribeGame = subscribeToGame(gameId, handleGameUpdate);
            
            // Запускаем игру
            startGame(gameId);
        } catch (error) {
            console.error(error);
            if (status) status.textContent = `❌ Ошибка: ${error.message}`;
        }
    });
}

// ============================================================
// 3. ЗАПУСК ИГРЫ
// ============================================================

function startGame(gameId) {
    console.log('🎮 Запуск игры:', gameId);
    
    // Переключаем экраны
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    
    // Если игра ещё не инициализирована — создаём подземелье
    if (!gameState) {
        const totalFloors = 5; // Пока фиксировано
        const dungeon = generateDungeon(totalFloors);
        
        // Получаем класс игрока
        const playerClass = myClass || 'dd';
        
        gameState = {
            gameId: gameId,
            status: 'dungeon',
            dungeon: dungeon,
            players: {
                player1: {
                    uid: getCurrentUser()?.uid || 'player1',
                    name: 'Игрок 1',
                    class: playerClass,
                    hp: CLASSES[playerClass]?.hp || 20,
                    maxHp: CLASSES[playerClass]?.hp || 20,
                    attack: CLASSES[playerClass]?.attack || 8,
                    defense: CLASSES[playerClass]?.defense || 1,
                    speed: CLASSES[playerClass]?.speed || 3,
                    evasion: CLASSES[playerClass]?.evasion || 10,
                    parry: CLASSES[playerClass]?.parry || 5,
                    provoke: CLASSES[playerClass]?.provoke || 3,
                    stealth: CLASSES[playerClass]?.stealth || 5,
                    isAlive: true,
                    isShadow: false,
                    position: Object.keys(dungeon.rooms)[0] || 'room_1',
                    slots: {},
                    inventory: []
                },
                player2: null // Будет заполнено из Firebase
            },
            turn: {
                currentPlayer: 'player1',
                phase: 'idle',
                order: ['player1'],
                index: 0,
                diceValues: [],
                selectedAttack: [],
                selectedDefense: [],
                targetAttack: null,
                targetDefense: null,
                combo: null
            },
            chat: [],
            pings: [],
            logs: []
        };
    }
    
    // Обновляем UI
    updateUI(gameState, currentPlayerId, isMyTurn);
    
    // Назначаем обработчики кнопок
    setupGameUI();
    
    console.log('✅ Игра запущена!');
}

// ============================================================
// 4. ОБРАБОТКА ОБНОВЛЕНИЙ ИГРЫ (Firebase)
// ============================================================

function handleGameUpdate(data) {
    if (!data) {
        console.warn('⚠️ Нет данных игры');
        return;
    }
    
    // Обновляем состояние
    gameState = data;
    
    // Определяем, кто мы
    const user = getCurrentUser();
    let myPlayerId = null;
    
    if (data.players?.player1?.uid === user?.uid) {
        myPlayerId = 'player1';
    } else if (data.players?.player2?.uid === user?.uid) {
        myPlayerId = 'player2';
    }
    
    if (!myPlayerId) {
        console.warn('⚠️ Игрок не найден в игре');
        return;
    }
    
    // Обновляем текущего игрока
    currentPlayerId = myPlayerId;
    
    // Проверяем, наш ли ход
    isMyTurn = data.turn?.currentPlayer === myPlayerId;
    
    // Если статус игры изменился
    if (data.status === 'finished') {
        alert('🎉 Игра завершена!');
        // Показываем результаты
    }
    
    // Обновляем UI
    updateUI(data, myPlayerId, isMyTurn);
}

// ============================================================
// 5. НАСТРОЙКА ИГРОВОГО UI
// ============================================================

function setupGameUI() {
    // ----- КНОПКА БРОСКА -----
    const rollBtn = document.getElementById('btn-roll');
    if (rollBtn) {
        rollBtn.addEventListener('click', function() {
            if (!isMyTurn) {
                alert('⏳ Сейчас не ваш ход!');
                return;
            }
            if (gameState?.turn?.phase === 'combat') {
                handleRollDice();
            } else {
                alert('⏳ Сейчас нельзя бросить кубики');
            }
        });
    }
    
    // ----- КНОПКА ИНВЕНТАРЯ -----
    document.getElementById('btn-inventory')?.addEventListener('click', function() {
        showInventoryModal();
    });
    
    // ----- КНОПКА КАРТЫ -----
    document.getElementById('btn-map')?.addEventListener('click', function() {
        showMapModal();
    });
    
    // ----- ЧАТ -----
    document.getElementById('chat-send')?.addEventListener('click', sendChat);
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChat();
    });
    
    // ----- ПИНГИ -----
    document.querySelectorAll('.ping-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const emoji = this.dataset.emoji;
            sendPingAction(emoji);
        });
    });
}

// ============================================================
// 6. БРОСОК КУБИКОВ
// ============================================================

function handleRollDice() {
    console.log('🎲 Бросок кубиков!');
    
    if (!gameState) return;
    const playerId = gameState.turn.currentPlayer;
    const player = gameState.players[playerId];
    
    if (!player || !player.isAlive) {
        alert('Вы не можете ходить!');
        return;
    }
    
    // Бросаем 2d6
    const count = 2;
    const diceValues = [];
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
    
    // Синхронизируем с Firebase
    if (currentGameId) {
        updateGameState(currentGameId, {
            turn: gameState.turn
        });
    }
    
    // Показываем модалку с кубиками
    if (combo) {
        showDiceModal(diceValues, combo.name, combo.effect);
        // Если комбинация не требует выбора цели — применяем автоматически
        if (combo.target === 'self' || combo.target === 'all_allies' || combo.target === 'all_enemies') {
            applyCombo(playerId, combo);
            // Закрываем модалку через 3 секунды
            setTimeout(() => {
                closeDiceModal();
                nextTurn();
            }, 3000);
        }
    } else {
        showDiceModal(diceValues, null, null);
    }
}

// ----- ПРОВЕРКА КОМБИНАЦИЙ -----
function checkCombo(className, diceValues) {
    const combos = COMBOS[className];
    if (!combos) return null;
    
    // Сортируем значения для сравнения
    const sorted = [...diceValues].sort((a, b) => a - b);
    const sortedStr = sorted.join(',');
    
    for (const combo of combos) {
        const comboDice = [...combo.dice].sort((a, b) => a - b);
        const comboStr = comboDice.join(',');
        if (sortedStr === comboStr) {
            return combo;
        }
    }
    
    return null;
}

// ----- ПРИМЕНЕНИЕ КОМБИНАЦИИ -----
function applyCombo(playerId, combo) {
    const player = gameState.players[playerId];
    if (!player) return;
    
    console.log(`🔥 Применяем комбинацию: ${combo.name}`);
    
    switch (combo.effect) {
        case 'heal_all':
            // Лечим всех союзников
            Object.keys(gameState.players).forEach(id => {
                const p = gameState.players[id];
                if (p && p.isAlive) {
                    p.hp = Math.min(p.hp + combo.value, p.maxHp);
                }
            });
            addLog(`💚 ${player.name} применяет ${combo.name}! Все healed на ${combo.value} HP`);
            break;
            
        case 'damage_all':
            // Урон по всем врагам
            const room = getRoom(gameState.dungeon, player.position);
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
            // Щит союзнику
            const allyId = combo.target === 'ally' ? Object.keys(gameState.players).find(id => id !== playerId) : playerId;
            if (allyId && gameState.players[allyId]) {
                // Добавляем щит как временный бафф
                if (!gameState.players[allyId].shield) gameState.players[allyId].shield = 0;
                gameState.players[allyId].shield += combo.value;
                addLog(`🛡️ ${player.name} даёт щит ${combo.value} HP союзнику!`);
            }
            break;
            
        case 'defense_boost':
            // Увеличение защиты
            player.defense += combo.value;
            addLog(`🪨 ${player.name} получает +${combo.value} к защите!`);
            break;
            
        case 'stun':
            // Оглушение врага
            // TODO: Выбрать врага
            addLog(`⚡ ${player.name} оглушает врага!`);
            break;
            
        case 'instant_kill':
            // Мгновенное убийство
            // TODO: Выбрать врага
            addLog(`🗡️ ${player.name} мгновенно убивает врага!`);
            break;
            
        default:
            console.log(`⚠️ Неизвестный эффект: ${combo.effect}`);
    }
    
    // Синхронизируем с Firebase
    if (currentGameId) {
        updateGameState(currentGameId, {
            players: gameState.players,
            dungeon: gameState.dungeon,
            logs: gameState.logs
        });
    }
}

// ============================================================
// 7. ХОДЫ
// ============================================================

function nextTurn() {
    if (!gameState) return;
    
    // Проверяем, есть ли живые враги
    const hasEnemies = checkLivingEnemies();
    if (!hasEnemies) {
        // Все враги мертвы — комната зачищена
        const room = getRoom(gameState.dungeon, gameState.players[currentPlayerId]?.position);
        if (room) {
            room.isCleared = true;
            addLog(`✅ Комната зачищена!`);
            updateGameState(currentGameId, {
                dungeon: gameState.dungeon,
                logs: gameState.logs
            });
        }
        return;
    }
    
    // Переключаем ход
    const order = gameState.turn.order || ['player1', 'player2'];
    const currentIndex = gameState.turn.index || 0;
    const nextIndex = (currentIndex + 1) % order.length;
    const nextPlayer = order[nextIndex];
    
    // Проверяем, жив ли следующий игрок
    const nextPlayerData = gameState.players[nextPlayer];
    if (!nextPlayerData || !nextPlayerData.isAlive) {
        // Пропускаем мёртвого игрока
        gameState.turn.index = nextIndex;
        addLog(`⏭️ Ход ${nextPlayerData?.name || 'игрока'} пропущен (мёртв)`);
        nextTurn();
        return;
    }
    
    // Обновляем состояние
    gameState.turn.currentPlayer = nextPlayer;
    gameState.turn.index = nextIndex;
    gameState.turn.phase = 'idle';
    gameState.turn.diceValues = [];
    gameState.turn.selectedAttack = [];
    gameState.turn.selectedDefense = [];
    gameState.turn.targetAttack = null;
    gameState.turn.targetDefense = null;
    
    // Синхронизируем с Firebase
    if (currentGameId) {
        updateGameState(currentGameId, {
            turn: gameState.turn,
            logs: gameState.logs
        });
    }
    
    // Обновляем UI
    const user = getCurrentUser();
    const myId = gameState.players.player1?.uid === user?.uid ? 'player1' : 
                 gameState.players.player2?.uid === user?.uid ? 'player2' : null;
    isMyTurn = nextPlayer === myId;
    
    updateUI(gameState, myId, isMyTurn);
    
    addLog(`🎯 Ход переходит к ${nextPlayerData.name}`);
}

// ----- ПРОВЕРКА ЖИВЫХ ВРАГОВ -----
function checkLivingEnemies() {
    const playerPos = gameState.players[currentPlayerId]?.position;
    const room = getRoom(gameState.dungeon, playerPos);
    if (!room || !room.enemies) return false;
    return room.enemies.some(e => e.isAlive);
}

// ============================================================
// 8. ЧАТ И ПИНГИ
// ============================================================

function sendChat() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (text && currentGameId && currentPlayerId) {
        sendChatMessage(currentGameId, currentPlayerId, text);
        input.value = '';
    }
}

function sendPingAction(emoji) {
    if (currentGameId && currentPlayerId && gameState) {
        const roomId = gameState.players[currentPlayerId]?.position || 'room_1';
        sendPing(currentGameId, currentPlayerId, roomId, emoji);
    }
}

function addLog(text) {
    if (!gameState.logs) gameState.logs = [];
    gameState.logs.push({
        text: text,
        timestamp: Date.now()
    });
    console.log('📜', text);
}

// ============================================================
// 9. ИНВЕНТАРЬ И КАРТА (МОДАЛКИ)
// ============================================================

function showInventoryModal() {
    const player = gameState?.players[currentPlayerId];
    if (!player) {
        alert('Нет данных игрока');
        return;
    }
    
    let html = `
        <button class="modal-close" onclick="closeModal()">✕</button>
        <div class="modal-title">📦 Инвентарь</div>
        <div class="modal-body">
            <div style="margin-bottom:10px;">
                <strong>${player.name || 'Игрок'}</strong> 
                ❤️ ${player.hp}/${player.maxHp}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
    `;
    
    // Слоты
    const slotKeys = ['head', 'leftHand', 'rightHand', 'body', 'legs', 'amulet'];
    slotKeys.forEach(key => {
        const slot = player.slots?.[key];
        if (slot) {
            html += `
                <div class="slot-item ${slot.rarity || 'common'}" style="padding:8px; border-radius:6px; background:#1e2337; text-align:center;">
                    ${slot.emoji || '📦'} ${slot.name || key} (${slot.stat || 0})
                </div>
            `;
        } else {
            html += `
                <div style="padding:8px; border-radius:6px; background:#0B0E1A; text-align:center; color:#444; font-size:12px;">
                    пусто
                </div>
            `;
        }
    });
    
    html += `
            </div>
            <div style="margin-top:15px; border-top:1px solid #2a2f45; padding-top:10px;">
                <div style="color:#888; font-size:12px;">Инвентарь (${player.inventory?.length || 0} предметов)</div>
    `;
    
    if (player.inventory && player.inventory.length > 0) {
        player.inventory.forEach((item, index) => {
            html += `
                <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #1a1f30;">
                    <span>${item.emoji || '📦'} ${item.name}</span>
                    <span style="color:#888; font-size:12px;">${item.stat || ''}</span>
                </div>
            `;
        });
    } else {
        html += `<div style="color:#444; font-size:12px;">Пусто</div>`;
    }
    
    html += `
            </div>
            <button class="btn-secondary" onclick="closeModal()" style="margin-top:15px;">Закрыть</button>
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
        <button class="modal-close" onclick="closeModal()">✕</button>
        <div class="modal-title">🗺️ Карта подземелья</div>
        <div class="modal-body">
            <div style="color:#888; font-size:14px; margin-bottom:10px;">
                Этаж ${dungeon.floor}/${dungeon.totalFloors}
            </div>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
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
        
        html += `
            <div style="padding:12px; border-radius:8px; background:${isCurrent ? '#2a2f45' : '#1e2337'}; border:2px solid ${isCurrent ? '#f0c040' : '#2a2f45'}; text-align:center; ${isCleared ? 'opacity:0.5;' : ''}">
                <div style="font-size:24px;">${icon}</div>
                <div style="font-size:10px; color:#888;">${roomId}</div>
                ${isCurrent ? '<div style="font-size:10px; color:#f0c040;">📍 Вы здесь</div>' : ''}
            </div>
        `;
    });
    
    html += `
            </div>
            <button class="btn-secondary" onclick="closeModal()" style="margin-top:15px;">Закрыть</button>
        </div>
    `;
    
    openModal(html);
}

// ============================================================
// 10. ЭКСПОРТ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА
// ============================================================

window.closeModal = closeModal;
window.handleRollDice = handleRollDice;
window.sendChat = sendChat;
window.sendPingAction = sendPingAction;

console.log('🎲 LEGENDICE - main.js загружен!');
