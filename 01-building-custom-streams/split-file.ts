import { pipeline } from "node:stream/promises";
import { createReadStream } from "node:fs";
import { LineToNumber } from "./LineToNumber.ts";
import { NumberWriter } from "./NumberWriter.ts";

/**
 * Splits a file of newline-delimited numbers into smaller, size-limited files.
 *
 * Usage:
 *   node split-file.ts <input.txt> [outputDir] [maxFileSizeBytes]
 *
 * Example (split the bundled sample into ~100KB files):
 *   node split-file.ts ../data/primes-sample.txt out 102400
 */
const [input, outputDir = "out", maxFileSizeRaw] = process.argv.slice(2);

if (!input) {
	console.error(
		"Usage: node split-file.ts <input.txt> [outputDir] [maxFileSizeBytes]",
	);
	process.exit(1);
}

const maxFileSize = maxFileSizeRaw ? Number(maxFileSizeRaw) : undefined;

await pipeline(
	createReadStream(input),
	new LineToNumber(),
	new NumberWriter({ outputDir, ...(maxFileSize ? { maxFileSize } : {}) }),
);

console.error(`Split ${input} into ${outputDir}/`);
