export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function fetchJSON(path, signal) {
  const response = await fetch(`${API_URL}${path}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok)
    throw new Error(
      response.status === 503
        ? 'The trained model is unavailable.'
        : `Service request failed (${response.status}).`,
    );
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('The API returned an unexpected response.');
  return response.json();
}
