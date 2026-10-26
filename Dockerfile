FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV HOST=0.0.0.0 PORT=3080 DEMO_MODE=true DATABASE_PATH=/app/data/cashback.sqlite
COPY --from=build /app/dist ./dist
COPY server ./server
COPY package.json ./
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3080
CMD ["node", "server/index.js"]
