import { createWriteStream, mkdir, type WriteStream } from "node:fs";
import { join } from "node:path";
import { Writable } from "node:stream";

type Callback = (error?: Error | null) => void;

export interface NumberWriterSingleOptions {
	outputDir?: string;
	maxFileSize?: number;
	highWaterMark?: number;
}

/**
 * The original one-write-per-number writer (same as the first post's
 * `NumberWriter`), exposed here as the baseline for `bench.ts` and the "before"
 * flame graph. A `highWaterMark` option is added so the benchmark can show that
 * raising it alone — without `_writev` — does nothing.
 *
 * Note: a large `highWaterMark` combined with file rotation can deadlock this
 * writer (a queue-size-dependent backpressure edge case). `bench.ts` sidesteps
 * it by using a `maxFileSize` large enough that no rotation happens.
 */
export class NumberWriterSingle extends Writable {
	#currentFileIndex = 0;
	#currentStream!: WriteStream;
	#outputDir: string;
	#maxFileSize: number;

	constructor(options: NumberWriterSingleOptions = {}) {
		super(
			options.highWaterMark
				? { objectMode: true, highWaterMark: options.highWaterMark }
				: { objectMode: true },
		);
		this.#outputDir = options.outputDir || "";
		this.#maxFileSize = options.maxFileSize || 50 * 1024 * 1024;
	}

	_construct(callback: Callback): void {
		if (this.#outputDir) {
			mkdir(this.#outputDir, { recursive: true }, (err) =>
				err ? callback(err) : this.#openNextFile(callback),
			);
		} else {
			this.#openNextFile(callback);
		}
	}

	#openNextFile(callback: Callback): void {
		try {
			const filename = `${this.#currentFileIndex++}.txt`.padStart(10, "0");
			this.#currentStream = createWriteStream(join(this.#outputDir, filename));
			this.#currentStream.on("error", (err) => this.destroy(err));
			this.#currentStream.once("ready", callback);
		} catch (error) {
			callback(error as Error);
		}
	}

	_write(number: unknown, _encoding: unknown, callback: Callback): void {
		if (typeof number !== "number" || !Number.isFinite(number)) {
			return callback(new Error(`Unexpected chunk type ${typeof number}`));
		}

		const buffer = Buffer.from(number.toString() + "\n", "utf8");

		if (this.#currentStream.bytesWritten + buffer.length > this.#maxFileSize) {
			this.#currentStream.end(() => {
				this.#currentStream.removeAllListeners();
				this.#openNextFile((error) =>
					error ? callback(error) : this.#currentStream.write(buffer, callback),
				);
			});
		} else {
			this.#currentStream.write(buffer, callback);
		}
	}

	_destroy(error: Error | null, callback: Callback): void {
		if (this.#currentStream) {
			this.#currentStream.end(() => {
				this.#currentStream.removeAllListeners();
				callback(error);
			});
		} else {
			callback(error);
		}
	}

	_final(callback: Callback): void {
		if (this.#currentStream) {
			this.#currentStream.end(() => {
				this.#currentStream.removeAllListeners();
				callback(null);
			});
		} else {
			callback(null);
		}
	}
}
