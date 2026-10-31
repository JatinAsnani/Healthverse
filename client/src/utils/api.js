/**
 * HealthVerse API Fetch Utility
 * Wraps fetch with default timeouts and error handling to prevent UI hanging.
 */

export async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 4000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export default fetchWithTimeout;

