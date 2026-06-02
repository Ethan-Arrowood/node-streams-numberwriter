# Building Custom Node.js Streams

Code from **[Building Custom Node.js Streams: Splitting a 1GB File Without Running Out of Memory](https://ethanarrowood.com/blog/building-custom-nodejs-streams-for-large-files)**.

## Files

| File | What it is |
| --- | --- |
| `isPrime.ts` | A naive primality test. |
| `primeGenerator.ts` | A generator that yields primes by `count` or `limit`. |
| `NumberWriter.ts` | A custom `Writable` that writes numbers to size-limited, rotating files. |
| `LineToNumber.ts` | A custom `Transform` that parses newline-delimited numbers out of `Buffer` chunks. |
| `generate-primes.ts` | Writes a prime-number file using `primeGenerator`. |
| `split-file.ts` | Splits an existing file with `LineToNumber` → `NumberWriter`. |
| `read-primes.ts` | The "read it all into memory" approach, for contrast. |

## Try it

Generate a file of every prime below 1,000,000:

```
node generate-primes.ts primes.txt --limit 1000000
```

Split it into ~100KB files under `out/`:

```
node split-file.ts primes.txt out 102400
```

Or skip generating and use the sample that ships with the repo:

```
node split-file.ts ../data/primes-sample.txt out 102400
```

> Requires Node 24+ to run the `.ts` files directly (or `--experimental-strip-types` on Node 22–23).
