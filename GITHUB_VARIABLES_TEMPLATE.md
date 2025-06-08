# GitHub Variables Configuration Template

Add these under **Settings → Secrets and variables → Variables** in your repo.

## General

| Variable Name     | Description                        | Default / Example    |
| ----------------- | ---------------------------------- | -------------------- |
| IMAGE_NAME        | Docker image name                  | `word-guessing-game` |
| REGISTRY          | Container registry domain          | `ghcr.io`            |
| DOCKER_IMAGE_NAME | Docker image name (prod workflows) | `word-guessing-game` |
| NODE_VERSION      | Node.js version for builds         | `20.x`               |

## Azure Deployment

| Variable Name             | Description                       | Example                      |
| ------------------------- | --------------------------------- | ---------------------------- |
| AZURE_WEBAPP_NAME         | Azure Web App name (staging)      | `word-guessing-game-staging` |
| AZURE_WEBAPP_PACKAGE_PATH | Path to package for Azure Web App | `.`                          |

## Application Configuration (.env or Variables)

| Variable Name    | Description                                         | Default / Example              |
| ---------------- | --------------------------------------------------- | ------------------------------ |
| NODE_ENV         | Application environment                             | `development`                  |
| PORT             | HTTP port                                           | `3000`                         |
| LOG_LEVEL        | Logging level (`info`, `debug`, etc.)               | `info`                         |
| FRONTEND_URL     | Public URL of frontend for CORS and redirects       | `https://wordguessinggame.com` |
| TEST_TIMEOUT     | Test timeout in ms                                  | `60000`                        |
| HEADLESS_BROWSER | Use headless browser for E2E tests (`true`/`false`) | `true`                         |
