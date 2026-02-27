from core.vertex_client import ask_vertex
from live_intel import get_health_intel

def health_agent(query):

    intel = get_health_intel()

    prompt = f"""
You are the Public Health Security Advisor.

LIVE WHO OUTBREAK DATA:
{intel}

Assess national security risks.

Question:
{query}
"""

    return ask_vertex(prompt)