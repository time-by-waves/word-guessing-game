import { io } from '/socket.io/socket.io.esm.min.js';

class WordGuessingGame {
  constructor() {
    this.socket = io();
    this.gameId = null;
    this.roomCode = null;
    this.currentGuesses = [];
    this.targetWord = null;
    this.sortByCloseness = false;
    this.currentPlayer = null;
    this.isGuest = false;

    this.initializeElements();
    this.bindEvents();
    this.setupSocketListeners();
    this.checkAuthentication();
  }

  initializeElements() {
    // Auth elements
    this.authSection = document.getElementById('authSection');
    this.gameMenu = document.getElementById('gameMenu');
    this.userInfo = document.getElementById('userInfo');
    this.usernameDisplay = document.getElementById('username');

    // Game elements
    this.gameArea = document.getElementById('gameArea');
    this.guessInput = document.getElementById('guessInput');
    this.submitBtn = document.getElementById('submitGuess');
    this.messageDiv = document.getElementById('message');
    this.hintDiv = document.getElementById('hint');
    this.guessList = document.getElementById('guessList');
    this.sortToggle = document.getElementById('sortToggle');
    this.historyTitle = document.getElementById('historyTitle');
    this.roomCodeDisplay = document.getElementById('roomCode');
    this.playerCountDisplay = document.getElementById('playerCount');
    this.maxPlayersDisplay = document.getElementById('maxPlayers');
    this.playersList = document.getElementById('playersList');

    // Modal elements
    this.leaderboardModal = document.getElementById('leaderboardModal');
    this.leaderboardContent = document.getElementById('leaderboardContent');
    this.achievementNotification = document.getElementById(
      'achievementNotification'
    );
    this.achievementText = document.getElementById('achievementText');
  }

  bindEvents() {
    // Auth events
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', e => this.switchTab(e.target.dataset.tab));
    });

    document
      .getElementById('loginForm')
      .addEventListener('submit', e => this.handleLogin(e));
    document
      .getElementById('registerForm')
      .addEventListener('submit', e => this.handleRegister(e));
    document
      .getElementById('playAsGuestBtn')
      .addEventListener('click', () => this.playAsGuest());
    document
      .getElementById('logoutBtn')
      .addEventListener('click', () => this.logout());

    // Game menu events
    document
      .getElementById('createGameBtn')
      .addEventListener('click', () => this.createGame());
    document
      .getElementById('joinGameBtn')
      .addEventListener('click', () => this.joinGame());
    document
      .getElementById('viewLeaderboardBtn')
      .addEventListener('click', () => this.showLeaderboard());

    // Game events
    this.submitBtn.addEventListener('click', () => this.submitGuess());
    this.sortToggle.addEventListener('click', () => this.toggleSortOrder());
    this.guessInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        this.submitGuess();
      }
    });

    document
      .getElementById('leaveGameBtn')
      .addEventListener('click', () => this.leaveGame());

    // Modal events
    document.querySelector('.close-btn').addEventListener('click', () => {
      this.leaderboardModal.classList.add('hidden');
    });

    this.leaderboardModal.addEventListener('click', e => {
      if (e.target === this.leaderboardModal) {
        this.leaderboardModal.classList.add('hidden');
      }
    });
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.info('Connected to server');
    });

    this.socket.on('playerJoined', data => {
      this.playerCountDisplay.textContent = data.totalPlayers;
      this.showMessage(`A player joined the game`, 'info');
    });

    this.socket.on('playerLeft', data => {
      this.playerCountDisplay.textContent = data.totalPlayers;
      this.showMessage(`A player left the game`, 'info');
    });

    this.socket.on('newGuess', data => {
      if (data.playerId !== this.currentPlayer?.id) {
        this.currentGuesses.unshift(data.guess);
        this.updateGuessList(this.currentGuesses);
      }
    });

    this.socket.on('gameWon', data => {
      this.targetWord = data.targetWord;
      this.showMessage(
        `Game Over! The word was "${data.targetWord}"`,
        'success'
      );
      this.submitBtn.disabled = true;
      this.guessInput.disabled = true;
    });

    this.socket.on('achievementUnlocked', data => {
      this.showAchievement(data.name, data.description);
    });

    this.socket.on('gameTimeout', data => {
      this.showMessage(data.message, 'error');
      setTimeout(() => this.leaveGame(), 3000);
    });
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}Tab`);
    });
  }

  async checkAuthentication() {
    try {
      const response = await fetch('/api/players/me');
      if (response.ok) {
        const data = await response.json();
        this.currentPlayer = data.player;
        this.showGameMenu();
        this.updatePlayerStats(data.stats);
      } else {
        this.authSection.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.authSection.classList.remove('hidden');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const response = await fetch('/api/players/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        this.currentPlayer = data.player;
        this.showGameMenu();
        this.loadPlayerStats();
      } else {
        this.showMessage(data.error || 'Login failed', 'error');
      }
    } catch (error) {
      this.showMessage('Login error: ' + error.message, 'error');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const formData = {
      username: document.getElementById('registerUsername').value,
      displayName: document.getElementById('registerDisplayName').value,
      email: document.getElementById('registerEmail').value,
      password: document.getElementById('registerPassword').value,
    };

    try {
      const response = await fetch('/api/players/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        this.currentPlayer = data.player;
        this.showGameMenu();
        this.showMessage('Registration successful!', 'success');
      } else {
        this.showMessage(data.error || 'Registration failed', 'error');
      }
    } catch (error) {
      this.showMessage('Registration error: ' + error.message, 'error');
    }
  }

  playAsGuest() {
    this.isGuest = true;
    this.currentPlayer = {
      id: 'guest-' + Date.now(),
      username: 'Guest',
      displayName: 'Guest Player',
    };
    this.showGameMenu();
  }

  async logout() {
    try {
      await fetch('/api/players/logout', { method: 'POST' });
      this.currentPlayer = null;
      this.isGuest = false;
      this.authSection.classList.remove('hidden');
      this.gameMenu.classList.add('hidden');
      this.gameArea.classList.add('hidden');
      this.userInfo.classList.add('hidden');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  showGameMenu() {
    this.authSection.classList.add('hidden');
    this.gameMenu.classList.remove('hidden');
    this.userInfo.classList.remove('hidden');
    this.usernameDisplay.textContent =
      this.currentPlayer.displayName || this.currentPlayer.username;

    if (!this.isGuest) {
      this.loadPlayerStats();
    } else {
      document.getElementById('playerStats').innerHTML =
        '<p>Playing as guest</p>';
    }
  }

  async loadPlayerStats() {
    try {
      const response = await fetch(
        `/api/players/${this.currentPlayer.id}/stats`
      );
      if (response.ok) {
        const stats = await response.json();
        this.updatePlayerStats(stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  updatePlayerStats(stats) {
    const statsHtml = `
            <p>Games Played: ${stats.games_played || 0}</p>
            <p>Games Won: ${stats.games_won || 0}</p>
            <p>Win Rate: ${stats.games_played > 0 ? ((stats.games_won / stats.games_played) * 100).toFixed(1) : 0}%</p>
            <p>Best Time: ${stats.best_time_seconds ? stats.best_time_seconds + 's' : 'N/A'}</p>
        `;
    document.getElementById('playerStats').innerHTML = statsHtml;
  }

  async createGame() {
    const difficulty = document.getElementById('difficultySelect').value;

    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty, maxPlayers: 4 }),
      });

      const data = await response.json();

      if (response.ok) {
        this.gameId = data.gameId;
        this.roomCode = data.roomCode;
        this.enterGame();
      } else {
        this.showMessage(data.error || 'Failed to create game', 'error');
      }
    } catch (error) {
      this.showMessage('Error creating game: ' + error.message, 'error');
    }
  }

  async joinGame() {
    const roomCode = document
      .getElementById('roomCodeInput')
      .value.trim()
      .toUpperCase();

    if (!roomCode) {
      this.showMessage('Please enter a room code', 'error');
      return;
    }

    try {
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode }),
      });

      const data = await response.json();

      if (response.ok) {
        this.gameId = data.gameId;
        this.roomCode = roomCode;
        this.enterGame();
      } else {
        this.showMessage(data.error || 'Failed to join game', 'error');
      }
    } catch (error) {
      this.showMessage('Error joining game: ' + error.message, 'error');
    }
  }

  enterGame() {
    this.gameMenu.classList.add('hidden');
    this.gameArea.classList.remove('hidden');

    this.roomCodeDisplay.textContent = this.roomCode;
    this.currentGuesses = [];
    this.targetWord = null;

    this.clearGuesses();
    this.clearHint();
    this.guessInput.value = '';
    this.guessInput.focus();

    // Join socket room
    this.socket.emit('joinGame', this.gameId);

    // Reset sort
    this.sortByCloseness = false;
    this.sortToggle.textContent = 'Sort by Closeness';
    this.historyTitle.textContent = 'Guess History (Newest First)';

    this.loadGameStatus();
  }

  async loadGameStatus() {
    try {
      const response = await fetch(`/api/game/${this.gameId}/status`);
      const data = await response.json();

      if (response.ok) {
        this.currentGuesses = data.guesses || [];
        this.updateGuessList(this.currentGuesses);
        this.updatePlayersList(data.players || []);

        if (data.isComplete && data.targetWord) {
          this.targetWord = data.targetWord;
          this.showMessage(
            `Game is complete. The word was: ${data.targetWord}`,
            'success'
          );
          this.submitBtn.disabled = true;
          this.guessInput.disabled = true;
        }
      }
    } catch (error) {
      console.error('Failed to load game status:', error);
    }
  }

  leaveGame() {
    this.socket.emit('leaveGame', this.gameId);
    this.gameArea.classList.add('hidden');
    this.gameMenu.classList.remove('hidden');
    this.gameId = null;
    this.roomCode = null;
  }

  async submitGuess() {
    const guess = this.guessInput.value.trim();

    if (!guess) {
      this.showMessage('Please enter a guess', 'error');
      return;
    }

    if (!this.gameId) {
      this.showMessage('No active game', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/game/${this.gameId}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess }),
      });

      const data = await response.json();

      this.currentGuesses = data.guesses;

      if (data.correct && data.targetWord) {
        this.targetWord = data.targetWord;
      }

      if (data.correct) {
        this.showMessage(data.message, 'success');
        this.clearHint();
        this.submitBtn.disabled = true;
        this.guessInput.disabled = true;

        if (!this.isGuest) {
          this.loadPlayerStats();
        }
      } else {
        this.showMessage(data.message, 'info');
        this.showHint(data.hint);
      }

      this.updateGuessList(this.currentGuesses);
      this.guessInput.value = '';
      if (!data.correct) {
        this.guessInput.focus();
      }
    } catch (error) {
      this.showMessage('Error submitting guess: ' + error.message, 'error');
    }
  }

  toggleSortOrder() {
    this.sortByCloseness = !this.sortByCloseness;

    if (this.sortByCloseness) {
      this.sortToggle.textContent = 'Sort by Time';
      this.historyTitle.textContent =
        'Guess History (By Alphabetical Closeness)';
    } else {
      this.sortToggle.textContent = 'Sort by Closeness';
      this.historyTitle.textContent = 'Guess History (Newest First)';
    }

    this.updateGuessList(this.currentGuesses);
  }

  getSortedGuesses(guesses) {
    if (!this.sortByCloseness) {
      return [...guesses];
    }

    if (!this.targetWord) {
      return [...guesses];
    }

    return [...guesses].sort((a, b) => {
      if (a.isCorrect) {
        return -1;
      }
      if (b.isCorrect) {
        return 1;
      }

      const distanceA = this.getAlphabeticalDistance(a.word, this.targetWord);
      const distanceB = this.getAlphabeticalDistance(b.word, this.targetWord);

      return distanceA - distanceB;
    });
  }

  getAlphabeticalDistance(word1, word2) {
    const len1 = word1.length;
    const len2 = word2.length;
    const dp = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (word1[i - 1] === word2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }

    return dp[len1][len2];
  }

  updateGuessList(guesses) {
    this.guessList.innerHTML = '';
    const sortedGuesses = this.getSortedGuesses(guesses);

    if (this.sortByCloseness && !this.targetWord && guesses.length > 0) {
      const messageEl = document.createElement('div');
      messageEl.className = 'sort-message';
      messageEl.textContent = 'Complete the game to sort by closeness';
      this.guessList.appendChild(messageEl);
    }

    sortedGuesses.forEach(guess => {
      const guessElement = document.createElement('div');
      guessElement.className =
        'guess-item' + (guess.isCorrect ? ' correct' : '');

      const time = new Date(
        guess.timestamp || guess.guessed_at
      ).toLocaleTimeString();
      const playerName = guess.display_name || guess.username || 'Guest';

      guessElement.innerHTML = `
                <div class="guess-word">${guess.word}</div>
                <div class="guess-info">
                    <span class="guess-player">${playerName}</span>
                    <span class="guess-time">${time}</span>
                </div>
            `;

      this.guessList.appendChild(guessElement);
    });
  }

  updatePlayersList(players) {
    this.playersList.innerHTML = '';
    this.playerCountDisplay.textContent = players.length;

    players.forEach(player => {
      const playerCard = document.createElement('div');
      playerCard.className = 'player-card';

      if (player.id === this.currentPlayer?.id) {
        playerCard.classList.add('current-player');
      }

      playerCard.innerHTML = `
                <span class="player-name">${player.display_name || player.username}</span>
                <span class="player-score">Score: ${player.score || 0}</span>
            `;

      this.playersList.appendChild(playerCard);
    });
  }

  async showLeaderboard() {
    try {
      const response = await fetch('/api/leaderboard?limit=20');
      const leaderboard = await response.json();

      if (response.ok) {
        this.displayLeaderboard(leaderboard);
        this.leaderboardModal.classList.remove('hidden');
      }
    } catch (error) {
      this.showMessage('Failed to load leaderboard', 'error');
    }
  }

  displayLeaderboard(leaderboard) {
    this.leaderboardContent.innerHTML = '';

    leaderboard.forEach((player, index) => {
      const item = document.createElement('div');
      item.className = 'leaderboard-item';

      item.innerHTML = `
                <div class="leaderboard-rank">#${index + 1}</div>
                <div class="leaderboard-player">
                    <div class="player-name">${player.display_name}</div>
                    <div class="player-username">@${player.username}</div>
                </div>
                <div class="leaderboard-stats">
                    <div class="wins">${player.games_won} wins</div>
                    <div class="win-rate">${player.win_rate}% win rate</div>
                </div>
            `;

      this.leaderboardContent.appendChild(item);
    });
  }

  showAchievement(name, description) {
    this.achievementText.textContent = description;
    this.achievementNotification.classList.remove('hidden');

    setTimeout(() => {
      this.achievementNotification.classList.add('hidden');
    }, 5000);
  }

  showMessage(message, type) {
    this.messageDiv.textContent = message;
    this.messageDiv.className = `message ${type}`;
  }

  showHint(hint) {
    this.hintDiv.textContent = hint;
    this.hintDiv.style.display = 'block';
  }

  clearHint() {
    this.hintDiv.style.display = 'none';
  }

  clearGuesses() {
    this.guessList.innerHTML = '';
    this.currentGuesses = [];
    this.submitBtn.disabled = false;
    this.guessInput.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WordGuessingGame();
});
