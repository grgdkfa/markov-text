
const NODE_SIZE = 3;
const PROB_MAX = 1024 * 1024;

class Queue {
	constructor(size) {
		this.que = new Array(size || 1024);
		this.begin = 0;
		this.end = 0;
		this.length = 0;
	}

	expand() {
		const que = new Array(this.que.length * 2);
		let k = 0;
		let i = this.begin;
		while(k < this.que.length) {
			que[k] = this.que[i];
			k++;
			i++;
			if(i == this.que.length)
				i = 0;
		}
		this.que = que;
		this.begin = 0;
		this.end = k;
	}

	push(thing) {
		if(this.length == this.que.length) {
			//console.log(`Expanding from ${this.length} to ${this.length * 2}`);
			this.expand();
		}
		this.length++;
		this.que[this.end] = thing;
		this.end++;
		if(this.end == this.que.length) {
			this.end = 0;
		}
	}

	shift() {
		this.length--;
		const result = this.que[this.begin];
		this.begin++;
		if(this.begin == this.que.length) {
			this.begin = 0;
		}
		return result;
	}
}

function nodeStats(map) {
	let count = 0;
	let size = 0;
	const alphabet = {};
	let charNumber = 1;
	const traverse = (node) => {
		count ++;
		if(node.c) {
			for(let c in node.c) {
				traverse(node.c[c]);
			}
		}
		for(let i in node.p) {
			if(!alphabet[node.p[i].c]) {
				alphabet[node.p[i].c] = charNumber;
				charNumber ++;
			}
		}
		size += 1;
		size += node.p.length * 3;
	}
	traverse(map);
	return {
		count: count,
		size: size,
		alphabet: alphabet
	};
}

function mapOffsets(map, size) {
	const queue = new Queue();
	let offset = 0;
	let maxSize = 0;
	const offsets = new Array(size);

	const addNode = (node) => {
		offset += 1;
		offset += node.p.length * NODE_SIZE;
	}

	let offsetCounter = 0;
	queue.push(map);
	while(queue.length) {
		if(queue.length > maxSize) {
			maxSize = queue.length;
		}
		const node = queue.shift();
		//node.offset = offset;
		offsets[offsetCounter] = offset;
		offsetCounter++;
		addNode(node);
		if(node.c) {
			for(let i in node.p) {
				const c = node.p[i].c;
				queue.push(node.c[c]);
			}
		}
	}
	console.log(`Max que length ${maxSize}, size ${size}, offsetCounter ${offsetCounter}`);
	return offsets;
}

function makeIt(map, offsets, size) {
	// [char, prob, pointer]
	const data = new Uint32Array(size + 2);
	const queue = new Queue();
	let offset = 0;

	const addNode = (node) => {
		nextOffset += 1;
		nextOffset += node.p.length * NODE_SIZE;
	}

	queue.push(map);

	let offsetCounter = 1; // yes, one
	while(queue.length) {
		const node = queue.shift();
		data[offset] = node.p.length;
		offset ++;
		for(let i in node.p) {
			const c = node.p[i].c;
			const char = c.codePointAt(0);
			const prob = node.p[i].v * PROB_MAX | 0;
			const pointer = node.c ? offsets[offsetCounter] : 0;
			node.c && offsetCounter++;
			data[offset] = char;
			offset++;
			data[offset] = prob;
			offset++;
			data[offset] = pointer;
			offset++;

			if(node.c) {
				queue.push(node.c[c]);
			}
		}
	}

	data[data.length - 1] = 1; // version
	data[data.length - 2] = map.order; // order

	console.log(`Offset: ${offset}, size: ${size}, offsetCounter: ${offsetCounter}`);

	return data;
}

function buildTree(map) {
	console.time("Stats");
	const stats = nodeStats(map);
	console.timeEnd("Stats");
	console.log(`Nodes: ${stats.count}, total: ${Object.keys(stats.alphabet).length}, elements: ${stats.size}`);

	console.time("Offsets");
	const offsets = mapOffsets(map, stats.count);
	console.timeEnd("Offsets");
	console.log(`Offsets completed`);

	console.time("Buffer");
	const data = makeIt(map, offsets, stats.size);
	console.timeEnd("Buffer");
	console.log(`Buffer completed`);

	return data;
}

module.exports = buildTree;