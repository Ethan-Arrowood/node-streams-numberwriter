import { readFileSync } from "node:fs";

/**
 * The "just read it all into memory" approach, for contrast with the streaming
 * one. Fine for a small file like the sample; falls over on a ~1GB file, which
 * is what motivated the custom streams in the first place.
 *
 * Usage:
 *   node read-primes.ts [input.txt]
 */
const input = process.argv[2] ?? "../data/primes-sample.txt";

const primes = readFileSync(input, "utf-8");
const primeArray = primes
	.trim()
	.split("\n")
	.map((n) => parseInt(n, 10));

console.log("count:", primeArray.length);
console.log("100th prime:", primeArray[99]);
console.log("largest:", primeArray.at(-1));

// A Set turns the list into an O(1) primality check.
const primeSet = new Set(primeArray);
console.log("is 7919 prime?", primeSet.has(7919));
console.log("is 7920 prime?", primeSet.has(7920));
