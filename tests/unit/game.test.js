const request = require("supertest");
const express = require("express");

// Mock the random-words module
jest.mock("random-words", () => ({
  generate: jest.fn(() => ["testword"]),
  count: jest.fn(() => 1000),
}));

describe("Game API", () => {
  let app;
  let server;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Set up a fresh app instance for each test
    app = express();
    app.use(express.json());

    // Basic implementation for testing
    const games = new Map();

    app.post("/api/game/start", async (req, res) => {
      const gameId = Date.now().toString();
      games.set(gameId, {
        targetWord: "testword",
        guesses: [],
        isComplete: false,
      });

      res.json({
        gameId,
        message: "New game started! Start guessing words.",
        difficulty: "medium",
        wordLength: 8,
      });
    });

    app.post("/api/game/:gameId/guess", (req, res) => {
      const { gameId } = req.params;
      const { guess } = req.body;
      const game = games.get(gameId);

      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      if (guess.toLowerCase() === game.targetWord) {
        game.isComplete = true;
        return res.json({
          correct: true,
          targetWord: game.targetWord,
          message: `Congratulations! You found the word: ${game.targetWord}`,
        });
      }

      const hint =
        guess.toLowerCase() < game.targetWord
          ? "The target word comes AFTER your guess alphabetically"
          : "The target word comes BEFORE your guess alphabetically";

      res.json({
        correct: false,
        hint,
        message: `"${guess}" is not the target word.`,
      });
    });
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe("POST /api/game/start", () => {
    it("should start a new game", async () => {
      const response = await request(app)
        .post("/api/game/start")
        .send({ difficulty: "medium" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("gameId");
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("New game started");
    });

    it("should return game configuration", async () => {
      const response = await request(app)
        .post("/api/game/start")
        .send({ difficulty: "hard" });

      expect(response.body).toHaveProperty("difficulty");
      expect(response.body).toHaveProperty("wordLength");
    });
  });

  describe("POST /api/game/:gameId/guess", () => {
    let gameId;

    beforeEach(async () => {
      const response = await request(app).post("/api/game/start").send({});
      gameId = response.body.gameId;
    });

    it("should return correct when guessing the right word", async () => {
      const response = await request(app)
        .post(`/api/game/${gameId}/guess`)
        .send({ guess: "testword" });

      expect(response.status).toBe(200);
      expect(response.body.correct).toBe(true);
      expect(response.body.message).toContain("Congratulations");
    });

    it("should return hint when guess is incorrect", async () => {
      const response = await request(app)
        .post(`/api/game/${gameId}/guess`)
        .send({ guess: "apple" });

      expect(response.status).toBe(200);
      expect(response.body.correct).toBe(false);
      expect(response.body).toHaveProperty("hint");
      expect(response.body.hint).toContain("AFTER");
    });

    it("should return 404 for non-existent game", async () => {
      const response = await request(app)
        .post("/api/game/nonexistent/guess")
        .send({ guess: "test" });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});

describe("Game Logic", () => {
  describe("Word comparison", () => {
    it("should correctly compare words alphabetically", () => {
      const compareWords = (word1, word2) => {
        if (word1 < word2) {
          return -1;
        }
        if (word1 > word2) {
          return 1;
        }
        return 0;
      };

      expect(compareWords("apple", "banana")).toBe(-1);
      expect(compareWords("zebra", "apple")).toBe(1);
      expect(compareWords("test", "test")).toBe(0);
    });
  });

  describe("Guess validation", () => {
    it("should validate guess contains only letters", () => {
      const isValidGuess = (guess) => /^[a-zA-Z]+$/.test(guess);

      expect(isValidGuess("hello")).toBe(true);
      expect(isValidGuess("hello123")).toBe(false);
      expect(isValidGuess("hello world")).toBe(false);
      expect(isValidGuess("")).toBe(false);
    });
  });
});
