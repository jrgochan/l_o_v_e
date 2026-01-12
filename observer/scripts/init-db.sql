-- L.O.V.E. Stack - PostgreSQL Initialization Script
-- This script is automatically run when the PostgreSQL container is first created
-- It sets up the database with required extensions

-- Create the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the uuid extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extensions are installed
SELECT * FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp', 'pg_trgm');

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'L.O.V.E. Stack PostgreSQL initialized successfully';
    RAISE NOTICE 'Extensions installed: vector, uuid-ossp, pg_trgm';
END $$;
