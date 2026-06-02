import { Transform, type TransformCallback } from "node:stream";

/**
 * The optimized parse transform. Instead of slicing each line into a Buffer,
 * decoding it to a string, and calling `parseInt`, it folds ASCII digits into an
 * accumulator as it scans the bytes. There is zero per-line heap allocation: the
 * accumulator is a local number, and a small-integer result is stored inline as
 * an SMI rather than on the heap.
 *
 * Because the accumulator is just a number, a half-parsed value carries across a
 * chunk boundary for free — no `#prev` Buffer needed.
 */
export class LineToNumber extends Transform {
	#acc = 0;
	#inNumber = false;

	constructor() {
		super({ readableObjectMode: true });
	}

	_transform(chunk: Buffer, _encoding: string, callback: TransformCallback) {
		let acc = this.#acc;
		let inNumber = this.#inNumber;

		for (let i = 0; i < chunk.length; i++) {
			const byte = chunk[i];
			if (byte === 10) {
				// newline: the accumulator is the number
				if (inNumber) {
					this.push(acc);
					acc = 0;
					inNumber = false;
				}
			} else {
				// ASCII digit: fold it in (48 is the code for '0')
				acc = acc * 10 + (byte - 48);
				inNumber = true;
			}
		}

		this.#acc = acc;
		this.#inNumber = inNumber;
		callback(null);
	}

	_flush(callback: TransformCallback) {
		// a final line with no trailing newline
		if (this.#inNumber) {
			this.push(this.#acc);
			this.#inNumber = false;
		}
		callback(null);
	}
}
