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