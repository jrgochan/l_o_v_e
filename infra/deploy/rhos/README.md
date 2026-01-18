# RHOS Deployment

Deploy the L.O.V.E. stack to Red Hat OpenShift (or Podman Desktop / CodeReady Containers).

## Prerequisites

- `oc` CLI tool installed.
- Logged into an OpenShift cluster (`oc login ...`).
    - For CRC: Run `crc console --credentials` to get the `kubeadmin` password and login command.
    - **Important:** Ensure CRC is running (`crc status`) before attempting to login.
- Python 3.14 compatible container environment (OpenShift usually handles this if building from source with Docker strategy).

## Usage

Run the master deployment script:

```bash
./deploy.sh
```

This will:
1.  Initialize the project (`love-stack`) and secrets.
2.  Build and deploy backend services (`versor`, `observer`, `listener`).
3.  Deploy infrastructure (`postgres`, `redis`, `ollama`).
4.  Capture the Observer route URL.
5.  Build and deploy the frontend (`experience`) with the API URL injected.

## Manual Steps

You can run individual phases:

```bash
# 1. Init
./01-init.sh

# 2. Build (all or specific service)
./02-build.sh [service]

# 3. Deploy Infra
./03-deploy-infra.sh

# 4. Deploy App (all or specific service)
./04-deploy-app.sh [service]
```

## Configuration

Edit `config.sh` to customize:
- `PROJECT_NAME` (Namespace)
- `DB_USER` / `DB_NAME`
- Resource limits
