const { Pool } = require('pg');
const config = require('./config/config');
const cassandraPgPool = new Pool(config.postgres);

function createGlamsTableIfNoExist() {
  const query = `CREATE TABLE IF NOT EXISTS glams (
    name TEXT PRIMARY KEY,
    fullname TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT NOT NULL,
    database TEXT UNIQUE,
    lastrun TIMESTAMPTZ,
    status TEXT NOT NULL,
    min_date TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`
  return cassandraPgPool.query(query);
}

createGlamsTableIfNoExist().then(result => {  
  console.log('Glams table created successfully');
}).catch(error => {
  console.error('Error creating Glams table', error);
})