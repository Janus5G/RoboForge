FROM node:22-bookworm-slim AS build
WORKDIR /app/frontend
COPY frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html ./
COPY frontend/public ./public
COPY frontend/src ./src
RUN npm install --no-audit --no-fund && npm run build
FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app
COPY backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist
USER node
EXPOSE 3001
CMD ["node", "backend/server.js"]
