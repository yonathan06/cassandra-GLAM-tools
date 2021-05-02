const fs = require('fs');
const path = require('path');

const localesMap = [
  { lang: "en", label: "English" },
  { lang: "he", label: "עברית" },
  { lang: "sv", label: "svenska" },
  { lang: "es", label: "español" },
  { lang: "pt-br", label: "Português" },
];
const defaultLang = "en";
const locales = localesMap.map((l) => l.lang);
const localesDir = path.resolve(__dirname, "../locales");
const localesDicts = locales.reduce((map, locale) => {
  const localJson = JSON.parse(
    fs.readFileSync(`${localesDir}/${locale}.json`).toString()
  );
  return {
    ...map,
    [locale]: localJson,
  };
}, {});

function locale(req, res, next) {
  if (!req.cookies.lang) {
    req.cookies.lang = defaultLang;
  }
  req.localesDicts = localesDicts;

  res.renderWithLocal = function (relativeFilePath, additionalData) {
    const langDict = {
      ...req.localesDicts[defaultLang],
      ...req.localesDicts[req.cookies.lang],
    };
    res.render(relativeFilePath, {
      langDict,
      localesMap,
      ...additionalData,
    });
  };
  next();
}
module.exports = locale;
