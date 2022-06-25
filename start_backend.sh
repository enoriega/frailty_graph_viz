#!/bin/sh
export $(cat ./backend/.env | xargs)
PYTHONPATH=./backend uvicorn backend.start:app --host 0.0.0.0 --port 1601