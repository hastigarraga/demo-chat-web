export const environment = {
  production: false,
  API_BASE: "http://localhost:3000",
  WITH_CREDENTIALS: false,
  USE_BEARER: true,
  PATHS: {
    login: "/auth/login",
    signup: "/auth/signup",
    threads_list: "/threads",
    threads_last: "/threads/last",
    thread_by_id: (id: string) => `/threads/${id}`,
    messages: "/messages"
  }
};
