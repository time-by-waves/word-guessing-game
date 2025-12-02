# Word Guessing Game

![Build Status](https://github.com/time-by-waves/word-guessing-game/workflows/Node.js%20CI%20for%20Word%20Guessing%20Game/badge.svg)
![Deploy to Production](https://github.com/time-by-waves/word-guessing-game/workflows/Deploy%20to%20Production/badge.svg)
![Deploy to Staging](https://github.com/time-by-waves/word-guessing-game/workflows/Deploy%20to%20Staging/badge.svg)
[![codecov](https://codecov.io/gh/time-by-waves/word-guessing-game/branch/main/graph/badge.svg)](https://codecov.io/gh/time-by-waves/word-guessing-game)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](http://unlicense.org/)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

[![GitHub release](https://img.shields.io/github/release/time-by-waves/word-guessing-game.svg)](https://github.com/time-by-waves/word-guessing-game/releases)
[![GitHub issues](https://img.shields.io/github/issues/time-by-waves/word-guessing-game.svg)](https://github.com/time-by-waves/word-guessing-game/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/time-by-waves/word-guessing-game.svg)](https://github.com/time-by-waves/word-guessing-game/pulls)
[![GitHub stars](https://img.shields.io/github/stars/time-by-waves/word-guessing-game.svg?style=social&label=Star)](https://github.com/time-by-waves/word-guessing-game)
[![GitHub forks](https://img.shields.io/github/forks/time-by-waves/word-guessing-game.svg?style=social&label=Fork)](https://github.com/time-by-waves/word-guessing-game/fork)

![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=flat&logo=express&logoColor=%2361DAFB)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=flat&logo=socket.io&badgeColor=010101)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=flat&logo=redis&logoColor=white)
![Jest](https://img.shields.io/badge/-jest-%23C21325?style=flat&logo=jest&logoColor=white)
![Playwright](https://img.shields.io/badge/-playwright-45ba4b?style=flat&logo=playwright&logoColor=white)

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/time-by-waves/word-guessing-game/ci.yml?branch=main&label=tests)
![Security Audit](https://img.shields.io/github/actions/workflow/status/time-by-waves/word-guessing-game/security.yml?branch=main&label=security)
![Uptime Robot status](https://img.shields.io/uptimerobot/status/m793494864-6c2c8e0b9c7e8b0e8b0e8b0e?label=production)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fwordguessinggame.com&label=game%20status)

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=flat&logo=eslint&logoColor=white)](https://eslint.org/)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)

![Infrastructure as Code](https://img.shields.io/badge/IaC-Enabled-blueviolet)
![Monitoring](https://img.shields.io/badge/monitoring-active-green)
![Security Hardened](https://img.shields.io/badge/security-hardened-red)
![Cloud Ready](https://img.shields.io/badge/cloud-ready-blue)
![CI/CD](https://img.shields.io/badge/CI%2FCD-automated-orange)
![High Availability](https://img.shields.io/badge/HA-configured-brightgreen)

A modern, real-time multiplayer word guessing game built with Node.js,
Express, Socket.IO, and deployed using Infrastructure as Code.

> **📸 [View Demo & Screenshots →](DEMO.md)** - See the game in action
> with detailed screenshots and comprehensive tech stack documentation!

## 🎮 Features

- **Real-time Multiplayer**: Connect with friends for live gameplay
- **WebSocket Communication**: Instant game updates via Socket.IO
- **Persistent Data**: PostgreSQL database with Redis caching
- **Scalable Architecture**: Docker containerization ready
- **Infrastructure as Code**: Automated deployment to cloud providers
- **CI/CD Pipeline**: GitHub Actions for testing and deployment
- **Security First**: Hardened server configuration and monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PowerShell (for infrastructure provisioning)
- Git

### Local Development

1. **Clone and Setup**

   ```bash
   git clone https://github.com/YOUR_USERNAME/word-guessing-game.git
   cd word-guessing-game
   npm install
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   npm run validate-env
   ```

3. **Start Services**

   ```bash
   npm run docker:run
   npm run prepare-dev
   npm run dev
   ```

4. **Access Application**
   - Game: http://localhost:3000
   - Health Check: http://localhost:3000/health

## 🏗️ Infrastructure

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Application   │    │    Database     │
│    (Nginx)      │───▶│   (Node.js)     │───▶│  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                       ┌─────────────────┐
                       │      Cache      │
                       │    (Redis)      │
                       └─────────────────┘
```

### Infrastructure Commands

```bash
# Generate secrets for GitHub Actions
npm run infra:secrets

# Validate infrastructure configuration
npm run infra:validate

# Provision new server (staging)
npm run deploy:staging -- -ServerName "game-server-z01"

# Deploy to production
npm run deploy:production -- -ServerName "game-server-p01" -WaitForReady

# Manual deployment to existing server
npm run infra:deploy
```

### Supported Providers

- **Binary Lane** (Primary)
- **Azure Web Apps** (Secondary)
- **Local Development** (Docker)

## 🔧 Configuration

### Environment Variables

| Variable         | Description            | Default       | Required |
| ---------------- | ---------------------- | ------------- | -------- |
| `NODE_ENV`       | Environment mode       | `development` | ✅       |
| `PORT`           | Application port       | `3000`        | ✅       |
| `DATABASE_URL`   | PostgreSQL connection  | -             | ✅       |
| `REDIS_URL`      | Redis connection       | -             | ✅       |
| `SESSION_SECRET` | Session encryption key | -             | ✅       |
| `JWT_SECRET`     | JWT signing key        | -             | ✅       |
| `CORS_ORIGIN`    | Allowed CORS origins   | `*`           | ❌       |
| `LOG_LEVEL`      | Logging verbosity      | `info`        | ❌       |

### Infrastructure Variables

| Variable               | Description                   | Example                       |
| ---------------------- | ----------------------------- | ----------------------------- |
| `BINARYLANE_API_TOKEN` | Binary Lane API key           | `bl_xxxxx`                    |
| `BASTION_HOST_IP`      | Bastion host IP for DB access | `203.0.113.0`                 |
| `GITHUB_REPO`          | Repository path               | `username/word-guessing-game` |

## 🧪 Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# End-to-end tests
npm run test:e2e

# Security audit
npm run security:audit
```

## 🚀 Deployment

### GitHub Actions CI/CD

The project includes comprehensive CI/CD pipelines:

- **Pull Request Validation**: Lint, test, security scan
- **Continuous Integration**: Multi-version testing
- **Docker Build**: Automated image creation
- **Continuous Deployment**: Staging and production deployment

### Manual Deployment

1. **Prepare Secrets**

   ```bash
   # Generate GitHub secrets
   npm run infra:secrets

   # Add secrets to repository settings
   # See: wiki/GITHUB_SECRETS_TEMPLATE.md
   ```

2. **Provision Infrastructure**

   ```bash
   # Staging environment
   npm run deploy:staging -- -ServerName "word-game-z01"

   # Production environment
   npm run deploy:production -- -ServerName "word-game-p01"
   ```

3. **Configure DNS**

   ```bash
   # Update DNS records to point to server IP
   # See deployment output for specific instructions
   ```

4. **SSL Certificate**
   ```bash
   # SSH to server and configure certbot
   ssh wordgame@your-server-ip -p 2025
   sudo certbot --nginx -d yourdomain.com
   ```

### Deployment Environments

| Environment | URL                            | Purpose           |
| ----------- | ------------------------------ | ----------------- |
| Development | http://localhost:3000          | Local development |
| Staging     | https://staging.yourdomain.com | Testing and QA    |
| Production  | https://yourdomain.com         | Live application  |

## 📊 Monitoring

### Health Checks

```bash
# Application health
npm run health:check

# Service status (on server)
systemctl status word-guessing-game

# View logs
npm run monitoring:logs
```

### Log Files

- Application: `/var/log/word-guessing-game.log`
- Setup: `/var/log/word-guessing-game-setup.log`
- System: `/var/log/syslog`
- SSH: `/var/log/auth.log`

### Performance Metrics

- Response time monitoring
- Database connection pooling
- Redis cache hit rates
- CPU and memory usage

## 🔒 Security

### Security Features

- **Hardened SSH**: Key-based auth, custom ports, fail2ban
- **Firewall**: UFW with minimal open ports
- **Updates**: Automatic security updates
- **Monitoring**: Real-time intrusion detection
- **Secrets**: Environment-based configuration

### Security Checklist

- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] Firewall configured and active
- [ ] Fail2ban monitoring SSH
- [ ] SSL certificate installed
- [ ] Database access restricted
- [ ] Regular security updates
- [ ] Log monitoring configured

## 🛠️ Development

### Project Structure

```
word-guessing-game/
├── src/                    # Application source code
├── tests/                  # Test suites
├── scripts/                # Application scripts
├── infrastructure/         # Infrastructure automation and server files
├── .github/                # GitHub Actions workflows and config
├── .devcontainer/          # Development container config
├── docker-compose.yml      # Local development services
├── Dockerfile              # Application container
└── package.json            # Project configuration
```

### Development Scripts

```bash
# Setup development environment
npm run prepare-dev

# Start with hot reload
npm run dev

# Code quality
npm run lint:fix
npm run format

# Database operations
npm run db:migrate
npm run db:seed
npm run db:reset
```

### Docker Development

```bash
# Build and run containers
npm run docker:build
npm run docker:run

# View logs
npm run docker:logs

# Clean up
npm run docker:clean
```

## 📚 Documentation

- [GitHub Secrets Setup](wiki/GITHUB_SECRETS_TEMPLATE.md)
- [GitHub Variables Setup](wiki/GITHUB_VARIABLES_TEMPLATE.md)
- [Linux VM Setup Guide](wiki/setup-linux-vm.md)
- [Troubleshooting Guide](wiki/TROUBLESHOOTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Run quality checks: `npm run lint && npm test`
5. Commit changes: `git commit -m "Add new feature"`
6. Push to branch: `git push origin feature/new-feature`
7. Create a Pull Request

## 📝 License

This project is released into the public domain under the
[Unlicense](LICENSE).

## 🆘 Support

- **Issues**:
  [GitHub Issues](https://github.com/YOUR_USERNAME/word-guessing-game/issues)
- **Discussions**:
  [GitHub Discussions](https://github.com/YOUR_USERNAME/word-guessing-game/discussions)
- **Documentation**: See `wiki/` directory

---

**Happy Gaming! 🎮**
