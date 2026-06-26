// ============================================================
// LEGENDICE - firebase.js
// Подключение Firebase, аутентификация, синхронизация с Firestore
// ============================================================

// ----- КОНФИГУРАЦИЯ FIREBASE (замените на свои данные) -----
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

// ----- СОСТОЯНИЕ ИГРОКА -----
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

// ----- ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ -----
export function getCurrentUser() {
    return currentUser;
}

// ----- СОЗДАТЬ ИГРУ (ЛОББИ) -----
export function createGame(playerName, playerClass) {
    if (!currentUser) {
        return Promise.reject(new Error('Пользователь не аутентифицирован'));
    }
    
    const gameData = {
        status: 'lobby',
        maxPlayers: 2,
        players: {
            player1: {
                uid: currentUser.uid,
                name: playerName || 'Игрок 1',
                class: playerClass,
                isReady: false,
                isAlive: true,
                isShadow: false
            },
            player2: null
        },
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

// ----- ПОДКЛЮЧИТЬСЯ К ИГРЕ ПО ID -----
export function joinGame(gameId, playerName, playerClass) {
    if (!currentUser) {
        return Promise.reject(new Error('Пользователь не аутентифицирован'));
    }
    
    const gameRef = db.collection('games').doc(gameId);
    
    return gameRef.get()
        .then((doc) => {
            if (!doc.exists) {
                throw new Error('Игра не найдена');
            }
            const data = doc.data();
            
            // Проверяем, есть ли место
            if (data.players.player1 && data.players.player2) {
                throw new Error('В игре уже 2 игрока');
            }
            
            // Присоединяемся как player2
            const updateData = {
                'players.player2': {
                    uid: currentUser.uid,
                    name: playerName || 'Игрок 2',
                    class: playerClass,
                    isReady: false,
                    isAlive: true,
                    isShadow: false
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Если player1 нет (редкий случай) — присоединяемся как player1
            if (!data.players.player1) {
                updateData['players.player1'] = {
                    uid: currentUser.uid,
                    name: playerName || 'Игрок 1',
                    class: playerClass,
                    isReady: false,
                    isAlive: true,
                    isShadow: false
                };
            }
            
            return gameRef.update(updateData);
        })
        .then(() => {
            currentGameId = gameId;
            console.log('✅ Подключился к игре:', currentGameId);
            return currentGameId;
        });
}

// ----- ОБНОВИТЬ СТАТУС ГОТОВНОСТИ ИГРОКА -----
export function setPlayerReady(gameId, playerId, isReady) {
    const gameRef = db.collection('games').doc(gameId);
    const updateData = {};
    updateData[`players.${playerId}.isReady`] = isReady;
    updateData['updatedAt'] = firebase.firestore.FieldValue.serverTimestamp();
    
    return gameRef.update(updateData);
}

// ----- ОБНОВИТЬ СОСТОЯНИЕ ИГРЫ (ход, бой, карта) -----
export function updateGameState(gameId, data) {
    const gameRef = db.collection('games').doc(gameId);
    data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    return gameRef.update(data);
}

// ----- ПОДПИСАТЬСЯ НА ИЗМЕНЕНИЯ ИГРЫ -----
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
            console.warn('⚠️ Игра не найдена');
            callback(null);
        }
    }, (error) => {
        console.error('❌ Ошибка подписки:', error);
    });
    
    return unsubscribeGame;
}

// ----- ОТПИСАТЬСЯ ОТ ИГРЫ -----
export function unsubscribeFromGame() {
    if (unsubscribeGame) {
        unsubscribeGame();
        unsubscribeGame = null;
    }
}

// ----- ЗАПИСАТЬ СООБЩЕНИЕ В ЧАТ -----
export function sendChatMessage(gameId, playerId, message) {
    const gameRef = db.collection('games').doc(gameId);
    const chatMessage = {
        player: playerId,
        message: message,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    return gameRef.update({
        chat: firebase.firestore.FieldValue.arrayUnion(chatMessage),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ----- ЗАПИСАТЬ ПИНГ НА КАРТЕ -----
export function sendPing(gameId, playerId, roomId, emoji) {
    const gameRef = db.collection('games').doc(gameId);
    const ping = {
        player: playerId,
        roomId: roomId,
        emoji: emoji,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    return gameRef.update({
        pings: firebase.firestore.FieldValue.arrayUnion(ping),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ----- ОБНОВИТЬ ПОЗИЦИЮ ИГРОКА (комната) -----
export function updatePlayerPosition(gameId, playerId, roomId) {
    const gameRef = db.collection('games').doc(gameId);
    const updateData = {};
    updateData[`players.${playerId}.position`] = roomId;
    updateData['updatedAt'] = firebase.firestore.FieldValue.serverTimestamp();
    
    return gameRef.update(updateData);
}

// ----- УДАЛИТЬ ИГРУ (при завершении) -----
export function deleteGame(gameId) {
    return db.collection('games').doc(gameId).delete()
        .then(() => {
            console.log('🗑️ Игра удалена');
            currentGameId = null;
        });
}

// ----- ПОЛУЧИТЬ СПИСОК АКТИВНЫХ ИГР (для лобби) -----
export function getActiveGames() {
    return db.collection('games')
        .where('status', 'in', ['lobby', 'dungeon', 'combat'])
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get()
        .then((snapshot) => {
            const games = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id;
                games.push(data);
            });
            return games;
        });
}

// ----- ЭКСПОРТ -----
export default {
    signInAnonymously,
    getCurrentUser,
    createGame,
    joinGame,
    setPlayerReady,
    updateGameState,
    subscribeToGame,
    unsubscribeFromGame,
    sendChatMessage,
    sendPing,
    updatePlayerPosition,
    deleteGame,
    getActiveGames
};
