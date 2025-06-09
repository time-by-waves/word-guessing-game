const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
require("dotenv").config();

const {
  redisClient,
  connectRedis,
  query,
  pingPg,
  pingRedis,
} = require("./db/config");
const Player = require("./models/player");
const Game = require("./models/game");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:3000",
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

// Connect to Redis
connectRedis();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Session configuration
// Create one session middleware instance
const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_TIMEOUT) || 86400000,
  },
});

// apply to Express
app.use(sessionMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", limiter);

// Health check endpoint
app.get("/health", async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
    checks: [],
  };
  let overallHealthy = true;

  try {
    // Check PostgreSQL
    const pgHealthy = await pingPg();
    healthcheck.checks.push({
      name: "PostgreSQL",
      status: pgHealthy ? "UP" : "DOWN",
    });
    if (!pgHealthy) {
      overallHealthy = false;
    }

    // Check Redis
    const redisHealthy = await pingRedis();
    healthcheck.checks.push({
      name: "Redis",
      status: redisHealthy ? "UP" : "DOWN",
    });
    if (!redisHealthy) {
      overallHealthy = false;
    }

    if (overallHealthy) {
      res.status(200).json(healthcheck);
    } else {
      healthcheck.message = "Service Unavailable";
      res.status(503).json(healthcheck);
    }
  } catch (error) {
    healthcheck.message = "Health check failed";
    logger.error("Health check error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Health check endpoint failed to execute.",
      error: error.message,
    });
  }
});

// Socket.IO session middleware
io.use((socket, next) => {
  // socket.request.res may be undefined; pass a dummy if so
  const res = socket.request.res || {};
  sessionMiddleware(socket.request, res, next);
});

// Game state storage
const games = new Map();
const playerSockets = new Map();

// Cache for the random-words module
let randomWordsModule = null;

// Generate a random word
async function getRandomWord(options = {}) {
  if (!randomWordsModule) {
    randomWordsModule = await import("random-words");
  }
  const { generate } = randomWordsModule;
  const defaultOptions = {
    exactly: 1,
    wordsPerString: 1,
    minLength: parseInt(process.env.MIN_WORD_LENGTH) || 4,
    maxLength: parseInt(process.env.MAX_WORD_LENGTH) || 8,
  };

  const wordOptions = { ...defaultOptions, ...options };
  const words = generate(wordOptions);
  return words[0];
}

// Player routes
app.post("/api/players/register", async (req, res) => {
  try {
    const { username, displayName, email, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const existingPlayer = await Player.findByUsername(username);
    if (existingPlayer) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const player = await Player.create({
      username,
      displayName,
      email,
      password,
    });
    req.session.playerId = player.id;

    res.json({
      message: "Registration successful",
      player: {
        id: player.id,
        username: player.username,
        displayName: player.display_name,
      },
    });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/players/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const player = await Player.authenticate(username, password);
    if (!player) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.playerId = player.id;
    res.json({
      message: "Login successful",
      player: {
        id: player.id,
        username: player.username,
        displayName: player.display_name,
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/players/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out successfully" });
});

app.get("/api/players/me", async (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const player = await Player.findById(req.session.playerId);
    const stats = await Player.getStats(req.session.playerId);
    const achievements = await Player.getAchievements(req.session.playerId);

    res.json({ player, stats, achievements });
  } catch (error) {
    logger.error("Get player error:", error);
    res.status(500).json({ error: "Failed to get player data" });
  }
});

app.get("/api/players/:playerId/stats", async (req, res) => {
  try {
    const stats = await Player.getStats(req.params.playerId);
    if (!stats) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json(stats);
  } catch (error) {
    logger.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to get player stats" });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await Player.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    logger.error("Get leaderboard error:", error);
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

// Game routes
app.post("/api/game/start", async (req, res) => {
  try {
    const { difficulty = "medium", maxPlayers = 4 } = req.body;
    const playerId = req.session.playerId;

    let lengthOptions;
    switch (difficulty) {
      case "easy":
        lengthOptions = { minLength: 3, maxLength: 5 };
        break;
      case "hard":
        lengthOptions = { minLength: 7, maxLength: 12 };
        break;
      default:
        lengthOptions = { minLength: 4, maxLength: 8 };
    }

    const targetWord = await getRandomWord(lengthOptions);

    // Create game in database
    const gameData = await Game.create({
      targetWord,
      difficulty,
      hostPlayerId: playerId,
      maxPlayers,
    });

    // Store game in memory for fast access
    games.set(gameData.id, {
      ...gameData,
      targetWord,
      guesses: [],
      players: playerId ? [playerId] : [],
      isComplete: false,
      startTime: new Date(),
    });

    res.json({
      gameId: gameData.id,
      roomCode: gameData.room_code,
      message: "New game started! Share the room code with friends.",
      difficulty,
      wordLength: targetWord.length,
      maxPlayers,
    });
  } catch (error) {
    logger.error("Start game error:", error);
    res.status(500).json({ error: "Failed to start game" });
  }
});

app.post("/api/game/join", async (req, res) => {
  try {
    const { roomCode } = req.body;
    const playerId = req.session.playerId;

    if (!roomCode) {
      return res.status(400).json({ error: "Room code is required" });
    }

    const gameData = await Game.findByRoomCode(roomCode.toUpperCase());
    if (!gameData) {
      return res.status(404).json({ error: "Game not found or already ended" });
    }

    const players = await Game.getPlayers(gameData.id);
    if (players.length >= gameData.max_players) {
      return res.status(400).json({ error: "Game is full" });
    }

    if (playerId && !players.find((p) => p.id === playerId)) {
      await Game.addPlayer(gameData.id, playerId);
    }

    // Load game into memory if not already there
    if (!games.has(gameData.id)) {
      games.set(gameData.id, {
        ...gameData,
        guesses: await Game.getGuesses(gameData.id),
        players: players.map((p) => p.id),
        isComplete: gameData.status === "ended",
        startTime: gameData.created_at,
      });
    }

    res.json({
      gameId: gameData.id,
      message: "Joined game successfully",
      players: players.length + 1,
      maxPlayers: gameData.max_players,
    });
  } catch (error) {
    logger.error("Join game error:", error);
    res.status(500).json({ error: "Failed to join game" });
  }
});

app.post("/api/game/:gameId/guess", async (req, res) => {
  const { gameId } = req.params;
  const { guess } = req.body;
  const playerId = req.session.playerId;

  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }

  if (game.isComplete) {
    return res.status(400).json({ error: "Game is already complete" });
  }

  // Validate guess
  const normalizedGuess = guess.toLowerCase().trim();
  if (!normalizedGuess.match(/^[a-z]+$/)) {
    return res.status(400).json({
      error: "Guesses must contain only letters (a-z)",
      guesses: game.guesses,
    });
  }

  const targetWord = game.targetWord;
  const isCorrect = normalizedGuess === targetWord;

  // Save guess to database
  if (playerId) {
    await Game.addGuess(gameId, playerId, normalizedGuess, isCorrect);
  }

  // Check if guess is correct
  if (isCorrect) {
    game.isComplete = true;
    await Game.updateStatus(gameId, "ended");

    // Update player stats
    if (playerId) {
      const stats = await Player.getStats(playerId);
      const gameTime = Math.floor(
        (Date.now() - new Date(game.startTime)) / 1000,
      );

      await Player.updateStats(playerId, {
        gamesPlayed: stats.games_played + 1,
        gamesWon: stats.games_won + 1,
        totalGuesses: stats.total_guesses + game.guesses.length + 1,
        correctGuesses: stats.correct_guesses + 1,
        bestTimeSeconds:
          !stats.best_time_seconds || gameTime < stats.best_time_seconds
            ? gameTime
            : stats.best_time_seconds,
      });

      // Check for achievements
      checkAndGrantAchievements(playerId, {
        firstWin: stats.games_won === 0,
        perfectGame:
          game.guesses.filter((g) => g.playerId === playerId).length === 0,
        speedDemon: gameTime < 30,
      });
    }

    game.guesses.unshift({
      word: normalizedGuess,
      isCorrect: true,
      timestamp: new Date(),
      playerId,
    });

    // Emit to all players in the game
    io.to(`game-${gameId}`).emit("gameWon", {
      winner: playerId,
      targetWord,
      totalGuesses: game.guesses.length,
    });

    return res.json({
      correct: true,
      targetWord,
      guesses: game.guesses,
      message: `Congratulations! You found the word: ${targetWord}`,
    });
  }

  // Add guess to history
  const newGuess = {
    word: normalizedGuess,
    isCorrect: false,
    timestamp: new Date(),
    playerId,
  };

  game.guesses.unshift(newGuess);

  // Update player stats for incorrect guess
  if (playerId) {
    const stats = await Player.getStats(playerId);
    await Player.updateStats(playerId, {
      ...stats,
      totalGuesses: stats.total_guesses + 1,
    });
  }

  // Provide hint
  let hint = "";
  if (normalizedGuess < targetWord) {
    hint = "The target word comes AFTER your guess alphabetically";
  } else {
    hint = "The target word comes BEFORE your guess alphabetically";
  }

  // Emit guess to other players
  io.to(`game-${gameId}`).emit("newGuess", {
    guess: newGuess,
    playerId,
  });

  res.json({
    correct: false,
    guesses: game.guesses,
    hint,
    message: `"${normalizedGuess}" is not the target word.`,
  });
});

app.get("/api/game/:gameId/status", async (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    // Try to load from database
    const gameData = await Game.findById(gameId);
    if (!gameData) {
      return res.status(404).json({ error: "Game not found" });
    }

    const players = await Game.getPlayers(gameId);
    const guesses = await Game.getGuesses(gameId);

    return res.json({
      guesses,
      players,
      isComplete: gameData.status === "ended",
      targetWord:
        gameData.status === "ended" ? gameData.target_word : undefined,
    });
  }

  res.json({
    guesses: game.guesses,
    players: await Game.getPlayers(gameId),
    isComplete: game.isComplete,
    targetWord: game.isComplete ? game.targetWord : undefined,
  });
});

app.get("/api/games/active", async (req, res) => {
  try {
    const games = await Game.getActiveGames();
    res.json(games);
  } catch (error) {
    logger.error("Get active games error:", error);
    res.status(500).json({ error: "Failed to get active games" });
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  logger.info("New socket connection:", socket.id);

  const playerId = socket.request.session?.playerId;
  if (playerId) {
    playerSockets.set(playerId, socket.id);
    socket.playerId = playerId;
  }

  socket.on("joinGame", (gameId) => {
    socket.join(`game-${gameId}`);
    socket.gameId = gameId;

    // Notify other players
    socket.to(`game-${gameId}`).emit("playerJoined", {
      playerId: socket.playerId,
      totalPlayers: io.sockets.adapter.rooms.get(`game-${gameId}`)?.size || 0,
    });
  });

  socket.on("leaveGame", (gameId) => {
    socket.leave(`game-${gameId}`);

    // Notify other players
    socket.to(`game-${gameId}`).emit("playerLeft", {
      playerId: socket.playerId,
      totalPlayers: io.sockets.adapter.rooms.get(`game-${gameId}`)?.size || 0,
    });
  });

  socket.on("disconnect", () => {
    logger.info("Socket disconnected:", socket.id);

    if (socket.playerId) {
      playerSockets.delete(socket.playerId);
    }

    if (socket.gameId) {
      socket.to(`game-${socket.gameId}`).emit("playerLeft", {
        playerId: socket.playerId,
        totalPlayers:
          io.sockets.adapter.rooms.get(`game-${socket.gameId}`)?.size || 0,
      });
    }
  });
});

// Achievement checking function
async function checkAndGrantAchievements(playerId, conditions) {
  const achievementMap = {
    firstWin: "First Win",
    speedDemon: "Speed Demon",
    perfectGame: "Perfect Game",
  };

  for (const [condition, achievementName] of Object.entries(achievementMap)) {
    if (conditions[condition]) {
      const achievements = await Player.getAchievements(playerId);
      const achievement = achievements.find((a) => a.name === achievementName);

      if (!achievement) {
        // Grant achievement
        const allAchievements = await query(
          "SELECT id FROM achievements WHERE name = $1",
          [achievementName],
        );

        if (allAchievements.rows.length > 0) {
          await Player.grantAchievement(playerId, allAchievements.rows[0].id);

          // Notify player
          const socketId = playerSockets.get(playerId);
          if (socketId) {
            io.to(socketId).emit("achievementUnlocked", {
              name: achievementName,
              description: `You've unlocked the "${achievementName}" achievement!`,
            });
          }
        }
      }
    }
  }
}

// Cleanup old games periodically
setInterval(
  async () => {
    try {
      const endedGames = await Game.cleanupOldGames();
      for (const gameId of endedGames) {
        games.delete(gameId);
        io.to(`game-${gameId}`).emit("gameTimeout", {
          message: "Game has timed out due to inactivity",
        });
      }
    } catch (error) {
      logger.error("Game cleanup error:", error);
    }
  },
  5 * 60 * 1000,
); // Every 5 minutes

// Error handling middleware
app.use((err, req, res, _next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
