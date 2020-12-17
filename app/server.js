var express = require('express');
var apicache = require('apicache').options({ debug: false }).middleware;
var morgan = require('morgan');
var Sentry = require('@sentry/node');
const i18n = require('i18n');
const hbs = require('hbs');
const fs = require('fs');
const cookieParser = require('cookie-parser');
var config = require('./config/config');

const locales = ['en', 'he', 'sv']
const localesDir = __dirname + '/locales';
const localesDicts = locales.reduce((map, locale) => {
    const localJson = JSON.parse(fs.readFileSync(`${localesDir}/${locale}.json`).toString());
    return {
        ...map,
        [locale]: localJson
    }
}, {});

i18n.configure({
    locales: locales,
    cookie: 'locale',
    directory: localesDir,
});

var app = express();

if (config.sentry) {
    Sentry.init({ dsn: config.sentry.DSN });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.errorHandler());
}

app.use(morgan('common'));
app.use(express.json());
app.use(cookieParser())

app.use(i18n.init)
app.use((req, res, next) => {
    if (!req.cookies.lang) {
        req.cookies.lang = 'en';
    }
    req.localesDicts = localesDicts;
    next();
})
hbs.registerHelper('json', function (object) {
    return new hbs.SafeString(JSON.stringify(object));
});
app.set('view engine', 'hbs');
app.engine('hbs', hbs.__express);

require('./routes.js')(app, apicache);


var port = +process.env.PORT || 8081;

var server = app.listen(port, function () {
    var host = '0.0.0.0'
    var port = server.address().port;
    console.log('Server listening at http://%s:%s', host, port);
});
