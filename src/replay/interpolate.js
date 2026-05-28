export function lerp(a, b, t) {
	return a + (b - a) * t;
}

// samples sorted by time ascending; each sample has { date, x, y }
export function interpolateSampleAtTime(samples, absMs, { maxGapMs = 2000 } = {}) {
	if (!samples || !samples.length) return null;

	// binary search for first sample > absMs
	let lo = 0,
		hi = samples.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		const t = Date.parse(samples[mid]?.date);
		if (!Number.isFinite(t)) {
			hi = mid - 1;
			continue;
		}
		if (t <= absMs) lo = mid + 1;
		else hi = mid - 1;
	}

	const i1 = Math.max(0, lo);
	const i0 = i1 - 1;
	const s0 = samples[i0] || null;
	const s1 = samples[i1] || null;
	if (!s0) return null;
	if (!s1) return s0; // past end: hold last

	const t0 = Date.parse(s0?.date);
	const t1 = Date.parse(s1?.date);
	if (!Number.isFinite(t0) || !Number.isFinite(t1)) return s0;
	const gap = t1 - t0;
	if (gap <= 0 || gap > maxGapMs) return s0;

	const alpha = (absMs - t0) / gap;
	const x0 = Number(s0?.x),
		y0 = Number(s0?.y);
	const x1 = Number(s1?.x),
		y1 = Number(s1?.y);
	if (![x0, y0, x1, y1].every(Number.isFinite)) return s0;

	return { ...s0, x: lerp(x0, x1, alpha), y: lerp(y0, y1, alpha) };
}
