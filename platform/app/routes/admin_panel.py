"""Routes d'administration SaaS pour Kraxia.

Endpoints reserves au role 'admin'. Utilisent les modeles ORM existants
(User, Container, AuditLog, UsageRecord, ModelProviderConfig) pour fournir
au tableau de bord admin une vue reelle du multi-tenant.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

import docker
from docker.errors import NotFound as DockerNotFound
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import write_audit_log
from app.auth.dependencies import require_admin
from app.auth.service import get_user_by_id, get_user_by_username, hash_password
from app.db.engine import get_db
from app.db.models import AuditLog, Container, UsageRecord, User

router = APIRouter(
    prefix="/api/admin-saas",
    tags=["admin-saas"],
    dependencies=[Depends(require_admin)],
)


# ---------------------------------------------------------------------------
# Modeles de sortie
# ---------------------------------------------------------------------------


class ContainerSummary(BaseModel):
    id: str
    docker_id: Optional[str] = None
    status: str = "unknown"
    internal_host: Optional[str] = None
    internal_port: Optional[int] = None
    created_at: Optional[str] = None


class AdminUserSummary(BaseModel):
    id: str
    username: str
    email: str
    role: str
    quota_tier: str
    runtime_mode: str
    is_active: bool
    created_at: Optional[str] = None
    last_active_at: Optional[str] = None
    container: Optional[ContainerSummary] = None
    tokens_today: int = 0
    tokens_total: int = 0


class PaginatedAdminUsers(BaseModel):
    items: list[AdminUserSummary]
    total: int
    page: int
    page_size: int


class UpdateUserPayload(BaseModel):
    role: Optional[str] = None
    quota_tier: Optional[str] = None
    runtime_mode: Optional[str] = None
    is_active: Optional[bool] = None


class ResetPasswordPayload(BaseModel):
    new_password: str


class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    total_containers: int
    running_containers: int
    sessions_today: int
    tokens_today: int
    tokens_this_month: int
    signups_7d: int
    top_models: list[dict]


# ---------------------------------------------------------------------------
# Tableau de bord global
# ---------------------------------------------------------------------------


@router.get("/dashboard", response_model=DashboardStats)
async def admin_dashboard(db: AsyncSession = Depends(get_db)):
    """Agrege les metriques globales de la plateforme Kraxia."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)
    seven_days_ago = today_start - timedelta(days=7)

    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    active_users = (await db.execute(
        select(func.count(User.id)).where(User.is_active.is_(True))
    )).scalar_one()
    admin_users = (await db.execute(
        select(func.count(User.id)).where(User.role == "admin")
    )).scalar_one()
    containers = (await db.execute(select(func.count(Container.id)))).scalar_one()
    running_containers = (await db.execute(
        select(func.count(Container.id)).where(Container.status == "running")
    )).scalar_one()
    tokens_today = (await db.execute(
        select(func.coalesce(func.sum(UsageRecord.total_tokens), 0))
        .where(UsageRecord.created_at >= today_start)
    )).scalar_one()
    tokens_month = (await db.execute(
        select(func.coalesce(func.sum(UsageRecord.total_tokens), 0))
        .where(UsageRecord.created_at >= month_start)
    )).scalar_one()
    signups_7d = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= seven_days_ago)
    )).scalar_one()

    # Top 5 modeles sur les 30 derniers jours
    days_30 = today_start - timedelta(days=30)
    top_models_q = await db.execute(
        select(
            UsageRecord.model,
            func.sum(UsageRecord.total_tokens).label("tokens"),
            func.count(UsageRecord.id).label("calls"),
        )
        .where(UsageRecord.created_at >= days_30)
        .group_by(UsageRecord.model)
        .order_by(func.sum(UsageRecord.total_tokens).desc())
        .limit(5)
    )
    top_models = [
        {"model": row.model, "tokens": int(row.tokens or 0), "calls": int(row.calls or 0)}
        for row in top_models_q.all()
    ]

    await write_audit_log(db, actor_id=None, action="admin.dashboard.view", details={})

    return DashboardStats(
        total_users=int(total_users or 0),
        active_users=int(active_users or 0),
        admin_users=int(admin_users or 0),
        total_containers=int(containers or 0),
        running_containers=int(running_containers or 0),
        sessions_today=0,  # agrege depuis runtime si besoin
        tokens_today=int(tokens_today or 0),
        tokens_this_month=int(tokens_month or 0),
        signups_7d=int(signups_7d or 0),
        top_models=top_models,
    )


# ---------------------------------------------------------------------------
# Gestion des utilisateurs
# ---------------------------------------------------------------------------


@router.get("/users", response_model=PaginatedAdminUsers)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Filtre nom/email/ID"),
    role: Optional[str] = Query(None, description="user|admin"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).order_by(User.created_at.desc())
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (User.username.ilike(like)) | (User.email.ilike(like))
        )
    if role:
        stmt = stmt.where(User.role == role)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()

    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    items: list[AdminUserSummary] = []
    for u in rows:
        container = None
        c = (await db.execute(
            select(Container).where(Container.user_id == u.id)
        )).scalar_one_or_none()
        if c:
            container = ContainerSummary(
                id=c.id,
                docker_id=c.docker_id,
                status=c.status,
                internal_host=c.internal_host,
                internal_port=c.internal_port,
                created_at=c.created_at.isoformat() if c.created_at else None,
            )
        tokens_today = (await db.execute(
            select(func.coalesce(func.sum(UsageRecord.total_tokens), 0))
            .where(UsageRecord.user_id == u.id, UsageRecord.created_at >= today_start)
        )).scalar_one()
        tokens_total = (await db.execute(
            select(func.coalesce(func.sum(UsageRecord.total_tokens), 0))
            .where(UsageRecord.user_id == u.id)
        )).scalar_one()
        items.append(
            AdminUserSummary(
                id=u.id,
                username=u.username,
                email=u.email,
                role=u.role,
                quota_tier=u.quota_tier,
                runtime_mode=u.runtime_mode,
                is_active=u.is_active,
                created_at=u.created_at.isoformat() if u.created_at else None,
                last_active_at=c.last_active_at.isoformat() if c and c.last_active_at else None,
                container=container,
                tokens_today=int(tokens_today or 0),
                tokens_total=int(tokens_total or 0),
            )
        )

    return PaginatedAdminUsers(
        items=items,
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )


@router.get("/users/{user_id}", response_model=AdminUserSummary)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    u = await get_user_by_id(db, user_id)
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    return await _user_to_summary(db, u)


@router.patch("/users/{user_id}", response_model=AdminUserSummary)
async def update_user(
    user_id: str,
    payload: UpdateUserPayload,
    db: AsyncSession = Depends(get_db),
):
    u = await get_user_by_id(db, user_id)
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    if payload.role is not None:
        if payload.role not in ("user", "admin"):
            raise HTTPException(400, "role invalide")
        u.role = payload.role
    if payload.quota_tier is not None:
        if payload.quota_tier not in ("free", "basic", "pro"):
            raise HTTPException(400, "quota_tier invalide")
        u.quota_tier = payload.quota_tier
    if payload.runtime_mode is not None:
        if payload.runtime_mode not in ("dedicated", "shared"):
            raise HTTPException(400, "runtime_mode invalide")
        u.runtime_mode = payload.runtime_mode
    if payload.is_active is not None:
        u.is_active = payload.is_active
    await db.commit()
    await write_audit_log(
        db,
        actor_id=None,
        action="admin.user.update",
        details={"target": user_id, "changes": payload.model_dump(exclude_none=True)},
    )
    return await _user_to_summary(db, u)


@router.post("/users/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    payload: ResetPasswordPayload,
    db: AsyncSession = Depends(get_db),
):
    """Reinitialise le mot de passe d'un utilisateur (action admin)."""
    u = await get_user_by_id(db, user_id)
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    if len(payload.new_password) < 6:
        raise HTTPException(400, "Mot de passe trop court (min. 6 caracteres)")
    u.password_hash = hash_password(payload.new_password)
    await db.commit()
    await write_audit_log(
        db,
        actor_id=None,
        action="admin.user.password_reset",
        details={"target": user_id},
    )
    return {"ok": True, "message": "Mot de passe reinitialise"}


# ---------------------------------------------------------------------------
# Actions sur le conteneur runtime d'un utilisateur
# ---------------------------------------------------------------------------


@router.post("/users/{user_id}/container/restart")
async def restart_container(user_id: str, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(
        select(Container).where(Container.user_id == user_id)
    )).scalar_one_or_none()
    if not c or not c.docker_id:
        raise HTTPException(404, "Aucun conteneur pour cet utilisateur")
    try:
        client = docker.from_env()
        container = client.containers.get(c.docker_id)
        container.restart()
        c.status = "running"
        await db.commit()
    except DockerNotFound:
        c.status = "archived"
        await db.commit()
        raise HTTPException(404, "Conteneur Docker introuvable")
    except Exception as exc:
        raise HTTPException(500, f"Echec du redemarrage: {exc}")
    await write_audit_log(
        db, actor_id=None, action="admin.container.restart",
        details={"target": user_id, "container": c.docker_id},
    )
    return {"ok": True, "message": "Conteneur redemarre"}


@router.post("/users/{user_id}/container/pause")
async def pause_container_endpoint(user_id: str, db: AsyncSession = Depends(get_db)):
    from app.container.manager import pause_container

    ok = await pause_container(db, user_id)
    if not ok:
        raise HTTPException(500, "Impossible de mettre en pause")
    await write_audit_log(
        db, actor_id=None, action="admin.container.pause", details={"target": user_id},
    )
    return {"ok": True, "message": "Conteneur en pause"}


@router.post("/users/{user_id}/container/resume")
async def resume_container_endpoint(user_id: str, db: AsyncSession = Depends(get_db)):
    from app.container.manager import resume_container

    ok = await resume_container(db, user_id)
    if not ok:
        raise HTTPException(500, "Impossible de redemarrer le conteneur")
    await write_audit_log(
        db, actor_id=None, action="admin.container.resume", details={"target": user_id},
    )
    return {"ok": True, "message": "Conteneur repris"}


@router.post("/users/{user_id}/container/destroy")
async def destroy_container_endpoint(user_id: str, db: AsyncSession = Depends(get_db)):
    from app.container.manager import destroy_container

    ok = await destroy_container(db, user_id)
    if not ok:
        raise HTTPException(500, "Impossible de detruire le conteneur")
    await write_audit_log(
        db, actor_id=None, action="admin.container.destroy", details={"target": user_id},
    )
    return {"ok": True, "message": "Conteneur detruit"}


# ---------------------------------------------------------------------------
# Audit + utilisation
# ---------------------------------------------------------------------------


@router.get("/audit-log")
async def admin_audit_log(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc())
        .offset(offset).limit(limit)
    )).scalars().all()
    return {
        "items": [
            {
                "id": r.id,
                "actor_id": r.actor_id,
                "action": r.action,
                "target_id": r.target_id,
                "details": r.details,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "total": (await db.execute(select(func.count(AuditLog.id)))).scalar_one(),
    }


@router.get("/usage/stats")
async def usage_stats(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Stats d'utilisation agregees par jour et par modele."""
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    since = today_start - timedelta(days=days)
    per_day = (await db.execute(
        select(
            func.date(UsageRecord.created_at).label("day"),
            func.sum(UsageRecord.total_tokens).label("tokens"),
            func.count(UsageRecord.id).label("calls"),
        )
        .where(UsageRecord.created_at >= since)
        .group_by(func.date(UsageRecord.created_at))
        .order_by(func.date(UsageRecord.created_at))
    )).all()
    per_model = (await db.execute(
        select(
            UsageRecord.model,
            func.sum(UsageRecord.total_tokens).label("tokens"),
            func.count(UsageRecord.id).label("calls"),
        )
        .where(UsageRecord.created_at >= since)
        .group_by(UsageRecord.model)
        .order_by(func.sum(UsageRecord.total_tokens).desc())
    )).all()
    return {
        "days": days,
        "per_day": [
            {"day": str(r.day), "tokens": int(r.tokens or 0), "calls": int(r.calls or 0)}
            for r in per_day
        ],
        "per_model": [
            {"model": r.model, "tokens": int(r.tokens or 0), "calls": int(r.calls or 0)}
            for r in per_model
        ],
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _user_to_summary(db: AsyncSession, u: User) -> AdminUserSummary:
    container = None
    c = (await db.execute(
        select(Container).where(Container.user_id == u.id)
    )).scalar_one_or_none()
    if c:
        container = ContainerSummary(
            id=c.id,
            docker_id=c.docker_id,
            status=c.status,
            internal_host=c.internal_host,
            internal_port=c.internal_port,
            created_at=c.created_at.isoformat() if c.created_at else None,
        )
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    tokens_today = (await db.execute(
        select(func.coalesce(func.sum(UsageRecord.total_tokens), 0))
        .where(UsageRecord.user_id == u.id, UsageRecord.created_at >= today_start)
    )).scalar_one()
    tokens_total = (await db.execute(
        select(func.coalesce(func.sum(UsageRecord.total_tokens), 0))
        .where(UsageRecord.user_id == u.id)
    )).scalar_one()
    return AdminUserSummary(
        id=u.id,
        username=u.username,
        email=u.email,
        role=u.role,
        quota_tier=u.quota_tier,
        runtime_mode=u.runtime_mode,
        is_active=u.is_active,
        created_at=u.created_at.isoformat() if u.created_at else None,
        last_active_at=c.last_active_at.isoformat() if c and c.last_active_at else None,
        container=container,
        tokens_today=int(tokens_today or 0),
        tokens_total=int(tokens_total or 0),
    )
