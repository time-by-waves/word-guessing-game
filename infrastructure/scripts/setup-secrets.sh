#!/bin/bash

# Script to generate secrets for GitHub Actions and local development
# Run this locally to get secrets for GitHub repository configuration

echo "🔐 GitHub Actions Secrets Generator"
echo "=================================="
echo ""

# Function to generate random secret
generate_secret() {
  openssl rand -base64 32
}

# Generate application secrets
echo "📝 Application Secrets:"
echo "Copy these to GitHub repository secrets..."
echo ""
echo "# Environment: Staging"
echo "STAGING_SESSION_SECRET=$(generate_secret)"
echo "STAGING_JWT_SECRET=$(generate_secret)"
echo "STAGING_DATABASE_URL=postgresql://wordgame:$(generate_secret | head -c 16)@staging-server:5432/wordgame_staging"
echo ""
echo "# Environment: Production"
echo "PROD_SESSION_SECRET=$(generate_secret)"
echo "PROD_JWT_SECRET=$(generate_secret)"
echo "PROD_DATABASE_URL=postgresql://wordgame:$(generate_secret | head -c 16)@prod-server:5432/wordgame_production"
echo ""

# Server configuration
echo "📡 Server Configuration:"
echo ""
echo "# Infrastructure"
echo "BINARYLANE_API_TOKEN=<your_binary_lane_api_token>"
echo "BASTION_HOST_IP=<your_Bastion host_public_ip>"
echo "SSH_PORT=<custom_ssh_port_number>"
echo ""

# Generate SSH key for deployment
read -p "Generate deployment SSH key? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  KEY_NAME="deploy_key_$(date +%s)"
  ssh-keygen -t ed25519 -C "github-actions@word-game" -f "./$KEY_NAME" -N ""
  echo ""
  echo "🔑 Deployment SSH Key Generated!"
  echo ""
  echo "Add this PRIVATE key to GitHub secret 'DEPLOY_SSH_KEY':"
  echo "================================================"
  cat "./$KEY_NAME"
  echo "================================================"
  echo ""
  echo "Add this PUBLIC key to server ~/.ssh/authorized_keys:"
  echo "================================================"
  cat "./$KEY_NAME.pub"
  echo "================================================"
  echo ""
  echo "⚠️  Delete these files after copying: $KEY_NAME and $KEY_NAME.pub"
fi

echo ""
echo "📌 Setup Instructions:"
echo "1. Go to: https://github.com/YOUR_USERNAME/word-guessing-game/settings/secrets/actions"
echo "2. Add all the secrets listed above"
echo "3. Update the deployment workflow with your server details"
echo "4. Push to trigger deployment"
echo ""
echo "For complete setup, see wiki/setup-linux-vm.md"
