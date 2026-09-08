from contextlib import asynccontextmanager
from sqlalchemy import text

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session
from prometheus_fastapi_instrumentator import Instrumentator

from .database import Base, engine, get_db
from .models import SavedText
from .schemas import TextCreate, TextResponse
from .settings import settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title='Saved Texts API', lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'DELETE'],
    allow_headers=['*'],
)

Instrumentator().instrument(app).expose(app, include_in_schema=False)


@app.get('/health')
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text('SELECT 1'))
        return {
            "status": "healthy",
            "database": "healthy",
        }
    except Exception:
        return {
            "status": "unhealthy",
            "database": "unhealthy",
        }


@app.get('/api/texts', response_model=list[TextResponse])
def list_texts(db: Session = Depends(get_db)) -> list[SavedText]:
    statement = select(SavedText).order_by(SavedText.created_at, SavedText.id)
    return list(db.scalars(statement))


@app.post('/api/texts', response_model=TextResponse, status_code=status.HTTP_201_CREATED)
def create_text(payload: TextCreate, db: Session = Depends(get_db)) -> SavedText:
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail='Tekst nie może być pusty.')

    saved_text = SavedText(content=content)
    db.add(saved_text)
    db.commit()
    db.refresh(saved_text)
    return saved_text


@app.delete('/api/texts/{text_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_text(text_id: int, db: Session = Depends(get_db)) -> None:
    saved_text = db.get(SavedText, text_id)
    if saved_text is None:
        raise HTTPException(status_code=404, detail='Tekst nie został znaleziony.')

    db.delete(saved_text)
    db.commit()
