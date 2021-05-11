const config = require("../config/config.js");
const mariadb = require("mariadb");

const log = (...args) =>
  console.log(new Date().toLocaleString() + ":", ...args);

const CONST_USE_PER_QUERY = 10;
const CONST_CAT_PER_QUERY = 40;

var wikiCaller;
var images;
var catQueue;
var catHead = 0;
var imgIndex;
var countImages = 0;
var catFreeTail = 0;
var usages;
var usagindex = 0;
var glam;

async function finalize(failure) {
  log("===========================================");
  log("Number of categories: " + catFreeTail);
  log("Number of images: " + countImages);

  if (failure === true) {
    throw new Error('Process failed');
  }
  log("Running doMaintenance() on glam database");
  await glam.connection.query("select * from doMaintenance();");
}

function searchCatQueue(page) {
  var i = 0;
  while (i < catHead) {
    if (catQueue[i].page_title == page) break;
    i++;
  }
  if (i == catHead) i = -1;
  return i;
}

async function wikiOpen(starting_cat) {
  catQueue = [];
  catFreeTail = 1;
  catHead = 0;
  catQueue[0] = new Object();
  catQueue[0].page_title = starting_cat;
  catQueue[0].level = 0;
  catQueue[0].cat_subcats = 0;
  catQueue[0].cat_files = 0;
  catQueue[0].father = "ROOT";
  log("===========================================");
  log("Loading categories...");

  let temp_query =
    "select cat_subcats, cat_files from category where cat_title='" +
    starting_cat.replace(/\'/g, "''") +
    "'";
  const rows = await wikiCaller.query(temp_query);
  catQueue[0].cat_subcats = rows[0].cat_subcats;
  catQueue[0].cat_files = rows[0].cat_files;
  await getLevelChilds();
}

async function getLevelChilds() {
  if (catHead >= catFreeTail) {
    // all visited
    await afterCategories();
    return;
  }

  if (catFreeTail >= config.limits["categories"]) {
    await finalize(true);
  }

  log("At " + catHead + " of " + catFreeTail);
  var RQ = "";
  var originalHead = catHead;
  while (
    catHead < catFreeTail &&
    catHead < originalHead + CONST_CAT_PER_QUERY
  ) {
    if (catHead > originalHead) RQ += ",";
    RQ += "'" + catQueue[catHead].page_title.replace(/'/g, "''") + "'";
    catHead++;
  }

  var query = buildCategoryQuery(RQ);
  const rows = await wikiCaller.query(query);
  for (var k = 0; k < rows.length; k++) {
    var newPage = rows[k].page_title.toString();
    var father = rows[k].cl_to.toString();
    if (searchCatQueue(newPage) == -1) {
      //prevent loops
      var fatherIndex = searchCatQueue(father);
      catQueue[catFreeTail] = new Object();
      catQueue[catFreeTail].page_title = newPage;
      catQueue[catFreeTail].cat_subcats = rows[k].cat_subcats;
      catQueue[catFreeTail].cat_files = rows[k].cat_files;
      catQueue[catFreeTail].level = catQueue[fatherIndex].level + 1;
      catQueue[catFreeTail].father = father;

      catFreeTail++;
    }
  }
  await getLevelChilds();
}

async function afterCategories() {
  let storage_query =
    "delete from categories; update images set is_alive=false; ";
  let i = 0;
  while (i < catFreeTail) {
    let temp = "";
    let Cat = catQueue[i];
    temp +=
      "select * from addCategory('" +
      Cat.page_title.replace(/'/g, "''") +
      "'," +
      Cat.cat_subcats +
      "," +
      Cat.cat_files +
      ",'" +
      Cat.father.replace(/'/g, "''") +
      "'," +
      Cat.level +
      ");\r\n";
    storage_query += temp;
    i++;
  }

  log("Updating Postgres data...");
  await glam.connection.query(storage_query);
  log("Completed!");
  log("===========================================");
  log("Now loading images...");
  catHead = 0;
  imgIndex = 0;
  await loadImages();
}

async function loadImages() {
  if (catHead >= catFreeTail) {
    await loadImagesIntoDB();
    log("===========================================");
    log("Loading usages...");
    usages = [];
    usagindex = 0;
    catHead = 0;
    await loadUsages();
    return;
  }

  if (countImages >= config.limits["images"]) {
    await finalize(true);
  }

  // TODO can be optimized looking for files number and merging little cats calls
  log("At " + catHead + " of " + catFreeTail);
  var RQ = "'" + catQueue[catHead].page_title.replace(/'/g, "''") + "'";
  catHead++;

  imgIndex = 0;
  images = [];

  var query = buildImageQuery(RQ);
  const rows = await wikiCaller.query(query);

  for (var k = 0; k < rows.length; k++) {
    images[imgIndex] = new Object();
    images[imgIndex].img_name = rows[k].img_name.toString();
    images[imgIndex].img_user_text = rows[k].img_user_text.toString();
    images[imgIndex].img_timestamp = convertTimestamp(rows[k].img_timestamp);
    images[imgIndex].img_size = rows[k].img_size;
    images[imgIndex].cl_to = rows[k].cl_to.toString();
    imgIndex++;
    countImages++;
  }
  await loadImagesIntoDB();
  await loadImages();
}

var convertTimestamp = function (timestamp) {
  const TS = timestamp.toString();
  let retval =
    TS.substring(0, 4) +
    "-" +
    TS.substring(4, 6) +
    "-" +
    TS.substring(6, 8) +
    " " +
    TS.substring(8, 10) +
    ":" +
    TS.substring(10, 12) +
    ":" +
    TS.substring(12, 14);
  return retval;
};

async function loadImagesIntoDB() {
  let storage_query = ""; //"update images set is_alive=false;";
  let i = 0;
  while (i < imgIndex) {
    let temp = "";
    let img = images[i];
    temp +=
      "select * from addImage('" +
      img.img_name.replace(/'/g, "''") +
      "','" +
      img.img_user_text.replace(/'/g, "''") +
      "','" +
      img.img_timestamp +
      "'," +
      img.img_size +
      ",'" +
      img.cl_to.replace(/'/g, "''") +
      "');\r\n";
    storage_query += temp;
    i++;
  }

  log("Updating Postgres data...");
  await glam.connection.query(storage_query);
}

async function loadUsages() {
  if (catHead >= catFreeTail) {
    afterUsages();
    return;
  }
  log("At " + catHead + " of " + catFreeTail);
  var RQ = "";
  var originalHead = catHead;
  while (
    catHead < catFreeTail &&
    catHead < originalHead + CONST_USE_PER_QUERY
  ) {
    if (catHead > originalHead) RQ += ",";
    RQ += "'" + catQueue[catHead].page_title.replace(/'/g, "''") + "'";
    catHead++;
  }

  var query = buildUsageQuery(RQ);
  const rows = await wikiCaller.query(query);
  for (var k = 0; k < rows.length; k++) {
    usages[usagindex] = new Object();
    usages[usagindex].gil_wiki = rows[k].gil_wiki;
    usages[usagindex].gil_page_title = rows[k].gil_page_title.toString();
    usages[usagindex].gil_to = rows[k].gil_to.toString();
    usagindex++;
  }
  await loadUsages();
}

async function afterUsages() {
  let i = 0;
  storage_query = "";
  while (i < usagindex) {
    let temp = "";
    let use = usages[i];
    temp +=
      "select * from addUsage('" +
      use.gil_wiki +
      "','" +
      use.gil_page_title.replace(/'/g, "''") +
      "','" +
      use.gil_to.replace(/'/g, "''") +
      "');\r\n";
    storage_query += temp;
    i++;
  }

  log("Updating Postgres data...");
  await glam.connection.query(storage_query);
  await finalize();
}

var buildUsageQuery = function (RQ) {
  return `SELECT gil_wiki, gil_page_title, gil_to
    FROM globalimagelinks, categorylinks, page, image
    WHERE cl_to IN (${RQ})
    AND gil_to = img_name
    AND gil_page_namespace_id = '0'
    AND page_id = cl_from
    AND page_namespace = 6
    AND img_name = page_title`;
};
var buildImageQuery = function (RQ) {
  return `SELECT img_name, actor_name AS img_user_text, img_timestamp, img_size, cl_to
    FROM categorylinks, page, image, actor
    WHERE cl_to IN (${RQ})
    AND page_id = cl_from
    AND page_namespace = 6
    AND img_name = page_title
    AND img_actor = actor_id`;
};
var buildCategoryQuery = function (RQ) {
  return `SELECT page_title, cl_to, cat_subcats, cat_files
    FROM categorylinks, page, category
    WHERE cl_to IN (${RQ})
    AND page_id = cl_from
    AND page_namespace = 14
    AND page_title = cat_title`;
};

// ENTRY POINT
if (process.argv.length != 3) {
  log("Missing GLAM name");
  process.exit(1);
}

config.loadGlams().then(async (glams) => {
  glam = glams[process.argv[2]];

  if (glam === undefined) {
    log("Unknown GLAM name");
    process.exit(1);
  }

  log("Application launched...");
  wikiCaller = await mariadb.createConnection(config.wmflabs);

  log("Working for " + glam.fullname);
  await wikiOpen(glam.category.replace(/ /g, "_"));
}).catch(e => {
    console.error(e);
    process.exit(1);
});
