const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fetch = require('node-fetch'); // Import node-fetch for API calls

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Game state storage
const games = new Map();

// Generate a random word using the API
async function getRandomWord() {
  try {
    const response = await fetch(
      'https://random-words-api.vercel.app/word'
    );
    const data = await response.json();

    // Extract the word from the response and convert to lowercase
    const word = data.word.toLowerCase();
    return word;
  } catch (error) {
    console.error('Error fetching random word:', error.message);
    // Fallback words in case the API fails
    const fallbackWords = [
      'abandon', 'ability', 'absence', 'academy', 'account',
      'achieve', 'acquire', 'address', 'advance', 'adventure',
      'balance', 'battery', 'bedroom', 'benefit', 'bicycle',
      'cabinet', 'capture', 'careful', 'center', 'century',
      'dancing', 'daughter', 'deliver', 'desktop', 'develop',
      'eastern', 'economy', 'education', 'element', 'evening',
      'factory', 'failure', 'fashion', 'feature', 'finance',
      'gallery', 'garbage', 'general', 'gesture', 'glitter',
      'habitat', 'harvest', 'healthy', 'history', 'holiday',
      'imagine', 'improve', 'include', 'initial', 'instead',
      'jacket', 'journey', 'justice', 'kitchen', 'knowledge',
      'language', 'library', 'machine', 'maximum', 'message',
      'natural', 'network', 'nothing', 'nuclear', 'observe',
      'package', 'parking', 'pattern', 'picture', 'plastic',
      'quality', 'quarter', 'question', 'quickly', 'railway',
      'realize', 'receive', 'recover', 'release', 'replace',
      'science', 'scratch', 'section', 'service', 'session',
      'teacher', 'theatre', 'therapy', 'thought', 'tonight',
      'uniform', 'unknown', 'unusual', 'upgrade', 'utility',
      'vacation', 'vehicle', 'village', 'vitamin', 'warning',
      'weather', 'website', 'welcome', 'whisper', 'written'
    ];
    return fallbackWords[
      Math.floor(Math.random() * fallbackWords.length)
    ];
  }
}

// Start a new game
app.post('/api/game/start', async (req, res) => {
  try {
    const gameId = Date.now().toString();
    const targetWord = await getRandomWord();

    games.set(gameId, {
      targetWord: targetWord,
      guesses: [],
      isComplete: false,
      startTime: new Date()
    });

    res.json({
      gameId: gameId,
      message: 'New game started! Start guessing words.'
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