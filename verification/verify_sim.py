from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to home...")
            page.goto("http://localhost:3000", timeout=60000)

            # Select a school (e.g. Mangueira)
            print("Selecting school...")
            page.get_by_role("button", name="Estação Primeira de Mangueira").click()

            # Wait for choice screen
            time.sleep(1)

            # Find "Pular para Preparação" button
            # It contains text "Pular para Preparação" or "Simular Mercado"
            print("Clicking Simular Mercado...")
            # Taking screenshot before click
            page.screenshot(path="verification/before_click.png")

            # Click
            button = page.get_by_role("button", name="Simular Mercado").first
            button.click()

            # It should show loading state briefly, then go to Preparation
            # Let's wait a bit
            time.sleep(2)

            print("Taking screenshot of Preparation Dashboard...")
            page.screenshot(path="verification/preparation_dashboard.png")

            # Check for text present in PreparationDashboard
            # e.g., "Semana 9" or "Alegorias"
            content = page.content()
            if "Semana 9" in content and "Alegorias" in content:
                print("SUCCESS: Reached Preparation Dashboard Week 9")
            else:
                print("FAILURE: Did not reach Preparation Dashboard")
                print(content[:1000])

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
