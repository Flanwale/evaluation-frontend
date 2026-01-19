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

ENV NEXT_PUBLIC_DISABLE_TURNSTILE=${NEXT_PUBLIC_DISABLE_TURNSTILE}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}

# 你这里 prisma generate 如果只是为了类型/构建可以保留；若没用可删
ENV DATABASE_URL=""
RUN npx prisma generate

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /opt
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat

COPY --from=builder /opt /opt
EXPOSE 3000

# ===== ✅ runtime env (double insurance) =====
ENV NEXT_PUBLIC_DISABLE_TURNSTILE=1

CMD ["npm", "run", "start"]
