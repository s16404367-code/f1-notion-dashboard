export function clamp(v, a, b) {
	return Math.max(a, Math.min(b, v));
}

export function computeBoundsFromSamples(samples) {
	const times = (samples || [])
		.map((s) => Date.parse(s?.date))
		.filter(Number.isFinite);

	if (!times.length) return { t0: NaN, t1: NaN, durationMs: 0 };
	const t0 = Math.min(...times);
	const t1 = Math.max(...times);
	return { t0, t1, durationMs: Math.max(0, t1 - t0) };
}
