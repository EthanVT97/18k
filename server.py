import http.server
import socketserver
import os
import socket
from urllib.parse import urlparse

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add custom headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # Default to index.html for root path
        if path == '/':
            path = '/index.html'

        # Handle admin routes
        if path.startswith('/admin'):
            if path == '/admin' or path == '/admin/':
                path = '/admin/dashboard.html'

        # Remove leading slash and convert to system path
        relative_path = path.lstrip('/')
        
        # Look for the file in the public directory
        file_path = os.path.join(os.getcwd(), 'public', relative_path)
        
        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.path = '/public/' + relative_path
            return super().do_GET()
        else:
            # Try to serve 404.html from public directory
            error_page = os.path.join(os.getcwd(), 'public', '404.html')
            if os.path.exists(error_page):
                self.send_response(404)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                with open(error_page, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, "File not found")

    def translate_path(self, path):
        # Remove leading slash
        path = path.lstrip('/')
        # Join with current working directory
        return os.path.join(os.getcwd(), path)

def get_local_ip():
    try:
        # Get all network interfaces
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        return local_ip
    except:
        return "127.0.0.1"

# Change to the project root directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Create the server
PORT = 8000
Handler = CustomHTTPRequestHandler

# Enable port reuse
socketserver.TCPServer.allow_reuse_address = True

try:
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        local_ip = get_local_ip()
        print(f"\nServer started successfully!")
        print(f"\nAccess the website at:")
        print(f"- Local: http://127.0.0.1:{PORT}")
        print(f"- Network: http://{local_ip}:{PORT}")
        print(f"\nAdmin Dashboard:")
        print(f"- Local: http://127.0.0.1:{PORT}/admin")
        print(f"- Network: http://{local_ip}:{PORT}/admin")
        print(f"\nAvailable admin pages:")
        print(f"- Dashboard: http://127.0.0.1:{PORT}/admin/dashboard.html")
        print(f"- Users: http://127.0.0.1:{PORT}/admin/users.html")
        print(f"- Games: http://127.0.0.1:{PORT}/admin/games.html")
        print(f"- Transactions: http://127.0.0.1:{PORT}/admin/transactions.html")
        print(f"- Reports: http://127.0.0.1:{PORT}/admin/reports.html")
        print(f"- Settings: http://127.0.0.1:{PORT}/admin/settings.html")
        print("\nPress Ctrl+C to stop the server")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nShutting down the server...")
except Exception as e:
    print(f"Error: {e}")
finally:
    try:
        httpd.server_close()
    except:
        pass
