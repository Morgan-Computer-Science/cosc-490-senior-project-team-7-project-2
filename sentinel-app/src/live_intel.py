import requests

def safe_fetch(url):
    try:
        r = requests.get(url, timeout=5)
        return r.text[:1500]
    except:
        return "Live intelligence feed unavailable."


def get_cyber_intel():
    return safe_fetch("https://www.cisa.gov/news-events/alerts")


def get_health_intel():
    return safe_fetch("https://www.who.int/emergencies/disease-outbreak-news")


def get_energy_intel():
    return safe_fetch("https://www.eia.gov/todayinenergy/")


def get_military_intel():
    return safe_fetch("https://www.defense.gov/News/Releases/")


def get_jobs_intel():
    return safe_fetch("https://www.bls.gov/news.release/empsit.nr0.htm")


def get_trade_intel():
    return safe_fetch("https://www.census.gov/foreign-trade/Press-Release/current_press_release/index.html")