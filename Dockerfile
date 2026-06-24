FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN mkdir -p /app/uploads

ENV PORT=8080

EXPOSE 8080

CMD ["npx", "tsx", "src/index.ts"]
