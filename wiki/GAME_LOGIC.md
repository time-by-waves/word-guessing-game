# Word Guessing Game - Game Logic Documentation

## Table of Contents

1. [Overview](#overview)
2. [Game Architecture](#game-architecture)
3. [Game Flow](#game-flow)
4. [Player System](#player-system)
5. [Game Mechanics](#game-mechanics)
6. [Multiplayer Features](#multiplayer-features)
7. [Scoring and Statistics](#scoring-and-statistics)
8. [Achievement System](#achievement-system)
9. [Data Models](#data-models)
10. [API Endpoints](#api-endpoints)
11. [Socket.IO Events](#socketio-events)
12. [Game States](#game-states)
13. [Security and Validation](#security-and-validation)

---

## Overview

The Word Guessing Game is a **real-time multiplayer word guessing
game** where players compete to guess a randomly generated target
word. The game uses **alphabetical comparison** to provide hints to
players, telling them whether the target word comes before or after
their guess in alphabetical order.

### Key Features

- **Real-time multiplayer gameplay** using Socket.IO
- **Player authentication** with login, registration, and guest mode
- **Three difficulty levels**: Easy (3-5 letters), Medium (4-8
  letters), Hard (7-12 letters)
- **Room-based games** with unique 6-character room codes
- **Persistent player statistics** and achievements
- **Leaderboard system** tracking wins, win rates, and achievements
- **Database persistence** using PostgreSQL with Redis caching

---

## Game Architecture

### Technology Stack

- **Backend**: Node.js with Express.js
- **Real-time Communication**: Socket.IO
- **Database**: PostgreSQL (persistent storage)
- **Cache**: Redis (session storage and fast data access)
- **Frontend**: Vanilla JavaScript with ES6 modules

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   HTML/CSS   │  │ JavaScript   │  │ Socket.IO    │     │
│  │     UI       │  │    Client    │  │   Client     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                    HTTP/WebSocket
                           │
┌─────────────────────────────────────────────────────────────┐
│                    Server (Node.js/Express)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  REST API    │  │  Socket.IO   │  │   Session    │     │
│  │  Endpoints   │  │    Server    │  │  Middleware  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                           │                                  │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Game Model   │  │Player Model  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
    ┌─────────────────┐      ┌─────────────────┐
    │   PostgreSQL    │      │      Redis      │
    │   (Database)    │      │     (Cache)     │
    └─────────────────┘      └─────────────────┘
```

### Memory Management

The server maintains two types of game storage:

1. **In-Memory Storage** (Map objects)

   - Active games stored in `games` Map
   - Player socket connections in `playerSockets` Map
   - Fast access for real-time gameplay
   - Cleared when games end or timeout

2. **Persistent Storage** (PostgreSQL)
   - All games, players, guesses, and stats
   - Survives server restarts
   - Used for historical data and statistics

---

## Game Flow

### 1. Authentication Phase

Players can access the game in three ways:

#### A. Login (Returning Players)

```
User enters credentials
    ↓
Server validates against database (bcrypt password check)
    ↓
Session created with player ID
    ↓
Player stats and achievements loaded
    ↓
Game menu displayed
```

#### B. Registration (New Players)

```
User provides username, display name, email, password
    ↓
Password hashed with bcrypt (10 rounds)
    ↓
Player record created in database
    ↓
Player stats record initialized (all zeros)
    ↓
Session created with player ID
    ↓
Game menu displayed
```

#### C. Guest Mode

```
User chooses guest mode
    ↓
No database record created
    ↓
Session created without player ID
    ↓
Game menu displayed (stats not saved)
```

### 2. Game Creation

```
Player selects difficulty level
    ↓
Server generates random word based on difficulty:
  - Easy: 3-5 letters
  - Medium: 4-8 letters
  - Hard: 7-12 letters
    ↓
Server generates unique 6-character room code (A-Z, 0-9)
    ↓
Game record created in database with:
  - Unique game ID (UUID)
  - Room code
  - Target word (stored encrypted)
  - Difficulty
  - Status: 'waiting'
  - Max players: 4 (default)
    ↓
Game stored in memory for fast access
    ↓
Creator added as first player and host
    ↓
Room code displayed to creator
```

### 3. Game Joining

```
Player enters 6-character room code
    ↓
Server looks up game by room code
    ↓
Validation checks:
  - Game exists?
  - Game status is 'waiting' or 'active'?
  - Player count < max players?
    ↓
Player added to game_players table
    ↓
Socket.IO: Player joins game room channel
    ↓
Other players notified of new player
    ↓
Player receives current game state:
  - Current player count
  - Guess history
  - Word length hint
```

### 4. Gameplay Loop

```
┌─────────────────────────────────────────┐
│  Player enters guess                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Client: Validate input (letters only)   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Send guess to server via HTTP POST      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Server: Normalize guess (lowercase)     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Compare guess === targetWord ?          │
└─────────────────────────────────────────┘
          ↓           ↓
      YES ✓         NO ✗
          ↓           ↓
┌──────────────┐  ┌──────────────────────┐
│ Game Won!    │  │ Provide Hint:        │
│              │  │ - Guess < target:    │
│ Actions:     │  │   "Word comes AFTER" │
│ - Save guess │  │ - Guess > target:    │
│ - End game   │  │   "Word comes BEFORE"│
│ - Update     │  │                      │
│   stats      │  │ Actions:             │
│ - Check      │  │ - Save guess         │
│   achievements│ │ - Update stats       │
│ - Notify all │  │ - Emit to all        │
│   players    │  │   players            │
└──────────────┘  └──────────────────────┘
          ↓           ↓
    Game Ends    Loop continues
```

### 5. Game Completion

```
Correct guess submitted
    ↓
Game status updated to 'ended'
    ↓
Winner marked in game_players table
    ↓
Winner's stats updated:
  - games_played++
  - games_won++
  - total_guesses += (guess count)
  - correct_guesses++
  - best_time_seconds (if new record)
    ↓
Achievement checks:
  - First Win (first time winning)
  - Perfect Game (guessed on first try)
  - Speed Demon (< 30 seconds)
    ↓
Socket.IO broadcasts 'gameWon' event
    ↓
All players see winner and target word
    ↓
Game removed from active memory (after timeout)
```

---

## Player System

### Player Registration

**Endpoint**: `POST /api/players/register`

**Required Fields**:

- `username`: Unique identifier (3-50 characters)
- `password`: Minimum 6 characters

**Optional Fields**:

- `displayName`: Shown to other players (defaults to username)
- `email`: For account recovery

**Process**:

1. Validate username uniqueness
2. Hash password using bcrypt (10 salt rounds)
3. Create player record with UUID
4. Initialize player_stats record
5. Create session with player ID
6. Return player object (without password)

### Player Authentication

**Endpoint**: `POST /api/players/login`

**Process**:

1. Look up player by username
2. Compare provided password with stored hash using bcrypt
3. If valid, create session with player ID
4. Update last_active timestamp
5. Return player object with display name

### Session Management

- **Storage**: Redis (fast, ephemeral)
- **Duration**: 24 hours (86400000 ms) by default
- **Cookie**: HTTPOnly, Secure (in production)
- **Data Stored**: Player ID only
- **Logout**: `POST /api/players/logout` destroys session

### Guest Players

- No database record
- No session player ID
- Can play games but:
  - Stats not tracked
  - Achievements not earned
  - Can't appear in leaderboard
  - Progress lost on page refresh

---

## Game Mechanics

### Word Generation

**Library**: `random-words` (npm package)

**Process**:

```javascript
const wordOptions = {
  exactly: 1, // Generate 1 word
  wordsPerString: 1, // Single word (not compound)
  minLength: 4, // Based on difficulty
  maxLength: 8, // Based on difficulty
};
```

**Difficulty Settings**:

- **Easy**: 3-5 letter words (e.g., "cat", "dog", "house")
- **Medium**: 4-8 letter words (e.g., "computer", "elephant")
- **Hard**: 7-12 letter words (e.g., "magnificent", "extraordinary")

### Guess Validation

**Client-Side**:

- Only letters (a-z, A-Z) allowed
- Empty guesses rejected
- Max length: 20 characters

**Server-Side**:

```javascript
// Normalize guess
const normalizedGuess = guess.toLowerCase().trim();

// Validate format
if (!normalizedGuess.match(/^[a-z]+$/)) {
  return error('Guesses must contain only letters');
}

// Check game state
if (game.isComplete) {
  return error('Game is already complete');
}
```

### Hint System

The game uses **lexicographic (alphabetical) comparison**:

```javascript
if (normalizedGuess < targetWord) {
  hint = 'The target word comes AFTER your guess alphabetically';
} else {
  hint = 'The target word comes BEFORE your guess alphabetically';
}
```

**Examples**:

- Target: "elephant"
- Guess: "apple" → "Target comes AFTER" (e > a)
- Guess: "zebra" → "Target comes BEFORE" (e < z)
- Guess: "elephant" → "Correct!"

**Important Notes**:

- Comparison is case-insensitive
- Uses JavaScript string comparison (Unicode order)
- All lowercase after normalization
- Single character words work the same way

### Game Timeout

**Configuration**: `GAME_TIMEOUT_MINUTES` (default: 30)

**Process**:

```javascript
// Runs every 5 minutes
setInterval(
  async () => {
    // Find games older than timeout
    const oldGames = await Game.cleanupOldGames();

    // For each old game:
    // 1. Update status to 'ended'
    // 2. Remove from memory
    // 3. Notify connected players
  },
  5 * 60 * 1000
);
```

---

## Multiplayer Features

### Room System

**Room Code**:

- 6 characters long
- Alphanumeric (A-Z, 0-9)
- Randomly generated
- Must be unique across active games

**Example**: `A7X2M9`, `WORD42`, `PLAY01`

### Player Capacity

- **Default**: 4 players per game
- **Configurable**: Set via `maxPlayers` parameter
- **Host**: First player who creates the game
- **Joining**: Players join via room code until capacity reached

### Socket.IO Rooms

Each game has a dedicated Socket.IO room:

```javascript
// Room naming convention
const roomName = `game-${gameId}`;

// Player joins room
socket.join(roomName);

// Broadcast to room
io.to(roomName).emit('eventName', data);
```

### Real-Time Events

#### Player Joined

```javascript
socket.to(`game-${gameId}`).emit('playerJoined', {
  playerId: newPlayer.id,
  totalPlayers: currentPlayerCount,
});
```

#### New Guess

```javascript
io.to(`game-${gameId}`).emit('newGuess', {
  guess: {
    word: normalizedGuess,
    isCorrect: false,
    timestamp: new Date(),
    playerId: playerId,
  },
  playerId: playerId,
});
```

#### Game Won

```javascript
io.to(`game-${gameId}`).emit('gameWon', {
  winner: winnerId,
  targetWord: game.targetWord,
  totalGuesses: game.guesses.length,
});
```

#### Player Left

```javascript
socket.to(`game-${gameId}`).emit('playerLeft', {
  playerId: leavingPlayer.id,
  totalPlayers: remainingPlayerCount,
});
```

#### Game Timeout

```javascript
io.to(`game-${gameId}`).emit('gameTimeout', {
  message: 'Game has timed out due to inactivity',
});
```

### Connection Management

**Player-Socket Mapping**:

```javascript
// Map player ID to socket ID
playerSockets.set(playerId, socket.id);

// Retrieve socket for player
const socketId = playerSockets.get(playerId);
```

**Disconnect Handling**:

1. Remove player from socket map
2. Notify other players in game room
3. Keep game data (players can rejoin)
4. Game ends on timeout, not disconnection

---

## Scoring and Statistics

### Player Statistics

**Tracked Metrics**:

| Metric                     | Description                      | Type    |
| -------------------------- | -------------------------------- | ------- |
| `games_played`             | Total games participated in      | Integer |
| `games_won`                | Total games won                  | Integer |
| `total_guesses`            | All guesses across all games     | Integer |
| `correct_guesses`          | Number of correct guesses (wins) | Integer |
| `average_guesses_per_game` | Avg guesses to win               | Decimal |
| `best_time_seconds`        | Fastest game completion          | Integer |

### Score Calculation

**Per Game**:

- Correct guess: +100 points (stored in `game_players.score`)
- Incorrect guesses: No points

**Stats Update on Win**:

```javascript
const stats = await Player.getStats(playerId);
const gameTime = Math.floor((Date.now() - game.startTime) / 1000);

await Player.updateStats(playerId, {
  gamesPlayed: stats.games_played + 1,
  gamesWon: stats.games_won + 1,
  totalGuesses: stats.total_guesses + game.guesses.length + 1,
  correctGuesses: stats.correct_guesses + 1,
  bestTimeSeconds: Math.min(
    gameTime,
    stats.best_time_seconds || Infinity
  ),
});
```

### Leaderboard

**Database View**: `leaderboard`

**Calculated Fields**:

```sql
SELECT
  p.display_name,
  p.username,
  ps.games_won,
  ps.games_played,
  ROUND((ps.games_won::numeric / ps.games_played) * 100, 2) as win_rate,
  ps.average_guesses_per_game,
  ps.best_time_seconds,
  COUNT(pa.achievement_id) as achievements_count,
  SUM(a.points) as total_points
FROM players p
JOIN player_stats ps ON p.id = ps.player_id
LEFT JOIN player_achievements pa ON p.id = pa.player_id
LEFT JOIN achievements a ON pa.achievement_id = a.id
GROUP BY p.id, ps.*
ORDER BY ps.games_won DESC, win_rate DESC
```

**Sorting**:

1. Primary: Games won (descending)
2. Secondary: Win rate (descending)
3. Tertiary: Total achievement points (descending)

**API Endpoint**: `GET /api/leaderboard?limit=10`

---

## Achievement System

### Available Achievements

| Achievement      | Description                    | Icon | Points | Condition                           |
| ---------------- | ------------------------------ | ---- | ------ | ----------------------------------- |
| First Win        | Win your first game            | 🏆   | 10     | `games_won === 1`                   |
| Speed Demon      | Guess word in under 30 seconds | ⚡   | 20     | `gameTime < 30`                     |
| Perfect Game     | Guess word on first try        | 🎯   | 50     | `guesses.length === 0` (before win) |
| Winning Streak   | Win 5 games in a row           | 🔥   | 30     | Track consecutive wins              |
| Word Master      | Win 100 games total            | 👑   | 100    | `games_won === 100`                 |
| Social Butterfly | Play with 10 different players | 🦋   | 15     | Track unique co-players             |
| Night Owl        | Play a game after midnight     | 🦉   | 5      | `hour >= 22 \|\| hour < 6`          |
| Early Bird       | Play a game before 6 AM        | 🐦   | 5      | `hour >= 4 && hour < 6`             |

### Achievement Checking Logic

**Trigger**: After a player wins a game

**Process**:

```javascript
async function checkAndGrantAchievements(playerId, conditions) {
  // Conditions passed in:
  // - firstWin: stats.games_won === 0 (before increment)
  // - perfectGame: guesses.filter(g => g.playerId === playerId).length === 0
  // - speedDemon: gameTime < 30

  const achievementMap = {
    firstWin: 'First Win',
    speedDemon: 'Speed Demon',
    perfectGame: 'Perfect Game',
  };

  for (const [condition, achievementName] of Object.entries(
    achievementMap
  )) {
    if (conditions[condition]) {
      // Check if player already has achievement
      const achievements = await Player.getAchievements(playerId);
      const achievement = achievements.find(
        a => a.name === achievementName
      );

      if (!achievement) {
        // Look up achievement ID from database
        const allAchievements = await query(
          'SELECT id FROM achievements WHERE name = $1',
          [achievementName]
        );

        if (allAchievements.rows.length > 0) {
          // Grant achievement
          await Player.grantAchievement(
            playerId,
            allAchievements.rows[0].id
          );

          // Notify player via Socket.IO
          const socketId = playerSockets.get(playerId);
          if (socketId) {
            io.to(socketId).emit('achievementUnlocked', {
              name: achievementName,
              description: `You've unlocked the "${achievementName}" achievement!`,
            });
          }
        }
      }
    }
  }
}
```

### Client-Side Achievement Notification

```javascript
socket.on('achievementUnlocked', data => {
  // Display notification with animation
  showAchievementNotification(data.name, data.description);

  // Auto-hide after 5 seconds
  setTimeout(hideNotification, 5000);
});
```

---

## Data Models

### Players Table

```sql
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Constraints**:

- `username` must be unique
- `email` must be unique (if provided)
- `password_hash` is nullable (for guest conversion)

### Games Table

```sql
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) UNIQUE NOT NULL,
    target_word VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting',
    max_players INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);
```

**Status Values**:

- `waiting`: Game created, waiting for players
- `active`: Game in progress
- `ended`: Game completed or timed out

### Game_Players Table

```sql
CREATE TABLE game_players (
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    score INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    is_host BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (game_id, player_id)
);
```

**Purpose**: Many-to-many relationship between games and players

**Special Fields**:

- `is_host`: TRUE for the player who created the game
- `is_winner`: TRUE for the player who guessed correctly
- `score`: Points earned in this game (100 for correct guess)

### Guesses Table

```sql
CREATE TABLE guesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    word VARCHAR(50) NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    guessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Track all guesses made in all games

### Player_Stats Table

```sql
CREATE TABLE player_stats (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_guesses INTEGER DEFAULT 0,
    correct_guesses INTEGER DEFAULT 0,
    average_guesses_per_game NUMERIC(5,2) DEFAULT 0,
    best_time_seconds INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Auto-Calculated**:

- `average_guesses_per_game` = `total_guesses / games_played`

### Achievements Table

```sql
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    points INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Seeded on Migration**: 8 default achievements

### Player_Achievements Table

```sql
CREATE TABLE player_achievements (
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, achievement_id)
);
```

**Purpose**: Many-to-many relationship between players and
achievements

---

## API Endpoints

### Authentication Endpoints

#### Register

```
POST /api/players/register
Content-Type: application/json

{
  "username": "john_doe",
  "displayName": "John Doe",
  "email": "john@example.com",
  "password": "securepass123"
}

Response: 200 OK
{
  "message": "Registration successful",
  "player": {
    "id": "uuid",
    "username": "john_doe",
    "displayName": "John Doe"
  }
}
```

#### Login

```
POST /api/players/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securepass123"
}

Response: 200 OK
{
  "message": "Login successful",
  "player": {
    "id": "uuid",
    "username": "john_doe",
    "displayName": "John Doe"
  }
}
```

#### Logout

```
POST /api/players/logout

Response: 200 OK
{
  "message": "Logged out successfully"
}
```

### Player Endpoints

#### Get Current Player

```
GET /api/players/me

Response: 200 OK
{
  "player": { ... },
  "stats": { ... },
  "achievements": [ ... ]
}
```

#### Get Player Stats

```
GET /api/players/:playerId/stats

Response: 200 OK
{
  "player_id": "uuid",
  "games_played": 25,
  "games_won": 18,
  "total_guesses": 150,
  "correct_guesses": 18,
  "average_guesses_per_game": 6.0,
  "best_time_seconds": 45,
  "updated_at": "2024-01-01T12:00:00Z"
}
```

#### Get Leaderboard

```
GET /api/leaderboard?limit=10

Response: 200 OK
[
  {
    "display_name": "Player1",
    "username": "player1",
    "games_won": 50,
    "games_played": 60,
    "win_rate": 83.33,
    "average_guesses_per_game": 5.2,
    "best_time_seconds": 30,
    "achievements_count": 5,
    "total_points": 195
  },
  ...
]
```

### Game Endpoints

#### Start New Game

```
POST /api/game/start
Content-Type: application/json

{
  "difficulty": "medium",
  "maxPlayers": 4
}

Response: 200 OK
{
  "gameId": "uuid",
  "roomCode": "A7X2M9",
  "message": "New game started! Share the room code with friends.",
  "difficulty": "medium",
  "wordLength": 6,
  "maxPlayers": 4
}
```

#### Join Game

```
POST /api/game/join
Content-Type: application/json

{
  "roomCode": "A7X2M9"
}

Response: 200 OK
{
  "gameId": "uuid",
  "message": "Joined game successfully",
  "players": 2,
  "maxPlayers": 4
}
```

#### Submit Guess

```
POST /api/game/:gameId/guess
Content-Type: application/json

{
  "guess": "elephant"
}

Response (Incorrect): 200 OK
{
  "correct": false,
  "guesses": [ ... ],
  "hint": "The target word comes BEFORE your guess alphabetically",
  "message": "\"elephant\" is not the target word."
}

Response (Correct): 200 OK
{
  "correct": true,
  "targetWord": "computer",
  "guesses": [ ... ],
  "message": "Congratulations! You found the word: computer"
}
```

#### Get Game Status

```
GET /api/game/:gameId/status

Response: 200 OK
{
  "guesses": [ ... ],
  "players": [ ... ],
  "isComplete": false,
  "targetWord": null  // Only shown when game is complete
}
```

#### Get Active Games

```
GET /api/games/active

Response: 200 OK
[
  {
    "id": "uuid",
    "room_code": "A7X2M9",
    "difficulty": "medium",
    "status": "waiting",
    "player_count": 2,
    "max_players": 4,
    "created_at": "2024-01-01T12:00:00Z"
  },
  ...
]
```

### Health Check

```
GET /health

Response: 200 OK
{
  "uptime": 123456,
  "message": "OK",
  "timestamp": 1704110400000,
  "checks": [
    {
      "name": "PostgreSQL",
      "status": "UP"
    },
    {
      "name": "Redis",
      "status": "UP"
    }
  ]
}
```

---

## Socket.IO Events

### Client → Server

#### Join Game

```javascript
socket.emit('joinGame', gameId);
```

#### Leave Game

```javascript
socket.emit('leaveGame', gameId);
```

### Server → Client

#### Player Joined

```javascript
socket.on('playerJoined', data => {
  // data: { playerId, totalPlayers }
  console.log(
    `Player ${data.playerId} joined. Total: ${data.totalPlayers}`
  );
});
```

#### Player Left

```javascript
socket.on('playerLeft', data => {
  // data: { playerId, totalPlayers }
  console.log(
    `Player ${data.playerId} left. Remaining: ${data.totalPlayers}`
  );
});
```

#### New Guess

```javascript
socket.on('newGuess', data => {
  // data: { guess: { word, isCorrect, timestamp, playerId }, playerId }
  updateGuessHistory(data.guess);
});
```

#### Game Won

```javascript
socket.on('gameWon', data => {
  // data: { winner, targetWord, totalGuesses }
  displayWinner(data.winner, data.targetWord);
});
```

#### Achievement Unlocked

```javascript
socket.on('achievementUnlocked', data => {
  // data: { name, description }
  showAchievementNotification(data);
});
```

#### Game Timeout

```javascript
socket.on('gameTimeout', data => {
  // data: { message }
  alert(data.message);
  returnToMenu();
});
```

---

## Game States

### State Diagram

```
┌─────────────┐
│  No Session │
└─────────────┘
       │
       ├─ Login/Register ─────┐
       │                       │
       └─ Guest Mode ──────────┤
                               ↓
                      ┌─────────────────┐
                      │  Authenticated  │
                      │   (Game Menu)   │
                      └─────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │                             │
         Create Game                     Join Game
                │                             │
                ↓                             ↓
       ┌──────────────┐              ┌──────────────┐
       │    Waiting   │◄─────────────│   Joining    │
       │  (Host View) │              │              │
       └──────────────┘              └──────────────┘
                │                             │
                └──────────────┬──────────────┘
                               ↓
                      ┌──────────────┐
                      │    Active    │
                      │  (Gameplay)  │
                      └──────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
          Correct Guess    Timeout       Leave Game
                │              │              │
                ↓              ↓              ↓
         ┌──────────┐   ┌──────────┐   ┌──────────┐
         │   Ended  │   │   Ended  │   │  Return  │
         │ (Winner) │   │(Timeout) │   │ to Menu  │
         └──────────┘   └──────────┘   └──────────┘
                │              │              │
                └──────────────┴──────────────┘
                               ↓
                      ┌──────────────┐
                      │  Game Menu   │
                      └──────────────┘
```

### State Transitions

| From State      | Event             | To State      | Actions                                    |
| --------------- | ----------------- | ------------- | ------------------------------------------ |
| No Session      | Login/Register    | Authenticated | Create session, load player data           |
| No Session      | Guest Mode        | Authenticated | Create guest session                       |
| Authenticated   | Create Game       | Waiting       | Generate word, create game, show room code |
| Authenticated   | Join Game         | Joining       | Validate room code, add player             |
| Waiting/Joining | All Players Ready | Active        | Update game status, enable guessing        |
| Active          | Correct Guess     | Ended         | Update stats, check achievements, notify   |
| Active          | Timeout           | Ended         | Update status, notify players              |
| Active          | Leave Game        | Game Menu     | Remove from room, notify others            |
| Ended           | View Results      | Game Menu     | Display stats, return to menu              |

---

## Security and Validation

### Input Validation

#### Username

- **Length**: 3-50 characters
- **Format**: Alphanumeric, underscore, hyphen
- **Uniqueness**: Checked against database

#### Password

- **Minimum Length**: 6 characters (configurable)
- **Hashing**: bcrypt with 10 salt rounds
- **Storage**: Only hash stored, never plaintext

#### Guess

- **Format**: Letters only (a-z, A-Z)
- **Length**: 1-20 characters
- **Processing**: Normalized to lowercase

#### Room Code

- **Format**: 6 alphanumeric characters (A-Z, 0-9)
- **Case**: Converted to uppercase
- **Uniqueness**: Ensured on generation

### Rate Limiting

**Configuration**:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);
```

### Session Security

- **HTTPOnly**: Prevents JavaScript access to cookies
- **Secure**: HTTPS only in production
- **SameSite**: CSRF protection
- **Max Age**: 24 hours default
- **Secret**: Cryptographically secure random string

### Database Security

- **SQL Injection**: Parameterized queries only
- **Connection Pooling**: Limited connection count
- **Password Storage**: bcrypt hashing
- **UUID**: Non-sequential IDs prevent enumeration

### CORS Configuration

```javascript
cors({
  origin:
    process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : 'http://localhost:3000',
  credentials: true,
});
```

### Helmet.js Security Headers

```javascript
app.use(helmet());
```

Enables:

- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection

---

## Appendix: Example Game Flow

### Complete Game Walkthrough

1. **Player A creates a game**

   - Selects "Medium" difficulty
   - Server generates word: "computer"
   - Room code: `GAME42`
   - Word length hint shown: 8 letters

2. **Player B joins the game**

   - Enters room code: `GAME42`
   - Joins game room
   - Player A notified of Player B joining

3. **Players start guessing**

   **Player A's Turn**:

   - Guesses: "elephant" (9 letters)
   - Hint: "Target comes BEFORE your guess" (c < e)
   - Saved to database and broadcast

   **Player B's Turn**:

   - Guesses: "apple" (5 letters)
   - Hint: "Target comes AFTER your guess" (c > a)
   - Saved and broadcast

   **Player A's Turn**:

   - Guesses: "building" (8 letters)
   - Hint: "Target comes AFTER your guess" (c > b)
   - Saved and broadcast

   **Player B's Turn**:

   - Guesses: "computer" (8 letters)
   - ✅ **CORRECT!**

4. **Game ends**

   - Game status: `ended`
   - Player B marked as winner
   - Player B's stats updated:
     - games_played: +1
     - games_won: +1
     - total_guesses: +2 (their 2 guesses)
     - correct_guesses: +1
   - Achievement check:
     - First Win? (if games_won was 0)
     - Perfect Game? (No, took 2 guesses)
     - Speed Demon? (Check game time)

5. **Players see results**

   - Winner: Player B
   - Target word revealed: "computer"
   - Total guesses: 4 (2 from each player)
   - Game time: 45 seconds

6. **Return to menu**
   - Game removed from active games after 5 minutes
   - Historical data remains in database

---

## Environment Variables

### Required Variables

```bash
# Application
NODE_ENV=development|production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/wordgame
REDIS_URL=redis://localhost:6379

# Security
SESSION_SECRET=random-secure-string-min-32-chars
JWT_SECRET=another-random-secure-string-min-32-chars

# Application Settings
MIN_WORD_LENGTH=4
MAX_WORD_LENGTH=8
GAME_TIMEOUT_MINUTES=30
```

### Optional Variables

```bash
# CORS
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_TIMEOUT=86400000

# Logging
LOG_LEVEL=info|debug|error
```

---

## Performance Considerations

### Memory Management

- **In-Memory Games**: Stored in Map for O(1) lookup
- **Cleanup**: Automatic removal after timeout (5 min interval)
- **Size**: Each game ~1-5 KB depending on guess count

### Database Optimization

- **Indexes**: Created on frequently queried columns

  - `games.room_code`
  - `games.status`
  - `guesses.game_id`
  - `guesses.player_id`
  - `player_stats.games_won`

- **Connection Pooling**: Reuses database connections
- **Batch Operations**: Multiple queries in transactions

### Caching Strategy

- **Redis**: Session storage only
- **Future**: Could cache:
  - Active games list
  - Leaderboard (with TTL)
  - Player stats (invalidate on update)

### Scalability

**Current**: Single-server deployment

**Future Improvements**:

- Redis Pub/Sub for multi-server Socket.IO
- Database read replicas for leaderboard
- CDN for static assets
- Horizontal scaling with load balancer

---

## Testing

### Unit Tests

Located in: `/tests/unit/`

**Coverage**:

- Player model (CRUD operations)
- Game model (game lifecycle)
- Authentication logic
- Statistics calculations

### End-to-End Tests

Located in: `/tests/e2e/`

**Test Scenarios**:

- Complete game flow
- Multiple players
- Edge cases (timeouts, disconnections)

**Framework**: Playwright

### Running Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

---

## Troubleshooting

### Common Issues

1. **"Game not found"**

   - Room code may be incorrect (case-sensitive)
   - Game may have ended or timed out
   - Check active games: `GET /api/games/active`

2. **"Game is full"**

   - Maximum players reached
   - Ask host to increase `maxPlayers` or wait

3. **Socket.IO connection issues**

   - Check CORS configuration
   - Verify WebSocket ports not blocked
   - Check client socket.io library version matches server

4. **Session expired**
   - 24-hour default timeout
   - Re-login required
   - Guest sessions don't persist

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=debug npm start

# Check health endpoint
curl http://localhost:3000/health

# View logs
tail -f combined.log
tail -f error.log
```

---

## Future Enhancements

### Planned Features

- **Private Messages**: Player-to-player chat
- **Spectator Mode**: Watch games without playing
- **Custom Words**: Host provides word list
- **Timed Rounds**: Add time pressure
- **Categories**: Theme-based words (animals, countries, etc.)
- **Power-ups**: Hints, letter reveals
- **Teams**: 2v2 collaborative guessing
- **Tournament Mode**: Brackets and rankings

### Technical Improvements

- **TypeScript**: Add type safety
- **GraphQL**: Replace REST API
- **Redis Pub/Sub**: Multi-server support
- **WebRTC**: Peer-to-peer chat
- **Mobile App**: React Native implementation
- **AI Opponent**: Solo play mode

---

## Conclusion

This document provides a comprehensive overview of the Word Guessing
Game's logic, architecture, and implementation. The game combines
real-time multiplayer features with persistent player progression,
creating an engaging and competitive word-guessing experience.

For additional documentation, see:

- [README.md](../README.md) - Setup and deployment
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and
  solutions
- [GitHub Secrets Setup](GITHUB_SECRETS_TEMPLATE.md) - CI/CD
  configuration

---

**Last Updated**: 2024-12-06  
**Version**: 1.0.0
