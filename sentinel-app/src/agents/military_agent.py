from core.vertex_client import ask_vertex
from live_intel import get_military_intel

def military_agent(query):

    intel = get_military_intel()

    prompt = f"""
You are the Secretary of Defense Advisor.

LIVE DEPARTMENT OF DEFENSE INTELLIGENCE:
{intel}

Analyze national defense and military readiness implications.

Consider:
- Active military operations and deployments
- Force readiness and capability gaps
- Adversary military activity and threats
- Defense budget and procurement priorities
- Nuclear posture and deterrence

Question:
{query}
"""

    return ask_vertex(prompt)
