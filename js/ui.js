// ============================================================
// LEGENDICE - ui.js
// Управление интерфейсом: отрисовка, обновление, события
// ============================================================

import { CLASSES, SLOT_TYPES, RARITY, ENEMIES, BOSS, COMBOS, COMBO_EMOJI } from './constants.js';

// ----- СОСТОЯНИЕ UI -----
let currentRoomId = null;
let selectedEnemy = null;
let selectedAlly = null;
let isDiceModalOpen = false;

// ----- ИНИЦИАЛИЗАЦИЯ UI -----
export function initUI() {
    // Ничего особенного не требуется, всё уже в HTML
    console.log('🎨 UI инициализирован');
}

// ----- ПОКАЗАТЬ ЭКРАН ЛОББИ -----
export function showLobby() {
    document.getElementById('lobby-screen').style.display = 'flex';
    document.getElementById('game-screen').style.display = 'none';
}

// ----- ПОКАЗАТЬ ЭКРАН ИГРЫ -----
export function showGame() {
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
}

// ----- ОБНОВЛЕНИЕ ВСЕГО UI -----
export function updateUI(gameData, myPlayerId, isMyTurn) {
    if (!gameData) return;
    
    updateTopBar(gameData, myPlayerId, isMyTurn);
    updateMinimap(gameData, myPlayerId);
    updateRoomView(gameData, myPlayerId, isMyTurn);
    updateSlots(gameData, myPlayerId);
    updateChat(gameData);
    updatePings(gameData);
    updateTurnIndicator(gameData, myPlayerId, isMyTurn);
}

// ----- ВЕРХНЯЯ ПАНЕЛЬ -----
function updateTopBar(gameData, myPlayerId, isMyTurn) {
    const p1 = gameData.players.player1;
    const p2 = gameData.players.player2;
    
    const p1Info = document.getElementById('player1-info');
    const p2Info = document.getElementById('player2-info');
    
    if (p1) {
        const classEmoji = CLASSES[p1.class]?.emoji || '👤';
        p1Info.innerHTML = `${classEmoji} ${p1.name || 'Игрок 1'}: ❤️ ${p1.hp || 0}/${p1.maxHp || 0}`;
        p1Info.className = 'player-info' + (p1.isShadow ? ' shadow' : '');
        p1Info.style.borderColor = myPlayerId === 'player1' ? '#f0c040' : '#2a2f45';
    }
    
    if (p2) {
        const classEmoji = CLASSES[p2.class]?.emoji || '👤';
        p2Info.innerHTML = `${classEmoji} ${p2.name || 'Игрок 2'}: ❤️ ${p2.hp || 0}/${p2.maxHp || 0}`;
        p2Info.className = 'player-info' + (p2.isShadow ? ' shadow' : '');
        p2Info.style.borderColor = myPlayerId === 'player2' ? '#f0c040' : '#2a2f45';
    } else {
        p2Info.innerHTML = '👤 Ожидание игрока...';
        p2Info.style.borderColor = '#2a2f45';
    }
}

// ----- ИНДИКАТОР ХОДА -----
function updateTurnIndicator(gameData, myPlayerId, isMyTurn) {
    const indicator = document.getElementById('turn-indicator');
    const current = gameData.turn?.currentPlayer;
    
    if (!current) {
        indicator.textContent = '⏳ Ожидание...';
        return;
    }
    
    let playerName = '';
    if (current === 'player1' && gameData.players.player1) {
        playerName = gameData.players.player1.name || 'Игрок 1';
    } else if (current === 'player2' && gameData.players.player2) {
        playerName = gameData.players.player2.name || 'Игрок 2';
    } else {
        playerName = current;
    }
    
    const isMyTurnText = isMyTurn ? '🔥 ВАШ ХОД!' : '⏳ Ожидание...';
    indicator.textContent = `🎯 ${playerName} (${isMyTurnText})`;
    indicator.style.color = isMyTurn ? '#ffd700' : '#888';
}

// ----- МИНИ-КАРТА -----
function updateMinimap(gameData, myPlayerId) {
    const container = document.getElementById('minimap');
    const dungeon = gameData.dungeon;
    
    if (!dungeon || !dungeon.rooms) {
        container.innerHTML = '<div style="color:#666; padding:10px;">Карта не загружена</div>';
        return;
    }
    
    const myPos = gameData.players[myPlayerId]?.position || 'room_1';
    const rooms = dungeon.rooms;
    const roomIds = Object.keys(rooms);
    
    let html = '';
    roomIds.forEach(roomId => {
        const room = rooms[roomId];
        const isCurrent = roomId === myPos;
        const isCleared = room.isCleared || false;
        
        // Определяем иконку комнаты
        let icon = '🏚️';
        if (room.type === 'combat') icon = '💀';
        else if (room.type === 'chest') icon = '💎';
        else if (room.type === 'rest') icon = '🏥';
        else if (room.type === 'shop') icon = '🏪';
        else if (room.type === 'boss') icon = '👑';
        
        // Игроки в комнате
        const playersInRoom = room.players || [];
        const playerIcons = playersInRoom.map(pId => {
            const p = gameData.players[pId];
            if (!p) return '';
            return CLASSES[p.class]?.emoji || '👤';
        }).join('');
        
        // Классы для стилизации
        let cls = 'minimap-room';
        if (room.type) cls += ` ${room.type}`;
        if (isCurrent) cls += ' current';
        if (isCleared) cls += ' cleared';
        
        html += `
            <div class="${cls}" data-room="${roomId}" style="position:relative;">
                ${icon}
                <div class="room-players">${playerIcons || ' '}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Клик по комнате для перемещения (если это безопасно)
    container.querySelectorAll('.minimap-room').forEach(el => {
        el.addEventListener('click', () => {
            const roomId = el.dataset.room;
            if (roomId && gameData.turn?.phase !== 'combat') {
                // TODO: Перемещение в комнату (только если она доступна)
                console.log('📦 Перемещение в комнату:', roomId);
            }
        });
    });
}

// ----- ОТОБРАЖЕНИЕ ТЕКУЩЕЙ КОМНАТЫ -----
function updateRoomView(gameData, myPlayerId, isMyTurn) {
    const container = document.getElementById('room-view');
    const myPos = gameData.players[myPlayerId]?.position || 'room_1';
    const room = gameData.dungeon?.rooms?.[myPos];
    
    if (!room) {
        container.innerHTML = '<div style="color:#666;">Комната не загружена</div>';
        return;
    }
    
    currentRoomId = myPos;
    
    // Заголовок комнаты
    let title = '🏚️ Комната';
    if (room.type === 'combat') title = '💀 Бой!';
    else if (room.type === 'chest') title = '💎 Сундук';
    else if (room.type === 'rest') title = '🏥 Отдых';
    else if (room.type === 'shop') title = '🏪 Торговец';
    else if (room.type === 'boss') title = '👑 БОСС!';
    
    // Враги (если есть)
    let enemiesHtml = '';
    if (room.enemies && room.enemies.length > 0) {
        enemiesHtml = `<div class="enemy-list">`;
        room.enemies.forEach((enemy, index) => {
            const isDead = !enemy.isAlive;
            const isTargetable = isMyTurn && enemy.isAlive && !isDead;
            
            enemiesHtml += `
                <div class="enemy-card ${isDead ? 'enemy-dead' : ''} ${isTargetable ? 'targetable' : ''}" 
                     data-enemy-index="${index}" style="${isTargetable ? 'cursor:pointer;' : ''}">
                    <div class="enemy-emoji">${enemy.emoji || '👾'}</div>
                    <div class="enemy-name">${enemy.name || 'Враг'}</div>
                    <div class="enemy-hp">❤️ ${enemy.hp || 0}/${enemy.maxHp || 0}</div>
                    ${enemy.poison ? `<div style="color:#7cfc00;font-size:12px;">☠️ Отравлен</div>` : ''}
                    ${enemy.freeze ? `<div style="color:#00bfff;font-size:12px;">❄️ Заморожен</div>` : ''}
                </div>
            `;
        });
        enemiesHtml += `</div>`;
    } else {
        enemiesHtml = `<div style="color:#666;">Комната пуста</div>`;
    }
    
    // Сундуки (если есть)
    let chestsHtml = '';
    if (room.chests && room.chests.length > 0) {
        chestsHtml = `<div style="display:flex; gap:10px; margin-top:10px;">`;
        room.chests.forEach((chest, index) => {
            chestsHtml += `
                <div class="enemy-card" style="min-width:60px; cursor:pointer;" data-chest-index="${index}">
                    <div style="font-size:36px;">📦</div>
                    <div style="font-size:12px;color:#ffd700;">Сундук</div>
                    ${chest.isOpened ? '<div style="color:#888;font-size:10px;">✅ Открыт</div>' : ''}
                </div>
            `;
        });
        chestsHtml += `</div>`;
    }
    
    container.innerHTML = `
        <div class="room-title">${title}</div>
        ${enemiesHtml}
        ${chestsHtml}
        <div style="color:#666; font-size:12px; margin-top:10px;">
            ${room.isCleared ? '✅ Комната зачищена' : ''}
        </div>
    `;
    
    // Обработчики кликов по врагам (для выбора цели)
    container.querySelectorAll('.enemy-card.targetable').forEach(el => {
        el.addEventListener('click', () => {
            const index = parseInt(el.dataset.enemyIndex);
            if (!isNaN(index) && isMyTurn) {
                console.log('🎯 Выбран враг:', index);
                // TODO: Передать выбор цели в game.js
                // window.selectEnemyTarget(index);
            }
        });
    });
    
    // Обработчики кликов по сундукам
    container.querySelectorAll('[data-chest-index]').forEach(el => {
        el.addEventListener('click', () => {
            const index = parseInt(el.dataset.chestIndex);
            if (!isNaN(index)) {
                console.log('📦 Открыт сундук:', index);
                // TODO: Открыть сундук
            }
        });
    });
}

// ----- СЛОТЫ (ЭКИПИРОВКА) -----
function updateSlots(gameData, myPlayerId) {
    const container = document.getElementById('slots-bar');
    const player = gameData.players[myPlayerId];
    
    if (!player) {
        container.innerHTML = '<span style="color:#666;">Нет данных</span>';
        return;
    }
    
    const slots = player.slots || {};
    const slotKeys = ['head', 'leftHand', 'rightHand', 'body', 'legs', 'amulet'];
    
    let html = '';
    slotKeys.forEach(key => {
        const slot = slots[key];
        const slotEmoji = SLOT_TYPES[key]?.emoji || '❓';
        
        if (slot) {
            const rarityClass = slot.rarity || 'common';
            const statValue = slot.stat || 0;
            html += `
                <div class="slot-item ${rarityClass}" data-slot="${key}" title="${slot.name || key}">
                    ${slot.emoji || slotEmoji} <span class="slot-stat">${statValue}</span>
                </div>
            `;
        } else {
            html += `
                <div class="slot-item" data-slot="${key}" style="opacity:0.3;">
                    ${slotEmoji} <span class="slot-stat">-</span>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
    
    // Клик по слоту для информации
    container.querySelectorAll('.slot-item').forEach(el => {
        el.addEventListener('click', () => {
            const slotKey = el.dataset.slot;
            const slot = player.slots?.[slotKey];
            if (slot) {
                showItemInfo(slot);
            }
        });
    });
}

// ----- ИНФОРМАЦИЯ О ПРЕДМЕТЕ (модалка) -----
function showItemInfo(item) {
    const rarityInfo = RARITY[item.rarity] || { label: 'Обычный', color: '#888' };
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <button class="modal-close" onclick="closeModal()">✕</button>
        <div class="modal-title">
            ${item.emoji || '📦'} ${item.name || 'Предмет'}
        </div>
        <div class="modal-body">
            <div style="text-align:center; font-size:14px; color:${rarityInfo.color}; font-weight:bold;">
                ${rarityInfo.label}
            </div>
            <div style="display:flex; justify-content:center; gap:20px; padding:10px 0;">
                <div>⚔️ Характеристика: <strong>${item.stat || 0}</strong></div>
            </div>
            ${item.effects ? `
                <div style="border-top:1px solid #2a2f45; padding-top:10px;">
                    <div style="color:#888; font-size:12px;">Эффекты:</div>
                    ${item.effects.map(e => `<div style="color:#88ccff; font-size:13px;">✨ ${e}</div>`).join('')}
                </div>
            ` : ''}
            <button class="btn-secondary" onclick="closeModal()" style="margin-top:10px;">Закрыть</button>
        </div>
    `;
    
    overlay.style.display = 'flex';
}

// ----- ЧАТ -----
function updateChat(gameData) {
    const container = document.getElementById('chat-messages');
    const messages = gameData.chat || [];
    
    if (messages.length === 0) {
        container.innerHTML = '<div style="color:#666; font-size:12px; text-align:center;">Нет сообщений</div>';
        return;
    }
    
    // Показываем последние 20 сообщений
    const lastMessages = messages.slice(-20);
    let html = '';
    lastMessages.forEach(msg => {
        const playerId = msg.player;
        const playerData = gameData.players[playerId];
        const playerName = playerData?.name || playerId || 'Неизвестный';
        const classEmoji = playerData ? CLASSES[playerData.class]?.emoji : '👤';
        
        html += `
            <div class="chat-msg">
                <span class="chat-player">${classEmoji} ${playerName}:</span>
                <span class="chat-text">${msg.message}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

// ----- ПИНГИ (НА КАРТЕ) -----
function updatePings(gameData) {
    // Пинги отображаются на мини-карте как мигающие метки
    const pings = gameData.pings || [];
    // TODO: Отображать пинги на мини-карте
    // Пока просто логируем
    if (pings.length > 0) {
        const lastPing = pings[pings.length - 1];
        console.log(`📍 Пинг от ${lastPing.player}: ${lastPing.emoji} в ${lastPing.roomId}`);
    }
}

// ----- МОДАЛЬНЫЕ ОКНА -----
export function openModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.style.display = 'flex';
}

export function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// Глобальные функции для модалок
window.closeModal = closeModal;

// ----- БРОСОК КУБИКОВ (вызов из main) -----
export function showDiceModal(diceValues, comboName, comboEffect) {
    const container = document.getElementById('dice-container');
    const result = document.getElementById('dice-result');
    
    container.style.display = 'flex';
    
    let html = `<div class="dice-values">${diceValues.map(v => `[${v}]`).join(' ')}</div>`;
    
    if (comboName) {
        html += `
            <div class="dice-combo">🔥 ${comboName}</div>
            <div class="dice-combo-effect">${comboEffect || ''}</div>
        `;
        // После комбинации автоматически закрываем через 3 секунды
        setTimeout(() => {
            closeDiceModal();
        }, 3000);
    } else {
        // Без комбинации — показываем кнопки распределения
        html += `
            <div style="margin-top:15px; color:#888; font-size:14px;">Распределите кубики:</div>
            <div class="dice-actions">
                ${diceValues.map((v, i) => `
                    <button class="btn-attack" data-dice-index="${i}" data-value="${v}" style="font-size:18px; padding:8px 16px;">
                        [${v}] ⚔️
                    </button>
                `).join('')}
            </div>
            <div style="margin-top:10px;">
                <span id="dice-attack-sum">Атака: 0</span> | 
                <span id="dice-defense-sum">Защита: 0</span>
            </div>
            <button class="btn-confirm" id="dice-confirm" style="margin-top:15px; padding:10px 30px;" disabled>
                ✅ Подтвердить
            </button>
        `;
        
        // TODO: Логика распределения кубиков
    }
    
    result.innerHTML = html;
    result.style.display = 'block';
}

export function closeDiceModal() {
    document.getElementById('dice-container').style.display = 'none';
    document.getElementById('dice-result').style.display = 'none';
}

// ----- ЭКСПОРТ -----
export default {
    initUI,
    showLobby,
    showGame,
    updateUI,
    openModal,
    closeModal,
    showDiceModal,
    closeDiceModal,
    showItemInfo
};
