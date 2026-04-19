FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --fund=false

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --fund=false
COPY --from=build /app/dist ./dist
COPY server ./server

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "server/index.js"]
