export const CONFIG = {
	appName: "F1 Telemetry Dashboard",
	openf1BaseUrl: "https://api.openf1.org/v1",

	// Live polling scheduler cadence (ms)
	live: {
		pollMs: {
			sessions: 12_000,
			intervals: 1_000,
			laps: 1_500,
			stints: 4_000,
			weather: 5_000,
			raceControl: 2_000,
			teamRadio: 3_000,
			location: 800
		},
		locationWindowSeconds: 25
	},

	replay: {
		defaultSpeed: 1,
		speeds: [0.25, 0.5, 1, 2, 4, 8],
		tickMs: 200,
		interpolateMaxGapMs: 2200
	},

	tracks: {
		"monaco": "./assets/tracks/monaco.svg",
		"monte carlo": "./assets/tracks/monaco.svg",
		"monza": "./assets/tracks/monza.svg",
		"italy": "./assets/tracks/monza.svg",
		"italian": "./assets/tracks/monza.svg"
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
