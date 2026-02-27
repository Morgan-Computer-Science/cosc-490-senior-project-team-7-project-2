from google import genai

# Uses your gcloud login automatically (NO API key needed)
client = genai.Client(
    vertexai=True,
    project="sentinel-senior-project",
    location="us-central1",
)

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Say: Vertex AI is connected successfully."
)

print(response.text)