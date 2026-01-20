# # ===== Frontend Dockerfile (Next.js) =====
# FROM node:20-alpine AS deps
# WORKDIR /opt
# RUN apk add --no-cache openssl libc6-compat
# COPY package.json package-lock.json* /opt/
# RUN npm ci

# FROM node:20-alpine AS builder
# WORKDIR /opt
# RUN apk add --no-cache openssl libc6-compat
# COPY --from=deps /opt/node_modules /opt/node_modules
# COPY . /opt

# # ===== ✅ build-time env for Next public vars =====
# ARG NEXT_PUBLIC_DISABLE_TURNSTILE=1
# ARG NEXT_PUBLIC_APP_URL=""
# ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""

# ENV NEXT_PUBLIC_DISABLE_TURNSTILE=${NEXT_PUBLIC_DISABLE_TURNSTILE}
# ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
# ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}

# # # 你这里 prisma generate 如果只是为了类型/构建可以保留；若没用可删
# # ENV DATABASE_URL=""
# # RUN npx prisma generate --schema=./prisma/schema.prisma --generator client


# RUN npm run build

# FROM node:20-alpine AS runner
# WORKDIR /opt
# ENV NODE_ENV=production
# RUN apk add --no-cache openssl libc6-compat

# # standalone 输出里已经包含可运行的 server 与必要依赖
# COPY --from=builder /opt/.next/standalone ./
# COPY --from=builder /opt/.next/static ./.next/static
# COPY --from=builder /opt/public ./public

# EXPOSE 3000
# ENV NEXT_PUBLIC_DISABLE_TURNSTILE=1

# CMD ["node", "server.js"]

# ===== Frontend Dockerfile (Next.js) =====
FROM node:20-alpine AS deps
WORKDIR /opt
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* /opt/
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /opt
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /opt/node_modules /opt/node_modules
COPY . /opt

# ===== ✅ build-time env for Next public vars =====
ARG NEXT_PUBLIC_DISABLE_TURNSTILE=1
ARG NEXT_PUBLIC_APP_URL=""
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""

ARG BACKEND_ORIGIN="http://evaluation-backend-svc:8000"
ENV BACKEND_ORIGIN=${BACKEND_ORIGIN}

ENV NEXT_PUBLIC_DISABLE_TURNSTILE=${NEXT_PUBLIC_DISABLE_TURNSTILE}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}

# ===== ✅ 关键：Prisma generate 需要 DATABASE_URL “存在” =====
# 不需要真实可连，只要不为空即可（随便填一个 mysql 连接串）
ARG DATABASE_URL="mysql://user:pass@127.0.0.1:3306/dummy"
ENV DATABASE_URL=${DATABASE_URL}

# ===== ✅ 关键：在 Linux(alpine) 内生成 Prisma Client/Engine =====
# 注意 schema 路径按你的实际位置改：./prisma/schema.prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /opt
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat

# standalone 输出里已经包含可运行的 server 与必要依赖
COPY --from=builder /opt/.next/standalone ./
COPY --from=builder /opt/.next/static ./.next/static
COPY --from=builder /opt/public ./public

# ===== ✅ 关键：standalone 可能漏 prisma 引擎/目录，手动补齐 =====
# 这两行能解决“找不到 query engine / .prisma”类问题（非常常见）
COPY --from=builder /opt/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /opt/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
ENV NEXT_PUBLIC_DISABLE_TURNSTILE=1

CMD ["node", "server.js"]
