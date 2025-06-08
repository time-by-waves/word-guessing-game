# Word Guessing Game 🎮

![Build Status](https://github.com/time-by-waves/word-guessing-game/workflows/Node.js%20CI%20for%20Word%20Guessing%20Game/badge.svg)
![Deploy to Production](https://github.com/time-by-waves/word-guessing-game/workflows/Deploy%20to%20Production/badge.svg)
![Deploy to Staging](https://github.com/time-by-waves/word-guessing-game/workflows/Deploy%20to%20Staging/badge.svg)
[![codecov](https://codecov.io/gh/time-by-waves/word-guessing-game/branch/main/graph/badge.svg)](https://codecov.io/gh/time-by-waves/word-guessing-game)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](http://unlicense.org/)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

A real-time multiplayer word guessing game built with Node.js, Express, Socket.IO, and PostgreSQL. Players compete to guess the target word with hints about alphabetical ordering.

## 🚀 Features

- **Real-time Multiplayer**: Play with friends in real-time using WebSocket connections
- **Player System**: Create player profiles, track stats, and earn achievements
- **Multiple Difficulty Levels**: Easy, Medium, and Hard word difficulties
- **Smart Hints**: Get hints about whether the target word comes before or after your guess alphabetically
- **Leaderboards**: Global leaderboard tracking wins, win rate, and achievements
- **Achievement System**: Unlock achievements for various accomplishments
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Docker Support**: Easy deployment with Docker containers
- **CI/CD Pipeline**: Automated testing and deployment to staging and production

## 🎯 How to Play

1. Start a new game or join an existing room
2. Enter your guesses in the input field
3. The game will tell you if the target word comes before or after your guess alphabetically
4. Keep guessing until you find the word!
5. Your guesses can be sorted by time or alphabetical closeness

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: PostgreSQL for player data, Redis for sessions
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Testing**: Jest (unit tests), Playwright (E2E tests)
- **CI/CD**: GitHub Actions, Docker
- **Deployment**: Azure Container Instances / Binary Lane VMs

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

## 🔧 Installation

### Local Development

1. **Clone the repository:**

   ```bash
   git clone https://github.com/time-by-waves/word-guessing-game.git
   cd word-guessing-game
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database:**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start the development server:**

   ```bash
   npm run dev
   ```

6. **Open the game in your browser:**
   Navigate to `http://localhost:3000`

### Using Docker

```bash
docker-compose up -d
```

### Using Dev Container (VS Code)

1. Install the "Dev Containers" extension in VS Code
2. Open the project folder
3. Click "Reopen in Container" when prompted
4. The development environment will be automatically set up

## 🧪 Testing

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run E2E tests

```bash
npm run test:e2e
```

### Run E2E tests with UI

```bash
npm run test:e2e:ui
```

## 📦 Deployment

The project includes automated CI/CD pipelines for deployment:

### Staging Deployment

- Automatically deploys to Azure Container Instances when pushing to the `staging` branch
- Runs all tests and quality checks before deployment

### Production Deployment

- Automatically deploys when pushing to the `main` branch
- Default deployment target is Binary Lane VM
- Can be manually triggered with Azure as the target

### Manual Deployment

#### Deploy to Production (Binary Lane)

```bash
# This happens automatically on push to main
# Or trigger manually via GitHub Actions
```

#### Deploy to Production (Azure)

```bash
# Trigger via GitHub Actions with 'azure' as deployment target
```

## 🔌 Model Context Protocol (MCP) Integration

The project includes an MCP server for AI-assisted testing and development:

### Start the MCP server

```bash
npm run mcp:start
```

### Available MCP Tools

- `run_e2e_test`: Execute E2E tests programmatically
- `take_screenshot`: Capture game screenshots at specific states
- `test_game_flow`: Simulate multiplayer game sessions
- `analyze_performance`: Collect and analyze performance metrics

## 🏗️ Project Structure

```
word-guessing-game/
├── src/
│   ├── server.js          # Main server file
│   ├── db/                # Database models and queries
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── utils/             # Helper functions
├── public/
│   ├── index.html         # Main HTML file
│   ├── style.css          # Styles
│   └── script.js          # Client-side JavaScript
├── tests/
│   ├── unit/              # Unit tests
│   └── e2e/               # End-to-end tests
├── scripts/
│   ├── migrate.js         # Database migrations
│   ├── seed.js            # Database seeding
│   └── mcp-server.js      # MCP server implementation
├── .devcontainer/         # Dev container configuration
├── .github/workflows/     # CI/CD pipelines
└── docker-compose.yml     # Docker composition
```

## 🤝 Contributing

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes and commit them
4. Push your changes to your fork
5. Submit a pull request

### Development Guidelines

- Write tests for new features
- Follow the existing code style
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 Environment Variables

The project uses different `.env` files for different environments:

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment
- `.env.test` - Testing environment
- `.env.example` - Template for creating your own

Copy the appropriate file and update with your values:

```bash
# For local development
cp .env.development .env

# For production deployment
cp .env.production .env
```

### Key Environment Variables

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret
```

## 🔐 GitHub Secrets Configuration

To enable CI/CD pipelines, you need to configure the following secrets in your GitHub repository settings:

### Setting up GitHub Secrets

1. Go to your repository on GitHub
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret below

### Required Secrets for CI/CD

#### Azure Container Registry (for Staging & Production)

```yaml
AZURE_REGISTRY_URL: yourregistry.azurecr.io
AZURE_REGISTRY_USERNAME: yourregistryusername
AZURE_REGISTRY_PASSWORD: <get from Azure Portal>
```

#### Azure Web App Publishing Profiles

```yaml
AZURE_WEBAPP_PUBLISH_PROFILE_STAGING: <download from Azure Portal>
AZURE_WEBAPP_PUBLISH_PROFILE_PROD: <download from Azure Portal>
```

**To get publishing profiles:**

1. Go to Azure Portal → Your Web App
2. Click **Get publish profile** in the overview section
3. Copy the entire XML content
4. Paste as secret value in GitHub

#### Binary Lane Deployment (Production Alternative)

```yaml
BINARYLANE_HOST: your-server-ip-or-domain.com
BINARYLANE_USERNAME: root
BINARYLANE_SSH_KEY: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  your-private-key-content-here
  -----END OPENSSH PRIVATE KEY-----
BINARYLANE_URL: https://your-domain.com
```

**To generate SSH key for Binary Lane:**

```bash
ssh-keygen -t ed25519 -C "github-actions@word-game"
# Copy the private key content to GitHub secret
# Add the public key to your Binary Lane server's ~/.ssh/authorized_keys
```

#### Additional Services (Optional)

```yaml
# Code Coverage
CODECOV_TOKEN: <get from codecov.io>

# Azure Production URL (for E2E tests)
AZURE_PROD_URL: https://word-guessing-game-prod.azurewebsites.net

# Email Service (optional)
SENDGRID_API_KEY: SG.your-sendgrid-api-key

# Error Tracking (optional)
SENTRY_DSN: https://your-key@sentry.io/project-id
```

### Environment-Specific Secrets

#### For Staging Environment

Create these secrets with values from `.env.staging`:

```yaml
STAGING_DATABASE_URL: postgresql://...
STAGING_REDIS_URL: redis://...
STAGING_SESSION_SECRET: <generate with: openssl rand -base64 32>
STAGING_JWT_SECRET: <generate with: openssl rand -base64 32>
```

#### For Production Environment

Create these secrets with values from `.env.production`:

```yaml
PROD_DATABASE_URL: postgresql://...
PROD_REDIS_URL: redis://...
PROD_SESSION_SECRET: <generate with: openssl rand -base64 32>
PROD_JWT_SECRET: <generate with: openssl rand -base64 32>
```

### Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore` for a reason
2. **Use strong secrets** - Generate with: `openssl rand -base64 32`
3. **Rotate secrets regularly** - Update both in GitHub and deployed environments
4. **Use different secrets per environment** - Never reuse production secrets
5. **Limit access** - Only give repository access to trusted developers

### Verifying Secrets

After adding secrets, verify they're working:

1. **Check workflow runs**: Go to Actions tab → Check for secret-related errors
2. **Test deployments**:
   - Push to `staging` branch → Verify staging deployment
   - Push to `main` branch → Verify production deployment
3. **Monitor logs**: Check application logs for connection issues

### Secret Generation Commands

```bash
# Generate strong secrets
openssl rand -base64 32

# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions@word-game"

# Test database connection
psql "postgresql://user:pass@host:5432/dbname" -c "SELECT 1"

# Test Redis connection
redis-cli -u "redis://user:pass@host:6379" ping
```

## 🔐 API Documentation

### Game Endpoints

#### Start a new game

```http
POST /api/game/start
Body: { "difficulty": "medium" }
```

#### Make a guess

```http
POST /api/game/:gameId/guess
Body: { "guess": "apple" }
```

#### Get game status

```http
GET /api/game/:gameId/status
```

### Player Endpoints

#### Register a new player

```http
POST /api/players/register
Body: { "username": "player1", "email": "player@example.com" }
```

#### Get player stats

```http
GET /api/players/:playerId/stats
```

#### Get leaderboard

```http
GET /api/leaderboard
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use:**

   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Database connection issues:**

   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env
   - Run migrations: `npm run db:migrate`

3. **Redis connection issues:**
   - Ensure Redis is running
   - Check REDIS_URL in .env

## 📄 License

This project is released into the public domain under the [Unlicense](http://unlicense.org/).

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Real-time features powered by [Socket.IO](https://socket.io/)
- Word generation using [random-words](https://www.npmjs.com/package/random-words)
- Testing with [Jest](https://jestjs.io/) and [Playwright](https://playwright.dev/)

## 📞 Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/time-by-waves/word-guessing-game/issues) page.

---

Made with ❤️ by the Word Guessing Game Team
