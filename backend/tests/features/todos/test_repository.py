from datetime import datetime, timezone
from unittest.mock import Mock

from sqlalchemy import select
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session

from app.features.todos.models import TodoRecord
from app.features.todos.repository import TodoRepository
from app.features.todos.schemas import TodoCreate, TodoUpdate


def test_list_maps_models_and_orders_tasks_newest_first(model_factory, todo_values, todo):
    session = Mock(spec=Session)
    session.scalars.return_value = [model_factory(todo_values)]
    assert TodoRepository(session).list() == [todo]
    statement = session.scalars.call_args.args[0]
    expected = select(TodoRecord).order_by(TodoRecord.created_at.desc(), TodoRecord.id.desc())
    assert statement.compare(expected)
    compiled = str(statement.compile(dialect=postgresql.dialect()))
    assert "ORDER BY todos.created_at DESC, todos.id DESC" in compiled


def test_get_returns_none_for_missing_task():
    session = Mock(spec=Session)
    session.get.return_value = None
    assert TodoRepository(session).get(404) is None
    session.get.assert_called_once_with(TodoRecord, 404)


def test_create_persists_a_new_record_with_server_assigned_timestamps(monkeypatch, todo_values):
    frozen_now = datetime(2026, 10, 1, 12, tzinfo=timezone.utc)
    monkeypatch.setattr(
        "app.features.todos.repository.datetime",
        Mock(now=Mock(return_value=frozen_now)),
    )
    session = Mock(spec=Session)

    def fake_refresh(record):
        record.id = todo_values["id"]

    session.refresh.side_effect = fake_refresh
    payload = TodoCreate(title="Plan the sprint", priority="high")
    result = TodoRepository(session).create(payload)

    added_record = session.add.call_args.args[0]
    assert isinstance(added_record, TodoRecord)
    assert added_record.title == "Plan the sprint"
    assert added_record.created_at == frozen_now
    assert added_record.updated_at == frozen_now
    session.commit.assert_called_once_with()
    session.refresh.assert_called_once_with(added_record)
    assert result.id == todo_values["id"]
    assert result.title == "Plan the sprint"
    assert result.created_at == frozen_now


def test_update_returns_none_for_missing_task():
    session = Mock(spec=Session)
    session.get.return_value = None
    assert TodoRepository(session).update(404, TodoUpdate(title="x")) is None
    session.commit.assert_not_called()


def test_update_applies_only_the_provided_fields(monkeypatch, todo_values):
    frozen_now = datetime(2026, 10, 2, 9, tzinfo=timezone.utc)
    monkeypatch.setattr(
        "app.features.todos.repository.datetime",
        Mock(now=Mock(return_value=frozen_now)),
    )
    session = Mock(spec=Session)
    record = TodoRecord(**todo_values)
    session.get.return_value = record

    result = TodoRepository(session).update(todo_values["id"], TodoUpdate(completed=True))

    assert record.completed is True
    assert record.title == todo_values["title"]
    assert record.updated_at == frozen_now
    session.commit.assert_called_once_with()
    session.refresh.assert_called_once_with(record)
    assert result.completed is True


def test_delete_returns_false_for_missing_task():
    session = Mock(spec=Session)
    session.get.return_value = None
    assert TodoRepository(session).delete(404) is False
    session.delete.assert_not_called()
    session.commit.assert_not_called()


def test_delete_removes_the_record_and_commits():
    session = Mock(spec=Session)
    record = TodoRecord(id=1)
    session.get.return_value = record
    assert TodoRepository(session).delete(1) is True
    session.delete.assert_called_once_with(record)
    session.commit.assert_called_once_with()
