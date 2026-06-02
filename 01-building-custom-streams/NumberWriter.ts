import { createWriteStream, mkdir, type WriteStream } from "node:fs";
import { join } from "node:path";
import { Writable } from "node:stream";

type Callback = (error?: Error | null) => void;

export interface NumberWriterOptions {
	outputDir?: string;
	maxFileSize?: number;
}

const minFileSize = Buffer.from(`${Number.MAX_SAFE_INTEGER}\n`, "utf8").length;

/**
 * A custom Writable that accepts JavaScript numbers and writes them, one per
 * line, into size-limited output files. When the current file would exceed
 * `maxFileSize`, it rotates to the next one (`0000000000.txt`, `0000000001.txt`,
 * ...). Backpressure is honored by threading the write callback through to the
 * underlying file stream.
 */
export class NumberWriter extends Writable {
	#currentFileIndex = 0;
	#currentStream!: WriteStream;
	#outputDir: string;
	#maxFileSize: number;

	constructor(options: NumberWriterOptions = {}) {
		// objectMode so `_write` receives numbers rather than Buffers/strings.
		super({ objectMode: true });

		if (options.outputDir && typeof options.outputDir !== "string") {
			throw new TypeError("`outputDir` option should be a string");
		}

		this.#outputDir = options.outputDir || "";

		if (options.maxFileSize && typeof options.maxFileSize !== "number") {
			throw new TypeError("`maxFileSize` option should be a number");
		}

		if (options.maxFileSize && options.maxFileSize < minFileSize) {
			throw new TypeError(
				`\`maxFileSize\` option should be greater than or equal to the minimum file size of ${minFileSize} bytes`,
			);
		}

		this.#maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // Default: 50MB
	}

	_construct(callback: Callback): void {
		if (this.#outputDir) {
			mkdir(this.#outputDir, { recursive: true }, (err) => {
				if (err) return callback(err);

				this.#openNextFile(callback);
			});
		} else {
			this.#openNextFile(callback);
		}
	}

	#openNextFile(callback: Callback): void {
		try {
			const filename = `${this.#currentFileIndex++}.txt`.padStart(10, "0");
			this.#currentStream = createWriteStream(join(this.#outputDir, filename));

			this.#currentStream.on("error", (err) => {
				this.destroy(err);
			});

			this.#currentStream.once("ready", callback);
		} catch (error) {
			callback(error as Error);
		}
	}

	_write(number: unknown, _encoding: unknown, callback: Callback): void {
		if (typeof number !== "number" || !Number.isFinite(number)) {
			return callback(
				new Error(
					`Unexpected chunk type ${typeof number}. Only pass literal JavaScript numbers, \`stream.write(123456);\``,
				),
			);
		}

		const line = number.toString() + "\n";
		const buffer = Buffer.from(line, "utf8");
		const byteSize = buffer.length;

		if (this.#currentStream.bytesWritten + byteSize > this.#maxFileSize) {
			this.#currentStream.end(() => {
				this.#currentStream.removeAllListeners();
				this.#openNextFile((error) => {
					if (error) return callback(error);

					this.#currentStream.write(buffer, callback);
				});
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
