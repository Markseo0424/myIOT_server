var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var app = express();
var fs = require('fs');
var usersFileName = "users.json";

app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

function findUser(data, userId) {
    var users = data.users;
    for(var i = 0; i < users.length; i++) {
        if(users[i].id == userId) return i;
    }
    return -1;
}

function register(req, res, next, fileData){
    console.log('\n[register] ');
    var approve = {'result' : 'NO'};

    var userId = req.body.data.id;
    var userPassword = req.body.data.password;
    var userName = req.body.data.name;
    var userAge = req.body.data.age;
    
    console.log('id : ' + userId + ' pw : ' + userPassword + ' name : ' + userName + ' age : ' + userAge);

    if(findUser(fileData, userId) != -1) {
        res.send(approve);
        console.log('register failed. id already exists.');
        return;
    }

    fileData.users.push({
        id : userId,
        password : userPassword,
        name : userName,
        age : userAge
    });

    console.log(fileData);
    fs.writeFileSync(usersFileName, JSON.stringify(fileData));

    console.log('Successfully registered.');
    approve.result = 'OK';
    res.send(approve);
}

function login(req, res, next, fileData) {
    var approve = {'approve_id':'NO','approve_pw':'NO'};

    var paramId = req.body.data.id;
    var paramPassword = req.body.data.password;

    console.log('id : ' + paramId + ' pw : ' + paramPassword);

    var userIndex = findUser(fileData, paramId);
    if(userIndex == -1) {
        res.send(approve);
        console.log('login failed');
        return;
    }

    approve.approve_id = 'OK';
    if(fileData.users[userIndex].password == paramPassword) {
        approve.approve_pw = 'OK';
        console.log('login successful');
        res.send(approve);
    }
    else {
        console.log('login failed');
        res.send(approve);
    }
}

app.use(function(req,res, next) {
    console.log('first Middleware called.');
    console.log(req.body);
    var dataBuffer = fs.readFileSync(usersFileName);
    var dataJSON = dataBuffer.toString();
    var fileData = JSON.parse(dataJSON);
    console.log(fileData);

    switch(req.body.requestId) {
        case 0 : register(req,res,next,fileData);
                break;
        case 1 : login(req,res,next,fileData);
                break;
    }

});

var server = http.createServer(app).listen(app.get('port'), function() {
    console.log("web server has been executed by express : " + app.get('port'));
});