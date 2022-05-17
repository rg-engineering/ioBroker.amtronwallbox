/*
 * pvoutputorg adapter für iobroker
 *
 * Created: 15.05.2022 18:39:28
 *  Author: Rene
*/

"use strict";

const utils = require("@iobroker/adapter-core");
const axios = require('axios');

/*
 * docu see
 https://github.com/orlopau/amtron
 https://forum.iobroker.net/topic/32179/wallbox-mennekes-amtron-auslesen-adapter-aus-skript

*/
  


let adapter;
function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: "amtronwallbox",
        //#######################################
        //
        ready: function () {
            try {
                //adapter.log.debug('start');
                main();
            }
            catch (e) {
                adapter.log.error("exception catch after ready [" + e + "]");
            }
        },
        //#######################################
        //  is called when adapter shuts down
        unload: function (callback) {
            try {
                adapter && adapter.log && adapter.log.info && adapter.log.info("cleaned everything up...");
                //to do stop intervall
                callback();
            } catch (e) {
                callback();
            }
        },
        //#######################################
        //
        SIGINT: function () {
            clearInterval(intervalID);
            intervalID = null;
            adapter && adapter.log && adapter.log.info && adapter.log.info("cleaned everything up...");
            CronStop();
        },
        //#######################################
        //  is called if a subscribed object changes
        //objectChange: function (id, obj) {
        //    adapter.log.debug("[OBJECT CHANGE] ==== " + id + " === " + JSON.stringify(obj));
        //},
        //#######################################
        // is called if a subscribed state changes
        //stateChange: function (id, state) {
        //HandleStateChange(id, state);
        //},
        stateChange: async (id, state) => {
            await HandleStateChange(id, state);
        },
        //#######################################
        //
    });
    adapter = new utils.Adapter(options);

    return adapter;
}



let intervalID;
async function main() {

    adapter.log.debug("start  ");

    
    await checkVariables();

    subscribeVars();


    let readInterval = 15;
    if (parseInt(adapter.config.readInterval) > 0) {
        readInterval = adapter.config.readInterval;
    }
    else {
        adapter.log.warn("read interval not defined");
    }
    adapter.log.debug("read every  " + readInterval + " minutes");
    intervalID = setInterval(Do, readInterval * 60 * 1000);
    
}

async function Do() {

    adapter.log.debug("starting ... " );

    await ReadData();

    //to do
    //await WriteData();
}


async function ReadData(){

    read()
    
}


async function read() {

    try {

        /*
        var abfrage_DevInfo = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/DevInfo?DevKey=999999";
        var abfrage_ChargeData = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/ChargeData?DevKey=999999";
        var abfrage_Statistics_Day = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Day?DevKey=999999";
        var abfrage_Statistics_Week = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Week?DevKey=999999";
        var abfrage_Statistics_Month = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Month?DevKey=999999";
        var abfrage_Statistics_Year = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Year?DevKey=999999";
        var abfrage_Statistics_Annual = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Annual?DevKey=999999";
        */


        let sURL = "http://http://192.168.3.18:25000/MHCP/1.0/DevInfo?DevKey=GXvPp6Yv";


        adapter.log.debug("URL " + sURL);

        let buffer = await axios.get(sURL);

        adapter.log.debug("got data status " + typeof buffer.data + " " + JSON.stringify(buffer.data));
        

    }
    catch (e) {
        adapter.log.error("exception in read [" + e + "]");
    }
}


function toDate(sDate) {

    //yyyymmdd
    const year = sDate.slice(0, 4);
    const month = sDate.slice(4, 6);
    const day = sDate.slice(6, 9);

    let oDate = new Date(year, month - 1, day);

    return oDate.toLocaleDateString();
}

async function HandleStateChange(id, state) {
   

    if (state.ack !== true) {

        adapter.log.debug("handle state change " + id);
        const ids = id.split(".");

        //just dummy
        //if (ids[2] === "cmd") {
        //    await do_Command();
        //}
        //else {
            adapter.log.warn("unhandled state change " + id);
        //}
    }

}

function subscribeVars() {
    //adapter.subscribeStates("cmd");
}


async function checkVariables() {
    adapter.log.debug("init variables ");


    
    /*
        key = system.Name + ".System.Longitude";
        await adapter.setObjectNotExistsAsync(key, {
            type: "state",
            common: {
                name: "Longitude",
                type: "number",
                role: "value",
                read: true,
                write: false,
                unit: ""
            }
        });

    */


    
    
}




// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 