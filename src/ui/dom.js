export function h(tag, attrs = {}, children = []) {
	const el = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs || {})) {
		if (v === null || v === undefined) continue;
		if (k === "class") el.className = v;
		else if (k === "text") el.textContent = v;
		else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
		else el.setAttribute(k, String(v));
	}
	for (const c of children || []) {
		if (c === null || c === undefined) continue;
		if (typeof c === "string") el.appendChild(document.createTextNode(c));
		else el.appendChild(c);
	}
	return el;
}

export function createEmitter() {
	const map = new Map();
	function on(evt, fn) {
		if (!map.has(evt)) map.set(evt, new Set());
		map.get(evt).add(fn);
		return () => map.get(evt).delete(fn);
	}
	function emit(evt) {
		const set = map.get(evt);
		if (!set) return;
		for (const fn of set) fn();
	}
	return { on, emit };
}

export function safeArr(v) {
	return Array.isArray(v) ? v : [];
}

export function fmt(v, fallback = "—") {
	if (v === null || v === undefined) return fallback;
	const s = String(v);
	return s.length ? s : fallback;
}

export function byNum(a, b) {
	return (Number(a) || 0) - (Number(b) || 0);
}
