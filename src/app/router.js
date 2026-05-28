import { mountLive, mountHistory } from "../ui/layout.js";

export function createRouter({ store, shell }) {
	function parseHash() {
		const h = (location.hash || "#/live").toLowerCase();
		if (h.startsWith("#/history")) return "history";
		return "live";
	}

	function render() {
		const view = parseHash();
		store.patch(["mode"], view);
		// Defer heavy mount to next frame for faster first paint
		requestAnimationFrame(() => {
			if (view === "history") mountHistory({ store, shell });
			else mountLive({ store, shell });
		});
	}

	function start() {
		window.addEventListener("hashchange", render);
		render();
	}

	function go(hash) {
		location.hash = hash;
	}

	return { start, go };
}
