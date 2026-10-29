from unittest.mock import Mock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies import get_repository
from app.factory import create_app
from app.features.todos.repository import TodoRepository
from tests.mocks import make_repository_mock


def test_create_app_resolves_the_database_url_and_stores_it_on_app_state(monkeypatch):
    resolve_database_url = Mock(return_value="postgresql+psycopg://resolved/taskly")
    monkeypatch.setattr("app.factory.resolve_database_url", resolve_database_url)
    app = create_app("postgresql+psycopg://explicit/taskly")
    assert isinstance(app, FastAPI)
    resolve_database_url.assert_called_once_with("postgresql+psycopg://explicit/taskly")
    assert app.state.database_url == "postgresql+psycopg://resolved/taskly"


def test_create_app_wires_the_health_and_todos_routers_and_the_shared_lifespan(monkeypatch):
    monkeypatch.setattr(
        "app.factory.resolve_database_url", Mock(return_value="postgresql+psycopg://x/db")
    )
    engine = Mock()
    create_database_engine = Mock(return_value=engine)
    initialize = Mock()
    create_session_factory = Mock(return_value=Mock(return_value=Mock()))
    monkeypatch.setattr("app.core.lifespan.create_database_engine", create_database_engine)
    monkeypatch.setattr("app.core.lifespan.initialize", initialize)
    monkeypatch.setattr("app.core.lifespan.create_session_factory", create_session_factory)

    app = create_app()

    with TestClient(app) as client:
        # Entering the TestClient context runs the app's lifespan, proving
        # create_app wires it in rather than relying on Starlette's default.
        create_database_engine.assert_called_once_with("postgresql+psycopg://x/db")
        initialize.assert_called_once_with(engine)

        app.dependency_overrides[get_repository] = lambda: TodoRepository(Mock(spec=Session))
        health_response = client.get("/api/health")

        app.dependency_overrides[get_repository] = lambda: make_repository_mock()
        todos_response = client.get("/api/todos")

    assert health_response.status_code == 200
    assert todos_response.status_code == 200
    assert todos_response.json() == []
    engine.dispose.assert_called_once_with()
