// ============================================================
// LEGENDICE - firebase.js
// Подключение Firebase, аутентификация, синхронизация
// ============================================================

// ----- КОНФИГУРАЦИЯ FIREBASE (ЗАМЕНИТЕ НА СВОЙ) -----
const firebaseConfig = {
    apiKey: "AIzaSyAn-mNXyJYWPAGb_jqsCt38pu5pwq0_pBA",
    authDomain: "legendice.firebaseapp.com",
    databaseURL: "https://legendice-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "legendice",
    storageBucket: "legendice.firebasestorage.app",
    messagingSenderId: "133073704952",
    appId: "1:133073704952:web:61253fbe0606a9f44b280d"
};

// ----- ИНИЦИАЛИЗАЦИЯ -----
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let currentGameId = null;
let unsubscribeGame = null;

// ----- АНОНИМНАЯ АУТЕНТИФИКАЦИЯ -----
export function signInAnonymously() {
    return auth.signInAnonymously()
        .then((userCredential) => {
            currentUser = userCredential.user;
            console.log('✅ Анонимный вход выполнен:', currentUser.uid);
            return currentUser;
        })
        .catch((error) => {
            console.error('❌ Ошибка аутентификации:', error);
            throw error;
        });
}

export function getCurrentUser() {
    return currentUser || auth.currentUser;
}

// ----- ПОЛУЧИТЬ ДАННЫЕ ИГРЫ -----
export function getGameData(gameId) {
    return db.collection('games').doc(gameId).get()
        .then((doc) => {
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            } else {
                throw new Error('Игра не найдена');
            }
        });
}

// ----- СОЗДАТЬ ИГРУ -----
export function createGame(playerName, playerClass) {
    if (!getCurrentUser()) {
        return Promise.reject(new Error('Пользователь не аутентифицирован'));
    }
    
    const user = getCurrentUser();
    const gameData = {
        status: 'lobby',
        maxPlayers: 4,
        players: {
            player1: {
                uid: user.uid,
                name: playerName || 'Игрок 1',
                class: playerClass,
                isReady: false,
                isAlive: true,
                isShadow: false,
                hp: 20,
                maxHp: 20,
                position: null,
                slots: {},
                inventory: []
            },
            player2: null,
            player3: null,
            player4: null
        },
        dungeon: null,
        turn: null,
        chat: [],
        pings: [],
        logs: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    return db.collection('games').add(gameData)
        .then((docRef) => {
            currentGameId = docRef.id;
            console.log('✅ Игра создана:', currentGameId);
            return currentGameId;
        });
}

// ----- ПОДКЛЮЧИТЬСЯ К ИГРЕ -----
export function joinGame(gameId, playerName, playerClass) {
    if (!getCurrentUser()) {
        return Promise.reject(new Error('Пользователь не аутентифицирован'));
    }
    
    const user = getCurrentUser();
    const gameRef = db.collection('games').doc(gameId);
    
    return gameRef.get()
        .then((doc) => {
            if (!doc.exists) {
                throw new Error('Игра не найдена');
            }
            const data = doc.data();
            
            // Ищем свободный слот
            let slot = null;
            if (!data.players.player1) slot = 'player1';
            else if (!data.players.player2) slot = 'player2';
            else if (!data.players.player3) slot = 'player3';
            else if (!data.players.player4) slot = 'player4';
            else throw new Error('В игре нет свободных мест');
            
            const updateData = {};
            updateData[`players.${slot}`] = {
                uid: user.uid,
                name: playerName || 'Игрок',
                class: playerClass,
                isReady: false,
                isAlive: true,
                isShadow: false,
                hp: 20,
                maxHp: 20,
                position: null,
                slots: {},
                inventory: []
            };
            updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            return gameRef.update(updateData);
        })
        .then(() => {
            currentGameId = gameId;
            console.log('✅ Подключился к игре:', currentGameId);
            return currentGameId;
        });
}

// ----- ОБНОВИТЬ СОСТОЯНИЕ ИГРЫ -----
export function updateGameState(gameId, data) {
    const gameRef = db.collection('games').doc(gameId);
    data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    return gameRef.update(data);
}

// ----- ПОДПИСАТЬСЯ НА ИЗМЕНЕНИЯ -----
export function subscribeToGame(gameId, callback) {
    if (unsubscribeGame) {
        unsubscribeGame();
        unsubscribeGame = null;
    }
    
    const gameRef = db.collection('games').doc(gameId);
    unsubscribeGame = gameRef.onSnapshot((snapshot) => {
        if (snapshot.exists) {
            const data = snapshot.data();
            data.id = snapshot.id;
            callback(data);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error('❌ Ошибка подписки:', error);
    });
    
    return unsubscribeGame;
}

// ----- ОТПИСАТЬСЯ -----
export function unsubscribeFromGame() {
    if (unsubscribeGame) {
        unsubscribeGame();
        unsubscribeGame = null;
    }
}

// ----- ОТПРАВИТЬ СООБЩЕНИЕ В ЧАТ -----
export function sendChatMessage(gameId, playerId, message) {
    const gameRef = db.collection('games').doc(gameId);
    return gameRef.update({
        chat: firebase.firestore.FieldValue.arrayUnion({
            player: playerId,
            message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ----- ОТПРАВИТЬ ПИНГ -----
export function sendPing(gameId, playerId, roomId, emoji) {
    const gameRef = db.collection('games').doc(gameId);
    return gameRef.update({
        pings: firebase.firestore.FieldValue.arrayUnion({
            player: playerId,
            roomId: roomId,
            emoji: emoji,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ----- ГОТОВНОСТЬ ИГРОКА -----
export function setPlayerReady(gameId, playerId, isReady) {
    const gameRef = db.collection('games').doc(gameId);
    const updateData = {};
    updateData[`players.${playerId}.isReady`] = isReady;
    updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    return gameRef.update(updateData);
}

// ----- ОБНОВИТЬ ПОЗИЦИЮ ИГРОКА -----
export function updatePlayerPosition(gameId, playerId, roomId) {
    const gameRef = db.collection('games').doc(gameId);
    const updateData = {};
    updateData[`players.${playerId}.position`] = roomId;
    updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    return gameRef.update(updateData);
}

// ----- УДАЛИТЬ ИГРУ -----
export function deleteGame(gameId) {
    return db.collection('games').doc(gameId).delete()
        .then(() => {
            console.log('🗑️ Игра удалена');
            currentGameId = null;
        });
}

console.log('🔥 Firebase инициализирован. Режим:', navigator.onLine ? 'онлайн' : 'офлайн');

// js/firebase.js - добавить в конец файла

export {
    signInAnonymously,
    getCurrentUser,
    getGameData,
    createGame,
    joinGame,
    updateGameState,
    subscribeToGame,
    unsubscribeFromGame,
    sendChatMessage,
    sendPing,
    setPlayerReady,
    updatePlayerPosition
};
