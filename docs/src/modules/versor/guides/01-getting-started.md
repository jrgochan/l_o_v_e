# Getting Started with Versor

Welcome to the Versor module! This guide will help you set up your development environment and make your first API call.

---

## Prerequisites

Before you begin, ensure you have:

- **Python 3.12+** installed
- **pip** (Python package manager)
- **Git** for version control
- A code editor (VS Code recommended)
- Basic understanding of:
  - Python programming
  - REST APIs
  - Command line usage

### Check Your Python Version

```bash
python3 --version
# Should output: Python 3.12.x or higher
```

If you need to install Python 3.12+:

- **macOS:** `brew install python@3.12`
- **Ubuntu:** `sudo apt install python3.12`
- **Windows:** Download from [python.org](https://www.python.org/downloads/)

---

## Step 1: Clone the Repository

```bash
# Navigate to your projects directory
cd ~/projects

# Clone the L.O.V.E. platform
git clone https://github.com/jrgochan/l_o_v_e.git

# Navigate to the Versor module
cd l_o_v_e/versor
```

---

## Step 2: Create a Virtual Environment

Always use a virtual environment to isolate dependencies:

```bash
# Create virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate  # macOS/Linux
# OR
.\.venv\Scripts\activate  # Windows PowerShell
```

You should see `(.venv)` in your terminal prompt.

---

## Step 3: Install Dependencies

```bash
# Install all required packages
pip install -r requirements.txt

# Verify installation
pip list
```

**Key dependencies installed:**

- **FastAPI** - Web framework
- **NumPy** - Numerical computing
- **SciPy** - Scientific computing (SLERP)
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

---

## Step 4: Run the API Server

Start the Versor API server:

```bash
# Development mode (auto-reload on code changes)
uvicorn app.main:app --reload --port 8001

# You should see:
# INFO:     Uvicorn running on http://127.0.0.1:8001
# INFO:     Application startup complete.
```

**Note:** Port 8001 is the standard Versor port (Observer uses 8000, Listener uses 8002).

---

## Step 5: Verify the Server is Running

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:8001/health
```

**Expected response:**

```json
{
  "status": "healthy",
  "service": "versor",
  "version": "1.0.0",
  "timestamp": "2026-01-03T02:00:00Z"
}
```

✅ **Success!** Your Versor server is running.

---

## Step 6: Make Your First API Call

Let's calculate a quaternion from a VAC vector:

```bash
curl -X POST http://localhost:8001/versor/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "current_vac": {
      "valence": 0.9,
      "arousal": 0.7,
      "connection": 0.8
    },
    "previous_state": null,
    "time_delta_seconds": 1.0
  }'
```

**Expected response:**

```json
{
  "current_state": {
    "w": 0.306,
    "x": 0.615,
    "y": 0.478,
    "z": 0.546
  },
  "angular_distance_radians": 2.525,
  "angular_distance_degrees": 144.7,
  "elasticity_metric": 2.525,
  "is_flooding": true,
  "insight_code": "AROUSAL_SHIFT",
  "interpolation_path": [
    {"w": 1.0, "x": 0.0, "y": 0.0, "z": 0.0},
    {"w": 0.99, "x": 0.06, "y": 0.05, "z": 0.05},
    ...
    {"w": 0.306, "x": 0.615, "y": 0.478, "z": 0.546}
  ]
}
```

### Understanding the Response

- **`current_state`**: The quaternion representation `[w, x, y, z]`
- **`angular_distance_radians`**: How much rotation occurred (2.525 rad ≈ 145°)
- **`elasticity_metric`**: Rate of emotional change (2.525 rad/s)
- **`is_flooding`**: True because E > 2.0 (emotional overwhelm threshold)
- **`insight_code`**: "AROUSAL_SHIFT" means energy level changed most
- **`interpolation_path`**: 60 intermediate quaternions for smooth animation

---

## Step 7: Explore the Interactive API Docs

FastAPI automatically generates interactive documentation:

**Open in your browser:**

```text
http://localhost:8001/docs
```

You'll see **Swagger UI** where you can:

- View all endpoints
- See request/response schemas
- Try API calls directly in the browser
- Download OpenAPI specification

**Alternative ReDoc interface:**

```text
http://localhost:8001/redoc
```

---

## Step 8: Run the Tests

Verify everything is working correctly:

```bash
# Run all tests
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html  # macOS
# OR
start htmlcov/index.html  # Windows
```

**Expected output:**

```text
tests/unit/test_quaternion.py .................... PASSED
tests/unit/test_vac_model.py .................... PASSED
tests/unit/test_transitions.py .................. PASSED
tests/unit/test_interpolation.py ................ PASSED
tests/integration/test_api.py ................... PASSED

============ 82 passed in 0.55s ==============
Coverage: 100%
```

✅ **All tests should pass with 100% coverage.**

---

## Common Setup Issues

### Issue 1: Port Already in Use

**Error:**

```text
ERROR: [Errno 48] Address already in use
```

**Solution:**

```bash
# Find process using port 8001
lsof -i :8001

# Kill the process
kill -9 <PID>

# Or use a different port
uvicorn app.main:app --reload --port 8005
```

### Issue 2: Module Not Found

**Error:**

```text
ModuleNotFoundError: No module named 'numpy'
```

**Solution:**

```bash
# Ensure virtual environment is activated
source .venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue 3: Python Version Too Old

**Error:**

```text
SyntaxError: match statement requires Python 3.10+
```

**Solution:**

```bash
# Check version
python3 --version

# Install Python 3.12+
brew install python@3.12  # macOS

# Recreate virtual environment with correct version
python3.12 -m .venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Issue 4: Tests Fail

**Error:**

```text
ImportError: cannot import name 'Quaternion'
```

**Solution:**

```bash
# Install package in development mode
pip install -e .

# Or set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

---

## Development Workflow

### Daily Development

```bash
# 1. Activate virtual environment
source .venv/bin/activate

# 2. Pull latest changes
git pull origin main

# 3. Install any new dependencies
pip install -r requirements.txt

# 4. Run tests to verify
pytest tests/ -v

# 5. Start development server
uvicorn app.main:app --reload --port 8001
```

### Making Changes

```bash
# 1. Create a feature branch
git checkout -b feature/your-feature-name

# 2. Make code changes

# 3. Run tests
pytest tests/ -v

# 4. Run quality checks (if available)
# ../infra/scripts/check-python-quality.sh --module=versor

# 5. Commit changes
git add .
git commit -m "feat: your feature description"

# 6. Push to remote
git push origin feature/your-feature-name
```

---

## Understanding the Codebase

### Quick Directory Overview

```text
versor/
├── app/
│   ├── core/           # Pure mathematics (quaternions, VAC, SLERP)
│   ├── api/            # FastAPI routes and models
│   ├── utils/          # Helper functions (scipy adapter)
│   ├── config.py       # Settings
│   └── main.py         # FastAPI application
├── tests/
│   ├── unit/           # Unit tests (pure functions)
│   └── integration/    # API integration tests
├── docs/               # Technical documentation
├── requirements.txt    # Dependencies
└── README.md          # Module overview
```

### Key Files to Know

- **`app/core/quaternion.py`** - Quaternion class and algebra
- **`app/core/vac_model.py`** - VAC vector and conversion logic
- **`app/core/transitions.py`** - Angular distance and elasticity
- **`app/api/routes/calculate.py`** - Main API endpoint
- **`tests/unit/test_vac_model.py`** - The Pity→Compassion test

---

## Next Steps

Now that you're set up, continue learning:

1. **[Codebase Tour](02-codebase-tour.md)** - Explore the file structure in detail
2. **[Key Concepts](03-key-concepts.md)** - Understand quaternions, SLERP, and VAC
3. **[Common Tasks](04-common-tasks.md)** - Learn practical development tasks
4. **[Testing Guide](05-testing-guide.md)** - Write and run tests
5. **[First Contribution](06-first-contribution.md)** - Submit your first PR

---

## Getting Help

### Documentation

- **Technical Docs:** `versor/docs/` directory
- **API Docs:** <http://localhost:8001/docs> (when server running)
- **Code Comments:** Read inline comments in source files

### Troubleshooting

If you encounter issues:

1. Check [Troubleshooting Guide](../architecture/08-troubleshooting.md)
2. Search existing issues on GitHub
3. Ask in team Slack channel
4. Consult senior developers

### Useful Commands

```bash
# Quick test a specific file
pytest tests/unit/test_quaternion.py -v

# Run server with specific log level
uvicorn app.main:app --log-level debug

# Check what's installed
pip list | grep -E "numpy|scipy|fastapi"

# Format code
black app/
isort app/

# Type check
mypy app/ --strict
```

---

## Success Checklist

Before moving on, ensure you can:

- [ ] Run the API server without errors
- [ ] Access <http://localhost:8001/docs>
- [ ] Make a successful `/versor/calculate` API call
- [ ] Run `pytest tests/` with all tests passing
- [ ] Navigate the codebase structure
- [ ] Activate/deactivate virtual environment
- [ ] View test coverage report

✅ **Once all items are checked, you're ready to dive deeper!**

---

## Additional Resources

### Python Resources

- [Python 3.12 Documentation](https://docs.python.org/3.11/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [NumPy Quickstart](https://numpy.org/doc/stable/user/quickstart.html)

### Mathematics Resources

- [Quaternion Wikipedia](https://en.wikipedia.org/wiki/Quaternion)
- [SLERP Explanation](https://en.wikipedia.org/wiki/Slerp)
- [Gimbal Lock Visualization](https://www.youtube.com/watch?v=zc8b2Jo7mno)

### L.O.V.E. Platform

- [Platform Architecture](../../../architecture/01-system-overview.md)
- [VAC Model Documentation](../../../architecture/02-vac-model.md)
- [Listener Integration](../../listener/index.md)
- [Observer Integration](../../observer/index.md)

---

**Next:** [Codebase Tour →](02-codebase-tour.md)
