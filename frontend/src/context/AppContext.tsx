// Backend URL with a fallback for production
const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL?.trim() ||
  "https://universal-share-backend.onrender.com";

// API base URL
const API = `${BACKEND_URL.replace(/\/$/, "")}/api`;

console.log("Backend URL:", BACKEND_URL);
console.log("API URL:", API);
