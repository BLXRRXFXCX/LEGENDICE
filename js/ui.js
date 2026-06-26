// ============================================================
// LEGENDICE - ui.js
// Управление интерфейсом: отрисовка, обновление, события
// ============================================================

import { CLASSES, SLOT_TYPES, RARITY, ENEMIES, BOSS, COMBOS, COMBO_EMOJI } from './constants.js';
import { getRoom, isRoomCleared } from './game.js';

let currentRoomId = null;
let selectedEnemy = null;
let selectedAlly = null;

// ----- ИНИЦИАЛИЗАЦИЯ UI -----
export function initUI() {
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
    updateTurnIndicator(gameData, myPlayerId, isMyTurn);
}

// ----- ВЕРХНЯЯ ПАНЕЛЬ -----
function updateTopBar(gameData, myPlayerId, isMyTurn) {
    const p1 = gameData.players?.player1;
    const p2 = gameData.players?.player2;
    
    const p1Info = document.getElementById('player1-info');
    const p2Info = document.getElementById('player2-info');
    
    if (p1) {
        const classEmoji = CLASSES[p1.class]?.emoji || '👤';
        const hpText = p1.isShadow ? '💀 Тень' : `❤️ ${p1.hp || 0}/${p1.maxHp || 0}`;
        p1Info.innerHTML = `${classEmoji} ${p1.name || 'Игрок 1'}: ${hpText}`;
        p1Info.className = 'player-info' + (p1.isShadow ? ' shadow' : '');
        p1Info.style.borderColor = myPlayerId === 'player1' ? '#f0c040' : 'transparent';
    }
    
    if (p2) {
        const classEmoji = CLASSES[p2.class]?.emoji || '👤';
        const hpText = p2.isShadow ? '💀 Тень' : `❤️ ${p2.hp || 0}/${p2.maxHp || 0}`;
        p2Info.innerHTML = `${classEmoji} ${p2.name || 'Игрок 2'}: ${hpText}`;
        p2Info.className = 'player-info' + (p2.isShadow ? ' shadow' : '');
        p2Info.style.borderColor = myPlayerId === 'player2' ? '#f0c040' : 'transparent';
    } else {
        p2Info.innerHTML = '👤 Ожидание игрока...';
        p2Info.style.borderColor = 'transparent';
    }
}

// ----- ИНДИКАТОР ХОДА -----
function updateTurnIndicator(gameData, myPlayerId, isMyTurn) {
    const indicator = document.getElementById('turn-indicator');
    const current = gameData.turn?.currentPlayer;
    
    if (!current) {
        indicator.textContent = '⏳ Ожидание начала...';
        return;
    }
    
    let playerName = current;
    const p1 = gameData.players?.player1;
    const p2 = gameData.players?.player2;
    if (current === 'player1' && p1) playerName = p1.name || 'Игрок 1';
    else if (current === 'player2' && p2) playerName = p2.name || 'Игрок 2';
    
    const phase = gameData.turn?.phase || 'idle';
    let phaseText = '';
    if (phase === 'roll') phaseText = '🎲 Бросок...';
    else if (phase === 'distribute') phaseText = '✋ Распределение';
    else if (phase === 'select_target') phaseText = '🎯 Выбор цели';
    else if (phase === 'apply') phaseText = '⚡ Применение';
    else if (phase === 'idle') phaseText = '⏳ Ожидание';
    
    const isMyTurnText = isMyTurn ? '🔥 ВАШ ХОД!' : '⏳ Ход соперника';
    indicator.textContent = `🎯 ${playerName} ${phaseText} (${isMyTurnText})`;
    indicator.style.color = isMyTurn ? '#ffd700' : '#888';
}

// ----- МИНИ-КАРТА -----
function updateMinimap(gameData, myPlayerId) {
    const container = document.getElementById('minimap');
    const dungeon = gameData.dungeon;
    
    if (!dungeon || !dungeon.rooms) {
        container.innerHTML = '<div style="color:#666; font-size:12px; padding:10px;">🗺️ Карта не загружена</div>';
        return;
    }
    
    const myPos = gameData.players?.[myPlayerId]?.position || Object.keys(dungeon.rooms)[0];
    const rooms = dungeon.rooms;
    const roomIds = Object.keys(rooms);
    
    let html = '';
    roomIds.forEach(roomId => {
        const room = rooms[roomId];
        const isCurrent = roomId === myPos;
        const isCleared = room.isCleared || false;
        
        let icon = '🏚️';
        if (room.type === 'combat') icon = '💀';
        else if (room.type === 'chest') icon = '💎';
        else if (room.type === 'rest') icon = '🏥';
        else if (room.type === 'shop') icon = '🏪';
        else if (room.type === 'boss') icon = '👑';
        
        const playersInRoom = room.players || [];
        const playerIcons = playersInRoom.map(pId => {
            const p = gameData.players?.[pId];
            if (!p) return '';
            return CLASSES[p.class]?.emoji || '👤';
        }).join('');
        
        let cls = 'minimap-room';
        if (room.type) cls += ` ${room.type}`;
        if (isCurrent) cls += ' current';
        if (isCleared) cls += ' cleared';
        
        html += `
            <div class="${cls}" data-room="${roomId}" title="${roomId} (${room.type})">
                ${icon}
                <div class="room-players">${playerIcons || ' '}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    container.querySelectorAll('.minimap-room').forEach(el => {
        el.addEventListener('click', () => {
            const roomId = el.dataset.room;
            if (roomId && gameData.turn?.phase === 'idle') {
                window.selectRoom?.(roomId);
            }
        });
    });
}

// ----- ОТОБРАЖЕНИЕ ТЕКУЩЕЙ КОМНАТЫ -----
function updateRoomView(gameData, myPlayerId, isMyTurn) {
    const container = document.getElementById('room-view');
    const myPos = gameData.players?.[myPlayerId]?.position;
    
    if (!myPos) {
        container.innerHTML = '<div style="color:#666; text-align:center; padding:40px;">🏚️ Выберите комнату на карте</div>';
        return;
    }
    
    const room = getRoom(gameData.dungeon, myPos);
    if (!room) {
        container.innerHTML = '<div style="color:#666; text-align:center; padding:40px;">❌ Комната не найдена</div>';
        return;
    }
    
    currentRoomId = myPos;
    
    let title = '🏚️ Комната';
    let bgColor = '';
    if (room.type === 'combat') { title = '💀 Бой!'; bgColor = 'rgba(220,53,69,0.1)'; }
    else if (room.type === 'chest') { title = '💎 Сундук'; bgColor = 'rgba(255,193,7,0.1)'; }
    else if (room.type === 'rest') { title = '🏥 Отдых'; bgColor = 'rgba(40,167,69,0.1)'; }
    else if (room.type === 'shop') { title = '🏪 Торговец'; bgColor = 'rgba(23,162,184,0.1)'; }
    else if (room.type === 'boss') { title = '👑 БОСС!'; bgColor = 'rgba(255,0,0,0.2)'; }
    
    let enemiesHtml = '';
    if (room.enemies && room.enemies.length > 0) {
        enemiesHtml = `<div class="enemy-list">`;
        room.enemies.forEach((enemy, index) => {
            const isDead = !enemy.isAlive;
            const isTargetable = isMyTurn && enemy.isAlive && !isDead && room.type !== 'rest' && room.type !== 'shop';
            
            enemiesHtml += `
                <div class="enemy-card ${isDead ? 'enemy-dead' : ''} ${isTargetable ? 'targetable' : ''}" 
                     data-enemy-index="${index}" style="${isTargetable ? 'cursor:pointer;' : ''}">
                    <div class="enemy-emoji">${enemy.emoji || '👾'}</div>
                    <div class="enemy-name">${enemy.name || 'Враг'}</div>
                    <div class="enemy-hp">❤️ ${enemy.hp || 0}/${enemy.maxHp || 0}</div>
                    ${enemy.poison ? `<div style="color:#7cfc00;font-size:11px;">☠️ Отравлен</div>` : ''}
                    ${enemy.freeze ? `<div style="color:#00bfff;font-size:11px;">❄️ Заморожен</div>` : ''}
                </div>
            `;
        });
        enemiesHtml += `</div>`;
    } else if (room.type === 'combat' || room.type === 'boss') {
        enemiesHtml = `<div style="color:#4caf50;">✅ Все враги повержены!</div>`;
    }
    
    let chestsHtml = '';
    if (room.chests && room.chests.length > 0) {
        chestsHtml = `<div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; justify-content:center;">`;
        room.chests.forEach((chest, index) => {
            const isOpened = chest.isOpened || false;
            const rarityInfo = RARITY[chest.rarity] || { color: '#888' };
            chestsHtml += `
                <div class="enemy-card" data-chest-index="${index}" style="min-width:60px; cursor:${isOpened ? 'default' : 'pointer'}; border-color:${isOpened ? '#2a2f45' : rarityInfo.color};">
                    <div style="font-size:32px;">${isOpened ? '📭' : '📦'}</div>
                    <div style="font-size:11px;color:${rarityInfo.color};">${RARITY[chest.rarity]?.label || ''}</div>
                    ${isOpened ? '<div style="color:#888;font-size:10px;">✅ Открыт</div>' : ''}
                </div>
            `;
        });
        chestsHtml += `</div>`;
    }
    
    let shopHtml = '';
    if (room.type === 'shop' && room.shopItems && room.shopItems.length > 0) {
        shopHtml = `<div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; justify-content:center;">`;
        room.shopItems.forEach((item, index) => {
            shopHtml += `
                <div class="enemy-card" data-shop-index="${index}" style="cursor:pointer; min-width:70px; border-color:#17a2b8;">
                    <div style="font-size:28px;">${item.emoji || '📦'}</div>
                    <div style="font-size:12px;color:#ddd;">${item.name}</div>
                    <div style="font-size:12px;color:#ffd700;">💰 ${item.price}</div>
                </div>
            `;
        });
        shopHtml += `</div>`;
    }
    
    let restHtml = '';
    if (room.type === 'rest' && !room.isCleared) {
        restHtml = `
            <button class="btn-success" id="btn-rest-heal" style="padding:12px 30px; border-radius:10px; border:none; font-weight:bold; cursor:pointer;">
                🏥 Отдохнуть (+50% HP)
            </button>
        `;
    }
    
    container.innerHTML = `
        <div class="room-title" style="background:${bgColor}; padding:8px 20px; border-radius:10px; width:100%; text-align:center;">${title}</div>
        ${enemiesHtml}
        ${chestsHtml}
        ${shopHtml}
        ${restHtml}
        <div style="color:#666; font-size:12px; margin-top:8px;">
            ${room.isCleared ? '✅ Комната зачищена' : ''}
            ${room.type === 'rest' && room.isCleared ? '✅ Отдых завершён' : ''}
        </div>
    `;
    
    container.querySelectorAll('.enemy-card.targetable').forEach(el => {
        el.addEventListener('click', () => {
            const index = parseInt(el.dataset.enemyIndex);
            if (!isNaN(index) && isMyTurn) {
                window.selectEnemyTarget?.(index);
            }
        });
    });
    
    container.querySelectorAll('[data-chest-index]').forEach(el => {
        el.addEventListener('click', () => {
            const index = parseInt(el.dataset.chestIndex);
            if (!isNaN(index) && room.chests && !room.chests[index]?.isOpened) {
                window.openChestAction?.(index);
            }
        });
    });
    
    container.querySelectorAll('[data-shop-index]').forEach(el => {
        el.addEventListener('click', () => {
            const index = parseInt(el.dataset.shopIndex);
            if (!isNaN(index) && room.shopItems) {
                window.buyShopAction?.(index);
            }
        });
    });
    
    const restBtn = document.getElementById('btn-rest-heal');
    if (restBtn) {
        restBtn.addEventListener('click', () => {
            window.restHealAction?.();
        });
    }
}

// ----- СЛОТЫ -----
function updateSlots(gameData, myPlayerId) {
    const container = document.getElementById('slots-bar');
    const player = gameData.players?.[myPlayerId];
    
    if (!player) {
        container.innerHTML = '<span style="color:#666; font-size:12px;">Нет данных</span>';
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

// ----- ИНФОРМАЦИЯ О ПРЕДМЕТЕ -----
function showItemInfo(item) {
    const rarityInfo = RARITY[item.rarity] || { label: 'Обычный', color: '#888' };
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <button class="modal-close" onclick="window.closeModal()">✕</button>
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
            <button class="btn-secondary" onclick="window.closeModal()" style="margin-top:10px;">Закрыть</button>
        </div>
    `;
    
    overlay.style.display = 'flex';
}

// ----- ЧАТ -----
function updateChat(gameData) {
    const container = document.getElementById('chat-messages');
    const messages = gameData.chat || [];
    
    if (messages.length === 0) {
        container.innerHTML = '<div style="color:#666; font-size:12px; text-align:center;">💬 Нет сообщений</div>';
        return;
    }
    
    const lastMessages = messages.slice(-15);
    let html = '';
    lastMessages.forEach(msg => {
        const playerId = msg.player;
        const playerData = gameData.players?.[playerId];
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

window.closeModal = closeModal;

// ----- ПОКАЗАТЬ МОДАЛКУ С КУБИКАМИ -----
export function showDiceModal(diceValues, comboName, comboEffect) {
    const container = document.getElementById('dice-container');
    const result = document.getElementById('dice-result');
    const closeBtn = document.getElementById('dice-close-btn');
    
    container.style.display = 'flex';
    result.style.display = 'block';
    if (closeBtn) closeBtn.style.display = 'block';
    
    let html = `<div class="dice-values">${diceValues.map(v => `[${v}]`).join(' ')}</div>`;
    
    if (comboName) {
        html += `
            <div class="dice-combo">🔥 ${comboName}</div>
            <div class="dice-combo-effect">${comboEffect || ''}</div>
        `;
        setTimeout(() => {
            window.closeDiceModal?.();
        }, 3000);
    } else {
        let attackSum = 0;
        let defenseSum = 0;
        const diceStatus = diceValues.map((v, i) => {
            const status = window.diceSelections?.[i] || 'none';
            if (status === 'attack') attackSum += v;
            else if (status === 'defense') defenseSum += v;
            return status;
        });
        
        html += `
            <div style="margin-top:12px; color:#888; font-size:14px;">Распределите кубики (кликните для переключения):</div>
            <div class="dice-actions">
                ${diceValues.map((v, i) => `
                    <button class="${diceStatus[i] === 'attack' ? 'btn-attack' : diceStatus[i] === 'defense' ? 'btn-defense' : 'btn-secondary'}" 
                            data-dice-index="${i}" data-value="${v}" 
                            style="font-size:18px; padding:8px 16px; border-radius:8px; border:none; font-weight:bold; cursor:pointer;">
                        ${v} ${diceStatus[i] === 'attack' ? '⚔️' : diceStatus[i] === 'defense' ? '🛡️' : '⬜'}
                    </button>
                `).join('')}
            </div>
            <div class="dice-stats">
                <span class="stat-attack">⚔️ Атака: ${attackSum}</span>
                <span class="stat-defense">🛡️ Защита: ${defenseSum}</span>
            </div>
            <div style="margin-top:10px;">
                <button class="btn-confirm" id="dice-confirm" style="padding:10px 30px; border-radius:8px; border:none; font-weight:bold; cursor:pointer;">
                    ✅ Подтвердить
                </button>
            </div>
        `;
    }
    
    result.innerHTML = html;
    result.style.display = 'block';
    
    if (!comboName) {
        result.querySelectorAll('[data-dice-index]').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index) || parseInt(this.dataset.diceIndex);
                if (!window.diceSelections) window.diceSelections = {};
                const current = window.diceSelections[index] || 'none';
                if (current === 'none') window.diceSelections[index] = 'attack';
                else if (current === 'attack') window.diceSelections[index] = 'defense';
                else window.diceSelections[index] = 'none';
                const values = window.currentDiceValues || [];
                showDiceModal(values, null, null);
            });
        });
        
        const confirmBtn = result.querySelector('#dice-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const selections = window.diceSelections || {};
                const values = window.currentDiceValues || [];
                let attackSum = 0, defenseSum = 0;
                values.forEach((v, i) => {
                    if (selections[i] === 'attack') attackSum += v;
                    else if (selections[i] === 'defense') defenseSum += v;
                });
                window.confirmDiceDistribution?.(attackSum, defenseSum, selections);
                window.closeDiceModal?.();
            });
        }
    }
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
    showItemInfo
};
