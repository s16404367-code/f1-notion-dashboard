import { h, fmt, safeArr, byNum } from "./dom.js";
import { toast } from "./toast.js";
import { createScheduler } from "../api/scheduler.js";
import { computeBoundsFromSamples, clamp } from "../replay/timeline.js";

function dedupeBy(arr, keyFn) {
	const seen = new Set();
	const out = [];
	for (const x of safeArr(arr)) {
		const k = keyFn(x);
		if (k === null || k === undefined) continue;
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(x);
	}
	return out;
}

function pickLatestByDriver(samples) {
	const map = new Map();
	for (const s of safeArr(samples)) {
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

function deriveTiming({ drivers, intervals, laps, stints }) {
	const driversArr = safeArr(drivers);
	const intervalLatest = pickLatestByDriver(intervals);
	const lapsLatest = pickLatestByDriver(laps);
	const stintsLatest = pickLatestByDriver(stints);

	const rows = driversArr.map((d) => {
		const dn = d?.driver_number;
		const interval = intervalLatest.get(dn) || {};
		const lap = lapsLatest.get(dn) || {};
		const stint = stintsLatest.get(dn) || {};

		const position = Number(interval?.position ?? lap?.position ?? d?.position) || null;
		const gapToLeader = interval?.gap_to_leader ?? interval?.gap_to_leader_ms;
		const intervalToAhead = interval?.interval ?? interval?.interval_ms;

		return {
			driver_number: dn,
			name: d?.broadcast_name || d?.full_name || d?.name || `#${dn}`,
			team: d?.team_name || d?.team || "—",
			position,
			gapToLeader,
			intervalToAhead,
			currentLap: lap?.lap_number ?? null,
			compound: stint?.compound ?? stint?.tyre_compound ?? null,
			tyreAge: stint?.tyre_age_at_start ?? stint?.tyre_age ?? null,
			pitCount: stint?.pit_stop_count ?? null
		};
	});

	rows.sort((a, b) => {
		if (a.position && b.position) return a.position - b.position;
		if (a.position) return -1;
		if (b.position) return 1;
		return byNum(a.driver_number, b.driver_number);
	});

	return rows;
}

function fmtGap(v) {
	if (v === null || v === undefined) return "—";
	if (typeof v === "number") {
		if (v > 200) return (v / 1000).toFixed(3);
		return v.toFixed(3);
	}
	return String(v);
}

function mmss(ms) {
	const s = Math.floor(ms / 1000);
	const m = Math.floor(s / 60);
	const r = s % 60;
	return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function createController({ store, client, mode }) {
	const el = h("div", { class: "card" }, [
		h("div", { class: "cardTitle", text: mode === "live" ? "Live" : "Historical Replay" }),
		h("div", { class: "controls" }, [
			h("label", { class: "label", text: "Season", for: "seasonSelect" }),
			h("select", { class: "select", id: "seasonSelect" }, [
				h("option", { value: "", text: "Auto" }),
				h("option", { value: "2026", text: "2026" }),
				h("option", { value: "2025", text: "2025" })
			]),
			h("label", { class: "label", text: "Session", for: "sessionSelect" }),
			h("select", { class: "select", id: "sessionSelect" }, [
				h("option", { value: "", text: "Loading…" })
			]),
			h("div", { class: "row" }, [
				h("button", {
					class: "btn btnPrimary",
					id: "btnStart",
					text: mode === "live" ? "Start Live" : "Load Session"
				}),
				h("button", { class: "btn", id: "btnStop", text: mode === "live" ? "Stop" : "Clear" })
			])
		]),

		h("div", { class: "towerWrap" }, [
			h("div", { class: "towerHeader" }, [
				h("div", { class: "col pos", text: "P" }),
				h("div", { class: "col drv", text: "Driver" }),
				h("div", { class: "col gap", text: "Gap" }),
				h("div", { class: "col int", text: "Int" }),
				h("div", { class: "col tyre", text: "Tyre" }),
				h("div", { class: "col lap", text: "Lap" })
			]),
			h("div", { class: "towerBody", id: "towerBody" }, [])
		]),

		h("div", { class: "replayBar", id: "replayBar", style: mode === "history" ? "" : "display:none" }, [
			h("button", { class: "btn btnPrimary", id: "btnPlay", text: "Play" }),
			h("button", { class: "btn", id: "btnPause", text: "Pause" }),
			h("input", { class: "scrub", id: "scrub", type: "range", min: "0", max: "1000", value: "0" }),
			h("select", { class: "select", id: "speedSelect" }, []),
			h("div", { class: "muted", id: "replayTime", text: "00:00 / 00:00" })
		])
	]);

	const seasonSelect = el.querySelector("#seasonSelect");
	const sessionSelect = el.querySelector("#sessionSelect");
	const btnStart = el.querySelector("#btnStart");
	const btnStop = el.querySelector("#btnStop");
	const towerBody = el.querySelector("#towerBody");

	const replayBar = el.querySelector("#replayBar");
	const btnPlay = el.querySelector("#btnPlay");
	const btnPause = el.querySelector("#btnPause");
	const scrub = el.querySelector("#scrub");
	const speedSelect = el.querySelector("#speedSelect");
	const replayTime = el.querySelector("#replayTime");

	let aborter = null;
	let scheduler = null;

	// Worker for live latest + history interpolation (safe on GitHub Pages)
	const worker = new Worker(new URL("../worker/telemetryWorker.js", import.meta.url), { type: "module" });
	worker.onmessage = (evt) => {
		const msg = evt.data || {};
		if (msg.type === "liveLoc") {
			store.state.replay.locInterpolatedLatest = new Map(msg.locLatest);
			store.patch(["replay", "locInterpolatedLatest"], store.state.replay.locInterpolatedLatest);
		}
		if (msg.type === "historyLoc") {
			store.state.replay.locInterpolatedLatest = new Map(msg.locLatest);
			store.patch(["replay", "locInterpolatedLatest"], store.state.replay.locInterpolatedLatest);
		}
	};

	function stopAll() {
		if (scheduler) scheduler.stop();
		scheduler = null;
		if (aborter) aborter.abort();
		aborter = null;

		store.patch([mode === "live" ? "live" : "history", "isRunning"], false);
	}

	function setSessionOptions(sessions) {
		const arr = safeArr(sessions);
		const options = arr.map((s) => {
			// "Venue" best-effort: prefer circuit_short_name, else meeting_name
			const venue = fmt(s?.circuit_short_name || s?.meeting_name);
			const sess = fmt(s?.session_name);
			const name = `${venue} • ${sess}`;
			return h("option", { value: String(s?.session_key ?? ""), text: name });
		});
		sessionSelect.innerHTML = "";
		sessionSelect.appendChild(h("option", { value: "", text: "Select a session…" }));
		for (const o of options) sessionSelect.appendChild(o);

		// restore saved
		const saved = mode === "live" ? store.state.live.selectedSessionKey : store.state.history.selectedSessionKey;
		if (saved) sessionSelect.value = String(saved);
	}

	async function loadSessionsList() {
		const season = seasonSelect.value || null;
		aborter = new AbortController();
		const signal = aborter.signal;
		const params = {};
		if (season) params.year = season;

		sessionSelect.innerHTML = "";
		sessionSelect.appendChild(h("option", { value: "", text: "Loading…" }));

		try {
			const sessions = await client.sessions(params, { signal });
			const deduped = dedupeBy(sessions, (s) => s?.session_key);
			deduped.sort((a, b) => Date.parse(b?.date_start) - Date.parse(a?.date_start));
			store.patch(["data", "sessions"], deduped);
			setSessionOptions(deduped);
		} catch (e) {
			console.error(e);
			if (e?.status === 429) toast("OpenF1 rate limit (429). Wait 1 minute and reload.", { type: "warn", ms: 6000 });
			else toast("Cannot load sessions (network/blocked).", { type: "error", ms: 6000 });
			sessionSelect.innerHTML = "";
			sessionSelect.appendChild(h("option", { value: "", text: "Failed to load sessions" }));
		}
	}

	async function loadCoreForSession(session_key, { signal }) {
		const key = Number(session_key);
		if (!Number.isFinite(key)) throw new Error("Invalid session_key");

		let drivers;
		try {
			drivers = await client.drivers({ session_key: key }, { signal });
		} catch (e) {
			if (e?.status === 429) onRateLimit();
			throw e;
		}
		store.patch(["data", "drivers"], safeArr(drivers));

		const idx = new Map();
		for (const d of safeArr(drivers)) {
			if (d?.driver_number !== null && d?.driver_number !== undefined) idx.set(d.driver_number, d);
		}
		store.state.derived.driverIndex = idx;

		// Persist selection
		if (mode === "live") store.patch(["live", "selectedSessionKey"], key, { persist: true });
		else store.patch(["history", "selectedSessionKey"], key, { persist: true });

		const [weather, rc, radio, stints] = await Promise.all([
			client.weather({ session_key: key }, { signal }).catch(() => []),
			client.raceControl({ session_key: key }, { signal }).catch(() => []),
			client.teamRadio({ session_key: key }, { signal }).catch(() => []),
			client.stints({ session_key: key }, { signal }).catch(() => [])
		]);

		store.batch(() => {
			store.patch(["data", "weather"], safeArr(weather));
			store.patch(["data", "raceControl"], safeArr(rc));
			store.patch(["data", "teamRadio"], safeArr(radio));
			store.patch(["data", "stints"], safeArr(stints));
		});
	}

	function renderTower(rows) {
		towerBody.innerHTML = "";
		for (const r of safeArr(rows)) {
			const row = h("div", { class: "towerRow", "data-dn": String(r.driver_number ?? "") }, [
				h("div", { class: "col pos", text: fmt(r.position) }),
				h("div", { class: "col drv" }, [
					h("button", {
						class: "drvBtn",
						text: r.name,
						onclick: () => store.patch(["ui", "selectedDriverNumber"], r.driver_number, { persist: true })
					})
				]),
				h("div", { class: "col gap", text: fmtGap(r.gapToLeader) }),
				h("div", { class: "col int", text: fmtGap(r.intervalToAhead) }),
				h(
					"div",
					{ class: "col tyre", text: `${fmt(r.compound)} ${r.tyreAge !== null && r.tyreAge !== undefined ? `(${r.tyreAge})` : ""}`.trim() || "—" }
				),
				h("div", { class: "col lap", text: fmt(r.currentLap) })
			]);
			towerBody.appendChild(row);
		}
	}

	async function startLive(session_key) {
		const key = Number(session_key);
		if (!Number.isFinite(key)) return;

		stopAll();
		aborter = new AbortController();
		const signal = aborter.signal;

		await loadCoreForSession(key, { signal });
		store.patch(["live", "isRunning"], true);

		scheduler = createScheduler();
		scheduler.add({
			id: "intervals",
			everyMs: store.state.config.live.pollMs.intervals,
			run: async () => guarded(async () => {
				store.patch(["data", "intervals"], safeArr(await client.intervals({ session_key: key }, { signal })));
			})
		});
		scheduler.add({
			id: "laps",
			everyMs: store.state.config.live.pollMs.laps,
			run: async () => store.patch(["data", "laps"], safeArr(await client.laps({ session_key: key }, { signal }).catch(() => [])))
		});
		scheduler.add({
			id: "stints",
			everyMs: store.state.config.live.pollMs.stints,
			run: async () => guarded(async () => {
				store.patch(["data", "stints"], safeArr(await client.stints({ session_key: key }, { signal })));
			})
		});
		scheduler.add({
			id: "weather",
			everyMs: store.state.config.live.pollMs.weather,
			run: async () => store.patch(["data", "weather"], safeArr(await client.weather({ session_key: key }, { signal }).catch(() => [])))
		});
		scheduler.add({
			id: "rc",
			everyMs: store.state.config.live.pollMs.raceControl,
			run: async () => guarded(async () => {
				store.patch(["data", "raceControl"], safeArr(await client.raceControl({ session_key: key }, { signal })));
			})
		});
		scheduler.add({
			id: "radio",
			everyMs: store.state.config.live.pollMs.teamRadio,
			run: async () => store.patch(["data", "teamRadio"], safeArr(await client.teamRadio({ session_key: key }, { signal }).catch(() => [])))
		});
		scheduler.add({
			id: "location",
			everyMs: store.state.config.live.pollMs.location,
			run: async () => guarded(async () => {
				const loc = await client.location({ session_key: key, interval: store.state.config.live.locationWindowSeconds }, { signal });
				store.patch(["data", "location"], safeArr(loc));
				worker.postMessage({ type: "liveLatest", locRecent: loc });
			})
		});

		scheduler.start();

		// Render loop (tower) at ~5fps, derived from latest streams
		const renderTimer = setInterval(() => {
			if (!store.state.live.isRunning) return clearInterval(renderTimer);
			const rows = deriveTiming({
				drivers: store.state.data.drivers,
				intervals: store.state.data.intervals,
				laps: store.state.data.laps,
				stints: store.state.data.stints
			});
			const map = new Map();
			for (const r of rows) map.set(r.driver_number, r);
			store.state.derived.driverTiming = map;
			renderTower(rows);
			store.patch(["live", "lastUpdateIso"], new Date().toISOString());
		}, 200);
	}

	async function loadHistory(session_key) {
		const key = Number(session_key);
		if (!Number.isFinite(key)) return;

		stopAll();
		aborter = new AbortController();
		const signal = aborter.signal;

		await loadCoreForSession(key, { signal });
		store.patch(["history", "isRunning"], true);

		const [locAll, lapsAll, intervalsAll, stintsAll, weatherAll, rcAll, radioAll] = await Promise.all([
			client.location({ session_key: key }, { signal }).catch(() => []),
			client.laps({ session_key: key }, { signal }).catch(() => []),
			client.intervals({ session_key: key }, { signal }).catch(() => []),
			client.stints({ session_key: key }, { signal }).catch(() => []),
			client.weather({ session_key: key }, { signal }).catch(() => []),
			client.raceControl({ session_key: key }, { signal }).catch(() => []),
			client.teamRadio({ session_key: key }, { signal }).catch(() => [])
		]);

		store.batch(() => {
			store.patch(["data", "location"], safeArr(locAll));
			store.patch(["data", "laps"], safeArr(lapsAll));
			store.patch(["data", "intervals"], safeArr(intervalsAll));
			store.patch(["data", "stints"], safeArr(stintsAll));
			store.patch(["data", "weather"], safeArr(weatherAll));
			store.patch(["data", "raceControl"], safeArr(rcAll));
			store.patch(["data", "teamRadio"], safeArr(radioAll));
		});

		const bounds = computeBoundsFromSamples(locAll);
		if (!bounds.durationMs) toast("No location telemetry for this session.", { type: "warn" });

		replayBar.style.display = "";
		speedSelect.innerHTML = "";
		for (const s of store.state.config.replay.speeds) {
			speedSelect.appendChild(h("option", { value: String(s), text: `${s}x` }));
		}
		speedSelect.value = String(store.state.config.replay.defaultSpeed);

		// build history interpolation index in worker once
		worker.postMessage({ type: "historyIndex", locAll });

		let isPlaying = false;
		let t = 0;
		let speed = Number(speedSelect.value);
		let last = performance.now();

		function tick() {
			if (!isPlaying) return;
			requestAnimationFrame(tick);
			const now = performance.now();
			const dt = now - last;
			last = now;
			if (dt < store.state.config.replay.tickMs) return;

			t = clamp(t + store.state.config.replay.tickMs * speed, 0, bounds.durationMs);
			onTime(t);
			if (t >= bounds.durationMs) isPlaying = false;
		}

		function onTime(msOffset) {
			const abs = bounds.t0 + msOffset;
			store.patch(["replay", "absMs"], abs);
			store.patch(["replay", "nowIso"], new Date(abs).toISOString());

			if (bounds.durationMs > 0) scrub.value = String(Math.round((msOffset / bounds.durationMs) * 1000));
			replayTime.textContent = `${mmss(msOffset)} / ${mmss(bounds.durationMs)}`;

			// Derived timing (best effort latest <= abs)
			const lapsNow = safeArr(lapsAll).filter((x) => Date.parse(x?.date) <= abs);
			const intervalsNow = safeArr(intervalsAll).filter((x) => Date.parse(x?.date) <= abs);
			const stintsNow = safeArr(stintsAll).filter((x) => Date.parse(x?.date) <= abs);

			const rows = deriveTiming({
				drivers: store.state.data.drivers,
				intervals: intervalsNow,
				laps: lapsNow,
				stints: stintsNow
			});
			const map = new Map();
			for (const r of rows) map.set(r.driver_number, r);
			store.state.derived.driverTiming = map;
			renderTower(rows);

			worker.postMessage({ type: "historyTick", absMs: abs, maxGapMs: store.state.config.replay.interpolateMaxGapMs });
		}

		btnPlay.onclick = () => {
			if (bounds.durationMs <= 0) return;
			isPlaying = true;
			last = performance.now();
			tick();
		};
		btnPause.onclick = () => (isPlaying = false);
		speedSelect.onchange = () => (speed = Number(speedSelect.value));
		scrub.oninput = () => {
			const p = Number(scrub.value) / 1000;
			t = p * bounds.durationMs;
			onTime(t);
		};

		// start paused at 0
		onTime(0);
		isPlaying = false;
	}

	async function start() {
		seasonSelect.onchange = () => loadSessionsList().catch((err) => {
			console.error(err);
			toast("Failed to load sessions.", { type: "error" });
		});

		btnStart.onclick = () => {
			const sk = sessionSelect.value;
			if (!sk) return toast("Select a session first.", { type: "warn" });
			if (mode === "live") startLive(sk).catch((err) => {
				console.error(err);
				toast("Live failed to start.", { type: "error" });
			});
			else loadHistory(sk).catch((err) => {
				console.error(err);
				toast("Failed to load replay session.", { type: "error" });
			});
		};

		btnStop.onclick = () => {
			stopAll();
			store.batch(() => {
				store.patch(["data", "intervals"], []);
				store.patch(["data", "laps"], []);
				store.patch(["data", "stints"], []);
				store.patch(["data", "weather"], []);
				store.patch(["data", "raceControl"], []);
				store.patch(["data", "teamRadio"], []);
				store.patch(["data", "location"], []);
			});
			towerBody.innerHTML = "";
			if (mode === "history") replayBar.style.display = "none";
		};

		await loadSessionsList();

		// if saved selection exists, auto-start
		const saved = mode === "live" ? store.state.live.selectedSessionKey : store.state.history.selectedSessionKey;
		if (saved) {
			sessionSelect.value = String(saved);
			// don't auto-start live to avoid surprise polling; auto-load history is okay
			if (mode === "history") btnStart.click();
		}
	}

	return { el, start };
}
