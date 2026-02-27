from google import genai

client = genai.Client(
    vertexai=True,
    project="sentinel-senior-project",
    location="us-central1",
)

def ask_vertex(prompt):

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )

    return response.text