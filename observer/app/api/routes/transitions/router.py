from fastapi import APIRouter

from app.api.routes.transitions.analysis import router as analysis_router
from app.api.routes.transitions.execution import router as execution_router
from app.api.routes.transitions.library import router as library_router
from app.api.routes.transitions.planning import router as planning_router

router = APIRouter()

# Include sub-routers with appropriate tags
router.include_router(planning_router, tags=["Transitions"])
router.include_router(execution_router, tags=["Transitions"])
router.include_router(analysis_router, tags=["Transitions"])
router.include_router(library_router, tags=["Strategies"])
