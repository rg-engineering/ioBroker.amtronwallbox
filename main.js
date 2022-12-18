/*
 * AMTRON wallbox adapter für iobroker
 *
 * Created: 15.05.2022 18:39:28
 *  Author: Rene
*/

"use strict";

const utils = require("@iobroker/adapter-core");
const axios = require('axios');

const CronJob = require("cron").CronJob;

let cronJobs = [];

/*
 * docu see
 https://github.com/orlopau/amtron
 https://forum.iobroker.net/topic/32179/wallbox-mennekes-amtron-auslesen-adapter-aus-skript
 https://github.com/lephisto/amtron


für ChargeControl mit Rest Api
https://office.elinc.de/rest_api

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
                CronStop();
                //clearInterval(intervalID);
                //intervalID = null;
                adapter && adapter.log && adapter.log.info && adapter.log.info("cleaned everything up...");
                callback();
            } catch (e) {
                callback();
            }
        },
        
        stateChange: async (id, state) => {
            await HandleStateChange(id, state);
        },
        //#######################################
        //
    });
    adapter = new utils.Adapter(options);

    return adapter;
}



//let intervalID;
async function main() {

    adapter.log.debug("start  ");

    
    await checkVariables();

    subscribeVars();

    //read all data
    await ReadData();

    let readInterval = 15;
    if (parseInt(adapter.config.readInterval) > 0) {
        readInterval = adapter.config.readInterval;
    }
    else {
        adapter.log.warn("read interval not defined");
    }
    adapter.log.debug("read every  " + readInterval + " minutes");
           
    CronCreate(readInterval, Do)
    
}

async function Do() {

    adapter.log.debug("starting ... " );

    await ReadData();

    //to do
    //await WriteData();
}


async function ReadData(){

    for (const system of adapter.config.WallboxSystems) {

        if (system.IsActive) {
            if (system.Type === "ChargeControl") {
                await read_rest(system);
            }
            else if (system.Type === "Compact") {
                await read_MHCP(system);
            }
            else if (system.Type === "Xtra") {
                await read_MHCP(system);
            }

            else {
                //system type ChargeControl string not yet implemented
                adapter.log.warn("system type " + system.Type + " " + typeof system.Type + " not yet implemented");
            }
        }
    }
    
    
}

async function read_MHCP(system) {

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

        await read_MHCP_DevInfo(system);

        await read_MHCP_ChargeData(system);

        await read_MHCP_StatisticData(system, "Day");
        await read_MHCP_StatisticData(system, "Week");
        await read_MHCP_StatisticData(system, "Month");
        await read_MHCP_StatisticData(system, "Year");
        await read_MHCP_StatisticData(system, "Annual");

    }
    catch (e) {
        adapter.log.error("exception in read_MHCP [" + e + "]");
    }
}

async function read_MHCP_DevInfo(system) {
    //Retrieves information about the wallbox.
    try {
        /*
                var abfrage_DevInfo = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/DevInfo?DevKey=999999";
        */

        let sURL = "http://" + system.IPAddress + ":25000/MHCP/1.0/DevInfo?DevKey=" + system.ApiKey;

        let header = {
            headers: {
                Accept: 'application/json '
            }
        }

        adapter.log.debug("URL " + sURL.replace(/DevKey=.*/, 'DevKey=******'));
        
        let buffer = await axios.get(sURL, header);

        adapter.log.debug("got status data: " + typeof buffer.data + " " + JSON.stringify(buffer.data));
        
        if (buffer != null && buffer.status == 200 && buffer.data != null) {

            for (let entry in buffer.data) {
                await adapter.setStateAsync(system.Name + ".info." + entry, { ack: true, val: buffer.data[entry] });
            }
        }
    }
    catch (e) {
        adapter.log.error("exception in read_MHCP_DevInfo [" + e + "]");
    }
}

async function read_MHCP_ChargeData(system) {
    //Retrieves charge information about the wallbox.
    try {
        /*
                var abfrage_ChargeData = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/ChargeData?DevKey=999999";
        */

        let sURL = "http://" + system.IPAddress + ":25000/MHCP/1.0/ChargeData?DevKey=" + system.ApiKey;

        let header = {
            headers: {
                Accept: 'application/json '
            }
        }

        adapter.log.debug("URL " + sURL.replace(/DevKey=.*/, 'DevKey=******'));

        let buffer = await axios.get(sURL, header);

        adapter.log.debug("got charge data: " + typeof buffer.data + " " + JSON.stringify(buffer.data));

        if (buffer != null && buffer.status == 200 && buffer.data != null) {

            for (let entry in buffer.data) {
                await adapter.setStateAsync(system.Name + ".charge." + entry, { ack: true, val: buffer.data[entry] });
            }
        }
    }
    catch (e) {
        adapter.log.error("exception in read_MHCP_DevInfo [" + e + "]");
    }
}


async function read_MHCP_StatisticData(system, period) {
    //Retrieves statistic about the wallbox.
    try {
        /*
                var abfrage_Statistics_Day = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Day?DevKey=999999";
                var abfrage_Statistics_Week = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Week?DevKey=999999";
                var abfrage_Statistics_Month = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Month?DevKey=999999";
                var abfrage_Statistics_Year = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Year?DevKey=999999";
                var abfrage_Statistics_Annual = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Annual?DevKey=999999";

        */

        let sURL = "http://" + system.IPAddress + ":25000/MHCP/1.0/Statistics/" + period + "?DevKey=" + system.ApiKey;

        let header = {
            headers: {
                Accept: 'application/json '
            }
        }

        adapter.log.debug("URL " + sURL.replace(/DevKey=.*/, 'DevKey=******'));

        let buffer = await axios.get(sURL, header);

        adapter.log.debug("got statistic data: " + period + " " + typeof buffer.data + " " + JSON.stringify(buffer.data));

        if (buffer != null && buffer.status == 200 && buffer.data != null) {

            if (period == "Annual") {
                await adapter.setStateAsync(system.Name + ".Statistics." + period + ".Years", { ack: true, val: JSON.stringify(buffer.data) });
            }
            else {
                for (let entry in buffer.data) {

                    if (entry == "TMaxCurrT1"
                        || entry == "TBeginH_T1"
                        || entry == "TBeginM_T1"
                        || entry == "TPriceT1"
                        || entry == "TMaxCurrT2"
                        || entry == "TBeginH_T2"
                        || entry == "TBeginM_T2"
                        || entry == "TPriceT2"
                        || entry == "TRemoteCurr"
                        || entry == "TSolarPrice"
                        || entry == "TExcessNrg"
                    ) {
                        //do nothing
                    }
                    else {
                        await adapter.setStateAsync(system.Name + ".Statistics." + period + "." + entry, { ack: true, val: buffer.data[entry] });
                    }
                }
            }
        }
    }
    catch (e) {
        adapter.log.error("exception in read_MHCP_DevInfo [" + e + "]");
    }
}

async function read_rest(system) {

    try {

        /*
        http://192.168.3.18/rest/full_state

        conn_state: no_vehicle_connected
        auth_state: not_authorized_for_charging
        auth_uid:
        time_since_charging_start: 0
        meter_wh: 16701
        power_w: 0
        transaction_wh: 0
        cp_id: +49 * 839 * 00000000001
        ocpp_state: available
        type2_state: a
        type2_proximity: cable_attached
        sig_current: 0
        schuko_state: idle
        backend_conn_state: pending
        free_charging: off
        slave_state:
        ocpp_meter_cfg: modbus_meter_nzr
        ocpp_meter_serial: 00202035
        current_a: 0.00, 0.00, 0.00
        energy_man_current: 0
        ambient_temp: +15.00
        firmware_ver: 5.22.1 - 13295
        cc_serial_n: 2202532503 / b94060010me2
        con_cycles_schuko: 0
        con_cycles_type2: 5
        max_current: 16
        rcmb_state: okay
        rcmb_max_values: 0.0, 0.0
        rcmb_current_values: 0.0, 0.0
        cable_attached: on
        schuko_cfg: disable
        rcd_state: disable
        mcb_type2_state: disable
        mcb_schuko_state: disable
        cp_vendor: MENNEKES
        errors: no_errors
        cp_model: CC612_2S0R_CC
        display_text:

        */

        let sURL = "http://" + system.IPAddress + "/rest/full_state";

        let header = {
            headers: {
                Accept: 'application/json '
            }
        }
        adapter.log.debug("URL " + sURL);

        let buffer = await axios.get(sURL, header);

        adapter.log.debug("got data status " + typeof buffer.data + " " + JSON.stringify(buffer.data));
        /*
        got data status string "conn_state:no_vehicle_connected\nauth_state:not_authorized_for_charging\nauth_uid:\ntime_since_charging_start:0\nmeter_wh:16701\npower_w:0\ntransaction_wh:0\ncp_id:+49*839*00000000001\nocpp_state:available\ntype2_state:a\ntype2_proximity:cable_attached\nsig_current:0\nschuko_state:idle\nbackend_conn_state:pending\nfree_charging:off\nslave_state:\nocpp_meter_cfg:modbus_meter_nzr\nocpp_meter_serial:00202035\ncurrent_a:0.00,0.00,0.00\nenergy_man_current:0\nambient_temp:+15.00\nfirmware_ver:5.22.1-13295\ncc_serial_n:2202532503/b94060010me2\ncon_cycles_schuko:0\ncon_cycles_type2:5\nmax_current:16\nrcmb_state:okay\nrcmb_max_values: 0.0, 0.0\nrcmb_current_values: 0.0, 0.0\ncable_attached:on\nschuko_cfg:disable\nrcd_state:disable\nmcb_type2_state:disable\nmcb_schuko_state:disable\ncp_vendor:MENNEKES\nerrors:no_errors\ncp_model:CC612_2S0R_CC\ndisplay_text:"
        */

        if (buffer != null && buffer.status == 200 && buffer.data != null && typeof buffer.data === "string") {

            let data = buffer.data.split(/\r?\n/);

            adapter.log.debug("data " + JSON.stringify(data));
           

            await adapter.setStateAsync(system.Name + ".Connection.State", { ack: true, val: data[0].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".Authorisation.State", { ack: true, val: data[1].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".Authorisation.UID", { ack: true, val: data[2].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".TimeSinceChargingStart", { ack: true, val: Number(data[3].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".Meter", { ack: true, val: Number(data[4].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".Power", { ack: true, val: Number(data[5].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".Transaction", { ack: true, val: Number(data[6].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".CP_ID", { ack: true, val: data[7].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".OCPP.State", { ack: true, val: data[8].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".Type2.State", { ack: true, val: data[9].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".Type2.Proximity", { ack: true, val: data[10].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".SigCurrent", { ack: true, val: Number(data[11].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".Schuko.State", { ack: true, val: data[12].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".Backend.ConnectionState", { ack: true, val: data[13].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".FreeCharging", { ack: true, val: Boolean( data[14].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".SlaveState", { ack: true, val: data[15].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".OCPP.MeterConfig", { ack: true, val: data[16].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".OCPP.MeterSerial", { ack: true, val: data[17].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".Current", { ack: true, val: Number(data[18].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".EnergyManagerCurrent", { ack: true, val: Number(data[19].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".AmbientTemperature", { ack: true, val: data[20].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".FirmwareVersion", { ack: true, val: data[21].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".SerialNumber", { ack: true, val: data[22].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".ContactCyclesSchuko", { ack: true, val: Number(data[23].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".ContactcyclesType2", { ack: true, val: Number(data[24].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".MaxCurrent", { ack: true, val: Number(data[25].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".RCMB.State", { ack: true, val: data[26].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".RCMB.MaxValues", { ack: true, val: data[27].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".RCMB.CurrentValues", { ack: true, val: data[28].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".CableAttached", { ack: true, val: Boolean(data[29].split(":")[1]) });
            await adapter.setStateAsync(system.Name + ".Schuko.Config", { ack: true, val: data[30].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".RCD.State", { ack: true, val: data[31].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".MCB.Type2State", { ack: true, val: data[32].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".MCB.SchukoState", { ack: true, val: data[33].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".CP_Vendor", { ack: true, val: data[34].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".Errors", { ack: true, val: data[35].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".CP_Model", { ack: true, val: data[36].split(":")[1] });
            await adapter.setStateAsync(system.Name + ".DisplayText", { ack: true, val: data[37].split(":")[1] });

            /*
            amtronwallbox.0 	2022-05-20 12:20:53.613	info	State value to set for "amtronwallbox.0.Wallbox.CableAttached" has to be type "boolean" but received type "string"
            amtronwallbox.0 2022-05-20 12:20:53.594	info	State value to set for "amtronwallbox.0.Wallbox.MaxCurrent" has to be type "number" but received type "string"
            amtronwallbox.0	2022-05-20 12:20:53.545	info	State value to set for "amtronwallbox.0.Wallbox.ContactcyclesType2" has to be type "number" but received type "string"
            amtronwallbox.0	2022-05-20 12:20:53.486	info	State value to set for "amtronwallbox.0.Wallbox.ContactCyclesSchuko" has to be type "number" but received type "string"
            amtronwallbox.0	2022-05-20 12:20:53.449	info	State value to set for "amtronwallbox.0.Wallbox.EnergyManagerCurrent" has to be type "number" but received type "string"
            amtronwallbox.0	2022-05-20 12:20:53.406	info	State value to set for "amtronwallbox.0.Wallbox.Current" has to be type "number" but received type "string"
            amtronwallbox.0	2022-05-20 12:20:53.392	info	State value to set for "amtronwallbox.0.Wallbox.FreeCharging" has to be type "boolean" but received type "string"
            amtronwallbox.0	2022-05-20 12:20:53.342	info	State value to set for "amtronwallbox.0.Wallbox.SigCurrent" has to be type "number" but received type "string"
            amtronwallbox.0	2022-05-20 12:20:53.324	info	State value to set for "amtronwallbox.0.Wallbox.Transaction" has to be type "number" but received type "string"
            amtronwallbox.0	2022-05-20 12:20:53.319	info	State value to set for "amtronwallbox.0.Wallbox.Power" has to be type "number" but received type "string"
            amtronwallbox.0	2022-05-20 12:20:53.313	info	State value to set for "amtronwallbox.0.Wallbox.Meter" has to be type "number" but received type "string"
            amtronwallbox.0	2022-05-20 12:20:53.268	info	State value to set for "amtronwallbox.0.Wallbox.TimeSinceChargingStart" has to be type "number" but received type "string"
            
            */
             

        }
        else {
            adapter.log.error("error status: " + JSON.stringify(buffer));
        }


    }
    catch (e) {
        adapter.log.error("exception in read_rest [" + e + "]");
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


    
    for (const system of adapter.config.WallboxSystems) {
        if (system.IsActive) {
            if (system.Type === "ChargeControl") {
                await checkVariables_rest(system);
            }
            else if (system.Type === "Compact") {

            }
            else if (system.Type === "Xtra") {
                await checkVariables_MHCP(system);
            }

            else {
                //system type ChargeControl string not yet implemented
                adapter.log.warn("system type " + system.Type + " " + typeof system.Type + " not yet implemented");
            }
        }
    }
    
}



async function checkVariables_rest(system) {
    let key;
    let obj;

    

    key = system.Name + ".Connection.State";
    obj = {
        type: "state",
        common: {
            name: "Connection State",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Authorisation.State";
    obj = {
        type: "state",
        common: {
            name: "Authorisation State",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Authorisation.UID";
    obj = {
        type: "state",
        common: {
            name: "Authorisation UID",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".TimeSinceChargingStart";
    obj = {
        type: "state",
        common: {
            name: "Time Since Charging Start",
            type: "number",
            role: "value",
            unit: "s",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);


    key = system.Name + ".Meter";
    obj = {
        type: "state",
        common: {
            name: "Meter",
            type: "number",
            role: "value",
            unit: "Wh",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Power";
    obj = {
        type: "state",
        common: {
            name: "Power",
            type: "number",
            role: "value",
            unit: "W",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Transaction";
    obj = {
        type: "state",
        common: {
            name: "Transaction",
            type: "number",
            role: "value",
            unit: "Wh",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".CP_ID";
    obj = {
        type: "state",
        common: {
            name: "System ID",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".OCPP.State";
    obj = {
        type: "state",
        common: {
            name: "OCPP State",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Type2.State";
    obj = {
        type: "state",
        common: {
            name: "Type2 State",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Type2.Proximity";
    obj = {
        type: "state",
        common: {
            name: "Type2 Proximity",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".SigCurrent";
    obj = {
        type: "state",
        common: {
            name: "SIG Current",
            type: "number",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Schuko.State";
    obj = {
        type: "state",
        common: {
            name: "Schuko State",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);


    key = system.Name + ".Backend.ConnectionState";
    obj = {
        type: "state",
        common: {
            name: "Backend Connection State",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);


    key = system.Name + ".FreeCharging";
    obj = {
        type: "state",
        common: {
            name: "FreeCharging",
            type: "boolean",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);


    key = system.Name + ".SlaveState";
    obj = {
        type: "state",
        common: {
            name: "SlaveState",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);


    key = system.Name + ".OCPP.MeterConfig";
    obj = {
        type: "state",
        common: {
            name: "OCPP Meter Config",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".OCPP.MeterSerial";
    obj = {
        type: "state",
        common: {
            name: "OCPP Meter Serial",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Current";
    obj = {
        type: "state",
        common: {
            name: "Current",
            type: "number",
            role: "value",
            unit: "A",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".EnergyManagerCurrent";
    obj = {
        type: "state",
        common: {
            name: "Energy Manager Current",
            type: "number",
            role: "value",
            unit: "A",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".AmbientTemperature";
    obj = {
        type: "state",
        common: {
            name: "AmbientTemperature",
            type: "string",
            role: "value",
            unit: "°C",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".FirmwareVersion";
    obj = {
        type: "state",
        common: {
            name: "FirmwareVersion",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".SerialNumber";
    obj = {
        type: "state",
        common: {
            name: "SerialNumber",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".ContactCyclesSchuko";
    obj = {
        type: "state",
        common: {
            name: "Contact´Cycles Schuko",
            type: "number",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".ContactcyclesType2";
    obj = {
        type: "state",
        common: {
            name: "Contact´Cycles Type2",
            type: "number",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".MaxCurrent";
    obj = {
        type: "state",
        common: {
            name: "Maximun Current",
            type: "number",
            role: "value",
            unit: "A",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".RCMB.State";
    obj = {
        type: "state",
        common: {
            name: "RCMB State",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".RCMB.MaxValues";
    obj = {
        type: "state",
        common: {
            name: "RCMB Maximum Values",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".RCMB.CurrentValues";
    obj = {
        type: "state",
        common: {
            name: "RCMB Current Values",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".CableAttached";
    obj = {
        type: "state",
        common: {
            name: "CableAttached",
            type: "boolean",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);


    key = system.Name + ".Schuko.Config";
    obj = {
        type: "state",
        common: {
            name: "Schuko Config",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".RCD.State";
    obj = {
        type: "state",
        common: {
            name: "RCD State",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".MCB.Type2State";
    obj = {
        type: "state",
        common: {
            name: "MCB Type2 State",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".MCB.SchukoState";
    obj = {
        type: "state",
        common: {
            name: "MCB Schuko State",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".CP_Vendor";
    obj = {
        type: "state",
        common: {
            name: "System Vendor",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Errors";
    obj = {
        type: "state",
        common: {
            name: "Errors",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".CP_Model";
    obj = {
        type: "state",
        common: {
            name: "System Model",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);


    key = system.Name + ".DisplayText";
    obj = {
        type: "state",
        common: {
            name: "Display Text",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

}


async function checkVariables_MHCP(system) {
    let key;
    let obj;

    //dev info data

    key = system.Name + ".info.DevName";
    obj = {
        type: "state",
        common: {
            name: "Name of the device",
            type: "string",
            role: "value",
            read: true,
            write: true
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.LocTime";
    obj = {
        type: "state",
        common: {
            name: "timestamp",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Summer";
    obj = {
        type: "state",
        common: {
            name: "Is summer time?",
            type: "boolean",
            role: "value",
            read: true,
            write: true
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Tz";
    obj = {
        type: "state",
        common: {
            name: "timezone offset in minutes",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.ItemNo";
    obj = {
        type: "state",
        common: {
            name: "item number",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Sn";
    obj = {
        type: "state",
        common: {
            name: "Serial Number",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Hcc3";
    obj = {
        type: "state",
        common: {
            name: "Info about the HCC3 (main controller)",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Hmi";
    obj = {
        type: "state",
        common: {
            name: "Info about hardware software?",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Rfid";
    obj = {
        type: "state",
        common: {
            name: "Info about RFID?",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Wifi";
    obj = {
        type: "state",
        common: {
            name: "WiFi module version?",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.FixedVehCosts";
    obj = {
        type: "state",
        common: {
            name: "Fixed vehicle costs as specified in the app",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.OldVehCosts";
    obj = {
        type: "state",
        common: {
            name: "OldVehicle costs?",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Color";
    obj = {
        type: "state",
        common: {
            name: "?",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.DevMode";
    obj = {
        type: "state",
        common: {
            name: "Curent charging mode",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.ChgState";
    obj = {
        type: "state",
        common: {
            name: "Current charging state",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.WifiOn";
    obj = {
        type: "state",
        common: {
            name: "true if WiFi is on",
            type: "boolean",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.AutoChg";
    obj = {
        type: "state",
        common: {
            name: "true if auto-start charging is enabled",
            type: "boolean",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.ChgContinue";
    obj = {
        type: "state",
        common: {
            name: "true if charging should continue after power outage",
            type: "boolean",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Err";
    obj = {
        type: "state",
        common: {
            name: "current error code, 0 if there is none",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Battery";
    obj = {
        type: "state",
        common: {
            name: "EV battery capacity for EnergyManager in Wh",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Phases";
    obj = {
        type: "state",
        common: {
            name: "number of phases connected",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Cable";
    obj = {
        type: "state",
        common: {
            name: "true if cable is connected/installed?",
            type: "boolean",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.Auth";
    obj = {
        type: "state",
        common: {
            name: "true if auth by rfid is enabled?",
            type: "boolean",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.DsoEnabled";
    obj = {
        type: "state",
        common: {
            name: "?",
            type: "boolean",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.EmEnabled";
    obj = {
        type: "state",
        common: {
            name: "true if EnergyManager mode is enabled",
            type: "boolean",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.MaxCurr";
    obj = {
        type: "state",
        common: {
            name: "currently set max. charging current per phase in A",
            unit: "A",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.MaxPwr";
    obj = {
        type: "state",
        common: {
            name: "currently set max. charging power in W",
            unit: "W",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".info.MaxCurrWb";
    obj = {
        type: "state",
        common: {
            name: "upper limit for charging current per phase in A",
            unit: "A",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    //dev charge data

    key = system.Name + ".charge.ChgState";
    obj = {
        type: "state",
        common: {
            name: "charge state",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.Tariff";
    obj = {
        type: "state",
        common: {
            name: "Current tariff",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.Price";
    obj = {
        type: "state",
        common: {
            name: "Price per kWh with current tariff in 0.1 cents per kWh",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.Uid";
    obj = {
        type: "state",
        common: {
            name: "Uid",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.ChgDuration";
    obj = {
        type: "state",
        common: {
            name: "how long the wallbox is charging the EV",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.ChgNrg";
    obj = {
        type: "state",
        common: {
            name: "how much energy the wallbox has charged in Wh",
            unit: "Wh",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.NrgDemand";
    obj = {
        type: "state",
        common: {
            name: "energy demand of the vehicle in Wh",
            unit: "Wh",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.Solar";
    obj = {
        type: "state",
        common: {
            name: "maybe percentage of solar energy for current charge",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.EmTime";
    obj = {
        type: "state",
        common: {
            name: "time in which the vehicle has to be fully charged, in Energy Manager mode in minutes",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.RemTime";
    obj = {
        type: "state",
        common: {
            name: "time remaining of the set EmTime in minutes",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.ActPwr";
    obj = {
        type: "state",
        common: {
            name: "current power draw of vehicle",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.ActCurr";
    obj = {
        type: "state",
        common: {
            name: "currently set max. charging current per phase in A",
            type: "number",
            unit: "A",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.MaxCurrT1";
    obj = {
        type: "state",
        common: {
            name: "max current per phase in tariff1",
            type: "number",
            unit: "A",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.BeginH_T1";
    obj = {
        type: "state",
        common: {
            name: "?",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.BeginM_T1";
    obj = {
        type: "state",
        common: {
            name: "?",
            type: "number",
            unit: "A",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.PriceT1";
    obj = {
        type: "state",
        common: {
            name: "Price per kWh with Tariff1 in 0.1 cents per kWh",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.MaxCurrT2";
    obj = {
        type: "state",
        common: {
            name: "max current per pahse in tariff2",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.BeginH_T2";
    obj = {
        type: "state",
        common: {
            name: "?",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.BeginM_T2";
    obj = {
        type: "state",
        common: {
            name: "?",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.PriceT2";
    obj = {
        type: "state",
        common: {
            name: "Price per kWh with Tariff2 in 0.1cents",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.RemoteCurr";
    obj = {
        type: "state",
        common: {
            name: "current in A per phase as set by app control mode",
            type: "number",
            unit: "A",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.SolarPrice";
    obj = {
        type: "state",
        common: {
            name: "price for solar energy in 0.1cents per kWh",
            type: "number",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.ExcessNrg";
    obj = {
        type: "state",
        common: {
            name: "if only excess energy should be used in energy manager mode",
            type: "boolean",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".charge.HCCP";
    obj = {
        type: "state",
        common: {
            name: "?",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

    await checkVariables_MHCP_Statistic(system, "Day");
    await checkVariables_MHCP_Statistic(system, "Week");
    await checkVariables_MHCP_Statistic(system, "Month");
    await checkVariables_MHCP_Statistic(system, "Year");

    key = system.Name + ".Statistics.Annual.Years";
    obj = {
        type: "state",
        common: {
            name: "historical year based data",
            type: "string",
            role: "value",
            read: true,
            write: false
        }
    }
    await CreateObject(key, obj);

}


async function checkVariables_MHCP_Statistic(system, period) {
    let key;
    let obj;

    //statistic data

    key = system.Name + ".Statistics." + period + ".ChgNrg";
    obj = {
        type: "state",
        common: {
            name: "Amount of Wh",
            type: "number",
            unit:"Wh",
            role: "value",
            read: true,
            write: true
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Statistics." + period + ".HybridNrg";
    obj = {
        type: "state",
        common: {
            name: "?",
            type: "number",
            role: "value",
            read: true,
            write: true
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Statistics." + period + ".Solar";
    obj = {
        type: "state",
        common: {
            name: "Percentage charged from Solar",
            type: "number",
            role: "value",
            read: true,
            write: true
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Statistics." + period + ".Tariff1";
    obj = {
        type: "state",
        common: {
            name: "Percentage charged at Main Tariff",
            type: "number",
            role: "value",
            read: true,
            write: true
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Statistics." + period + ".Tariff2";
    obj = {
        type: "state",
        common: {
            name: "Percentage charged at Off-peak Tariff",
            type: "number",
            role: "value",
            read: true,
            write: true
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Statistics." + period + ".Hybrid";
    obj = {
        type: "state",
        common: {
            name: "?",
            type: "number",
            role: "value",
            read: true,
            write: true
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Statistics." + period + ".ChgCosts";
    obj = {
        type: "state",
        common: {
            name: "Accumulated Costs",
            type: "number",
            role: "value",
            read: true,
            write: true
        }
    }
    await CreateObject(key, obj);

    key = system.Name + ".Statistics." + period + ".HybridCosts";
    obj = {
        type: "state",
        common: {
            name: "?",
            type: "number",
            role: "value",
            read: true,
            write: true
        }
    }
    await CreateObject(key, obj);


    if (period == "Week" || period == "Month" || period == "Year") {

        key = system.Name + ".Statistics." + period + ".AvgCosts";
        obj = {
            type: "state",
            common: {
                name: "?",
                type: "number",
                role: "value",
                read: true,
                write: true
            }
        }
        await CreateObject(key, obj);

        key = system.Name + ".Statistics." + period + ".FixCosts";
        obj = {
            type: "state",
            common: {
                name: "?",
                type: "number",
                role: "value",
                read: true,
                write: true
            }
        }
        await CreateObject(key, obj);

        key = system.Name + ".Statistics." + period + ".OldCosts";
        obj = {
            type: "state",
            common: {
                name: "?",
                type: "number",
                role: "value",
                read: true,
                write: true
            }
        }
        await CreateObject(key, obj);

        key = system.Name + ".Statistics." + period + ".KmDiff";
        obj = {
            type: "state",
            common: {
                name: "?",
                type: "number",
                role: "value",
                read: true,
                write: true
            }
        }
        await CreateObject(key, obj);

    }

}



async function CreateObject(key, obj) {

    const obj_new = await adapter.getObjectAsync(key);
    //adapter.log.warn("got object " + JSON.stringify(obj_new));

    if (obj_new != null) {

        if ((obj_new.common.role != obj.common.role
            || obj_new.common.type != obj.common.type
            || (obj_new.common.unit != obj.common.unit && obj.common.unit != null)
            || obj_new.common.read != obj.common.read
            || obj_new.common.write != obj.common.write
            || obj_new.common.name != obj.common.name)
            && obj.type === "state"
        ) {
            adapter.log.warn("change object " + JSON.stringify(obj) + " " + JSON.stringify(obj_new));
            await adapter.extendObject(key, {
                common: {
                    name: obj.common.name,
                    role: obj.common.role,
                    type: obj.common.type,
                    unit: obj.common.unit,
                    read: obj.common.read,
                    write: obj.common.write
                }
            });
        }
    }
    else {
        await adapter.setObjectNotExistsAsync(key, obj);
    }
}

//===============================================================================
//cron functions
function CronStop() {
    if (cronJobs.length > 0) {
        adapter.log.debug("delete " + cronJobs.length + " cron jobs");
        //cancel all cron jobs...
        const start = cronJobs.length - 1;
        for (let n = start; n >= 0; n--) {
            cronJobs[n].stop();
        }
        cronJobs = [];
    }
}

function deleteCronJob(id) {

    cronJobs[id].stop();

    if (id === cronJobs.length - 1) {
        cronJobs.pop(); //remove last
    }
    else {
        delete cronJobs[id];
    }
    CronStatus();


}

function CronCreate(Minute, callback) {

    try {

        const timezone = adapter.config.timezone || "Europe/Berlin";

        let cronString = "";
        //https://crontab-generator.org/
        if (Minute == -99) {
            //every day late evening
            cronString = "5 23 * * *";
            //just for logging
            Minute = "late evening";
        }
        else {

            cronString = "*/" + Minute + " * * * * ";
        }

        const nextCron = cronJobs.length;

        adapter.log.debug("create cron job #" + nextCron + " every " + Minute + " string: " + cronString + " " + timezone);

        //details see https://www.npmjs.com/package/cron
        cronJobs[nextCron] = new CronJob(cronString,
            () => callback(),
            () => adapter.log.debug("cron job stopped"), // This function is executed when the job stops
            true,
            timezone
        );

    }
    catch (e) {
        adapter.log.error("exception in CronCreate [" + e + "]");
    }
}

function CronStatus() {
    let n = 0;
    let length = 0;
    try {
        if (typeof cronJobs !== undefined && cronJobs != null) {

            length = cronJobs.length;
            //adapter.log.debug("cron jobs");
            for (n = 0; n < length; n++) {
                if (typeof cronJobs[n] !== undefined && cronJobs[n] != null) {
                    adapter.log.debug("cron status = " + cronJobs[n].running + " next event: " + timeConverter("DE", cronJobs[n].nextDates()));
                }
            }

            if (length > 500) {
                adapter.log.warn("more then 500 cron jobs existing for this adapter, this might be a configuration error! (" + length + ")");
            }
            else {
                adapter.log.info(length + " cron job(s) created");
            }
        }
    }
    catch (e) {
        adapter.log.error("exception in getCronStat [" + e + "] : " + n + " of " + length);
    }
}




// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 