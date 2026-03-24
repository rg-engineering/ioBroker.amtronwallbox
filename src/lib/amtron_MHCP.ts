/* eslint-disable prefer-template */
import type { Amtronwallbox } from "../main";
import Base from "./base";
import type { AmtronwallboxConfig } from './types';

import axios from "axios";


export default class amtron_MHCP extends Base {
	


	constructor(adapter: Amtronwallbox, id: number, config: AmtronwallboxConfig, readInterval:number, timezone:string) {
		super(adapter, id, "amtronwallbox" + id, config, readInterval, timezone);

		
	}

	
	async Start(): Promise<void> {

		await super.Start();

		await this.checkVariables();

		this.subscribeVars();

		//read all data
		await this.ReadData();

	}
	


	
	

	async ReadData():Promise<void> {

        await super.ReadData();
		await this.read_MHCP();

	}

	async read_MHCP():Promise<void> {

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

			await this.read_MHCP_DevInfo();

			await this.read_MHCP_ChargeData();

			await this.read_MHCP_StatisticData("Day");
			await this.read_MHCP_StatisticData("Week");
			await this.read_MHCP_StatisticData("Month");
			await this.read_MHCP_StatisticData("Year");
			await this.read_MHCP_StatisticData("Annual");

		} catch (e) {
			this.logError("exception in read_MHCP [" + e + "]");
		}
	}

	async read_MHCP_DevInfo(): Promise<void> {
		//Retrieves information about the wallbox.
		try {
			/*
					var abfrage_DevInfo = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/DevInfo?DevKey=999999";
			*/

			const sURL = "http://" + this.IPAddress + ":25000/MHCP/1.0/DevInfo?DevKey=" + this.ApiKey;

			const header = {
				headers: {
					Accept: "application/json "
				}
			};

			const config = {

				header,
				timeout: 5000
			};

			this.logDebug("URL " + sURL.replace(/DevKey=.*/, "DevKey=******"));

			const buffer = await axios.get(sURL, config);

			this.logDebug("got status data: " + typeof buffer.data + " " + JSON.stringify(buffer.data));

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

			const SystemName = this.Name.replace(this.GetForbiddenChars(), "_");

			if (buffer != null && buffer.status == 200 && buffer.data != null) {

				for (const entry in buffer.data) {
					await this.SetState(SystemName + ".info." + entry, true, buffer.data[entry]);

					if (entry == "Hmi") {
                        this.sVersion = buffer.data[entry];
					}
				}
			}
		} catch (e) {
			this.logError("exception in read_MHCP_DevInfo [" + e + "]");
		}
	}

	async read_MHCP_ChargeData(): Promise<void> {
		//Retrieves charge information about the wallbox.
		try {
			/*
					var abfrage_ChargeData = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/ChargeData?DevKey=999999";
			*/

			const sURL = "http://" + this.IPAddress + ":25000/MHCP/1.0/ChargeData?DevKey=" + this.ApiKey;

			const header = {
				headers: {
					Accept: "application/json "
				}
			};
			const config = {

				header,
				timeout: 5000
			};

			this.logDebug("URL " + sURL.replace(/DevKey=.*/, "DevKey=******"));

			const buffer = await axios.get(sURL, config);

			this.logDebug("got charge data: " + typeof buffer.data + " " + JSON.stringify(buffer.data));

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





			const SystemName = this.Name.replace(this.GetForbiddenChars(), "_");

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
					} else {
						await this.SetState(SystemName + ".charge." + entry, true, buffer.data[entry]);
					}
				}
			}
		} catch (e) {
			this.logError("exception in read_MHCP_DevInfo [" + e + "]");
		}
	}


	async read_MHCP_StatisticData(period: string): Promise<void>{
		//Retrieves statistic about the wallbox.
		try {
			/*
					var abfrage_Statistics_Day = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Day?DevKey=999999";
					var abfrage_Statistics_Week = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Week?DevKey=999999";
					var abfrage_Statistics_Month = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Month?DevKey=999999";
					var abfrage_Statistics_Year = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Year?DevKey=999999";
					var abfrage_Statistics_Annual = "curl -H 'Accept: application/json' http://10.0.1.28:25000/MHCP/1.0/Statistics/Annual?DevKey=999999";
	
			*/

			const sURL = "http://" + this.IPAddress + ":25000/MHCP/1.0/Statistics/" + period + "?DevKey=" + this.ApiKey;

			const header = {
				headers: {
					Accept: "application/json "
				}
			};
			const config = {

				header,
				timeout: 5000
			};
			this.logDebug("URL " + sURL.replace(/DevKey=.*/, "DevKey=******"));

			const buffer = await axios.get(sURL, config);

			this.logDebug("got statistic data: " + period + " " + typeof buffer.data + " " + JSON.stringify(buffer.data));

			const SystemName = this.Name.replace(this.GetForbiddenChars(), "_");

			if (buffer != null && buffer.status == 200 && buffer.data != null) {

				if (period == "Annual") {
					await this.SetState(SystemName + ".Statistics." + period + ".Years", true, JSON.stringify(buffer.data));
				} else {
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
						} else {
							await this.SetState(SystemName + ".Statistics." + period + "." + entry, true, buffer.data[entry]);
						}
					}
				}
			}
		} catch (e) {
			this.logError("exception in read_MHCP_DevInfo [" + e + "]");
		}
	}



	async checkVariables(): Promise<void> {
		this.logDebug("init variables ");




		
				await this.checkVariables_MHCP();
		


	}


	subscribeVars(): void {
		


			if (this.Type === "ChargeControl") {
				//nothing to do
			} else if (this.Type === "Compact") {
				//nothing to do
			} else if (this.Type === "Xtra") {

				const SystemName = this.Name.replace(this.GetForbiddenChars(), "_");

				if (this.adapter == null) {
					this.logError("adapter is null");
					return;
				}


				//All parameters can be set to null if no change is intended.
				//https://github.com/lephisto/amtron/blob/master/docs/api/DevInfo/post.md
				this.adapter.subscribeStates(SystemName + ".info.DevName");
				this.adapter.subscribeStates(SystemName + ".info.LocTime");
				this.adapter.subscribeStates(SystemName + ".info.Summer");
				this.adapter.subscribeStates(SystemName + ".info.Tz");
				this.adapter.subscribeStates(SystemName + ".info.FixedVehCosts");
				this.adapter.subscribeStates(SystemName + ".info.OldVehCosts");
				this.adapter.subscribeStates(SystemName + ".info.Battery");
				this.adapter.subscribeStates(SystemName + ".info.DevMode");

				//All parameters except "Permanent" can be set to null if no change is intended.
				//https://github.com/lephisto/amtron/blob/master/docs/api/ChargeData/post.md
				//adapter.subscribeStates(SystemName + ".charge.Permanent");
				this.adapter.subscribeStates(SystemName + ".charge.RemoteCurr");
				//adapter.subscribeStates(SystemName + ".charge.AutoChg"); //gibt es den DP?
				this.adapter.subscribeStates(SystemName + ".charge.ChgState");
				this.adapter.subscribeStates(SystemName + ".charge.Uid");

				//Solar price can be set to null when no changes have to be made.
				//https://github.com/lephisto/amtron/blob/master/docs/api/HomeManager/post.md


				//https://github.com/lephisto/amtron/blob/master/docs/api/Whitelist/post.md


			} else {
				//system type ChargeControl string not yet implemented
				this.logWarn("system type " + this.Type + " " + typeof this.Type + " not yet implemented");
			}
		
	}


	async checkVariables_MHCP(): Promise<void>{
		let key;
		let obj;

		//dev info data

		const SystemName = this.Name.replace(this.GetForbiddenChars(), "_");

		key = SystemName;
		obj = {
			type: "channel",
			common: {
				name: "Wallbox " + SystemName,
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);


		key = SystemName + ".info";
		obj = {
			type: "channel",
			common: {
				name: "info",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

		//dev charge data
		key = SystemName + ".charge";
		obj = {
			type: "channel",
			common: {
				name: "charge",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);


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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

		await this.checkVariables_MHCP_Statistic("Day");
		await this.checkVariables_MHCP_Statistic("Week");
		await this.checkVariables_MHCP_Statistic("Month");
		await this.checkVariables_MHCP_Statistic("Year");

		key = SystemName + ".Statistics";
		obj = {
			type: "channel",
			common: {
				name: "Statistics",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);


		key = SystemName + ".Statistics.Annual";
		obj = {
			type: "channel",
			common: {
				name: "Statistics Year",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);


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
		await this.CreateObject(key, obj);

	}


	async checkVariables_MHCP_Statistic(period: string): Promise<void> {
		let key;
		let obj;

		//statistic data

		const SystemName = this.Name.replace(this.GetForbiddenChars(), "_");

		key = SystemName + ".Statistics";
		obj = {
			type: "channel",
			common: {
				name: "Statistics",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".Statistics" + period;
		obj = {
			type: "channel",
			common: {
				name: "Statistics period " + period,
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);


		key = SystemName + ".Statistics." + period + ".ChgNrg";
		obj = {
			type: "state",
			common: {
				name: "Amount of Wh",
				type: "number",
				unit: "Wh",
				role: "value.energy",
				read: true,
				write: false
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);


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
			await this.CreateObject(key, obj);

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
			await this.CreateObject(key, obj);

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
			await this.CreateObject(key, obj);

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
			await this.CreateObject(key, obj);

		}
	}


	
}
