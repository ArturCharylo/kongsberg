from datetime import datetime, timezone

from pydantic import ValidationError

from backend.database import Base, get_db
from backend.models import SavedText
from backend.schemas import TextCreate, TextResponse
from backend.settings import Settings


def test_text_create_trims_only_at_api_boundary_and_validates_length() -> None:
    assert TextCreate(content='  sample  ').content == '  sample  '

    try:
        TextCreate(content='')
    except ValidationError:
        pass
    else:
        raise AssertionError('empty content should fail validation')


def test_text_response_reads_sqlalchemy_attributes() -> None:
    created_at = datetime.now(timezone.utc)
    item = TextResponse.model_validate(
        SavedText(id=7, content='saved', created_at=created_at)
    )

    assert item.id == 7
    assert item.content == 'saved'
    assert item.created_at == created_at


def test_saved_text_mapping_and_base_registry() -> None:
    assert SavedText.__tablename__ == 'saved_texts'
    assert any(mapper.class_ is SavedText for mapper in Base.registry.mappers)
    assert SavedText.__table__.c.content.nullable is False


def test_get_db_closes_session(monkeypatch) -> None:
    class FakeSession:
        def __init__(self) -> None:
            self.closed = False

        def close(self) -> None:
            self.closed = True

    session = FakeSession()
    monkeypatch.setattr('backend.database.SessionLocal', lambda: session)

    generator = get_db()
    assert next(generator) is session
    generator.close()
    assert session.closed is True


def test_settings_have_application_defaults(monkeypatch) -> None:
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.delenv('FRONTEND_ORIGIN', raising=False)
    configured = Settings(_env_file=None)

    assert configured.database_url.startswith('postgresql+')
    assert configured.frontend_origin == 'http://localhost:5173'
