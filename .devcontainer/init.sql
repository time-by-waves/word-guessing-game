-- Initialize the word guessing game database

-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
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

-- Create game_players table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS game_players (
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    score INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    is_host BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (game_id, player_id)
);

-- Create guesses table
CREATE TABLE IF NOT EXISTS guesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    word VARCHAR(50) NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    guessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create player_stats table
CREATE TABLE IF NOT EXISTS player_stats (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_guesses INTEGER DEFAULT 0,
    correct_guesses INTEGER DEFAULT 0,
    average_guesses_per_game NUMERIC(5,2) DEFAULT 0,
    best_time_seconds INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    points INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create player_achievements table
CREATE TABLE IF NOT EXISTS player_achievements (
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, achievement_id)
);

-- Create indexes for performance
CREATE INDEX idx_games_room_code ON games(room_code);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_guesses_game_id ON guesses(game_id);
CREATE INDEX idx_guesses_player_id ON guesses(player_id);
CREATE INDEX idx_player_stats_games_won ON player_stats(games_won DESC);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, points) VALUES
    ('First Win', 'Win your first game', '🏆', 10),
    ('Speed Demon', 'Guess the word in under 30 seconds', '⚡', 20),
    ('Perfect Game', 'Guess the word on your first try', '🎯', 50),
    ('Winning Streak', 'Win 5 games in a row', '🔥', 30),
    ('Word Master', 'Win 100 games total', '👑', 100),
    ('Social Butterfly', 'Play with 10 different players', '🦋', 15),
    ('Night Owl', 'Play a game after midnight', '🦉', 5),
    ('Early Bird', 'Play a game before 6 AM', '🐦', 5);

-- Create a view for leaderboard
CREATE VIEW leaderboard AS
SELECT
    p.id,
    p.display_name,
    p.username,
    ps.games_won,
    ps.games_played,
    CASE
        WHEN ps.games_played > 0
        THEN ROUND((ps.games_won::numeric / ps.games_played) * 100, 2)
        ELSE 0
    END as win_rate,
    ps.average_guesses_per_game,
    ps.best_time_seconds,
    COUNT(pa.achievement_id) as achievements_count,
    SUM(a.points) as total_points
FROM players p
JOIN player_stats ps ON p.id = ps.player_id
LEFT JOIN player_achievements pa ON p.id = pa.player_id
LEFT JOIN achievements a ON pa.achievement_id = a.id
GROUP BY p.id, p.display_name, p.username, ps.games_won, ps.games_played,
         ps.average_guesses_per_game, ps.best_time_seconds
ORDER BY ps.games_won DESC, win_rate DESC;
