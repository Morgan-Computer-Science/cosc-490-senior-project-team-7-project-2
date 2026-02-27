from core.vertex_client import ask_vertex


def nsa_fusion(cyber, health, transport, energy):

    prompt = f"""
You are the NSA Intelligence Fusion Agent.

Combine these reports into one national security assessment.

CYBER:
{cyber}

HEALTH:
{health}

TRANSPORT:
{transport}

ENERGY:
{energy}

Focus on cross-domain risks.
"""

    return ask_vertex(prompt)


def nsa_question_brief(agent_name, agent_response, question):

    prompt = f"""
You are the NSA Intelligence Coordinator.

Source Agent: {agent_name}

QUESTION:
{question}

REPORT:
{agent_response}

Rewrite as a presidential briefing including:
- Key Findings
- National Security Relevance
"""

    formatted = ask_vertex(prompt)

    return f"""
NSA INTELLIGENCE ATTRIBUTION
Source Agent: {agent_name}

----------------------------------

{formatted}
"""