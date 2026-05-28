import { h, safeArr, fmt } from "./dom.js";

function normalizePoints(samples) {
	let minX = Infinity,
		maxX = -Infinity,
		minY = Infinity,
		maxY = -Infinity;

	for (const s of safeArr(samples)) {
		const x = Number(s?.x);
		const y = Number(s?.y);
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x);
		minY = Math.min(minY, y);
		maxY = Math.max(maxY, y);
	}
	const dx = maxX - minX || 1;
	const dy = maxY - minY || 1;

	return (s) => {
		const x = Number(s?.x);
		const y = Number(s?.y);
		if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
		return { u: (x - minX) / dx, v: 1 - (y - minY) / dy };
	};
}

export function computeTrackSvgUrl(state) {
	const sessions = state.data.sessions;
	const key = state.mode === "live" ? state.live.selectedSessionKey : state.history.selectedSessionKey;
	const session = sessions.find((s) => Number(s?.session_key) === Number(key)) || null;

	const keyA = String(session?.circuit_short_name || "").toLowerCase();
	const keyB = String(session?.meeting_name || "").toLowerCase();

	const map = state.config.tracks || {};
	const candidates = [keyA, keyB].filter(Boolean);

	for (const c of candidates) {
		for (const [k, url] of Object.entries(map)) {
			if (c.includes(k.toLowerCase())) return url;
		}
	}
	return null;
}

export function createTrackMap({ store }) {
	const el = h("div", { class: "card mapCard" }, [
		h("div", { class: "cardTitle", text: "Track Map" }),
		h("div", { class: "mapWrap" }, [
			h("div", { class: "mapSvg", id: "mapSvg" }, []),
			h("canvas", { class: "mapCanvas", id: "mapCanvas", width: "1200", height: "800" }, []),
			h("div", { class: "mapHint", id: "mapHint", text: "Load a session to display telemetry." })
		])
	]);

	const svgHost = el.querySelector("#mapSvg");
	const canvas = el.querySelector("#mapCanvas");
	const ctx = canvas.getContext("2d");
	const hint = el.querySelector("#mapHint");

	let currentSvgUrl = null;

	async function loadSvg(url) {
		if (!url) {
			svgHost.innerHTML = "";
			return;
		}
		const res = await fetch(url);
		const text = await res.text();
		svgHost.innerHTML = text;
	}

	function getLatestLocations() {
		// From worker interpolation output if available
		const m = store.state.replay.locInterpolatedLatest;
		if (m && m instanceof Map) return m;

		const map = new Map();
		for (const s of safeArr(store.state.data.location)) {
			const dn = s?.driver_number;
			if (dn === null || dn === undefined) continue;
			const prev = map.get(dn);
			if (!prev) map.set(dn, s);
			else {
				const ta = Date.parse(prev?.date);
				const tb = Date.parse(s?.date);
				if (Number.isFinite(tb) && (!Number.isFinite(ta) || tb > ta)) map.set(dn, s);
			}
		}
		return map;
	}

	function draw() {
		requestAnimationFrame(draw);

		const rect = canvas.getBoundingClientRect();
		const w = Math.max(1, Math.floor(rect.width * devicePixelRatio));
		const h = Math.max(1, Math.floor(rect.height * devicePixelRatio));
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
		}
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const latestMap = getLatestLocations();
		const latestSamples = Array.from(latestMap.values());
		if (!latestSamples.length) return;

		const toUV = normalizePoints(latestSamples);
		const selected = store.state.ui.selectedDriverNumber;
		const teamColors = store.state.config.teamColors || {};

		for (const s of latestSamples) {
			const dn = s?.driver_number;
			const driver = store.state.derived.driverIndex.get(dn) || {};
			const uv = toUV(s);
			if (!uv) continue;

			const x = uv.u * canvas.width;
			const y = uv.v * canvas.height;
			const team = driver?.team_name || "—";
			const color = teamColors[team] || "#ffffff";
			const isSel = selected && dn === selected;

			ctx.beginPath();
			ctx.fillStyle = isSel ? "#ffd1d6" : color;
			ctx.globalAlpha = isSel ? 1 : 0.85;
			ctx.arc(x, y, (isSel ? 6 : 4) * devicePixelRatio, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = 1;

			ctx.font = `${12 * devicePixelRatio}px ui-sans-serif, system-ui`;
			ctx.fillStyle = "#ffffff";
			ctx.fillText(String(dn), x + 8 * devicePixelRatio, y - 6 * devicePixelRatio);
		}
	}

	function render() {
		const svgUrl = computeTrackSvgUrl(store.state);
		if (svgUrl !== currentSvgUrl) {
			currentSvgUrl = svgUrl;
			loadSvg(svgUrl).catch(() => {
				svgHost.innerHTML = "";
			});
		}

		const key = store.state.mode === "live" ? store.state.live.selectedSessionKey : store.state.history.selectedSessionKey;
		const hasSession = !!key;

		hint.style.display = hasSession ? "none" : "";
		if (hasSession && !svgUrl) {
			hint.style.display = "";
			const sessions = store.state.data.sessions;
			const session = sessions.find((s) => Number(s?.session_key) === Number(key)) || null;
			hint.textContent = `No SVG mapped for "${fmt(session?.circuit_short_name || session?.meeting_name)}". Add SVG in assets/tracks and update config.`;
		}
	}

	store.on("state", render);
	render();
	draw();

	return { el };
}
