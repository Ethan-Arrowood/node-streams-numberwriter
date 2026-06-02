import { isPrime } from "./isPrime.ts";

/**
 * Yields prime numbers, stopping at whichever of `limit` (max value) or `count`
 * (number of primes) is reached first. Because it's a generator, it can produce
 * effectively unbounded values without ever holding them all in memory.
 */
export function* primeGenerator({
	limit = Number.MAX_SAFE_INTEGER,
	count = Number.MAX_SAFE_INTEGER,
}: { limit?: number; count?: number } = {}) {
	let n = 2;
	let c = 0;
	while (n < limit && c < count) {
		if (isPrime(n)) {
			c++;
			yield n;
		}
		n++;
	}
	return null;
}
