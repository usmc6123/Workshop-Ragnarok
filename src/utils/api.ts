/**
 * Workshop: Ragnarök - Authorized Fetch Utility
 */

export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('workshop_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
