# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Dependencies (캐시 레이어 - package.json 안 바뀌면 여기까지 캐시)
COPY package*.json ./
COPY prisma ./prisma/

# npm ci with cache mount (빌드 속도 향상)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Prisma client 생성
RUN npx prisma generate

# Source code (여기서부터는 코드 바뀌면 재실행)
COPY . .

# Build with cache mount (next cache 재사용)
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma client 복사 (중요!)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
