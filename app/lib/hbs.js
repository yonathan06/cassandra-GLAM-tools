const hbs = require("hbs");
const fs = require("fs");
const path = require("path");

hbs.registerHelper("json", function (object) {
  return new hbs.SafeString(JSON.stringify(object));
});
hbs.registerHelper("toLocaleString", function (number) {
  return new hbs.SafeString((+number).toLocaleString());
});
hbs.registerPartial(
  "mainWrapper",
  fs.readFileSync(
    path.join(__dirname, "../pages/views/templates/main-wrapper.hbs"),
    {
      encoding: "utf-8",
    }
  )
);
hbs.registerPartial(
  "sidebar",
  fs.readFileSync(
    path.join(__dirname, "../pages/views/templates/sidebar.hbs"),
    {
      encoding: "utf-8",
    }
  )
);
hbs.registerPartial(
  "langSelect",
  fs.readFileSync(
    path.join(__dirname, "../pages/views/templates/lang-select.hbs"),
    {
      encoding: "utf-8",
    }
  )
);

hbs.registerHelper("ifOr", function (v1, v2, options) {
  if (v1 || v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

module.exports = hbs;
