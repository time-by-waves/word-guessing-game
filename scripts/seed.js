#!/usr/bin/env node

const { pgPool } = require('../src/db/config');
const Player = require('../src/models/player');

async function seedDatabase() {
  console.info('Seeding database with sample data...');

  try {
    // Create sample players
    const players = [
      {
        username: 'alice',
        displayName: 'Alice Wonder',
        email: 'alice@example.com',
        password: 'password123',
      },
      {
        username: 'bob',
        displayName: 'Bob Builder',
        email: 'bob@example.com',
        password: 'password123',
      },
      {
        username: 'charlie',
        displayName: 'Charlie Brown',
        email: 'charlie@example.com',
        password: 'password123',
      },
      {
        username: 'diana',
        displayName: 'Diana Prince',
        email: 'diana@example.com',
        password: 'password123',
      },
      {
        username: 'demo',
        displayName: 'Demo User',
        email: 'demo@example.com',
        password: 'demo',
      },
    ];

    console.info('Creating sample players...');
    const createdPlayers = [];

    for (const playerData of players) {
      try {
        const player = await Player.create(playerData);
        createdPlayers.push(player);
        console.info(`✅ Created player: ${player.username}`);
      } catch (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          console.warn(
            `⏭️  Player ${playerData.username} already exists, skipping...`
          );
        } else {
          throw error;
        }
      }
    }

    // Add some sample stats for demo purposes
    if (createdPlayers.length > 0) {
      console.info('Adding sample stats...');

      await Player.updateStats(createdPlayers[0].id, {
        gamesPlayed: 50,
        gamesWon: 35,
        totalGuesses: 250,
        correctGuesses: 35,
        bestTimeSeconds: 25,
      });

      await Player.updateStats(createdPlayers[1].id, {
        gamesPlayed: 30,
        gamesWon: 15,
        totalGuesses: 180,
        correctGuesses: 15,
        bestTimeSeconds: 42,
      });
    }

    console.info('✅ Database seeding completed successfully');
    console.info('\n📝 Demo credentials:');
    console.info('   Username: demo');
    console.info('   Password: demo');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
