import os
import sys

# Add root project directory to Python module search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import app


class VercelPathFixMiddleware:
    """
    WSGI Middleware to restore the client's original requested URL path
    when rewritten by Vercel serverless routing.
    """
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        matched = environ.get("HTTP_X_FORWARDED_URI") or environ.get("HTTP_X_MATCHED_PATH")
        if matched:
            environ["PATH_INFO"] = matched.split("?")[0]
        elif environ.get("PATH_INFO", "") in ("/api/index", "/api/index.py", "/api"):
            environ["PATH_INFO"] = "/"
        return self.wsgi_app(environ, start_response)


# Wrap Flask WSGI app with Vercel path fix middleware
app.wsgi_app = VercelPathFixMiddleware(app.wsgi_app)
