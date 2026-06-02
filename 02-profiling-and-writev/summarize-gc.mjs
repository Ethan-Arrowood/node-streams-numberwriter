import { createInterface } from "node:readline";

/**
 * Reads `--trace-gc` output (plus the `WALL_MS=` line that profile.ts prints) on
 * stdin and reports how many collections happened, how long they cost in total,
 * and what fraction of the run that was.
 *
 *   node --trace-gc profile.ts <input.txt> | node summarize-gc.mjs
 *
 * Counting collections is easy and misleading; the number that matters is the
 * summed pause time (the first value in the `0.04 / 0.00 ms` field).
 */
const lines = createInterface({ input: process.stdin });

let gcEvents = 0;
let timeInGcMs = 0;
let wallMs = 0;

for await (const line of lines) {
	// every GC line is either a Scavenge (young gen) or a Mark-Compact (full heap)
	if (line.includes("Scavenge") || line.includes("Mark-Compact")) {
		gcEvents++;
		// "..., 0.04 / 0.00 ms ..." -> the first value is the pause for this collection
		const match = line.match(/([\d.]+) \/ [\d.]+ ms/);
		if (match) timeInGcMs += parseFloat(match[1]);
	}

	// the WALL_MS line printed by profile.ts
	const wall = line.match(/WALL_MS=(\d+)/);
	if (wall) wallMs = Number(wall[1]);
}

console.log({
	gcEvents,
	timeInGcMs: Math.round(timeInGcMs),
	wallMs,
	gcPercent: wallMs ? +((timeInGcMs / wallMs) * 100).toFixed(1) : null,
});
