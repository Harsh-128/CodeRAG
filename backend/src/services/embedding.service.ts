const EMBEDDING_URL = "http://localhost:8080/embed";

export async function generateEmbedding(
  text: string
): Promise<number[]> {
  const response = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: text,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Embedding request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as number[][];

  if (!data[0]) {
    throw new Error("Embedding response was empty");
  }

  return data[0];
}