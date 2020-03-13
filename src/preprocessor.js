
const fs = require('fs-extra');

const NODE_SIZE = 3;
const PROB_MAX = 1024 * 1024;
const PROB_OFFSET = 1;
const POINTER_OFFSET = 2;

function toString(shingle) {
    return shingle.map(x => String.fromCodePoint(x)).join("");
}

class BinaryPreprocessor {
    constructor(order) {
        this.order = order || 6
        this.reset();
    }

    reset() {
        this.data = new Uint32Array(4096);
        this.length = 0;
    }

    expand(size) {
        const data = new Uint32Array(size || (this.data.length * 2));
        data.set(this.data);
        this.data = data;
    }

    reserve(size) {
        if(this.length + size > this.data.length) {
            this.expand();
        }
    }

    increaseLength(amount) {
        this.length += amount;
        if(this.length > this.data.length) {
            this.expand();
        }
    }

    find(start, char) {
        const length = this.data[start];
        start++;
        for(let i=0; i<length; i++) {
            if(this.data[start + i * NODE_SIZE] == char) {
                return start + i * NODE_SIZE;
            }
        }
        return -1;
    }

    mapToProbs(data) {
        const ngrams = Object.keys(data);
        const result = new Array(ngrams.length);
        let sum = 0;
        for(let i=0; i<ngrams.length; i++) {
            result[i] = {
                c: ngrams[i],
                v: data[ngrams[i]]
            };
            sum += data[ngrams[i]];
        }

        result.sort((a, b) => b.v - a.v);

        let integral = 0;
        for(let i=0; i<result.length; i++) {
            integral += result[i].v;
            result[i].v = integral / sum;
        }

        return result;
    }

    /**
     * Finds leaf node of a trie for the ngram
     * @param {String} ngram - ngram to traverse the trie
     * @returns {Number} pointer to LAST CHAR IN SHINGLE
     */
    walk(ngram) {
        let offset = 0;
        for(let i=0; i<ngram.length - 1; i++) {
            offset = this.find(offset, ngram.codePointAt(i));
            if(offset < 0) {
                throw new Error(`Error inserting array for "${ngram}" (${ngram.length}) at position ${i}: no char (1)`);
            }
            offset = this.data[offset + POINTER_OFFSET];
            if(i < ngram.length - 1 && offset == 0) {
                throw new Error(`Error inserting array for "${ngram}" (${ngram.length}) at position ${i}: no next layer`);
            }
        }
        offset = this.find(offset, ngram.codePointAt(ngram.length - 1));
        if(offset < 0) {
            throw new Error(`Error inserting array for "${ngram}" (${ngram.length}) at position ${ngram.length - 1}: no char (2)`);
        }
        return offset;
    }

    insertArray(map) {
        const probs = this.mapToProbs(map);

        this.reserve(probs.length * NODE_SIZE + 1);

        const data = this.data;
        let length = this.length;

        data[length] = probs.length;
        length++;

        for(let i=0; i<probs.length; i++) {
            data[length] = probs[i].c.codePointAt(0);
            length++;

            data[length] = probs[i].v * PROB_MAX | 0;
            length++;

            data[length] = 0;
            length++;
        }

        this.length = length;
    }

    processLayer(text, order) {
        const map = {}; // temporary map
        order = order - 1;
        for(let i=0; i<text.length - order; i++) {
            const ngram = text.substr(i, order);
            const char = text.charAt(i + order);
            map[ngram] = map[ngram] || {};
			map[ngram][char] = map[ngram][char] || 0;
			map[ngram][char]++;
        }

        console.log(`Ngrams on layer: ${Object.keys(map).length}`);

        // insert into array
        for(let ngram in map) {
            let offset = this.walk(ngram);
            this.data[offset + POINTER_OFFSET] = this.length;
            this.insertArray(map[ngram]);
        }
    }

    processFirst(text) {
        console.log(`Processing first layer`);
        const map = {}; // temporary map
        for(let i=0; i<text.length; i++) {
            const char = text.charAt(i);
			map[char] = map[char] || 0;
			map[char]++;

        }
        console.log(`Ngrams on layer: ${Object.keys(map).length}`);

        this.insertArray(map);
    }

    processText(text) {
        console.time("Layers");

        console.time("First layer");
        this.processFirst(text);
        console.timeEnd("First layer");

        for(let i=2; i<=this.order; i++) {
            console.log(`Processing layer ${i}`);
            console.time(`Layer ${i}`);
            this.processLayer(text, i);
            console.timeEnd(`Layer ${i}`);
        }
        console.timeEnd("Layers");
        this.reserve(2);
        this.data[this.length] = this.order;
        this.length++;
        this.data[this.length] = 1;
        this.length++;
        console.log(`Done. Total length ${this.length}`);
    }

    getData() {
        return this.data.slice(0, this.length);
    }
}

module.exports = BinaryPreprocessor;