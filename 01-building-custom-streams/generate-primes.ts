import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { createWriteStream } from "node:fs";
import { primeGenerator } from "./primeGenerator.ts";

/**
 * Writes newline-delimited prime numbers to a file.
 *
 * Usage:
 *   node generate-primes.ts <output.txt> [--limit N | --count N]
 *
 * Examples:
 *   node generate-primes.ts primes.txt --limit 1000000   # every prime below 1,000,000
 *   node generate-primes.ts primes.txt --count 100000    # the first 100,000 primes
 *
 * (The generator is intentionally naive, so large sets take a while.)
 */
const [output = "primes.txt", flag, valueRaw] = process.argv.slice(2);
const value = Number(valueRaw);

const options =
	flag === "--limit"
		? { limit: value }
		: flag === "--count"
			? { count: value }
			: { limit: 1_000_000 };

await pipeline(
	primeGenerator(options),
	new Transform({
		objectMode: true,
		transform(chunk, _encoding, callback) {
			callback(null, `${chunk}\n`);
		},
	}),
	createWriteStream(output),
);

console.error(`Wrote primes to ${output} (${JSON.stringify(options)})`);
