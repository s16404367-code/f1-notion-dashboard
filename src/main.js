import { createAppShell } from "./ui/layout.js";
import { createStore } from "./app/state.js";
import { createRouter } from "./app/router.js";
import { CONFIG } from "./app/config.js";
import { setToastRoot } from "./ui/toast.js";

// PWA disabled for stability on GitHub Pages (prevents stale-cache crashes)
// If you want PWA back later, we can re-enable it safely.

const root = document.getElementById("app");
const shell = createAppShell();
root.appendChild(shell.el);

setToastRoot(shell.toastRoot);

const store = createStore({ config: CONFIG });
const router = createRouter({ store, shell });
router.start();

// Default route
if (!location.hash) router.go("#/live");
