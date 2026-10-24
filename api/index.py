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
    WSGI Middleware to adapt Vercel serverless environment to standard Flask routing.
    """
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        # Allow instant debugging of WSGI environment on Vercel
        path_info = environ.get("PATH_INFO", "")
        query_string = environ.get("QUERY_STRING", "")
        if "debug_wsgi=1" in query_string:
            import json
            headers = [("Content-Type", "application/json")]
            start_response("200 OK", headers)
            debug_info = {
                "PATH_INFO": environ.get("PATH_INFO"),
                "SCRIPT_NAME": environ.get("SCRIPT_NAME"),
                "REQUEST_URI": environ.get("REQUEST_URI"),
                "RAW_URI": environ.get("RAW_URI"),
                "QUERY_STRING": environ.get("QUERY_STRING"),
                "HTTP_X_FORWARDED_URI": environ.get("HTTP_X_FORWARDED_URI"),
                "HTTP_X_MATCHED_PATH": environ.get("HTTP_X_MATCHED_PATH"),
                "HTTP_X_NOW_ROUTE_MATCHES": environ.get("HTTP_X_NOW_ROUTE_MATCHES"),
                "ALL_ENVIRON_KEYS": sorted(list(environ.keys()))
            }
            return [json.dumps(debug_info, indent=2).encode("utf-8")]

        # Normalize SCRIPT_NAME and PATH_INFO
        environ["SCRIPT_NAME"] = ""
        
        # Strip internal function prefixes if present
        for prefix in ("/api/index.py", "/api/index", "/index.py", "/index"):
            if path_info.startswith(prefix):
                path_info = path_info[len(prefix):]
                break
                
        # Normalize paths pointing to the serverless function root
        if not path_info or path_info in ("", "/", "/api", "/api/"):
            path_info = "/"
        elif not path_info.startswith("/"):
            path_info = "/" + path_info

        # Handle potential duplicate /api/api/ prefix from nested rewrites
        if path_info.startswith("/api/api/"):
            path_info = path_info[4:]
            
        environ["PATH_INFO"] = path_info
        return self.wsgi_app(environ, start_response)


# Wrap Flask WSGI app with Vercel prefix middleware
app.wsgi_app = VercelPrefixMiddleware(app.wsgi_app)

