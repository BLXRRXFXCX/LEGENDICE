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
                // TODO: Переме
