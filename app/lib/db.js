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
    return +yesterdayResult.accesses_sum;
  }
  return 0;
}

function extractThisMonthMediacounts(mediacountResults) {
  const thisMonth = new Date();
  let sum = 0;
  for (let result of mediacountResults) {
    if (!dateFns.isSameMonth(result.access_date, thisMonth)) {
      break;
    }
    sum += +result.accesses_sum;
  }
  return sum;
}

function calcMonthlyAvg(mediacountResults) {
  if (mediacountResults.length === 0) {
    return 0;
  }
  const sum = mediacountResults.reduce((sum, res) => {
    return sum + +res.accesses_sum;
  }, 0);
  return Math.round(sum / mediacountResults.length);
}

async function getGlamMediaCountReport(glam) {
  const yesterday = dateFns.sub(new Date(), { days: 1 });
  const startOfYear = dateFns.startOfYear(yesterday);
  const mediacountsQuery = `
    SELECT *
    FROM visualizations_sum
    WHERE access_date BETWEEN '${formatDateForPg(startOfYear)}'
    and '${formatDateForPg(yesterday)}'
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