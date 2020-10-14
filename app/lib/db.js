const config = require('../config/config');
const { Pool } = require('pg');
const SQL = require('@nearform/sql');

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
  console.log("getGlamByName -> name", name)
  const query = SQL`SELECT * FROM glams WHERE name=${name}`;
  const result = await config.cassandraPgPool.query(query);
  const element = result.rows[0];
  if (element) {
    return generateAppGlamFromDb(element);
  }
}

exports.getGlamByName = getGlamByName;
