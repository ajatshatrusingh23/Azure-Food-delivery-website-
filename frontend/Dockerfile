FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Rewrites (/api -> backend) and the public socket URL are fixed at build time.
ARG BACKEND_URL=http://backend:5001
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
ENV BACKEND_URL=$BACKEND_URL NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
RUN npx next build

# Next.js standalone output: a minimal server with only the files it needs.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
