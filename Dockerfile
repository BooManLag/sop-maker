FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npm_ca \
    if [ -f /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi; \
    npm ci --no-audit --no-fund
FROM dependencies AS build
COPY . .
RUN npm run build
FROM node:24-bookworm-slim AS runtime
RUN --mount=type=secret,id=npm_ca,mode=0444 \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources && \
    if [ -f /run/secrets/npm_ca ]; then \
      export https_proxy="${HTTPS_PROXY:-}"; \
      printf 'Acquire::https::CaInfo "/run/secrets/npm_ca";\n' > /etc/apt/apt.conf.d/99-build-ca; \
    fi && \
    apt-get update && apt-get upgrade -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* /etc/apt/apt.conf.d/99-build-ca \
      /usr/local/lib/node_modules/npm /opt/yarn-* && \
    rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
WORKDIR /app
ENV NODE_ENV=production
ENV GOOD_EXCEPTION_MODE=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
RUN mkdir -p /app/.demo-data && chown node:node /app/.demo-data
ENV GOOD_EXCEPTION_DATA_DIR=/app/.demo-data
USER node
EXPOSE 8080
CMD ["node", "server.js"]
