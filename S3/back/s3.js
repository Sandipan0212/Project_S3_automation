const dotenv = require('dotenv');
const aws = require('aws-sdk');
const crypto = require('crypto');
const util = require('util');

dotenv.config();

const region = "ap-south-1";
const bucketName = "ifas-video";
//const region = "us-east-1";
//const bucketName = "sandiptryingtocreatebucket";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new aws.S3({
  region,
  accessKeyId,
  secretAccessKey,
  signatureVersion: 'v4'
});

const randomBytes = util.promisify(crypto.randomBytes);

async function generateUploadURL(fileName, path) {
  try {
    const rawBytes = await randomBytes(16);
    const imageName = rawBytes.toString('hex');

    const params = {
      Bucket: bucketName,
      Key: `${path}${fileName}`, // Modified key for unique filenames
      Expires: 60
    };
    console.log("==========aman==============", params, "==============================")
        const uploadURL = await s3.getSignedUrlPromise('putObject', params);
    return uploadURL;
  } catch (error) {
    throw new Error('Error generating upload URL');
  }
}

async function getFolders(filePath){
  const bucketName = 'ifas-video'; // Replace with your S3 bucket name
  //const bucketName = "sandiptryingtocreatebucket";

  const folderPath = filePath; // Replace with the path in your bucket

  const params = {
    Bucket: bucketName,
    Prefix: folderPath,
    Delimiter: '/'
  };
console.log("file path here ----------------------", folderPath, "===========================================")
  // ListObjectsV2 to get the folders (prefixes) within the specified path
  const data = await s3.listObjectsV2(params).promise();

  // Extract folder locations (common prefixes) from the response
  const folderLocations = data.CommonPrefixes.map(prefix => prefix.Prefix);
  return folderLocations 
}
module.exports = {generateUploadURL,getFolders};
