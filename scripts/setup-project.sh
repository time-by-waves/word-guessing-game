#!/bin/bash

# Infrastructure-as-Code deployment script for Word Guessing Game
# Suitable for automated deployment in staging/production environments
# Handles VM setup, dependencies, and application deployment

set -e # Exit on error

# Configuration
ENVIRONMENT="${ENVIRONMENT:-staging}"
PROJECT_NAME="word-guessing-game"
APP_USER="${APP_USER:-wordgame}"
APP_DIR="/opt/${PROJECT_NAME}"
LOG_FILE="/var/log/${PROJECT_NAME}-setup.log"

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if running as root
check_root() {
  if [[ $EUID -eq 0 ]]; then
    log "⚠️ Running as root. Consider using sudo for specific commands."
  fi
}

# Function to generate secrets
generate_secret() {
  openssl rand -base64 32
}

log "🎮 Word Guessing Game - Infrastructure Setup"
log "Environment: $ENVIRONMENT"
log "============================================="

check_root

# System updates and hardening
log "📦 Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget gnupg2 software-properties-common \
  apt-transport-https ca-certificates lsb-release ufw fail2ban \
  unattended-upgrades htop git

# Create application user if it doesn't exist
if ! id "$APP_USER" &>/dev/null; then
  log "👤 Creating application user: $APP_USER"
  adduser --system --group --home "/home/$APP_USER" \
    --shell /bin/bash "$APP_USER"
  usermod -aG sudo "$APP_USER"
fi

# Install Node.js (latest LTS)
if ! command_exists node; then
  log "📦 Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
  apt-get install -y nodejs
  log "✅ Node.js $(node --version) installed"
else
  log "✅ Node.js $(node --version) already installed"
fi

# Install Docker
if ! command_exists docker; then
  log "🐳 Installing Docker..."
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg |
    gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) \
        signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
        https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" |
    tee /etc/apt/sources.list.d/docker.list >/dev/null
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-compose-plugin
  usermod -aG docker "$APP_USER"

  # Configure Docker to respect UFW
  mkdir -p /etc/docker
  cat >/etc/docker/daemon.json <<'EOF'
{
  "iptables": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
  systemctl restart docker
  log "✅ Docker installed and configured"
else
  log "✅ Docker already installed"
fi

# Configure firewall
log "🔥 Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (assume custom port from environment)
SSH_PORT="${SSH_PORT:-22}"
ufw allow "$SSH_PORT"/tcp comment 'SSH access'

# Allow HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow application port (restricted to localhost)
APP_PORT="${APP_PORT:-3000}"
ufw allow from 127.0.0.1 to any port "$APP_PORT" comment 'App localhost'

# Allow database access from Bastion host IP if provided
if [[ -n "$BASTION_HOST_IP" ]]; then
  ufw allow from "$BASTION_HOST_IP" to any port 5432 comment 'PostgreSQL Bastion host'
  ufw allow from "$BASTION_HOST_IP" to any port 6379 comment 'Redis Bastion host'
  ufw allow from "$BASTION_HOST_IP" to any port "$APP_PORT" comment 'App Bastion host'
  log "✅ Bastion host IP ($BASTION_HOST_IP) access configured"
fi

ufw --force enable
log "✅ Firewall configured and enabled"

# Configure Fail2Ban
log "🛡️  Configuring Fail2Ban..."
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
cat >>/etc/fail2ban/jail.local <<EOF
[sshd]
enabled = true
port = $SSH_PORT
maxretry = 4
bantime = 3600
findtime = 600
EOF
systemctl restart fail2ban
log "✅ Fail2Ban configured"

# System hardening
log "🔒 Applying system hardening..."
cat >>/etc/sysctl.conf <<'EOF'
# Network hardening
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv6.conf.all.disable_ipv6 = 1
EOF
sysctl -p

# Disable unused filesystems
for fs in cramfs freevxfs jffs2 hfs hfsplus udf; do
  echo "install $fs /bin/true" |
    tee "/etc/modprobe.d/disable_$fs.conf" >/dev/null
done

# Configure automatic security updates
dpkg-reconfigure -f noninteractive unattended-upgrades
log "✅ System hardening applied"

# Setup application directory
log "📁 Setting up application directory..."
mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR"

# Clone or update repository
cd "$APP_DIR"
if [[ ! -d ".git" ]]; then
  log "📥 Cloning repository..."
  if [[ -n "$GITHUB_TOKEN" ]]; then
    git clone "https://$GITHUB_TOKEN@github.com/$GITHUB_REPO" .
  else
    git clone "https://github.com/$GITHUB_REPO" .
  fi

  # Checkout appropriate branch based on environment
  DEPLOY_BRANCH="${DEPLOY_BRANCH:-${ENVIRONMENT}}"
  if [[ "$DEPLOY_BRANCH" != "main" ]]; then
    log "🔄 Checking out $DEPLOY_BRANCH branch..."
    if git rev-parse --verify "origin/$DEPLOY_BRANCH" &>/dev/null; then
      git checkout -b "$DEPLOY_BRANCH" "origin/$DEPLOY_BRANCH"
    else
      log "⚠️ Branch $DEPLOY_BRANCH not found, staying on main"
    fi
  fi

  chown -R "$APP_USER:$APP_USER" .
else
  log "🔄 Updating repository..."
  # Determine which branch to pull based on environment
  CURRENT_BRANCH=$(sudo -u "$APP_USER" git rev-parse --abbrev-ref HEAD)
  DEPLOY_BRANCH="${DEPLOY_BRANCH:-${ENVIRONMENT}}"

  if [[ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]]; then
    if sudo -u "$APP_USER" git rev-parse --verify "origin/$DEPLOY_BRANCH" &>/dev/null; then
      log "🔄 Switching to $DEPLOY_BRANCH branch..."
      sudo -u "$APP_USER" git checkout -b "$DEPLOY_BRANCH" "origin/$DEPLOY_BRANCH" ||
        sudo -u "$APP_USER" git checkout "$DEPLOY_BRANCH"
    else
      log "⚠️ Branch $DEPLOY_BRANCH not found, using current branch $CURRENT_BRANCH"
    fi
  fi

  sudo -u "$APP_USER" git pull origin "$CURRENT_BRANCH"
fi

# Install application dependencies
log "📦 Installing application dependencies..."
# Install dependencies based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
  log "🔧 Installing production dependencies only..."
  sudo -u "$APP_USER" npm ci --omit=dev # Modern equivalent of --only=production
else
  log "🔧 Installing all dependencies (including dev)..."
  sudo -u "$APP_USER" npm ci
fi

# Generate or load secrets
log "🔐 Setting up secrets..."
ENV_FILE="$APP_DIR/.env.${ENVIRONMENT}"

if [[ ! -f "$ENV_FILE" ]]; then
  log "📝 Generating environment configuration..."
  cat >"$ENV_FILE" <<EOF
NODE_ENV=$ENVIRONMENT
PORT=$APP_PORT

# Database Configuration
DATABASE_URL=${DATABASE_URL:-postgresql://wordgame:$(generate_secret | tr -d '\n')@localhost:5432/wordgame_$ENVIRONMENT}

# Redis Configuration
REDIS_URL=${REDIS_URL:-redis://localhost:6379}

# Security Secrets
SESSION_SECRET=${SESSION_SECRET:-$(generate_secret)}
JWT_SECRET=${JWT_SECRET:-$(generate_secret)}

# Application Configuration
CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:$APP_PORT}
LOG_LEVEL=${LOG_LEVEL:-info}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-900000}
RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-100}
EOF
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log "✅ Environment file created: $ENV_FILE"
else
  log "✅ Environment file exists: $ENV_FILE"
fi

# Setup Docker network
log "🐳 Setting up Docker network..."
if ! docker network ls | grep -q "${PROJECT_NAME}_network"; then
  docker network create --subnet=172.20.0.0/24 "${PROJECT_NAME}_network"
  log "✅ Docker network created"
fi

# Start services
log "🚀 Starting services..."
sudo -u "$APP_USER" docker compose -f "$APP_DIR/docker-compose.yml" \
  --env-file "$ENV_FILE" up -d

# Wait for services to be ready
log "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations
log "🗄️  Running database migrations..."
sudo -u "$APP_USER" npm run db:migrate

# Verify deployment
log "🔍 Verifying deployment..."
if curl -f "http://localhost:$APP_PORT/health" >/dev/null 2>&1; then
  log "✅ Application is responding to health checks"
else
  log "⚠️  Application health check failed"
fi

# Setup systemd service
log "📋 Setting up systemd service..."
cat >"/etc/systemd/system/${PROJECT_NAME}.service" <<EOF
[Unit]
Description=Word Guessing Game Application
After=network.target docker.service
Requires=docker.service

[Service]
Type=forking
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=$ENVIRONMENT
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${PROJECT_NAME}.service"
log "✅ Systemd service configured"

# Setup log rotation
log "📝 Setting up log rotation..."
cat >"/etc/logrotate.d/${PROJECT_NAME}" <<EOF
/var/log/${PROJECT_NAME}*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $APP_USER $APP_USER
}
EOF
log "✅ Log rotation configured"

# Setup monitoring
log "📊 Setting up basic monitoring..."
cat >"/home/$APP_USER/monitor.sh" <<'EOF'
#!/bin/bash
# Basic monitoring script
LOG_FILE="/var/log/word-guessing-game-monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if application is responding
if ! curl -f "http://localhost:3000/health" >/dev/null 2>&1; then
    log "❌ Application health check failed - restarting service"
    systemctl restart word-guessing-game
else
    log "✅ Application health check passed"
fi

# Log resource usage
log "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)"
log "Memory: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
log "Disk: $(df -h / | awk 'NR==2{print $5}')"
EOF

chmod +x "/home/$APP_USER/monitor.sh"
chown "$APP_USER:$APP_USER" "/home/$APP_USER/monitor.sh"

# Add cron job for monitoring
(
  crontab -u "$APP_USER" -l 2>/dev/null
  echo "*/5 * * * * /home/$APP_USER/monitor.sh"
) |
  crontab -u "$APP_USER" -
log "✅ Monitoring configured"

# Final summary
log ""
log "🎉 Deployment complete!"
log "======================"
log ""
log "📋 Deployment summary:"
log "   Environment: $ENVIRONMENT"
log "   Application: http://localhost:$APP_PORT"
log "   User: $APP_USER"
log "   Directory: $APP_DIR"
log "   Environment file: $ENV_FILE"
log "   Log file: $LOG_FILE"
log ""
log "📊 Service status:"
systemctl is-active docker && log "   Docker: ✅ Active" || log "   Docker: ❌ Inactive"
systemctl is-active "${PROJECT_NAME}" && log "   Application: ✅ Active" || log "   Application: ❌ Inactive"
systemctl is-active fail2ban && log "   Fail2Ban: ✅ Active" || log "   Fail2Ban: ❌ Inactive"
ufw status | grep -q "Status: active" && log "   Firewall: ✅ Active" || log "   Firewall: ❌ Inactive"
log ""
log "📝 Next steps:"
log "   1. Update DNS to point to this server"
log "   2. Configure SSL certificate (certbot)"
log "   3. Set up backup strategy"
log "   4. Monitor logs: tail -f $LOG_FILE"
log ""
log "🔧 Management commands:"
log "   Start:   systemctl start ${PROJECT_NAME}"
log "   Stop:    systemctl stop ${PROJECT_NAME}"
log "   Restart: systemctl restart ${PROJECT_NAME}"
log "   Status:  systemctl status ${PROJECT_NAME}"
log "   Logs:    journalctl -u ${PROJECT_NAME} -f"
log ""
log "Happy deployment! 🚀"
