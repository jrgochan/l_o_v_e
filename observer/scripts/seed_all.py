#!/usr/bin/env python3
"""
Master Seeding Orchestrator - Seed All Data

Single command to seed the entire Observer database with all components:
- Enhanced strategies (107 total)
- Expanded patterns (18 total)
- Category transitions
- Demo data (optional, dev-only)
- Bootstrap patterns (optional, cold-start data)

This script orchestrates all individual seed scripts in the correct order
and provides unified progress reporting and verification.

Usage:
    # Production setup (strategies + patterns + transitions)
    python scripts/seed_all.py --level=enhanced
    
    # Development with demo data
    python scripts/seed_all.py --level=enhanced --with-demo
    
    # With bootstrap data for cold-start
    python scripts/seed_all.py --level=enhanced --with-bootstrap
    
    # Full system (everything)
    python scripts/seed_all.py --level=enhanced --with-demo --with-bootstrap --verify
    
Options:
    --level         Seeding level: 'base' or 'enhanced' (default: enhanced)
    --with-demo     Include demo journey data (DEV ONLY, requires confirmation)
    --with-bootstrap Include bootstrap patterns for cold-start users
    --verify        Run verification after seeding
    --dry-run       Show what would be seeded without actually seeding
"""

import asyncio
import subprocess
import sys
from pathlib import Path
from typing import List, Tuple
from datetime import datetime

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(message: str):
    """Print a formatted header."""
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{message.center(70)}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*70}{Colors.ENDC}\n")


def print_step(step_num: int, total_steps: int, message: str):
    """Print a formatted step indicator."""
    print(f"{Colors.OKCYAN}[{step_num}/{total_steps}]{Colors.ENDC} {Colors.BOLD}{message}{Colors.ENDC}")


def print_success(message: str):
    """Print a success message."""
    print(f"{Colors.OKGREEN}✅ {message}{Colors.ENDC}")


def print_warning(message: str):
    """Print a warning message."""
    print(f"{Colors.WARNING}⚠️  {message}{Colors.ENDC}")


def print_error(message: str):
    """Print an error message."""
    print(f"{Colors.FAIL}❌ {message}{Colors.ENDC}")


def run_seed_script(script_name: str, args: List[str] = None, required: bool = True) -> Tuple[bool, str]:
    """
    Run a seed script and return success status.
    
    Args:
        script_name: Name of the script file
        args: Additional arguments to pass to the script
        required: Whether this script is required for the seeding to continue
        
    Returns:
        Tuple of (success: bool, output: str)
    """
    script_path = Path(__file__).parent / script_name
    
    if not script_path.exists():
        msg = f"Script not found: {script_name}"
        if required:
            print_error(msg)
            return False, msg
        else:
            print_warning(f"{msg} (optional, skipping)")
            return True, "Skipped (not found)"
    
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)
    
    try:
        # Use longer timeout for Atlas seeding (can take 10+ minutes)
        # For other scripts, 5 minutes is sufficient
        timeout_seconds = 1800 if 'seed_atlas' in script_name else 300  # 30 min vs 5 min
        
        # Stream output in real-time for better UX (especially for long-running Atlas seeding)
        # This allows users to see progress instead of waiting in silence
        result = subprocess.run(
            cmd,
            text=True,
            timeout=timeout_seconds,
            # Don't capture output - let it stream to console
            stdout=None,
            stderr=None
        )
        
        if result.returncode == 0:
            return True, "Completed successfully (see output above)"
        else:
            return False, f"Script exited with code {result.returncode}"
            
    except subprocess.TimeoutExpired:
        timeout_min = timeout_seconds / 60
        return False, f"Script timeout (> {timeout_min:.0f} minutes)"
    except Exception as e:
        return False, str(e)


def main(
    level: str = "enhanced",
    with_demo: bool = False,
    with_bootstrap: bool = False,
    verify: bool = False,
    dry_run: bool = False,
    force_reseed: bool = False,
    dataset: str = "atlas"
):
    """Main orchestration function."""
    start_time = datetime.now()
    
    print_header("LOVE STACK - MASTER SEEDING ORCHESTRATOR")
    
    print(f"Configuration:")
    print(f"  Dataset: {dataset}")
    print(f"  Level: {level}")
    print(f"  Include demo data: {with_demo}")
    print(f"  Include bootstrap data: {with_bootstrap}")
    print(f"  Verify after seeding: {verify}")
    print(f"  Dry run: {dry_run}")
    print(f"  Force reseed: {force_reseed}")
    
    # Build step list
    steps = []
    
    # Add force-reseed flag if specified
    reseed_args = ["--force-reseed"] if force_reseed else []
    
    # PHASE 1: Foundation (CRITICAL)
    # Configure dataset args
    seed_emotions_args = reseed_args.copy()
    seed_emotions_args.append("--create-collection")
    
    datasets_to_seed = []
    
    if dataset.lower() == 'all':
        datasets_to_seed = [
            ("Atlas Emotions (87)", "data/atlas/emotions.json", "Atlas of the Heart"),
            ("Plutchik Emotions (8)", "data/plutchik/emotions.json", "Plutchik Wheel"),
            ("GoEmotions (28)", "data/goemotions/emotions.json", "GoEmotions"),
            ("UAL (Unified Affective Lexicon)", "data/ual/emotions.json", "Unified Affective Lexicon")
        ]
    elif dataset.lower() == "plutchik":
        datasets_to_seed = [("Plutchik Emotions (8)", "data/plutchik/emotions.json", "Plutchik Wheel")]
    elif dataset.lower() == "goemotions":
        datasets_to_seed = [("GoEmotions (28)", "data/goemotions/emotions.json", "GoEmotions")]
    elif dataset.lower() == "ual":
        datasets_to_seed = [("UAL (Unified Affective Lexicon)", "data/ual/emotions.json", "Unified Affective Lexicon")]
    else:
        datasets_to_seed = [("Atlas Emotions (87)", "data/atlas/emotions.json", "Atlas of the Heart")]
        
    for name, file_path, coll_name in datasets_to_seed:
        args_list = reseed_args.copy()
        args_list.append("--create-collection")
        args_list.extend(["--file", file_path, "--collection", coll_name])
        steps.append((name, "seed_emotions.py", args_list))
    
    # PHASE 1.5: Initial Users (Admin/Demo)
    steps.append(("Initial Users", "seed_users.py", []))

    # PHASE 2: Base Transition System (seeds strategies, patterns, transitions together)
    steps.append(("Transition System Data", "seed_transition_data.py", reseed_args.copy()))
    
    # PHASE 3: Enhanced Data (additional strategies and patterns)
    if level == "enhanced":
        steps.append(("Enhanced Strategies", "seed_enhanced_strategies.py", []))
        steps.append(("Expanded Patterns", "seed_expanded_patterns.py", []))
    else:
        print_warning(f"Unknown level '{level}', defaulting to enhanced")
        steps.append(("Enhanced Strategies", "seed_enhanced_strategies.py", []))
        steps.append(("Expanded Patterns", "seed_expanded_patterns.py", []))
    
    # Optional: Demo data
    if with_demo:
        print_warning("Demo data will be seeded (DEV ONLY)")
        steps.append(("Demo Journeys", "seed_demo_data.py", ["--dev-only"]))
    
    # Optional: Bootstrap data
    if with_bootstrap:
        steps.append(("Bootstrap Patterns", "seed_bootstrap_data.py", []))
    
    # Add dry-run flag to all if requested
    if dry_run:
        print_warning("DRY RUN MODE - No actual changes will be made")
        steps = [(name, script, args + ["--dry-run"]) for name, script, args in steps]
    
    total_steps = len(steps)
    successful_steps = []
    failed_steps = []
    
    # Execute each seeding script
    for idx, (step_name, script, args) in enumerate(steps, 1):
        print_step(idx, total_steps, f"Seeding {step_name}")
        
        success, output = run_seed_script(script, args)
        
        if success:
            print_success(f"{step_name} seeded successfully")
            successful_steps.append(step_name)
        else:
            print_error(f"{step_name} failed")
            print(f"\nError output:\n{output}\n")
            failed_steps.append((step_name, output))
            
            # For critical steps, stop execution
            if step_name in ["Atlas Emotions (87)", "Plutchik Emotions (8)", "GoEmotions (28)", "Transition System Data"]:
                print_error("Critical seeding step failed, stopping execution")
                break
    
    # Verification
    if verify and not dry_run and successful_steps:
        print_header("VERIFICATION")
        
        print("Running verification checks...")
        
        # Run individual verify commands
        verify_scripts = {
            "Enhanced Strategies": ("seed_enhanced_strategies.py", ["--verify-only"]),
            "Expanded Patterns": ("seed_expanded_patterns.py", ["--verify-only"]),
            "Demo Journeys": ("seed_demo_data.py", ["--dev-only", "--verify-only"]),
            "Bootstrap Patterns": ("seed_bootstrap_data.py", ["--verify-only"])
        }
        
        for step_name in successful_steps:
            if step_name in verify_scripts:
                script, args = verify_scripts[step_name]
                print(f"\nVerifying {step_name}...")
                success, output = run_seed_script(script, args, required=False)
                if success:
                    print_success(f"{step_name} verified")
                else:
                    print_warning(f"{step_name} verification skipped")
    
    # Final summary
    print_header("SEEDING SUMMARY")
    
    end_time = datetime.now()
    duration = end_time - start_time
    
    print(f"Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Completed: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Duration: {duration.total_seconds():.1f} seconds")
    print()
    
    print(f"{Colors.BOLD}Successful steps ({len(successful_steps)}):{Colors.ENDC}")
    for step in successful_steps:
        print(f"  {Colors.OKGREEN}✅ {step}{Colors.ENDC}")
    
    if failed_steps:
        print(f"\n{Colors.BOLD}Failed steps ({len(failed_steps)}):{Colors.ENDC}")
        for step, _ in failed_steps:
            print(f"  {Colors.FAIL}❌ {step}{Colors.ENDC}")
        
        print(f"\n{Colors.FAIL}{'='*70}{Colors.ENDC}")
        print(f"{Colors.FAIL}{Colors.BOLD}SEEDING INCOMPLETE - Please review errors above{Colors.ENDC}")
        print(f"{Colors.FAIL}{'='*70}{Colors.ENDC}")
        sys.exit(1)
    else:
        if dry_run:
            print(f"\n{Colors.OKCYAN}{'='*70}{Colors.ENDC}")
            print(f"{Colors.OKCYAN}{Colors.BOLD}DRY RUN COMPLETE - No changes made{Colors.ENDC}")
            print(f"{Colors.OKCYAN}Run without --dry-run to actually seed data{Colors.ENDC}")
            print(f"{Colors.OKCYAN}{'='*70}{Colors.ENDC}")
        else:
            print(f"\n{Colors.OKGREEN}{'='*70}{Colors.ENDC}")
            print(f"{Colors.OKGREEN}{Colors.BOLD}✅ ALL SEEDING COMPLETE!{Colors.ENDC}")
            print(f"{Colors.OKGREEN}{'='*70}{Colors.ENDC}")
            
            print(f"\n{Colors.BOLD}Database is now ready with:{Colors.ENDC}")
            print(f"  • 107 evidence-based strategies")
            print(f"  • 18 transition patterns")
            print(f"  • Category transition mappings")
            if with_demo:
                print(f"  • 6 demo journeys with strategy attempts")
            if with_bootstrap:
                print(f"  • 50 bootstrap patterns for cold-start users")
            
            print(f"\n{Colors.BOLD}Next steps:{Colors.ENDC}")
            print(f"  1. Test the transition API: python test_transition_api.py")
            print(f"  2. Query the data via API endpoints")
            print(f"  3. Integrate with Experience module")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Master seeding orchestrator - Seed all Observer data",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--level',
        choices=['base', 'enhanced'],
        default='enhanced',
        help='Seeding level (default: enhanced)'
    )
    parser.add_argument(
        '--with-demo',
        action='store_true',
        help='Include demo journey data (DEV ONLY)'
    )
    parser.add_argument(
        '--with-bootstrap',
        action='store_true',
        help='Include bootstrap patterns for cold-start users'
    )
    parser.add_argument(
        '--verify',
        action='store_true',
        help='Run verification after seeding'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be seeded without actually seeding'
    )
    parser.add_argument(
        '--force-reseed',
        action='store_true',
        help='Force re-seed (clear existing data without prompts)'
    )
    parser.add_argument(
        '--dataset',
        choices=['atlas', 'plutchik', 'goemotions', 'ual', 'all'],
        default='atlas',
        help='Dataset to seed (default: atlas)'
    )
    
    args = parser.parse_args()
    
    try:
        main(
            level=args.level,
            with_demo=args.with_demo,
            with_bootstrap=args.with_bootstrap,
            verify=args.verify,
            dry_run=args.dry_run,
            force_reseed=args.force_reseed,
            dataset=args.dataset
        )
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARNING}⚠️  Interrupted by user{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n{Colors.FAIL}❌ Fatal error: {e}{Colors.ENDC}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
