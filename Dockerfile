FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Bundle app source
COPY . .

# Create directories for logs and screenshots
RUN mkdir -p logs screenshots

EXPOSE 3000

CMD [ "node", "src/server.js" ]
