from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from starlette.requests import Request

from app.api.dependencies import get_repository
from app.features.todos.repository import TodoRepository


def test_session_creation_failure_propagates_from_repository_dependency():
    session_factory = Mock(side_effect=RuntimeError("Session unavailable"))
    app = SimpleNamespace(state=SimpleNamespace(session_factory=session_factory))
    request = Request({"type": "http", "app": app})
    dependency = get_repository(request)
    with pytest.raises(RuntimeError, match="Session unavailable"):
        next(dependency)
    session_factory.assert_called_once_with()


def test_yields_a_repository_bound_to_the_session_and_closes_it_after_use():
    session = Mock()
    session_factory = Mock(return_value=session)
    app = SimpleNamespace(state=SimpleNamespace(session_factory=session_factory))
    request = Request({"type": "http", "app": app})
    dependency = get_repository(request)

    repository = next(dependency)
    assert isinstance(repository, TodoRepository)
    assert repository.session is session
    session.close.assert_not_called()

    with pytest.raises(StopIteration):
        next(dependency)
    session.rollback.assert_not_called()
    session.close.assert_called_once_with()


def test_rolls_back_and_closes_the_session_when_an_error_propagates():
    session = Mock()
    session_factory = Mock(return_value=session)
    app = SimpleNamespace(state=SimpleNamespace(session_factory=session_factory))
    request = Request({"type": "http", "app": app})
    dependency = get_repository(request)
    next(dependency)

    with pytest.raises(RuntimeError, match="boom"):
        dependency.throw(RuntimeError("boom"))
    session.rollback.assert_called_once_with()
    session.close.assert_called_once_with()
