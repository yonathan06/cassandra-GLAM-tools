const { Pool } = require('pg');
const AWS = require("aws-sdk");
const fs = require('fs');
const SQL = require('@nearform/sql');
const config = JSON.parse(fs.readFileSync(`${__dirname}/config.${process.env.ENV}.json`));

AWS.config = {
  ...AWS.config,
  ...config.aws.config
};

const sqs = new AWS.SQS();

function sendNewGlamMessage(body) {
  return sqs.sendMessage({
    QueueUrl: config.aws.newGlamQueueUrl,
    MessageBody: JSON.stringify(body),
  }).promise()
}

config.glamUser.realm = 'User area';
const glamUser = config.glamUser;
glamUser.users.push(config.admin);
config.admin.realm = 'Admin area';

const cassandraPgPool = new Pool(config.postgres);

const glams = {};

async function loadGlams() {
  const query = `SELECT * FROM glams`;
  const result = await cassandraPgPool.query(query)
  result.rows.forEach(element => {
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

    // Glams are never deleted
    glams[glam.name] = glam;
  })
  return glams;
}

async function insertGlams(glams) {
  const newGlamsToSend = []
  for (let glam of glams) {
    const { name, fullname, category, image, database, website, country } = glam;
    newGlamsToSend.push(glam)
    const query = SQL`INSERT INTO glams (name, fullname, category, image, database, status, website, country) 
                    VALUES (${name}, ${fullname}, ${category}, ${image}, ${database}, 'pending', ${website || null}, ${country || null})`;
    await cassandraPgPool.query(query)
  }
  await sendNewGlamMessage({ glams: newGlamsToSend });
}

function updateGlam(glam) {
  console.log("🚀 ~ file: config.js ~ line 77 ~ updateGlam ~ glam", glam)
  const { name, fullname, image, website, country } = glam;
  const query = SQL`
    UPDATE glams 
    SET fullname = ${fullname}, 
        image = ${image}, 
        website = ${website}, 
        country = ${country},
        updated_at = NOW() 
    WHERE name = ${name} 
  `;
  return cassandraPgPool.query(query);
}

module.exports = {
  ...config,
  glamUser,
  glams,
  loadGlams,
  insertGlams,
  updateGlam,
  cassandraPgPool
}