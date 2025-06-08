const { query } = require("../db/config");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

class Player {
  static async create({ username, displayName, email, password }) {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const result = await query(
      `INSERT INTO players (id, username, display_name, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, display_name, email, created_at`,
      [uuidv4(), username, displayName || username, email, hashedPassword],
    );

    // Initialize player stats
    await query(`INSERT INTO player_stats (player_id) VALUES ($1)`, [
      result.rows[0].id,
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT id, username, display_name, email, created_at, last_active
       FROM players WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  }

  static async findByUsername(username) {
    const result = await query(
      `SELECT id, username, display_name, email, password_hash, created_at, last_active
       FROM players WHERE username = $1`,
      [username],
    );
    return result.rows[0];
  }

  static async updateLastActive(id) {
    await query(
      `UPDATE players SET last_active = CURRENT_TIMESTAMP WHERE id = $1`,
      [id],
    );
  }

  static async authenticate(username, password) {
    const player = await this.findByUsername(username);
    if (!player || !player.password_hash) {
      return null;
    }

    const isValid = await bcrypt.compare(password, player.password_hash);
    if (!isValid) {
      return null;
    }

    // Remove password hash before returning
    delete player.password_hash;
    await this.updateLastActive(player.id);

    return player;
  }

  static async getStats(playerId) {
    const result = await query(
      `SELECT * FROM player_stats WHERE player_id = $1`,
      [playerId],
    );
    return result.rows[0];
  }

  static async updateStats(playerId, stats) {
    const {
      gamesPlayed,
      gamesWon,
      totalGuesses,
      correctGuesses,
      bestTimeSeconds,
    } = stats;

    const avgGuessesPerGame =
      gamesPlayed > 0 ? (totalGuesses / gamesPlayed).toFixed(2) : 0;

    await query(
      `UPDATE player_stats
       SET games_played = $2,
           games_won = $3,
           total_guesses = $4,
           correct_guesses = $5,
           average_guesses_per_game = $6,
           best_time_seconds = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE player_id = $1`,
      [
        playerId,
        gamesPlayed,
        gamesWon,
        totalGuesses,
        correctGuesses,
        avgGuessesPerGame,
        bestTimeSeconds,
      ],
    );
  }

  static async getAchievements(playerId) {
    const result = await query(
      `SELECT a.id, a.name, a.description, a.icon, a.points, pa.earned_at
       FROM achievements a
       JOIN player_achievements pa ON a.id = pa.achievement_id
       WHERE pa.player_id = $1
       ORDER BY pa.earned_at DESC`,
      [playerId],
    );
    return result.rows;
  }

  static async grantAchievement(playerId, achievementId) {
    try {
      await query(
        `INSERT INTO player_achievements (player_id, achievement_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [playerId, achievementId],
      );
      return true;
    } catch (error) {
      console.error("Error granting achievement:", error);
      return false;
    }
  }

  static async getLeaderboard(limit = 10) {
    const result = await query(`SELECT * FROM leaderboard LIMIT $1`, [limit]);
    return result.rows;
  }

  static async searchPlayers(searchTerm, limit = 10) {
    const result = await query(
      `SELECT id, username, display_name
       FROM players
       WHERE username ILIKE $1 OR display_name ILIKE $1
       ORDER BY last_active DESC
       LIMIT $2`,
      [`%${searchTerm}%`, limit],
    );
    return result.rows;
  }
}

module.exports = Player;
