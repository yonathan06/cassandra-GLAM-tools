const config = require('../config/config');
const { Pool } = require('pg');

async function getAllGlams() {
  const query = `SELECT * FROM glams`;
  const result = await config.cassandraPgPool.query(query);
  return result.rows.map(element => {
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
  })
}

exports.getAllGlams = getAllGlams;

async function getGlamByName(name) {
  const query = `SELECT * FROM glams WHERE name = ${name}`;
  const result = await config.cassandraPgPool.query(query);
  return result.rows[0]
}

exports.getGlamByName = getGlamByName;
