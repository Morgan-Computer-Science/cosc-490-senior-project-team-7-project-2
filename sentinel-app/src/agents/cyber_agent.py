from core.vertex_client import ask_vertex
from live_intel import get_cyber_intel

def cyber_agent(query):

    intel = get_cyber_intel()

    prompt = f"""
You are the National Cybersecurity Advisor.

LIVE CISA INTELLIGENCE:
{intel}

Analyze national security implications.

Question:
{query}
"""

    return ask_vertex(prompt)