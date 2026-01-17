# L.O.V.E. Stack - Database Setup Guide

This guide covers database initialization for the L.O.V.E. Observer module.

## Overview

The Observer module requires a PostgreSQL database with:
- **Extensions**: pgvector, uuid-ossp, pg_trgm
- **Schema**: Tables created via Alembic migrations
- **Seed Data**: Core emotions, strategies, patterns, and transitions

## Quick Start

### Automatic Setup (Recommended)

During first-time setup, the database is initialized automatically:

```bash
cd infra
./setup-love-stack.sh
```

When prompted, choose **Yes** to initialize the database.

### Manual Initialization

If you skipped database setup or need to reinitialize:

```bash
cd infra
./init-database.sh
```

## Database Initialization Script

### What `init-database.sh` Does

1. **Pre-flight checks**: Verifies PostgreSQL is installed and running
2. **Database creation**: Creates `love_db` database if needed
3. **Extension setup**: Installs pgvector, uuid-ossp, and pg_trgm
4. **Schema migration**: Runs all Alembic migrations to create tables
5. **Data seeding**: Populates database with required data:
   - 87 emotions from Atlas of the Heart
   - 107 evidence-based strategies
   - 18 transition patterns
   - Category mappings and transitions
   - Waypoint templates
6. **Verification**: Confirms all tables and data exist

### Usage Options

```bash
# Standard initialization (with seed data)
./init-database.sh

# Skip data seeding (schema only)
./init-database.sh --skip-seed

# Include demo journey data (development only)
./init-database.sh --with-demo

# Include bootstrap patterns (cold-start user data)
./init-database.sh --with-bootstrap

# Force re-seeding (clear existing data)
./init-database.sh --force-reseed

# Combine options
./init-database.sh --with-demo --with-bootstrap
```

## Database Configuration

### Default Settings

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=love_db
DB_USER=love_user
DB_PASSWORD=love_password
```

### Custom Configuration

Set environment variables before running the script:

```bash
export DB_HOST=myhost
export DB_PORT=5433
export DB_NAME=my_love_db
export DB_USER=myuser
export DB_PASSWORD=mypassword

./init-database.sh
```

Or modify `observer/.env`:

```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

## Seeded Data Details

### Core Data (Always Seeded)

#### Atlas Emotions (87 total)
From Brené Brown's "Atlas of the Heart", organized in 13 categories:

- When Things Are Uncertain or Too Much
- When We Compare
- When Things Don't Go As Planned
- When It's Beyond Us
- When Things Aren't What They Seem
- When We're Hurting
- Places We Go With Others
- When We Fall Short
- When We Search for Connection
- When the Heart Is Open
- When Life Is Good
- When We Feel Wronged
- When We Self-Assess

Each emotion includes:
- Name and definition
- VAC coordinates (Valence, Arousal, Connection)
- Quaternion state vector
- Semantic embedding (384-dimensional)
- Haptic pattern ID
- Category assignment

#### Strategies (107 total)
Evidence-based coping strategies:
- Behavioral activation
- Cognitive restructuring
- Mindfulness practices
- Social connection
- Physiological regulation
- And more...

#### Patterns (18 total)
Common emotional transition patterns with difficulty ratings.

#### Transitions
Category-level transition mappings showing which emotion categories commonly flow to others.

#### Waypoint Templates
Pre-defined waypoint explanations for transition journeys.

### Optional Data

#### Demo Data (`--with-demo`)
Sample journey data for development/testing:
- 6 demo user journeys
- Strategy attempts with outcomes
- Example transitions

⚠️ **Development only** - Not for production use.

#### Bootstrap Data (`--with-bootstrap`)
Cold-start patterns for new users:
- Strategy effectiveness ratings (aggregate data)
- Path templates for common transitions
- Contextual modifiers for recommendations
- Common challenge patterns

Helps provide recommendations before personalized data accumulates.

## Troubleshooting

### PostgreSQL Not Running

**Symptoms:**
```
Cannot connect to PostgreSQL
```

**Solution:**
```bash
# macOS
brew services start postgresql@16

# Ubuntu/Debian
sudo systemctl start postgresql

# Manual start
pg_ctl -D /path/to/data start
```

### Database Already Exists

The script is idempotent - safe to run multiple times. If data exists, you'll be prompted:

```
Database already contains 87 emotions
Clear and re-seed all data? (yes/no):
```

Choose:
- **yes**: Clear and re-seed all data
- **no**: Skip seeding (keeps existing data)

Or use `--force-reseed` to skip the prompt.

### Migration Failures

**Check logs:**
```bash
cat /tmp/alembic-output.log
```

**Common issues:**
- Database connection refused → Start PostgreSQL
- Permission denied → Check DB_USER has CREATE privileges
- Extension errors → May need superuser for pgvector

**Manual migration:**
```bash
cd observer
source venv/bin/activate
alembic upgrade head
```

### Seeding Failures

**Check specific seed script:**
```bash
cd observer
source venv/bin/activate

# Test individual scripts
python scripts/seed_atlas.py
python scripts/seed_enhanced_strategies.py
python scripts/seed_expanded_patterns.py
```

**Common issues:**
- Versor API not running → Quaternion generation fails
- Missing dependencies → Run `pip install -r requirements.txt`
- Network issues → Embedding service unreachable

## Verification

### Check Database

```bash
# Connect to database
psql -U postgres -d love_observer

# Verify tables
\dt

# Check emotion count
SELECT COUNT(*) FROM atlas_definitions;
-- Should return 87

# Check categories
SELECT category, COUNT(*) FROM atlas_definitions GROUP BY category;
```

### Check via API

Start the Observer API:
```bash
cd infra
./run-love-stack.sh
```

Then access:
- API Docs: http://localhost:8000/docs
- Emotions endpoint: http://localhost:8000/api/atlas/emotions
- Categories: http://localhost:8000/api/atlas/categories

## Database Reset

### Complete Reset

```bash
# Stop the stack
cd infra
./stop-love-stack.sh

# Drop database
psql -U postgres -c "DROP DATABASE IF EXISTS love_observer;"

# Reinitialize
./init-database.sh
```

### Reset Data Only

```bash
./init-database.sh --force-reseed
```

This keeps the schema but re-seeds all data.

## Integration with Stack

### First-Time Setup

```bash
cd infra
./setup-love-stack.sh
# Choose "Yes" when prompted to initialize database
```

### Starting the Stack

The run script automatically checks database status:

```bash
cd infra
./run-love-stack.sh
```

If database is not initialized, you'll see:
```
Database 'love_observer' does not exist

Initialize the database first:
  cd infra && ./init-database.sh

Start stack anyway? (Observer API may fail) (yes/no):
```

Choose **no**, initialize database, then restart stack.

## Advanced Usage

### Custom Seeding

Use individual seed scripts for fine-grained control:

```bash
cd observer
source venv/bin/activate

# Seed only emotions
python scripts/seed_atlas.py

# Seed only strategies
python scripts/seed_enhanced_strategies.py

# Use master orchestrator
python scripts/seed_all.py --level=enhanced --verify
```

### Schema-Only Setup

For development where you want to manage data manually:

```bash
./init-database.sh --skip-seed
```

This creates all tables but doesn't populate them.

### Migration Management

```bash
cd observer
source venv/bin/activate

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# Show current version
alembic current
```

## Architecture Notes

### Why Separate init-db.sql and Migrations?

- `init-db.sql`: PostgreSQL-level setup (extensions)
  - Run once per database instance
  - Docker entry point for containers
  
- Alembic migrations: Application schema
  - Version-controlled schema changes
  - Supports rollback and branching
  - Development workflow friendly

### Seeding Strategy

The seed system uses a tiered approach:

1. **Base layer**: Emotions (required by all other data)
2. **Middle layer**: Strategies, patterns (reference emotions)
3. **Top layer**: Transitions (reference categories)
4. **Optional**: Demo and bootstrap data

This ensures referential integrity during seeding.

## Related Documentation

- [Setup Guide](SETUP_UBUNTU_WSL.md) - Full stack setup
- [Observer README](../observer/README.md) - Module overview
- [Seeding System](../observer/SEEDING_SYSTEM_README.md) - Detailed seeding docs
- [Transition System](../observer/TRANSITION_SYSTEM_DESIGN.md) - Transition architecture

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review Observer API logs: `tail -f infra/logs/Observer.log`
3. Verify PostgreSQL is running and accessible
4. Ensure all dependencies are installed: `./setup-love-stack.sh`
5. Check Observer .env configuration

For database-specific issues, you can also run the test setup script:

```bash
cd observer
./scripts/test_setup.sh
```

This performs comprehensive validation of the database and seed data.
