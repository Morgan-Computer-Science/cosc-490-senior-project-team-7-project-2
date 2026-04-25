from core.vertex_client import ask_vertex
from live_intel import get_jobs_intel

def jobs_agent(query):

    intel = get_jobs_intel()

    prompt = f"""
You are the Labor & Employment Advisor to the President.

LIVE BUREAU OF LABOR STATISTICS DATA:
{intel}

Analyze national employment and labor market implications.

Consider:
- Unemployment rate and trends
- Job creation and payroll numbers
- Wage growth and income inequality
- Sector-specific employment shifts
- Policy recommendations to support American workers

Question:
{query}
"""

    return ask_vertex(prompt)
