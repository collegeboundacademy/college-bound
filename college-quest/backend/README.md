# Quest Board Backend

Minimal Python backend for Quest Board progress persistence.

## Run

```bash
python3 college-quest/backend/server.py
```

Server URL:
- http://127.0.0.1:5050

API endpoints:
- GET /health
- GET /api/quest-board/state
- PUT /api/quest-board/state

State is persisted to:
- college-quest/backend/data/quest_board_state.json
