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
 * @param {Object} params.mostViewedImg
 * @param {string} params.mostViewedImg.title
 * @param {string} params.mostViewedImg.src
 * @param {string} params.mostViewedImg.totalViews
 * @param {string} params.mostViewedImg.avgDailyViews
 * @param {Object} params.newImg
 * @param {string} params.newImg.title
 * @param {string} params.newImg.src
 * @param {string} params.newImg.totalViews
 * @param {string} params.newImg.avgDailyViews
 * @returns {Promise<Buffer>}
 */
async function createMonthlyReport(params) {
  const html = template(params);
  return await printPDF(html);
}
exports.createMonthlyReport = createMonthlyReport;