/*
 * Mobile Logger. Record geotagged sensor values on a mobile device.
 * Copyright (C) 2010 Robert Carlsen
 *
 * This file is part of Mobile Logger.
 *
 * Mobile Logger is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 */

// api for uploading samples to the database
// need to generate a post request with the data to send (json)
// get the database from the properties
//

function uploadSample (sample) {
    if(sample == null) { return; }

    var xhr = Titanium.Network.createHTTPClient();
    xhr.onload = function()
    {
        //Ti.API.info('POSTed sample: '+JSON.stringify(sample));
        //Ti.API.info('With response: '+this.responseText);
        return this.responseText;
    };
    xhr.onerror = function()
    {
        Ti.API.info('Upload error: '+this.responseText);
        return this.responseText;
    };
    // TODO: get the url from the properties
    xhr.open("POST","http://mobilelogger.robertcarlsen.net/api/addSample");
    xhr.send("data="+JSON.stringify(sample));
}

function bulkUpload (samples) {
    if(samples == null || samples.length == 0) { return; }


// how do we create an event callback here?
// the idea is that we send batches of samples to the server
// and after every batch we issue a callback to let the 
// device update the display


// from a functional standpoint, this will have to be several
// http requests won't it? Loop thru all the elements?

    var range = {index: 0, length: 100};
    if(range.length > samples.length) {range.length = samples.length;}

    
    var xhr = Titanium.Network.createHTTPClient();
    xhr.onload = function()
    {
        //Ti.API.info('POSTed samples: '+JSON.stringify(sample));
        //Ti.API.info('With response: '+this.responseText);

        //TODO: the response is an array of the new doc ids
        //we need to store those docs ids to prevent duplicate doc
        //
        // this is where a new upload needs to occur
        // TODO: evaluate if this method is highly wasteful of memory
        if(samples.length > range.length) {
            bulkUpload(samples.slice(range.length-1,samples.length-1));
        }

        return this.responseText;
    };
    xhr.onerror = function()
    {
        Ti.API.info('Upload error: '+this.responseText);
        return this.responseText;
    };
    // TODO: get the url from the properties
    // TODO: what's the array split/subarray command?
    var out = {docs:samples.slice(range.index,range.length-1)};

    xhr.open("POST","http://mobilelogger.robertcarlsen.net/api/addSamples");
    xhr.send("data="+JSON.stringify(out));
}
