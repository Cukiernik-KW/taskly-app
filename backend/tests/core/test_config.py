from unittest.mock import Mock

import pytest

from app.core.config import resolve_database_url


@pytest.fixture(autouse=True)
def no_dotenv_loading(monkeypatch):
    # Never touch the real filesystem for a .env file in tests.
    monkeypatch.setattr("app.core.config.load_dotenv", Mock())


@pytest.fixture(autouse=True)
def clean_database_env(monkeypatch):
    for key in (
        "DATABASE_URL",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_HOST",
        "DB_PORT",
        "POSTGRES_DB",
    ):
        monkeypatch.delenv(key, raising=False)


def test_returns_the_explicit_url_argument_without_reading_the_environment(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://env/should-not-be-used")
    assert resolve_database_url("postgresql+psycopg://explicit/taskly") == (
        "postgresql+psycopg://explicit/taskly"
    )


def test_falls_back_to_the_database_url_environment_variable(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://env/taskly")
    assert resolve_database_url() == "postgresql+psycopg://env/taskly"


def test_builds_a_url_from_individual_postgres_settings_when_nothing_else_is_set(monkeypatch):
    monkeypatch.setenv("POSTGRES_USER", "taskly")
    monkeypatch.setenv("POSTGRES_PASSWORD", "secret")
    monkeypatch.setenv("POSTGRES_HOST", "db")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("POSTGRES_DB", "taskly")
    url = resolve_database_url()
    assert url == "postgresql+psycopg://taskly:secret@db:5432/taskly"


def test_raises_a_key_error_when_a_required_postgres_setting_is_missing(monkeypatch):
    monkeypatch.setenv("POSTGRES_USER", "taskly")
    monkeypatch.setenv("POSTGRES_HOST", "db")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("POSTGRES_DB", "taskly")
    # POSTGRES_PASSWORD is intentionally left unset.
    with pytest.raises(KeyError, match="POSTGRES_PASSWORD"):
        resolve_database_url()
