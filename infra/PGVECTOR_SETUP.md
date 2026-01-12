# pgvector Setup Guide

## Overview

The L.O.V.E. Stack requires the pgvector extension for PostgreSQL to store and query vector embeddings for emotions and semantic search.

## Simplified Approach (Recommended)

The setup scripts now use **version-agnostic PostgreSQL** - they automatically detect and work with whatever PostgreSQL version is installed on your system.

### macOS with Homebrew

```bash
# Install latest PostgreSQL and pgvector
brew install postgresql pgvector

# Start PostgreSQL
brew services start postgresql

# Verify pgvector is available
psql -d postgres -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"
```

That's it! The pgvector Homebrew package automatically builds for the latest PostgreSQL versions.

### Ubuntu/Debian

```bash
# Add PostgreSQL APT repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install PostgreSQL and build tools
sudo apt install postgresql postgresql-contrib build-essential postgresql-server-dev-all

# Build and install pgvector
cd /tmp
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

## Version Strategy

**The L.O.V.E. Stack is version-agnostic** - it works with PostgreSQL 14+ and uses standard SQL features. This means:

✅ **Use the latest PostgreSQL version** available for your platform
✅ **Automated setup** detects installed version automatically  
✅ **Future-proof** - no hardcoded version dependencies
✅ **Simpler maintenance** - stay current with security patches

### Minimum Requirements

- **PostgreSQL**: Version 14 or higher
- **pgvector**: Version 0.5.0 or higher
- **Python packages**: No PostgreSQL version constraints

### Why Version-Agnostic?

1. **No version-specific SQL** - All migrations use standard PostgreSQL features
2. **No driver limitations** - asyncpg and SQLAlchemy support PostgreSQL 10+
3. **Better security** - Always use latest patches
4. **Simpler setup** - No need to pin specific versions

## Automated Setup

The L.O.V.E. Stack setup scripts handle everything automatically:

1. **`setup-love-stack.sh`**: 
   - Detects installed PostgreSQL version
   - Checks for pgvector availability
   - Warns if pgvector is missing

2. **`init-database.sh`**: 
   - Creates extensions with proper superuser privileges
   - Verifies pgvector is installed before running migrations
   - Provides helpful error messages if setup is incomplete

## Manual Extension Creation

If needed, you can manually create extensions:

```bash
# Using default superuser account
psql -d love_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql -d love_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql -d love_db -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# Verify extensions
psql -d love_db -c "SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp', 'pg_trgm');"
```

## Troubleshooting

### Error: "type vector does not exist"

This means pgvector extension wasn't created in the database.

**Solution:**
```bash
psql -d love_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Error: "permission denied to create extension"

Extensions require superuser privileges.

**Solution:** The `init-database.sh` script handles this automatically by using the local superuser account (your macOS user or the postgres user on Linux).

### pgvector not available

If `brew install pgvector` doesn't work or pgvector isn't showing up:

**macOS:**
```bash
# Reinstall and link
brew reinstall pgvector
brew link --overwrite pgvector
```

**Linux:**
Build from source (see Ubuntu/Debian section above).

### Multiple PostgreSQL Versions Installed

The setup scripts automatically detect which PostgreSQL version is running. If you have multiple versions:

```bash
# List installed versions
brew services list | grep postgresql

# Stop old versions
brew services stop postgresql@14
brew services stop postgresql@16

# Start the version you want to use
brew services start postgresql@17
```

## Migration Notes

### Upgrading from Previous Versions

If you were using PostgreSQL 16 or an older version:

1. The new setup is **backward compatible** - it will detect your PostgreSQL 16 installation and use it
2. To upgrade to the latest PostgreSQL:
   ```bash
   # Stop old version
   brew services stop postgresql@16
   
   # Install latest
   brew install postgresql
   
   # Migrate data (if needed)
   # See: https://www.postgresql.org/docs/current/upgrading.html
   ```

3. The setup scripts will automatically detect the new version

## References

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [PostgreSQL Downloads](https://www.postgresql.org/download/)
- [PostgreSQL Versioning Policy](https://www.postgresql.org/support/versioning/)
- [Homebrew PostgreSQL](https://formulae.brew.sh/formula/postgresql)
