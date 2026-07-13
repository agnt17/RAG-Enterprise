#!/bin/bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port $PORT

# Locally running backend server: 
# uvicorn main:app --host 0.0.0.0 --port 8000