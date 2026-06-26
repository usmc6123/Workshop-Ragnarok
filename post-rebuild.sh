#!/bin/bash
mkdir -p /workspace/data/charm /workspace/data/lemon
cp "/mnt/m/e9dfaf202d2b8b99988d2e87517b7a90eb73ad92/lemon-manuals/charm/index.json" /workspace/data/charm/index.json
cp "/mnt/m/e9dfaf202d2b8b99988d2e87517b7a90eb73ad92/lemon-manuals/lemon/index.json" /workspace/data/lemon/index.json
docker exec ragnarok-backend node ingestion.js
docker exec ragnarok-backend sh -c "INDEX_JSON_PATH=/data/lemon/index.json node ingestion.js"
