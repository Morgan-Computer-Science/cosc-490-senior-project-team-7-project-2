from core.vertex_client import ask_vertex

def national_security_brief(fused_report):

    prompt = f"""
You are the National Security Advisor.

Create a presidential briefing including:

- Executive Summary
- Top Threats
- Recommended Actions

INTELLIGENCE:
{fused_report}
"""

    return ask_vertex(prompt)