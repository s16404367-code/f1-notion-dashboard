import { createAppShell } from "./ui/layout.js";
import { createStore } from "./app/state.js";
import { createRouter } from "./app/router.js";
import { CONFIG } from "./app/config.js";
import { setToastRoot } from "./ui/toast.js";

// PWA (GitHub Pages caching can keep old broken JS; force SW update)
if ("serviceWorker" in navigator) {
	window.addEventListener("load", async () => {
		try {
			const reg = await navigator.serviceWorker.register("./sw.js");
			// Ask browser to check for updates now
			reg.update().catch(() => {});
			// If a new SW takes control, reload once to get fresh assets
			let reloaded = sessionStorage.getItem("swReloaded") === "1";
			navigator.serviceWorker.addEventListener("controllerchange", () => {
				if (reloaded) return;
				sessionStorage.setItem("swReloaded", "1");
				location.reload();
			});
		} catch {
			// ignore
		}
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
