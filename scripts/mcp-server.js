#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const {
  StdioServerTransport,
} = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs').promises;

class WordGameMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'word-game-testing-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.browser = null;
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'run_e2e_test',
          description: 'Run end-to-end tests for the word guessing game',
          inputSchema: {
            type: 'object',
            properties: {
              testName: {
                type: 'string',
                description: 'Name of the specific test to run (optional)',
              },
              headless: {
                type: 'boolean',
                description: 'Run tests in headless mode',
                default: true,
              },
            },
          },
        },
        {
          name: 'take_screenshot',
          description: 'Take a screenshot of the game at a specific state',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to navigate to',
                default: 'http://localhost:3000',
              },
              selector: {
                type: 'string',
                description:
                  'CSS selector to wait for before taking screenshot',
              },
              fullPage: {
                type: 'boolean',
                description: 'Take a full page screenshot',
                default: false,
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'test_game_flow',
          description:
            'Test a complete game flow with automated player actions',
          inputSchema: {
            type: 'object',
            properties: {
              playerCount: {
                type: 'number',
                description: 'Number of players to simulate',
                default: 2,
              },
              targetWord: {
                type: 'string',
                description: 'Target word for the game (optional)',
              },
            },
          },
        },
        {
          name: 'analyze_performance',
          description: 'Analyze game performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              duration: {
                type: 'number',
                description: 'Duration in seconds to collect metrics',
                default: 30,
              },
              playerCount: {
                type: 'number',
                description: 'Number of simultaneous players',
                default: 10,
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      switch (request.params.name) {
        case 'run_e2e_test':
          return await this.runE2ETest(request.params.arguments);
        case 'take_screenshot':
          return await this.takeScreenshot(request.params.arguments);
        case 'test_game_flow':
          return await this.testGameFlow(request.params.arguments);
        case 'analyze_performance':
          return await this.analyzePerformance(request.params.arguments);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async runE2ETest(args) {
    const { testName, headless = true } = args;

    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const command = testName
        ? `npx playwright test ${testName} ${headless ? '' : '--headed'}`
        : `npx playwright test ${headless ? '' : '--headed'}`;

      const { stdout, stderr } = await execAsync(command);

      return {
        content: [
          {
            type: 'text',
            text: `Test execution completed\n\nOutput:\n${stdout}\n\nErrors:\n${stderr}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Test execution failed: ${error.message}`,
          },
        ],
      };
    }
  }

  async takeScreenshot(args) {
    const { url, selector, fullPage = false } = args;

    try {
      if (!this.browser) {
        this.browser = await chromium.launch({ headless: true });
      }

      const context = await this.browser.newContext();
      const page = await context.newPage();

      await page.goto(url);

      if (selector) {
        await page.waitForSelector(selector, { timeout: 10000 });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(
        process.cwd(),
        'screenshots',
        `game-${timestamp}.png`
      );

      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });

      await page.screenshot({
        path: screenshotPath,
        fullPage,
      });

      await context.close();

      return {
        content: [
          {
            type: 'text',
            text: `Screenshot saved to: ${screenshotPath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Screenshot failed: ${error.message}`,
          },
        ],
      };
    }
  }

  async testGameFlow(args) {
    const { playerCount = 2, targetWord } = args;

    try {
      if (!this.browser) {
        this.browser = await chromium.launch({ headless: true });
      }

      const context = await this.browser.newContext();
      const pages = [];
      const results = [];

      // Create multiple browser pages for each player
      for (let i = 0; i < playerCount; i++) {
        const page = await context.newPage();
        await page.goto('http://localhost:3000');
        pages.push(page);
      }

      // Host creates a game
      const hostPage = pages[0];
      await hostPage.click('#newGameBtn');
      await hostPage.waitForSelector('#gameArea:not(.hidden)');

      // Simulate game play
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const playerName = `Player${i + 1}`;

        // Make some guesses
        const guesses = [
          'apple',
          'banana',
          'cherry',
          'dragon',
          targetWord || 'example',
        ];

        for (const guess of guesses) {
          await page.fill('#guessInput', guess);
          await page.click('#submitGuess');
          await page.waitForTimeout(500);

          // Check if game is won
          const isWon = await page.$('.message.success');
          if (isWon) {
            results.push({
              player: playerName,
              won: true,
              guessCount: guesses.indexOf(guess) + 1,
            });
            break;
          }
        }
      }

      await context.close();

      return {
        content: [
          {
            type: 'text',
            text: `Game flow test completed\n\nResults:\n${JSON.stringify(results, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Game flow test failed: ${error.message}`,
          },
        ],
      };
    }
  }

  async analyzePerformance(args) {
    const { duration = 30 } = args;

    try {
      if (!this.browser) {
        this.browser = await chromium.launch({ headless: true });
      }

      const context = await this.browser.newContext();
      const metrics = {
        responseTime: [],
        memoryUsage: [],
        cpuUsage: [],
      };

      const page = await context.newPage();

      // Enable performance metrics
      await page.coverage.startJSCoverage();

      await page.goto('http://localhost:3000');

      const startTime = Date.now();
      const endTime = startTime + duration * 1000;

      while (Date.now() < endTime) {
        const perfMetrics = await page.metrics();
        metrics.responseTime.push(perfMetrics.TaskDuration);
        metrics.memoryUsage.push(perfMetrics.JSHeapUsedSize);

        await page.waitForTimeout(1000);
      }

      const jsCoverage = await page.coverage.stopJSCoverage();

      await context.close();

      const analysis = {
        avgResponseTime:
          metrics.responseTime.reduce((a, b) => a + b, 0) /
          metrics.responseTime.length,
        maxMemoryUsage: Math.max(...metrics.memoryUsage),
        avgMemoryUsage:
          metrics.memoryUsage.reduce((a, b) => a + b, 0) /
          metrics.memoryUsage.length,
        codeCoverage: jsCoverage.length,
      };

      return {
        content: [
          {
            type: 'text',
            text: `Performance analysis completed\n\n${JSON.stringify(analysis, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Performance analysis failed: ${error.message}`,
          },
        ],
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Word Game MCP Server started');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

const server = new WordGameMCPServer();
server.start().catch(console.error);

process.on('SIGINT', async () => {
  await server.cleanup();
  process.exit(0);
});
