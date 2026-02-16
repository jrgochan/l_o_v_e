"""Admin Routes — System Configuration & Management.

Administrative endpoints for user management and data oversight.
Protected by admin role requirement.

This package splits the admin routes into domain-specific sub-modules:
- **users**: User CRUD and session/trajectory queries
- **visualization**: Emotion Atlas data management
- **strategies**: Therapeutic strategies, AI model assignments, and import
- **data**: Clinical alerts, bootstrap data, and prompt templates

The composing ``router`` merges all sub-routers so the existing registration
in ``factory.py`` (``app.include_router(admin.router, …)``) keeps working.
Individual route functions are also re-exported for direct test access
(e.g. ``admin.list_users(…)``).
"""

from fastapi import APIRouter

from app.api.routes.admin.data import *  # noqa: F401, F403
from app.api.routes.admin.data import router as _data_router
from app.api.routes.admin.strategies import *  # noqa: F401, F403
from app.api.routes.admin.strategies import _process_strategy_import  # noqa: F401
from app.api.routes.admin.strategies import router as _strategies_router
from app.api.routes.admin.users import *  # noqa: F401, F403
from app.api.routes.admin.users import router as _users_router
from app.api.routes.admin.visualization import *  # noqa: F401, F403
from app.api.routes.admin.visualization import router as _visualization_router

# Also re-export service classes that tests patch at this module path
from app.services.admin.service import AdminService  # noqa: F401

router = APIRouter()
router.include_router(_users_router)
router.include_router(_visualization_router)
router.include_router(_strategies_router)
router.include_router(_data_router)
