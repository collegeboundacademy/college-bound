#!/usr/bin/env python3
"""Simple Quest Board backend API.

Run:
  python3 college-quest/backend/server.py
"""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = 5050

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
STATE_FILE = DATA_DIR / "quest_board_state.json"

DEFAULT_STATE = {
    "player": {
        "name": "Student",
        "level": 1,
        "xp": 35,
        "xpNeeded": 100,
        "coins": 12,
        "streak": 2,
    },
    "dailyQuests": [
        {
            "id": "ask-expert",
            "title": "Ask the Expert",
            "description": "Ask a teacher, counselor, or adult one question about college.",
            "xpReward": 20,
            "coinReward": 5,
            "type": "daily",
            "completed": False,
            "icon": "💬",
        },
        {
            "id": "college-deep-dive",
            "title": "College Deep Dive",
            "description": "Spend 5 minutes researching one college.",
            "xpReward": 15,
            "coinReward": 3,
            "type": "daily",
            "completed": False,
            "icon": "🔎",
        },
        {
            "id": "future-reflection",
            "title": "Future Reflection",
            "description": "Write down 3 goals, interests, or future ideas.",
            "xpReward": 10,
            "coinReward": 0,
            "type": "daily",
            "completed": False,
            "icon": "📝",
        },
    ],
    "majorQuests": [
        {
            "id": "join-something",
            "title": "Join Something",
            "description": "Try a club, activity, or school event.",
            "xpReward": 25,
            "coinReward": 10,
            "type": "major",
            "completed": False,
            "icon": "🎯",
        },
        {
            "id": "talk-counselor",
            "title": "Talk to a Counselor",
            "description": "Have a real conversation about your future path.",
            "xpReward": 25,
            "coinReward": 5,
            "type": "major",
            "completed": False,
            "icon": "🧭",
        },
        {
            "id": "scholarship-scout",
            "title": "Scholarship Scout",
            "description": "Find one scholarship or financial aid opportunity.",
            "xpReward": 20,
            "coinReward": 4,
            "type": "major",
            "completed": False,
            "icon": "🎓",
        },
    ],
    "bonusQuest": {
        "id": "campus-curiosity",
        "title": "Campus Curiosity",
        "description": "Ask someone what they studied after high school and what they learned from it.",
        "xpReward": 30,
        "coinReward": 10,
        "type": "bonus",
        "completed": False,
        "icon": "🌟",
    },
    "badges": [
        {"id": "first-step", "label": "First Step", "icon": "🥾", "unlocked": False},
        {"id": "on-a-roll", "label": "On a Roll", "icon": "🔥", "unlocked": False},
        {"id": "explorer", "label": "Explorer", "icon": "🧠", "unlocked": False},
        {"id": "scholarship-scout", "label": "Scholarship Scout", "icon": "🏅", "unlocked": False},
    ],
}


def ensure_state_file():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not STATE_FILE.exists():
        write_state(DEFAULT_STATE)


def read_state():
    ensure_state_file()
    return json.loads(STATE_FILE.read_text(encoding="utf-8"))


def write_state(state):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


class QuestBoardHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        if self.path == "/health":
            self._set_headers(200)
            self.wfile.write(b'{"ok": true}')
            return

        if self.path == "/api/quest-board/state":
            try:
                state = read_state()
                self._set_headers(200)
                self.wfile.write(json.dumps(state, ensure_ascii=False).encode("utf-8"))
            except Exception as exc:  # noqa: BLE001
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(b'{"error": "Not Found"}')

    def do_PUT(self):
        if self.path != "/api/quest-board/state":
            self._set_headers(404)
            self.wfile.write(b'{"error": "Not Found"}')
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(body)

            required_keys = ["player", "dailyQuests", "majorQuests", "bonusQuest", "badges"]
            missing = [key for key in required_keys if key not in payload]
            if missing:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": f"Missing keys: {', '.join(missing)}"}).encode("utf-8"))
                return

            write_state(payload)
            self._set_headers(200)
            self.wfile.write(b'{"saved": true}')
        except json.JSONDecodeError:
            self._set_headers(400)
            self.wfile.write(b'{"error": "Invalid JSON"}')
        except Exception as exc:  # noqa: BLE001
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))


def run_server():
    ensure_state_file()
    server = HTTPServer((HOST, PORT), QuestBoardHandler)
    print(f"Quest Board backend running at http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
