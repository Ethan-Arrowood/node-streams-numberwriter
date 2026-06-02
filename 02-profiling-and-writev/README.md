# Profiling Node.js Streams

Code from **[Profiling Node.js Streams: GC Traces, Flame Graphs, and `_writev`](https://ethanarrowood.com/blog/profiling-nodejs-streams-gc-traces-flame-graphs-and-writev)**.

## Files

| File | What it is |
| --- | --- |
| `LineToNumber.ts` | The optimized, zero-allocation accumulator transform. |
| `NumberWriter.ts` | The `_writev` writer that batches file writes internally. |
| `NumberWriterSingle.ts` | The original one-write-per-number writer, kept as the baseline. |
| `profile.ts` | Times the pipeline with `performance.now()`; pairs with `--trace-gc`. |
| `summarize-gc.mjs` | Reads `--trace-gc` output and reports collections, time-in-GC, and wall time. |
| `flame-target.ts` | The pipeline to point a CPU profiler at (`single` or `writev`). |
| `bench.ts` | Reproduces the "does raising `highWaterMark` help?" comparison. |

## Make a slice to profile

The post profiles a 10M-line slice. Generate one with the first post's script (this is slow — the generator is naive):

```
node ../01-building-custom-streams/generate-primes.ts big.txt --count 10000000
```

Or just use the bundled `../data/primes-sample.txt` for a quick (smaller) run.

## Measure GC

```
node --trace-gc profile.ts big.txt | node summarize-gc.mjs
```

You'll see thousands of collections costing a low single-digit percentage of the
runtime — the GC "thrashing" that turned out not to be the problem.

## Flame graph

```
npx @platformatic/flame run flame-target.ts big.txt single   # slow: one write per number
npx @platformatic/flame run flame-target.ts big.txt writev   # fast: batched via _writev
```

Each run writes an interactive `.html` flamegraph and a `.md` hotspot report. In
the `single` run the whole graph is one tower of file-write machinery; in the
`writev` run that tower is gone and your own code dominates.

## highWaterMark vs `_writev`

```
node bench.ts big.txt
```

Raising the single-number writer's `highWaterMark` does nothing; `_writev` is
what actually batches the writes.

> Requires Node 24+ to run the `.ts` files directly (or `--experimental-strip-types` on Node 22–23).
