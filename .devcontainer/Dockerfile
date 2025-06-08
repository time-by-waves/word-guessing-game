FROM mcr.microsoft.com/devcontainers/javascript-node:20-bullseye

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
  && apt-get -y install --no-install-recommends \
  postgresql-client \
  redis-tools \
  chromium \
  chromium-driver \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g \
  nodemon \
  jest \
  eslint \
  prettier \
  typescript \
  @playwright/test \
  npm-check-updates \
  concurrently \
  wait-on

# Create workspace directory
RUN mkdir -p /workspace && chown node:node /workspace

# Switch to node user
USER node

# Set up npm to use a local cache
RUN mkdir -p /home/node/.npm-global \
  && npm config set prefix '/home/node/.npm-global' \
  && echo 'export PATH=/home/node/.npm-global/bin:$PATH' >> /home/node/.bashrc

WORKDIR /workspace
