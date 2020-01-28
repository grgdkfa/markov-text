
const NODE_SIZE = 3;
const PROB_MAX = 1024 * 1024;

class BinaryGenerator {
	constructor(params) {
		params = params || {};
		if(params.data) {
			this.loadData(params.data);
		}
		if(params.buffer) {
			this.loadFromBuffer(params.buffer);
		}
		this.setRandomParameters(params);
	}

	loadData(data) {
		if(data[data.length - 1] != 1) {
			throw new Error("File version mismatch");
		}
		this.order = data[data.length - 2];
		this.data = data;
	}

	loadFromBuffer(buffer) {
		const data = new Uint32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Uint32Array.BYTES_PER_ELEMENT);
		this.loadData(data);
	}

	setRandomParameters(params) {
		this.temperature = params.temperature || this.temperature || 1;
		switch(params.func) {
			case 'weighted':
				this.getRandom = this.getWeighted;
			break;

			case 'uniform':
				this.getRandom = this.getUniform;
			break;

			default:
				this.getRandom = this.getRandom || this.getWeighted;
			break;
		}
	}

	rnd() {
		return Math.pow(Math.random(), this.temperature);
	}

	getWeighted(start) {
		/*
			[char, prob, pointer]
		*/
		const t = this.rnd() * PROB_MAX | 0;
		const length = this.data[start];
		start++;
		for(let i=0; i<length; i++) {
			if(t < this.data[start + i * NODE_SIZE + 1]) {
				return this.data[start + i * NODE_SIZE];
			}
		}
		return this.data[start + (length - 1) * NODE_SIZE];
	}

	getUniform(start) {
		const t = this.rnd();
		const length = this.data[start];
		start++;
		return this.data[start + (length * t | 0) * NODE_SIZE];
	}

	getNgram() {
		const result = [];

		const traverse = (start) => {
			const length = this.data[start];
			const c = this.getRandom(start);
			result.push(c);

			for(let i=0; i<length; i++) {
				let offset = this.findChar(start, c);
				if(offset && this.data[offset + 2]) {
					traverse(this.data[offset + 2]);
					break;
				}
			}
		}

		traverse(0);
		return result;
	}

	findChar(start, char) {
		const length = this.data[start];
		start++;
		for(let i=0; i<length; i++) {
			if(this.data[start + i * NODE_SIZE] == char) {
				return start + i * NODE_SIZE;
			}
		}
		return false;
	}

	getNextChar(history) {
		if(!history) {
			return this.getRandom(0);
		}

		let start = 0;
		for(let i=0; i<history.length; i++) {
			const c = history[i];
			const offset = this.findChar(start, c);
			if(offset && this.data[offset + 2]) {
				start = this.data[offset + 2];
			} else {
				console.log(`No ngram for ${history.map(x => String.fromCodePoint(x)).join("")} (${history.length}) at ${i} :(`);
				return this.getNextChar(history.slice(1 - history.length));
			}
		}
		return this.getRandom(start);
	}

	isSpace(char) {
		const spaces = [32, 10, 9, 46, 44];
		return spaces.includes(char);
	}

	generate(length, history, order) {
		const historySize = history ? history.length : 0;
		length = length || 100;
		history = history || this.getNgram();
		order = order || this.order;
		if(order >= this.order) {
			order = order - 1;
		}

		let result = (typeof history == 'string') ? history.split("").map(x => x.charCodeAt(0)) : history;

		while(result.length < length + historySize) {
			let char = this.getNextChar(result.slice(-order));
			result.push(char);
		}

		if(result.length > length + historySize) {
			result = result.slice(0, length + historySize);
		}

		return result.map(x => String.fromCodePoint(x)).join("");
	}
}

module.exports = BinaryGenerator;