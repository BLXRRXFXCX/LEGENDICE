// ============================================================
// LEGENDICE - main.js (исправленная версия)
// ============================================================

// ----- ИМПОРТЫ -----
// Временно отключаем Firebase для теста
// import './firebase.js';

console.log('✅ main.js загружен!');

// ----- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ -----
let gameState = null;
let currentPlayerId = null;
let currentGameId = null;
let isMyTurn = false;  // ТОЛЬКО ОДНО ОБЪЯВЛЕНИЕ!
let myClass = null;

// ----- ИНИЦИАЛИЗАЦИЯ -----
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎲 LEGENDICE - загрузка...');
    
    try {
        // Скрываем загрузку
        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';
        
        // Показываем лобби
        showLobbyScreen();
        
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
    
    if (lobbyScreen) lobbyScreen.style.display = 'flex';
    if (gameScreen) gameScreen.style.display = 'none';
    
    const content = document.getElementById('lobby-content');
    if (content) {
        content.innerHTML = `
            <h2>🎲 LEGENDICE</h2>
            <p style="color:#888; font-size:14px;">Добро пожаловать!</p>
            <div class="class-select" id="class-select">
                <button class="class-btn selected" data-class="dd">⚔️ <span class="class-name">ДД</span></button>
                <button class="class-btn" data-class="healer">💚 <span class="class-name">Хилер</span></button>
                <button class="class-btn" data-class="tank">🛡️ <span class="class-name">Танк</span></button>
                <button class="class-btn" data-class="mage">🧙 <span class="class-name">Маг</span></button>
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
    
    // ----- ОБРАБОТЧИКИ ЛОББИ -----
    
    // Выбор класса
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            myClass = this.dataset.class;
        });
    });
    
    // Создать игру
    const createBtn = document.getElementById('btn-create-game');
    if (createBtn) {
        createBtn.addEventListener('click', function() {
            const name = document.getElementById('player-name')?.value || 'Игрок';
            const status = document.getElementById('lobby-status');
            if (!myClass) {
                if (status) status.textContent = '⚠️ Выберите класс!';
                return;
            }
            if (status) status.textContent = `✅ Игра создана! (тестовый режим)`;
            // Переключаем на экран игры
            document.getElementById('lobby-screen').style.display = 'none';
            document.getElementById('game-screen').style.display = 'flex';
            document.getElementById('turn-indicator').textContent = '🎯 Тестовый режим';
        });
    }
    
    // Подключиться к игре
    const joinBtn = document.getElementById('btn-join-game');
    if (joinBtn) {
        joinBtn.addEventListener('click', function() {
            const gameId = document.getElementById('join-game-id')?.value.trim();
            const status = document.getElementById('lobby-status');
            if (!gameId) {
                if (status) status.textContent = '⚠️ Введите код игры!';
                return;
            }
            if (status) status.textContent = `✅ Подключено к игре: ${gameId} (тестовый режим)`;
            document.getElementById('lobby-screen').style.display = 'none';
            document.getElementById('game-screen').style.display = 'flex';
            document.getElementById('turn-indicator').textContent = '🎯 Тестовый режим';
        });
    }
    
    console.log('✅ Лобби отображено');
}
