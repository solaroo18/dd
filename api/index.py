import os
import sys

# Add root project directory to Python module search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Import the configured Flask application
from app import app

# Vercel Serverless WSGI entry point
# Vercel Python runtime detects the module-level 'app' variable
app = app
