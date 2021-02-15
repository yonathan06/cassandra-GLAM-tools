const config = require('../config/config');
const { Pool } = require('pg');
const SQL = require('@nearform/sql');
const dateFns = require('date-fns');

function generateAppGlamFromDb(element) {
  const glam = {
    name: element.name,
    fullname: element.fullname,
    category: element.category,
    image: element.image,
    website: element.website,
    connection: new Pool({
      ...config.postgres,
      database: element.database
    })
  };

  if (element.lastrun) {
    glam.lastrun = element.lastrun;
  } else {
    glam.lastrun = null;
  }

  if (element.status) {
    glam.status = element.status;
  } else {
    glam.status = null;
  }

  if (element['http-auth']) {
    glam['http-auth'] = element['http-auth'];
    glam['http-auth'].realm = element.name + " stats";
  }
  return glam;
}

async function getAllGlams() {
  const query = `SELECT * FROM glams`;
  const result = await config.cassandraPgPool.query(query);
  return result.rows.map(generateAppGlamFromDb)
}

exports.getAllGlams = getAllGlams;

async function getGlamByName(name) {
  const query = SQL`SELECT * FROM glams WHERE name=${name}`;
  const result = await config.cassandraPgPool.query(query);
  const element = result.rows[0];
  if (element) {
    return generateAppGlamFromDb(element);
  }
}

exports.getGlamByName = getGlamByName;

async function getGlamImgCount(glam) {
  const queryImgNum = 'SELECT COUNT(*) as value from images';
  const { rows: [imgNumResult] } = await glam.connection.query(queryImgNum);
  if (imgNumResult) {
    return +imgNumResult.value;
  }
  return 0;
}
exports.getGlamImgCount = getGlamImgCount;

const dbDateFormat = 'yyyy-LL-dd';
exports.dbDateFormat = dbDateFormat;

const formatDateForPg = date => dateFns.format(date, dbDateFormat)

function extractYesterdayMediacounts(mediacountResults, yesterdayDate) {
  const yesterdayResult = mediacountResults[0];
  if (yesterdayResult) {
    if (dateFns.isSameDay(yesterdayDate, yesterdayResult.access_date)) {
      return +yesterdayResult.accesses_sum;
    }
  }
  return 0;
}

function extractThisMonthMediacounts(mediacountResults, forDate) {
  let sum = 0;
  for (let result of mediacountResults) {
    if (!dateFns.isSameMonth(result.access_date.getTime(), forDate)) {
      break;
    }
    sum += +result.accesses_sum;
  }
  return sum;
}

function calcMonthlyAvg(mediacountResults, forDate) {
  if (mediacountResults.length === 0 || forDate.getMonth() === 0) {
    return 0;
  }
  const sum = mediacountResults.reduce((sum, res) => {
    if (!dateFns.isSameMonth(res.access_date.getTime(), forDate)) {
      return sum + +res.accesses_sum;
    }
    return sum;
  }, 0);
  return Math.round(sum / forDate.getMonth());
}

async function getGlamMediaCountReport(glam, forDate) {
  const startOfYear = dateFns.startOfYear(forDate);
  const mediacountsQuery = `
    SELECT *
    FROM visualizations_sum
    WHERE access_date BETWEEN '${formatDateForPg(startOfYear)}'
    AND '${formatDateForPg(forDate)}'
    ORDER BY access_date DESC
  `;
  const { rows: mediacountResults } = await glam.connection.query(mediacountsQuery);
  const report = {
    yesterdayMediacount: extractYesterdayMediacounts(mediacountResults, forDate),
    thisMonthMediacount: extractThisMonthMediacounts(mediacountResults, forDate),
    thisYearMonthlyAvg: calcMonthlyAvg(mediacountResults, forDate)
  };
  return report;
}
exports.getGlamMediaCountReport = getGlamMediaCountReport;

async function getGlamCategoryCount(glam) {
  const { rows: [result] } =
    await glam.connection.query('SELECT COUNT(*) AS count FROM categories');
  return Math.max(+result.count - 1, 0);
}
exports.getGlamCategoryCount = getGlamCategoryCount;

async function getArticlesCount(glam) {
  const { rows: [result] } =
    await glam.connection.query('SELECT COUNT(*) FROM (SELECT DISTINCT gil_page_title FROM usages) AS count');
  return +result.count;
}
exports.getArticlesCount = getArticlesCount;

async function getProjectsCount(glam) {
  const { rows: [result] } =
    await glam.connection.query(`SELECT COUNT(*) FROM (SELECT DISTINCT gil_wiki FROM usages) AS count`);
  return +result.count;
}
exports.getProjectsCount = getProjectsCount;

const reportDataCache = {};
async function getReportData(glam, forDate = new Date()) {
  if (dateFns.isToday(forDate)) {
    forDate = dateFns.sub(forDate, { days: 1 });
  }
  const forDateString = dateFns.format(forDate, dbDateFormat);
  if (reportDataCache[glam.name]) {
    const report = reportDataCache[glam.name][forDateString];
    if (report && Date.now() - report.reportCreatedDate < 1000 * 60) {
      return report;
    }
  }
  const data = {
    ...(await getGlamMediaCountReport(glam, forDate)),
    totalImgNum: await getGlamImgCount(glam),
    categoriesCount: await getGlamCategoryCount(glam),
    articlesCount: await getArticlesCount(glam),
    projectsCount: await getProjectsCount(glam),
    reportCreatedDate: Date.now()
  }
  reportDataCache[glam.name] = { [forDateString]: data };
  return data;
}
exports.getReportData = getReportData;
