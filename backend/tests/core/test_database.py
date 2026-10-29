from unittest.mock import Mock

from sqlalchemy import Engine

from app.core.database import create_database_engine, create_session_factory, initialize
from app.features.todos.models import Base


def test_engine_uses_the_postgresql_psycopg_driver():
    url = "postgresql+psycopg://taskly:taskly@localhost:5432/taskly"
    engine = create_database_engine(url)
    try:
        assert engine.url.drivername == "postgresql+psycopg"
        assert engine.dialect.name == "postgresql"
        assert engine.dialect.driver == "psycopg"
        assert engine.url.database == "taskly"
    finally:
        engine.dispose()


def test_create_session_factory_binds_the_engine_and_disables_expire_on_commit():
    engine = Mock(spec=Engine)
    factory = create_session_factory(engine)
    assert factory.kw["bind"] is engine
    assert factory.kw["expire_on_commit"] is False


def test_initialize_creates_the_schema_on_the_given_engine(monkeypatch):
    engine = Mock(spec=Engine)
    create_all = Mock()
    monkeypatch.setattr(Base.metadata, "create_all", create_all)
    initialize(engine)
    create_all.assert_called_once_with(engine)
