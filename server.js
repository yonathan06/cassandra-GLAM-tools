var express = require('express');
var apicache = require('apicache').options({ debug: false }).middleware;
var morgan = require('morgan');
var MongoClient = require('mongodb').MongoClient;
var config = require('./config.js');
var api = require('./api.js');


var app = express();
app.use(morgan('common'));

app.use(require('apikey')(auth, 'GLAM tool'));

function auth (key, fn) {
  if (config.SERVICE_USER === key)
    fn(null, { id: '1', name: config.SERVICE_PASSWORD})
  else
    fn(null, null)
}

MongoClient.connect(config.mongoURL, function(err, db) {
    console.log("Connected correctly to server");

    app.get('/api/:id/category/', apicache("1 hour"), function (request, response) {
        if (request.params.id === config.DB_NAME) {
            api.categoryGraph(request, response, request.params.id, db);
        } else {
            response.sendStatus(400);
        }
    });

    app.get('/api/:id/file/upload-date', apicache("1 hour"), function (request, response) {
        if (request.params.id === config.DB_NAME) {
            api.uploadDate(request, response, request.params.id, db);
        } else {
            response.sendStatus(400);
        }
    });

    app.get('/docs', function(req, res){
        res.sendFile(__dirname + '/docs.html');
    });

    app.get('*', function(req, res){
        res.sendStatus(400);
    });

    var server = app.listen(80, function() {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Server listening at http://%s:%s', host, port);
    });
});
