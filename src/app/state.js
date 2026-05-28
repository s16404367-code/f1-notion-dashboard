import { createEmitter } from "../ui/dom.js";

function loadSettings(storageKey) {
	try {
		const raw = localStorage.getItem(storageKey);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function saveSettings(storageKey, obj) {
	try {
		localStorage.setItem(storageKey, JSON.stringify(obj));
	} catch {}
}

export function createStore({ config }) {
	const emitter = createEmitter();
	const settings = loadSettings(config.storageKey);

	const state = {
		config,
		mode: "live", // live | history

		live: {
			selectedSessionKey: settings?.live?.selectedSessionKey ?? null,
			isRunning: false,
			lastUpdateIso: null
		},
		history: {
			selectedSessionKey: settings?.history?.selectedSessionKey ?? null,
			isRunning: false
		},

		data: {
			sessions: [],
			drivers: [],
			intervals: [],
			laps: [],
			stints: [],
			weather: [],
			raceControl: [],
			teamRadio: [],
			location: []
		},

		derived: {
			driverIndex: new Map(),
			driverTiming: new Map()
		},

		ui: {
			selectedDriverNumber: settings?.ui?.selectedDriverNumber ?? null,
			trackSvgUrl: null,
			layout: settings?.ui?.layout ?? "triple", // triple | focusMap
			tab: settings?.ui?.tab ?? "timing" // timing | map | strategy | radio
		},

		replay: {
			engine: null,
			absMs: null,
			nowIso: null,
			locInterpolatedLatest: null
		},

		net: {
			lastError: null
		}
	};

	function emit() {
		emitter.emit("state");
	}

	function patch(path, value, { persist = false } = {}) {
		let obj = state;
		for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
		obj[path[path.length - 1]] = value;

		if (persist) {
			const s = loadSettings(config.storageKey);
			let cur = s;
			for (let i = 0; i < path.length - 1; i++) {
				cur[path[i]] = cur[path[i]] || {};
				cur = cur[path[i]];
			}
			cur[path[path.length - 1]] = value;
			saveSettings(config.storageKey, s);
		}

		emit();
	}

	function batch(fn) {
		fn();
		emit();
	}

	return { state, patch, batch, on: emitter.on };
}
