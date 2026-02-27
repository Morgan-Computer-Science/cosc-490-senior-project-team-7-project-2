import feedparser


def get_cyber_intel():
    feed = feedparser.parse(
        "https://www.cisa.gov/cybersecurity-advisories/all.xml"
    )

    entries = []
    for item in feed.entries[:3]:
        entries.append(f"{item.title}: {item.summary}")

    return "\n".join(entries)


def get_health_intel():
    feed = feedparser.parse(
        "https://www.who.int/feeds/entity/csr/don/en/rss.xml"
    )

    entries = []
    for item in feed.entries[:3]:
        entries.append(f"{item.title}: {item.summary}")

    return "\n".join(entries)


def get_energy_intel():
    feed = feedparser.parse(
        "https://www.eia.gov/rss/press_rss.xml"
    )

    entries = []
    for item in feed.entries[:3]:
        entries.append(f"{item.title}: {item.summary}")

    return "\n".join(entries)