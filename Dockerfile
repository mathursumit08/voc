FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY src/backend/package.json ./src/backend/package.json
COPY src/frontend/package.json ./src/frontend/package.json
COPY src/shared/package.json ./src/shared/package.json

RUN npm install

COPY . .

RUN npm run build

EXPOSE 4000 5173

CMD ["npm", "run", "start", "--workspace", "@voc/backend"]
