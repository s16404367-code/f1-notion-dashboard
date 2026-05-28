import { h, fmt } from "./dom.js";

export function createDriverFocus({ store }) {
	const el = h("div", { class: "card" }, [
		h("div", { class: "cardTitle", text: "Driver Focus" }),
		h("div", { class: "focusBody", id: "focusBody" }, [
			h("div", { class: "muted", text: "Select a driver in the timing tower." })
		])
	]);

	const body = el.querySelector("#focusBody");

	function render() {
		const dn = store.state.ui.selectedDriverNumber;
		if (!dn) {
			body.innerHTML = "";
			body.appendChild(h("div", { class: "muted", text: "Select a driver in the timing tower." }));
			return;
		}

		const driver = store.state.derived.driverIndex.get(dn) || {};
		const row = store.state.derived.driverTiming.get(dn) || {};

		body.innerHTML = "";
		body.appendChild(
			h("div", { class: "focusHeader" }, [
				h("div", { class: "focusName", text: `${fmt(driver?.broadcast_name || driver?.full_name || row?.name)} (#${dn})` }),
				h("div", { class: "focusTeam", text: fmt(driver?.team_name || row?.team) })
			])
		);

		const kv = (k, v) =>
			h("div", { class: "kv" }, [h("div", { class: "k", text: k }), h("div", { class: "v", text: fmt(v) })]);

		body.appendChild(
			h("div", { class: "kvGrid" }, [
				kv("Position", row?.position),
				kv("Gap to leader", row?.gapToLeader),
				kv("Interval ahead", row?.intervalToAhead),
				kv("Car number", dn),
				kv("Team", driver?.team_name || row?.team),
				kv("Tyre compound", row?.compound),
				kv("Tyre age", row?.tyreAge),
				kv("Pit stops", row?.pitCount),
				kv("Current lap", row?.currentLap)
			])
		);
	}

	store.on("state", render);
	render();

	return { el };
}
