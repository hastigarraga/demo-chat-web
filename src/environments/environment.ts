export const environment = {
  API_BASE: (window as any).__API_BASE__ ?? "http://localhost:3000",
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
