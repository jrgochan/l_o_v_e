#!/usr/bin/env python3
"""Clean up the final 6 unused imports"""

from pathlib import Path

fixes = [
    (
        "app/api/schemas/state.py",
        "from typing import Any, Dict, List, Optional",
        "from typing import List, Optional",
    ),
    (
        "app/services/chat_service.py",
        "from typing import Any, cast, Dict, List, Optional",
        "from typing import Any, Dict, List, Optional",
    ),
    (
        "app/services/emotion_mapper.py",
        "from typing import cast, List, Optional, Tuple",
        "from typing import List, Optional, Tuple",
    ),
    (
        "app/services/session_analytics_service.py",
        "from typing import Any, cast, Dict, List, Optional",
        "from typing import Any, Dict, List, Optional",
    ),
    ("app/websocket/routes.py", "from typing import Optional", ""),
]

print("Cleaning final 6 unused imports...")
for file_path, old, new in fixes:
    file = Path(file_path)
    if file.exists():
        content = file.read_text()
        if old in content:
            content = content.replace(old, new)
            file.write_text(content)
            print(f"✅ {file_path}")

print("\n🎉 COMPLETE! All unused imports cleaned!")
