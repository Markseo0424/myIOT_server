var SerialPort = require('serialport'),
    portname = 'COM10';
var sp = new SerialPort.SerialPort({path : portname, baudRate : 9600}),
    potVal = 0;

var debugging = true;

var buffer = new Array();

var receiveData = new Array();


function getStringFromBuffer() {
    var s = "";
    for(var i = 0; i < buffer.length; i++) {
        s += buffer[i];
    }
    buffer.splice(0,buffer.length);
    return s;
}

function dataParsing(data) {
    for(var i = 0; i < data.length; i++) {
        var c = data[i];

        if(c == 0x20) receiveData.push(getStringFromBuffer());
        else if(c == 0x0d) receiveData.push(getStringFromBuffer());
        else if(c == 0x0a) {
            SerialInputListener();
            receiveData.splice(0,receiveData.length);
        }
        else buffer.push(String.fromCharCode(c));
    }
}

sp.on('open', function() {
    sp.flush();
    console.log('Serial Port OPEN');
    var dataBuffer = fs.readFileSync(usersFileName);
    var dataJSON = dataBuffer.toString();
    var fileData = JSON.parse(dataJSON);
    setTimeout(function() {
        syncToFile(fileData)
        console.log("Synced with file");
    },3000);

    sp.on('data', function(data) {
        dataParsing(data);
    });
});

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var app = express();
var fs = require('fs');
var usersFileName = "modules.json";

app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

function sendResponse(resId, responseId, dat) {
    res = getRes(resId);
    if(res == null) {
        console.log("response Id : " + resId + " doesn't exist.");
        return;
    }
    var approve = {
        "responseId" : responseId, 
        "data" : dat
    };
    console.log("[SENT]");
    if(debugging) console.log(approve);
    res.send(approve);
    console.log("response Id : " + resId + " sent.");
    console.log("remain responses : " + Object.keys(responses).length);
}

var currentFileData;

function SerialInputListener() {
    var dataBuffer = fs.readFileSync(usersFileName);
    var dataJSON = dataBuffer.toString();
    var fileData = JSON.parse(dataJSON);
    currentFileData = fileData;
    if(debugging) console.log("[SERIAL]");
    if(debugging) console.log(receiveData);

    if(receiveData[0] == 'RESET') {
        console.log("======RESET=====");
        syncToFile(fileData);
        return;
    }

    if(receiveData.length == 6){
        switch(receiveData[2]) {
            case "NEW" :
                sendResponse(receiveData[0], "NEW", {
                    "id" : receiveData[1],
                    "result" : receiveData[3],
                    "type" : receiveData[4],
                    "val" : receiveData[5]
                });
                addModule(receiveData.slice(1,6), currentFileData);
                break;
            case "VAL" :
                sendResponse(receiveData[0], "VAL", {
                    "id" : receiveData[1],
                    "val" : receiveData[5]
                });
                //updateModules(receiveData.slice(1,6), currentFileData);
                break;
            case "SEARCH" :
                sendResponse(receiveData[0], "SEARCH", {
                    "id" : receiveData[1],
                    "result" : receiveData[3],
                    "type" : receiveData[4],
                    "val" : receiveData[5]
                });
                break;
            case "UPDATE" :
                updateModules(receiveData.slice(1,6), currentFileData);
                break;
        }
    }
}

function SerialSendData(resId, str) {
    sp.write(resId + "|" + str);
    if(debugging) console.log("[SERIAL SENT]");
    if(debugging) console.log(resId + "|" + str);
}

function searchModule(id, fileData){
    for(var i = 0; i < fileData.length; i++) {
        if(fileData[i].id == id) return i;
    }
    return -1;
}

function addModule(receiveData, fileData) {
    newId = receiveData[0]
    if(searchModule(newId,fileData) != -1) deleteModule(newId,fileData);
    fileData.push({
        "id" : newId,
        "type" : receiveData[3],
        "val" : receiveData[4]
    })
    fs.writeFileSync(usersFileName, JSON.stringify(fileData));
    console.log("[ADDED]");
    if(debugging) console.log(fileData);
}

function deleteModule(id, fileData) {
    var index  = searchModule(id,fileData);
    if(index == -1) return 0;
    fileData.splice(index,1);
    fs.writeFileSync(usersFileName, JSON.stringify(fileData));
    console.log("[DELETED]");
    if(debugging) console.log(fileData);
    return 1;
}

function updateModules(receiveData, fileData) {
    var index  = searchModule(receiveData[0],fileData);
    if(index == -1) return;
    fileData[index].val = receiveData[4];
    fs.writeFileSync(usersFileName, JSON.stringify(fileData));
    console.log("[UPDATED]");
    if(debugging) console.log(fileData);
}

function syncToFile(fileData) {
    for(var i = 0; i < fileData.length; i++){
        setTimeout(function(fileData, i) {
            if(fileData[i].type != "value") {
                SerialSendData("0", fileData[i].id + " SET " + fileData[i].val + ";");
            }
        }, i*2000, fileData, i);
    }
}

var responses = {};

function generateResponseId() {
    do {
        var id = Math.floor(Math.random()*100000);
    }
    while(id in Object.keys(responses));
    

    return "K" + id;
}

function setRes(id, res) {
    responses[id] = res;
}

function getRes(id) {
    if(!(id in responses)) return null;
    var res = responses[id];
    delete responses[id];
    return res;
}

app.use(function(req,res, next) {
    var today = new Date();
    console.log(today);
    console.log('[REQUEST]');
    var resId = generateResponseId();
    console.log("response Id : " + resId);
    setTimeout(function() {
        if(getRes(resId) == null) return;
        console.log("response Id : " + resId + " deleted.");
    },10000);
    setRes(resId, res);
    console.log('[RECEIVED]');
    console.log(req.body);
    var dataBuffer = fs.readFileSync(usersFileName);
    var dataJSON = dataBuffer.toString();
    var fileData = JSON.parse(dataJSON);
    currentFileData = fileData;

    if(debugging) console.log("[CURRENT]");
    if(debugging) console.log(fileData);

    switch(req.body.requestId) {
        case "VALID" :
            sendResponse(resId, "VALID", {result : "OK"});
            break;
        case "LIST" : 
            //syncToFile(fileData);
            sendResponse(resId,"LIST",fileData);
            break;
        case "NEW" : 
            var id = req.body.data.id;
            SerialSendData(resId, id + " NEW 0;");
            break;
        case "VAL" : 
            var id = req.body.data.id;
            var datas = [id, "VAL", "OK", "unknown", req.body.data.reqVal];
            updateModules(datas, currentFileData);
            SerialSendData(resId, id + " VAL " + req.body.data.reqVal + ";");
            break;
        case "DEL" : 
            var id = req.body.data.id;
            if(deleteModule(id,fileData)) sendResponse(resId, "DEL", {"id":id,"result":"OK"});
            else sendResponse(resId, "DEL", {"id":id,"result":"NO"});
            break;
        case "SEARCH" :
            var id = req.body.data.id;
            SerialSendData(resId, id + " SEARCH 0;");
            break;
    }

});

var server = http.createServer(app).listen(app.get('port'), function() {
    console.log("web server has been executed by express : " + app.get('port'));
});