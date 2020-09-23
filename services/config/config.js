var { Pool } = require('pg');
var fs = require('fs');
console.log(__dirname)
var config = JSON.parse(fs.readFileSync(`${__dirname}/config.${process.env.ENV}.json`));

const cassandraPgPool = new Pool(config.postgres);

config.glamUser['realm'] = 'User area';
var glamUser = config.glamUser;
glamUser.users.push(config.admin);
config.admin['realm'] = 'Admin area';

var glams = {};

async function loadGlams() {
  const query = `SELECT * FROM glams`;
  const result = await cassandraPgPool.query(query);
  result.rows.forEach(element => {
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

    // Glams are never deleted
    glams[glam.name] = glam;
  })
  return glams;
}

module.exports = {
  ...config,
  glams,
  loadGlams,
  glamUser
}