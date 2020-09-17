var express = require('express');
var apicache = require('apicache').options({ debug: false }).middleware;
var morgan = require('morgan');
var Sentry = require('@sentry/node');
var config = require('./config/config');

var app = express();

if (typeof config.raven !== 'undefined') {
    Sentry.init({dsn: config.raven.glamtoolsweb.DSN});
    app.use(Sentry.Handlers.requestHandler());
}

app.use(morgan('common'));
app.use(express.json());

require('./routes.js')(app, apicache);

if (typeof config.raven !== 'undefined') {
    app.use(Sentry.Handlers.errorHandler());
}

var port = +process.env.PORT || 8081;

var server = app.listen(port, function() {
    var host = '0.0.0.0'
    var port = server.address().port;
    console.log('Server listening at http://%s:%s', host, port);
});
