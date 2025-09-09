
export const logout = () => {
  localStorage.removeItem("chat-app-token");
  localStorage.removeItem("chat-user");
  window.location.href = "/login"; // arahkan ke halaman login
};
