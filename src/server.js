var express = require('express');
var fs = require('fs');
var https = require('https');
var mongoose = require('mongoose');
var qs = require('querystring');
var request = require('request');

var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '56b5da733bb16fb8a5b9';
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ||
    '58b3e51c22f6233d5b99f78a5ed398d512a4cd1c';

var userSchema = new mongoose.Schema({
    githubId: { type: Number, index: { unique: true}},
    githubTokens: { type: [String] },
    fileList: { type: String },
    preferences: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

var User = mongoose.model('User', userSchema);

var app = express();

app.configure(function () {
    app.use(express.bodyParser());
});

app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PATCH');
    res.header('Access-Control-Allow-Headers', 'Authorization');
    next();
});

mongoose.connect('mongodb://localhost/marc');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    app.get('/authenticate/:code', function (req, res) {
        // console.log('authenticating code: ' + req.params.code);
        request.post({
            url: 'https://github.com/login/oauth/access_token',
            form: {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: req.params.code
            }
        }, function (error, response, body) {
            var token = qs.parse(body).access_token;
            var result = error || { token: token };
            // console.log(result);
            res.json(result);
            request({
                url: 'https://api.github.com/user',
                headers: {
                    'Authorization': 'token ' + token
                }
            }, function (error, response, body) {
                var user = JSON.parse(body);
                // console.log(user);
                User.findOneAndUpdate({ githubId: user.id },
                    { $addToSet: { githubTokens: token } },
                    { upsert: true },
                    function (err, user) {
                        // console.log(err, user);
                    });
            });
        });
    });

    app.get('/user', function (req, res) {
        var authorization = req.get('Authorization');
        if (!authorization) return res.send(401);
        var token = authorization.split(' ')[1];
        User.findOne({ githubTokens: token }, 'fileList preferences updatedAt',
            { lean: true }, function (err, user) {
                user ? res.json(user) : res.send(401);
            });
    });

    app.patch('/user', function (req, res) {
        var authorization = req.get('Authorization');
        if (!authorization) return res.send(401);
        var token = authorization.split(' ')[1];
        var update = {};
        if (req.body.fileList || req.body.preferences) {
            update.updatedAt = Date.now();
            if (req.body.fileList) {
                update.fileList = req.body.fileList;
            }
            if (req.body.preferences) {
                update.preferences = req.body.preferences;
            }
        }
        User
            .findOneAndUpdate({ githubTokens: token }, update)
            .select('updatedAt')
            .exec(function (err, user) {
                user ? res.send(200, user) : res.send(401);
            })
    });
});

try {
    var options = {
        cert: fs.readFileSync('/etc/ssl/beng.me.crt'),
        key: fs.readFileSync('/etc/ssl/beng.me.key')
    };
    https.createServer(options, app).listen(9999);
} catch (e) {
    app.listen(9999);
}
