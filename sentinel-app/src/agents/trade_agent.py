from core.vertex_client import ask_vertex
from live_intel import get_trade_intel

def trade_agent(query):

    intel = get_trade_intel()

    prompt = f"""
You are the Trade & Commerce Advisor to the President.

LIVE U.S. CENSUS BUREAU TRADE DATA:
{intel}

Analyze U.S. trade and commerce implications.

Consider:
- Trade deficit and surplus trends
- Import and export activity by sector
- Tariff and sanctions impact
- Supply chain vulnerabilities and dependencies
- Recommendations for trade policy and economic competitiveness

Question:
{query}
"""

    return ask_vertex(prompt)
