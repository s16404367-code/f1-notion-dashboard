import { h } from "./dom.js";

let rootEl = null;

export function setToastRoot(el) {
	rootEl = el;
}

export function toast(message, { type = "info", ms = 3500 } = {}) {
	if (!rootEl) return;
	const t = h("div", { class: `toast toast-${type}` }, [
		h("div", { class: "toast-msg", text: message })
	]);
	rootEl.appendChild(t);

	setTimeout(() => {
		t.classList.add("toast-hide");
		setTimeout(() => t.remove(), 250);
	}, ms);
}
