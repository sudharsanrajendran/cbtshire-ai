from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .db import Base, engine, ensure_sqlite_schema, seed_initial_data
from .routes.auth import router as auth_router
from .routes.dashboard import router as dashboard_router
from .routes.recruitment import router as recruitment_router
from .routes.ai import router as ai_router
from .routes.advanced import router as advanced_router
from .routes.public import router as public_router
from .routes.integrations import router as integrations_router
from . import models

settings = get_settings()
Base.metadata.create_all(bind=engine)
ensure_sqlite_schema()
seed_initial_data()
app = FastAPI(title='Cbtshire.ai API', version='0.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000', 'https://cbtshire-ai.vercel.app'],
    allow_origin_regex=r'https://.*\.vercel\.app|http://localhost:.*|http://127.0.0.1:.*',
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)
routers = [auth_router, dashboard_router, recruitment_router, ai_router, advanced_router, public_router, integrations_router]
for r in routers:
    app.include_router(r, prefix='/api')
    app.include_router(r)

@app.get('/')
def root(): return {'status': 'ok', 'service': 'cbtshire-api', 'message': 'Cbtshire.ai API is running', 'docs': '/docs'}

@app.get('/health')
def health(): return {'status': 'ok', 'service': 'cbtshire-api'}
