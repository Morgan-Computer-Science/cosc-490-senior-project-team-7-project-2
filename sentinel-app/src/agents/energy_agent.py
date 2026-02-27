from core.vertex_client import ask_vertex
from live_intel import get_energy_intel

def energy_agent(query):

    intel = get_energy_intel()

    prompt = f"""
You are the Energy & Oil Security Advisor.

LIVE ENERGY INTEL:
{intel}

Analyze geopolitical implications.

Question:
{query}
"""

    return ask_vertex(prompt)