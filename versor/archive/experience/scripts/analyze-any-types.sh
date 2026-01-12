#!/bin/bash
# Analyze remaining any types by file

echo "=== Production Files with 'any' types (excluding tests) ==="
npm run lint 2>&1 | grep -v "__tests__" | grep "no-explicit-any" -B1 | grep "\.tsx\?" | sed 's|/Users/jrgochan/code/gitlab.com/l_o_v_e/experience/web/||' | sort | uniq -c | sort -rn | head -20
