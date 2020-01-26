const preprocess = require('./src/preprocessor.js');
const BinaryPreprocessor = require('./src/binary-preprocessor.js');
const builder = require('./src/tree-builder.js');

const fs = require('fs-extra');
const cla = require('command-line-args');

const options = new cla([
	{ name: 'input', alias: 'i', type: String, multiple: true, defaultOption: true },
	{ name: 'order', alias: 'r', type: Number, defaultValue: 6 },
    { name: 'output', alias: 'o', type: String, defaultValue: 'corpus-%order%.ngram' },
    { name: 'old', type: Boolean, defaultValue: false }
]);

if(!options.input || !options.output) {
    console.log(`Provide input and output files:\nnode preprocess.js data/corpus.txt -o corpus-%order%.ngram -r 5`);
}

options.output = options.output.replace(/%order%/g, options.order);

if(options.old) {
    preprocess.createMapFromFiles(options.input, options.order).then(map => {
        console.log("Map created");
        if(options.output.match(/\.json$/i)) {
            fs.writeJSON(options.output, map).then(() => {
                console.log(`Exported ${options.output}`);
            });
        } else {
            if(!options.output.match(/\.ngram$/)) {
                options.output += ".ngram";
            }
            const tree = builder(map);
            const buffer = Buffer.from(tree.buffer);
            fs.writeFile(options.output, buffer).then(() => {
                console.log(`Exported ${options.output}`);
            });
        }
    });
} else {
    if(typeof options.input == 'string') {
		options.input = [options.input];
	}
    Promise.all(options.input.map(file => fs.readFile(file))).then(files => {
        const text = files.map(x => x.toString()).join("\n");
        const preprocessor = new BinaryPreprocessor(options.order);
        preprocessor.processText(text);
        const buffer = preprocessor.getData();
        if(!options.output.match(/\.ngram$/)) {
            options.output += ".ngram";
        }
        fs.writeFile(options.output, Buffer.from(buffer.buffer)).then(() => {
            console.log(`Exported ${options.output}`);
        });
    });
}