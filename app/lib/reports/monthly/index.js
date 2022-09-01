const hbs = require('../../hbs');
const fs = require("fs");
const path = require("path");
const { printPDF } = require('../../puppeteer');

const template = hbs.compile(fs.readFileSync(path.join(__dirname, "template.hbs"), "utf-8"));

/**
 * 
 * @param {Object} params 
 * @param {string} params.name
 * @param {string} params.mainImage
 * @param {string} params.month
 * @param {string} params.year
 * @param {string} params.totalMediaFiles
 * @param {string} params.monthlyAvgViews
 * @param {string} params.numOfArticles
 * @param {string} params.numOfProjects
 * @param {string} params.numOfProjects
 * @param {Array} params.topViewedImages
 * @returns {Promise<Buffer>}
 */
async function createMonthlyReport(params) {
  const html = template(params);
  return await printPDF(html);
}
exports.createMonthlyReport = createMonthlyReport;