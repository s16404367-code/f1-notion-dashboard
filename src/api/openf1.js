function qs(params) {
	const parts = [];
	for (const [k, v] of Object.entries(params || {})) {
		if (v === undefined || v === null || v === "") continue;
		parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
	}
	return parts.length ? "?" + parts.join("&") : "";
}

export function createOpenF1Client({ baseUrl }) {
	async function getJson(path, params, { signal } = {}) {
		const url = baseUrl + path + qs(params);
		const res = await fetch(url, {
			method: "GET",
			headers: { Accept: "application/json" },
			signal
		});
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			const err = new Error(`OpenF1 HTTP ${res.status} for ${path}: ${text.slice(0, 200)}`);
			err.status = res.status;
			throw err;
		}
		const data = await res.json();
		return Array.isArray(data) ? data : [];
	}

	return {
		sessions: (params, opt) => getJson("/sessions", params, opt),
		drivers: (params, opt) => getJson("/drivers", params, opt),
		location: (params, opt) => getJson("/location", params, opt),
		intervals: (params, opt) => getJson("/intervals", params, opt),
		laps: (params, opt) => getJson("/laps", params, opt),
		stints: (params, opt) => getJson("/stints", params, opt),
		weather: (params, opt) => getJson("/weather", params, opt),
		raceControl: (params, opt) => getJson("/race_control", params, opt),
		teamRadio: (params, opt) => getJson("/team_radio", params, opt)
	};
}
