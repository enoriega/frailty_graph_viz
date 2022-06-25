""" Starts the backend """

import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .dependencies import get_evidence_sentences_and_frequencies
from .api import api_router
from .viz_api import api_router as viz_api_router

logger = logging.getLogger("frailty_viz_main")

logger.addHandler(logging.StreamHandler())

# Load the data beforehand. This is necessary because React sometimes refreshes component multiple times when loading for first time. Which runs this function multiple times perallally in different threads (and LRU does not become effective)
get_evidence_sentences_and_frequencies()

app = FastAPI(title="Frailty Visualization REST API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(viz_api_router)
