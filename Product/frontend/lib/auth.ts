export const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

export const setToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const getUser = () => {
  if (typeof window === "undefined") return null;
  const userName = localStorage.getItem("user_name");
  const userRole = localStorage.getItem("user_role");
  if (!userName) return null;
  return { name: userName, role: userRole || "Student" };
};

export const setUser = (name: string, role?: string) => {
  localStorage.setItem("user_name", name);
  if (role) localStorage.setItem("user_role", role);
  window.dispatchEvent(new Event("user-updated"));
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_role");
};