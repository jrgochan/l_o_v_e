#!/usr/bin/env python3
"""
Data Validation Script

Validates all JSON data files against their JSON Schemas to ensure data quality
before seeding into the database.

Usage:
    python scripts/validate_data.py
    python scripts/validate_data.py --file data/brene_brown/emotions.json
    python scripts/validate_data.py --strict

Benefits:
    - Catch invalid VAC coordinates (e.g., out of [-1.0, 1.0] range)
    - Enforce required fields
    - Prevent typos in category names, evidence levels, etc.
    - Document expected data structure
    - Run in CI/CD to prevent bad data commits
"""

import json
import sys
from pathlib import Path
from typing import Tuple

# Try to import jsonschema (may not be installed)
try:
    from jsonschema import ValidationError, validate

    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False
    print("⚠️  jsonschema not installed - install with: pip install jsonschema")
    print("   Validation will be skipped")


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"


def validate_file(json_path: Path, schema_file: Path) -> Tuple[bool, str]:
    """
    Validate a JSON file against its schema.

    Returns:
        (success: bool, message: str)
    """
    if not HAS_JSONSCHEMA:
        return True, "Skipped (jsonschema not installed)"

    try:
        # Load data
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Load schema
        with open(schema_file, "r", encoding="utf-8") as f:
            schema = json.load(f)

        # Validate
        validate(instance=data, schema=schema)

        # Additional custom validations
        if "emotions.json" in str(json_path):
            # Check for duplicate emotion names
            names = [e["emotion_name"] for e in data["emotions"]]
            if len(names) != len(set(names)):
                return False, "Duplicate emotion names found"

            # Check VAC coordinate validity
            for emotion in data["emotions"]:
                vac = emotion["vac"]
                if any(v < -1.0 or v > 1.0 for v in vac):
                    return False, f"Invalid VAC for {emotion['emotion_name']}: {vac}"

        return True, "Valid"

    except ValidationError as e:
        return False, f"Schema validation failed: {e.message}"
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {e}"
    except Exception as e:
        return False, f"Error: {e}"


def validate_all_data(strict: bool = False) -> bool:
    """
    Validate all JSON data files.

    Args:
        strict: If True, fail on any validation error. If False, warn but continue.

    Returns:
        True if all validations passed
    """
    # Define data files and their schemas
    validations = [
        (
            "data/brene_brown/emotions.json",
            "data/brene_brown/schemas/emotions.schema.json",
        ),
        (
            "data/strategies/base/core_strategies.json",
            "data/strategies/schemas/strategy.schema.json",
        ),
        # Enhanced strategies (all use same schema)
        (
            "data/strategies/dbt_skills.json",
            "data/strategies/schemas/strategy.schema.json",
        ),
        (
            "data/strategies/act_techniques.json",
            "data/strategies/schemas/strategy.schema.json",
        ),
        (
            "data/strategies/mindfulness.json",
            "data/strategies/schemas/strategy.schema.json",
        ),
        (
            "data/strategies/somatic.json",
            "data/strategies/schemas/strategy.schema.json",
        ),
        (
            "data/strategies/social_connection.json",
            "data/strategies/schemas/strategy.schema.json",
        ),
        (
            "data/strategies/creative_expression.json",
            "data/strategies/schemas/strategy.schema.json",
        ),
        (
            "data/strategies/meaning_making.json",
            "data/strategies/schemas/strategy.schema.json",
        ),
    ]

    base_dir = Path(__file__).parent.parent

    print(f"\n{Colors.BOLD}{'='*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}DATA VALIDATION{Colors.ENDC}")
    print(f"{Colors.BOLD}{'='*70}{Colors.ENDC}\n")

    if not HAS_JSONSCHEMA:
        print(
            f"{Colors.YELLOW}⚠️  jsonschema not installed - skipping validation{Colors.ENDC}"
        )
        print("   Install with: pip install jsonschema\n")
        return not strict

    passed = 0
    failed = 0
    errors = []

    for data_file, schema_file in validations:
        data_path = base_dir / data_file
        schema_path = base_dir / schema_file

        # Check if files exist
        if not data_path.exists():
            print(f"{Colors.YELLOW}⏭️  {data_file} - Not found (skipping){Colors.ENDC}")
            continue

        if not schema_path.exists():
            print(f"{Colors.YELLOW}⏭️  {data_file} - No schema (skipping){Colors.ENDC}")
            continue

        # Validate
        success, message = validate_file(data_path, schema_path)

        if success:
            print(f"{Colors.GREEN}✅ {data_file}{Colors.ENDC} - {message}")
            passed += 1
        else:
            print(f"{Colors.RED}❌ {data_file}{Colors.ENDC}")
            print(f"   {message}")
            failed += 1
            errors.append((data_file, message))

    # Summary
    print(f"\n{Colors.BOLD}{'='*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}VALIDATION SUMMARY{Colors.ENDC}")
    print(f"{Colors.BOLD}{'='*70}{Colors.ENDC}\n")

    print(f"Passed: {Colors.GREEN}{passed}{Colors.ENDC}")
    print(f"Failed: {Colors.RED}{failed}{Colors.ENDC}")
    print(f"Total:  {passed + failed}\n")

    if failed > 0:
        print(f"{Colors.RED}{'='*70}{Colors.ENDC}")
        print(f"{Colors.RED}VALIDATION FAILED{Colors.ENDC}")
        print(f"{Colors.RED}{'='*70}{Colors.ENDC}\n")

        for file, error in errors:
            print(f"{Colors.RED}❌ {file}:{Colors.ENDC}")
            print(f"   {error}\n")

        return False
    else:
        print(f"{Colors.GREEN}{'='*70}{Colors.ENDC}")
        print(f"{Colors.GREEN}✅ ALL DATA VALID{Colors.ENDC}")
        print(f"{Colors.GREEN}{'='*70}{Colors.ENDC}\n")

        return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Validate Observer JSON data files")
    parser.add_argument("--file", help="Validate specific file")
    parser.add_argument(
        "--strict", action="store_true", help="Fail on any validation error (for CI/CD)"
    )

    args = parser.parse_args()

    if args.file:
        # Validate single file
        data_path = Path(args.file)
        # Infer schema path
        if "emotions.json" in args.file:
            schema_path = Path("data/brene_brown/schemas/emotions.schema.json")
        elif "strategies" in args.file:
            schema_path = Path("data/strategies/schemas/strategy.schema.json")
        else:
            print(f"Cannot infer schema for {args.file}")
            sys.exit(1)

        success, message = validate_file(data_path, schema_path)
        print(f"{'✅' if success else '❌'} {args.file}: {message}")
        sys.exit(0 if success else 1)
    else:
        # Validate all
        success = validate_all_data(strict=args.strict)
        sys.exit(0 if success else 1)
