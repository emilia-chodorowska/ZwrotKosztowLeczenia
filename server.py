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
import mimetypes
import shutil
import threading
from pathlib import Path

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_ROOT = os.path.join(SCRIPT_DIR, 'web', 'dist')
STATIC_PREFIX = '/ZwrotKosztowLeczenia/'

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    from pypdf import PdfWriter, PdfReader
    DRIVE_AVAILABLE = True
except ImportError:
    DRIVE_AVAILABLE = False

PORT = 8765
LUXMED_PROCESS = None
REFRESH_PROCESS = None
REFRESH_COMPLETED = None  # None | 'success' | 'failure'
SCOPES = ['https://www.googleapis.com/auth/drive']
FOLDER_NAZWA = 'Faktury logopeda'
SERVICE_ACCOUNT_PLIK = 'service-account.json'


def get_drive_service():
    """Autoryzacja Google Drive przez service account."""
    sa_path = os.path.join(SCRIPT_DIR, SERVICE_ACCOUNT_PLIK)
    creds = service_account.Credentials.from_service_account_file(sa_path, scopes=SCOPES)
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
        elif self.path == '/' or self.path == STATIC_PREFIX.rstrip('/') or self.path == STATIC_PREFIX:
            self._serve_static('index.html')
        elif self.path.startswith(STATIC_PREFIX):
            self._serve_static(self.path[len(STATIC_PREFIX):].split('?', 1)[0])
        else:
            self.send_response(404)
            self._cors()
            self.end_headers()

    def _serve_static(self, rel_path):
        rel_path = rel_path.lstrip('/') or 'index.html'
        full_path = os.path.normpath(os.path.join(STATIC_ROOT, rel_path))
        if not full_path.startswith(STATIC_ROOT + os.sep) and full_path != STATIC_ROOT:
            self.send_response(403)
            self._cors()
            self.end_headers()
            return
        if not os.path.isfile(full_path):
            self.send_response(404)
            self._cors()
            self.end_headers()
            return
        ctype, _ = mimetypes.guess_type(full_path)
        ctype = ctype or 'application/octet-stream'
        try:
            with open(full_path, 'rb') as f:
                data = f.read()
        except OSError:
            self.send_response(500)
            self._cors()
            self.end_headers()
            return
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

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
        global REFRESH_PROCESS, REFRESH_COMPLETED
        if REFRESH_PROCESS and REFRESH_PROCESS.poll() is None:
            self._json(200, {'status': 'triggered', 'message': 'Odświeżanie już trwa'})
            return
        venv_python = os.path.join(SCRIPT_DIR, 'venv', 'bin', 'python3')
        python = venv_python if os.path.exists(venv_python) else sys.executable
        REFRESH_COMPLETED = None
        REFRESH_PROCESS = subprocess.Popen(
            [python, os.path.join(SCRIPT_DIR, 'zwrot.py')],
            cwd=SCRIPT_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self._json(200, {'status': 'triggered', 'message': 'Przetwarzanie faktur uruchomione'})

    def _workflow_status(self):
        global REFRESH_PROCESS, REFRESH_COMPLETED
        if REFRESH_PROCESS is None and REFRESH_COMPLETED is None:
            self._json(200, {'status': 'unknown', 'conclusion': ''})
            return
        if REFRESH_PROCESS is not None:
            rc = REFRESH_PROCESS.poll()
            if rc is None:
                self._json(200, {'status': 'in_progress', 'conclusion': ''})
                return
            if rc == 0:
                src = os.path.join(SCRIPT_DIR, 'faktury_dane.json')
                dst = os.path.join(STATIC_ROOT, 'faktury_dane.json')
                try:
                    if os.path.exists(src):
                        shutil.copy(src, dst)
                    REFRESH_COMPLETED = 'success'
                except OSError:
                    REFRESH_COMPLETED = 'failure'
            else:
                REFRESH_COMPLETED = 'failure'
            REFRESH_PROCESS = None
        self._json(200, {'status': 'completed', 'conclusion': REFRESH_COMPLETED or ''})

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
