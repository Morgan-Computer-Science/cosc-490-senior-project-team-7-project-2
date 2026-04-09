from agents.cyber_agent import cyber_agent
from agents.health_agent import health_agent
from agents.energy_agent import energy_agent
from agents.transport_agent import transport_agent


def route_question(query):

    q = query.lower()

    if any(w in q for w in ["cyber", "hack", "ransomware", "vulnerability"]):
        return {"agent": "Cybersecurity Advisor",
                "response": cyber_agent(query)}

    elif any(w in q for w in ["health", "virus", "pandemic", "disease"]):
        return {"agent": "Public Health Advisor",
                "response": health_agent(query)}

    elif any(w in q for w in ["energy", "oil", "gas", "pipeline"]):
        return {"agent": "Energy & Oil Advisor",
                "response": energy_agent(query)}

    elif any(w in q for w in ["transport", "infrastructure", "supply"]):
        return {"agent": "Transportation & Infrastructure Advisor",
                "response": transport_agent(query)}

    else:
        return {"agent": "General Intelligence",
                "response": "No matching domain agent."}