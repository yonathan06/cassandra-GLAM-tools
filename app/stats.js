process.env.ENV = "production";

const { getAllGlams } = require("./lib/db");

async function stats() {
  const glams = await getAllGlams();
  let total = 0;
  for (const glam of glams) {
    const { rows } = await glam.connection.query(`SELECT COUNT(*) as value from images WHERE img_timestamp between '2022-01-01' AND '2023-12-31'`);
    const [{ value }] = rows;
    console.log(glam.name, value);
    total += +value;
  }
  console.log(total);
}

stats();
