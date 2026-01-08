---
description: Stop all locally running apps in this workspace
---

1. Stop Portal (Port 3000)
// turbo
2. lsof -ti :3000 | xargs kill || true

3. Stop Checkmate (Port 3001)
// turbo
4. lsof -ti :3001 | xargs kill || true

5. Stop Stash (Port 3002)
// turbo
6. lsof -ti :3002 | xargs kill || true