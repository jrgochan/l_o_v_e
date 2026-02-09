"""Module documentation."""

import random
from typing import Any, Dict, List, Optional

from app.services.insights.prosody import (
    generate_voice_observations_legacy,
    generate_voice_observations_warm,
)


def interpret_arousal_warm(arousal: float) -> str:
    """Interpret arousal in relatable terms."""
    if arousal > 0.7:
        return "You're in a high-activation state - your system is revved up"
    if arousal > 0.3:
        return "There's moderate energy moving through you - you're engaged and alert"
    if arousal > -0.3:
        return "You're in a balanced energy state - not too activated, not too flat"
    if arousal > -0.7:
        return "Your energy is quite low right now - you might feel tired or depleted"
    return (
        "You're in a very low-energy state - your system might be shutting down " "to protect you"
    )


def interpret_valence_warm(valence: float) -> str:
    """Interpret valence in relatable terms."""
    if valence > 0.7:
        return "This energy feels really good - there's pleasure and positivity here"
    if valence > 0.3:
        return "This has a somewhat positive quality - things feel okay"
    if valence > -0.3:
        return "This feels neutral or mixed - neither clearly good nor bad"
    if valence > -0.7:
        return "This energy doesn't feel good - there's some distress or discomfort"
    return "This feels quite painful or difficult - the distress is significant"


def interpret_connection_warm(connection: float) -> str:
    """Interpret connection in relatable terms."""
    if connection > 0.7:
        return "You feel deeply connected - to yourself, others, or your values"
    if connection > 0.3:
        return "There's a sense of connection present - you're not entirely alone in this"
    if connection > -0.3:
        return "Connection feels neutral right now"
    if connection > -0.7:
        return "You might feel somewhat alone or disconnected in this experience"
    return "There's significant disconnection - you might feel very alone or cut of"


def generate_warm_opening(emotion_name: str, valence: float) -> str:
    """Generate empathetic opening with validation."""
    emotion_lower = emotion_name.lower()

    # Validation phrase
    if valence < -0.3:
        validation = "and I want you to know that's completely valid"
    elif valence > 0.3:
        validation = "and that's wonderful"
    else:
        validation = "and that's meaningful"

    # Purpose/context
    if emotion_lower in ["anxiety", "fear", "worry"]:
        context = "This is your system trying to protect you."
    elif emotion_lower in ["sadness", "grie"]:
        context = "Sadness is how we honor what matters to us."
    elif emotion_lower in ["joy", "delight", "excitement"]:
        context = "You're experiencing something that lights you up."
    else:
        context = "This emotion is telling you something important."

    return f"I sense you're experiencing {emotion_lower} right now, {validation}. {context}"


def get_emotion_understanding_warm(emotion_name: str) -> str:
    """Get accessible explanation of emotion."""
    emotion_understanding = {
        "Anxiety": (
            "Anxiety is your mind's way of trying to protect you by preparing for potential "
            "challenges. It's exhausting, but it means you care deeply."
        ),
        "Sadness": (
            "Sadness is how your heart processes loss and honors what mattered. It's painful, "
            "but it's also how we integrate change."
        ),
        "Joy": (
            "Joy is your being's celebration of alignment - when what's happening matches what "
            "you value. It reminds you what's possible."
        ),
        "Anger": (
            "Anger is energy for change - it signals when boundaries are crossed or values are "
            "violated. It's trying to protect what matters to you."
        ),
        "Fear": (
            "Fear is your survival system activating to keep you safe. It's uncomfortable, "
            "but it shows how much you value your wellbeing."
        ),
        "Contentment": (
            "Contentment is your being's way of saying 'this is enough.' It's peace without "
            "needing anything to be different."
        ),
        "Excitement": (
            "Excitement is your body preparing for something you value - it's anticipation "
            "mixed with energy and hope."
        ),
        "Overwhelm": (
            "Overwhelm is your system saying 'this is too much right now.' It's a signal to "
            "slow down and simplify."
        ),
        "Confusion": (
            "Confusion is your mind saying 'I need more information to make sense of this.' "
            "It's uncomfortable but it's the beginning of clarity."
        ),
    }

    return emotion_understanding.get(
        emotion_name,
        f"{emotion_name} is your emotional system responding to what's happening. "
        "It's giving you important information about your needs and values.",
    )


def generate_reflection_question(
    emotion_name: str, vac_data: Dict[str, float]  # pylint: disable=unused-argument
) -> str:
    """Generate a reflective question based on VAC state."""
    arousal = vac_data.get("arousal", 0)
    valence = vac_data.get("valence", 0)
    connection = vac_data.get("connection", 0)

    # Pick based on most salient dimension
    if abs(arousal) > max(abs(valence), abs(connection)):
        # Arousal-focused
        if arousal > 0.5:
            questions = [
                "What would it feel like to slow down, even just for one breath?",
                "Where in your body are you feeling this intensity?",
                "What is this energy trying to tell you?",
            ]
        else:
            questions = [
                "What would it take to have just a little more energy right now?",
                "Is this low energy asking you to rest, or is it numbness protecting you?",
                "What does this tiredness feel like in your body?",
            ]
    elif abs(connection) > abs(valence):
        # Connection-focused
        if connection < 0:
            questions = [
                "What would connection feel like right now?",
                "Is there someone you'd feel safe reaching out to?",
                "What helps you feel less alone?",
            ]
        else:
            questions = [
                "What's creating this sense of connection?",
                "Who or what helps you feel this way?",
                "How can you nurture this connection?",
            ]
    else:
        # Valence-focused
        if valence < 0:
            questions = [
                "What would it be like to be gentle with yourself about feeling this way?",
                "What do you need most in this moment?",
                "Who or what helps when you feel like this?",
            ]
        else:
            questions = [
                "What's contributing to this positive feeling?",
                "How can you savor this moment?",
                "What does this tell you about what matters to you?",
            ]

    return random.choice(questions)


def generate_gentle_suggestion(
    emotion_name: str, vac_data: Dict[str, float]  # pylint: disable=unused-argument
) -> str:
    """Generate a gentle suggestion based on VAC state."""
    arousal = vac_data.get("arousal", 0)
    valence = vac_data.get("valence", 0)
    connection = vac_data.get("connection", 0)

    if abs(arousal) > max(abs(valence), abs(connection)):
        # Arousal-focused
        if arousal > 0.5:
            suggestions = [
                "You might try placing a hand on your heart and noticing the physical sensations",
                "Consider taking three slow breaths, making the exhale longer than the inhale",
                "It might help to gently move your body - even just stretching or walking",
            ]
        else:
            suggestions = [
                "You might notice what small thing could bring even a tiny bit of energy",
                "Consider stepping outside or opening a window to change your environment",
                "Sometimes gentle movement can help when energy is low",
            ]
    elif abs(connection) > abs(valence):
        # Connection-focused
        if connection < 0:
            suggestions = [
                "You might reach out to someone, even just to say hello",
                "Consider doing something that usually makes you feel connected to yourself",
                "It might help to remember times when you did feel connected",
            ]
        else:
            suggestions = [
                "You might share this feeling with someone who cares about you",
                "Consider savoring this sense of connection",
                "Notice what's contributing to feeling connected",
            ]
    else:
        # Valence-focused
        if valence < 0:
            suggestions = [
                f"You might name this feeling out loud: 'I'm feeling {emotion_name.lower()}'",
                "Consider writing down what you're experiencing, without judgment",
                "It might help to remember this is temporary, even if it doesn't feel that way",
            ]
        else:
            suggestions = [
                "You might take a moment to really notice and savor this feeling",
                "Consider what you could do to extend or deepen this positive state",
                "Try to notice what specifically is creating this",
            ]

    return random.choice(suggestions)


def generate_gentle_invitations(
    emotion_name: str, vac_data: Dict[str, float], message_count: int
) -> List[Dict[str, str]]:
    """Generate 2-3 gentle invitations, alternating reflections and suggestions."""
    invitations = []

    # Odd messages = start with reflection
    # Even messages = start with suggestion
    start_with_reflection = message_count % 2 == 1

    if start_with_reflection:
        invitations.append(
            {
                "type": "reflection",
                "text": generate_reflection_question(emotion_name, vac_data),
            }
        )
        invitations.append(
            {
                "type": "suggestion",
                "text": generate_gentle_suggestion(emotion_name, vac_data),
            }
        )
    else:
        invitations.append(
            {
                "type": "suggestion",
                "text": generate_gentle_suggestion(emotion_name, vac_data),
            }
        )
        invitations.append(
            {
                "type": "reflection",
                "text": generate_reflection_question(emotion_name, vac_data),
            }
        )

    # Optional third: Add grounding for high arousal
    if vac_data.get("arousal", 0) > 0.7:
        invitations.append(
            {
                "type": "suggestion",
                "text": (
                    "You might try placing a hand on your heart and taking three " "slow breaths"
                ),
            }
        )

    return invitations


def generate_warm_summary_structured(
    emotion: Dict[str, Any],
    vac_data: Dict[str, float],
    prosody_data: Optional[Dict[str, Any]],
    message_count: int = 1,
) -> Dict[str, Any]:
    """Generate structured warm mode insights."""
    valence = vac_data.get("valence", 0.0)

    # Build structured insights
    structured = {
        "opening": generate_warm_opening(emotion["name"], valence),
        "emotion_understanding": get_emotion_understanding_warm(emotion["name"]),
        "vac_interpretation": {
            "energy_state": interpret_arousal_warm(vac_data["arousal"]),
            "emotional_tone": interpret_valence_warm(vac_data["valence"]),
            "connection_quality": interpret_connection_warm(vac_data["connection"]),
        },
        "gentle_invitations": generate_gentle_invitations(emotion["name"], vac_data, message_count),
    }

    # Add voice observations if available
    if prosody_data:
        structured["voice_observations"] = generate_voice_observations_warm(prosody_data, vac_data)

    return structured


def generate_warm_summary_legacy(
    emotion: Dict[str, Any],
    vac_data: Dict[str, float],
    confidence: float,  # pylint: disable=unused-argument
    prosody_data: Optional[Dict[str, Any]],
    reasoning: Optional[str],  # pylint: disable=unused-argument
) -> str:
    """Generate warm/conversational summary (legacy format)."""
    valence = vac_data.get("valence", 0.0)
    arousal = vac_data.get("arousal", 0.0)
    connection = vac_data.get("connection", 0.0)

    # Opening based on emotion valence
    if valence < -0.3:
        opening = f"I hear that you're experiencing {emotion['name'].lower()}. "
    elif valence > 0.3:
        opening = f"It sounds like you're feeling {emotion['name'].lower()}. "
    else:
        opening = f"You seem to be in a state of {emotion['name'].lower()}. "

    # Add context based on arousal
    if arousal > 0.5:
        opening += "There's a lot of energy in what you're expressing. "
    elif arousal < -0.3:
        opening += "You sound quite low-energy or tired. "

    # Add connection insight
    if connection > 0.5:
        opening += "This emotion connects you with others and your values. "
    elif connection < -0.3:
        opening += "This might be making you feel disconnected or alone. "

    summary = opening + "\n\n"

    # Add voice observations if available
    if prosody_data:
        voice_obs = generate_voice_observations_legacy(prosody_data, vac_data)
        if voice_obs:
            summary += voice_obs + "\n\n"

    # Add what this emotion means
    summary += f"**What this means:** {emotion['definition']}\n\n"

    # Add category context
    summary += f"This emotion belongs to: *{emotion['category']}*"

    return summary
