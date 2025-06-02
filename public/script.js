class WordGuessingGame {
    constructor() {
        this.gameId = null;
        this.currentGuesses = [];
        this.targetWord = null;
        this.sortByCloseness = false;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.newGameBtn = document.getElementById('newGameBtn');
        this.gameArea = document.getElementById('gameArea');
        this.guessInput = document.getElementById('guessInput');
        this.submitBtn = document.getElementById('submitGuess');
        this.messageDiv = document.getElementById('message');
        this.hintDiv = document.getElementById('hint');
        this.guessList = document.getElementById('guessList');
        this.sortToggle = document.getElementById('sortToggle');
        this.historyTitle = document.getElementById('historyTitle');
    }

    bindEvents() {
        this.newGameBtn.addEventListener('click', () =>
            this.startNewGame());
        this.submitBtn.addEventListener('click', () =>
            this.submitGuess());
        this.sortToggle.addEventListener('click', () =>
            this.toggleSortOrder());
        this.guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitGuess();
            }
        });
    }

    toggleSortOrder() {
        this.sortByCloseness = !this.sortByCloseness;

        if (this.sortByCloseness) {
            this.sortToggle.textContent = 'Sort by Time';
            this.historyTitle.textContent =
                'Guess History (By Alphabetical Closeness)';
        } else {
            this.sortToggle.textContent = 'Sort by Closeness';
            this.historyTitle.textContent =
                'Guess History (Newest First)';
        }

        this.updateGuessList(this.currentGuesses);
    }

    getSortedGuesses(guesses) {
        if (!this.sortByCloseness) {
            return [...guesses];
        }

        // For alphabetical closeness, we need the target word
        // If game is not complete, we can't sort by closeness
        if (!this.targetWord) {
            return [...guesses];
        }

        return [...guesses].sort((a, b) => {
            if (a.isCorrect) return -1;
            if (b.isCorrect) return 1;

            const distanceA = this.getAlphabeticalDistance(
                a.word, this.targetWord);
            const distanceB = this.getAlphabeticalDistance(
                b.word, this.targetWord);

            return distanceA - distanceB;
        });
    }

    getAlphabeticalDistance(word1, word2) {
        // Calculate the Levenshtein distance between two words
        const len1 = word1.length;
        const len2 = word2.length;
        const dp = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

        for (let i = 0; i <= len1; i++) dp[i][0] = i;
        for (let j = 0; j <= len2; j++) dp[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (word1[i - 1] === word2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j],    // Deletion
                        dp[i][j - 1],    // Insertion
                        dp[i - 1][j - 1] // Substitution
                    ) + 1;
                }
            }
        }

        return dp[len1][len2];
    }

    async startNewGame() {
        try {
            const response = await fetch('/api/game/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            this.gameId = data.gameId;
            this.targetWord = null;
            this.currentGuesses = [];

            this.showMessage(data.message, 'info');
            this.gameArea.classList.remove('hidden');
            this.newGameBtn.textContent = 'Start New Game';
            this.clearGuesses();
            this.clearHint();
            this.guessInput.value = '';
            this.guessInput.focus();

            // Reset sort to newest first for new games
            this.sortByCloseness = false;
            this.sortToggle.textContent = 'Sort by Closeness';
            this.historyTitle.textContent =
                'Guess History (Newest First)';

        } catch (error) {
            this.showMessage('Error starting game: ' +
                error.message, 'error');
        }
    }

    async submitGuess() {
        const guess = this.guessInput.value.trim();

        if (!guess) {
            this.showMessage('Please enter a guess', 'error');
            return;
        }

        if (!this.gameId) {
            this.showMessage('Please start a new game first',
                'error');
            return;
        }

        try {
            const response = await fetch(
                `/api/game/${this.gameId}/guess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ guess })
            });

            const data = await response.json();

            this.currentGuesses = data.guesses;

            // Store target word when game is complete
            if (data.correct && data.targetWord) {
                this.targetWord = data.targetWord;
            }

            if (data.correct) {
                this.showMessage(data.message, 'success');
                this.clearHint();
                this.submitBtn.disabled = true;
                this.guessInput.disabled = true;
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
            this.showMessage('Error submitting guess: ' +
                error.message, 'error');
        }
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

    updateGuessList(guesses) {
        this.guessList.innerHTML = '';
        const sortedGuesses = this.getSortedGuesses(guesses);

        // Show a message if trying to sort by closeness
        // but game isn't complete
        if (this.sortByCloseness && !this.targetWord &&
            guesses.length > 0) {
            const messageEl = document.createElement('div');
            messageEl.className = 'sort-message';
            messageEl.textContent =
                'Complete the game to sort by closeness';
            this.guessList.appendChild(messageEl);
        }

        sortedGuesses.forEach(guess => {
            const guessElement = document.createElement('div');
            guessElement.className = 'guess-item' +
                (guess.isCorrect ? ' correct' : '');

            const time = new Date(guess.timestamp)
                .toLocaleTimeString();

            guessElement.innerHTML = `
                <div class="guess-word">${guess.word}</div>
                <div class="guess-time">${time}</div>
            `;

            this.guessList.appendChild(guessElement);
        });
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