#!/usr/bin/env python3
"""Clean up unused imports identified by flake8"""

from pathlib import Path

fixes = [
    # main.py
    ("app/main.py", "from typing import Any, Dict, List, Optional", "from typing import Any, Dict"),
    
    # multi_emotion_analysis.py
    ("app/models/multi_emotion_analysis.py", "from typing import TYPE_CHECKING, Any, cast, Dict, List, Optional", "from typing import TYPE_CHECKING, Any, Dict, List, Optional"),
    
    # Remove entire unused import lines from routes that don't use typing
    ("app/api/routes/atlas.py", "from typing import Any, Dict, List, Optional", "from typing import Any, Dict, Optional"),
    ("app/api/routes/chat_websocket.py", "from typing import Any, Dict, List, Optional", "from typing import Any, Dict, Optional"),
    
    # Routes with all typing unused
    ("app/api/routes/current.py", "from typing import Any, Dict, List, Optional\n", ""),
    ("app/api/routes/health.py", "from typing import Any, Dict, List, Optional\n", ""),
    ("app/api/routes/state.py", "from typing import Any, Dict, List, Optional\n", ""),
    
    # Schemas
    ("app/api/schemas/state.py", "from typing import Any, Dict, List, Optional", "from typing import List, Optional"),
    
    # transition_strategy.py
    ("app/models/transition_strategy.py", "from typing import Any, Dict, List, Optional", "from typing import Any, Dict, Optional"),
]

print("Cleaning up unused imports...")
fixed = 0

for file_path, old, new in fixes:
    file = Path(file_path)
    if file.exists():
        content = file.read_text()
        if old in content:
            content = content.replace(old, new)
            file.write_text(content)
            print(f"✅ {file_path}")
            fixed += 1

print(f"\n✅ Cleaned {fixed} files")
print("\nRun flake8 to verify:")
print("  flake8 app --select=F401")
