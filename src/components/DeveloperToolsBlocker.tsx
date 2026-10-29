"use client";

import { useEffect } from "react";

/**
 * DeveloperToolsBlocker Component
 * Blocks right-click and prevents opening developer tools (Inspect, Console)
 * Even on pages like /user/dashboard with local event listeners.
 */
export function DeveloperToolsBlocker() {
  useEffect(() => {
    // Flag to enable/disable developer tools blocking
    const ENABLE_DEVELOPER_TOOLS_BLOCK = false;

    if (!ENABLE_DEVELOPER_TOOLS_BLOCK) return;

    // 1. Block Right-Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // 2. Block Keyboard Shortcuts for Developer Tools
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // F12 - Developer Tools
      if (key === "f12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl) {
        // View Source (Ctrl+U)
        if (key === "u") {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Save Page (Ctrl+S)
        if (key === "s") {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Print Page (Ctrl+P)
        if (key === "p") {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac) - Inspect
        // Ctrl+Shift+J (Windows/Linux) or Cmd+Option+J (Mac) - Console
        // Ctrl+Shift+C (Windows/Linux) or Cmd+Option+C (Mac) - Inspect Element
        // Ctrl+Shift+K - Console (Firefox)
        const hasShiftOrAlt = e.shiftKey || e.altKey;
        if (
          hasShiftOrAlt &&
          (key === "i" || key === "j" || key === "c" || key === "k")
        ) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    // 3. Action to perform when devtools are detected: show Access Denied overlay
    const blockDevToolsActions = () => {
      if (typeof window === "undefined" || !document.body) return;

      // Clear console and display disabled message
      console.clear();
      console.log(
        "%cDeveloper Tools are disabled on this website.",
        "color: red; font-size: 24px; font-weight: bold; text-shadow: 1px 1px 2px black;"
      );

      // Render overlay block if not already rendered
      if (!document.getElementById("devtools-lock-overlay")) {
        const overlay = document.createElement("div");
        overlay.id = "devtools-lock-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.backgroundColor = "#0f172a";
        overlay.style.color = "#f8fafc";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.fontFamily = "sans-serif";
        overlay.style.textAlign = "center";
        overlay.style.padding = "20px";
        overlay.style.zIndex = "99999999";
        overlay.style.boxSizing = "border-box";

        overlay.innerHTML = `
          <h1 style="color: #ef4444; font-size: 2rem; margin-bottom: 1rem; font-weight: bold;">Access Denied</h1>
          <p style="font-size: 1.1rem; color: #94a3b8; margin-bottom: 2rem; max-width: 500px; line-height: 1.5;">
            Developer Tools are disabled on this website. Please close the console or inspector to resume access.
          </p>
          <button onclick="window.location.reload()" style="background-color: #3b82f6; color: white; border: none; padding: 12px 24px; font-size: 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            Reload Page
          </button>
        `;

        document.body.appendChild(overlay);
      }
    };

    // 4. Multi-layered DevTools Detection
    const detectDevTools = () => {
      if (typeof window === "undefined") return;

      const threshold = 160;

      // A. Check docked DevTools via size difference
      const isDockedDevToolsOpen =
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold;

      // B. Check via debugger delay (triggers when DevTools panel is open, regardless of dock state)
      const startTime = performance.now();
      debugger;
      const endTime = performance.now();
      const isDebuggerTriggered = endTime - startTime > 100;

      if (isDockedDevToolsOpen || isDebuggerTriggered) {
        blockDevToolsActions();
      }
    };

    // Add event listeners in the CAPTURE phase (third parameter = true)
    // This intercepts events before they reach dashboard components that might call e.stopPropagation()
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);

    // Periodically run DevTools check
    const devToolsCheckInterval = setInterval(detectDevTools, 500);

    // Cleanup on unmount
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      clearInterval(devToolsCheckInterval);
    };
  }, []);

  return null;
}
