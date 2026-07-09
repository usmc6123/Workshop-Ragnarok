# Gemini Development Guidelines - DO NOT VIOLATE

## Files That Must NEVER Be Modified
- backend/Dockerfile
- backend/ingestion.js
- docker-compose.yml
- package-lock.json
- backend/package-lock.json
- post-rebuild.sh
- lemon-server/ (entire folder)
- GEMINI.md (this file)

## Critical Values That Must NEVER Change
- In backend/server.js, distPath must always be:
  const distPath = path.join(__dirname, 'dist');
  NEVER use '../dist'

- In backend/Dockerfile:
  ENV NODE_ENV=production must exist
  COPY --from=frontend-builder /app/dist ./dist (NOT ./public)

- In package.json dev script must always be: "dev": "vite"
