var SerialPort = require('serialport'),
    portname = '/dev/cu.usbmodem14201';
var sp = new SerialPort.SerialPort({path : portname, baudRate : 9600}),
    potVal = 0;

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

function SerialInputListener() {
    console.log(receiveData);
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
    console.log('Serial Port OPEN');

    sp.on('data', function(data) {
        dataParsing(data);
    });

    setTimeout(function() {
        sp.write("2222 VAL OFF|");
        console.log("write");
    }, 5000);
});