import React from "react";
import ReactDOM from "react-dom/client";
import ShoppingApp from "../shopping-list-app.jsx";

// Polyfill window.storage using localStorage
window.storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value !== null ? { value } : null;
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ShoppingApp />
  </React.StrictMode>
);
