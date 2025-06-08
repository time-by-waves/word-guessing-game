# GitHub Secrets Configuration Template

This file contains all the secrets you need to configure in your GitHub repository for the CI/CD pipelines to work correctly.

## How to Add Secrets

1. Go to your repository: `https://github.com/YOUR_USERNAME/word-guessing-game`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below with the name and value specified

## Required Secrets

### 🔷 Azure Container Registry

| Secret Name               | Description                       | Example Value                                            |
| ------------------------- | --------------------------------- | -------------------------------------------------------- |
| `AZURE_REGISTRY_URL`      | Your Azure Container Registry URL | `myregistry.azurecr.io`                                  |
| `AZURE_REGISTRY_USERNAME` | ACR Username                      | `myregistry`                                             |
| `AZURE_REGISTRY_PASSWORD` | ACR Password                      | Get from Azure Portal → Container Registry → Access keys |

### 🔷 Azure Web Apps

| Secret Name                            | Description                | How to Get                                                   |
| -------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `AZURE_WEBAPP_PUBLISH_PROFILE_STAGING` | Staging publish profile    | Azure Portal → Staging Web App → Download publish profile    |
| `AZURE_WEBAPP_PUBLISH_PROFILE_PROD`    | Production publish profile | Azure Portal → Production Web App → Download publish profile |

### 🔷 Binary Lane Deployment

| Secret Name           | Description         | Example/How to Get                     |
| --------------------- | ------------------- | -------------------------------------- |
| `BINARYLANE_HOST`     | Server IP or domain | `203.0.113.0` or `game.yourdomain.com` |
| `BINARYLANE_USERNAME` | SSH username        | `root` or `deploy`                     |
| `BINARYLANE_SSH_KEY`  | Private SSH key     | See "Generating SSH Key" below         |
| `BINARYLANE_URL`      | Public URL          | `https://game.yourdomain.com`          |

### 🔷 Database Secrets

| Secret Name            | Description               | Example Value                                                 |
| ---------------------- | ------------------------- | ------------------------------------------------------------- |
| `STAGING_DATABASE_URL` | Staging PostgreSQL URL    | `postgresql://user:pass@host:5432/staging_db?sslmode=require` |
| `PROD_DATABASE_URL`    | Production PostgreSQL URL | `postgresql://user:pass@host:5432/prod_db?sslmode=require`    |

### 🔷 Redis Secrets

| Secret Name         | Description          | Example Value                                 |
| ------------------- | -------------------- | --------------------------------------------- |
| `STAGING_REDIS_URL` | Staging Redis URL    | `redis://default:password@host:6380?tls=true` |
| `PROD_REDIS_URL`    | Production Redis URL | `redis://default:password@host:6380?tls=true` |

### 🔷 Application Secrets

| Secret Name              | Description               | How to Generate           |
| ------------------------ | ------------------------- | ------------------------- |
| `STAGING_SESSION_SECRET` | Staging session secret    | `openssl rand -base64 32` |
| `STAGING_JWT_SECRET`     | Staging JWT secret        | `openssl rand -base64 32` |
| `PROD_SESSION_SECRET`    | Production session secret | `openssl rand -base64 32` |
| `PROD_JWT_SECRET`        | Production JWT secret     | `openssl rand -base64 32` |

### 🔷 Frontend Configuration

| Secret Name    | Description                                            | Example Value                                                            |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `FRONTEND_URL` | URL of the deployed frontend for CORS, redirects, etc. | `https://staging.wordguessinggame.com` or `https://wordguessinggame.com` |

### 🔷 Optional Services

| Secret Name        | Description                  | Where to Get                                                     |
| ------------------ | ---------------------------- | ---------------------------------------------------------------- |
| `CODECOV_TOKEN`    | Code coverage reporting      | [codecov.io](https://codecov.io) → Your repo → Settings          |
| `AZURE_PROD_URL`   | Production URL for E2E tests | Your Azure Web App URL                                           |
| `SENDGRID_API_KEY` | Email service                | [SendGrid Dashboard](https://app.sendgrid.com) → API Keys        |
| `SENTRY_DSN`       | Error tracking               | [Sentry Dashboard](https://sentry.io) → Project → Settings → DSN |

## Generating SSH Key for Binary Lane

```bash
# Generate new SSH key pair
ssh-keygen -t ed25519 -C "github-actions@word-game" -f deploy_key -N ""

# Copy private key to GitHub secret BINARYLANE_SSH_KEY
cat deploy_key

# Copy public key to your server
ssh root@your-server-ip
echo "YOUR_PUBLIC_KEY_CONTENT" >> ~/.ssh/authorized_keys

# Clean up local keys
rm deploy_key deploy_key.pub
```

## Testing Your Secrets

After adding all secrets, test them by:

1. **Push to staging branch**: Verify staging deployment works
2. **Push to main branch**: Verify production deployment works
3. **Check Actions tab**: Look for any secret-related errors

## Security Checklist

- [ ] All secrets use strong, unique values
- [ ] Production secrets differ from staging secrets
- [ ] SSH keys are ED25519 or RSA-4096
- [ ] Database URLs use SSL/TLS
- [ ] No secrets are committed to the repository
- [ ] Access to secrets is limited to necessary team members

## Example Secret Values (DO NOT USE IN PRODUCTION)

```yaml
# These are examples only - generate your own!
STAGING_SESSION_SECRET: "Rt2u5A7x+KbPeShVmYq3t6w9z$C&F)J@"
STAGING_JWT_SECRET: "5v8y/B?E(H+MbQeThWmZq4t7w9z$C&F)"
AZURE_REGISTRY_URL: "wordguessinggame.azurecr.io"
BINARYLANE_HOST: "203.0.113.42"
```

## Troubleshooting

### Secret not found errors
- Check secret name matches exactly (case-sensitive)
- Ensure secret is in the correct repository
- Verify you're using the correct environment

### Authentication failures
- Regenerate passwords/tokens
- Check for special characters that need escaping
- Verify credentials work locally first

### SSH connection issues
- Ensure public key is in server's authorized_keys
- Check SSH key format (should start with ssh-ed25519 or ssh-rsa)
- Verify server allows key-based authentication
