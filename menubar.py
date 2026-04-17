"""
Menubar apka ZwrotApp — atomowo startuje server.py i otwiera UI gdy serwer gotowy.
Uruchamiana przez 'Start ZwrotApp.command'.
"""

import atexit
import os
import subprocess
import urllib.error
import urllib.request
import webbrowser

import rumps

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_URL = 'http://localhost:8765'
UI_URL = f'{SERVER_URL}/ZwrotKosztowLeczenia/'
HEALTH_TIMEOUT = 30  # sekundy na startup zanim uznamy że padł


class ZwrotApp(rumps.App):
    def __init__(self):
        super().__init__('ZwrotApp', title='🔴', quit_button=None)
        self.server_proc = None
        self.ready = False
        self.opened_once = False
        self.ticks_since_start = 0

        self.status_item = rumps.MenuItem('Status: Startuje...')
        self.open_item = rumps.MenuItem('Otwórz UI', callback=self.open_ui)
        self.open_item.set_callback(None)
        self.restart_item = rumps.MenuItem('Restartuj serwer', callback=self.restart_server)
        self.quit_item = rumps.MenuItem('Quit ZwrotApp', callback=self.quit_app)
        self.menu = [
            self.status_item,
            self.open_item,
            None,
            self.restart_item,
            None,
            self.quit_item,
        ]

        atexit.register(self._stop_server)
        self._start_server()

    def _python(self):
        return os.path.join(SCRIPT_DIR, 'venv', 'bin', 'python3')

    def _start_server(self):
        self.title = '🟡'
        self.status_item.title = 'Status: Startuje...'
        self.open_item.set_callback(None)
        self.ready = False
        self.ticks_since_start = 0
        self.server_proc = subprocess.Popen(
            [self._python(), os.path.join(SCRIPT_DIR, 'server.py')],
            cwd=SCRIPT_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    def _stop_server(self):
        if self.server_proc and self.server_proc.poll() is None:
            self.server_proc.terminate()
            try:
                self.server_proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.server_proc.kill()
        self.server_proc = None

    @rumps.timer(1)
    def health_tick(self, _):
        if self.ready or self.server_proc is None:
            return
        self.ticks_since_start += 1
        if self.server_proc.poll() is not None:
            self.title = '🔴'
            self.status_item.title = 'Status: Serwer padł (port zajęty?)'
            return
        try:
            with urllib.request.urlopen(f'{SERVER_URL}/status', timeout=1) as r:
                if r.status == 200:
                    self._on_ready()
                    return
        except (urllib.error.URLError, OSError):
            pass
        if self.ticks_since_start >= HEALTH_TIMEOUT:
            self.title = '🔴'
            self.status_item.title = 'Status: Timeout startu'

    def _on_ready(self):
        self.ready = True
        self.title = '🟢'
        self.status_item.title = 'Status: Gotowy'
        self.open_item.set_callback(self.open_ui)
        if not self.opened_once:
            self.opened_once = True
            webbrowser.open(UI_URL)

    def open_ui(self, _):
        webbrowser.open(UI_URL)

    def restart_server(self, _):
        self._stop_server()
        self._start_server()

    def quit_app(self, _):
        self._stop_server()
        rumps.quit_application()


if __name__ == '__main__':
    ZwrotApp().run()
