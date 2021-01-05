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

const formatDateForPg = date => dateFns.format(date, dbDateFormat)

function extractYesterdayMediacounts(mediacountResults) {
  const yesterdayResult = mediacountResults[0];
  if (yesterdayResult) {
    if (dateFns.isYesterday(yesterdayResult.access_date)) {
      return +yesterdayResult.accesses_sum;
    }
  }
  return 0;
}

function extractThisMonthMediacounts(mediacountResults) {
  const thisMonth = new Date();
  let sum = 0;
  for (let result of mediacountResults) {
    if (!dateFns.isSameMonth(result.access_date.getTime(), thisMonth)) {
      break;
    }
    sum += +result.accesses_sum;
  }
  return sum;
}

function calcMonthlyAvg(mediacountResults) {
  const thisMonth = new Date();
  if (mediacountResults.length === 0 || thisMonth.getMonth() === 0) {
    return 0;
  }
  const sum = mediacountResults.reduce((sum, res) => {
    if (!dateFns.isSameMonth(res.access_date.getTime(), thisMonth)) {
      return sum + +res.accesses_sum;
    }
    return sum;
  }, 0);
  return Math.round(sum / thisMonth.getMonth());
}

async function getGlamMediaCountReport(glam) {
  const yesterday = dateFns.sub(new Date(), { days: 1 });
  const startOfYear = dateFns.startOfYear(yesterday);
  const mediacountsQuery = `
    SELECT *
    FROM visualizations_sum
    WHERE access_date BETWEEN '${formatDateForPg(startOfYear)}'
    AND '${formatDateForPg(yesterday)}'
    ORDER BY access_date DESC
  `;
  const { rows: mediacountResults } = await glam.connection.query(mediacountsQuery);
  const report = {
    yesterdayMediacount: extractYesterdayMediacounts(mediacountResults),
    thisMonthMediacount: extractThisMonthMediacounts(mediacountResults),
    thisYearMonthlyAvg: calcMonthlyAvg(mediacountResults)
  };
  return report;
}
exports.getGlamMediaCountReport = getGlamMediaCountReport;

async function getGlamCategoryCount(glam) {
  const { rows: [result] } = 
    await glam.connection.query('SELECT COUNT(*) AS count FROM categories');
  return +result.count - 1;
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
async function getReportData(glam) {
  const today = dateFns.format(new Date(), dbDateFormat);
  if (reportDataCache[glam.name]) {
    if (reportDataCache[glam.name][today]) {
      return reportDataCache[glam.name][today];
    }
  }
  const data = {
    ...(await getGlamMediaCountReport(glam)),
    totalImgNum: await getGlamImgCount(glam),
    categoriesCount: await getGlamCategoryCount(glam),
    articlesCount: await getArticlesCount(glam),
    projectsCount: await getProjectsCount(glam)
  }
  reportDataCache[glam.name] = { [today]: data };
  return data;
}
exports.getReportData = getReportData;
