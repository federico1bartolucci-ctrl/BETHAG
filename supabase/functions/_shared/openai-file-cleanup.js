export async function deleteTemporaryOpenAIFile(fetchImpl, apiKey, fileId) {
  if (!apiKey || !fileId) {
    return { ok: false, status: null, attempts: 0, error: "Missing API key or file ID." };
  }

  let lastStatus = null;
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchImpl(
        "https://api.openai.com/v1/files/" + encodeURIComponent(fileId),
        {
          method: "DELETE",
          headers: { Authorization: "Bearer " + apiKey },
        },
      );
      lastStatus = response.status;
      if (response.ok || response.status === 404) {
        return { ok: true, status: response.status, attempts: attempt };
      }
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return {
          ok: false,
          status: response.status,
          attempts: attempt,
          error: "Non-retryable OpenAI file deletion response.",
        };
      }
      lastError = "OpenAI file deletion returned HTTP " + response.status + ".";
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return { ok: false, status: lastStatus, attempts: 2, error: lastError };
}
