var env = PropertiesService.getScriptProperties().getProperties();
var counter;

function getService() {

  return OAuth1.createService('Twitter')

    // set the endpoint URLs.
    .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
    .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
    .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')

    // set the consumer key and secret.
    .setConsumerKey(env.CONSUMER_KEY)
    .setConsumerSecret(env.CONSUMER_SECRET)

    // set your user's access token key and secret
    .setAccessToken(env.TOKEN, env.TOKEN_SECRET)

    .setCallbackFunction('authCallback');
}

function tweetPicFromURL(target_file) {

  try {

    var boundary = "cuthere";

    // set the tweet status
    var status = 'desired status';

    var requestBody = Utilities.newBlob("--" + boundary + "\r\n" +
      "Content-Disposition: form-data; name=\"status\"\r\n\r\n" + status + "\r\n" +
      "--" + boundary + "\r\n" +
      "Content-Disposition: form-data; name=\"media[]\"; filename=\"" + target_file.getName() + "\"\r\n" +
      "Content-Type: " + target_file.getContentType() + "\r\n\r\n").getBytes();

    requestBody = requestBody.concat(target_file.getBytes());
    requestBody = requestBody.concat(Utilities.newBlob("\r\n--" + boundary + "--\r\n").getBytes());

    var options =
    {
      method: "post",
      contentType: "multipart/form-data; boundary=" + boundary,
      payload: requestBody
    };

    // twitter stuff
    var api = 'https://api.twitter.com/1.1/statuses/update_with_media.json';
    var twitterService = getService();
    var response = twitterService.fetch(api, options);

    Logger.log(response);

    return response;
  }

  catch (e) {
    Logger.log(e);
  }
}

function Oauth1percentEncode(text) {

  text = encodeURIComponent(text).replace(/\!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/\'/g, "%27")
    .replace(/\(/g, "%28");

  return text
}

function uploadTwitterMedia(image) {

  var file = DriveApp.getFilesByName(image);

  while (file.hasNext()) {
    var pic = file.next();
  }

  var service = getService();
  var initResponse = initTwitterUpload(pic, service, pic);

  appendTwitterUpload(pic, initResponse, service);
  Utilities.sleep(10000);

  finalizeTwitterUpload(initResponse, service);
  Utilities.sleep(10000);

  Logger.log(initResponse["media_id_string"])

  var baseUrl = "https://api.twitter.com/1.1/statuses/update.json?"
  // set desired status
  var params = "status=desired status&media_ids=" + initResponse["media_id_string"]
  var tweetUrl = baseUrl + params

  var response = getService().fetch(tweetUrl, {
    method: 'POST',
    muteHttpExceptions: true
  })

  Logger.log(response)

  return initResponse["media_id_string"]
}

function initTwitterUpload(url, service, image) {

  var test = DriveApp.getFilesByName(image)

  while (test.hasNext()) {
    var file = test.next();
    var size = file.getSize();
  }

  var type = "video/mp4"
  var size = file.getSize()
  var baseUrl = "https://upload.twitter.com/1.1/media/upload.json?"
  var oauthParams = "command=INIT&total_bytes=" + encodeURIComponent(size).replace(/\!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/\'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29") + "&media_type=" + encodeURIComponent(type).replace(/\!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/\'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29") + "&media_category=" + Oauth1percentEncode("tweetvideo");

  var tweetUrl = baseUrl + oauthParams
  var response = service.fetch(tweetUrl, { method: 'POST' })

  Logger.log(JSON.parse(response.getContentText()))

  return JSON.parse(response.getContentText())
}

function appendTwitterUpload(file, init, service) {

  var options = null
  var response = null
  var baseUrl = "https://upload.twitter.com/1.1/media/upload.json?command=APPEND&media_id=" + init["media_id_string"] +
    "&segment_index=" + Oauth1percentEncode(0);
  var boundary = "xxxxxxxxxx";
  var data = "";

  data += "--" + boundary + "\r\n";
  data += "Content-Disposition: form-data; name=\"status\"\r\n\r\n" + "status" + "\r\n" +
    "--" + boundary + "\r\n"
  data += "Content-Disposition: form-data; name=\"media\"; filename=\"" + file.getName() + "\"\r\n";
  data += "Content-Type:" + file.getMimeType() + "\r\n\r\n";

  var payload = Utilities.newBlob(data).getBytes()
    .concat(file.getBlob().getBytes())
    .concat(Utilities.newBlob("\r\n--" + boundary + "--").getBytes());

  var options = {
    method: "post",
    contentType: "multipart/form-data; boundary=" + boundary,
    payload: payload,
    muteHttpExceptions: true,
  }
  var response = service.fetch(baseUrl, options);

  Logger.log(response.getResponseCode())
  return response.getResponseCode()
}

function finalizeTwitterUpload(init, service) {

  var baseUrl = "https://upload.twitter.com/1.1/media/upload.json?"
  var params = "command=FINALIZE&media_id=" + Oauth1percentEncode(init["media_id_string"])
  var tweetUrl = baseUrl + params
  var response = service.fetch(tweetUrl, {
    method: 'POST',
    muteHttpExceptions: true
  })

  Logger.log(JSON.parse(response.getContentText()))
  return JSON.parse(response.getContentText())
}

function getFileName(basename) {

  /* 
    handle the file type and get the proper file name
  */

  var jpg = basename + ".jpg";
  var png = basename + ".png";
  var gif = basename + ".gif";
  var mp4 = basename + ".mp4";
  var jpg_format = jpg.substring(0, 50);
  var png_format = png.substring(0, 50);
  var gif_format = gif.substring(0, 50);
  var mp4_format = mp4.substring(0, 50)
  var jpg_file = DriveApp.getFilesByName(jpg_format);
  var png_file = DriveApp.getFilesByName(png_format);
  var gif_file = DriveApp.getFilesByName(gif_format);
  var mp4_file = DriveApp.getFilesByName(mp4_format);
  var target_file;

  while (jpg_file.hasNext()) {
    target_file = jpg_file.next().getBlob();
    Logger.log(target_file.getName());
  }

  while (png_file.hasNext()) {
    target_file = png_file.next().getBlob();
    Logger.log(target_file.getName());
  }

  while (gif_file.hasNext()) {
    target_file = gif_file.next().getBlob();
    Logger.log(target_file.getName());
  }

  while (mp4_file.hasNext()) {
    target_file = mp4_file.next().getBlob();
    Logger.log(target_file.getName());
  }

  return target_file;
}

function tweetFile(arg_file) {

  var target_file;
  var final_file;

  if (arg_file == undefined) {

    // set counter text file and the containing folder
    var fileName = "counter.txt";
    var folderName = "folder";

    var basename;
    var content;

    // get list of folders with matching name
    var folderList = DriveApp.getFoldersByName(folderName);

    if (folderList.hasNext()) {
      
      // found matching folder
      var folder = folderList.next();

      // search for files with matching name
      var fileList = folder.getFilesByName(fileName);

      if (fileList.hasNext()) {

        // found matching file - append text
        var file = fileList.next();
        // set number of total files
        var total_files = 1000;
        var number;

        // find a file that has not been tweeted out yet
        do {

          // get a random file number within the limit
          number = Math.floor(Math.random() * total_files);
          // match the file name
          basename = number + "title" + number;
          // prepare to input in the counter text file        
          content = 'galf' + basename + 'flag' + "\n";

        } while (file.getBlob().getDataAsString().includes(content));
      }
    }

    Logger.log(basename);

    target_file = getFileName(basename);
    final_file = target_file.getName();
  }

  else {
    final_file = arg_file;
  }
  
  var format = final_file.substring(final_file.length - 3, final_file.length);

  Logger.log(format)

  // mp4 has to go through chunked media upload
  if (format == 'mp4') {
    uploadTwitterMedia(final_file);
  }

  else {
    
    var combinedContent = file.getBlob().getDataAsString() + content;

    file.setContent(combinedContent);
    tweetPicFromURL(target_file);
  }
}

function tweetSpecificFile() {
  // set the file to be tweeted
  tweetFile("filename.format")
}