#!/usr/bin/env python3
"""Fix Final 26 MyPy Errors - Quick Script"""

from pathlib import Path

fixes_applied = 0

# Fix 1: Remove redundant casts
print("Removing redundant casts...")

# session_analytics_service.py - line 577
file = Path("app/services/session_analytics_service.py")
content = file.read_text()
if "return cast(SessionAnalytics, analytics)" in content:
    content = content.replace("return cast(SessionAnalytics, analytics)", "return analytics")
    file.write_text(content)
    fixes_applied += 1
    print("✅ session_analytics_service.py line 577")

# session_analytics_service.py - line 594
if "return cast(Dict[str, Any], analytics.to_dict())" in content:
    content = file.read_text()
    content = content.replace("return cast(Dict[str, Any], analytics.to_dict())", "return analytics.to_dict()")
    file.write_text(content)
    fixes_applied += 1
    print("✅ session_analytics_service.py line 594")

# emotion_mapper.py - line 158
file = Path("app/services/emotion_mapper.py")
content = file.read_text()
if "return cast(AtlasDefinition, nearest_emotion)" in content:
    content = content.replace("return cast(AtlasDefinition, nearest_emotion)", "return nearest_emotion")
    file.write_text(content)
    fixes_applied += 1
    print("✅ emotion_mapper.py line 158")

# multi_emotion_analysis.py - lines 535, 537
file = Path("app/models/multi_emotion_analysis.py")
content = file.read_text()
if "return cast(DetectedEmotion, emotion)" in content:
    content = content.replace("return cast(DetectedEmotion, emotion)", "return emotion")
    file.write_text(content)
    fixes_applied += 1
    print("✅ multi_emotion_analysis.py line 535")

content = file.read_text()
if "return cast(DetectedEmotion, self.detected_emotions[0])" in content:
    content = content.replace("return cast(DetectedEmotion, self.detected_emotions[0])", "return self.detected_emotions[0]")
    file.write_text(content)
    fixes_applied += 1
    print("✅ multi_emotion_analysis.py line 537")

# chat_service.py - lines 265, 790
file = Path("app/services/chat_service.py")
content = file.read_text()
if "return cast(Optional[ChatSession], result.scalar_one_or_none())" in content:
    content = content.replace("return cast(Optional[ChatSession], result.scalar_one_or_none())", "return result.scalar_one_or_none()")
    file.write_text(content)
    fixes_applied += 1
    print("✅ chat_service.py line 265")

content = file.read_text()
if "return cast(Dict[str, Any], analysis.to_dict(include_emotions=True, include_relationships=True))" in content:
    content = content.replace(
        "return cast(Dict[str, Any], analysis.to_dict(include_emotions=True, include_relationships=True))",
        "return analysis.to_dict(include_emotions=True, include_relationships=True)"
    )
    file.write_text(content)
    fixes_applied += 1
    print("✅ chat_service.py line 790")

print(f"\n✅ Removed {fixes_applied} redundant casts")
print("\nRemaining fixes need manual attention:")
print("- Assignment errors (Dict to union types)")
print("- Session vs AsyncSession parameters")
print("- Attribute errors (deep_feeling_mode, reached)")
