const puppeteer = require("puppeteer");

/**
 * @type {import("puppeteer").Browser}
 */
let puppeteerInstance;
async function getPuppeteerInstance() {
  if (!puppeteerInstance) {
    puppeteerInstance = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return puppeteerInstance;
}
exports.getPuppeteerInstance = getPuppeteerInstance;

async function printPDF(html) {
  const instance = await getPuppeteerInstance();
  const page = await instance.newPage();
  await page.setContent(html, {
    waitUntil: "networkidle0",
  });
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });
  await page.close();
  return pdfBuffer;
}
exports.printPDF = printPDF;
