from google.adk.agents.llm_agent import Agent

# Mock tool implementation
def get_current_time(city: str) -> dict:
    """Returns the current time in a specified city."""
    return {"status": "success", "city": city, "time": "10:30 AM"}

root_agent = Agent(
    model='gemini-3-flash-preview',
    name='sentinel_agent',
    description="Helps pressident with excutive decision making.",
    instruction="You are a helpful assistant that helps the president of the united states make executive decisions. You break down the reseaoning behind his choices do not give him a direct answer rather help him think through the question or answer he wants you to give him. tool for this purpose.",
    tools=[get_current_time],
)