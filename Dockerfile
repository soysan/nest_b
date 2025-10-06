ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS build
RUN npm run build
RUN npm prune --omit=dev

FROM node:${NODE_VERSION}-slim AS production

WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules

COPY ./src ./src

EXPOSE 3000
CMD ["node", "dist/main"]
