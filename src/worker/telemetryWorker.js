import { interpolateSampleAtTime } from "../replay/interpolate.js";

function safeArr(v) {
	return Array.isArray(v) ? v : [];
}

function pickLatestByDriver(samples, { atAbsMs = null } = {}) {
	const map = new Map();
	for (const s of safeArr(samples)) {
		const dn = s?.driver_number;
		if (dn === null || dn === undefined) continue;
		const t = Date.parse(s?.date);
		if (atAbsMs !== null && Number.isFinite(t) && t > atAbsMs) continue;
		const prev = map.get(dn);
		if (!prev) map.set(dn, s);
		else {
			const ta = Date.parse(prev?.date);
			if (Number.isFinite(t) && (!Number.isFinite(ta) || t > ta)) map.set(dn, s);
		}
	}
	return map;
}

function buildLocationIndex(locAll) {
	const idx = new Map();
	for (const s of safeArr(locAll)) {
		const dn = s?.driver_number;
		if (dn === null || dn === undefined) continue;
		if (!idx.has(dn)) idx.set(dn, []);
		idx.get(dn).push(s);
	}
	for (const [dn, arr] of idx.entries()) {
		arr.sort((a, b) => Date.parse(a?.date) - Date.parse(b?.date));
		idx.set(dn, arr);
	}
	return idx;
}

function interpolateLocationsAtAbs(idx, absMs, maxGapMs) {
	const out = new Map();
	for (const [dn, samples] of idx.entries()) {
		const s = interpolateSampleAtTime(samples, absMs, { maxGapMs });
		if (s) out.set(dn, s);
	}
	return out;
}

self.onmessage = (evt) => {
	const msg = evt.data || {};
	if (msg.type === "historyIndex") {
		const idx = buildLocationIndex(msg.locAll);
		self._historyIdx = idx;
		self.postMessage({ type: "historyIndexReady" });
		return;
	}
	if (msg.type === "historyTick") {
		const idx = self._historyIdx;
		if (!idx) return;
		const m = interpolateLocationsAtAbs(idx, msg.absMs, msg.maxGapMs || 2000);
		// Convert Map -> array for structured clone safety
		self.postMessage({
			type: "historyLoc",
			absMs: msg.absMs,
			locLatest: Array.from(m.entries())
		});
		return;
	}

	if (msg.type === "liveLatest") {
		const m = pickLatestByDriver(msg.locRecent);
		self.postMessage({ type: "liveLoc", locLatest: Array.from(m.entries()) });
		return;
	}
};
