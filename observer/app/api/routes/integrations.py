"""Integration API Routes — Connect, sync, and manage external data sources.

Endpoints:
    GET    /journal/integrations/available           List all adapters
    GET    /journal/integrations                     List active integrations
    POST   /journal/integrations/{adapter_id}/connect    Connect
    DELETE /journal/integrations/{adapter_id}/disconnect  Disconnect
    POST   /journal/integrations/{adapter_id}/sync       Manual sync
    GET    /journal/integrations/{adapter_id}/status      Health check
    POST   /journal/integrations/import                  File import
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class ConnectRequest(BaseModel):
    """Request body for connecting an integration."""

    credentials: dict  # API key, OAuth data, etc.
    scopes: list[str] | None = None
    settings: dict | None = None


# ---------------------------------------------------------------------------
# Adapter Discovery
# ---------------------------------------------------------------------------


@router.get("/available")
async def list_available_adapters(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> Any:
    """List all available integration adapters."""
    from app.services.integrations.registry import adapter_registry

    adapters = adapter_registry.list_all()
    return {
        "adapters": [
            {
                "adapter_id": a.adapter_id,
                "display_name": a.display_name,
                "category": a.category,
                "auth_type": a.auth_type,
                "description": a.description,
            }
            for a in adapters
        ],
        "total": len(adapters),
    }


# ---------------------------------------------------------------------------
# Active Integrations
# ---------------------------------------------------------------------------


@router.get("")
async def list_active_integrations(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    """List all active integrations for the current user."""
    from app.services.integration_service import IntegrationService

    service = IntegrationService(db)
    integrations = await service.list_active(current_user.id)

    return {
        "integrations": integrations,
        "total": len(integrations),
    }


# ---------------------------------------------------------------------------
# Connect / Disconnect
# ---------------------------------------------------------------------------


@router.post("/{adapter_id}/connect", status_code=201)
async def connect_integration(
    adapter_id: str,
    body: ConnectRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Any:
    """Connect an integration by providing credentials.

    For API-key integrations, pass ``{"credentials": {"api_key": "..."}}``.
    For file-based integrations, use the ``/import`` endpoint instead.
    """
    from app.services.integration_service import IntegrationService

    service = IntegrationService(db)
    ip = request.client.host if request.client else None

    try:
        result = await service.connect(
            user_id=current_user.id,
            adapter_id=adapter_id,
            auth_data=body.credentials,
            scopes=body.scopes,
            settings=body.settings,
            ip_address=ip,
        )
        await db.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{adapter_id}/disconnect")
async def disconnect_integration(
    adapter_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Any:
    """Disconnect an integration and delete stored credentials."""
    from app.services.integration_service import IntegrationService

    service = IntegrationService(db)
    ip = request.client.host if request.client else None

    try:
        result = await service.disconnect(
            user_id=current_user.id,
            adapter_id=adapter_id,
            ip_address=ip,
        )
        await db.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------


@router.post("/{adapter_id}/sync")
async def sync_integration(
    adapter_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> Any:
    """Manually trigger a sync for an integration."""
    from app.services.integration_service import IntegrationService

    service = IntegrationService(db)
    ip = request.client.host if request.client else None

    try:
        result = await service.sync(
            user_id=current_user.id,
            adapter_id=adapter_id,
            ip_address=ip,
        )
        await db.commit()
        return result.to_dict()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------


@router.get("/{adapter_id}/status")
async def integration_status(
    adapter_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    """Get the status and health of a specific integration."""
    from app.services.integration_service import IntegrationService

    service = IntegrationService(db)
    status = await service.get_status(current_user.id, adapter_id)

    if status is None:
        raise HTTPException(status_code=404, detail=f"Integration {adapter_id} is not connected")

    return status


# ---------------------------------------------------------------------------
# File Import
# ---------------------------------------------------------------------------


@router.post("/import")
async def import_file(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
    file: UploadFile = File(...),
    adapter_id: str = "ical_import",
) -> Any:
    """Import events from an uploaded file (.ics, etc.).

    The file content is passed to the appropriate adapter for parsing.
    """
    from app.services.integration_service import IntegrationService

    content = await file.read()

    try:
        file_content = content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded text") from exc

    service = IntegrationService(db)
    ip = request.client.host if request.client else None

    try:
        result = await service.import_file(
            user_id=current_user.id,
            adapter_id=adapter_id,
            file_content=file_content,
            ip_address=ip,
        )
        await db.commit()
        return result.to_dict()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
