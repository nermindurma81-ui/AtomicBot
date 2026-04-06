import axios from 'axios';

// In production on Railway: frontend & backend are served from the SAME origin
// so BASE = '/api' works perfectly. In local dev, Vite proxy handles it.
// Override with VITE_API_URL env var if needed (separate deployments).
const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('ab_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => {
    // Guard: if server returns HTML instead of JSON, throw a clear error
    const ct = r.headers['content-type'] || '';
    if (ct.includes('text/html') && typeof r.data === 'string') {
      throw new Error(`Server vratio HTML umjesto JSON-a. Provjeri VITE_API_URL env varijablu.`);
    }
    return r;
  },
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ab_token');
      localStorage.removeItem('ab_user');
      window.location.href = '/login';
      return;
    }
    // Show a useful message if HTML was returned (common Railway misconfiguration)
    const ct = err.response?.headers?.['content-type'] || '';
    if (ct.includes('text/html')) {
      const orig = err.config?.url || '';
      err.message = `Server vratio HTML umjesto JSON-a (ruta možda nije dostupna): ${orig}`;
      if (!import.meta.env.VITE_API_URL) {
        err.message += ' • Ako API nije na istom domenu, postavi VITE_API_URL.';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Streaming chat helper
export async function streamChat({ messages, model, taskId, onDelta, onDone, onError }) {
  const token = localStorage.getItem('ab_token');
  const url = `${BASE}/chat/stream`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, model, taskId }),
    });

    if (!response.ok) {
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        throw new Error(`API ruta nije pronađena (${url}). Backend možda nije pokrenut ili VITE_API_URL nije postavljen.`);
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') { onDone?.(); return; }
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) { onError?.(parsed.error); return; }
          if (parsed.delta) onDelta?.(parsed.delta);
        } catch {}
      }
    }
    onDone?.();
  } catch (err) {
    onError?.(err.message);
  }
}

