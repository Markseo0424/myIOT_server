const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

function onRequest(req, res) {
    console.log("User requests " + req.url);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.write('Hello World!\n');
    res.end();
}

function onListen() {
    console.log('Server running at http://$(hostname):${port}/');
}

const server = http.createServer(onRequest);
server.listen(port, hostname, onListen);

/*
const server = http.createServer((req,res) => {
    console.log("User requests " + req.url);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.write('Hello World!\n');
    res.end();
});

server.listen(port, hostname, () => {
    console.log('Server running at http://$(hostname):${port}/');
});
*/