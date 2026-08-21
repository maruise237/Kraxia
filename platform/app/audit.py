"""Helpers for writing audit log records."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog


async def write_audit_log(
    db: AsyncSession,
    *,
    action: str,
    user_id: str | None = None,
    resource: str | None = None,
    detail: str | dict[str, Any] | list[Any] | None = None,
    commit: bool = False,
) -> AuditLog:
    """Append an audit log row.

    `detail` may be a string or JSON-serializable structure.
    By default this only stages the row in the current session; callers can
    commit together with their main transaction. Pass ``commit=True`` when the
    audit record must be persisted immediately.
    """

    if detail is None:
        detail_text = None
    elif isinstance(detail, str):
        detail_text = detail
    else:
        detail_text = json.dumps(detail, ensure_ascii=False, separators=(",", ":"), default=str)

    row = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        detail=detail_text,
    )
    db.add(row)
    if commit:
        await db.commit()
    return row
