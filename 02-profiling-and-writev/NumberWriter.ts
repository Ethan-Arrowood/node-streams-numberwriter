import { createWriteStream, mkdir, type WriteStream } from "node:fs";
import { join } from "node:path";
import { Writable } from "node:stream";

type Callback = (error?: Error | null) => void;

export interface NumberWriterOptions {
	outputDir?: string;
	maxFileSize?: number;
	highWaterMark?: number;
}

/**
 * The `_writev` version of `NumberWriter`. It still accepts ONE number at a time
 * on its public interface, so a producer like `primeGenerator` can pipe straight
 * in — but it batches the actual file writes internally.
 *
 * When numbers queue up while a file write is in flight (which is exactly when
 * the writer is busy), Node hands the whole queued batch to `_writev` instead of
 * replaying them one at a time through `_write`. Both delegate to `#writeFrom`,
 * which coalesces a batch into a single buffer and rotates files as needed.
 *
 * The effective batch size is governed by `highWaterMark` (counted in objects in
 * object mode). Raising it raises the batch size — but only because `_writev`
 * drains the queue in bulk. Without `_writev`, a larger `highWaterMark` does
 * nothing (see `bench.ts`).
 */
export class NumberWriter extends Writable {
	#currentFileIndex = 0;
	#currentStream!: WriteStream;
	#outputDir: string;
	#maxFileSize: number;

	constructor(options: NumberWriterOptions = {}) {
		super({ objectMode: true, highWaterMark: options.highWaterMark ?? 4096 });
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
		this.#writeFrom([{ chunk: number }], 0, callback);
	}

	_writev(chunks: Array<{ chunk: unknown }>, callback: Callback): void {
		this.#writeFrom(chunks, 0, callback);
	}

	#writeFrom(
		chunks: Array<{ chunk: unknown }>,
		start: number,
		callback: Callback,
	): void {
		let line = "";
		let bytes = 0;
		let i = start;

		for (; i < chunks.length; i++) {
			const n = chunks[i].chunk;
			if (typeof n !== "number" || !Number.isFinite(n)) {
				return callback(new Error(`Unexpected chunk type ${typeof n}`));
			}
			const piece = n.toString() + "\n";
			const pieceBytes = Buffer.byteLength(piece);

			// If this number would overflow the current file, stop and rotate first.
			if (
				bytes > 0 &&
				this.#currentStream.bytesWritten + bytes + pieceBytes > this.#maxFileSize
			) {
				break;
			}
			line += piece;
			bytes += pieceBytes;
		}

		const remaining = i < chunks.length;
		this.#currentStream.write(Buffer.from(line, "utf8"), (err) => {
			if (err) return callback(err as Error);
			if (!remaining) return callback(null);

			// Rotate, then continue with the overflow that didn't fit.
			this.#currentStream.end(() => {
				this.#currentStream.removeAllListeners();
				this.#openNextFile((e) =>
					e ? callback(e) : this.#writeFrom(chunks, i, callback),
				);
			});
		});
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
