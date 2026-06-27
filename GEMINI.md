# AI Assistant Instructions for Workshop: Ragnarok

## CRITICAL: Protected Files - DO NOT MODIFY OR DELETE

The following files must NEVER be modified, deleted, or staged for commit:

- `lemon-server/lemon-website` - compiled binary, cannot be regenerated
- `lemon-server/Dockerfile` - required to build the lemon-server container
- `lemon-server/.gitkeep` - keeps the folder in git
- `post-rebuild.sh` - critical deployment script with ingestion guard
- `backend/ingestion.js` - must always use INSERT OR IGNORE, never INSERT OR REPLACE
- `GEMINI.md` - this file, must never be deleted

## Git Instructions:
ONLY stage files explicitly requested. Never run `git add .` or `git add -A`.
Always use specific paths: `git add src/components/ManualView.tsx`
