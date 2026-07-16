"""
Verdant AI Backend Launcher
Run with: .\venv\Scripts\python.exe run_server.py
Runs without --reload to avoid Windows subprocess spawning the wrong Python interpreter.
To apply code changes, restart this script manually.
"""
import sys
import os

# Ensure backend/ is on sys.path so 'main' can be imported as a module
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8001,
        reload=False,   # Reload disabled: Windows spawns subprocess with wrong Python
    )
