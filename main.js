/*
 * AMTRON wallbox adapter für iobroker
 *
 * Created: 15.05.2022 18:39:28
 *  Author: Rene
*/

"use strict";

const utils = require("@iobroker/adapter-core");
const axios = require("axios");

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

	CronCreate(readInterval, Do);

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

		const sURL = "http://" + system.IPAddress + ":25000/MHCP/1.0/DevInfo?DevKey=" + system.ApiKey;

		const header = {
			headers: {
				Accept: "application/json "
			}
		};

		const config = {

			header,
			timeout: 5000
		};

		adapter.log.debug("URL " + sURL.replace(/DevKey=.*/, "DevKey=******"));

		const buffer = await axios.get(sURL, null, config);

		adapter.log.debug("got status data: " + typeof buffer.data + " " + JSON.stringify(buffer.data));

		/*
			"DevName":"Wall-e",
			"LocTime":1703263828,
			"Summer":true,
			"Tz":120,
			"ItemNo":"1344201",
			"Sn":420101388,
			"Hcc3":"HCC3 V1.13",
			"Hmi":"SW:1.8 HW:0x3 SN:0xa",
			"Rfid":null,
			"Wifi":"BA 1.1.9",
			"FixedVehCosts":0,
			"OldVehCosts":0,
			"Color":0,
			"DevMode":"Remote",
			"ChgState":"Idle",
			"WifiOn":true,
			"AutoChg":true,
			"ChgContinue":true,
			"Err":0,
			"Battery":5000,
			"Phases":3,
			"Cable":true,
			"Auth":false,
			"DsoEnabled":false,
			"EmEnabled":false,
			"MaxCurr":0,
			"MaxPwr":0,
			"MaxCurrWb":0
*/

		const SystemName = system.Name.replace(adapter.FORBIDDEN_CHARS, "_");

		if (buffer != null && buffer.status == 200 && buffer.data != null) {

			for (const entry in buffer.data) {
				await adapter.setStateAsync(SystemName + ".info." + entry, { ack: true, val: buffer.data[entry] });
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

		const sURL = "http://" + system.IPAddress + ":25000/MHCP/1.0/ChargeData?DevKey=" + system.ApiKey;

		const header = {
			headers: {
				Accept: "application/json "
			}
		};
		const config = {

			header,
			timeout: 5000
		};

		adapter.log.debug("URL " + sURL.replace(/DevKey=.*/, "DevKey=******"));

		const buffer = await axios.get(sURL, null, config);

		adapter.log.debug("got charge data: " + typeof buffer.data + " " + JSON.stringify(buffer.data));

		/*

			"ChgState": "Idle",
			"Tariff": "T1",
			"Price": 270,
			"Uid": "",
			"ChgDuration": 18613,
			"ChgNrg": 12648,
			"NrgDemand": 0,
			"Solar": 0,
			"EmTime": 1440,
			"RemTime": 1440,
			"ActPwr": 0,
			"ActCurr": 0,
			"MaxCurrT1": 0,
			"BeginH_T1": 4,
			"BeginM_T1": 30,
			"PriceT1": 270,
			"MaxCurrT2": 0,
			"BeginH_T2": 22,
			"BeginM_T2": 0,
			"PriceT2": 200,
			"RemoteCurr": 0,
			"SolarPrice": 0,
			"ExcessNrg": true,
			"TMaxCurrT1": 0,
			"TBeginH_T1": 4,
			"TBeginM_T1": 30,
			"TPriceT1": 270,
			"TMaxCurrT2": 0,
			"TBeginH_T2": 22,
			"TBeginM_T2": 0,
			"TPriceT2": 200,
			"TRemoteCurr": 0,
			"TSolarPrice": 0,
			"TExcessNrg": true,
			"HCCP": "A11"
			*/





		const SystemName = system.Name.replace(adapter.FORBIDDEN_CHARS, "_");

		if (buffer != null && buffer.status == 200 && buffer.data != null) {

			for (const entry in buffer.data) {

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
					await adapter.setStateAsync(SystemName + ".charge." + entry, { ack: true, val: buffer.data[entry] });
				}
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

		const sURL = "http://" + system.IPAddress + ":25000/MHCP/1.0/Statistics/" + period + "?DevKey=" + system.ApiKey;

		const header = {
			headers: {
				Accept: "application/json "
			}
		};
		const config = {

			header,
			timeout: 5000
		};
		adapter.log.debug("URL " + sURL.replace(/DevKey=.*/, "DevKey=******"));

		const buffer = await axios.get(sURL, null, config);

		adapter.log.debug("got statistic data: " + period + " " + typeof buffer.data + " " + JSON.stringify(buffer.data));

		const SystemName = system.Name.replace(adapter.FORBIDDEN_CHARS, "_");

		if (buffer != null && buffer.status == 200 && buffer.data != null) {

			if (period == "Annual") {
				await adapter.setStateAsync(SystemName + ".Statistics." + period + ".Years", { ack: true, val: JSON.stringify(buffer.data) });
			}
			else {
				for (const entry in buffer.data) {

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
						await adapter.setStateAsync(SystemName + ".Statistics." + period + "." + entry, { ack: true, val: buffer.data[entry] });
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

		const sURL = "http://" + system.IPAddress + "/rest/full_state";

		const header = {
			headers: {
				Accept: "application/json "
			}
		};
		const config = {

			header,
			timeout: 5000
		};
		adapter.log.debug("URL " + sURL);

		const buffer = await axios.get(sURL, null, config);

		adapter.log.debug("got data status " + typeof buffer.data + " " + JSON.stringify(buffer.data));
		/*
        got data status string "conn_state:no_vehicle_connected\nauth_state:not_authorized_for_charging\nauth_uid:\ntime_since_charging_start:0\nmeter_wh:16701\npower_w:0\ntransaction_wh:0\ncp_id:+49*839*00000000001\nocpp_state:available\ntype2_state:a\ntype2_proximity:cable_attached\nsig_current:0\nschuko_state:idle\nbackend_conn_state:pending\nfree_charging:off\nslave_state:\nocpp_meter_cfg:modbus_meter_nzr\nocpp_meter_serial:00202035\ncurrent_a:0.00,0.00,0.00\nenergy_man_current:0\nambient_temp:+15.00\nfirmware_ver:5.22.1-13295\ncc_serial_n:2202532503/b94060010me2\ncon_cycles_schuko:0\ncon_cycles_type2:5\nmax_current:16\nrcmb_state:okay\nrcmb_max_values: 0.0, 0.0\nrcmb_current_values: 0.0, 0.0\ncable_attached:on\nschuko_cfg:disable\nrcd_state:disable\nmcb_type2_state:disable\nmcb_schuko_state:disable\ncp_vendor:MENNEKES\nerrors:no_errors\ncp_model:CC612_2S0R_CC\ndisplay_text:"
        */

		const SystemName = system.Name.replace(adapter.FORBIDDEN_CHARS, "_");

		if (buffer != null && buffer.status == 200 && buffer.data != null && typeof buffer.data === "string") {

			const data = buffer.data.split(/\r?\n/);

			adapter.log.debug("data " + JSON.stringify(data));


			await adapter.setStateAsync(SystemName + ".Connection.State", { ack: true, val: data[0].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".Authorisation.State", { ack: true, val: data[1].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".Authorisation.UID", { ack: true, val: data[2].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".TimeSinceChargingStart", { ack: true, val: Number(data[3].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".Meter", { ack: true, val: Number(data[4].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".Power", { ack: true, val: Number(data[5].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".Transaction", { ack: true, val: Number(data[6].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".CP_ID", { ack: true, val: data[7].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".OCPP.State", { ack: true, val: data[8].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".Type2.State", { ack: true, val: data[9].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".Type2.Proximity", { ack: true, val: data[10].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".SigCurrent", { ack: true, val: Number(data[11].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".Schuko.State", { ack: true, val: data[12].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".Backend.ConnectionState", { ack: true, val: data[13].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".FreeCharging", { ack: true, val: Boolean( data[14].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".SlaveState", { ack: true, val: data[15].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".OCPP.MeterConfig", { ack: true, val: data[16].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".OCPP.MeterSerial", { ack: true, val: data[17].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".Current", { ack: true, val: Number(data[18].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".EnergyManagerCurrent", { ack: true, val: Number(data[19].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".AmbientTemperature", { ack: true, val: data[20].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".FirmwareVersion", { ack: true, val: data[21].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".SerialNumber", { ack: true, val: data[22].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".ContactCyclesSchuko", { ack: true, val: Number(data[23].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".ContactcyclesType2", { ack: true, val: Number(data[24].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".MaxCurrent", { ack: true, val: Number(data[25].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".RCMB.State", { ack: true, val: data[26].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".RCMB.MaxValues", { ack: true, val: data[27].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".RCMB.CurrentValues", { ack: true, val: data[28].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".CableAttached", { ack: true, val: Boolean(data[29].split(":")[1]) });
			await adapter.setStateAsync(SystemName + ".Schuko.Config", { ack: true, val: data[30].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".RCD.State", { ack: true, val: data[31].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".MCB.Type2State", { ack: true, val: data[32].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".MCB.SchukoState", { ack: true, val: data[33].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".CP_Vendor", { ack: true, val: data[34].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".Errors", { ack: true, val: data[35].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".CP_Model", { ack: true, val: data[36].split(":")[1] });
			await adapter.setStateAsync(SystemName + ".DisplayText", { ack: true, val: data[37].split(":")[1] });

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

/*
function toDate(sDate) {

	//yyyymmdd
	const year = sDate.slice(0, 4);
	const month = sDate.slice(4, 6);
	const day = sDate.slice(6, 9);

	const oDate = new Date(year, month - 1, day);

	return oDate.toLocaleDateString();
}
*/

async function HandleStateChange(id, state) {


	if (state.ack !== true) {

		adapter.log.debug("handle state change " + id + " with " + state.val);
		const ids = id.split(".");

		//unhandled state change amtronwallbox.0.Test.info.DevName
		if (ids[3] === "info") {
			await updateInfo(id, state);
			adapter.setForeignState(id, { ack: true });
		}
		else if (ids[3] === "charge") {
			await updateCharge(id, state);
			adapter.setForeignState(id, { ack: true });
		}
		else {
			adapter.log.warn("unhandled state change " + id);
		}
	}
}

async function updateInfo(id,state) {

	const systemName = id.split(".")[2];

	const SystemName = systemName.replace(adapter.FORBIDDEN_CHARS, "_");

	for (const system of adapter.config.WallboxSystems) {

		if (SystemName == systemName && system.IsActive) {
			if (system.Type === "ChargeControl") {
				//nothing to do
			}
			else if (system.Type === "Compact") {
				await write_MHCP_DevInfo(system, id,state);
			}
			else if (system.Type === "Xtra") {
				await write_MHCP_DevInfo(system, id, state);
			}

			else {
				//system type ChargeControl string not yet implemented
				adapter.log.warn("system type " + system.Type + " " + typeof system.Type + " not yet implemented");
			}
		}
	}
}

async function updateCharge(id, state) {

	const systemName = id.split(".")[2];

	const SystemName = systemName.replace(adapter.FORBIDDEN_CHARS, "_");

	for (const system of adapter.config.WallboxSystems) {

		if (SystemName == systemName && system.IsActive) {
			if (system.Type === "ChargeControl") {
				//nothing to do
			}
			else if (system.Type === "Compact") {
				await write_MHCP_ChargeData(system, id, state);
			}
			else if (system.Type === "Xtra") {
				await write_MHCP_ChargeData(system, id, state);
			}

			else {
				//system type ChargeControl string not yet implemented
				adapter.log.warn("system type " + system.Type + " " + typeof system.Type + " not yet implemented");
			}
		}
	}
}

async function write_MHCP_DevInfo(system, id, state) {
	try {
		const sURL = "http://" + system.IPAddress + ":25000/MHCP/1.0/DevInfo?DevKey=" + system.ApiKey;

		const config = {
			headers: {
				Accept: "application/json "
			},
			timeout: 5000

		};

		const param = id.split(".")[4];

		const data = {
			"DevName": param == "DevName" ? state.val : null,
			"LocTime": param == "LocTime" ? state.val : null,
			"Summer": param == "Summer" ? state.val : null,
			"Tz": param == "Tz" ? state.val : null,
			"FixedVehCosts": param == "FixedVehCosts" ? state.val : null,
			"OldVehCosts": param == "OldVehCosts" ? state.val : null,
			"Battery": param == "Battery" ? state.val : null,
			"DevMode": param == "DevMode" ? state.val : null,
		};

		adapter.log.debug("URL " + sURL.replace(/DevKey=.*/, "DevKey=******") + " data " + JSON.stringify(data));


		const buffer = await axios.post(sURL, data, config);

		adapter.log.debug("got result " + typeof buffer.data + " " + JSON.stringify(buffer.data));


	}
	catch (e) {
		adapter.log.error("exception in write_MHCP_DevInfo [" + e + "]");
	}
}

async function write_MHCP_ChargeData(system, id, state) {
	try {
		const sURL = "http://" + system.IPAddress + ":25000/MHCP/1.0/ChargeData?DevKey=" + system.ApiKey;

		const config = {
			headers: {
				Accept: "application/json "
			},
			timeout: 5000

		};

		const param = id.split(".")[4];

		const data = {
			"Permanent": true,
			"RemoteCurr": param == "RemoteCurr" ? state.val : null,
			"AutoChg": param == "AutoChg" ? state.val : null,
			"ChgState": param == "ChgState" ? state.val : null,
			"Uid": param == "Uid" ? state.val : null,
		};

		adapter.log.debug("URL " + sURL.replace(/DevKey=.*/, "DevKey=******") + " data " + JSON.stringify(data));


		const buffer = await axios.post(sURL, data, config);

		adapter.log.debug("got result " + typeof buffer.data + " " + JSON.stringify(buffer.data));


	}
	catch (e) {
		adapter.log.error("exception in write_MHCP_ChargeData [" + e + "]");
	}
}

function subscribeVars() {
	for (const system of adapter.config.WallboxSystems) {

		if (system.IsActive) {
			if (system.Type === "ChargeControl") {
				//nothing to do
			}
			else if (system.Type === "Compact") {
				//nothing to do
			}
			else if (system.Type === "Xtra") {

				const SystemName = system.Name.replace(adapter.FORBIDDEN_CHARS, "_");

				//All parameters can be set to null if no change is intended.
				//https://github.com/lephisto/amtron/blob/master/docs/api/DevInfo/post.md
				adapter.subscribeStates(SystemName + ".info.DevName");
				adapter.subscribeStates(SystemName + ".info.LocTime");
				adapter.subscribeStates(SystemName + ".info.Summer");
				adapter.subscribeStates(SystemName + ".info.Tz");
				adapter.subscribeStates(SystemName + ".info.FixedVehCosts");
				adapter.subscribeStates(SystemName + ".info.OldVehCosts");
				adapter.subscribeStates(SystemName + ".info.Battery");
				adapter.subscribeStates(SystemName + ".info.DevMode");

				//All parameters except "Permanent" can be set to null if no change is intended.
				//https://github.com/lephisto/amtron/blob/master/docs/api/ChargeData/post.md
				//adapter.subscribeStates(SystemName + ".charge.Permanent");
				adapter.subscribeStates(SystemName + ".charge.RemoteCurr");
				//adapter.subscribeStates(SystemName + ".charge.AutoChg"); //gibt es den DP?
				adapter.subscribeStates(SystemName + ".charge.ChgState");
				adapter.subscribeStates(SystemName + ".charge.Uid");

				//Solar price can be set to null when no changes have to be made.
				//https://github.com/lephisto/amtron/blob/master/docs/api/HomeManager/post.md


				//https://github.com/lephisto/amtron/blob/master/docs/api/Whitelist/post.md


			}

			else {
				//system type ChargeControl string not yet implemented
				adapter.log.warn("system type " + system.Type + " " + typeof system.Type + " not yet implemented");
			}
		}
	}


}


async function checkVariables() {
	adapter.log.debug("init variables ");



	for (const system of adapter.config.WallboxSystems) {
		if (system.IsActive) {
			if (system.Type === "ChargeControl") {
				await checkVariables_rest(system);
			}
			else if (system.Type === "Compact") {
				//nothing to do
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

	const SystemName = system.Name.replace(adapter.FORBIDDEN_CHARS, "_");

	key = SystemName;
	obj = {
		type: "channel",
		common: {
			name: "Wallbox " + SystemName,
			role: "",
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".Connection";
	obj = {
		type: "channel",
		common: {
			name: "Connection ",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Authorisation";
	obj = {
		type: "channel",
		common: {
			name: "Authorisation ",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Backend";
	obj = {
		type: "channel",
		common: {
			name: "Backend ",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".MCB";
	obj = {
		type: "channel",
		common: {
			name: "MCB",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".OCPP";
	obj = {
		type: "channel",
		common: {
			name: "OCPP",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".RCD";
	obj = {
		type: "channel",
		common: {
			name: "RCD",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".RCMB";
	obj = {
		type: "channel",
		common: {
			name: "RCMB",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Schuko";
	obj = {
		type: "channel",
		common: {
			name: "Schuko",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Type2";
	obj = {
		type: "channel",
		common: {
			name: "Type2",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Connection";
	obj = {
		type: "channel",
		common: {
			name: "Connection",
			role: "",
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".Connection.State";
	obj = {
		type: "state",
		common: {
			name: "Connection State",
			type: "string",
			role: "info.status",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Authorisation";
	obj = {
		type: "channel",
		common: {
			name: "Authorisation",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Authorisation.State";
	obj = {
		type: "state",
		common: {
			name: "Authorisation State",
			type: "string",
			role: "info.status",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Authorisation.UID";
	obj = {
		type: "state",
		common: {
			name: "Authorisation UID",
			type: "string",
			role: "info",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".TimeSinceChargingStart";
	obj = {
		type: "state",
		common: {
			name: "Time Since Charging Start",
			type: "number",
			role: "time.span",
			unit: "s",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".Meter";
	obj = {
		type: "state",
		common: {
			name: "Meter",
			type: "number",
			role: "value.energy",
			unit: "Wh",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Power";
	obj = {
		type: "state",
		common: {
			name: "Power",
			type: "number",
			role: "value.power",
			unit: "W",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Transaction";
	obj = {
		type: "state",
		common: {
			name: "Transaction",
			type: "number",
			role: "value.energy",
			unit: "Wh",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".CP_ID";
	obj = {
		type: "state",
		common: {
			name: "System ID",
			type: "string",
			role: "info",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".OCPP";
	obj = {
		type: "channel",
		common: {
			name: "OCPP",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".OCPP.State";
	obj = {
		type: "state",
		common: {
			name: "OCPP State",
			type: "string",
			role: "info.status",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Type2";
	obj = {
		type: "channel",
		common: {
			name: "Type2",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Type2.State";
	obj = {
		type: "state",
		common: {
			name: "Type2 State",
			type: "string",
			role: "info.status",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Type2.Proximity";
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
	};
	await CreateObject(key, obj);

	key = SystemName + ".SigCurrent";
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
	};
	await CreateObject(key, obj);


	key = SystemName + ".Schuko";
	obj = {
		type: "channel",
		common: {
			name: "Schuko",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Schuko.State";
	obj = {
		type: "state",
		common: {
			name: "Schuko State",
			type: "string",
			role: "info.status",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Backend";
	obj = {
		type: "channel",
		common: {
			name: "Backend",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Backend.ConnectionState";
	obj = {
		type: "state",
		common: {
			name: "Backend Connection State",
			type: "string",
			role: "info.status",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".FreeCharging";
	obj = {
		type: "state",
		common: {
			name: "FreeCharging",
			type: "boolean",
			role: "indicator",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".SlaveState";
	obj = {
		type: "state",
		common: {
			name: "SlaveState",
			type: "string",
			role: "info.status",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".OCPP.MeterConfig";
	obj = {
		type: "state",
		common: {
			name: "OCPP Meter Config",
			type: "string",
			role: "info",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".OCPP.MeterSerial";
	obj = {
		type: "state",
		common: {
			name: "OCPP Meter Serial",
			type: "string",
			role: "info",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Current";
	obj = {
		type: "state",
		common: {
			name: "Current",
			type: "number",
			role: "value.current",
			unit: "A",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".EnergyManagerCurrent";
	obj = {
		type: "state",
		common: {
			name: "Energy Manager Current",
			type: "number",
			role: "value.current",
			unit: "A",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".AmbientTemperature";
	obj = {
		type: "state",
		common: {
			name: "AmbientTemperature",
			type: "string",
			role: "value.temperature",
			unit: "°C",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".FirmwareVersion";
	obj = {
		type: "state",
		common: {
			name: "FirmwareVersion",
			type: "string",
			role: "info",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".SerialNumber";
	obj = {
		type: "state",
		common: {
			name: "SerialNumber",
			type: "string",
			role: "info",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".ContactCyclesSchuko";
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
	};
	await CreateObject(key, obj);

	key = SystemName + ".ContactcyclesType2";
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
	};
	await CreateObject(key, obj);

	key = SystemName + ".MaxCurrent";
	obj = {
		type: "state",
		common: {
			name: "Maximun Current",
			type: "number",
			role: "value.current",
			unit: "A",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".RCMB";
	obj = {
		type: "channel",
		common: {
			name: "RCMB",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".RCMB.State";
	obj = {
		type: "state",
		common: {
			name: "RCMB State",
			type: "string",
			role: "info.status",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".RCMB.MaxValues";
	obj = {
		type: "state",
		common: {
			name: "RCMB Maximum Values",
			type: "string",
			role: "value.max",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".RCMB.CurrentValues";
	obj = {
		type: "state",
		common: {
			name: "RCMB Current Values",
			type: "string",
			role: "value.current",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".CableAttached";
	obj = {
		type: "state",
		common: {
			name: "CableAttached",
			type: "boolean",
			role: "indicator",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".Schuko.Config";
	obj = {
		type: "state",
		common: {
			name: "Schuko Config",
			type: "string",
			role: "info",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".RCD.State";
	obj = {
		type: "state",
		common: {
			name: "RCD State",
			type: "string",
			role: "info.status",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".MCB";
	obj = {
		type: "channel",
		common: {
			name: "MCB",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".MCB.Type2State";
	obj = {
		type: "state",
		common: {
			name: "MCB Type2 State",
			type: "string",
			role: "info.status",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".MCB.SchukoState";
	obj = {
		type: "state",
		common: {
			name: "MCB Schuko State",
			type: "string",
			role: "info.status",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".CP_Vendor";
	obj = {
		type: "state",
		common: {
			name: "System Vendor",
			type: "string",
			role: "info",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Errors";
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
	};
	await CreateObject(key, obj);

	key = SystemName + ".CP_Model";
	obj = {
		type: "state",
		common: {
			name: "System Model",
			type: "string",
			role: "info.hardware",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".DisplayText";
	obj = {
		type: "state",
		common: {
			name: "Display Text",
			type: "string",
			role: "info.display",
			unit: "",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

}


async function checkVariables_MHCP(system) {
	let key;
	let obj;

	//dev info data

	const SystemName = system.Name.replace(adapter.FORBIDDEN_CHARS, "_");

	key = SystemName ;
	obj = {
		type: "channel",
		common: {
			name: "Wallbox "  + SystemName,
			role: "",
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".info";
	obj = {
		type: "channel",
		common: {
			name: "info",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.DevName";
	obj = {
		type: "state",
		common: {
			name: "Name of the device",
			type: "string",
			role: "info.name",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.LocTime";
	obj = {
		type: "state",
		common: {
			name: "timestamp",
			type: "number",
			role: "date",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Summer";
	obj = {
		type: "state",
		common: {
			name: "Is summer time?",
			type: "boolean",
			role: "indicator",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Tz";
	obj = {
		type: "state",
		common: {
			name: "timezone offset in minutes",
			type: "number",
			role: "value",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.ItemNo";
	obj = {
		type: "state",
		common: {
			name: "item number",
			type: "string",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Sn";
	obj = {
		type: "state",
		common: {
			name: "Serial Number",
			type: "number",
			role: "info.serial",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Hcc3";
	obj = {
		type: "state",
		common: {
			name: "Info about the HCC3 (main controller)",
			type: "string",
			role: "info.hardware",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Hmi";
	obj = {
		type: "state",
		common: {
			name: "Info about hardware software?",
			type: "string",
			role: "info.hardware",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Rfid";
	obj = {
		type: "state",
		common: {
			name: "Info about RFID?",
			type: "string",
			role: "info.hardware",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Wifi";
	obj = {
		type: "state",
		common: {
			name: "WiFi module version?",
			type: "string",
			role: "info.hardware",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.FixedVehCosts";
	obj = {
		type: "state",
		common: {
			name: "Fixed vehicle costs as specified in the app",
			type: "number",
			role: "value",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.OldVehCosts";
	obj = {
		type: "state",
		common: {
			name: "OldVehicle costs?",
			type: "number",
			role: "value",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Color";
	obj = {
		type: "state",
		common: {
			name: "?",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.DevMode";
	obj = {
		type: "state",
		common: {
			name: "Curent charging mode",
			type: "string",
			role: "value",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.ChgState";
	obj = {
		type: "state",
		common: {
			name: "Current charging state",
			type: "string",
			role: "info.status",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.WifiOn";
	obj = {
		type: "state",
		common: {
			name: "true if WiFi is on",
			type: "boolean",
			role: "indicator",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.AutoChg";
	obj = {
		type: "state",
		common: {
			name: "true if auto-start charging is enabled",
			type: "boolean",
			role: "indicator",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.ChgContinue";
	obj = {
		type: "state",
		common: {
			name: "true if charging should continue after power outage",
			type: "boolean",
			role: "indicator",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Err";
	obj = {
		type: "state",
		common: {
			name: "current error code, 0 if there is none",
			type: "number",
			role: "indicator",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Battery";
	obj = {
		type: "state",
		common: {
			name: "EV battery capacity for EnergyManager in Wh",
			type: "number",
			role: "value.energy",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Phases";
	obj = {
		type: "state",
		common: {
			name: "number of phases connected",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Cable";
	obj = {
		type: "state",
		common: {
			name: "true if cable is connected/installed?",
			type: "boolean",
			role: "indicator",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.Auth";
	obj = {
		type: "state",
		common: {
			name: "true if auth by rfid is enabled?",
			type: "boolean",
			role: "indicator",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.DsoEnabled";
	obj = {
		type: "state",
		common: {
			name: "?",
			type: "boolean",
			role: "indicator",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.EmEnabled";
	obj = {
		type: "state",
		common: {
			name: "true if EnergyManager mode is enabled",
			type: "boolean",
			role: "indicator",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.MaxCurr";
	obj = {
		type: "state",
		common: {
			name: "currently set max. charging current per phase in A",
			unit: "A",
			type: "number",
			role: "value.power",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.MaxPwr";
	obj = {
		type: "state",
		common: {
			name: "currently set max. charging power in W",
			unit: "W",
			type: "number",
			role: "value.power",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".info.MaxCurrWb";
	obj = {
		type: "state",
		common: {
			name: "upper limit for charging current per phase in A",
			unit: "A",
			type: "number",
			role: "value.current",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	//dev charge data
	key = SystemName + ".charge";
	obj = {
		type: "channel",
		common: {
			name: "charge",
			role: "",
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".charge.ChgState";
	obj = {
		type: "state",
		common: {
			name: "charge state",
			type: "string",
			role: "info.status",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.Tariff";
	obj = {
		type: "state",
		common: {
			name: "Current tariff",
			type: "string",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.Price";
	obj = {
		type: "state",
		common: {
			name: "Price per kWh with current tariff in 0.1 cents per kWh",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.Uid";
	obj = {
		type: "state",
		common: {
			name: "Uid",
			type: "string",
			role: "info",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.ChgDuration";
	obj = {
		type: "state",
		common: {
			name: "how long the wallbox is charging the EV",
			type: "number",
			role: "time.span",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.ChgNrg";
	obj = {
		type: "state",
		common: {
			name: "how much energy the wallbox has charged in Wh",
			unit: "Wh",
			type: "number",
			role: "value.energy",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.NrgDemand";
	obj = {
		type: "state",
		common: {
			name: "energy demand of the vehicle in Wh",
			unit: "Wh",
			type: "number",
			role: "value.energy",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.Solar";
	obj = {
		type: "state",
		common: {
			name: "maybe percentage of solar energy for current charge",
			type: "number",
			role: "value.energy",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.EmTime";
	obj = {
		type: "state",
		common: {
			name: "time in which the vehicle has to be fully charged, in Energy Manager mode in minutes",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.RemTime";
	obj = {
		type: "state",
		common: {
			name: "time remaining of the set EmTime in minutes",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.ActPwr";
	obj = {
		type: "state",
		common: {
			name: "current power draw of vehicle",
			type: "number",
			role: "value.current",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.ActCurr";
	obj = {
		type: "state",
		common: {
			name: "currently set max. charging current per phase in A",
			type: "number",
			unit: "A",
			role: "value.current",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.MaxCurrT1";
	obj = {
		type: "state",
		common: {
			name: "max current per phase in tariff1",
			type: "number",
			unit: "A",
			role: "value.current",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.BeginH_T1";
	obj = {
		type: "state",
		common: {
			name: "?",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.BeginM_T1";
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
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.PriceT1";
	obj = {
		type: "state",
		common: {
			name: "Price per kWh with Tariff1 in 0.1 cents per kWh",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.MaxCurrT2";
	obj = {
		type: "state",
		common: {
			name: "max current per pahse in tariff2",
			type: "number",
			role: "value.current",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.BeginH_T2";
	obj = {
		type: "state",
		common: {
			name: "?",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.BeginM_T2";
	obj = {
		type: "state",
		common: {
			name: "?",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.PriceT2";
	obj = {
		type: "state",
		common: {
			name: "Price per kWh with Tariff2 in 0.1cents",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.RemoteCurr";
	obj = {
		type: "state",
		common: {
			name: "current in A per phase as set by app control mode",
			type: "number",
			unit: "A",
			role: "value",
			read: true,
			write: true
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.SolarPrice";
	obj = {
		type: "state",
		common: {
			name: "price for solar energy in 0.1cents per kWh",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.ExcessNrg";
	obj = {
		type: "state",
		common: {
			name: "if only excess energy should be used in energy manager mode",
			type: "boolean",
			role: "indicator",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".charge.HCCP";
	obj = {
		type: "state",
		common: {
			name: "?",
			type: "string",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	await checkVariables_MHCP_Statistic(system, "Day");
	await checkVariables_MHCP_Statistic(system, "Week");
	await checkVariables_MHCP_Statistic(system, "Month");
	await checkVariables_MHCP_Statistic(system, "Year");

	key = SystemName + ".Statistics";
	obj = {
		type: "channel",
		common: {
			name: "Statistics",
			role: "",
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".Statistics.Annual";
	obj = {
		type: "channel",
		common: {
			name: "Statistics Year",
			role: "",
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".Statistics.Annual.Years";
	obj = {
		type: "state",
		common: {
			name: "historical year based data",
			type: "string",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

}


async function checkVariables_MHCP_Statistic(system, period) {
	let key;
	let obj;

	//statistic data

	const SystemName = system.Name.replace(adapter.FORBIDDEN_CHARS, "_");

	key = SystemName + ".Statistics";
	obj = {
		type: "channel",
		common: {
			name: "Statistics",
			role: "",
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Statistics" + period;
	obj = {
		type: "channel",
		common: {
			name: "Statistics period " + period,
			role: "",
		}
	};
	await CreateObject(key, obj);


	key = SystemName + ".Statistics." + period + ".ChgNrg";
	obj = {
		type: "state",
		common: {
			name: "Amount of Wh",
			type: "number",
			unit:"Wh",
			role: "value.energy",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Statistics." + period + ".HybridNrg";
	obj = {
		type: "state",
		common: {
			name: "?",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Statistics." + period + ".Solar";
	obj = {
		type: "state",
		common: {
			name: "Percentage charged from Solar",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Statistics." + period + ".Tariff1";
	obj = {
		type: "state",
		common: {
			name: "Percentage charged at Main Tariff",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Statistics." + period + ".Tariff2";
	obj = {
		type: "state",
		common: {
			name: "Percentage charged at Off-peak Tariff",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Statistics." + period + ".Hybrid";
	obj = {
		type: "state",
		common: {
			name: "?",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Statistics." + period + ".ChgCosts";
	obj = {
		type: "state",
		common: {
			name: "Accumulated Costs",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);

	key = SystemName + ".Statistics." + period + ".HybridCosts";
	obj = {
		type: "state",
		common: {
			name: "?",
			type: "number",
			role: "value",
			read: true,
			write: false
		}
	};
	await CreateObject(key, obj);


	if (period == "Week" || period == "Month" || period == "Year") {

		key = SystemName + ".Statistics." + period + ".AvgCosts";
		obj = {
			type: "state",
			common: {
				name: "?",
				type: "number",
				role: "value",
				read: true,
				write: false
			}
		};
		await CreateObject(key, obj);

		key = SystemName + ".Statistics." + period + ".FixCosts";
		obj = {
			type: "state",
			common: {
				name: "?",
				type: "number",
				role: "value",
				read: true,
				write: false
			}
		};
		await CreateObject(key, obj);

		key = SystemName + ".Statistics." + period + ".OldCosts";
		obj = {
			type: "state",
			common: {
				name: "?",
				type: "number",
				role: "value",
				read: true,
				write: false
			}
		};
		await CreateObject(key, obj);

		key = SystemName + ".Statistics." + period + ".KmDiff";
		obj = {
			type: "state",
			common: {
				name: "?",
				type: "number",
				role: "value",
				read: true,
				write: false
			}
		};
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
		if (cronJobs !== undefined && cronJobs != null) {

			length = cronJobs.length;
			//adapter.log.debug("cron jobs");
			for (n = 0; n < length; n++) {
				if ( cronJobs[n] !== undefined && cronJobs[n] != null) {
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