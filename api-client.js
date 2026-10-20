(function exposeApi(root) {
  async function request(path, options = {}, transport = globalThis.fetch) {
    try {
      const endpoint = root?.document?.body?.hasAttribute('data-demo') && path.startsWith('/api/') ? `/demo${path}` : path;
      const response = await transport(endpoint, {
        ...options,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      });
      const payload = await response.json().catch(() => ({}));
      return { response, payload: payload && typeof payload === 'object' ? payload : {} };
    } catch (_error) {
      return {
        response: { ok: false, status: 0 },
        payload: { detail: 'Connection unavailable. Check your connection and try again.' },
      };
    }
  }
  const api = { request };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CourseworksApi = api;
})(typeof window === 'undefined' ? undefined : window);
