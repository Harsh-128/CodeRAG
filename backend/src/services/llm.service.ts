const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL_NAME = "qwen2.5-coder:1.5b";

export async function generateAnswer(
  question: string,
  context: string
): Promise<string> {
  const prompt = `
You are CodeRAG, a source-code question answering assistant.

Your job is to answer the user's question using ONLY the retrieved code context below.

STRICT RULES:

STRICT RULES:

1. Use only facts directly supported by the retrieved code.
2. Do NOT invent implementation details.
3. Do NOT assume behavior that is not shown in the code.
4. Do NOT assume a function returns a Promise unless the code shows it.
5. Do NOT describe code that is not included in the retrieved context.
6. Do NOT claim that something prevents crashes, improves reliability, or provides a user experience unless the code explicitly demonstrates that.
7. If the retrieved context is insufficient to answer the question, say:
   "The retrieved code does not provide enough information to answer this completely."
8. Keep the answer concise: maximum 3 sentences.
9. Every sentence must describe something directly visible in the retrieved code.
10. Do NOT use phrases such as "prevents crashes", "gracefully handled", "user-friendly", "improves reliability", or similar unless those exact behaviors are demonstrated by the retrieved code.
11. Prefer describing the exact control flow: what function is called, what condition occurs, and what happens next.
12. Mention the source file and line numbers when relevant.
13. Do not add a separate example unless the user asks for one.
14. Do not repeat the entire code block unless necessary.

USER QUESTION:
${question}

RETRIEVED CODE CONTEXT:
${context}

Write a concise, strictly grounded answer.
`;

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    response?: string;
  };

  if (!data.response) {
    throw new Error("Ollama returned an empty response");
  }

  return data.response.trim();
}