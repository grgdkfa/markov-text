const BinaryGenerator = require('./src/generator.js');
const cla = require('command-line-args');
const path = require('path');
const fs = require('fs-extra');

const options = new cla([
	{ name: 'input', alias: 'i', type: String, defaultOption: true },
    { name: 'start', alias: 's', type: String, defaultValue: '' },
    { name: 'temperature', alias: 't', type: Number, defaultValue: 1 },
    { name: 'randomfunc', alias: 'f', type: String },
    { name: 'order', alias: 'r', type: Number },
    { name: 'length', alias: 'l', type: Number, defaultValue: 140 }
]);

if(!options.input) {
    console.log("Please specify the input file");
    process.exit(0);
}

function loadFile(name) {
    const ext = path.extname(name);
    if(ext != '.ngram') {
        return Promise.resolve(false);
    }
    return fs.readFile(name).then(buffer => {
        try {
            const generator = new BinaryGenerator({
                buffer: buffer
            });
            
            return generator;
        } catch(e) {
            console.log(e);
            return false;
        }
    });
}

loadFile(options.input).then(generator => {
    if(!generator) {
        throw `Error while loading file ${options.input}`;
    }

    generator.setRandomParameters({
        temperature: options.temperature,
        func: options.randomfunc
    });

    const result = generator.generate(options.length, options.start, options.order);
    console.log(result);
});
