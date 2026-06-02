import { pipeline } from "node:stream/promises";
import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";
import { LineToNumber } from "./LineToNumber.ts";
import { NumberWriter } from "./NumberWriter.ts";
import { NumberWriterSingle } from "./NumberWriterSingle.ts";

/**
 * The pipeline to point a CPU profiler at. Choose the writer so you can flame
 * both the slow "before" and the fast "after":
 *
 *   npx @platformatic/flame run flame-target.ts <input.txt> single   # one write per number (slow)
 *   npx @platformatic/flame run flame-target.ts <input.txt> writev   # batched via _writev (fast)
 *
 * `flame` writes an interactive `.html` flamegraph and a `.md` hotspot report on
 * exit. In the "before" run the whole graph is one tower of file-write
 * machinery; in the "after" run that tower is gone and your own code dominates.
 */
const input = process.argv[2];
const which = process.argv[3] ?? "writev";
const outputDir = "out";

await rm(outputDir, { recursive: true, force: true });

const writer =
	which === "single"
		? new NumberWriterSingle({ outputDir })
		: new NumberWriter({ outputDir, highWaterMark: 4096 });

await pipeline(createReadStream(input), new LineToNumber(), writer);
