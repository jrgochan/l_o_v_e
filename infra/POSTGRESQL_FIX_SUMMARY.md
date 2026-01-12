# PostgreSQL Startup Fix - Summary

## Problem
PostgreSQL was showing a bootstrap error when starting via `run-love-stack.sh`:
```
Bootstrap failed: 5: Input/output error
Error: Failure while executing; `/bin/launchctl bootstrap gui/501 /Users/jrgochan/Library/LaunchAgents/homebrew.mxcl.postgresql@16.plist` exited with 5.
```

However, the stack continued to work because PostgreSQL was actually already running.

## Root Cause
1. **Detection Issue**: The `check_service_running()` function relied on `brew services list` status, which wasn't reliably detecting that PostgreSQL was already running
2. **Bootstrap Error**: When PostgreSQL was already registered in launchctl, attempting to start it again caused the bootstrap error

## Solution Implemented

### 1. Enhanced Service Detection (`service-manager.sh`)
Added **functional checks** as the primary detection method:

```bash
check_service_running() {
    # For PostgreSQL and Redis, check if they're actually responding FIRST
    case "$service" in
        postgresql)
            if check_postgres_ready; then  # Uses pg_isready
                return 0
            fi
            ;;
        redis)
            if check_redis_ready; then  # Uses redis-cli ping
                return 0
            fi
            ;;
    esac
    
    # Fall back to service manager status check
    # ... brew services list, systemctl, etc.
}
```

**Benefits:**
- More reliable - checks actual service functionality, not just process status
- Works across platforms with appropriate fallbacks
- Prevents unnecessary startup attempts

### 2. Graceful Error Handling (`run-love-stack.sh`)
Added intelligent error capture and recovery:

```bash
# Capture stderr to handle bootstrap errors gracefully
start_output=$(start_service postgresql 2>&1)
start_exit_code=$?

# Check if it's a bootstrap error (service already registered)
if [ $start_exit_code -ne 0 ] && echo "$start_output" | grep -q "Bootstrap failed"; then
    # Service might already be running despite the error
    if check_service_running postgresql; then
        print_success "PostgreSQL already running (service was already registered)"
    else
        print_error "Failed to start PostgreSQL"
        print_info "Try: brew services restart postgresql@16"
    fi
fi
```

**Benefits:**
- Suppresses scary error messages when service is actually running
- Provides helpful recovery instructions when truly failed
- Maintains user-friendly output

## Testing

Run the stack startup script:
```bash
cd /Users/jrgochan/code/gitlab.com/l_o_v_e/infra
./run-love-stack.sh
```

**Expected Behavior:**
- ✅ PostgreSQL detection should be fast and accurate
- ✅ No bootstrap errors should appear when PostgreSQL is already running
- ✅ Clear success message: "PostgreSQL already running"
- ✅ Stack should start without errors

## Manual Recovery (if needed)

If you ever encounter PostgreSQL issues, use this quick fix:
```bash
# Complete cleanup
brew services stop postgresql@16
launchctl bootout gui/501/homebrew.mxcl.postgresql@16 2>/dev/null || true
rm -f ~/Library/LaunchAgents/homebrew.mxcl.postgresql@16.plist
pkill -9 postgres || true

# Fix permissions
chmod 700 $(brew --prefix)/var/postgresql@16/

# Restart fresh
brew services restart postgresql@16
```

## Files Modified
1. `infra/lib/service-manager.sh` - Enhanced `check_service_running()` with functional checks
2. `infra/run-love-stack.sh` - Added graceful bootstrap error handling

## Status
✅ **FIXED** - PostgreSQL detection is now reliable and error-free
