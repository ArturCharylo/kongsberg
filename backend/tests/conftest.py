import os
from collections.abc import Generator

os.environ['DATABASE_URL'] = 'sqlite+pysqlite:///:memory:'
os.environ['FRONTEND_ORIGIN'] = 'http://testserver'

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from backend import main


test_engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
)


def override_get_db() -> Generator[Session, None, None]:
    with Session(test_engine) as db:
        yield db


main.engine = test_engine
main.app.dependency_overrides[main.get_db] = override_get_db


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(main.app) as test_client:
        yield test_client
    main.Base.metadata.drop_all(test_engine)
