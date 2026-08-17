#!/bin/sh
# Container entrypoint: apply pending migrations, then hand off to the server.
set -e

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting server..."
# exec so node becomes PID 1 and receives SIGTERM from Coolify/Docker directly,
# which the graceful-shutdown handler in src/server.ts relies on.
exec node dist/src/server.js
