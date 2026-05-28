import { h, fmt, safeArr } from "./dom.js";

export function createWeatherPanel({ store }) {
	const el = h("div", { class: "card" }, [
		h("div", { class: "cardTitle", text: "Weather" }),
		h("div", { class: "list", id: "wList" }, [])
	]);

	const list = el.querySelector("#wList");

	function render() {
		const arr = safeArr(store.state.data.weather);
		const latest = arr.slice().sort((a, b) => Date.parse(b?.date) - Date.parse(a?.date))[0] || null;

		list.innerHTML = "";
		if (!latest) {
			list.appendChild(h("div", { class: "muted", text: "No weather data." }));
			return;
		}

		const item = (k, v) =>
			h("div", { class: "listRow" }, [h("div", { class: "listKey", text: k }), h("div", { class: "listVal", text: fmt(v) })]);

		list.appendChild(item("Air", latest?.air_temperature ? `${latest.air_temperature}°C` : null));
		list.appendChild(item("Track", latest?.track_temperature ? `${latest.track_temperature}°C` : null));
		list.appendChild(item("Humidity", latest?.humidity ? `${latest.humidity}%` : null));
		list.appendChild(item("Wind", latest?.wind_speed ? `${latest.wind_speed} m/s` : null));
		list.appendChild(item("Rain", latest?.rainfall ? `${latest.rainfall}` : null));
	}

	store.on("state", render);
	render();
	return { el };
}
