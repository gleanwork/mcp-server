FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY . ./

RUN addgroup -g 1001 -S nodejs \
    && adduser -S mcpserver -u 1001 \
    && mkdir -p /app/logs \
    && chown -R mcpserver:nodejs /app /usr/local

USER mcpserver

RUN npm install -g rimraf pnpm typescript \
    && pnpm -r install

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD pgrep -f "node.*mcp-server" || exit 1

CMD ["npx", "-y", "@gleanwork/local-mcp-server"]
