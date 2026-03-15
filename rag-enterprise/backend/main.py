from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import get_db, create_tables, User
from auth import (hash_password, verify_password, create_token,
                  get_current_user, verify_google_token,
                  get_or_create_google_user)
from ingest import ingest_pdf
import shutil, os, uuid
from datetime import datetime

create_tables()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://rag-enterprise.vercel.app"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CORS (Cross-Origin Resource Sharing) is a browser security feature. When your React app at localhost:5173 makes a request to localhost:8000, the browser blocks it by default because they're on different ports. This middleware tells FastAPI to add headers saying "yes, requests from 5173 are allowed." Without this, your frontend gets a CORS error even though both are on your machine.


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    token: str   # the ID token Google gives the frontend

class QueryRequest(BaseModel):
    question: str
    

@app.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email already taken
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        id              = str(uuid.uuid4()),
        email           = req.email,
        name            = req.name,
        hashed_password = hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"email": user.email, "name": user.name, "picture": user.picture}}

@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password or ""):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"email": user.email, "name": user.name, "picture": user.picture}}

@app.post("/auth/google")
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    google_info = verify_google_token(req.token)
    user  = get_or_create_google_user(db, google_info)
    token = create_token(user.id, user.email)
    return {"token": token, "user": {"email": user.email, "name": user.name, "picture": user.picture}}

@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    # Returns current logged-in user's info
    return {"email": current_user.email, "name": current_user.name,
            "picture": current_user.picture, "plan": current_user.plan}
   

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),  # 🔒 protected
    db: Session = Depends(get_db)
):
    file_path = f"uploads/{current_user.id}_{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    global rag_chain
    rag_chain = None
    # Pass user_id so Pinecone uses user's own namespace
    result = ingest_pdf(file_path, namespace=current_user.id)
    return {"message": result}
# @app.post is a decorator that registers this function as the handler for POST requests to /upload. async def makes it asynchronous — FastAPI can handle other requests while waiting for file I/O. UploadFile is FastAPI's type for incoming files — it gives you the filename, content type, and a file-like object to read from.

@app.post("/query")
async def query(
    request: QueryRequest,
    current_user: User = Depends(get_current_user),  # 🔒 protected
):
    from rag import get_rag_chain
    chain = get_rag_chain(namespace=current_user.id)
    response = chain.invoke(
        {"question": request.question},
        config={"configurable": {"session_id": current_user.id}}
    )
    return {"answer": response}

@app.get("/health")
def health():
    return {"status": "ok"}