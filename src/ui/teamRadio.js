import { h, fmt, safeArr } from "./dom.js";

export function createTeamRadioPanel({ store }) {
	const el = h("div", { class: "card" }, [
		h("div", { class: "cardTitle", text: "Team Radio" }),
		h("div", { class: "feed", id: "trFeed" }, [])
	]);
	const feed = el.querySelector("#trFeed");

	function render() {
		const arr = safeArr(store.state.data.teamRadio)
			.slice()
			.sort((a, b) => Date.parse(b?.date) - Date.parse(a?.date))
			.slice(0, 20);

		feed.innerHTML = "";
		if (!arr.length) {
			feed.appendChild(h("div", { class: "muted", text: "No radio clips." }));
			return;
		}

		for (const r of arr) {
			const dn = r?.driver_number;
			const driver = store.state.derived.driverIndex.get(dn) || {};
			const title = `${fmt(driver?.broadcast_name || driver?.full_name || `#${dn}`)} • ${fmt(r?.date).slice(11, 19)}`;

			feed.appendChild(
				h("div", { class: "feedItem" }, [
					h("div", { class: "feedMeta" }, [
						h("span", { class: "pill", text: "RADIO" }),
						h("span", { class: "muted", text: title })
					]),
					r?.recording_url
						? h("audio", { controls: "true", src: r.recording_url, class: "audio" }, [])
						: h("div", { class: "muted", text: "No audio URL." })
				])
			);
		}
	}

	store.on("state", render);
	render();
	return { el };
}
