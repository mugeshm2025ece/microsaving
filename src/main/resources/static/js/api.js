// Shared Fetch API helpers for the Spring Boot endpoints.

const configuredBaseUrl = document.querySelector('meta[name="microsave-api-base-url"]')?.content.trim();
export const API_BASE_URL = (configuredBaseUrl || window.location.origin).replace(/\/+$/, "");

export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(new URL(path, `${API_BASE_URL}/`), {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
  } catch (cause) {
    if (cause.name === "AbortError") throw cause;
    const error = new Error(`Unable to reach the MicroSave API at ${API_BASE_URL}. Check your connection and try again.`);
    error.cause = cause;
    throw error;
  }

  const responseText = await response.text();
  let data = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}
