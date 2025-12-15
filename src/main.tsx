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
    
    // Create fallback if parent exists using safe DOM manipulation
    if (img.parentElement) {
      const fallback = document.createElement('div');
      fallback.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl';
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'w-8 h-8 text-primary/40');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('viewBox', '0 0 24 24');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('d', 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4');
      
      svg.appendChild(path);
      fallback.appendChild(svg);
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
