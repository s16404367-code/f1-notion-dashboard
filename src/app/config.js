import { TRACK_SVGS_2025_2026 } from "./tracks2025_2026.js";

export const CONFIG = {
	appName: "F1 Telemetry Dashboard",
	openf1BaseUrl: "https://api.openf1.org/v1",

	// Live polling scheduler cadence (ms)
	live: {
		// IMPORTANT: OpenF1 rate limit is ~30 requests/minute.
		// Keep total calls under that across all endpoints.
		pollMs: {
			sessions: 30_000,
			intervals: 10_000,
			laps: 12_000,
			stints: 20_000,
			weather: 25_000,
			raceControl: 15_000,
			teamRadio: 20_000,
			location: 10_000
		},
		locationWindowSeconds: 25
	},

	replay: {
		defaultSpeed: 1,
		speeds: [0.25, 0.5, 1, 2, 4, 8],
		tickMs: 200,
		interpolateMaxGapMs: 2200
	},

	tracks: TRACK_SVGS_2025_2026,

	// legacy key (unused):
	tracksLegacy: {
		// Specific outlines we ship
		"monaco": "./assets/tracks/monaco.svg",
		"monte carlo": "./assets/tracks/monaco.svg",
		"monza": "./assets/tracks/monza.svg",

		// Fallback outline so *all* venues display something (no 404s)
		"bahrain": "./assets/tracks/generic.svg",
		"jeddah": "./assets/tracks/generic.svg",
		"saudi": "./assets/tracks/generic.svg",
		"melbourne": "./assets/tracks/generic.svg",
		"australia": "./assets/tracks/generic.svg",
		"suzuka": "./assets/tracks/generic.svg",
		"japan": "./assets/tracks/generic.svg",
		"shanghai": "./assets/tracks/generic.svg",
		"china": "./assets/tracks/generic.svg",
		"miami": "./assets/tracks/generic.svg",
		"imola": "./assets/tracks/generic.svg",
		"emilia": "./assets/tracks/generic.svg",
		"monaco": "./assets/tracks/monaco.svg",
		"montreal": "./assets/tracks/generic.svg",
		"canada": "./assets/tracks/generic.svg",
		"barcelona": "./assets/tracks/generic.svg",
		"spain": "./assets/tracks/generic.svg",
		"spielberg": "./assets/tracks/generic.svg",
		"austria": "./assets/tracks/generic.svg",
		"silverstone": "./assets/tracks/generic.svg",
		"britain": "./assets/tracks/generic.svg",
		"hungary": "./assets/tracks/generic.svg",
		"budapest": "./assets/tracks/generic.svg",
		"spa": "./assets/tracks/generic.svg",
		"belgium": "./assets/tracks/generic.svg",
		"zandvoort": "./assets/tracks/generic.svg",
		"netherlands": "./assets/tracks/generic.svg",
		"monza": "./assets/tracks/monza.svg",
		"italy": "./assets/tracks/monza.svg",
		"baku": "./assets/tracks/generic.svg",
		"azerbaijan": "./assets/tracks/generic.svg",
		"singapore": "./assets/tracks/generic.svg",
		"austin": "./assets/tracks/generic.svg",
		"texas": "./assets/tracks/generic.svg",
		"mexico": "./assets/tracks/generic.svg",
		"mexico city": "./assets/tracks/generic.svg",
		"sao paulo": "./assets/tracks/generic.svg",
		"brazil": "./assets/tracks/generic.svg",
		"las vegas": "./assets/tracks/generic.svg",
		"qatar": "./assets/tracks/generic.svg",
		"lusail": "./assets/tracks/generic.svg",
		"abu dhabi": "./assets/tracks/generic.svg",
		"yas": "./assets/tracks/generic.svg"
	},

	teamColors: {
		"Ferrari": "#dc0000",
		"Red Bull Racing": "#0600ef",
		"Mercedes": "#00d2be",
		"McLaren": "#ff8700",
		"Aston Martin": "#006f62",
		"Alpine": "#0090ff",
		"Williams": "#005aff",
		"Kick Sauber": "#00ff87",
		"RB": "#2b4562",
		"Haas F1 Team": "#b6babd"
	},

	storageKey: "f1-openf1-dynamic-settings-v1"
};
