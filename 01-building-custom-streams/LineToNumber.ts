import { Transform, type TransformCallback } from "node:stream";

/**
 * A custom Transform that reads `Buffer` chunks of newline-delimited text and
 * emits the parsed numbers (objectMode on the readable side). Lines can span
 * chunk boundaries, so a trailing partial line is held in `#prev` until the next
 * chunk arrives.
 *
 * This is the original, parse-based version. The second post replaces it with a
 * zero-allocation accumulator — see `02-profiling-and-writev/LineToNumber.ts`.
 */
export class LineToNumber extends Transform {
	#prev: Buffer | undefined;

	constructor() {
		super({ readableObjectMode: true });
	}

	_transform(chunk: Buffer, _encoding: string, callback: TransformCallback) {
		let j = 0;
		for (let i = 0; i < chunk.length; i++) {
			// Scan until a newline byte is found (0x0A = \n).
			if (chunk[i] === 10) {
				const slice = Buffer.copyBytesFrom(chunk, j, i);

				// Stitch an incomplete line carried over from the previous chunk.
				if (this.#prev) {
					this.push(
						parseInt(this.#prev.toString("utf8") + slice.toString("utf8"), 10),
					);
					this.#prev = undefined;
				} else {
					this.push(parseInt(slice.toString("utf8"), 10));
				}

				j = i + 1;
			}
		}

		// Store the incomplete trailing line for the next chunk (as a copy, so we
		// don't pin the whole original chunk in memory).
		if (j !== chunk.length) {
			this.#prev = Buffer.copyBytesFrom(chunk, j);
		}

		callback(null);
	}

	_flush(callback: TransformCallback) {
		// Handle a final line with no trailing newline.
		if (this.#prev) {
			this.push(parseInt(this.#prev.toString("utf8"), 10));
			this.#prev = undefined;
		}
		callback(null);
	}
}
