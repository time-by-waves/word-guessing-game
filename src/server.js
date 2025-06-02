const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Game state storage
const games = new Map();

// Generate a random word
async function getRandomWord(options = {}) {
  const { generate } = await import('random-words');
  const defaultOptions = {
    exactly: 1,
    wordsPerString: 1,
    minLength: 4,
    maxLength: 8
  };

  const wordOptions = { ...defaultOptions, ...options };
  const words = generate(wordOptions);
  return words[0];
}

// Get word count for difficulty info
async function getWordCount(minLength, maxLength) {
  const { count } = await import('random-words');
  return count({ min: minLength, max: maxLength });
}

// Start a new game
app.post('/api/game/start', async (req, res) => {
  try {
    const gameId = Date.now().toString();
    const { difficulty = 'medium' } = req.body;

    let lengthOptions;
    switch (difficulty) {
      case 'easy':
        lengthOptions = { minLength: 3, maxLength: 5 };
        break;
      case 'hard':
        lengthOptions = { minLength: 7, maxLength: 12 };
        break;
      default:
        lengthOptions = { minLength: 4, maxLength: 8 };
    }

    const targetWord = await getRandomWord(lengthOptions);
    const availableWords = await getWordCount(
      lengthOptions.minLength,
      lengthOptions.maxLength
    );

    games.set(gameId, {
      targetWord: targetWord,
      guesses: [],
      isComplete: false,
      startTime: new Date(),
      difficulty: difficulty
    });

    res.json({
      gameId: gameId,
      message: 'New game started! Start guessing words.',
      difficulty: difficulty,
      wordLength: targetWord.length,
      availableWords: availableWords
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start game',
      details: error.message
    });
  }
});

// Make a guess
app.post('/api/game/:gameId/guess', (req, res) => {
  const { gameId } = req.params;
  const { guess } = req.body;

  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({
      error: 'Game not found'
    });
  }

  if (game.isComplete) {
    return res.status(400).json({
      error: 'Game is already complete'
    });
  }

  // Validate that the guess only contains letters
  const normalizedGuess = guess.toLowerCase().trim();
  if (!normalizedGuess.match(/^[a-z]+$/)) {
    return res.status(400).json({
      error: 'Guesses must contain only letters (a-z)',
      guesses: game.guesses
    });
  }

  const targetWord = game.targetWord;

  // Check if guess is correct
  if (normalizedGuess === targetWord) {
    game.isComplete = true;
    game.guesses.unshift({
      word: normalizedGuess,
      isCorrect: true,
      timestamp: new Date()
    });

    return res.json({
      correct: true,
      targetWord: targetWord,
      guesses: game.guesses,
      message: `Congratulations! You found the word: ${targetWord}`
    });
  }

  // Add guess to history, newest first
  const newGuess = {
    word: normalizedGuess,
    isCorrect: false,
    timestamp: new Date()
  };

  // Add new guess to the beginning of the array
  game.guesses.unshift(newGuess);

  // Provide hint about direction
  let hint = '';
  if (normalizedGuess < targetWord) {
    hint = 'The target word comes AFTER your guess alphabetically';
  } else {
    hint = 'The target word comes BEFORE your guess alphabetically';
  }

  res.json({
    correct: false,
    guesses: game.guesses,
    hint: hint,
    message: `"${normalizedGuess}" is not the target word.`,
    targetWord: targetWord // Add for client-side sorting
  });
});

// Get game status
app.get('/api/game/:gameId/status', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({
      error: 'Game not found'
    });
  }

  res.json({
    guesses: game.guesses,
    isComplete: game.isComplete,
    targetWord: game.isComplete ? game.targetWord : undefined
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});