const axios = require('axios');
const dateFns = require('date-fns')
const ProgressBar = require('progress');
const AWS = require("aws-sdk");
const { Stream } = require('stream');
const s3 = new AWS.S3();

AWS.config.getCredentials(function (err) {
  if (err) console.log(err.stack);
  else {
    console.log("Access key:", AWS.config.credentials.accessKeyId);
  }
});

const bucketName = 'wikimedia-dump';

const minDate = new Date(2019, 0, 1);

const baseurl = "https://dumps.wikimedia.org/other/mediacounts/daily/"

const mediacountsFolderName = "mediacounts";

const numberOfDays = dateFns.differenceInDays(new Date(), minDate);

async function downloadFile(urlData) {

  const s3ObjectKey = `${mediacountsFolderName}/${urlData.year}/${urlData.filename}`;

  const s3StreamPass = new Stream.PassThrough();

  const { data, headers } = await axios({
    method: 'get',
    url: urlData.url,
    responseType: 'stream'
  });

  s3.upload({ Bucket: bucketName, Key: s3ObjectKey, Body: s3StreamPass }, (err, data) => {
    console.log(err, data);
  });
  data.pipe(s3StreamPass);

  const totalLength = headers['content-length']
  const progressBar = new ProgressBar(`-> ${urlData.filename} [:bar] :percent :etas`, {
    width: 40,
    complete: '=',
    incomplete: ' ',
    renderThrottle: 1,
    total: parseInt(totalLength)
  });
  data.on('data', (chunk) => progressBar.tick(chunk.length))

  await new Promise((resolve) => {
    data.on('close', () => {
      resolve();
    })
  });
}

const urlsData = Array(numberOfDays).fill(1).map((_, index) => {
  const date = dateFns.addDays(minDate, index);
  const year = date.getFullYear();
  const month = dateFns.format(date, 'MM');
  const day = dateFns.format(date, 'dd');
  const filename = `mediacounts.${year}-${month}-${day}.v00.tsv.bz2`;
  return {
    filename,
    year,
    url: `${baseurl}${year}/${filename}`
  }
});

async function downloadFiles() {
  for (const urlData of urlsData) {
    await downloadFile(urlData);
  }
  console.log(`Downloaded all files successfully`);
}

s3.listBuckets().promise().then(buckets => {
  const bucketExist = buckets.Buckets.findIndex(bucket => bucket.Name === bucketName) !== -1;
  if (!bucketExist) {
    throw new Error(`Bucket ${bucketName} not exist, or not found`);
  }
  console.log(`Streaming mediacount dump from wikimedia to S3, bucket: ${bucketName}`)
  downloadFiles();
})


