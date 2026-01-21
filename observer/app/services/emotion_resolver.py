"""Emotion Resolver Service.

Maps AI/LLM-generated emotion names to canonical emotions key-value pairs from a specific collection
(e.g., "Atlas of the Heart"). Critical for handling LLM variability and ensuring consistency.

Three-Tier Matching Strategy:
1. Exact Match (Case-Insensitive)
2. Fuzzy String Matching (80% similarity)
3. VAC-Based Semantic Matching (Geometric proximity)
"""

import difflib
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emotion_definition import EmotionDefinition, EmotionCollection

logger = logging.getLogger(__name__)


@dataclass
class MappingResult:
    """Result of emotion name mapping."""

    original_name: str
    emotion_name: Optional[str]
    emotion_id: Optional[str]
    match_method: str  # exact|fuzzy|vac|none
    match_confidence: float  # 0-1
    vac: Optional[List[float]]
    category: Optional[str]


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
        collection_name: str = "Atlas of the Heart",
        collection_id: Optional[str] = None,
        fuzzy_threshold: float = 0.8, 
        vac_threshold: float = 0.3
    ) -> None:
        """Initialize Emotion Resolver.

        Args:
            db: SQLAlchemy async session
            collection_name: Name of the collection to resolve against (default: "Atlas of the Heart")
            collection_id: Optional UUID of specific collection (overrides name if provided)
            fuzzy_threshold: Minimum similarity for fuzzy match (0-1, default 0.8)
            vac_threshold: Maximum VAC distance for semantic match (default 0.3)
        """
        self.db = db
        self.collection_name = collection_name
        self.collection_id = collection_id
        self.fuzzy_threshold = fuzzy_threshold
        self.vac_threshold = vac_threshold
        
        self.emotions_cache: Dict[str, Any] = {}
        self.emotion_names: List[str] = []
        self._loaded = False
        self._collection_uuid = None # Resolved UUID

        logger.info(
            f"EmotionResolver initialized for '{collection_name}' (ID: {collection_id}) "
            f"fuzzy={fuzzy_threshold}, vac={vac_threshold}"
        )

    async def ensure_loaded(self) -> None:
        """Load emotions from database for the specified collection."""
        if self._loaded:
            return

        try:
            # Resolve Collection ID if not explicitly provided
            if not self.collection_id:
                stmt = select(EmotionCollection).where(EmotionCollection.name == self.collection_name)
                result = await self.db.execute(stmt)
                collection = result.scalar_one_or_none()
                
                if not collection:
                    logger.warning(f"Collection '{self.collection_name}' not found. Resolver will be empty.")
                    self._loaded = True
                    return
                
                self._collection_uuid = collection.id
            else:
                self._collection_uuid = self.collection_id

            # Fetch emotions for this collection
            stmt = select(EmotionDefinition).where(EmotionDefinition.collection_id == self._collection_uuid)
            result = await self.db.execute(stmt)
            emotions = result.scalars().all()

            # Build lookup structures
            for emotion in emotions:
                name = emotion.emotion_name

                # Parse VAC vector
                vac_list = None
                if emotion.vac_vector is not None:
                    if isinstance(emotion.vac_vector, str):
                        import json
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
                    "embedding": emotion.semantic_embedding # Cache embedding if needed later?
                }
                self.emotion_names.append(name)

            self._loaded = True
            logger.info(f"Loaded {len(self.emotion_names)} emotions from collection '{self.collection_name}'")

        except Exception as e:
            logger.error(f"Error loading emotions: {e}", exc_info=True)

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
            logger.debug(f"Exact match: '{ai_name}' → '{exact_match['name']}'")
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
                f"Fuzzy match: '{ai_name}' → '{fuzzy_match['name']}' "
                f"({fuzzy_match['confidence']:.0%})"
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
                    f"VAC match: '{ai_name}' → '{vac_match['name']}' "
                    f"(distance={vac_match['distance']:.3f})"
                )
                return MappingResult(
                    original_name=ai_name,
                    emotion_name=vac_match["name"],
                    emotion_id=vac_match["id"],
                    match_method="vac",
                    match_confidence=1.0 - (vac_match["distance"] / self.vac_threshold),
                    vac=vac_match.get("vac"),
                    category=vac_match.get("category"),
                )

        # No Match
        logger.warning(f"No emotion match found for '{ai_name}' in collection '{self.collection_name}'")
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
            ai_name, self.emotion_names, n=1, cutoff=self.fuzzy_threshold
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

            # Use raw SQL for pgvector distance query, filtered by collection
            query = text(
                """
                SELECT
                    id, emotion_name, category, vac_vector,
                    vac_vector <-> CAST(:vac_input AS vector) as distance
                FROM emotion_definitions
                WHERE collection_id = :collection_id
                  AND vac_vector IS NOT NULL
                ORDER BY distance ASC
                LIMIT 1
            """
            )

            vac_vector_str = f"[{valence},{arousal},{connection}]"
            result = await self.db.execute(
                query, 
                {
                    "vac_input": vac_vector_str, 
                    "collection_id": self._collection_uuid
                }
            )
            row = result.first()

            if row:
                emotion_id, emotion_name, category, vac_vector, distance = row

                if distance < self.vac_threshold:
                    import json
                    vac_list = None
                    if vac_vector is not None:
                        if isinstance(vac_vector, str):
                            vac_list = json.loads(vac_vector)
                        else:
                            vac_list = list(vac_vector)

                    return {
                        "id": str(emotion_id),
                        "name": emotion_name,
                        "category": category,
                        "vac": (
                            [float(vac_list[0]), float(vac_list[1]), float(vac_list[2])]
                            if vac_list
                            else None
                        ),
                        "distance": distance,
                    }

        except Exception as e:
            logger.error(f"VAC matching failed: {e}")

        return None
