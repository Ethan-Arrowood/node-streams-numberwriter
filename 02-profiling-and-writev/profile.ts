import { pipeline } from "node:stream/promises";
import { createReadStream } from "node:fs";
import { Writable } from "node:stream";
import { LineToNumber } from "./LineToNumber.ts";

/**
 * Times the transform with `performance.now()`. Run it under `--trace-gc` and
 * pipe the combined output into `summarize-gc.mjs`:
 *
 *   node --trace-gc profile.ts <input.txt> | node summarize-gc.mjs
 *
 * As written, the sink is a do-nothing `Writable`, so only `LineToNumber` is
 * measured. To time the full pipeline, swap `nullSink` for
 * `new NumberWriter({ outputDir: "out" })` (and import it).
 */
const input = process.argv[2];

// a do-nothing sink, so we measure only LineToNumber
const nullSink = new Writable({
	objectMode: true,
	write(_chunk, _encoding, callback) {
		callback();
	},
});

const start = performance.now();
await pipeline(createReadStream(input), new LineToNumber(), nullSink);
const elapsed = performance.now() - start;

// print to stdout so it rides along with the --trace-gc output
console.log(`WALL_MS=${elapsed.toFixed(0)}`);
