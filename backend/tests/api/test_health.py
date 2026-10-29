from unittest.mock import Mock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies import get_repository
from app.api.health import router
from app.features.todos.repository import TodoRepository


def test_health_queries_the_database_and_reports_ok():
    session = Mock(spec=Session)
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_repository] = lambda: TodoRepository(session)
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    session.execute.assert_called_once()
