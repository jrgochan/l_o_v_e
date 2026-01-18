#!/bin/bash
# RHOS Deployment Configuration

# Internal Config
APP_NAME="love-stack"
PROJECT_NAME="love-stack" # OpenShift Project/Namespace

# Service Ports (Internal)
OBSERVER_PORT=8000
VERSOR_PORT=8001
LISTENER_PORT=8002
EXPERIENCE_PORT=3000

# Database Config
DB_NAME="love_db"
DB_USER="love_user"
# Password will be generated and stored in a Secret

# Resource Limits (Default)
CPU_REQUEST="100m"
CPU_LIMIT="1000m"
MEMORY_REQUEST="256Mi"
MEMORY_LIMIT="1Gi"

# Ollama Config
OLLAMA_MODEL="llama3.2" # Model to pull on startup
