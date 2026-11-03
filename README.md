# Node.js Streams NumberWriter

Companion code for a two-part series on building and optimizing custom Node.js
streams. The running example: turning a ~1GB text file of prime numbers into
smaller, size-limited files without ever loading it all into memory — and then
making that pipeline fast.

## The posts

1. **[Building Custom Node.js Streams: Splitting a 1GB File Without Running Out of Memory](https://ethanarrowood.com/blog/building-custom-nodejs-streams-for-large-files)**
   Building a custom `Writable` (`NumberWriter`) and `Transform` (`LineToNumber`),
   wiring them together with `pipeline()`, and learning about backpressure, object
   mode, and file rotation along the way.

2. **[Profiling Node.js Streams: GC Traces, Flame Graphs, and `_writev`](https://ethanarrowood.com/blog/profiling-nodejs-streams-gc-traces-flame-graphs-and-writev)**
   Profiling that pipeline: reading `--trace-gc` output, discovering the GC
   "thrashing" was a red herring, using a flame graph to find the real bottleneck,
   and batching writes with `_writev`.

## Layout

- [`01-building-custom-streams/`](./01-building-custom-streams) — the streams and scripts from the first post.
- [`02-profiling-and-writev/`](./02-profiling-and-writev) — the optimized streams plus the profiling tooling from the second post.

Each folder has its own README with the specifics.

## Prerequisites

- **Node.js 24+**. The `.ts` files rely on Node's built-in type stripping, so you
  can run them directly with `node file.ts`. On Node 22–23, add
  `--experimental-strip-types`.
- No dependencies. The flame-graph step in the second post uses
  [`@platformatic/flame`](https://github.com/platformatic/flame) via `npx`.

## The prime data

The posts work with prime-number files ranging from a few hundred KB to ~1GB. The
large ones aren't committed (see [`.gitignore`](./.gitignore)) — regenerate any
size yourself:

```
node 01-building-custom-streams/generate-primes.ts data/primes.txt --limit 1000000
```

A small sample, [`data/primes-sample.txt`](./data/primes-sample.txt) (every prime
below 1,000,000), is included so the scripts run out of the box.
