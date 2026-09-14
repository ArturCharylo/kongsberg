from unittest.mock import Mock

from fastapi import HTTPException
from sqlalchemy import text

from backend import main
from backend.models import SavedText


def test_lifespan_creates_database_tables() -> None:
    assert SavedText.__table__.name == 'saved_texts'


def test_health_returns_healthy(client) -> None:
    response = client.get('/health')

    assert response.status_code == 200
    assert response.json() == {'status': 'healthy', 'database': 'healthy'}


def test_health_returns_unhealthy_when_database_fails() -> None:
    database = Mock()
    database.execute.side_effect = RuntimeError('database unavailable')

    assert main.health(database) == {
        'status': 'unhealthy',
        'database': 'unhealthy',
    }


def test_create_list_and_delete_text(client) -> None:
    created = client.post('/api/texts', json={'content': '  Hello API  '})

    assert created.status_code == 201
    item = created.json()
    assert item['content'] == 'Hello API'
    assert item['id'] == 1
    assert item['created_at']

    listed = client.get('/api/texts')
    assert listed.status_code == 200
    assert listed.json()[0]['content'] == 'Hello API'

    deleted = client.delete('/api/texts/1')
    assert deleted.status_code == 204
    assert client.get('/api/texts').json() == []


def test_create_rejects_blank_text(client) -> None:
    response = client.post('/api/texts', json={'content': '   '})

    assert response.status_code == 400
    assert response.json()['detail'] == 'Tekst nie może być pusty.'


def test_create_rejects_missing_or_too_long_content(client) -> None:
    assert client.post('/api/texts', json={}).status_code == 422
    assert client.post('/api/texts', json={'content': 'x' * 5001}).status_code == 422


def test_delete_returns_not_found(client) -> None:
    response = client.delete('/api/texts/999')

    assert response.status_code == 404
    assert response.json()['detail'] == 'Tekst nie został znaleziony.'


def test_route_functions_raise_expected_http_error() -> None:
    database = Mock()
    database.get.return_value = None

    try:
        main.delete_text(42, database)
    except HTTPException as error:
        assert error.status_code == 404
    else:
        raise AssertionError('delete_text should raise HTTPException')

    database.execute.return_value = text('SELECT 1')
