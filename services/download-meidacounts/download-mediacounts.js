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

async function objectExist(objectParams) {
  try {
    return await s3.headObject(objectParams).promise()
  } catch (error) {
    return false;
  }
}

async function downloadFile(urlData) {

  const s3ObjectKey = `${mediacountsFolderName}/${urlData.year}/${urlData.filename}`;

  const objectParams = { Bucket: bucketName, Key: s3ObjectKey };

  const existingObject = await objectExist(objectParams);

  const s3StreamPass = new Stream.PassThrough();

  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();

  const { data, headers } = await axios({
    method: 'get',
    url: urlData.url,
    responseType: 'stream',
    cancelToken: source.token
  });

  if (existingObject) {
    const objectContentLength = existingObject.ContentLength + '';
    const downloadFileContentLength = headers['content-length']
    if (objectContentLength === downloadFileContentLength) {
      console.log(`${s3ObjectKey} - exists and complete`);
      source.cancel();
      return;
    } else {
      console.log(`Found incomplete object ${s3ObjectKey}, deleting and downloading again`, { objectContentLength, downloadFileContentLength })
      await s3.deleteObject(objectParams).promise();
    }
  }

  s3.upload({ ...objectParams, Body: s3StreamPass }, (err, data) => {
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
    try {
      await downloadFile(urlData);
    } catch(error) {
      console.error(`Error streaming file to s3`, error);
    }
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


