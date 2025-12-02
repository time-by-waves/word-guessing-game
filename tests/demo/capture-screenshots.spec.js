const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Demo Screenshots for README', () => {
  test.setTimeout(120000);

  test('capture authentication screen', async ({ page }) => {
    await page.goto('file://' + path.resolve(__dirname, '../../public/index.html'));
    
    // Wait for page to load
    await page.waitForSelector('h1');
    
    // Ensure we're on the auth section
    await expect(page.locator('#authSection')).toBeVisible();
    
    // Take screenshot of login tab
    await page.click('[data-tab="login"]');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/01-authentication-login.png',
      fullPage: false
    });
    
    // Take screenshot of register tab
    await page.click('[data-tab="register"]');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/02-authentication-register.png',
      fullPage: false
    });
    
    // Take screenshot of guest tab
    await page.click('[data-tab="guest"]');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/03-authentication-guest.png',
      fullPage: false
    });
  });

  test('capture game menu screen', async ({ page }) => {
    await page.goto('file://' + path.resolve(__dirname, '../../public/index.html'));
    
    // Simulate showing game menu by directly manipulating DOM
    await page.evaluate(() => {
      document.getElementById('authSection').classList.add('hidden');
      document.getElementById('gameMenu').classList.remove('hidden');
      
      // Add sample stats
      const statsDiv = document.getElementById('playerStats');
      statsDiv.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Games Played:</span>
          <span class="stat-value">42</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Games Won:</span>
          <span class="stat-value">28</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Win Rate:</span>
          <span class="stat-value">66.7%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Guesses:</span>
          <span class="stat-value">4.2</span>
        </div>
      `;
    });
    
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/04-game-menu.png',
      fullPage: false
    });
  });

  test('capture active gameplay', async ({ page }) => {
    await page.goto('file://' + path.resolve(__dirname, '../../public/index.html'));
    
    // Simulate active game state
    await page.evaluate(() => {
      document.getElementById('authSection').classList.add('hidden');
      document.getElementById('gameMenu').classList.add('hidden');
      document.getElementById('gameArea').classList.remove('hidden');
      
      // Set room info
      document.getElementById('roomCode').textContent = 'ABC123';
      document.getElementById('playerCount').textContent = '2';
      document.getElementById('maxPlayers').textContent = '4';
      
      // Add sample players
      const playersList = document.getElementById('playersList');
      playersList.innerHTML = `
        <div class="player-card active">
          <div class="player-name">Player1</div>
          <div class="player-status">Online</div>
        </div>
        <div class="player-card">
          <div class="player-name">Player2</div>
          <div class="player-status">Online</div>
        </div>
      `;
      
      // Add sample guesses
      const guessList = document.getElementById('guessList');
      guessList.innerHTML = `
        <div class="guess-item">
          <span class="guess-word">rhythm</span>
          <span class="guess-hint hint-after">AFTER target word</span>
          <span class="guess-distance">Distance: 42</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">python</span>
          <span class="guess-hint hint-before">BEFORE target word</span>
          <span class="guess-distance">Distance: 18</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">keyboard</span>
          <span class="guess-hint hint-after">AFTER target word</span>
          <span class="guess-distance">Distance: 25</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">javascript</span>
          <span class="guess-hint hint-before">BEFORE target word</span>
          <span class="guess-distance">Distance: 12</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">function</span>
          <span class="guess-hint hint-after">AFTER target word</span>
          <span class="guess-distance">Distance: 8</span>
        </div>
      `;
      
      // Add hint message
      const hint = document.getElementById('hint');
      hint.innerHTML = 'Your guess "function" is AFTER the target word alphabetically. Distance: 8';
      hint.style.display = 'block';
    });
    
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/05-active-gameplay.png',
      fullPage: false
    });
  });

  test('capture gameplay with sorted guesses', async ({ page }) => {
    await page.goto('file://' + path.resolve(__dirname, '../../public/index.html'));
    
    // Simulate sorted game state
    await page.evaluate(() => {
      document.getElementById('authSection').classList.add('hidden');
      document.getElementById('gameMenu').classList.add('hidden');
      document.getElementById('gameArea').classList.remove('hidden');
      
      // Set room info
      document.getElementById('roomCode').textContent = 'XYZ789';
      document.getElementById('playerCount').textContent = '3';
      
      // Update history title
      document.getElementById('historyTitle').textContent = 'Guess History (By Alphabetical Closeness)';
      
      // Add sorted guesses
      const guessList = document.getElementById('guessList');
      guessList.innerHTML = `
        <div class="guess-item closest">
          <span class="guess-word">monitor</span>
          <span class="guess-hint hint-after">AFTER target word</span>
          <span class="guess-distance">Distance: 3</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">mouse</span>
          <span class="guess-hint hint-after">AFTER target word</span>
          <span class="guess-distance">Distance: 5</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">network</span>
          <span class="guess-hint hint-after">AFTER target word</span>
          <span class="guess-distance">Distance: 7</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">laptop</span>
          <span class="guess-hint hint-before">BEFORE target word</span>
          <span class="guess-distance">Distance: 11</span>
        </div>
      `;
    });
    
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/06-sorted-guesses.png',
      fullPage: false
    });
  });

  test('capture winning game state', async ({ page }) => {
    await page.goto('file://' + path.resolve(__dirname, '../../public/index.html'));
    
    // Simulate winning state
    await page.evaluate(() => {
      document.getElementById('authSection').classList.add('hidden');
      document.getElementById('gameMenu').classList.add('hidden');
      document.getElementById('gameArea').classList.remove('hidden');
      
      // Set room info
      document.getElementById('roomCode').textContent = 'WIN001';
      
      // Add winning message
      const message = document.getElementById('message');
      message.innerHTML = '🎉 Congratulations! You found the word "magic" in 6 guesses!';
      message.className = 'message success';
      message.style.display = 'block';
      
      // Add final guesses
      const guessList = document.getElementById('guessList');
      guessList.innerHTML = `
        <div class="guess-item correct">
          <span class="guess-word">magic</span>
          <span class="guess-hint hint-correct">✓ CORRECT!</span>
          <span class="guess-distance">Distance: 0</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">major</span>
          <span class="guess-hint hint-before">BEFORE target word</span>
          <span class="guess-distance">Distance: 2</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">maple</span>
          <span class="guess-hint hint-after">AFTER target word</span>
          <span class="guess-distance">Distance: 3</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">march</span>
          <span class="guess-hint hint-after">AFTER target word</span>
          <span class="guess-distance">Distance: 5</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">lemon</span>
          <span class="guess-hint hint-before">BEFORE target word</span>
          <span class="guess-distance">Distance: 8</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">orange</span>
          <span class="guess-hint hint-after">AFTER target word</span>
          <span class="guess-distance">Distance: 15</span>
        </div>
      `;
    });
    
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/07-winning-state.png',
      fullPage: false
    });
  });

  test('capture mobile responsive view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('file://' + path.resolve(__dirname, '../../public/index.html'));
    
    await page.waitForSelector('h1');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: 'screenshots/08-mobile-view.png',
      fullPage: false
    });
    
    // Simulate mobile game view
    await page.evaluate(() => {
      document.getElementById('authSection').classList.add('hidden');
      document.getElementById('gameArea').classList.remove('hidden');
      
      document.getElementById('roomCode').textContent = 'MOB123';
      
      const guessList = document.getElementById('guessList');
      guessList.innerHTML = `
        <div class="guess-item">
          <span class="guess-word">mobile</span>
          <span class="guess-hint hint-after">AFTER</span>
          <span class="guess-distance">Dist: 5</span>
        </div>
        <div class="guess-item">
          <span class="guess-word">phone</span>
          <span class="guess-hint hint-after">AFTER</span>
          <span class="guess-distance">Dist: 12</span>
        </div>
      `;
    });
    
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/09-mobile-gameplay.png',
      fullPage: false
    });
  });
});
