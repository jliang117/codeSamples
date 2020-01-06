var C_MAX_RESULTS = 1000;

function onOpen(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var menuEntries = [{name: "Configure Jira", functionName: "jiraConfigure"},
                     {name: "Refresh Data Now", functionName: "jiraPullManual"},
                     {name: "Schedule 4 Hourly Automatic Refresh", functionName: "scheduleRefresh"},
                     {name: "Stop Automatic Refresh", functionName: "removeTriggers"},
                     {name: "Post Last Form Row", functionName: "createIssueOnSubmit"},
                     
                    ]; 
                     ss.addMenu("Jira", menuEntries);
                     
                     menuEntries = [ {name: "Create cards", functionName: "createCardsFromBacklog"}, {name: "Create cards from selected rows", functionName: "createCardsFromSelectedRowsInBacklog"} ];
  ss.addMenu("Story Cards", menuEntries);
}

function jiraConfigure() {
  
  var prefix = Browser.inputBox("Enter the 3 digit prefix for your Jira Project. e.g. TST", "Prefix", Browser.Buttons.OK);
  PropertiesService.getUserProperties().setProperty("prefix", prefix.toUpperCase());
  
  var host = Browser.inputBox("Enter the host name of your on demand instance e.g. toothCamp.atlassian.net", "Host", Browser.Buttons.OK);
  PropertiesService.getUserProperties().setProperty("host", host);
  
  var userAndPassword = Browser.inputBox("Enter your Jira On Demand User id and Password in the form User:Password. e.g. Tommy.Smith:ilovejira (Note: This will be base64 Encoded and saved as a property on the spreadsheet)", "Userid:Password", Browser.Buttons.OK_CANCEL);
  var x = Utilities.base64Encode(userAndPassword);
  PropertiesService.getUserProperties().setProperty("digest", "Basic " + x);
  
  var issueTypes = Browser.inputBox("Enter a comma separated list of the types of issues you want to import  e.g. story or story,epic,bug", "Issue Types", Browser.Buttons.OK);
  PropertiesService.getUserProperties().setProperty("issueTypes", issueTypes);
  
  
  Browser.msgBox("Jira configuration saved successfully.");
}  


function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  Browser.msgBox("Spreadsheet will no longer refresh automatically.");
  
  
  
}  

function scheduleRefresh() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  ScriptApp.newTrigger("jiraPull").timeBased().everyHours(4).create();
  
  Browser.msgBox("Spreadsheet will refresh automatically every 4 hours.");
  
  
}  

function jiraPullManual() {
  jiraPull();
  Browser.msgBox("Jira backlog successfully imported");
}  

function getFields() {
  return JSON.parse(getDataForAPI("field"));
  
}  

function getStories() {
  var allData = {issues:[]};
  var data = {startAt:0,maxResults:0,total:1};
  var startAt = 0;
  
  while (data.startAt + data.maxResults < data.total) {
    Logger.log("Making request for %s entries", C_MAX_RESULTS);
    data =  JSON.parse(getDataForAPI("search?jql=project%20%3D%20" + PropertiesService.getUserProperties().getProperty("prefix") + "%20and%20status%20!%3D%20resolved%20and%20type%20in%20("+ PropertiesService.getUserProperties().getProperty("issueTypes") + ")%20order%20by%20rank%20&maxResults=" + C_MAX_RESULTS + "&startAt=" + startAt));  
    allData.issues = allData.issues.concat(data.issues);
    startAt = data.startAt + data.maxResults;
  }  
  
  return allData;
}  

function getDataForAPI(path) {
  var url = "https://" + PropertiesService.getUserProperties().getProperty("host") + "/rest/api/2/" + path;
  var digestfull = PropertiesService.getUserProperties().getProperty("digest");
  
  var headers = { "Accept":"application/json", 
                 "Content-Type":"application/json", 
                 "method": "GET",
                 "headers": {"Authorization": digestfull},
                 "muteHttpExceptions": true
                 
                };
  
  var resp = UrlFetchApp.fetch(url,headers );
  if (resp.getResponseCode() != 200) {
    Browser.msgBox("Error retrieving data for url" + url + ":" + resp.getContentText());
    return "";
  }  
  else {
    return resp.getContentText();
  }  
  
}  

function postDataForAPI(path,payload) {
  var url = "https://" + PropertiesService.getUserProperties().getProperty("host") + "/rest/api/2/" + path;
  var digestfull = PropertiesService.getUserProperties().getProperty("digest");
  
  var headers = { "Accept":"application/json", 
                 "Content-Type":"application/json", 
                 "method": "POST",
                 "headers": {"Authorization": digestfull},
                 "payload": payload,
                 "muteHttpExceptions": true
                };
  Logger.log(headers)
  var resp = UrlFetchApp.fetch(url,headers);
  if (resp.getResponseCode() != 200) {
    Browser.msgBox("Error retrieving data for url:" + url + ":" + resp.getContentText());
    return "";
  }  
  else {
    return resp.getContentText();
  }  
  
}  

function testPost(path,payload) {
  var url = "https://" + PropertiesService.getUserProperties().getProperty("host") + "/rest/api/2/" + path;
  var digestfull = PropertiesService.getUserProperties().getProperty("digest");
  var headers = { 
    "Authorization" : digestfull
  };
  
  var options =
      {
        "contentType" : "application/json",
        "method" : "post",
        "headers" : headers,
        "payload" : payload
      };
  
  var response = UrlFetchApp.fetch(url, options); 
  if (response.getResponseCode() > 202) {
    Logger.log(payload)
    var respString = "ResponseCode:"+response.getResponseCode()+"Error retrieving data for url:" + url + ":" + response.getContentText();
    Logger.log(respString);
    Browser.msgBox(respString);
    return "";
  } 
}

function createIssueOnSubmit(){
  // var sheetName = Browser.inputBox("Enter the form responses sheet name", "Form Name", Browser.Buttons.OK);
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("FormResponses");
  if (ss != null) {
    Logger.log(ss.getIndex());
  }
  createIssue(ss);
}

function getPriorityFromString(priority){
  var prioID;
  switch (priority)  {
    case "Blocker":
      prioID = "1";
      break;
    case "Critical":
      prioID = "2";
      break;
    case "High":
      prioID = "3";
      break;
    case "Normal":
      prioID = "10000";
      break;
    case "Low":
      prioID = "4";
      break;
    case "Trivial":
      prioID = "5";
      break;
    default:
      prioId = "10000";
      break;
  }
  return prioID;
}


function createIssue(ss){
  var allData = SpreadsheetApp.getActiveSheet().getDataRange().getValues();
  var e = allData[ss.getLastRow()-1];
  //
  // Assign variables to the form data submitted by the requestor from the spreasheet associated with the Google form.
  // NOTE: Update the [n] to the cell value in your spreadsheet.
  // Found here: https://{YOUR INSTANCE}/rest/api/2/issue/createmeta?projectKeys=TD2&expand=projects.issuetypes.fields
  //
  //  var requesterEmail = e.values[1];
  //  var summary = e.values[2];
  //  var description = e.values[3];
  var range = ss.getRange(2, 1, ss.getLastRow()-1,ss.getLastColumn());
  
  var buildNum = e[1];
  var userName = e[2];
  var deviceModelNumber = e[3];
  var iosVersion = e[4];
  var wholesaler = e[5];
  var rtNum = e[6];
  var featureTitle = e[7];
  var title = e[8];
  var longDesc = e[9];
  var expected = e[10];
  var issueType = e[11];
  var linkToScreenCaps = e[12];
  var reporterEmail = e[13];
  var version = e[14];
  
  title = featureTitle + " " + title;
  
  var totalDescription = 
      "Issuetype:" + issueType + "\n" + 
        "Device specs:" + 
          deviceModelNumber + "\n" +
            "iOS Version:" + iosVersion + "\n" +
              "Build:" +  buildNum + "\n" +
                "Version:" +  version + "\n" +
                "Wholesaler: " + wholesaler + "\n" +
                  "RouteNumber: " + rtNum + "\n" +
                    "Username: " + userName + "\n" +
                      "Issue Description:" + longDesc + "\n" +
                        "Expected Behavior:" + expected + "\n" +
                          "Link to screencaps:" + linkToScreenCaps + "\n" +
                            "Reporter:" + reporterEmail;
  
  
  //var prioID = getPriorityFromString(priority);
  
  //
  // The dueDate variable requires a formating update in order that JIRA accepts it
  // Date format becomes YYYY-MM-DD, and is called later in the data posted to the API
  // 
  //  var dueDate = e.values[4];
  //  var formattedDate = Utilities.formatDate(new Date(dueDate), "GMT", "yyyy-MM-dd");
  //
  // Contact names
  //
  
  //
  // Assign variable to your instance JIRA API URL
  //
  var url = "issue";
  //
  // The POST data for the JIRA API call
  //
  //
  // The following custom fields are for the various strings and are simple text fields in JIRA
  // You can find all the custom fields by looking here: https://<YOUR_JIRA_INSTANCE>/rest/api/latest/field/
  //      
  if(issueType == "Enhancement"){
    var data = 
        {
          "fields": {
            "issuetype":{
              "name":issueType
            },
            "project":{ 
              "key": PropertiesService.getUserProperties().getProperty("prefix")
            },
            "fixVersions": [{
              "name": "Build"
            }],
            //make sure these fields are strings
            "summary": title,
            "description": totalDescription
           
          }
        };
  }
  else{
    var data = 
        {
          "fields": {
            "issuetype":{
              "name":issueType
            },
            "project":{ 
              "key": PropertiesService.getUserProperties().getProperty("prefix")
            },
            "summary": title,
            "description": totalDescription
          }
        };
  }
  
  
  
  //
  // Turn all the post data into a JSON string to be send to the API
  //
  
  var payload = JSON.stringify(data);
  Logger.log(payload);
  testPost(url,payload);
}

function jiraPull() {
  
  var allFields = getAllFields();
  
  var data = getStories();
  
  if (allFields === "" || data === "") {
    Browser.msgBox("Error pulling data from Jira - aborting now.");
    return;
  }  
  
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Backlog");
  var headings = ss.getRange(1, 1, 1, ss.getLastColumn()).getValues()[0];
  
  
  
  var y = new Array();
  for (i=0;i<data.issues.length;i++) {
    var d=data.issues[i];
    y.push(getStory(d,headings,allFields));
  }  
  
  ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Backlog");
  var last = ss.getLastRow();
  if (last >= 2) {
    ss.getRange(2, 1, ss.getLastRow()-1,ss.getLastColumn()).clearContent();  
  }  
  
  if (y.length > 0) {
    ss.getRange(2, 1, data.issues.length,y[0].length).setValues(y);
  }
  
}

function getAllFields() {
  
  var theFields = getFields();
  var allFields = new Object();
  allFields.ids = new Array();
  allFields.names = new Array();
  
  for (var i = 0; i < theFields.length; i++) {
    allFields.ids.push(theFields[i].id);
    allFields.names.push(theFields[i].name.toLowerCase());
  }  
  
  return allFields;
  
}  

function getStory(data,headings,fields) {
  
  var story = [];
  for (var i = 0;i < headings.length;i++) {
    if (headings[i] !== "") {
      story.push(getDataForHeading(data,headings[i].toLowerCase(),fields));
    }  
  }        
  
  return story;
  
}  

function getDataForHeading(data,heading,fields) {
  
  if (data.hasOwnProperty(heading)) {
    return data[heading];
  }  
  else if (data.fields.hasOwnProperty(heading)) {
    return data.fields[heading];
  }  
  
  var fieldName = getFieldName(heading,fields);
  
  if (fieldName !== "") {
    if (data.hasOwnProperty(fieldName)) {
      return data[fieldName];
    }  
    else if (data.fields.hasOwnProperty(fieldName)) {
      return data.fields[fieldName];
    }  
  }
  
  var splitName = heading.split(" ");
  
  if (splitName.length == 2) {
    if (data.fields.hasOwnProperty(splitName[0]) ) {
      if (data.fields[splitName[0]] && data.fields[splitName[0]].hasOwnProperty(splitName[1])) {
        return data.fields[splitName[0]][splitName[1]];
      }
      return "";
    }  
  }  
  
  return "Could not find value for " + heading;
  
}  

function getFieldName(heading,fields) {
  var index = fields.names.indexOf(heading);
  if ( index > -1) {
    return fields.ids[index]; 
  }
  return "";
}  
