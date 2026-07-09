"""Emotion Resolver Service.

Maps AI/LLM-generated emotion names to canonical emotions key-value pairs from a specific
collection (e.g., "Atlas of the Heart"). Critical for handling LLM variability and ensuring
consistency.

Three-Tier Matching Strategy:
1. Exact Match (Case-Insensitive)
2. Fuzzy String Matching (80% similarity)
3. VAC-Based Semantic Matching (Geometric proximity)
"""

import difflib
import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.models.emotion_definition import EmotionCollection, EmotionDefinition
from app.types.emotions import ResolverConfig

logger = logging.getLogger(__name__)


@dataclass
class MappingResult:
    """Result of emotion name mapping."""

    original_name: str
    emotion_name: Optional[str]
    emotion_id: Optional[str]
    match_method: str = "none"
    match_confidence: float = 0.0
    vac: Optional[List[float]] = None
    category: Optional[str] = None


class EmotionResolver:
    """Maps AI-generated emotion names to EmotionDefinitions.

    Provides three-tier matching strategy:
    1. Exact match (case-insensitive)
    2. Fuzzy string matching (80%+ similarity)
    3. VAC-based semantic matching (distance <0.3)
    """

    def __init__(
        self,
        db: AsyncSession,
        config: Optional[ResolverConfig] = None,
    ) -> None:
        """Initialize Emotion Resolver.

        Args:
            db: SQLAlchemy async session
            config: Resolver configuration
        """
        self.db = db
        self.config = config or ResolverConfig(collection_name=settings.DEFAULT_EMOTION_COLLECTION)

        self.emotions_cache: Dict[str, Any] = {}
        self.emotion_names: List[str] = []
        self._loaded = False
        self._collection_uuid: Optional[Any] = None  # Resolved UUID

        logger.info(
            "EmotionResolver initialized for '%s' (ID: %s) fuzzy=%s, vac=%s",
            self.config.collection_name,
            self.config.collection_id,
            self.config.fuzzy_threshold,
            self.config.vac_threshold,
        )

    async def ensure_loaded(self) -> None:
        """Load emotions from database for the specified collection."""
        if self._loaded:
            return

        try:
            # Resolve Collection ID if not explicitly provided
            if not self.config.collection_id:
                stmt_coll = select(EmotionCollection).where(
                    EmotionCollection.name == self.config.collection_name
                )
                result = await self.db.execute(stmt_coll)
                collection = result.scalar_one_or_none()

                if not collection:
                    logger.warning(
                        "Collection '%s' not found. Resolver will be empty.",
                        self.config.collection_name,
                    )
                    self._loaded = True
                    return

                self._collection_uuid = collection.id
            else:
                self._collection_uuid = self.config.collection_id

            # Fetch emotions for this collection
            stmt_emotions = select(EmotionDefinition).where(
                EmotionDefinition.collection_id == self._collection_uuid
            )
            result_emotions = await self.db.execute(stmt_emotions)
            emotions = result_emotions.scalars().all()

            # Build lookup structures
            for emotion in emotions:
                name = emotion.emotion_name

                # Parse VAC vector
                vac_list = None
                if emotion.vac_vector is not None:
                    if isinstance(emotion.vac_vector, str):
                        vac_list = json.loads(emotion.vac_vector)
                    else:
                        vac_list = list(emotion.vac_vector)

                self.emotions_cache[name.lower()] = {
                    "id": str(emotion.id),
                    "name": name,
                    "category": emotion.category,
                    "vac": (
                        [float(vac_list[0]), float(vac_list[1]), float(vac_list[2])]
                        if vac_list
                        else None
                    ),
                    "embedding": emotion.semantic_embedding,  # Cache embedding if needed later?
                }
                self.emotion_names.append(name)

            self._loaded = True
            logger.info(
                "Loaded %d emotions from collection '%s'",
                len(self.emotion_names),
                self.config.collection_name,
            )

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error loading emotions: %s", e, exc_info=True)

    async def resolve_emotion(
        self, ai_name: str, vac: Optional[Dict[str, float]] = None
    ) -> MappingResult:
        """Resolve an AI emotion name to a canonical emotion definition.

        Args:
            ai_name: Emotion name from LLM
            vac: Optional VAC coordinates for fallback matching

        Returns:
            MappingResult with resolution details
        """
        # Ensure emotions are loaded
        await self.ensure_loaded()

        # Edge Case: Empty name
        if not ai_name:
            return MappingResult(
                original_name=ai_name,
                emotion_name=None,
                emotion_id=None,
                match_method="none",
                match_confidence=0.0,
                vac=None,
                category=None,
            )

        # 1. Exact Match
        exact_match = self._exact_match(ai_name)
        if exact_match:
            logger.debug("Exact match: '%s' → '%s'", ai_name, exact_match["name"])
            return MappingResult(
                original_name=ai_name,
                emotion_name=exact_match["name"],
                emotion_id=exact_match["id"],
                match_method="exact",
                match_confidence=1.0,
                vac=exact_match.get("vac"),
                category=exact_match.get("category"),
            )

        # 2. Fuzzy Match
        fuzzy_match = self._fuzzy_match(ai_name)
        if fuzzy_match:
            logger.debug(
                "Fuzzy match: '%s' → '%s' (%.0f%%)",
                ai_name,
                fuzzy_match["name"],
                fuzzy_match["confidence"] * 100,
            )
            return MappingResult(
                original_name=ai_name,
                emotion_name=fuzzy_match["name"],
                emotion_id=fuzzy_match["id"],
                match_method="fuzzy",
                match_confidence=fuzzy_match["confidence"],
                vac=fuzzy_match.get("vac"),
                category=fuzzy_match.get("category"),
            )

        # 3. VAC-Based Semantic Match
        if vac:
            vac_match = await self._vac_match(vac)
            if vac_match:
                logger.debug(
                    "VAC match: '%s' → '%s' (distance=%.3f)",
                    ai_name,
                    vac_match["name"],
                    vac_match["distance"],
                )
                return MappingResult(
                    original_name=ai_name,
                    emotion_name=vac_match["name"],
                    emotion_id=vac_match["id"],
                    match_method="vac",
                    match_confidence=1.0 - (vac_match["distance"] / self.config.vac_threshold),
                    vac=vac_match.get("vac"),
                    category=vac_match.get("category"),
                )

        if not self._loaded:
            await self.ensure_loaded()

        # No Match
        logger.warning(
            "No emotion match found for '%s' in collection '%s'",
            ai_name,
            self.config.collection_name,
        )
        return MappingResult(
            original_name=ai_name,
            emotion_name=None,
            emotion_id=None,
            match_method="none",
            match_confidence=0.0,
            vac=None,
            category=None,
        )

    def _exact_match(self, ai_name: str) -> Optional[Dict[str, Any]]:
        """Try exact match (case-insensitive)."""
        return self.emotions_cache.get(ai_name.lower())

    def _fuzzy_match(self, ai_name: str) -> Optional[Dict[str, Any]]:
        """Try fuzzy string matching using difflib."""
        matches = difflib.get_close_matches(
            ai_name, self.emotion_names, n=1, cutoff=self.config.fuzzy_threshold
        )

        if matches:
            matched_name = matches[0]
            ratio = difflib.SequenceMatcher(None, ai_name.lower(), matched_name.lower()).ratio()
            emotion = self.emotions_cache.get(matched_name.lower())
            if emotion:
                return {**emotion, "confidence": ratio}

        return None

    async def _vac_match(self, vac: Dict[str, float]) -> Optional[Dict[str, Any]]:
        """Try VAC-based semantic matching using pgvector."""
        if not self._collection_uuid:
            return None

        try:
            valence = vac.get("valence", 0.0)
            arousal = vac.get("arousal", 0.0)
            connection = vac.get("connection", 0.0)

            row = await self._execute_vac_query(valence, arousal, connection)

            if row:
                emotion_id, emotion_name, category, vac_vector, distance = row

                if distance < self.config.vac_threshold:
                    vac_list = self._parse_vac_vector(vac_vector)

                    return {
                        "id": str(emotion_id),
                        "name": emotion_name,
                        "category": category,
                        "vac": vac_list,
                        "distance": distance,
                    }

        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("VAC matching failed: %s", e)

        return None

    async def _execute_vac_query(self, valence: float, arousal: float, connection: float) -> Any:
        """Execute the VAC distance query."""
        # Use raw SQL for pgvector distance query, filtered by collection
        query = text("""
            SELECT
                id, emotion_name, category, vac_vector,
                vac_vector <-> CAST(:vac_input AS vector) as distance
            FROM emotion_definitions
            WHERE collection_id = :collection_id
                AND vac_vector IS NOT NULL
            ORDER BY distance ASC
            LIMIT 1
        """)

        vac_vector_str = f"[{valence},{arousal},{connection}]"
        result = await self.db.execute(
            query,
            {"vac_input": vac_vector_str, "collection_id": self._collection_uuid},
        )
        return result.first()

    def _parse_vac_vector(self, vac_vector: Any) -> Optional[List[float]]:
        """Parse VAC vector from database result."""
        if vac_vector is None:
            return None

        if isinstance(vac_vector, str):
            vac_list = json.loads(vac_vector)
        else:
            vac_list = list(vac_vector)

        if not vac_list:
            return None

        return [float(vac_list[0]), float(vac_list[1]), float(vac_list[2])]
