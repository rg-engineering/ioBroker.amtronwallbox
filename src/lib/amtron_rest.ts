/* eslint-disable prefer-template */
import type { Amtronwallbox } from "../main";
import Base from "./base";
import type { AmtronwallboxConfig } from './types';

import axios from "axios";


export default class amtron_rest extends Base {



	constructor(adapter: Amtronwallbox, id: number, config: AmtronwallboxConfig, readInterval: number, timezone: string) {
		super(adapter, id, "amtronwallbox" + id, config, readInterval, timezone);
		


	}


	async Start(): Promise<void> {


		// call base class Start method
		await super.Start();

		await this.checkVariables();

		//read all data
		await this.ReadData();

	}





	async ReadData(): Promise<void> {
		await super.ReadData();
		await this.read_rest();

	}

	parseDeviceData(rawText: string): Record<string, string | string[]> {
		const result: Record<string, string | string[]> = {};
		if (!rawText || typeof rawText !== "string") {
			this.logError("parseDeviceData: Ungültiger Eingabetext");
			return result;
		}
		const lines = rawText.split("\n");
		for (let line of lines) {
			line = line.trim();
			if (!line) {
				continue;
			}
			const [key, ...rest] = line.split(":");
			if (!key) {
				this.logError(`parseDeviceData: Zeile ohne Schlüssel: "${line}"`);
				continue;
			}
			const valueRaw = rest.join(":").trim();
			let value: string | string[] = valueRaw;
			if (valueRaw.includes(",")) {
				value = valueRaw.split(",").map(v => v.trim());
			}
			result[key.trim()] = value;
		}
		return result;
	}




	async read_rest(): Promise<void> {

		try {

			/*
			http://192.168.3.18/rest/full_state
	
			//alt
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


			//SW version 5.33
conn_state:no_vehicle_connected
auth_state:not_authorized_for_charging
auth_uid:
time_since_charging_start:0
meter_wh:399529
power_w:0
voltage_v:232,233,233
transaction_wh:0
cp_id:+49*839*00000000001
ocpp_state:available
type2_state:a
type2_proximity:cable_attached
sig_current:0
schuko_state:idle
backend_conn_state:pending
free_charging:off
slave_state:
ocpp_meter_cfg:modbus_meter_nzr_ecocount_s85_or_sl85
ocpp_meter_serial:00202035
current_a:0.00,0.01,0.00
energy_man_current:0
ambient_temp:+7.00
firmware_ver:5.33.9-21459
cc_serial_n:2202532503/b94060010me2
con_cycles_schuko:0
con_cycles_type2:212
max_current:16
rcmb_state:okay
rcmb_max_values: 0.0, 0.0
rcmb_current_values: 0.0, 0.0
cable_attached:on
schuko_cfg:disable
rcd_state:disable
mcb_type2_state:disable
mcb_schuko_state:disable
cp_vendor:MENNEKES
errors:keine_fehler
cp_model:CC612_2S0R_CC
display_text:
wlan_state:wlan_disconnected
	
			*/

			const sURL = "http://" + this.IPAddress + "/rest/full_state";

			const header = {
				headers: {
					Accept: "application/json "
				}
			};
			const config = {

				header: header,
				timeout: 5000
			};
			this.logDebug("URL " + sURL);

			let buffer;
			try {
				buffer = await axios.get(sURL, config);
			} catch (err) {
				this.logError("HTTP-Fehler beim Abruf: " + String(err));
				return;
			}

			if (!buffer || buffer.status !== 200 || typeof buffer.data !== "string") {
				this.logError("Fehlerhafte Antwort: " + JSON.stringify(buffer));
				return;
			}

			const SystemName = this.Name.replace(this.GetForbiddenChars(), "_");
			let result: Record<string, string | string[]>;
			try {
				result = this.parseDeviceData(buffer.data);
			} catch (err) {
				this.logError("Fehler beim Parsen der Gerätedaten: " + String(err));
				return;
			}
			this.logDebug("parsed data " + JSON.stringify(result));

			// Hilfsfunktion für robustes Setzen von States
			const safeSetState = async (key: string, ack: boolean, value: any) : Promise<void> => {
				try {
					await this.SetState(key, ack, value);
				} catch (err) {
					
					this.logError("Fehler beim Setzen von State " + key + ": " + String(err));
				}
			};

			// Beispiel für robustes Setzen (nur ein paar States exemplarisch, Rest analog)
			await safeSetState(SystemName + ".Connection.State", true, Array.isArray(result.conn_state) ? result.conn_state.join(",") : result.conn_state ?? "");
			await safeSetState(SystemName + ".Authorisation.State", true, Array.isArray(result.auth_state) ? result.auth_state.join(",") : result.auth_state ?? "");
			await safeSetState(SystemName + ".Authorisation.UID", true, Array.isArray(result.auth_uid) ? result.auth_uid.join(",") : result.auth_uid ?? "");
			await safeSetState(SystemName + ".TimeSinceChargingStart", true, Number(result.time_since_charging_start) || 0);
			await safeSetState(SystemName + ".Meter", true, Number(result.meter_wh) || 0);
			await safeSetState(SystemName + ".Power", true, Number(result.power_w) || 0);
			await safeSetState(SystemName + ".Voltage", true, Array.isArray(result.voltage_v) ? result.voltage_v.join(",") : result.voltage_v);
			await safeSetState(SystemName + ".Transaction", true, Number(result.transaction_wh) || 0);
			await safeSetState(SystemName + ".CP_ID", true, Array.isArray(result.cp_id) ? result.cp_id.join(",") : result.cp_id);
			await safeSetState(SystemName + ".OCPP.State", true, Array.isArray(result.ocpp_state) ? result.ocpp_state.join(",") : result.ocpp_state);
			await safeSetState(SystemName + ".Type2.State", true, Array.isArray(result.type2_state) ? result.type2_state.join(",") : result.type2_state);
			await safeSetState(SystemName + ".Type2.Proximity", true, Array.isArray(result.type2_proximity) ? result.type2_proximity.join(",") : result.type2_proximity);
			await safeSetState(SystemName + ".SigCurrent", true, Number(result.sig_current));
			await safeSetState(SystemName + ".Schuko.State", true, Array.isArray(result.schuko_state) ? result.schuko_state.join(",") : result.schuko_state);
			await safeSetState(SystemName + ".Backend.ConnectionState", true, Array.isArray(result.backend_conn_state) ? result.backend_conn_state.join(",") : result.backend_conn_state);
			await safeSetState(SystemName + ".FreeCharging", true, Boolean(result.free_charging));
			await safeSetState(SystemName + ".SlaveState", true, Array.isArray(result.slave_state) ? result.slave_state.join(",") : result.slave_state);
			await safeSetState(SystemName + ".OCPP.MeterConfig", true, Array.isArray(result.ocpp_meter_cfg) ? result.ocpp_meter_cfg.join(",") : result.ocpp_meter_cfg);
			await safeSetState(SystemName + ".OCPP.MeterSerial", true, Array.isArray(result.ocpp_meter_serial) ? result.ocpp_meter_serial.join(",") : result.ocpp_meter_serial);
			await safeSetState(SystemName + ".Current", true, Array.isArray(result.current_a) ? result.current_a.join(",") : result.current_a);
			await safeSetState(SystemName + ".EnergyManagerCurrent", true, Number(result.energy_man_current));
			await safeSetState(SystemName + ".AmbientTemperature", true, Number(result.ambient_temp));

			this.sVersion = Array.isArray(result.firmware_ver) ? result.firmware_ver.join(",") : result.firmware_ver;

			await safeSetState(SystemName + ".FirmwareVersion", true, this.sVersion);
			await safeSetState(SystemName + ".SerialNumber", true, Array.isArray(result.cc_serial_n) ? result.cc_serial_n.join(",") : result.cc_serial_n);
			await safeSetState(SystemName + ".ContactCyclesSchuko", true, Number(result.con_cycles_schuko));
			await safeSetState(SystemName + ".ContactcyclesType2", true, Number(result.con_cycles_type2));
			await safeSetState(SystemName + ".MaxCurrent", true, Number(result.max_current));
			await safeSetState(SystemName + ".RCMB.State", true, Array.isArray(result.rcmb_state) ? result.rcmb_state.join(",") : result.rcmb_state);
			await safeSetState(SystemName + ".RCMB.MaxValues", true, Array.isArray(result.rcmb_max_values) ? result.rcmb_max_values.join(",") : result.rcmb_max_values);
			await safeSetState(SystemName + ".RCMB.CurrentValues", true, Array.isArray(result.rcmb_current_values) ? result.rcmb_current_values.join(",") : result.rcmb_current_values);
			await safeSetState(SystemName + ".CableAttached", true, Boolean(result.cable_attached));
			await safeSetState(SystemName + ".Schuko.Config", true, Array.isArray(result.schuko_cfg) ? result.schuko_cfg.join(",") : result.schuko_cfg);
			await safeSetState(SystemName + ".RCD.State", true, Array.isArray(result.rcd_state) ? result.rcd_state.join(",") : result.rcd_state);
			await safeSetState(SystemName + ".MCB.Type2State", true, Array.isArray(result.mcb_type2_state) ? result.mcb_type2_state.join(",") : result.mcb_type2_state);
			await safeSetState(SystemName + ".MCB.SchukoState", true, Array.isArray(result.mcb_schuko_state) ? result.mcb_schuko_state.join(",") : result.mcb_schuko_state);
			await safeSetState(SystemName + ".CP_Vendor", true, Array.isArray(result.cp_vendor) ? result.cp_vendor.join(",") : result.cp_vendor);
			await safeSetState(SystemName + ".Errors", true, Array.isArray(result.errors) ? result.errors.join(",") : result.errors);
			await safeSetState(SystemName + ".CP_Model", true, Array.isArray(result.cp_model) ? result.cp_model.join(",") : result.cp_model);
			await safeSetState(SystemName + ".DisplayText", true, Array.isArray(result.display_text) ? result.display_text.join(",") : result.display_text);
			await safeSetState(SystemName + ".WLANstate", true, Array.isArray(result.wlan_state) ? result.wlan_state.join(",") : result.wlan_state);

		} catch (e) {
			this.logError("exception in read_rest [" + String(e) + "]");
		}
	}

	async checkVariables(): Promise<void> {
		this.logDebug("init variables ");

		await this.checkVariables_rest();
	}


	async checkVariables_rest(): Promise<void> {
		let key;
		let obj;

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


		key = SystemName + ".Connection";
		obj = {
			type: "channel",
			common: {
				name: "Connection ",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".Authorisation";
		obj = {
			type: "channel",
			common: {
				name: "Authorisation ",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".Backend";
		obj = {
			type: "channel",
			common: {
				name: "Backend ",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".MCB";
		obj = {
			type: "channel",
			common: {
				name: "MCB",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".OCPP";
		obj = {
			type: "channel",
			common: {
				name: "OCPP",
				role: "",
				type: "",
				unit: "",
				read: true,
			write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".RCD";
		obj = {
			type: "channel",
			common: {
				name: "RCD",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".RCMB";
		obj = {
			type: "channel",
			common: {
				name: "RCMB",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".Schuko";
		obj = {
			type: "channel",
			common: {
				name: "Schuko",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".Type2";
		obj = {
			type: "channel",
			common: {
				name: "Type2",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".Connection";
		obj = {
			type: "channel",
			common: {
				name: "Connection",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);


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
		await this.CreateObject(key, obj);

		key = SystemName + ".Authorisation";
		obj = {
			type: "channel",
			common: {
				name: "Authorisation",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

		

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);


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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

		key = SystemName + ".OCPP";
		obj = {
			type: "channel",
			common: {
				name: "OCPP",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

		key = SystemName + ".Type2";
		obj = {
			type: "channel",
			common: {
				name: "Type2",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);


		key = SystemName + ".Schuko";
		obj = {
			type: "channel",
			common: {
				name: "Schuko",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

		key = SystemName + ".Backend";
		obj = {
			type: "channel",
			common: {
				name: "Backend",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);


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
		await this.CreateObject(key, obj);


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
		await this.CreateObject(key, obj);


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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

		key = SystemName + ".Current";
		obj = {
			type: "state",
			common: {
				name: "Current",
				type: "string",
			    role: "value.current",
				unit: "A",
				read: true,
				write: false
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

		key = SystemName + ".AmbientTemperature";
		obj = {
			type: "state",
			common: {
				name: "AmbientTemperature",
				type: "number",
				role: "value.temperature",
				unit: "°C",
				read: true,
				write: false
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);


		key = SystemName + ".RCMB";
		obj = {
			type: "channel",
			common: {
				name: "RCMB",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);


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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);


		key = SystemName + ".MCB";
		obj = {
			type: "channel",
			common: {
				name: "MCB",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);

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
		await this.CreateObject(key, obj);


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
		await this.CreateObject(key, obj);


		key = SystemName + ".Voltage";
		obj = {
			type: "state",
			common: {
				name: "Voltage",
				type: "string",
				role: "info.status",
				unit: "",
				read: true,
				write: false
			}
		};
		await this.CreateObject(key, obj);

		key = SystemName + ".WLANstate";
		obj = {
			type: "state",
			common: {
				name: "WLANstate",
				type: "string",
				role: "info.status",
				unit: "",
				read: true,
				write: false
			}
		};
		await this.CreateObject(key, obj);

	}
}
