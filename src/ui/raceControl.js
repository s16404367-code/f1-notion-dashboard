import { h, fmt, safeArr } from "./dom.js";

export function createRaceControlPanel({ store }) {
	const el = h("div", { class: "card" }, [
		h("div", { class: "cardTitle", text: "Race Control" }),
		h("div", { class: "feed", id: "rcFeed" }, [])
	]);
	const feed = el.querySelector("#rcFeed");

	function render() {
		const arr = safeArr(store.state.data.raceControl)
			.slice()
			.sort((a, b) => Date.parse(b?.date) - Date.parse(a?.date))
			.slice(0, 30);

		feed.innerHTML = "";
		if (!arr.length) {
			feed.appendChild(h("div", { class: "muted", text: "No messages." }));
			return;
		}

		for (const m of arr) {
			feed.appendChild(
				h("div", { class: "feedItem" }, [
					h("div", { class: "feedMeta" }, [
						h("span", { class: "pill", text: fmt(m?.category || "RC") }),
						h("span", { class: "muted", text: fmt(m?.date).slice(11, 19) })
					]),
					h("div", { class: "feedText", text: fmt(m?.message) })
				])
			);
		}
	}

	store.on("state", render);
	render();
	return { el };
}
