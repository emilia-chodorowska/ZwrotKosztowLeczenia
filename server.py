"""
Lokalny serwer do odpalania luxmed.py z przegladarki.
Uruchom dwuklikiem na 'Start ZwrotApp.command' lub: python server.py
"""

import http.server
import json
import subprocess
import sys
import os
import threading

PORT = 8765
LUXMED_PROCESS = None

class Handler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == '/launch-luxmed':
            self._launch_luxmed()
        elif self.path == '/trigger-refresh':
            self._trigger_refresh()
        elif self.path == '/status':
            self._status()
        else:
            self.send_response(404)
            self._cors()
            self.end_headers()

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, code, data):
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _launch_luxmed(self):
        global LUXMED_PROCESS
        if LUXMED_PROCESS and LUXMED_PROCESS.poll() is None:
            self._json(200, {'status': 'already_running', 'message': 'LuxMed juz dziala'})
            return

        script_dir = os.path.dirname(os.path.abspath(__file__))
        luxmed_path = os.path.join(script_dir, 'luxmed.py')

        if not os.path.exists(luxmed_path):
            self._json(404, {'status': 'error', 'message': 'Nie znaleziono luxmed.py'})
            return

        # Uzyj Pythona z venva projektu (ma selenium)
        venv_python = os.path.join(script_dir, 'venv', 'bin', 'python3')
        python = venv_python if os.path.exists(venv_python) else sys.executable

        LUXMED_PROCESS = subprocess.Popen(
            [python, luxmed_path],
            cwd=script_dir
        )
        self._json(200, {'status': 'started', 'message': 'LuxMed uruchomiony'})

    def _trigger_refresh(self):
        try:
            result = subprocess.run(
                ['gh', 'workflow', 'run', 'refresh.yml',
                 '--repo', 'emilia-chodorowska/ZwrotKosztowLeczenia'],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0:
                self._json(200, {'status': 'triggered', 'message': 'Workflow uruchomiony'})
            else:
                self._json(500, {'status': 'error', 'message': result.stderr.strip()})
        except FileNotFoundError:
            self._json(500, {'status': 'error', 'message': 'gh CLI nie znalezione'})
        except subprocess.TimeoutExpired:
            self._json(500, {'status': 'error', 'message': 'Timeout'})

    def _status(self):
        global LUXMED_PROCESS
        running = LUXMED_PROCESS is not None and LUXMED_PROCESS.poll() is None
        self._json(200, {'luxmed_running': running, 'server': 'ok'})

    def log_message(self, format, *args):
        print(f"[ZwrotApp] {args[0]}")

if __name__ == '__main__':
    print(f"ZwrotApp serwer na http://localhost:{PORT}")
    print("Nie zamykaj tego okna. Mozesz je zminimalizowac.")
    print()
    server = http.server.HTTPServer(('127.0.0.1', PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nZatrzymano serwer.")
        server.server_close()
