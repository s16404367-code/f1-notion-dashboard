import { h, safeArr } from "./dom.js";
import { toast } from "./toast.js";
import { createOpenF1Client } from "../api/openf1.js";
import { computeTrackSvgUrl, createTrackMap } from "./trackMap.js";
import { createDriverFocus } from "./driverFocus.js";
import { createWeatherPanel } from "./weather.js";
import { createRaceControlPanel } from "./raceControl.js";
import { createTeamRadioPanel } from "./teamRadio.js";
import { createController } from "./timingTower.js";

let mounted = { view: null };

export function createAppShell() {
	const header = h("header", { class: "topbar" }, [
		h("div", { class: "brand" }, [
			h("div", { class: "logo" }),
			h("div", { class: "brandText" }, [
				h("div", { class: "brandTitle", text: "F1 Telemetry" }),
				h("div", { class: "brandSub", text: "OpenF1 • Dynamic • GitHub Pages" })
			])
		]),
		h("nav", { class: "nav" }, [
			h("a", { class: "navLink", href: "#/live", text: "Live" }),
			h("a", { class: "navLink", href: "#/history", text: "Historical Replay" })
		])
	]);

	const main = h("main", { class: "main" });
	const toastRoot = h("div", { class: "toastRoot" });
	const el = h("div", { class: "app" }, [header, main, toastRoot]);
	return { el, main, toastRoot };
}

function clearMain(shell) {
	while (shell.main.firstChild) shell.main.removeChild(shell.main.firstChild);
}

function mountCommon({ store, shell, mode }) {
	clearMain(shell);

	const client = createOpenF1Client({ baseUrl: store.state.config.openf1BaseUrl });
	const ctrl = createController({ store, client, mode });
	const map = createTrackMap({ store });
	const focus = createDriverFocus({ store });
	const weather = createWeatherPanel({ store });
	const rc = createRaceControlPanel({ store });
	const radio = createTeamRadioPanel({ store });

	const left = h("section", { class: "panel panel-left" }, [
		ctrl.el,
		h("div", { class: "stack" }, [weather.el, rc.el, radio.el])
	]);

	const center = h("section", { class: "panel panel-center" }, [map.el]);
	const right = h("section", { class: "panel panel-right" }, [focus.el]);
	const grid = h("div", { class: "grid" }, [left, center, right]);
	shell.main.appendChild(grid);

	ctrl.start().catch((err) => {
		console.error(err);
		toast("Failed to start. OpenF1 may be busy.", { type: "error" });
	});

	// Track SVG mapping updates
	store.on("state", () => {
		store.patch(["ui", "trackSvgUrl"], computeTrackSvgUrl(store.state));
	});
	store.patch(["ui", "trackSvgUrl"], computeTrackSvgUrl(store.state));

	// Safety: when switching to history, stop live
	if (mode === "history") {
		store.patch(["live", "isRunning"], false);
		store.patch(["data", "weather"], safeArr(store.state.data.weather));
	}
}

export function mountLive({ store, shell }) {
	if (mounted.view === "live") return;
	mounted.view = "live";
	mountCommon({ store, shell, mode: "live" });
}

export function mountHistory({ store, shell }) {
	if (mounted.view === "history") return;
	mounted.view = "history";
	mountCommon({ store, shell, mode: "history" });
}
