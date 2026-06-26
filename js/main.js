// ============================================================
// LEGENDICE - main.js
// Точка входа: инициализация, управление экранами
// ============================================================

// ----- ИМПОРТЫ -----
import './firebase.js';  // firebase глобально загружен
import { 
    signInAnonymously, 
    getCurrentUser, 
    createGame, 
    joinGame, 
    subscribeToGame,
    unsubscribeFromGame,
    updateGameState,
    sendChatMessage,
    sendPing
} from './firebase.js';
import { CLASSES, SLOT_TYPES, ENEMIES, BOSS, COMBOS, RARITY, ITEMS, CONSUMABLES } from './constants.js';
import { initUI, showLobby, showGame, updateUI } from './ui.js';
import { initDice3D, rollDice, closeDiceModal } from './dice3d.js';

// ----- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ -----
let gameState = null;
let currentPlayerId = null;
let currentGameId = null;
let isMyTurn = false;
let myClass = null;

// ----- ИНИЦИАЛИЗАЦИЯ -----
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎲 LEGENDICE - загрузка...');
    
    try {
        // 1. Авторизация
        const user = await signInAnonymously();
        currentPlayerId = 'player1'; // по умолчанию, обновится при подключении
        console.log('👤 Пользователь:', user.uid);
        
        // 2. Инициализация UI
        initUI();
        
        // 3. Инициализация 3D кубиков
        initDice3D();
        
        // 4. Показать экран лобби
        showLobbyScreen();
        
        // 5. Скрыть загрузку
        document.getElementById('loading-screen').style.display = 'none';
        
        console.log('✅ LEGENDICE загружена!');
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        document.getElementById('loading-screen').innerHTML = `
            <h1>❌ Ошибка</h1>
            <p>${error.message}</p>
            <button onclick="location.reload()">Перезагрузить</button>
        `;
    }
});

// ----- ЛОББИ -----
function showLobbyScreen() {
    const lobbyScreen = document.getElementById('lobby-screen');
    const gameScreen = document.getElementById('game-screen');
    lobbyScreen.style.display = 'flex';
    gameScreen.style.display = 'none';
    
    // Рендерим лобби
    const content = document.getElementById('lobby-content');
    content.innerHTML = `
        <div style="margin-bottom:10px; color:#888; font-size:14px;">
            ID: <span id="lobby-player-id">${getCurrentUser()?.uid || '...'}</span>
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
        <div style="display:flex; gap:10px;">
            <input type="text" id="join-game-id" placeholder="Код игры..." style="flex:1;">
            <button class="btn-secondary" id="btn-join-game">Подключиться</button>
        </div>
        <div id="lobby-status" style="color:#888; font-size:14px; margin-top:10px;"></div>
    `;
    
    // ----- ОБРАБОТЧИКИ ЛОББИ -----
    
    // Выбор класса
    const classBtns = document.querySelectorAll('.class-btn');
    classBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            classBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            myClass = btn.dataset.class;
        });
    });
    // Выбираем первый класс по умолчанию
    if (classBtns.length > 0) {
        classBtns[0].classList.add('selected');
        myClass = classBtns[0].dataset.class;
    }
    
    // Создать игру
    document.getElementById('btn-create-game').addEventListener('click', async () => {
        const name = document.getElementById('player-name').value || 'Игрок';
        if (!myClass) {
            document.getElementById('lobby-status').textContent = '⚠️ Выберите класс!';
            return;
        }
        
        try {
            const gameId = await createGame(name, myClass);
            currentGameId = gameId;
            document.getElementById('lobby-status').textContent = `✅ Игра создана! Код: ${gameId}`;
            currentPlayerId = 'player1';
            startGame(gameId);
        } catch (error) {
            document.getElementById('lobby-status').textContent = `❌ ${error.message}`;
        }
    });
    
    // Подключиться к игре
    document.getElementById('btn-join-game').addEventListener('click', async () => {
        const gameId = document.getElementById('join-game-id').value.trim();
        const name = document.getElementById('player-name').value || 'Игрок';
        
        if (!gameId) {
            document.getElementById('lobby-status').textContent = '⚠️ Введите код игры!';
            return;
        }
        if (!myClass) {
            document.getElementById('lobby-status').textContent = '⚠️ Выберите класс!';
            return;
        }
        
        try {
            await joinGame(gameId, name, myClass);
            currentGameId = gameId;
            currentPlayerId = 'player2';
            document.getElementById('lobby-status').textContent = `✅ Подключено к игре: ${gameId}`;
            startGame(gameId);
        } catch (error) {
            document.getElementById('lobby-status').textContent = `❌ ${error.message}`;
        }
    });
}

// ----- ЗАПУСК ИГРЫ -----
function startGame(gameId) {
    // Переключаем экраны
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    
    // Подписываемся на обновления игры
    subscribeToGame(gameId, handleGameUpdate);
    
    // Инициализируем UI игры
    showGame();
}

// ----- ОБРАБОТКА ОБНОВЛЕНИЙ ИГРЫ -----
function handleGameUpdate(data) {
    if (!data) {
        console.warn('⚠️ Нет данных игры');
        return;
    }
    
    gameState = data;
    
    // Определяем, кто мы
    const user = getCurrentUser();
    let myPlayerId = null;
    let myPlayerData = null;
    
    if (data.players.player1?.uid === user?.uid) {
        myPlayerId = 'player1';
        myPlayerData = data.players.player1;
    } else if (data.players.player2?.uid === user?.uid) {
        myPlayerId = 'player2';
        myPlayerData = data.players.player2;
    }
    
    if (!myPlayerId) {
        console.warn('⚠️ Игрок не найден в игре');
        return;
    }
    
    // Проверяем, наш ли ход
    isMyTurn = data.turn?.currentPlayer === myPlayerId;
    
    // Обновляем UI
    updateUI(data, myPlayerId, isMyTurn);
}

// ----- ЭКСПОРТ ДЛЯ ДРУГИХ МОДУЛЕЙ -----
export function getGameState() { return gameState; }
export function getCurrentPlayerId() { return currentPlayerId; }
export function isMyTurn() { return isMyTurn; }
export function getMyClass() { return myClass; }

// ----- ПЕРЕХВАТ ГЛОБАЛЬНЫХ СОБЫТИЙ ДЛЯ UI -----
window.rollDiceAction = function() {
    if (!isMyTurn) {
        alert('Сейчас не ваш ход!');
        return;
    }
    // Открываем 3D модалку с кубиками
    rollDice();
};

window.sendChat = function() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (text && currentGameId && currentPlayerId) {
        sendChatMessage(currentGameId, currentPlayerId, text);
        input.value = '';
    }
};

window.sendPingAction = function(emoji) {
    if (currentGameId && currentPlayerId && gameState) {
        const roomId = gameState.players[currentPlayerId]?.position || 'room_1';
        sendPing(currentGameId, currentPlayerId, roomId, emoji);
    }
};

// ----- ОБРАБОТЧИКИ КНОПОК (назначаются после загрузки DOM) -----
document.addEventListener('DOMContentLoaded', () => {
    // Чат
    document.getElementById('chat-send')?.addEventListener('click', window.sendChat);
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') window.sendChat();
    });
    
    // Пинги
    document.querySelectorAll('.ping-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.sendPingAction(btn.dataset.emoji);
        });
    });
    
    // Бросок кубиков
    document.getElementById('btn-roll')?.addEventListener('click', window.rollDiceAction);
});

console.log('🎲 LEGENDICE - main.js загружен');
