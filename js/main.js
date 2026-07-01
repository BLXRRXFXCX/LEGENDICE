// ============================================================
// LEGENDICE - main.js (ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
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
    setPlayerReady,
    updatePlayerPosition,
    getGameData,
    updatePlayerName,
    updatePlayerClass,
    deleteGame
} from './firebase.js';

import {
    CLASSES, SLOT_TYPES, ENEMIES, BOSS, COMBOS,
    RARITY, ITEMS, CONSUMABLES, COMBO_EMOJI
} from './constants.js';

import {
    initUI, showLobby, showGame, updateUI,
    openModal, closeModal, showDiceModal,
    showItemInfo
} from './ui.js';

import { initDice3D, rollDiceWithValues, closeDiceModal } from './dice3d.js';

import {
    generateDungeon, getRoom, getCurrentFloorRooms,
    isFloorCleared, goToNextFloor, updateRoomAfterCombat,
    openChest, buyShopItem, generateFloorsFromDice
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
// 2. ЛОББИ (НОВАЯ ВЕРСИЯ)
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
            
            <div id="lobby-players-info" style="display:none; margin-top:10px; padding:12px; background:#1e2337; border-radius:10px; border:1px solid #2a2f45;">
                <div style="font-size:13px; color:#888; margin-bottom:8px;">👥 Игроки в лобби:</div>
                <div id="lobby-players-list" style="display:flex; flex-direction:column; gap:6px;"></div>
            </div>
            
            <button id="btn-ready" class="btn-success" style="display:none; padding:14px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; margin-top:10px; font-size:16px;">
                ✅ Я готов
            </button>
            
            <div id="invite-section" style="display:none; margin-top:8px; padding:10px; background:#1e2337; border-radius:8px;">
                <div style="color:#888; font-size:11px;">🔗 Ссылка для приглашения:</div>
                <div style="display:flex; gap:6px; align-items:center; margin-top:4px;">
                    <input id="invite-link-input" type="text" readonly style="flex:1; padding:6px 10px; border-radius:6px; border:none; background:#0B0E1A; color:#f0c040; font-size:13px;">
                    <button id="invite-copy-btn" style="padding:6px 14px; border-radius:6px; border:none; background:#f0c040; color:#000; font-weight:bold; cursor:pointer;">📋</button>
                </div>
            </div>
        `;
    }
    
    // ----- ВЫБОР КЛАССА -----
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            myClass = this.dataset.class;
            if (currentGameId && currentPlayerId) {
                updatePlayerClass(currentGameId, currentPlayerId, myClass);
            }
        });
    });
    const firstBtn = document.querySelector('.class-btn');
    if (firstBtn) { firstBtn.classList.add('selected'); myClass = firstBtn.dataset.class; }
    
    // ----- ИМЯ ИГРОКА -----
    document.getElementById('player-name').addEventListener('change', function() {
        if (currentGameId && currentPlayerId) {
            updatePlayerName(currentGameId, currentPlayerId, this.value);
        }
    });
    
    // ----- СОЗДАТЬ ИГРУ -----
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
                        inviteInput.select();
                        document.execCommand('copy');
                        status.textContent = '✅ Ссылка скопирована!';
                    });
                });
            }
            
            document.getElementById('lobby-players-info').style.display = 'block';
            document.getElementById('btn-ready').style.display = 'block';
            document.getElementById('btn-ready').disabled = false;
            document.getElementById('btn-ready').textContent = '✅ Я готов';
            
            if (unsubscribeGame) unsubscribeGame();
            unsubscribeGame = subscribeToGame(gameId, handleGameUpdate);
            
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
        if (!gameId) { if (status) status.textContent = '⚠️ Введите код игры!'; return; }
        if (!myClass) { if (status) status.textContent = '⚠️ Выберите класс!'; return; }
        
        if (status) status.textContent = '⏳ Подключение...';
        try {
            await joinGame(gameId, name, myClass);
            currentGameId = gameId;
            currentPlayerId = 'player2';
            if (status) status.textContent = `✅ Подключено к игре: ${gameId}`;
            
            document.getElementById('lobby-players-info').style.display = 'block';
            document.getElementById('btn-ready').style.display = 'block';
            document.getElementById('btn-ready').disabled = false;
            document.getElementById('btn-ready').textContent = '✅ Я готов';
            
            if (unsubscribeGame) unsubscribeGame();
            unsubscribeGame = subscribeToGame(gameId, handleGameUpdate);
            
        } catch (error) {
            console.error(error);
            if (status) status.textContent = `❌ Ошибка: ${error.message}`;
        }
    });
    
    // ----- КНОПКА "Я ГОТОВ" -----
    document.getElementById('btn-ready').addEventListener('click', async function() {
        if (!currentGameId || !currentPlayerId) return;
        
        const name = document.getElementById('player-name')?.value || 'Игрок';
        await updatePlayerName(currentGameId, currentPlayerId, name);
        await updatePlayerClass(currentGameId, currentPlayerId, myClass);
        
        await setPlayerReady(currentGameId, currentPlayerId, true);
        this.disabled = true;
        this.textContent = '⏳ Ожидание других...';
        document.getElementById('lobby-status').textContent = '⏳ Ожидание готовности других игроков...';
    });
}

// ============================================================
// 3. ОБРАБОТКА ОБНОВЛЕНИЙ (ЛОББИ + ИГРА)
// ============================================================

function handleGameUpdate(data) {
    if (!data) {
        console.warn('⚠️ Нет данных игры');
        return;
    }
    
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
    
    // ==========================================================
    // РЕЖИМ ЛОББИ
    // ==========================================================
    if (data.status === 'lobby') {
        updateLobbyPlayersInfo(data);
        
        const p1 = data.players?.player1;
        const p2 = data.players?.player2;
        const p1Ready = p1?.isReady || false;
        const p2Ready = p2?.isReady || false;
        const hasPlayer2 = p2 !== null && p2 !== undefined;
        const allReady = p1Ready && (!hasPlayer2 || p2Ready);
        
        if (allReady) {
            const statusEl = document.getElementById('lobby-status');
            if (statusEl) statusEl.textContent = '🚀 Все готовы! Начинаем игру...';
            setTimeout(() => {
                initializeGame(currentGameId);
            }, 500);
        } else {
            const statusEl = document.getElementById('lobby-status');
            if (statusEl) {
                const readyCount = (p1Ready ? 1 : 0) + (p2Ready ? 1 : 0);
                const totalPlayers = hasPlayer2 ? 2 : 1;
                statusEl.textContent = `⏳ Готово: ${readyCount}/${totalPlayers} игроков`;
            }
        }
        
        const readyBtn = document.getElementById('btn-ready');
        if (readyBtn) {
            const myReady = data.players[myPlayerId]?.isReady || false;
            if (myReady) {
                readyBtn.disabled = true;
                readyBtn.textContent = '✅ Вы готовы!';
            } else {
                readyBtn.disabled = false;
                readyBtn.textContent = '✅ Я готов';
            }
        }
        return;
    }
    
    // ==========================================================
    // РЕЖИМ ИГРЫ (ПОДЗЕМЕЛЬЕ)
    // ==========================================================
    if (data.dungeon) {
        updateUI(data, myPlayerId, isMyTurn);
        checkAndStartCombat(data, myPlayerId);
    }
}

// ============================================================
// 4. ИНФОРМАЦИЯ О ИГРОКАХ В ЛОББИ
// ============================================================

function updateLobbyPlayersInfo(data) {
    const container = document.getElementById('lobby-players-list');
    if (!container) return;
    
    const players = data?.players || {};
    const player1 = players.player1;
    const player2 = players.player2;
    const user = getCurrentUser();
    
    let html = '';
    
    // Игрок 1
    if (player1) {
        const classEmoji = CLASSES[player1.class]?.emoji || '👤';
        const className = CLASSES[player1.class]?.name || 'Не выбран';
        const readyStatus = player1.isReady ? '✅ Готов' : '⏳ Не готов';
        const isMe = player1.uid === user?.uid;
        html += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:${isMe ? '#2a2f45' : '#1a1f30'}; border-radius:8px; border:${isMe ? '1px solid #f0c040' : '1px solid transparent'};">
                <div>
                    <span style="font-size:20px;">${classEmoji}</span>
                    <span style="font-weight:bold; margin-left:6px;">${player1.name || 'Игрок 1'}</span>
                    <span style="color:#888; font-size:12px; margin-left:6px;">(${className})</span>
                    ${isMe ? ' <span style="color:#f0c040; font-size:11px;">(Вы)</span>' : ''}
                </div>
                <div style="font-size:13px; color:${player1.isReady ? '#4caf50' : '#888'};">${readyStatus}</div>
            </div>
        `;
    } else {
        html += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:#1a1f30; border-radius:8px; opacity:0.4;">
                <div><span style="font-size:20px;">👤</span><span style="margin-left:6px;">Ожидание игрока...</span></div>
                <div style="font-size:13px; color:#888;">⏳ Не подключен</div>
            </div>
        `;
    }
    
    // Игрок 2
    if (player2) {
        const classEmoji = CLASSES[player2.class]?.emoji || '👤';
        const className = CLASSES[player2.class]?.name || 'Не выбран';
        const readyStatus = player2.isReady ? '✅ Готов' : '⏳ Не готов';
        const isMe = player2.uid === user?.uid;
        html += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:${isMe ? '#2a2f45' : '#1a1f30'}; border-radius:8px; border:${isMe ? '1px solid #f0c040' : '1px solid transparent'};">
                <div>
                    <span style="font-size:20px;">${classEmoji}</span>
                    <span style="font-weight:bold; margin-left:6px;">${player2.name || 'Игрок 2'}</span>
                    <span style="color:#888; font-size:12px; margin-left:6px;">(${className})</span>
                    ${isMe ? ' <span style="color:#f0c040; font-size:11px;">(Вы)</span>' : ''}
                </div>
                <div style="font-size:13px; color:${player2.isReady ? '#4caf50' : '#888'};">${readyStatus}</div>
            </div>
        `;
    } else {
        html += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:#1a1f30; border-radius:8px; opacity:0.4;">
                <div><span style="font-size:20px;">👤</span><span style="margin-left:6px;">Свободный слот</span></div>
                <div style="font-size:13px; color:#888;">⏳ Ожидание</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============================================================
// 5. ИНИЦИАЛИЗАЦИЯ ИГРЫ (С БРОСКОМ КУБИКОВ)
// ============================================================

async function initializeGame(gameId) {
    const data = await getGameData(gameId);
    
    if (!data.dungeon) {
        const hasPlayer2 = data.players?.player2 !== null && data.players?.player2 !== undefined;
        const playerCount = hasPlayer2 ? 2 : 1;
        
        // Бросок кубиков для определения этажей
        const player1Roll = Math.floor(Math.random() * 6) + 1;
        const player2Roll = hasPlayer2 ? (Math.floor(Math.random() * 6) + 1) : 0;
        const totalFloors = player1Roll + (hasPlayer2 ? player2Roll : 0);
        
        addLog(`🎲 Бросок этажей: Игрок 1: ${player1Roll}${hasPlayer2 ? `, Игрок 2: ${player2Roll}` : ''} → Всего: ${Math.min(totalFloors, 12)} этажей`);
        
        const dungeon = generateDungeon(Math.min(totalFloors, 12));
        delete dungeon.map;
        
        const firstRoom = Object.keys(dungeon.rooms).find(id => dungeon.rooms[id].floor === 1) || Object.keys(dungeon.rooms)[0];
        
        const updates = {
            dungeon: dungeon,
            status: 'dungeon',
            turn: {
                currentPlayer: 'player1',
                phase: 'idle',
                order: hasPlayer2 ? ['player1', 'player2'] : ['player1'],
                index: 0,
                diceValues: [],
                selectedAttack: [],
                selectedDefense: [],
                targetAttack: null,
                targetDefense: null,
                combo: null
            }
        };
        
        if (data.players.player1) {
            updates['players.player1.position'] = firstRoom;
        }
        if (data.players.player2) {
            updates['players.player2.position'] = firstRoom;
        }
        if (data.players.player1) {
            updates['players.player1.isReady'] = false;
        }
        if (data.players.player2) {
            updates['players.player2.isReady'] = false;
        }
        
        await updateGameState(gameId, updates);
    }
    
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    setupGameUI();
}

// ============================================================
// 6. НАСТРОЙКА UI
// ============================================================

function setupGameUI() {
    document.getElementById('btn-roll').addEventListener('click', function() {
        if (!isMyTurn) { alert('⏳ Сейчас не ваш ход!'); return; }
        const room = getRoom(gameState.dungeon, gameState.players[currentPlayerId]?.position);
        if (!room || room.isCleared || room.type === 'rest' || room.type === 'shop' || room.type === 'exit') {
            alert('⏳ Здесь нельзя бросить кубики');
            return;
        }
        handleRollDice();
    });
    
    document.getElementById('btn-inventory').addEventListener('click', showInventoryModal);
    document.getElementById('btn-map').addEventListener('click', showMapModal);
    
    document.getElementById('dice-close-btn')?.addEventListener('click', () => {
        closeDiceModal();
    });
    
    document.getElementById('chat-send')?.addEventListener('click', sendChat);
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChat();
    });
    
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
// 7. БРОСОК КУБИКОВ (С 3D)
// ============================================================

function handleRollDice() {
    if (!gameState) return;
    const player = gameState.players[currentPlayerId];
    if (!player || !player.isAlive) {
        alert('Вы не можете ходить!');
        return;
    }
    
    const count = 2;
    const values = [];
    for (let i = 0; i < count; i++) {
        values.push(Math.floor(Math.random() * 6) + 1);
    }
    
    console.log('🎲 Выпало:', values);
    
    window.currentDiceValues = values;
    window.diceSelections = {};
    
    rollDiceWithValues(values, (rolledValues) => {
        const combo = checkCombo(player.class, rolledValues);
        if (combo) {
            showDiceModal(rolledValues, combo.name, combo.description);
            if (combo.target === 'self' || combo.target === 'all_allies' || combo.target === 'all_enemies') {
                setTimeout(() => {
                    applyCombo(currentPlayerId, combo);
                    closeDiceModal();
                    nextTurn();
                }, 2500);
            } else {
                gameState.turn.phase = 'select_target';
                updateGameState(currentGameId, { turn: gameState.turn });
                updateUI(gameState, currentPlayerId, isMyTurn);
            }
        } else {
            showDiceModal(rolledValues, null, null);
        }
    });
}

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

function applyCombo(playerId, combo) {
    const player = gameState.players[playerId];
    if (!player) return;
    
    console.log(`🔥 Применяем: ${combo.name}`);
    const room = getRoom(gameState.dungeon, player.position);
    if (!room) return;
    
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
    
    if (room) updateRoomAfterCombat(room);
    
    updateGameState(currentGameId, {
        players: gameState.players,
        dungeon: gameState.dungeon
    });
}

window.confirmDiceDistribution = function(attackSum, defenseSum, selections) {
    const player = gameState.players[currentPlayerId];
    if (!player) return;
    
    const room = getRoom(gameState.dungeon, player.position);
    if (!room) return;
    
    gameState.turn.selectedAttack = Object.keys(selections).filter(i => selections[i] === 'attack').map(i => parseInt(i));
    gameState.turn.selectedDefense = Object.keys(selections).filter(i => selections[i] === 'defense').map(i => parseInt(i));
    
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
    
    updateRoomAfterCombat(room);
    
    updateGameState(currentGameId, {
        players: gameState.players,
        dungeon: gameState.dungeon,
        turn: gameState.turn
    });
    
    nextTurn();
};

// ============================================================
// 8. ХОДЫ
// ============================================================

function nextTurn() {
    if (!gameState) return;
    
    const player = gameState.players[currentPlayerId];
    const room = getRoom(gameState.dungeon, player?.position);
    
    if (!room || room.isCleared || room.type === 'rest' || room.type === 'shop' || room.type === 'exit') {
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
    
    const hasAlive = room.enemies?.some(e => e.isAlive);
    if (!hasAlive) {
        room.isCleared = true;
        room.isRevealed = true;
        addLog(`✅ Комната зачищена!`);
        updateGameState(currentGameId, { dungeon: gameState.dungeon });
        
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
    
    const order = ['player1', 'player2'];
    const currentIdx = gameState.turn.index || 0;
    const nextIdx = (currentIdx + 1) % order.length;
    const nextPlayer = order[nextIdx];
    
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
// 9. НАЧАЛО БОЯ
// ============================================================

function checkAndStartCombat(data, myPlayerId) {
    const room = getRoom(data.dungeon, data.players[myPlayerId]?.position);
    if (!room) return;
    if (room.type !== 'combat' && room.type !== 'boss') return;
    if (room.isCleared) return;
    
    const hasAlive = room.enemies?.some(e => e.isAlive);
    if (!hasAlive) {
        room.isCleared = true;
        room.isRevealed = true;
        updateGameState(currentGameId, { dungeon: data.dungeon });
        return;
    }
    
    if (data.turn?.currentPlayer === myPlayerId && data.turn?.phase === 'idle') {
        const msg = room.type === 'boss' ? '👑 БОСС!' : '⚔️ Начинается бой!';
        addLog(msg);
        if (data.turn.phase !== 'roll') {
            data.turn.phase = 'roll';
            updateGameState(currentGameId, { turn: data.turn });
        }
    }
}

// ============================================================
// 10. ПЕРЕХОД НА СЛЕДУЮЩИЙ ЭТАЖ
// ============================================================

window.goToNextFloorAction = function() {
    if (!gameState || !currentPlayerId) return;
    const dungeon = gameState.dungeon;
    const currentFloor = dungeon.currentFloor || 1;
    
    const floorRooms = getCurrentFloorRooms(dungeon);
    const allCleared = floorRooms.every(id => {
        const r = dungeon.rooms[id];
        return r.isCleared || r.type === 'exit';
    });
    
    if (!allCleared) {
        alert('❌ Сначала зачистите все комнаты этажа!');
        return;
    }
    
    const exitRoom = floorRooms.find(id => dungeon.rooms[id].type === 'exit');
    if (!exitRoom || !dungeon.rooms[exitRoom].isCleared) {
        alert('❌ Выход ещё не открыт!');
        return;
    }
    
    if (dungeon.currentFloor < dungeon.totalFloors) {
        dungeon.currentFloor++;
        const newFloorRooms = Object.keys(dungeon.rooms).filter(id => dungeon.rooms[id].floor === dungeon.currentFloor);
        if (newFloorRooms.length > 0) {
            const firstRoom = newFloorRooms[0];
            Object.keys(gameState.players).forEach(id => {
                const p = gameState.players[id];
                if (p && p.isAlive) {
                    p.position = firstRoom;
                }
            });
            addLog(`🚪 Переход на этаж ${dungeon.currentFloor}`);
            updateGameState(currentGameId, {
                dungeon: gameState.dungeon,
                players: gameState.players
            });
            updateUI(gameState, currentPlayerId, isMyTurn);
        }
    } else {
        alert('🎉 Вы прошли все этажи! Поздравляем!');
        gameState.status = 'finished';
        updateGameState(currentGameId, { status: 'finished' });
    }
};

// ============================================================
// 11. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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

// ============================================================
// 12. ВЫБОР КОМНАТЫ
// ============================================================

// ----- ВЫБОР КОМНАТЫ (ИСПРАВЛЕННАЯ ЛОГИКА) -----
window.selectRoom = function(roomId) {
    if (!gameState || !currentPlayerId) return;
    const player = gameState.players[currentPlayerId];
    if (!player) return;
    
    const currentRoom = getRoom(gameState.dungeon, player.position);
    const targetRoom = getRoom(gameState.dungeon, roomId);
    
    if (!targetRoom) {
        alert('❌ Комната не найдена');
        return;
    }
    
    const dungeon = gameState.dungeon;
    if (targetRoom.floor !== (dungeon.currentFloor || 1)) {
        alert('🔒 Эта комната на другом этаже!');
        return;
    }
    
    if (!targetRoom.isRevealed && roomId !== player.position) {
        alert('🔒 Комната ещё не открыта!');
        return;
    }
    
    // ==========================================================
    // НОВАЯ ЛОГИКА ПРОВЕРКИ ВЫХОДА ИЗ КОМНАТЫ
    // ==========================================================
    if (currentRoom) {
        // Проверяем, можно ли покинуть комнату
        const hasAliveEnemies = currentRoom.enemies && currentRoom.enemies.some(e => e.isAlive);
        const isCombatRoom = currentRoom.type === 'combat' || currentRoom.type === 'boss';
        
        // Если это боевая комната и есть живые враги — нельзя выйти
        if (isCombatRoom && hasAliveEnemies) {
            alert('⚔️ Сначала победите всех врагов в этой комнате!');
            return;
        }
        
        // Если это комната выхода — можно выйти только если она пройдена
        if (currentRoom.type === 'exit' && !currentRoom.isCleared) {
            alert('🚪 Выход ещё не открыт! Зачистите все комнаты этажа.');
            return;
        }
        
        // Комнаты: сундук, магазин, отдых — можно покидать всегда
        // Комнаты с боссом — можно покидать, если босс мёртв
        if (isCombatRoom && !hasAliveEnemies) {
            // Все враги мертвы — можно выйти
            currentRoom.isCleared = true;
            currentRoom.isRevealed = true;
        }
    }
    
    // Перемещаем игрока
    player.position = roomId;
    
    if (!targetRoom.players) targetRoom.players = [];
    if (!targetRoom.players.includes(currentPlayerId)) {
        targetRoom.players.push(currentPlayerId);
    }
    
    if (currentRoom && currentRoom.players) {
        currentRoom.players = currentRoom.players.filter(id => id !== currentPlayerId);
    }
    
    if (!targetRoom.isRevealed) {
        targetRoom.isRevealed = true;
    }
    
    // Проверяем, есть ли живые враги в целевой комнате (если это боевая)
    const hasTargetEnemies = targetRoom.enemies && targetRoom.enemies.some(e => e.isAlive);
    if ((targetRoom.type === 'combat' || targetRoom.type === 'boss') && hasTargetEnemies) {
        addLog(`⚔️ Бой в комнате ${targetRoom.id}!`);
        gameState.turn.phase = 'roll';
        gameState.turn.currentPlayer = currentPlayerId;
        updateGameState(currentGameId, {
            players: gameState.players,
            dungeon: gameState.dungeon,
            turn: gameState.turn
        });
        updateUI(gameState, currentPlayerId, true);
        return;
    }
    
    gameState.turn.phase = 'idle';
    updateGameState(currentGameId, {
        players: gameState.players,
        dungeon: gameState.dungeon,
        turn: gameState.turn
    });
    
    updateUI(gameState, currentPlayerId, isMyTurn);
};


// ============================================================
// 13. ВЫБОР ЦЕЛИ
// ============================================================

window.selectEnemyTarget = function(index) {
    if (!gameState || !isMyTurn) return;
    const room = getRoom(gameState.dungeon, gameState.players[currentPlayerId]?.position);
    if (!room || !room.enemies) return;
    
    const enemy = room.enemies[index];
    if (!enemy || !enemy.isAlive) return;
    
    gameState.turn.targetAttack = index;
    gameState.turn.phase = 'apply';
    
    const combo = gameState.turn.combo;
    if (combo) {
        applyComboToTarget(currentPlayerId, combo, enemy);
    }
    
    updateGameState(currentGameId, { turn: gameState.turn });
    closeDiceModal();
    nextTurn();
};

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
            addLog(`✨ ${player.name} применяет ${combo.name} к ${enemy.name}`);
    }
    
    updateRoomAfterCombat(getRoom(gameState.dungeon, player.position));
}

// ============================================================
// 14. СУНДУКИ, МАГАЗИН, ОТДЫХ
// ============================================================

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

window.buyShopAction = function(index) {
    if (!gameState || !currentPlayerId) return;
    const room = getRoom(gameState.dungeon, gameState.players[currentPlayerId]?.position);
    if (!room || !room.shopItems) return;
    
    const item = room.shopItems[index];
    if (!item) return;
    
    const bought = buyShopItem(item, gameState.players[currentPlayerId]);
    if (bought) {
        addLog(`🛒 ${gameState.players[currentPlayerId].name} купил ${item.name}`);
        room.shopItems.splice(index, 1);
        updateGameState(currentGameId, {
            dungeon: gameState.dungeon,
            players: gameState.players
        });
        updateUI(gameState, currentPlayerId, isMyTurn);
    }
};

window.restHealAction = function() {
    if (!gameState || !currentPlayerId) return;
    const player = gameState.players[currentPlayerId];
    if (!player) return;
    
    const healAmount = Math.floor(player.maxHp * 0.5);
    player.hp = Math.min(player.hp + healAmount, player.maxHp);
    const room = getRoom(gameState.dungeon, player.position);
    if (room) {
        room.isCleared = true;
        room.isRevealed = true;
    }
    
    addLog(`🏥 ${player.name} отдохнул и восстановил ${healAmount} HP`);
    updateGameState(currentGameId, {
        players: gameState.players,
        dungeon: gameState.dungeon
    });
    updateUI(gameState, currentPlayerId, isMyTurn);
    nextTurn();
};

// ============================================================
// 15. ИНВЕНТАРЬ И КАРТА
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
    
    const currentFloor = dungeon.currentFloor || 1;
    const roomIds = Object.keys(dungeon.rooms).filter(id => dungeon.rooms[id].floor === currentFloor);
    
    let html = `
        <button class="modal-close" onclick="window.closeModal()">✕</button>
        <div class="modal-title">🗺️ Этаж ${currentFloor}</div>
        <div class="modal-body">
            <div style="color:#888; font-size:13px; margin-bottom:8px;">
                Этаж ${currentFloor}/${dungeon.totalFloors}
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(70px, 1fr)); gap:6px;">
    `;
    
    roomIds.forEach(roomId => {
        const room = dungeon.rooms[roomId];
        const isCurrent = roomId === gameState.players[currentPlayerId]?.position;
        const isCleared = room.isCleared;
        const isRevealed = room.isRevealed || isCurrent;
        
        let icon = '❓';
        if (isRevealed) {
            if (room.type === 'combat') icon = '💀';
            else if (room.type === 'chest') icon = '💎';
            else if (room.type === 'rest') icon = '🏥';
            else if (room.type === 'shop') icon = '🏪';
            else if (room.type === 'boss') icon = '👑';
            else if (room.type === 'exit') icon = '🚪';
            else icon = '🏚️';
        }
        
        const playersInRoom = room.players || [];
        const playerIcons = playersInRoom.map(id => {
            const p = gameState.players[id];
            return p ? CLASSES[p.class]?.emoji || '👤' : '';
        }).join('');
        
        html += `
            <div style="padding:10px 4px; border-radius:8px; background:${isCurrent ? '#2a2f45' : '#1e2337'}; border:2px solid ${isCurrent ? '#f0c040' : '#2a2f45'}; text-align:center; ${isCleared ? 'opacity:0.5;' : ''} cursor:${isRevealed ? 'pointer' : 'default'};" onclick="${isRevealed ? `window.closeModal(); window.selectRoom('${roomId}');` : ''}">
                <div style="font-size:22px;">${icon}</div>
                <div style="font-size:9px; color:#888;">${roomId.replace('floor','F').replace('_room','R')}</div>
                ${playerIcons ? `<div style="font-size:12px;">${playerIcons}</div>` : ''}
                ${isCurrent ? '<div style="font-size:9px; color:#f0c040;">📍</div>' : ''}
                ${isCleared ? '<div style="font-size:9px; color:#4caf50;">✅</div>' : ''}
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
// 16. ГЛОБАЛЬНЫЕ ФУНКЦИИ
// ============================================================

window.closeModal = closeModal;
window.closeDiceModal = closeDiceModal;
window.selectRoom = selectRoom;
window.selectEnemyTarget = selectEnemyTarget;
window.openChestAction = openChestAction;
window.buyShopAction = buyShopAction;
window.restHealAction = restHealAction;
window.confirmDiceDistribution = confirmDiceDistribution;
window.goToNextFloorAction = goToNextFloorAction;

console.log('🎲 LEGENDICE - main.js загружен!');
