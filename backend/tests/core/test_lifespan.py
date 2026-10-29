from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app.core.lifespan import lifespan

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def patched_database(monkeypatch):
    engine = Mock(name="engine")
    session_factory = Mock(name="session_factory")
    create_database_engine = Mock(return_value=engine)
    create_session_factory = Mock(return_value=session_factory)
    initialize = Mock()
    monkeypatch.setattr("app.core.lifespan.create_database_engine", create_database_engine)
    monkeypatch.setattr("app.core.lifespan.create_session_factory", create_session_factory)
    monkeypatch.setattr("app.core.lifespan.initialize", initialize)
    return SimpleNamespace(
        engine=engine,
        session_factory=session_factory,
        create_database_engine=create_database_engine,
        create_session_factory=create_session_factory,
        initialize=initialize,
    )


async def test_initializes_the_schema_and_exposes_a_session_factory_on_app_state(patched_database):
    app = SimpleNamespace(state=SimpleNamespace(database_url="postgresql+psycopg://x/db"))
    async with lifespan(app):
        patched_database.create_database_engine.assert_called_once_with(
            "postgresql+psycopg://x/db"
        )
        patched_database.initialize.assert_called_once_with(patched_database.engine)
        patched_database.create_session_factory.assert_called_once_with(patched_database.engine)
        assert app.state.session_factory is patched_database.session_factory
        patched_database.engine.dispose.assert_not_called()
    patched_database.engine.dispose.assert_called_once_with()


async def test_disposes_the_engine_even_when_the_application_body_raises(patched_database):
    app = SimpleNamespace(state=SimpleNamespace(database_url="postgresql+psycopg://x/db"))
    with pytest.raises(RuntimeError, match="boom"):
        async with lifespan(app):
            raise RuntimeError("boom")
    patched_database.engine.dispose.assert_called_once_with()


async def test_disposes_the_engine_even_when_schema_initialization_fails(patched_database):
    patched_database.initialize.side_effect = RuntimeError("schema failed")
    app = SimpleNamespace(state=SimpleNamespace(database_url="postgresql+psycopg://x/db"))
    with pytest.raises(RuntimeError, match="schema failed"):
        async with lifespan(app):
            pass
    patched_database.engine.dispose.assert_called_once_with()
    patched_database.create_session_factory.assert_not_called()
