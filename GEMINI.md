# AI Assistant Instructions for Workshop: Ragnarök

## CRITICAL: Protected Files — DO NOT MODIFY OR DELETE

The following files and directories must NEVER be modified, deleted, or staged for commit under any circumstances:

### Permanently Protected:
- `lemon-server/lemon-website` — compiled binary, cannot be regenerated
- `lemon-server/Dockerfile` — required to build the lemon-server container
- `lemon-server/.gitkeep` — keeps the folder in git
- `post-rebuild.sh` — critical deployment script with ingestion guard
- `backend/ingestion.js` — database ingestion pipeline, must use INSERT OR IGNORE and vehicles array check

### Ingestion Rules (backend/ingestion.js):
- ALWAYS use `INSERT OR IGNORE` — never `INSERT OR REPLACE`
- ALWAYS check `dataset.vehicles` before `Object.values(dataset)`
- These two rules are permanent and must never be changed

## Safe to Edit:
- `src/` — all frontend React/TypeScript files
- `backend/server.js` — backend API server
- `backend/package.json` — dependencies

## Git Instructions:
When committing, ONLY stage files that were explicitly requested to be changed.
Never run `git add .` or `git add -A`.
Always use specific file paths: `git add src/components/BrowseView.tsx`
