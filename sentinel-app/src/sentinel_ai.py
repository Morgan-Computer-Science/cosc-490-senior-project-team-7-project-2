# sentinel_ai.py

from google import genai
from live_intel import (
    get_cyber_intel,
    get_health_intel,
    get_energy_intel,
)

# -------------------------------
# Vertex AI Client (Google Cloud)
# -------------------------------

client = genai.Client(
    vertexai=True,
    project="sentinel-senior-project",
    location="us-central1",
)


# -------------------------------
# Vertex AI Call Helper
# -------------------------------

def ask_vertex(prompt):

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )

    return response.text


# -------------------------------
# DOMAIN AGENTS (LIVE GROUNDED)
# -------------------------------

def cybersecurity_agent(query):

    live_data = get_cyber_intel()

    prompt = f"""
You are the President's National Cybersecurity Advisor.

Use ONLY verified intelligence below when forming analysis.
Do NOT invent vulnerabilities.

LIVE CISA CYBERSECURITY INTELLIGENCE:
{live_data}

Provide:
1. Intelligence Analysis
2. National Security Implications
3. Recommended Actions

Question:
{query}
"""

    response = ask_vertex(prompt)

    return f"""
{response}

----------------------------------
LIVE INTELLIGENCE SOURCES USED:
• CISA Known Exploited Vulnerabilities Catalog
----------------------------------
"""


def public_health_agent(query):

    live_data = get_health_intel()

    prompt = f"""
You are the President's Public Health Security Advisor.

Use ONLY verified outbreak intelligence.

LIVE WHO OUTBREAK INTELLIGENCE:
{live_data}

Provide national security and preparedness analysis.

Question:
{query}
"""

    response = ask_vertex(prompt)

    return f"""
{response}

----------------------------------
LIVE INTELLIGENCE SOURCES USED:
• WHO Disease Outbreak News
----------------------------------
"""


def energy_agent(query):

    live_data = get_energy_intel()

    prompt = f"""
You are the President's Energy and Oil Security Advisor.

Use ONLY verified energy intelligence.

LIVE ENERGY INTELLIGENCE (EIA):
{live_data}

Analyze geopolitical and national security implications.

Question:
{query}
"""

    response = ask_vertex(prompt)

    return f"""
{response}

----------------------------------
LIVE INTELLIGENCE SOURCES USED:
• U.S. Energy Information Administration (EIA)
----------------------------------
"""


# -------------------------------
# SUPPORTING SUB-AGENTS
# -------------------------------

def intelligence_agent(query):

    prompt = f"""
You are a National Intelligence Analyst.

Provide geopolitical interpretation and threat context.

Question:
{query}
"""

    return ask_vertex(prompt)


def risk_agent(query):

    prompt = f"""
You are a National Risk Assessment Advisor.

Provide:

- Risk Level (Low / Moderate / High / Critical)
- Likelihood
- National Impact
- Strategic Concern Summary

Question:
{query}
"""

    return ask_vertex(prompt)


# -------------------------------
# ROUTER (SMART DECISION LAYER)
# -------------------------------

def route_query(query):

    q = query.lower()

    # --- Domain Keywords ---
    cyber_keywords = [
        "cyber", "hack", "hacker", "ransomware",
        "malware", "cyberattack", "cybersecurity",
        "breach", "exploit", "vulnerability"
    ]

    health_keywords = [
        "health", "virus", "pandemic", "disease",
        "outbreak", "epidemic", "infection",
        "biological", "biothreat"
    ]

    energy_keywords = [
        "oil", "energy", "gas", "pipeline",
        "fuel", "electric grid", "power grid",
        "opec", "petroleum"
    ]

    # --- Time Awareness Keywords ---
    time_keywords = [
        "current", "today", "recent", "latest",
        "now", "ongoing", "breaking",
        "right now", "at the moment",
        "this week", "this month",
        "active", "currently"
    ]

    is_time_sensitive = any(word in q for word in time_keywords)
    is_cyber = any(word in q for word in cyber_keywords)
    is_health = any(word in q for word in health_keywords)
    is_energy = any(word in q for word in energy_keywords)

    # ---------------------------
    # ROUTING LOGIC
    # ---------------------------

    if is_cyber:
        return cybersecurity_agent(query)

    elif is_health:
        return public_health_agent(query)

    elif is_energy:
        return energy_agent(query)

    # Broad but time-sensitive → pull ALL live feeds
    elif is_time_sensitive:

        cyber_data = get_cyber_intel()
        health_data = get_health_intel()
        energy_data = get_energy_intel()

        combined_intel = f"""
LIVE CYBER INTEL:
{cyber_data}

LIVE HEALTH INTEL:
{health_data}

LIVE ENERGY INTEL:
{energy_data}
"""

        prompt = f"""
You are Sentinel, a Presidential National Security AI Advisor.

Use VERIFIED LIVE intelligence feeds below.
Do NOT invent facts outside provided intelligence.

{combined_intel}

Provide:
1. Intelligence Analysis
2. National Security Implications
3. Recommended Actions

Question:
{query}
"""

        response = ask_vertex(prompt)

        return f"""
{response}

----------------------------------
LIVE INTELLIGENCE SOURCES USED:
• CISA Known Exploited Vulnerabilities
• WHO Disease Outbreak News
• U.S. Energy Information Administration
----------------------------------
"""

    # Default reasoning agents
    else:

        intelligence = intelligence_agent(query)
        risk = risk_agent(query)

        return f"""
INTELLIGENCE ANALYSIS:
{intelligence}

----------------------------------

RISK ASSESSMENT:
{risk}
"""


# -------------------------------
# TERMINAL INTERFACE
# -------------------------------

def main():

    print("\nSentinel Presidential Decision AI Ready.")
    print("Type 'exit' to quit.\n")

    while True:

        user_input = input("Ask any national security question: ")

        if user_input.lower() == "exit":
            print("\nShutting down Sentinel AI.")
            break

        try:
            answer = route_query(user_input)

            print("\n--- AI RESPONSE ---\n")
            print(answer)
            print("\n")

        except Exception as e:
            print("\nError processing request:")
            print(e)


# -------------------------------
# RUN PROGRAM
# -------------------------------

if __name__ == "__main__":
    main()