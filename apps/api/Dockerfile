FROM node:22-slim AS workspace
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY e2e/package.json e2e/package.json

FROM workspace AS build-dependencies
RUN npm ci --workspace @salgae/api --workspace @salgae/core --include-workspace-root=false

FROM build-dependencies AS build
COPY apps/api apps/api
COPY packages/core packages/core
RUN npm run build --workspace @salgae/api

FROM workspace AS production-dependencies
RUN npm ci --omit=dev --workspace @salgae/api --workspace @salgae/core --include-workspace-root=false

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/dist ./dist
COPY apps/api/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/server.js"]
