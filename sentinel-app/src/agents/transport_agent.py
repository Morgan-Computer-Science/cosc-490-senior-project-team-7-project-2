from core.vertex_client import ask_vertex

def transport_agent(query="Provide transportation infrastructure risks."):

    prompt = f"""
You are the Transportation & Infrastructure Advisor.

Assess risks involving:
- supply chains
- infrastructure disruption
- logistics security

Question:
{query}
"""

    return ask_vertex(prompt)