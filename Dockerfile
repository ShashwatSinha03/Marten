FROM node:22.23.1-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends procps \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@9.15.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
RUN pnpm exec playwright install --with-deps chromium --only-shell
COPY tsconfig.json ./
COPY apps/api ./apps/api
COPY packages ./packages
RUN pnpm typecheck && mkdir -p /app/output && chown node:node /app/output
USER node
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "--import", "tsx", "apps/api/src/server.ts"]
