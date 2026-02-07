# -*- coding: utf-8 -*-

import json
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from datetime import datetime
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

# ---
# KROK 1: Wczytanie konfiguracji z pliku JSON
# ---

CONFIG_FILE = 'config.json'
DATA_FILE = 'faktury_dane.json'

try:
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        config = json.load(f)

    LOGIN_URL = config['LOGIN_URL']
    FORM_URL = config['FORM_URL']
    LOGIN = config['LOGIN']
    HASLO = config['HASLO']
    # Dodanie nowych danych konfiguracyjnych
    NUMER_RACHUNKU = config['NUMER_RACHUNKU']
    WLASCICIEL_KONTA = config['WLASCICIEL_KONTA']

except FileNotFoundError:
    print(f"BŁĄD: Nie można znaleźć pliku konfiguracyjnego '{CONFIG_FILE}'.")
    przykladowy_config = {
      "LOGIN_URL": "https://portalpacjenta.luxmed.pl/PatientPortal/Account/LogOn",
      "FORM_URL": "https://portalpacjenta.luxmed.pl/PatientPortal/Refunds/New",
      "LOGIN": "WPISZ_SWOJ_LOGIN",
      "HASLO": "WPISZ_SWOJE_HASLO",
      "NUMER_RACHUNKU": "WPISZ_NUMER_KONTA_BEZ_SPACJI",
      "WLASCICIEL_KONTA": "WPISZ_IMIE_I_NAZWISKO"
    }
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(przykladowy_config, f, indent=2, ensure_ascii=False)
    print(f"Utworzono przykładowy plik '{CONFIG_FILE}'. Uzupełnij go swoimi danymi i uruchom skrypt ponownie.")
    exit()
except KeyError as e:
    print(f"BŁĄD: W pliku konfiguracyjnym brakuje klucza: {e}")
    exit()

# ---
# KROK 2: Wczytanie danych do wprowadzenia z pliku JSON
# ---

try:
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        dane_do_wprowadzenia = json.load(f)
except FileNotFoundError:
    print(f"BŁĄD: Nie można znaleźć pliku z danymi '{DATA_FILE}'.")
    exit()
except json.JSONDecodeError:
    print(f"BŁĄD: Plik '{DATA_FILE}' ma nieprawidłową strukturę JSON.")
    exit()

# ---
# OSTATECZNA FUNKCJA POMOCNICZA OPARTA O PRAWIDŁOWY KOD HTML
# ---
def wybierz_date_w_kalendarzu(driver, wait, kontener_daty, data_docelowa_str):
    """
    Otwiera kalendarz i wybiera datę, używając prawidłowych selektorów
    zidentyfikowanych na podstawie kodu HTML strony.
    """
    print(f"\n   --- ROZPOCZĘCIE PROCEDURY WYBORU DATY ---")
    try:
        if '/' in data_docelowa_str:
            data_docelowa_obj = datetime.strptime(data_docelowa_str, '%d/%m/%Y')
        else:
            data_docelowa_obj = datetime.strptime(data_docelowa_str, '%Y-%m-%d')
        print(f"   [LOG] Data docelowa: {data_docelowa_obj.strftime('%d.%m.%Y')}")
    except ValueError:
        print(f"   [BŁĄD] Nieprawidłowy format daty '{data_docelowa_str}'")
        return

    rok_docelowy = data_docelowa_obj.year
    miesiac_docelowy = data_docelowa_obj.month
    dzien_docelowy = data_docelowa_obj.day

    mapa_miesiecy = {
        1: "styczeń", 2: "luty", 3: "marzec", 4: "kwiecień", 5: "maj", 6: "czerwiec",
        7: "lipiec", 8: "sierpień", 9: "wrzesień", 10: "październik", 11: "listopad", 12: "grudzień"
    }
    miesiac_docelowy_nazwa = mapa_miesiecy[miesiac_docelowy]
    print(f"   [LOG] Docelowy miesiąc i rok: {miesiac_docelowy_nazwa} {rok_docelowy}")

    # 1. OTWIERANIE KALENDARZA
    try:
        print("   [LOG] Krok 1: Wyszukiwanie przycisku kalendarza i klikanie...")
        przycisk_kalendarza = kontener_daty.find_element(By.TAG_NAME, "button")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", przycisk_kalendarza)
        time.sleep(0.3)
        driver.execute_script("arguments[0].click();", przycisk_kalendarza)
        
        print("   [LOG] ...oczekiwanie na OBECNOŚĆ kalendarza <app-date-picker> w kodzie...")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "app-date-picker")))
        print("   [SUKCES] Kalendarz <app-date-picker> jest obecny w kodzie.")
        time.sleep(0.3) 

    except Exception as e:
        print(f"   [BŁĄD KRYTYCZNY] Nie udało się otworzyć i wykryć kalendarza. Powód: {e}")
        driver.save_screenshot('debug_screenshot_calendar_open_fail.png')
        print("   [INFO] Zapisano zrzut ekranu: debug_screenshot_calendar_open_fail.png")
        return

    # 2. NAWIGACJA W KALENDARZU
    try:
        print("   [LOG] Krok 2: Rozpoczęcie nawigacji miesiąc/rok...")
        max_proby = 36
        for i in range(max_proby):
            naglowek_kalendarza = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "app-date-picker .month")))
            tekst_naglowka = naglowek_kalendarza.text.strip().lower()
            print(f"   [LOG] ...aktualnie widoczny nagłówek: '{tekst_naglowka}'")
            
            if miesiac_docelowy_nazwa in tekst_naglowka and str(rok_docelowy) in tekst_naglowka:
                print("   [SUKCES] Znaleziono właściwy miesiąc i rok.")
                break
            
            strzalka_wstecz = driver.find_element(By.CSS_SELECTOR, "app-date-picker img.chevron-previous")
            strzalka_dalej = driver.find_element(By.CSS_SELECTOR, "app-date-picker img.chevron-next")

            klucz_sortowania_aktualny_rok = int(tekst_naglowka.split()[-1])
            klucz_sortowania_aktualny_miesiac = list(mapa_miesiecy.values()).index(tekst_naglowka.split()[0]) + 1
            
            klucz_sortowania_aktualny = (klucz_sortowania_aktualny_rok, klucz_sortowania_aktualny_miesiac)
            klucz_sortowania_docelowy = (rok_docelowy, miesiac_docelowy)

            if klucz_sortowania_docelowy > klucz_sortowania_aktualny:
                strzalka_dalej.click()
            else:
                strzalka_wstecz.click()
            time.sleep(0.4)
        else:
            print("   [BŁĄD] Nie udało się znaleźć odpowiedniego miesiąca w kalendarzu po 36 próbach.")
            return
    except Exception as e:
        print(f"   [BŁĄD KRYTYCZNY] Problem podczas nawigacji w kalendarzu. Powód: {e}")
        return

    # 3. WYBÓR DNIA
    try:
        print(f"   [LOG] Krok 3: Wyszukiwanie dnia '{dzien_docelowy}'...")
        xpath_dnia = f"//app-date-picker//div[contains(@class, 'day') and not(contains(@class, 'disabled')) and normalize-space()='{dzien_docelowy}']"
        przycisk_dnia = wait.until(EC.element_to_be_clickable((By.XPATH, xpath_dnia)))
        print("   [LOG] ...znaleziono dzień. Klikanie...")
        przycisk_dnia.click()
        print(f"   [SUKCES] Kliknięto w dzień {dzien_docelowy}.")
        
        print("   [LOG] ...oczekiwanie na zniknięcie kalendarza...")
        wait.until(EC.invisibility_of_element_located((By.TAG_NAME, "app-date-picker")))
        print("   [SUKCES] Kalendarz został zamknięty.")
    except Exception as e:
        print(f"   [BŁĄD KRYTYCZNY] Nie udało się wybrać dnia. Powód: {e}")
        return
    print(f"   --- ZAKOŃCZONO PROCEDURĘ WYBORU DATY ---")


# ---
# KROK 3: Uruchomienie przeglądarki i automatyzacja
# ---

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service)
driver.set_window_size(1200, 800)

try:
    print("Uruchamianie przeglądarki...")
    driver.get(LOGIN_URL)
    wait = WebDriverWait(driver, 20)

    # --- Logowanie ---
    print(f"Próba logowania na użytkownika: {LOGIN}...")
    try:
        pole_loginu = wait.until(EC.presence_of_element_located((By.ID, 'Login')))
        pole_loginu.send_keys(LOGIN)
        pole_hasla = wait.until(EC.presence_of_element_located((By.ID, 'Password')))
        pole_hasla.send_keys(HASLO)
        przycisk_logowania = wait.until(EC.element_to_be_clickable((By.ID, "LoginSubmit")))
        przycisk_logowania.click()
        print("Logowanie zainicjowane.")
    except TimeoutException:
        print("\nBŁĄD KRYTYCZNY: Nie można znaleźć pól logowania/hasła lub przycisku 'Zaloguj'.")
        driver.save_screenshot('debug_screenshot_login_page.png')
        # USUNIĘTO 'raise'

    # --- Obsługa okna POP-UP ---
    print("\nSprawdzanie, czy pojawiło się okno pop-up po logowaniu...")
    try:
        short_wait = WebDriverWait(driver, 15)
        close_button_selector = "//button[contains(., 'Pomiń') or contains(., 'Zamknij') or contains(., 'Akceptuję') or contains(., 'Zgadzam się') or contains(., 'OK') or @aria-label='Close']"
        przycisk_zamknij_popup = short_wait.until(EC.element_to_be_clickable((By.XPATH, close_button_selector)))
        print("Znaleziono okno pop-up. Próba zamknięcia...")
        przycisk_zamknij_popup.click()
        print("Okno pop-up zostało zamknięte.")
        time.sleep(2)
    except TimeoutException:
        print("Nie znaleziono okna pop-up w ciągu 15 sekund. Kontynuowanie skryptu.")

    # --- Weryfikacja logowania ---
    try:
        print("Weryfikacja pomyślnego logowania poprzez sprawdzenie adresu URL...")
        wait.until(EC.url_contains('Dashboard'))
        print(f"Logowanie pomyślne. Znajdujesz się na stronie głównej (Dashboard).")
    except TimeoutException:
        print("\nBŁĄD KRYTYCZNY: Nie udało się potwierdzić zalogowania. Adres URL nie zawiera 'Dashboard'.")
        driver.save_screenshot('debug_screenshot_after_login.png')
        # USUNIĘTO 'raise'

    # --- Wprowadzanie danych z pliku JSON ---
    print(f"\nNawigacja do strony formularza: {FORM_URL}")
    driver.get(FORM_URL)

    print("\n--- Formularz otwarty. Dodaj usługi ręcznie. ---")
    print("Przeglądarka pozostanie otwarta.")
    
    # Nieskończona pętla, aby skrypt się nie zakończył i nie zamknął przeglądarki
    while True:
        time.sleep(1)

except Exception as e:
    print(f"\n\nWystąpił nieoczekiwany błąd globalny: {e}")
    driver.save_screenshot('debug_screenshot_final_error.png')
    print("Zapisano zrzut ekranu z błędem jako 'debug_screenshot_final_error.png'.")
    print("Skrypt napotkał krytyczny błąd. Przeglądarka pozostanie otwarta do analizy.")
    while True:
        time.sleep(1)

