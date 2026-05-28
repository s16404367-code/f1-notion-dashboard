// Endpoint scheduler: avoids overlapping requests, supports per-task cadence.

export function createScheduler() {
	const tasks = new Map();
	let timer = 0;

	function add({ id, everyMs, run }) {
		tasks.set(id, {
			id,
			everyMs,
			run,
			nextAt: 0,
			running: false
		});
	}

	function remove(id) {
		tasks.delete(id);
	}

	function stop() {
		if (timer) clearInterval(timer);
		timer = 0;
	}

	function start() {
		stop();
		// small tick; tasks manage their own cadence
		timer = setInterval(async () => {
			const now = Date.now();
			for (const t of tasks.values()) {
				if (t.running) continue;
				if (now < t.nextAt) continue;
				t.running = true;
				t.nextAt = now + t.everyMs;
				Promise.resolve()
					.then(() => t.run())
					.catch(() => {})
					.finally(() => {
						t.running = false;
					});
			}
		}, 150);
	}

	return { add, remove, start, stop };
}
