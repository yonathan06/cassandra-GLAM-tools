const { Pool } = require('pg');
const fs = require('fs');
const SQL = require('@nearform/sql');
const config = JSON.parse(fs.readFileSync(`${__dirname}/config.${process.env.ENV}.json`));
const axios = require('axios');

function sendNewGlamMessage(body) {
  return axios.post(config.newGlamServiceEndpoint, body);
}

config.glamUser.realm = 'User area';
const glamUser = config.glamUser;
glamUser.users.push(config.admin);
config.admin.realm = 'Admin area';

const cassandraPgPool = new Pool(config.postgres);
const cassandraWritePgPool = new Pool(config.postgresWrite);

const glams = {};

async function insertGlams(glams) {
  const newGlamsToSend = []
  for (let glam of glams) {
    const { name, fullname, category, image, database, website, country } = glam;
    newGlamsToSend.push(glam)
    const query = SQL`INSERT INTO glams (name, fullname, category, image, database, status, website, country) 
                    VALUES (${name}, ${fullname}, ${category}, ${image}, ${database}, 'pending', ${website || null}, ${country || null})`;
    await cassandraWritePgPool.query(query)
  }
  await sendNewGlamMessage({ glams: newGlamsToSend });
}

function updateGlam(glam) {
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
  return cassandraWritePgPool.query(query);
}

module.exports = {
  ...config,
  glamUser,
  glams,
  insertGlams,
  updateGlam,
  cassandraPgPool
}
