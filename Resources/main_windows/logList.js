// the log file list viewer


Ti.include('../tools/json2.js');
Ti.include('export.js');
Ti.include('../tools/date.format.js');

var win = Ti.UI.currentWindow;

// add an activity indicator 
// use this for slow loading stuff.
var actInd = Titanium.UI.createActivityIndicator();
if(Ti.Platform.name == 'iPhone OS') {
    //actInd.style = Titanium.UI.iPhone.ActivityIndicatorStyle.BIG;
    actInd.style = Titanium.UI.iPhone.ActivityIndicatorStyle.DARK;
}
actInd.zIndex = 100; // trying to bring this to the front
win.add(actInd);


var selectedEvents = new Array();

// add a send action button
var b = Titanium.UI.createButton();

// use special button icon if on iPhone
if(Ti.Platform.name == 'iPhone OS'){
    b.systemButton = Titanium.UI.iPhone.SystemButton.ACTION;    
} else {
    b.title = 'Send';
}


function sendLog(format){
    // format: [json, csv, gc]
    if(format == null) format = 'csv';

    // TODO: invoke an action sheet with options for sending the data
    // at the moment, just back to emailing off an attachment

    // display an alert if there are no rows selected
    // (or, if more than one is selected while i sort out that bug)
    if(selectedEvents.length < 1) {
        Ti.UI.createAlertDialog({
            title:'Select Log',
            message:"Please select a log file to send."
        }).show();
        return;
    } else if (selectedEvents.length > 1) {
        Ti.UI.createAlertDialog({
            title:'Select one log',
            message:"Select one log to send at a time. \n *TODO: this is a bug*"
        }).show();
        return;
    }

    // retrieve the rows and setup an email message
    var sampleData;
    var logDB = Ti.Database.open("log.db");

    var eventListArray = [];
    for (var i = 0; i < selectedEvents.length; i++) {
        var evt = selectedEvents[i];
        eventListArray.push(evt);//"'"+evt+"'"); // trying to get this query to work.
        Ti.API.info('eventID: '+selectedEvents[i]);
    };

    Ti.API.info('Selected Events list: '+eventListArray.join());
    var eventList = eventListArray.join();
    

    // i think that each of these items needs to be surrounded by quotes
    //var rows = logDB.execute('SELECT * FROM LOGDATA WHERE EVENTID IN (?)',eventList);
    //var rows = logDB.execute('SELECT * FROM LOGDATA WHERE EVENTID = ?',eventListArray[0]);
    var rows = logDB.execute('SELECT * FROM LOGMETA WHERE EVENTID = ?',eventListArray[0]);
    var id = rows.fieldByName('id');

    // also want to insert the event and device id into the exported data:
    var eventID = rows.fieldByName('eventid');
    var deviceID = rows.fieldByName('deviceid');
    var startDate =  rows.fieldByName('startdate');

    rows.close();

    // convert to a Date object
    startDate = new Date(startDate*1000);

    rows = logDB.execute('SELECT * FROM LOGDATA WHERE id = ?',id);    
    // the rowCount seems to be limited to 1000 rows. why?
    // The problem seems alleviated after two changes:
    // 1. commented out the getRowCount() call.
    // 2. changed the execute statement to 'EVENTID = ?', eventListArray[0]
    // Not sure which, if either, of these did the trick.
    //
    //Titanium.API.info('Samples retrieved from db: ' + rows.getRowCount());
    //Titanium.API.info('Rows affected: ' + logDB.rowsAffected);

    // TODO: group the rows by eventID
    var tmpData=[];
    while(1){
        var thisData = JSON.parse(rows.fieldByName('DATA'));
        
        // insert the extra fields:
        thisData.eventID = eventID;
        thisData.deviceID = deviceID;

        tmpData.push(thisData);
        if(rows.next() == false) break;
    };
    rows.close();
    logDB.close();

    Ti.API.info('log row count: '+tmpData.length);

    // ok, now construct the email window
    var emailView = Ti.UI.createEmailDialog();
    emailView.setSubject(' Log data');
  
    // export the data in a selected format:
    var tmpDataString;
    switch(format) {
        case 'gc':
            // testing GC file format export
            tmpDataString = exportGCfile(tmpData);
            break;
        case 'csv':
            // testing CSV file format export
            tmpDataString = exportCSV(tmpData);
            break;
        case 'json': 
        default:
            // much more robust approach to create a json string
            tmpDataString = JSON.stringify(tmpData);
    }
    
    // naive attempt to create the json string
    //var tmpDataString = '['+ tmpData.join(',\n') +']'; // create a JSON string


    // TODO: add as a file attachment, rather than a string.
    // emailView.setMessageBody(tmpDataString);
    emailView.setMessageBody('Log file attached in '+format+' format.');
    
    // this is a huge string
    //Ti.API.info('output string: '+tmpDataString);

    // Save the data as a temp file, the attach to an e-mail:
    // So this all works...for now. Maybe they'll change the 
    // methods in a future release.
    // For the moment, though...does the temp dir clear itself?
    var tempFile = Ti.Filesystem.createTempFile();
    Ti.API.info('Created temp file: '+tempFile.toString());
   
    // construct a filename based on the date
    // TODO: look to see if the log has already been exported?
    // what about a log that has had more data added to it?
    // There has to be a better way to replace these strings or to build the name.
    var dateString = startDate.format('yyyy-mm-dd_HH-MM-ss_Z');
    Ti.API.info(dateString);
    var outfilename = '/Log_'+dateString+'.'+format;

    var result = tempFile.rename(tempFile.getParent()+outfilename);
    Ti.API.info('move result: '+result);
    Ti.API.info('renamed the temp file to: '+tempFile.name);

    tempFile = Ti.Filesystem.getFile(tempFile.getParent(),outfilename);
    tempFile.write(tmpDataString);
    Ti.API.info('wrote to temp log file: '+tempFile.resolve());

    //var tempContents = tempFile.read();
    //Ti.API.info('temp file contents: '+tempContents.text);

    // Do we need to clean up after ourselves?
    // Does the filesystem clean up the temp dir?
    //tempFile.deleteFile();
    //Ti.API.info('deleted temp file at: '+tempFile.resolve());
   
    // Add the log as an attachment to the e-mail message
    emailView.addAttachment(tempFile);

    emailView.addEventListener('complete',function(e)
    {
        if (e.result == emailView.SENT)
        {
            // TODO: this isn't really necessary, is it?
            // alert("Mail sent.");
        }
        else if(e.result == emailView.FAILED)
        {
            var alertDialog = Titanium.UI.createAlertDialog({
                title: 'Problem',
                message: 'There was a problem. Check your network connection. DEBUG: '+e.result,
                buttonNames: ['OK']
            });
        }
    });
    emailView.open();

};


//b.addEventListener('click',sendLog());

/*
if(Ti.Platform.name == 'iPhone OS'){
    win.rightNavButton = b;
    rightnav = true;
} else {
    // TODO: figure out a solution for android
    // Menu?
}
*/


// this isn't being used at the moment
// TODO: add an activity meter.
var data = [
	{title:'Log file loading...'}
];

// create a table view for the logs
var logTable = Ti.UI.createTableView();

logTable.addEventListener('click',function(e) 
{
    // create a child view with the sample data
    // TODO: organize the data into events
    // inspect each event in the child view
   

    // because the android doesn't have a navbar with buttons,
    // use the options dialog (action sheet) to reveal
    // log inspection and upload functions
    var optionsDialog = Titanium.UI.createOptionDialog({
        options:['Inspect data', 'Email Log', 'Delete Log', 'Cancel'],
        destructive:2,
        cancel:3,
        title:'Manage Log'
    });


    // TODO: add a listener to conditionally act on the response.
    // This may be better suited to display differently based on each platform's
    // UX paradigms.
    optionsDialog.addEventListener('click',function(oe){
        // these properties aren't being provided correctly.
        if(oe.cancel == true) { 
            Ti.API.info('Cancel button pressed');
            return; 
        }
        if(oe.destructive == true) {
            // delete this log file
            // forward the event to the delete listener
            Ti.API.info('Delete Log button pressed.');
            logTable.fireEvent('delete',e);
            Ti.API.info('fired a synthesized delete event to logTable');
        } else {
            switch(oe.index) {
                case 0:
                    Ti.API.info('Button 0 pressed.');
                    // Inspect this log data 
                    displayDetail();
                    break;
                case 1:
                    Ti.API.info('Button 1 pressed.');
                    // email / upload this log
                    actInd.show();
                    toggleSelection(true);
                    sendLog();
                    toggleSelection(false);
                    actInd.hide();
                    break;
                case 2:
                    // delete this log file
                    // forward the event to the delete listener
                    Ti.API.info('Delete Log button pressed for event: '+e.row.eventID);
                    deleteEvent(e.row.eventID);
                    toggleSelection(false);
                    break;
                case 3:
                    Ti.API.info('Cancel button pressed');
                    toggleSelection(false);
                    break;

                default:
                    Ti.API.info('Default case in options dialog.');
                    // this shouldn't happen
                    toggleSelection(false);
                    return;
            }
        }

    });


    Ti.API.info('Showing the options dialog');
    optionsDialog.show();

   function displayDetail() { 
        var newwin = Titanium.UI.createWindow({
			title:'Data Sample',
            backgroundColor:'#ddd'
		});

        // TODO: layout a nice summary page
        // Include a map to plot the ride?
        var sample = Ti.UI.createTextArea({
            value:e.rowData.logID +' / '+e.rowData.eventID, //content,
            height:300,
            width:300,
            top:10,
            font:{fontSize:16,fontFamily:'Marker Felt', fontWeight:'bold'},
            color:'#666',
            textAlign:'left',
            borderWidth:2,
            borderColor:'#bbb',
            borderRadius:5,
            editable:false
        });
        newwin.add(sample);

		Titanium.UI.currentTab.open(newwin,{animated:true});
   }
    
    function toggleSelection(force) {
        // toggle the checked status of this row
        if(force == null) // actually perform a toggle
        {
            force = (e.row.hasCheck == null || e.row.hasCheck == false);
        }

       if(force === true){ // (e.row.hasCheck == null || e.row.hasCheck == false)) {
           var data = e.row;
           //logTable.updateRow(e.index,data);
            data.hasCheck = true;
            //data.hasDetail = false;

            var evt = data.eventID;
            selectedEvents.push(evt);

            Ti.API.info('row '+e.index+' selected. ('+data.eventID+')');
       } else {
           var data = e.row;
           //data.hasDetail = true;
           data.hasCheck = false;
           //logTable.updateRow(e.index,data);
           
           // remove this selected item
           // TODO: change this to use indexOf()
           for (var i = 0; i < selectedEvents.length; i++) {
               if(selectedEvents[i] == data.eventID) {
                selectedEvents.splice(i,1); // remove this element
                Ti.API.info('row '+e.index+' deselected. ('+data.eventID+')');
               }
           };
       }
    }

});

// add delete event listener
logTable.addEventListener('delete',function(e)
{
    // get the selected row's eventID
    var eventID = e.row.eventID;
    if (eventID == null ) {return;}

    deleteEvent(eventID);
});

function deleteEvent(eventID) {
    if(eventID == null) { return; }

    // remove the log data from the db
    // but first confirm with an alert
    var alertDialog = Ti.UI.createAlertDialog({
        title:'Delete Log',
        message:'Are you sure you want to delete this log data?',
        buttonNames: ['OK','Cancel']
    });
    alertDialog.addEventListener('click',function(e) {
        if(e.index == 0){
            // the OK button was clicked, delete this data.
            // open the DB
            var logDB = Ti.Database.open("log.db");



            // run the SQL statement to delete the row.
            var rows = logDB.execute('SELECT id FROM LOGMETA WHERE eventid = ?',eventID);
            var id = rows.fieldByName('id');
            rows.close();

            logDB.execute('DELETE FROM LOGDATA WHERE id = ?',id);
            logDB.execute('DELETE FROM LOGMETA WHERE id = ?',id);
            // is there a way to verify the process?

            logDB.close();
           
            Ti.API.info('deleted eventID: '+eventID);
        }
        // have to refresh the table data
        Ti.API.info('Reloading log list from alert dialog');
        loadLogs();
    });

    alertDialog.show();

};


// simple padding function
function pad2(number) {
     return (number < 10 ? '0' : '') + number   
}


function addLogRow(rowData) // should include title(date), duration, distance, eventID/logID (for detail view) 
{
    Ti.API.info('In the addLogRow() method');
    
    if(rowData == null) return null;

	var row = Ti.UI.createTableViewRow({height:55});
    Ti.API.info('Created a new row object');

    // add a label to the left
    // should be bold
    var cellLabel = Ti.UI.createLabel({
        text:rowData.title,
        font:{fontSize:15,fontWeight:'bold'},
        left:10,top:10,
        height:'auto'
    });
    row.add(cellLabel);
    Ti.API.info('Created (and added) the title to the row');

    // create a label for the subtitle
    // duration is millis
    var hour = Math.floor(rowData.duration / 1000 / 60 / 60);
    var min = Math.floor(rowData.duration / 1000 / 60) % 60;
    var sec = Math.floor(rowData.duration / 1000) % 60;
    var durationString = (hour > 0 ? hour +':' : '') + (hour > 0 ? pad2(min) : min) +':'+ pad2(sec);
    Ti.API.info('Created the durationString: '+durationString);

    // distance
    var distanceString; 
     if(Ti.App.Properties.getBool('useMetric',false)) {
        Ti.API.info('Metric units');
        var distanceUnits = "KM";
        var speedUnits = 'KPH';

        var distanceUnitValue = 0.001; //m -> km
        var speedUnitValue = 3.6; // m/s -> M/hr

        distanceString = (rowData.distance * distanceUnitValue).toFixed(2) +' '+distanceUnits;
    } else {
        Ti.API.info('Imperial units');
        var distanceUnits = "Miles";
        var speedUnits = 'MPH';

        var distanceUnitValue = 0.000621371192; // m -> mile
        var speedUnitValue = 2.236936; // m/s -> M/hr

        distanceString = (rowData.distance * distanceUnitValue).toFixed(2) +' '+distanceUnits;
   }
   Ti.API.info('Created the distanceString: '+distanceString);

    // combine the two to create the subtitle label
    // smaller and grey
    var subtitleLabel = Ti.UI.createLabel({
        text:durationString +' | '+distanceString,
        font:{fontSize:13},
        color:'#666',
        left:10,top:23
    });
    row.add(subtitleLabel);
    Ti.API.info('Created (and added) the subtitle label to the row');

    // add these strings to the row object for easy retrieval in the detail view
    row.distanceString = distanceString;
    row.durationString = durationString;
   
    // also add data useful for retrieving the log later
    row.eventID = rowData.eventID;
    row.logID = rowData.logID;

    // add the child icon
    //row.hasChild = true;
    row.hasCheck = rowData.hasCheck;

	row.className = 'logrow';
	
    Ti.API.info('Finished setting up the row. Now returning it');
    return row;
}


// call up the log list from the database
function loadLogs () {
    // display the activity indicator
    actInd.show();
    
    // open the database connection (create if necessary)
    var logDB = Ti.Database.open("log.db");

    Ti.API.info('Getting logs from db');


    // TODO: move the data base stuff into a class.
    
    // this should be streated by the setupDatabase() method
    //logDB.execute('CREATE TABLE IF NOT EXISTS LOGDATA (ID INTEGER PRIMARY KEY, EVENTID TEXT, DATA TEXT)');

    //var rows = logDB.execute('SELECT * FROM LOGDATA GROUP BY EVENTID');
    var rows = logDB.execute('SELECT * FROM LOGMETA ORDER BY startdate DESC');

    //Titanium.API.info('ROW COUNT = ' + rows.getRowCount());
    
    // TODO: group the rows by eventID
    var tmpData = new Array();
    var previousSelection = selectedEvents.slice(0);
    selectedEvents.splice(0,selectedEvents.length); // clear the list

    if(rows.getRowCount() > 0) {
        while(rows.isValidRow()){
            //var thisData = rows.fieldByName('DATA');
            //var thisObject = JSON.parse(thisData);
            var thisTimestamp = rows.fieldByName('startdate');

            var rowParams = {   title:new Date(thisTimestamp*1000).toLocaleString(), // only stored as seconds
                                eventID:rows.fieldByName('eventid'),
                                content:null,
                                timestamp:thisTimestamp,
                                duration:rows.fieldByName('duration'),
                                distance:rows.fieldByName('distance'),
                                logID:rows.fieldByName('id')
                                };

            /* // notes on creating custom row layouts
            row = Ti.UI.createTableViewRow();
            row.hasDetail = true;
            row.title = rows.field(1);
            row.leftImage = '../images/film/small/'+rows.fieldByName('small_img');
            data[rows.field(0)] = row;
            rows.next();
            */

            // look up the eventid in the selectedEvents array.
            if(previousSelection.indexOf(rowParams.eventID) >= 0) {
                Ti.API.info('Found previously selected event');
                rowParams.hasCheck = true;
                selectedEvents.push(rowParams.eventID); // restore this selection
            } else {
                Ti.API.info('Found unselected event');
                //rowParams.hasDetail = true;
            }
            tmpData.push(rowParams);
            rows.next();
        };
    }
    rows.close();
    logDB.close();

    // generate the custom rows, and push them to the data:
    for (var i = 0; i < tmpData.length; i++) {
        tmpData[i] = addLogRow(tmpData[i]);
    };

    // sort chronolocically:
    //tmpData.sort(compareTime);

    Ti.API.info('Got '+tmpData.length+' events');
    Ti.API.info('Selected events: '+selectedEvents);

    if(tmpData.length == 0) { 
        tmpData.push({title:'No Logs recorded.',touchEnabled:false});
    } else {
        logTable.editable=true;
    }

    // this seems to only be available on iPhone.
    if(Ti.Platform.name == "iPhone OS"){
        Ti.API.info('Updating the iPhone log table');
        logTable.setData(tmpData);
    } else {
        // hack for android
        Ti.API.info('Updating the Android log table');
        win.remove(logTable);
        logTable.data = tmpData;
        win.add(logTable);
    }

    // hide the activity indicator
    actInd.hide();
}

// reload the logs when the window gains focus
win.addEventListener('focus',function() {
    loadLogs();
    //selectedEvents = [];
});

// the android doesn't seem to be responding to focus or open events
// TODO: fix me please
if(Ti.Platform.name == 'android') {
    loadLogs();
    //selectedEvents = [];
}


function compareTime(a, b) {
    return b.timestamp - a.timestamp;
}


// add the log table to the view.
win.add(logTable);
