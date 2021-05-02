const express = require("express");
const apicache = require("apicache").options({ debug: false }).middleware;
const Sentry = require("@sentry/node");
const hbs = require("./lib/hbs");
const config = require("./config/config");

const app = express();

if (config.sentry) {
  Sentry.init({ dsn: config.sentry.DSN });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());
}
app.use(require("morgan")("common"));
app.use(express.json());
app.use(require("cookie-parser")());

app.use(require("./middlewares/locale"));

app.engine("hbs", hbs.__express);
app.use(express.static('./pages'));
app.set('views', './pages');
app.set("view engine", "hbs");

require("./routes.js")(app, apicache);
app.use("/admin", require("./routes/admin"));
app.get("*", async function (req, res) {
  res.sendStatus(404);
});

const port = +process.env.PORT || 8081;

app.listen(port, function () {
  const host = "0.0.0.0";
  console.log("Server listening at http://%s:%s", host, port);
});
