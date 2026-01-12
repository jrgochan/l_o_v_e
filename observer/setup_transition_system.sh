#!/bin/bash
#
# Quick-Start Script for Emotional State Transition System
# 
# This script sets up the transition system database and seeds initial data.
#

set -e  # Exit on error

echo "============================================================"
echo "  L.O.V.E. Transition System - Quick Start Setup"
echo "============================================================"
echo ""

# Check if we're in the observer directory
if [ ! -f "app/main.py" ]; then
    echo "❌ Error: Please run this script from the observer/ directory"
    exit 1
fi

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  Virtual environment not activated. Activating..."
    source venv/bin/activate || {
        echo "❌ Failed to activate venv. Please run:"
        echo "   cd observer && source venv/bin/activate"
        exit 1
    }
fi

echo "✅ Virtual environment: $VIRTUAL_ENV"
echo ""

# Load database variables from .env file (only DB-related vars to avoid JSON parsing issues)
if [ -f ".env" ]; then
    echo "📄 Loading database config from .env..."
    export $(grep -E '^POSTGRES_' .env | xargs)
fi

# Check database connection
echo "📊 Checking database connection..."
DB_NAME="${POSTGRES_DB:-love_db}"
DB_USER="${POSTGRES_USER:-love_user}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "   Using: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

if ! psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Cannot connect to database. Please ensure PostgreSQL is running:"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    echo "   Host: $DB_HOST"
    exit 1
fi

echo "✅ Database connection successful"
echo ""

# Apply migration
echo "🔧 Applying database migration..."
if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -f migrations/versions/add_transition_system_tables.sql > /dev/null 2>&1; then
    echo "✅ Migration applied successfully"
else
    echo "⚠️  Migration may have already been applied or failed"
    echo "   (This is ok if tables already exist)"
fi
echo ""

# Seed initial data
echo "🌱 Seeding initial transition data..."
if python scripts/seed_transition_data.py; then
    echo "✅ Data seeded successfully"
else
    echo "❌ Failed to seed data. Check errors above."
    exit 1
fi
echo ""

# Verify data
echo "🔍 Verifying seeded data..."
echo ""

STRATEGY_COUNT=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM transition_strategies;" 2>/dev/null | tr -d '[:space:]')
echo "   Strategies: $STRATEGY_COUNT"

CATEGORY_COUNT=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM category_transitions;" 2>/dev/null | tr -d '[:space:]')
echo "   Category Transitions: $CATEGORY_COUNT"

PATTERN_COUNT=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM transition_patterns;" 2>/dev/null | tr -d '[:space:]')
echo "   Transition Patterns: $PATTERN_COUNT"

echo ""
echo "============================================================"
echo "  ✅ Setup Complete!"
echo "============================================================"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Start the Observer API:"
echo "   python app/main.py"
echo ""
echo "2. View API documentation:"
echo "   open http://localhost:8000/docs"
echo ""
echo "3. Test the transition-path endpoint:"
echo "   curl -X POST http://localhost:8000/observer/transition-path \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{"
echo '       "user_id": "00000000-0000-0000-0000-000000000001",'
echo '       "current_vac": [-0.5, 0.7, -0.4],'
echo '       "goal_vac": [0.5, -0.7, 0.4],'
echo '       "max_waypoints": 3'
echo "     }'"
echo ""
echo "4. Or test in the Experience web app:"
echo "   cd ../experience/web"
echo "   npm run dev"
echo "   open http://localhost:3000"
echo ""
echo "Happy emotional navigation! 🧭✨"
echo ""
