from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ingest import ingest_pdf
import shutil, os

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

# Lazy load — don't connect at startup
rag_chain = None

def get_chain():
    global rag_chain
    if rag_chain is None:
        from rag import get_rag_chain
        rag_chain = get_rag_chain()
    return rag_chain

# Lazy loading pattern. global rag_chain tells Python we're modifying the module-level variable, not creating a local one. The first time get_chain() is called, it imports and initializes the RAG chain (which connects to Pinecone). Every subsequent call just returns the already-created chain. We also set it to None on upload so it reinitializes with the fresh Pinecone data.

class QueryRequest(BaseModel):
    question: str

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    file_path = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    global rag_chain
    rag_chain = None
    result = ingest_pdf(file_path)
    return {"message": result}
# @app.post is a decorator that registers this function as the handler for POST requests to /upload. async def makes it asynchronous — FastAPI can handle other requests while waiting for file I/O. UploadFile is FastAPI's type for incoming files — it gives you the filename, content type, and a file-like object to read from.

@app.post("/query")
async def query(request: QueryRequest):
    chain = get_chain()
    response = chain.invoke(
        {"question": request.question},
        config={"configurable": {"session_id": "default"}}
    )
    return {"answer": response}

@app.get("/health")
def health():
    return {"status": "ok"}