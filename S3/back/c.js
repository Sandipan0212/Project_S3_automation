const { execSync } = require("child_process");
const fs = require("fs");
const fse = require("fs-extra");
const AWS = require("aws-sdk");
const path = require("path");
const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://ifas-pre-prod:kPl8TieA07bFaGYC@cluster0.sr6il.mongodb.net/ifas-pre-prod-live_new?retryWrites=true&w=majority"
const VideoConvertion = require('./model/videoConversion.js')
const VideoConvertionStatus = require('./model/videoConversionStatus');
const { exit } = require("process");
const s3BucketName = "ifas-m3u8";
const accesskey = "AKIA6DBHDY46TAYCFFCW";
const secretekey = "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"
const region = "ap-south-1";
const s3 = new AWS.S3({
  accessKeyId: accesskey,
  secretAccessKey: secretekey,
  region: region,
});

let data;
//mongoDB config start.............


mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(async () => {

  const serverStatus = await VideoConvertionStatus.findOne({ SERVER: "SERVER1" });
  if (serverStatus?.STATUS === 'IDLE') {
    const videoConvertion = await VideoConvertion.find({ COMPRESS_STATUS: 0, ENCRYPT_STATUS: 0 }).sort({_id:1});
// const videoConvertion = await VideoConvertion.find({ COMPRESS_STATUS: 0, ENCRYPT_STATUS: 0 });
    console.log("list--------", videoConvertion);
    if (videoConvertion.length > 0) {
      await VideoConvertionStatus.findOneAndUpdate({ SERVER: 'SERVER1' }, { STATUS: "RUNNING" })
      fse.emptyDirSync("./MP4_Compressed_Video");
      fse.emptyDirSync("./M3U8_VIDEO");
      try {
        start_script(videoConvertion[0]);
        await mongoose.connection.close();
      }
      catch (error) {
        if (!(mongoose.connection.readyState === 1))
                await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log(error)
        await VideoConvertion.findOneAndUpdate({ _id: videoConvertion[0]._id }, { COMPRESS_STATUS: -1, ENCRYPT_STATUS: -1 });
        await VideoConvertionStatus.findOneAndUpdate({ SERVER: 'SERVER1' }, { STATUS: "IDLE" })
        await mongoose.connection.close();
        exit();
      }


    }
    else
      exit();
  }
  else
    exit();

}).catch((err) => {
  console.log("Error connecting to the database - ", err);
});
//mongoDB config end...............

const start_script = (data) => {
  let dir = data.FILE_NAME;
  let mp4Path = data.PATH;
  const bucket_path_to_upload = data.PATH;
  dir = decodeURIComponent(dir);
  mp4Path = decodeURIComponent(mp4Path);
//  mp4Path = "'" + mp4Path + "'";
  const compressPath = "./MP4_Compressed_Video";
  const encryptPath = "./M3U8_VIDEO";
  str = data.FILE_NAME.split(".mp4")[0];
  str = decodeURIComponent(str);
  str = str.replaceAll(",", "-");
  const COMPRESS_PATH = "https://s3convertedcdn.ifasonline.com/MP4_Compressed_Video/" + encodeURIComponent(bucket_path_to_upload) + "/" + encodeURIComponent(str) +"/"+ data.RESOLUTION + "/" +encodeURIComponent(str) +".mp4";
  const ENCRYPT_PATH = "https://s3convertedcdn.ifasonline.com/M3U8_VIDEO/" + encodeURIComponent(bucket_path_to_upload) + "/" + encodeURIComponent(str) +"/"+ data.RESOLUTION+ "/hls-master.m3u8";
  let compressCommand = "";
  if (data.PATH) {
    compressCommand = "ffmpeg -i '/home/ubuntu/bucket/" + mp4Path + "/" + dir + "' -vcodec libx264 -crf 27  " + compressPath + "/'" + str +"/"+data.RESOLUTION+ "/"+str+".mp4'";
  } else {
    compressCommand = "ffmpeg -i '/home/ubuntu/bucket/" + dir + "' -vcodec libx264 -crf 27  " + compressPath + "/'" + str +"/"+data.RESOLUTION+ "/"+str+".mp4'";
  }
  const encryptionCommand = `/home/ubuntu/autoscriptcode/packager-linux-x64 'in=${compressPath}/${str}/${data.RESOLUTION}/${str}.mp4,stream=audio,init_segment=${encryptPath}/${str}/${data.RESOLUTION}/audio/init.mp4,segment_template=${encryptPath}/${str}/${data.RESOLUTION}/audio/audio$Number$.m4s' 'in=${compressPath}/${str}/${data.RESOLUTION}/${str}.mp4,stream=video,init_segment=${encryptPath}/${str}/${data.RESOLUTION}/video/init.mp4,segment_template=${encryptPath}/${str}/${data.RESOLUTION}/video/video$Number$.m4s' --generate_static_live_mpd --mpd_output '${encryptPath}/${str}/${data.RESOLUTION}/mpd-master.mpd' --hls_master_playlist_output '${encryptPath}/${str}/${data.RESOLUTION}/hls-master.m3u8'`;
  console.log("compress start -----", compressCommand)
  execSync(compressCommand);
  console.log("compress end------");
  uploadtos3("MP4_Compressed_Video", async (err, uploaderresponse) => {

    if (err) {
      console.log("error");
      return;
    } else {
      console.log("Compress upload success");
      try{
      await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
      await VideoConvertion.findOneAndUpdate({ _id: data._id }, { COMPRESS_STATUS: 1, COMPRESS_PATH: COMPRESS_PATH });
      }
      catch(err){
        console.log(error)
        console.log("Error connecting to the database - ", err);
        exit();
      }
      mongoose.connection.close();
      encrypt();
      console.log("encrypt function complete")
    }
    return;
  });

const encrypt = async () => {
    try {
        console.log(encryptionCommand, "encryption start");
        execSync(encryptionCommand);
        console.log("encryption end");
        uploadtos3("M3U8_VIDEO", async (err, uploaderresponse) => {
            if (err) {
                console.log("error");
                return;
            } else {
                await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
                console.log("Encrypt upload success");
                await VideoConvertion.findOneAndUpdate({ _id: data._id }, { ENCRYPT_STATUS: 1, ENCRYPT_PATH: ENCRYPT_PATH });
                fse.remove(compressPath + "/" + str + ".mp4");
                fse.remove(encryptPath + "/" + str);
                await VideoConvertionStatus.findOneAndUpdate({ SERVER: "SERVER1" }, { STATUS: 'IDLE' });
            }
            mongoose.connection.close();
            console.log("did idle");
            return;
        });
    } catch (err) {
        console.log(error)
         await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        await VideoConvertion.findOneAndUpdate({ _id: data._id }, { COMPRESS_STATUS: -1, ENCRYPT_STATUS: -1 });
        await VideoConvertionStatus.findOneAndUpdate({ SERVER: 'SERVER1' }, { STATUS: "IDLE" });
        console.log("Error connecting to the database - ", err);
        mongoose.connection.close();
        exit();
    }
};


  function uploadtos3(foldername, callback) {
    console.log("in upload");
    var s3Path = foldername;
    s3.getBucketLocation(
      {
        Bucket: s3BucketName,
      },
      (errBucketLocation, data) => {
        if (errBucketLocation) {
          // ERROR CALLBACK
          return callback(errBucketLocation, null);
        } else {
          // SUCCESS CALLBACK
          walkSync(s3Path, foldername, (err, resp) => {
            if (err) {
              return callback(err, null);
            }
          });
          return callback(null, true);
        }
      }
    );
  }


  function walkSync(currentDirPath, foldername, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
      var filePath = path.join(currentDirPath, name);
      var stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkSync(filePath, foldername, callback);
        return callback(null, true);
      } else if (stat.isFile()) {
        var url = currentDirPath.replace(/\\/g, "/");
        url = url.split(foldername + "/")[1];
        let res;

       
        if (url === undefined) {
          if (data.PATH) {
            res = s3BucketName + "/" + foldername + "/" + bucket_path_to_upload;
          } else {
            res = s3BucketName + "/" + foldername;
          }
        } else {
          if (data.PATH) {
            res = s3BucketName + "/" + foldername + "/" + bucket_path_to_upload + "/" + url;
          } else {
            res = s3BucketName + "/" + foldername + "/" + url;
          }
        }


        console.log("res-------", res);
        pushToAws(filePath, currentDirPath, res, (err, ptaresponse) => {
          if (err) {
            return callback(err, null);
          }
        });
        return callback(null, true);
      }
    });
  }

  function pushToAws(filePath, dirpath, bucketpath, ptccallback) {
    let keyPath = filePath.substring(dirpath.length + 1);
    // bucketpath=bucketpath+bucket_path_to_upload;
    let params = {
      Bucket: bucketpath,
      Key: keyPath,
      Body: fs.readFileSync(filePath),
    };
    s3.putObject(params, function (err, data) {
      if (err) {
        return ptccallback(err, null);
      } else {
      }
    });
    return ptccallback(null, true);
  }
};