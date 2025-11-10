import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Suppress 404 errors for missing images globally
window.addEventListener('error', (event) => {
  if (event.target instanceof HTMLImageElement) {
    // Prevent 404 image errors from showing in console
    event.preventDefault();
    event.stopPropagation();
    
    // Hide the broken image and show a placeholder
    const img = event.target;
    img.style.display = 'none';
    
    // Create fallback if parent exists
    if (img.parentElement) {
      const fallback = document.createElement('div');
      fallback.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl';
      fallback.innerHTML = '<svg class="w-8 h-8 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
      img.parentElement.appendChild(fallback);
    }
  }
}, true);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
