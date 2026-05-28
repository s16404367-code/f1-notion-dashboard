import { createAppShell } from "./ui/layout.js";
import { createStore } from "./app/state.js";
import { createRouter } from "./app/router.js";
import { CONFIG } from "./app/config.js";
import { setToastRoot } from "./ui/toast.js";

// PWA
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("./sw.js").catch(() => {});
	});
}

const root = document.getElementById("app");
const shell = createAppShell();
root.appendChild(shell.el);

setToastRoot(shell.toastRoot);

const store = createStore({ config: CONFIG });
const router = createRouter({ store, shell });
router.start();

// Default route
if (!location.hash) router.go("#/live");
