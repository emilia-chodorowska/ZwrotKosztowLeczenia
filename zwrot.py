# @title Lokalny Asystent do Przetwarzania Faktur z Dostępem do Dysku Google

import os
import io
import json
from datetime import datetime

# Biblioteki Google
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

# Biblioteki AI i PDF
import anthropic
import PyPDF2

# --- ZMIENNE KONFIGURACYJNE ---

# 1. Ustawienia dostępu do Dysku Google
SCOPES = ['https://www.googleapis.com/auth/drive']
FOLDER_NAZWA = 'Faktury logopeda'
TOKEN_PLIK = 'token.json'
CREDS_PLIK = 'credentials.json'

# 2. Plik konfiguracyjny dla klucza API
CONFIG_PLIK = 'config.json'

def autoryzuj_dysk_google():
    """Obsługuje proces autoryzacji użytkownika i tworzy obiekt usługi Dysku."""
    creds = None
    if os.path.exists(TOKEN_PLIK):
        creds = Credentials.from_authorized_user_file(TOKEN_PLIK, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDS_PLIK):
                print(f"BŁĄD: Brak pliku '{CREDS_PLIK}'. Pobierz go z Google Cloud Console.")
                return None
            flow = InstalledAppFlow.from_client_secrets_file(CREDS_PLIK, SCOPES)
            creds = flow.run_local_server(port=0)
        
        with open(TOKEN_PLIK, 'w') as token:
            token.write(creds.to_json())
            print(f"Token autoryzacji zapisany w pliku: {TOKEN_PLIK}")

    try:
        service = build('drive', 'v3', credentials=creds)
        print("✅ Autoryzacja Dysku Google zakończona pomyślnie.")
        return service
    except HttpError as error:
        print(f"Wystąpił błąd podczas tworzenia usługi Dysku: {error}")
        return None

def skonfiguruj_model_ai():
    """Konfiguruje model AI Claude na podstawie klucza API z pliku config.json."""
    try:
        if not os.path.exists(CONFIG_PLIK):
            raise FileNotFoundError(f"Brak pliku konfiguracyjnego '{CONFIG_PLIK}'. Utwórz go i wklej do niego swój klucz API.")

        with open(CONFIG_PLIK, 'r') as f:
            config = json.load(f)

        api_key = config.get('ANTHROPIC_API_KEY')

        if not api_key:
            raise ValueError(f"Nie znaleziono klucza ANTHROPIC_API_KEY w pliku '{CONFIG_PLIK}'.")

        client = anthropic.Anthropic(api_key=api_key)
        print("✅ Klient Claude został pomyślnie skonfigurowany.")
        return client
    except Exception as e:
        print(f"BŁĄD: Nie udało się skonfigurować API Claude. Szczegóły: {e}")
        return None

def odczytaj_tekst_z_pliku_pdf(pdf_bytes):
    """Odczytuje surowy tekst z danych bajtowych pliku PDF."""
    text = ""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n--- KONIEC STRONY ---\n" # Dodajemy separator stron
        return text
    except Exception as e:
        print(f"Błąd podczas odczytu strumienia PDF: {e}")
        return None

def wyodrebnij_dane_z_faktury(client, tekst_faktury):
    """
    Wysyła tekst do AI w celu ekstrakcji danych.
    Zwraca listę obiektów JSON, po jednym dla każdej znalezionej faktury.
    """
    prompt = f"""
    Przeanalizuj poniższy tekst, który może zawierać jedną lub więcej faktur. Tekst może być chaotyczny z powodu błędów w odczycie PDF. Postaraj się zidentyfikować kluczowe informacje mimo to.
    Dla KAŻDEJ znalezionej faktury wyodrębnij następujące dane.
    Zwróć odpowiedź WYŁĄCZNIE w formacie JSON, jako tablicę (listę) obiektów, nawet jeśli w tekście jest tylko jedna faktura.
    Jeśli nie znajdziesz żadnych faktur, zwróć pustą tablicę [].

    Struktura każdego obiektu w tablicy:
    {{
      "numer": "string (numer faktury, np. 01/05/2025)",
      "liczba_uslug": "integer (ilość usług, zazwyczaj 1)",
      "data_wystawienia": "string (w formacie YYYY-MM-DD)",
      "data_wykonania_uslugi": "string (data sprzedaży/wykonania usługi w formacie YYYY-MM-DD)",
      "miasto_wykonania": "string (miasto wykonania usługi, np. Szczecin)",
      "cena_jednostkowa": "float (cena netto za jedną usługę, np. 130.00)",
      "kwota_faktury": "float (łączna kwota do zapłaty/brutto, np. 130.00)"
    }}

    Jeśli jakaś dana w konkretnej fakturze nie jest dostępna, użyj wartości null. Zwróć szczególną uwagę na daty i kwoty.

    --- TEKST DOKUMENTU ---
    {tekst_faktury}
    """
    cleaned_response = ""
    try:
        response = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        cleaned_response = response.content[0].text.strip().replace("```json", "").replace("```", "").strip()
        # Spodziewamy się listy obiektów
        return json.loads(cleaned_response)
    except Exception as e:
        print(f"Błąd podczas komunikacji z API Claude lub parsowania JSON: {e}")
        print(f"Otrzymana odpowiedź od AI (nieudane parsowanie): \n---\n{cleaned_response}\n---")
        return None # Zwracamy None w przypadku błędu

def przetwarzaj_faktury_z_dysku(drive_service, client):
    """Główna funkcja orkiestrująca cały proces."""
    output_json_path = 'faktury_dane.json'
    wszystkie_faktury = []

    try:
        # 1. Znajdź ID folderu
        query = f"mimeType='application/vnd.google-apps.folder' and name='{FOLDER_NAZWA}' and trashed=false"
        results = drive_service.files().list(q=query, fields="files(id, name)").execute()
        items = results.get('files', [])

        if not items:
            print(f"BŁĄD: Nie znaleziono folderu o nazwie '{FOLDER_NAZWA}' na Twoim Dysku Google.")
            return None
        
        folder_id = items[0]['id']
        print(f"Znaleziono folder '{items[0]['name']}' (ID: {folder_id})")

        # 2. Wylistuj pliki PDF w folderze
        query = f"'{folder_id}' in parents and mimeType='application/pdf' and trashed=false"
        results = drive_service.files().list(q=query, pageSize=100, fields="files(id, name)").execute()
        pliki = results.get('files', [])

        if not pliki:
            print("Nie znaleziono żadnych plików PDF w folderze.")
            return None

        print(f"\nZnaleziono {len(pliki)} plików PDF. Rozpoczynam przetwarzanie...\n")

        # 3. Przetwarzaj każdy plik
        for plik in pliki:
            print(f"--- Przetwarzam plik: {plik['name']} ---")
            request = drive_service.files().get_media(fileId=plik['id'])
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
            
            tekst_faktury = odczytaj_tekst_z_pliku_pdf(fh.getvalue())
            
            if tekst_faktury:
                # Oczekujemy listy faktur, a nie pojedynczej
                dane_faktur_z_pliku = wyodrebnij_dane_z_faktury(client, tekst_faktury)
                if dane_faktur_z_pliku is not None and isinstance(dane_faktur_z_pliku, list):
                    if dane_faktur_z_pliku:
                        # Używamy extend, aby dodać wszystkie elementy z listy, a nie listę jako pojedynczy element
                        wszystkie_faktury.extend(dane_faktur_z_pliku)
                        print(f"✅ Wyodrębniono {len(dane_faktur_z_pliku)} faktur(y) z tego pliku.")
                    else:
                        print("ℹ️ Nie znaleziono żadnych faktur w tym pliku.")
                else:
                    print("❌ Nie udało się wyodrębnić danych lub otrzymano niepoprawny format.")
            else:
                print("❌ Nie udało się odczytać tekstu z pliku PDF.")
            print("-" * (len(plik['name']) + 22) + "\n")

    except HttpError as error:
        print(f"Wystąpił błąd podczas komunikacji z API Dysku Google: {error}")
        return None

    if wszystkie_faktury:
        # Sortowanie faktur po dacie wykonania usługi
        try:
            print("\nSortowanie wszystkich faktur według daty wykonania usługi...")
            wszystkie_faktury.sort(key=lambda x: datetime.strptime(x.get('data_wykonania_uslugi') or '1900-01-01', '%Y-%m-%d'))
            print("Sortowanie zakończone pomyślnie.")
        except (ValueError, TypeError) as e:
            print(f"Ostrzeżenie: Wystąpił błąd podczas sortowania faktur, dane mogą nie być posortowane. Błąd: {e}")

        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(wszystkie_faktury, f, ensure_ascii=False, indent=4)
        print(f"\n✅ Przetwarzanie zakończone. Dane zostały zapisane w pliku: {output_json_path}")
        return output_json_path
    else:
        print("\nNie udało się przetworzyć żadnych faktur.")
        return None


def generuj_podsumowanie_kwartalne(json_path):
    """Czyta plik JSON i generuje rozbudowane podsumowanie analityczne."""
    if not json_path or not os.path.exists(json_path):
        print("Nie można wygenerować podsumowania, ponieważ plik z danymi nie istnieje.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        dane_faktur = json.load(f)

    if not dane_faktur:
        print("Plik z danymi jest pusty. Brak danych do analizy.")
        return

    # Inicjalizacja zmiennych do analizy
    liczba_faktur = len(dane_faktur)
    laczna_kwota = 0
    daty_wykonania = []
    podsumowanie_kwartalne = {'Q1': {'kwota': 0, 'lata': set()}, 'Q2': {'kwota': 0, 'lata': set()},
                              'Q3': {'kwota': 0, 'lata': set()}, 'Q4': {'kwota': 0, 'lata': set()}}

    for faktura in dane_faktur:
        try:
            # Obliczenia ogólne
            kwota = float(faktura.get("kwota_faktury") or 0)
            laczna_kwota += kwota
            
            data_wykonania_str = faktura.get("data_wykonania_uslugi")
            if data_wykonania_str:
                daty_wykonania.append(datetime.strptime(data_wykonania_str, '%Y-%m-%d'))

            # Obliczenia kwartalne na podstawie daty wystawienia
            data_wystawienia_str = faktura.get("data_wystawienia")
            if data_wystawienia_str and kwota is not None:
                data_obj = datetime.strptime(data_wystawienia_str, '%Y-%m-%d')
                kwartal = (data_obj.month - 1) // 3 + 1
                rok = data_obj.year
                
                klucz_kwartalu = f'Q{kwartal}'
                podsumowanie_kwartalne[klucz_kwartalu]['kwota'] += kwota
                podsumowanie_kwartalne[klucz_kwartalu]['lata'].add(rok)

        except (ValueError, TypeError) as e:
            print(f"Ostrzeżenie: Pomijam fakturę z powodu błędu danych: {faktura.get('numer')}. Błąd: {e}")

    # Obliczenia końcowe
    srednia_wartosc_faktury = laczna_kwota / liczba_faktur if liczba_faktur > 0 else 0
    pierwsza_data = min(daty_wykonania) if daty_wykonania else None
    ostatnia_data = max(daty_wykonania) if daty_wykonania else None

    # Wyświetlanie rozbudowanego podsumowania
    print("\n\n" + "="*50)
    print("--- 📊 ROZBUDOWANE PODSUMOWANIE ANALITYCZNE ---")
    print("="*50)
    
    print("\n--- PODSUMOWANIE OGÓLNE ---")
    print(f"  - Przetworzono faktur:       {liczba_faktur}")
    print(f"  - Łączna kwota faktur:        {laczna_kwota:.2f} PLN")
    print(f"  - Średnia wartość faktury:    {srednia_wartosc_faktury:.2f} PLN")
    if pierwsza_data and ostatnia_data:
        print(f"  - Zakres usług (od-do):     {pierwsza_data.strftime('%Y-%m-%d')} - {ostatnia_data.strftime('%Y-%m-%d')}")

    print("\n--- PODSUMOWANIE KWARTALNE (wg daty wystawienia) ---")
    for kwartal, dane in podsumowanie_kwartalne.items():
        if dane['kwota'] > 0:
            lata_str = ", ".join(map(str, sorted(list(dane['lata']))))
            print(f"  - {kwartal} ({lata_str}): {dane['kwota']:.2f} PLN")
    
    print("\n" + "="*50)


if __name__ == "__main__":
    drive_service = autoryzuj_dysk_google()
    ai_model = skonfiguruj_model_ai()

    if drive_service and ai_model:
        wynikowy_json = przetwarzaj_faktury_z_dysku(drive_service, ai_model)
        generuj_podsumowanie_kwartalne(wynikowy_json)
    else:
        print("\nSkrypt nie może kontynuować z powodu błędów konfiguracji.")
