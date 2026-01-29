#!/usr/bin/env python3
"""
analyze-swift-complexity.py

Scans a Swift codebase and reports on file complexity metrics:
- Lines of Code (LOC)
- Number of Imports
- "Body Length" (Heuristic for class/struct size)

Usage:
    python3 analyze-swift-complexity.py <directory_to_scan> [--limit N]
"""

import os
import sys
import argparse
from pathlib import Path

def analyze_file(file_path):
    """
    Analyzes a single swift file and returns metrics.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except UnicodeDecodeError:
        return None

    # Filter out empty lines for a rough LOC count
    non_empty_lines = [l for l in lines if l.strip()]
    loc = len(non_empty_lines)
    
    # Count imports
    imports = sum(1 for l in non_empty_lines if l.strip().startswith('import '))
    
    # Heuristic: simple byte size / 1024 for KB
    size_kb = os.path.getsize(file_path) / 1024
    
    return {
        'path': str(file_path),
        'name': file_path.name,
        'loc': loc,
        'imports': imports,
        'size_kb': size_kb
    }

def main():
    parser = argparse.ArgumentParser(description="Analyze Swift Complexity")
    parser.add_argument("directory", help="Root directory to scan")
    parser.add_argument("--limit", type=int, default=10, help="Number of 'hotspots' to show")
    parser.add_argument("--min-loc", type=int, default=200, help="Minimum LOC to report")
    
    args = parser.parse_args()
    
    root_dir = Path(args.directory)
    if not root_dir.exists():
        print(f"Error: Directory {root_dir} not found.")
        sys.exit(1)
        
    metrics_list = []
    
    print(f"Scanning {root_dir}...")
    
    for root, dirs, files in os.walk(root_dir):
        # Skip hidden dirs and build artifacts
        if '.build' in root or '.git' in root or 'node_modules' in root:
            continue
            
        for file in files:
            if file.endswith('.swift'):
                path = Path(root) / file
                metrics = analyze_file(path)
                if metrics:
                    metrics_list.append(metrics)

    # Sort by LOC descending
    metrics_list.sort(key=lambda x: x['loc'], reverse=True)
    
    # Print Report
    print(f"\n{'File Name':<40} {'LOC':<10} {'Imports':<10} {'Size (KB)':<10}")
    print("-" * 75)
    
    hotspots_found = 0
    for m in metrics_list:
        if m['loc'] >= args.min_loc:
            print(f"{m['name']:<40} {m['loc']:<10} {m['imports']:<10} {m['size_kb']:<10.1f}")
            hotspots_found += 1
            if hotspots_found >= args.limit:
                break
                
    print("-" * 75)
    print(f"Total Swift Files Scanned: {len(metrics_list)}")
    
    if hotspots_found > 0:
        # Return 0 if successful scanning, but maybe we want to return 1 if thresholds exceeded? 
        # For now, just report.
        sys.exit(0)
    else:
        print("No hotspots found above threshold.")
        sys.exit(0)

if __name__ == "__main__":
    main()
