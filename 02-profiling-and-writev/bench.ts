import { pipeline } from "node:stream/promises";
import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";
import { LineToNumber } from "./LineToNumber.ts";
import { NumberWriter } from "./NumberWriter.ts";
import { NumberWriterSingle } from "./NumberWriterSingle.ts";

/**
 * Reproduces the "does raising highWaterMark help?" comparison from the post.
 *
 *   node bench.ts <input.txt>
 *
 * The takeaway: bumping the single-number writer's `highWaterMark` from 16 to
 * 4096 changes nothing — the queue just holds more, but it still drains one
 * `_write` at a time. Only `_writev` (which also benefits from the larger
 * `highWaterMark`) actually batches the writes.
 *
 * A huge `maxFileSize` is used so everything lands in one output file: it keeps
 * the comparison about write batching, and avoids a rotation-related deadlock in
 * the single-number writer at large `highWaterMark`.
 */
const input = process.argv[2];

if (!input) {
	console.error("Usage: node bench.ts <input.txt>");
	process.exit(1);
}

const outputDir = "out";
const maxFileSize = 64 * 1024 * 1024 * 1024; // 64GB -> single output file, no rotation

const variants: Record<string, () => import("node:stream").Writable> = {
	"single (hwm 16)": () => new NumberWriterSingle({ outputDir, maxFileSize }),
	"single (hwm 4096)": () =>
		new NumberWriterSingle({ outputDir, maxFileSize, highWaterMark: 4096 }),
	"_writev (hwm 4096)": () =>
		new NumberWriter({ outputDir, maxFileSize, highWaterMark: 4096 }),
};

for (const [label, makeWriter] of Object.entries(variants)) {
	await rm(outputDir, { recursive: true, force: true });
	const start = performance.now();
	await pipeline(createReadStream(input), new LineToNumber(), makeWriter());
	const ms = performance.now() - start;
	console.log(`${label.padEnd(20)} ${ms.toFixed(0).padStart(8)} ms`);
}
