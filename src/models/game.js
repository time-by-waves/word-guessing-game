const { query, transaction } = require("../db/config");
const { v4: uuidv4 } = require("uuid");

class Game {
  static generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static async create({
    targetWord,
    difficulty,
    hostPlayerId,
    maxPlayers = 4,
  }) {
    const gameId = uuidv4();
    const roomCode = this.generateRoomCode();

    return await transaction(async (client) => {
      // Create the game
      const gameResult = await client.query(
        `INSERT INTO games (id, room_code, target_word, difficulty, max_players)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [gameId, roomCode, targetWord, difficulty, maxPlayers],
      );

      // Add the host as the first player
      if (hostPlayerId) {
        await client.query(
          `INSERT INTO game_players (game_id, player_id, is_host)
           VALUES ($1, $2, true)`,
          [gameId, hostPlayerId],
        );
      }

      return gameResult.rows[0];
    });
  }

  static async findById(id) {
    const result = await query(`SELECT * FROM games WHERE id = $1`, [id]);
    return result.rows[0];
  }

  static async findByRoomCode(roomCode) {
    const result = await query(
      `SELECT * FROM games WHERE room_code = $1 AND status != 'ended'`,
      [roomCode],
    );
    return result.rows[0];
  }

  static async addPlayer(gameId, playerId) {
    try {
      await query(
        `INSERT INTO game_players (game_id, player_id)
         VALUES ($1, $2)`,
        [gameId, playerId],
      );
      return true;
    } catch (error) {
      console.error("Error adding player to game:", error);
      return false;
    }
  }

  static async removePlayer(gameId, playerId) {
    await query(
      `DELETE FROM game_players WHERE game_id = $1 AND player_id = $2`,
      [gameId, playerId],
    );
  }

  static async getPlayers(gameId) {
    const result = await query(
      `SELECT p.id, p.username, p.display_name, gp.score, gp.is_host, gp.is_winner
       FROM players p
       JOIN game_players gp ON p.id = gp.player_id
       WHERE gp.game_id = $1
       ORDER BY gp.joined_at`,
      [gameId],
    );
    return result.rows;
  }

  static async addGuess(gameId, playerId, word, isCorrect) {
    const result = await query(
      `INSERT INTO guesses (game_id, player_id, word, is_correct)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [gameId, playerId, word.toLowerCase(), isCorrect],
    );

    // Update player score if correct
    if (isCorrect) {
      await query(
        `UPDATE game_players
         SET score = score + 100, is_winner = true
         WHERE game_id = $1 AND player_id = $2`,
        [gameId, playerId],
      );
    }

    return result.rows[0];
  }

  static async getGuesses(gameId, playerId = null) {
    let queryText = `
      SELECT g.*, p.username, p.display_name
      FROM guesses g
      JOIN players p ON g.player_id = p.id
      WHERE g.game_id = $1
    `;
    const params = [gameId];

    if (playerId) {
      queryText += " AND g.player_id = $2";
      params.push(playerId);
    }

    queryText += " ORDER BY g.guessed_at DESC";

    const result = await query(queryText, params);
    return result.rows;
  }

  static async updateStatus(gameId, status) {
    const updateFields = { status };

    if (status === "active") {
      updateFields.started_at = "CURRENT_TIMESTAMP";
    } else if (status === "ended") {
      updateFields.ended_at = "CURRENT_TIMESTAMP";
    }

    const setClause = Object.entries(updateFields)
      .map(
        ([key, value]) =>
          `${key} = ${value === "CURRENT_TIMESTAMP" ? value : "$2"}`,
      )
      .join(", ");

    await query(
      `UPDATE games SET ${setClause} WHERE id = $1`,
      status === "CURRENT_TIMESTAMP" ? [gameId] : [gameId, status],
    );
  }

  static async getActiveGames(limit = 10) {
    const result = await query(
      `SELECT g.*, COUNT(gp.player_id) as player_count
       FROM games g
       LEFT JOIN game_players gp ON g.id = gp.game_id
       WHERE g.status IN ('waiting', 'active')
       GROUP BY g.id
       ORDER BY g.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  static async cleanupOldGames() {
    const timeout = process.env.GAME_TIMEOUT_MINUTES || 30;

    const result = await query(
      `UPDATE games
       SET status = 'ended', ended_at = CURRENT_TIMESTAMP
       WHERE status != 'ended'
       AND created_at < CURRENT_TIMESTAMP - INTERVAL '${timeout} minutes'
       RETURNING id`,
    );

    return result.rows.map((row) => row.id);
  }

  static async getGameStats(gameId) {
    const game = await this.findById(gameId);
    const players = await this.getPlayers(gameId);
    const guesses = await this.getGuesses(gameId);

    const duration =
      game.ended_at && game.started_at
        ? Math.floor(
            (new Date(game.ended_at) - new Date(game.started_at)) / 1000,
          )
        : null;

    return {
      game,
      players,
      totalGuesses: guesses.length,
      winner: players.find((p) => p.is_winner),
      duration,
      averageGuessesPerPlayer:
        players.length > 0 ? (guesses.length / players.length).toFixed(1) : 0,
    };
  }
}

module.exports = Game;
