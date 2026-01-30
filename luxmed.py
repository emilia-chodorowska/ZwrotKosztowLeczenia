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
driver.maximize_window()

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

    try:
        print("Oczekiwanie na załadowanie i gotowość formularza (Krok 1)...")
        wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "date-input[formcontrolname='executeDate']")))
        print("Pomyślnie załadowano stronę formularza i jest ona gotowa do interakcji.")
    except TimeoutException:
        print("\nBŁĄD KRYTYCZNY: Nie udało się załadować strony formularza w wyznaczonym czasie.")
        driver.save_screenshot('debug_screenshot_form_page_error.png')
        print("Zapisano zrzut ekranu: debug_screenshot_form_page_error.png")
        # USUNIĘTO 'raise'

    print("\n--- KROK 1: WYPEŁNIANIE LISTY USŁUG ---")
    total_wpisy = len(dane_do_wprowadzenia)
    for i, wpis in enumerate(dane_do_wprowadzenia):
        print(f"\n--- Przetwarzanie wpisu {i+1}/{total_wpisy} (Strona 1) ---")

        try:
            # 1. Data wykonania usługi
            print("1. Wybieranie daty wykonania usługi:")
            kontenery_daty_wykonania = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "date-input[formcontrolname='executeDate']")))
            wybierz_date_w_kalendarzu(driver, wait, kontenery_daty_wykonania[-1], wpis['data_wykonania_uslugi'])
            
            # 2. Wybór usługi
            print("\n2. Wybieranie usługi...")
            pola_uslug = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "app-dropdown-control input[placeholder='Wybierz usługę']")))
            pole_wyboru_uslugi = pola_uslug[-1]
            pole_wyboru_uslugi.click()
            time.sleep(0.5)
            pole_wyboru_uslugi.send_keys("Logopeda")
            xpath_opcji = "//li[contains(@class, 'dropdown-list-group-item') and contains(., 'Logopeda')]"
            opcja_do_wyboru = wait.until(EC.element_to_be_clickable((By.XPATH, xpath_opcji)))
            opcja_do_wyboru.click()
            print("   - Wybrano usługę 'Logopeda'.")
            time.sleep(0.5)

            # 3. Typ refundacji
            print("\n3. Wybieranie typu refundacji...")
            pola_typu_refundacji = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "input[formcontrolname='refundTitleTypeName']")))
            pola_typu_refundacji[-1].click()
            time.sleep(1)
            print("   - Zakończono wybór typu refundacji.")

            if i < total_wpisy - 1:
                przycisk_dodaj = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Dodaj kolejną usługę')]")))
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", przycisk_dodaj)
                time.sleep(0.3)
                przycisk_dodaj.click()
                nowa_liczba_pol = i + 2
                wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "date-input[formcontrolname='executeDate']")) == nowa_liczba_pol)
                print(f"   - Dodano nowy formularz nr {nowa_liczba_pol}.")

        except Exception as e:
            print(f"BŁĄD podczas przetwarzania wpisu {i+1} na stronie 1: {e}")
            driver.save_screenshot(f'debug_screenshot_wpis_strona1_{i+1}.png')
            # USUNIĘTO 'raise'

    # --- PRZEJŚCIE DO KROKU 2 ---
    print("\n--- Zakończono wypełnianie listy usług. Przechodzenie do kroku 2... ---")
    try:
        przycisk_dalej = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Dalej')]")))
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", przycisk_dalej)
        time.sleep(0.3)
        przycisk_dalej.click()
        print("   - Kliknięto przycisk 'Dalej'.")
    except Exception as e:
        print(f"BŁĄD: Nie udało się kliknąć przycisku 'Dalej'. Powód: {e}")
        # USUNIĘTO 'raise'

    # --- KROK 2: WYPEŁNIANIE SZCZEGÓŁÓW FAKTUR ---
    try:
        print("\n--- KROK 2: WYPEŁNIANIE SZCZEGÓŁÓW FAKTUR ---")
        wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[formcontrolname='invoiceNumber']")))
        print("   - Pomyślnie załadowano stronę 2.")
    except TimeoutException:
        print("\nBŁĄD KRYTYCZNY: Nie udało się załadować strony 2 (szczegóły faktur).")
        driver.save_screenshot('debug_screenshot_form_page2_error.png')
        # USUNIĘTO 'raise'

    for i, wpis in enumerate(dane_do_wprowadzenia):
        print(f"\n--- Przetwarzanie faktury {i+1}/{total_wpisy} (Strona 2) ---")
        try:
            # 1. Numer faktury
            print(f"1. Wprowadzanie numeru faktury: {wpis['numer']}")
            pola_numeru_faktury = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "input[formcontrolname='invoiceNumber']")))
            pola_numeru_faktury[i].send_keys(wpis['numer'])
            time.sleep(0.2)

            # 2. Liczba usług
            print(f"2. Wprowadzanie liczby usług: {wpis['liczba_uslug']}")
            kontenery_licznika = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "app-counter-input[formcontrolname='quantityServices']")))
            pole_licznika = kontenery_licznika[i].find_element(By.TAG_NAME, "input")
            pole_licznika.send_keys(Keys.CONTROL + "a")
            pole_licznika.send_keys(Keys.DELETE)
            pole_licznika.send_keys(str(wpis['liczba_uslug']))
            time.sleep(0.2)

            # 3. Data wystawienia faktury
            print("3. Wybieranie daty wystawienia faktury:")
            kontenery_daty_wystawienia = wait.until(EC.presence_of_all_elements_located((By.TAG_NAME, "date-input")))
            biezacy_kontener_daty = kontenery_daty_wystawienia[i]
            przycisk_w_kontenerze = biezacy_kontener_daty.find_element(By.TAG_NAME, "button")
            print("   - Oczekiwanie, aż przycisk kalendarza będzie klikalny...")
            wait.until(EC.element_to_be_clickable(przycisk_w_kontenerze))
            print("   - Przycisk jest gotowy.")
            wybierz_date_w_kalendarzu(driver, wait, biezacy_kontener_daty, wpis['data_wystawienia'])

            # 4. Miasto wykonania
            print("\n4. Wybieranie miasta...")
            pola_miasta = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "input[placeholder='Miasto']")))
            pole_miasta_biezace = pola_miasta[i]
            miasto_do_wpisania = wpis['miasto_wykonania'].split(' ')[0]
            pole_miasta_biezace.click()
            time.sleep(0.3)
            pole_miasta_biezace.send_keys(miasto_do_wpisania)
            xpath_miasta = f"//li[contains(@class, 'dropdown-list-group-item') and contains(., '{miasto_do_wpisania}')]"
            opcja_miasta = wait.until(EC.element_to_be_clickable((By.XPATH, xpath_miasta)))
            opcja_miasta.click()
            print(f"   - Wybrano miasto: {miasto_do_wpisania}")
            time.sleep(0.3)

            # 5. Cena jednostkowa
            print(f"\n5. Wprowadzanie ceny jednostkowej: {wpis['cena_jednostkowa']}")
            pola_ceny = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "input[formcontrolname='servicePrice']")))
            pola_ceny[i].send_keys(str(wpis['cena_jednostkowa']))
            time.sleep(0.2)

            # 6. Kwota faktury
            print(f"\n6. Wprowadzanie kwoty faktury: {wpis['kwota_faktury']}")
            pola_kwoty = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "input[formcontrolname='invoiceAmount']")))
            pola_kwoty[i].send_keys(str(wpis['kwota_faktury']))
            time.sleep(0.2)

        except Exception as e:
            print(f"BŁĄD podczas przetwarzania faktury {i+1} na stronie 2: {e}")
            driver.save_screenshot(f'debug_screenshot_wpis_strona2_{i+1}.png')
            # USUNIĘTO 'raise'

    print("\n--- Zakończono wypełnianie danych na stronie 2 ---")
    
    try:
        print("Wyszukiwanie przycisku 'Dalej' na stronie 2...")
        przycisk_dalej_2 = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button.btn-primary:not([disabled])")))
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", przycisk_dalej_2)
        time.sleep(0.3)
        przycisk_dalej_2.click()
        print("Kliknięto przycisk 'Dalej'. Przechodzenie do strony 3...")
    except Exception as e:
        print(f"BŁĄD: Nie udało się kliknąć przycisku 'Dalej' na stronie 2. Powód: {e}")
        # USUNIĘTO 'raise'

    # --- KROK 3: WYPEŁNIANIE DANYCH DO PRZELEWU ---
    try:
        print("\n--- KROK 3: WYPEŁNIANIE DANYCH DO PRZELEWU ---")
        wait.until(EC.visibility_of_element_located((By.ID, "accountNo")))
        print("   - Pomyślnie załadowano stronę 3 (Dane do przelewu).")

        print(f"   - Wprowadzanie numeru rachunku...")
        pole_numer_rachunku = driver.find_element(By.ID, "accountNo")
        pole_numer_rachunku.send_keys(NUMER_RACHUNKU)

        print(f"   - Wprowadzanie właściciela rachunku...")
        pole_wlasciciel = driver.find_element(By.ID, "accountOwner")
        pole_wlasciciel.send_keys(WLASCICIEL_KONTA)

    except Exception as e:
        print(f"BŁĄD podczas wypełniania danych do przelewu na stronie 3: {e}")
        driver.save_screenshot('debug_screenshot_form_page3_error.png')
        # USUNIĘTO 'raise'


    print("\n--- ZAKOŃCZONO WPROWADZANIE DANYCH ---")
    print("Skrypt zakończył pracę. Przeglądarka pozostanie otwarta.")
    
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

