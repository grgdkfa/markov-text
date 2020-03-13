
const BinaryGenerator = require('./src/generator.js');

const http = require('http');
const cla = require('command-line-args');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs-extra');

const options = new cla([
	{ name: 'input', alias: 'i', type: String, multiple: true },
    { name: 'port', alias: 'p', type: Number }
]);

const generators = {
    list: {},
    default: null
};

if(options.input) {
    Promise.all(options.input.map(loadFile)).then(() => {
        console.log(`Loaded files ${options.input.join(', ')}`);
        run();
    });
} else {
    run();
}

function run() {
    const port = options.port || 9003;
    http.createServer(serverFunction).listen(options.port || 9003);
    console.log(`Server started on port ${port}`);
}

function serverFunction(request, response){
    const url = request.url.split('?');
    let params = {};
    if(url.length) {
        params = querystring.parse(url[1]);
    }

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Headers', '*');
    if ( request.method === 'OPTIONS' ) {
        response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        response.writeHead(200);
        response.end();
        return;
    }

    if(request.url == "/") {
        request.url = "/index.html";
    }

    if(fs.existsSync(path.join("frontend", request.url))) {
        fs.readFile(path.join("frontend", request.url)).then(file => {
            response.writeHead(200);
            response.end(file);
        }).catch(error => {
            response.writeHead(404);
            response.end(JSON.stringify(error));
        });
        return;
    }

    switch(params.action) {
        case 'generate':
            const generateResult = generate(params);
            if(params.raw) {
                response.writeHead(200, {'Content-type':'text/plain; charset=utf-8'});
                response.write(generateResult);
                response.end();
            } else {
                writeJSON(response, {
                    status: 'ok',
                    text: generateResult
                });
            }
        break;

        case 'stats':
            writeJSON(response, {
                status: 'ok',
                stats: stats()
            });
        break;

        case 'load':
            const loadResult = {
                status: 'ok',
                stats: stats()
            };
            if(params.file) {
                loadFile(params.file).then(result => {
                    loadResult.status = result ? 'ok' : 'fail';
                    writeJSON(response, loadResult);
                }).catch(err => {
                    loadResult.status = 'fail';
                    writeJSON(response, loadResult);
                });
            } else {
                loadResult.status = 'fail';
                writeJSON(response, loadResult);
            }
        break;

        case 'unload':
            if(!params.file) {

            }

        default:
            writeJSON(response, { status: 'ok' });
    }
}

function writeJSON(response, data) {
    response.writeHead(200, {'Content-type':'text/plain; charset=utf-8'});
    response.write(JSON.stringify(data));
    response.end();
}

function generate(params) {
    params.length = parseInt(params.length) || 500;
    params.file = params.file || generators.default;
    params.temperature = parseFloat(params.temperature) || 1;
    if(!params.file) {
        return Promise.resolve(false);
    }
    const generator = generators.list[params.file];
    generator.setRandomParameters(params);
    const text = generator.generate(params.length, params.history, params.order);
    return text;
}

function stats() {
    const result = [];
    for(let i in generators.list) {
        result.push({
            name: i,
            order: generators.list[i].order,
            default: i === generators.default
        });
    }
    return result;
}

function loadFile(name) {
    const ext = path.extname(name);
    if(ext != '.ngram') {
        return Promise.resolve(false);
    }
    const key = path.basename(name, ext);
    if(generators[key]) {
        return Promise.resolve(true);
    }
    return fs.readFile(name).then(buffer => {
        try {
            const generator = new BinaryGenerator({
                buffer: buffer
            });
            generators.list[key] = generator;
            if(!generators.default) {
                generators.default = key;
            }
            return true;
        } catch(e) {
            console.log(e);
            return false;
        }
    });
}

function unload(name) {
    if(!generators.list[name]) {
        return Promise.resolve(true);
    }
    delete generators.list[name];
    if(generators.default == name) {
        const names = Object.keys(generators.list);
        if(names.length) {
            generators.default = names[0];
        } else {
            generators.default = null;
        }
    }
    return Promise.resolve(true);
}
