"""
Lokalny serwer do odpalania luxmed.py z przegladarki.
Uruchom dwuklikiem na 'Start ZwrotApp.command' lub: python server.py
"""

import http.server
import json
import subprocess
import sys
import os
import io
import shutil
import threading
from pathlib import Path

try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    from pypdf import PdfWriter, PdfReader
    DRIVE_AVAILABLE = True
except ImportError:
    DRIVE_AVAILABLE = False

PORT = 8765
LUXMED_PROCESS = None
SCOPES = ['https://www.googleapis.com/auth/drive']
FOLDER_NAZWA = 'Faktury logopeda'
TOKEN_PLIK = 'token.json'
CREDS_PLIK = 'credentials.json'


def get_drive_service():
    """Autoryzacja Google Drive — reuse token.json z zwrot.py."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    token_path = os.path.join(script_dir, TOKEN_PLIK)
    creds_path = os.path.join(script_dir, CREDS_PLIK)
    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    return build('drive', 'v3', credentials=creds)


def find_folder_id(service):
    """Znajdź ID folderu 'Faktury logopeda' na GDrive."""
    query = f"mimeType='application/vnd.google-apps.folder' and name='{FOLDER_NAZWA}' and trashed=false"
    results = service.files().list(q=query, fields="files(id)").execute()
    items = results.get('files', [])
    return items[0]['id'] if items else None

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
        elif self.path == '/workflow-status':
            self._workflow_status()
        elif self.path == '/status':
            self._status()
        elif self.path == '/merge-pdfs':
            self._merge_pdfs()
        elif self.path == '/delete-drive-files':
            self._delete_drive_files()
        elif self.path == '/delete-desktop-folder':
            self._delete_desktop_folder()
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

    def _workflow_status(self):
        try:
            result = subprocess.run(
                ['gh', 'run', 'list', '--workflow=refresh.yml', '--limit=1',
                 '--json', 'status,conclusion',
                 '--repo', 'emilia-chodorowska/ZwrotKosztowLeczenia'],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0:
                runs = json.loads(result.stdout)
                if runs:
                    self._json(200, runs[0])
                else:
                    self._json(200, {'status': 'unknown'})
            else:
                self._json(500, {'status': 'error', 'message': result.stderr.strip()})
        except Exception:
            self._json(500, {'status': 'error'})

    def _status(self):
        global LUXMED_PROCESS
        running = LUXMED_PROCESS is not None and LUXMED_PROCESS.poll() is None
        self._json(200, {'luxmed_running': running, 'server': 'ok'})

    def _merge_pdfs(self):
        if not DRIVE_AVAILABLE:
            self._json(500, {'status': 'error', 'message': 'Brak bibliotek (google-api, pypdf)'})
            return
        try:
            service = get_drive_service()
            folder_id = find_folder_id(service)
            if not folder_id:
                self._json(404, {'status': 'error', 'message': f"Nie znaleziono folderu '{FOLDER_NAZWA}'"})
                return

            query = f"'{folder_id}' in parents and mimeType='application/pdf' and trashed=false"
            results = service.files().list(q=query, pageSize=100, fields="files(id, name)").execute()
            pliki = results.get('files', [])
            if not pliki:
                self._json(404, {'status': 'error', 'message': 'Brak plików PDF w folderze'})
                return

            pliki.sort(key=lambda f: f['name'])
            writer = PdfWriter()

            for plik in pliki:
                request = service.files().get_media(fileId=plik['id'])
                fh = io.BytesIO()
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                while not done:
                    _, done = downloader.next_chunk()
                reader = PdfReader(io.BytesIO(fh.getvalue()))
                for page in reader.pages:
                    writer.add_page(page)

            output_path = Path.home() / 'Desktop' / 'faktury_logopeda.pdf'
            with open(output_path, 'wb') as out:
                writer.write(out)

            self._json(200, {
                'status': 'ok',
                'path': str(output_path),
                'pages': len(writer.pages),
                'files': len(pliki)
            })
        except Exception as e:
            self._json(500, {'status': 'error', 'message': str(e)})

    def _delete_drive_files(self):
        if not DRIVE_AVAILABLE:
            self._json(500, {'status': 'error', 'message': 'Brak bibliotek (google-api)'})
            return
        try:
            service = get_drive_service()
            folder_id = find_folder_id(service)
            if not folder_id:
                self._json(404, {'status': 'error', 'message': f"Nie znaleziono folderu '{FOLDER_NAZWA}'"})
                return

            query = f"'{folder_id}' in parents and trashed=false"
            results = service.files().list(q=query, pageSize=100, fields="files(id, name)").execute()
            pliki = results.get('files', [])

            for plik in pliki:
                service.files().delete(fileId=plik['id']).execute()

            self._json(200, {'status': 'ok', 'deleted': len(pliki)})
        except Exception as e:
            self._json(500, {'status': 'error', 'message': str(e)})

    def _delete_desktop_folder(self):
        try:
            desktop = Path.home() / 'Desktop'
            folder_path = desktop / 'faktury logopeda'
            file_path = desktop / 'faktury_logopeda.pdf'
            deleted = []

            if folder_path.exists():
                shutil.rmtree(folder_path)
                deleted.append(str(folder_path))
            if file_path.exists():
                file_path.unlink()
                deleted.append(str(file_path))

            self._json(200, {'status': 'ok', 'deleted': deleted})
        except Exception as e:
            self._json(500, {'status': 'error', 'message': str(e)})

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
