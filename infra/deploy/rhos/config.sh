#!/bin/bash
# RHOS Deployment Configuration

# Internal Config
export APP_NAME="love-stack"
export PROJECT_NAME="love-stack" # OpenShift Project/Namespace

# Service Ports (Internal)
export OBSERVER_PORT=8000
export VERSOR_PORT=8001
export LISTENER_PORT=8002
export EXPERIENCE_PORT=3000

# Database Config
export DB_NAME="love_db"
export DB_USER="love_user"
# Password will be generated and stored in a Secret

# Resource Limits (Default)
export CPU_REQUEST="100m"
export CPU_LIMIT="1000m"
export MEMORY_REQUEST="256Mi"
export MEMORY_LIMIT="1Gi"

# Ollama Config
export OLLAMA_MODEL="llama3.2" # Model to pull on startup
