export const environment = {
  // cambia en 1 lugar: acá o por window.__API_BASE__
  API_BASE: (window as any).__API_BASE__ ?? "https://demo-chat-api-n93a.onrender.com",
  WITH_CREDENTIALS: true,
  USE_BEARER: true,
  PATHS: {
    login: "/auth/login",
    signup: "/auth/signup",
    threads_list: "/threads",
    threads_last: "/threads/last",
    thread_by_id: (id: string) => `/threads/${id}`,
    messages: "/messages",
    utils_title: "/api/utils/generate-title",
  }
};
