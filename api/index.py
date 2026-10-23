import os
import sys

# Add root project directory to Python module search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import app


class VercelPrefixMiddleware:
    """
    WSGI Middleware to strip Vercel serverless function prefix (/api/index or /api/index.py)
    so Flask routes match the exact requested URI (/ , /admin, /api/*).
    """
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO", "")
        for prefix in ("/api/index.py", "/api/index"):
            if path.startswith(prefix):
                path = path[len(prefix):]
                break
        if not path or path == "":
            path = "/"
        elif not path.startswith("/"):
            path = "/" + path
        environ["PATH_INFO"] = path
        return self.wsgi_app(environ, start_response)


# Wrap Flask WSGI app with Vercel prefix middleware
app.wsgi_app = VercelPrefixMiddleware(app.wsgi_app)
