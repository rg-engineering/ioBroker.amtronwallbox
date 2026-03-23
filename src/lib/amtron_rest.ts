/* eslint-disable prefer-template */
import type { Amtronwallbox } from "../main";
import Base from "./base";
import type { AmtronwallboxConfig } from './types';

import axios from "axios";


export default class amtron_rest extends Base {



	constructor(adapter: Amtronwallbox, id: number, config: AmtronwallboxConfig) {
		super(adapter, id, "amtronwallbox" + id, config);
		super(adapter, id, "amtronwallbox" + id, config);


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





	async read_rest(): Promise<void> {

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

			const buffer = await axios.get(sURL, config);

			this.logDebug("got data status " + typeof buffer.data + " " + JSON.stringify(buffer.data));
			/*
			got data status string "conn_state:no_vehicle_connected\nauth_state:not_authorized_for_charging\nauth_uid:\ntime_since_charging_start:0\nmeter_wh:16701\npower_w:0\ntransaction_wh:0\ncp_id:+49*839*00000000001\nocpp_state:available\ntype2_state:a\ntype2_proximity:cable_attached\nsig_current:0\nschuko_state:idle\nbackend_conn_state:pending\nfree_charging:off\nslave_state:\nocpp_meter_cfg:modbus_meter_nzr\nocpp_meter_serial:00202035\ncurrent_a:0.00,0.00,0.00\nenergy_man_current:0\nambient_temp:+15.00\nfirmware_ver:5.22.1-13295\ncc_serial_n:2202532503/b94060010me2\ncon_cycles_schuko:0\ncon_cycles_type2:5\nmax_current:16\nrcmb_state:okay\nrcmb_max_values: 0.0, 0.0\nrcmb_current_values: 0.0, 0.0\ncable_attached:on\nschuko_cfg:disable\nrcd_state:disable\nmcb_type2_state:disable\nmcb_schuko_state:disable\ncp_vendor:MENNEKES\nerrors:no_errors\ncp_model:CC612_2S0R_CC\ndisplay_text:"
			*/

			const SystemName = this.Name.replace(this.GetForbiddenChars(), "_");

			if (buffer != null && buffer.status == 200 && buffer.data != null && typeof buffer.data === "string") {

				const data = buffer.data.split(/\r?\n/);

				this.logDebug("data " + JSON.stringify(data));


				await this.SetState(SystemName + ".Connection.State", true, data[0].split(":")[1]);
				await this.SetState(SystemName + ".Authorisation.State", true, data[1].split(":")[1]);
				await this.SetState(SystemName + ".Authorisation.UID", true, data[2].split(":")[1]);
				await this.SetState(SystemName + ".TimeSinceChargingStart", true, Number(data[3].split(":")[1]));
				await this.SetState(SystemName + ".Meter", true, Number(data[4].split(":")[1]));
				await this.SetState(SystemName + ".Power", true, Number(data[5].split(":")[1]));
				await this.SetState(SystemName + ".Transaction", true, Number(data[6].split(":")[1]));
				await this.SetState(SystemName + ".CP_ID", true, data[7].split(":")[1]);
				await this.SetState(SystemName + ".OCPP.State", true, data[8].split(":")[1]);
				await this.SetState(SystemName + ".Type2.State", true, data[9].split(":")[1]);
				await this.SetState(SystemName + ".Type2.Proximity", true, data[10].split(":")[1]);
				await this.SetState(SystemName + ".SigCurrent", true, Number(data[11].split(":")[1]));
				await this.SetState(SystemName + ".Schuko.State", true, data[12].split(":")[1]);
				await this.SetState(SystemName + ".Backend.ConnectionState", true, data[13].split(":")[1]);
				await this.SetState(SystemName + ".FreeCharging", true, Boolean(data[14].split(":")[1]));
				await this.SetState(SystemName + ".SlaveState", true, data[15].split(":")[1]);
				await this.SetState(SystemName + ".OCPP.MeterConfig", true, data[16].split(":")[1]);
				await this.SetState(SystemName + ".OCPP.MeterSerial", true, data[17].split(":")[1]);
				await this.SetState(SystemName + ".Current", true, Number(data[18].split(":")[1]));
				await this.SetState(SystemName + ".EnergyManagerCurrent", true, Number(data[19].split(":")[1]));
				await this.SetState(SystemName + ".AmbientTemperature", true, data[20].split(":")[1]);
				await this.SetState(SystemName + ".FirmwareVersion", true, data[21].split(":")[1]);
				await this.SetState(SystemName + ".SerialNumber", true, data[22].split(":")[1]);
				await this.SetState(SystemName + ".ContactCyclesSchuko", true, Number(data[23].split(":")[1]));
				await this.SetState(SystemName + ".ContactcyclesType2", true, Number(data[24].split(":")[1]));
				await this.SetState(SystemName + ".MaxCurrent", true, Number(data[25].split(":")[1]));
				await this.SetState(SystemName + ".RCMB.State", true, data[26].split(":")[1]);
				await this.SetState(SystemName + ".RCMB.MaxValues", true, data[27].split(":")[1]);
				await this.SetState(SystemName + ".RCMB.CurrentValues", true, data[28].split(":")[1]);
				await this.SetState(SystemName + ".CableAttached", true, Boolean(data[29].split(":")[1]));
				await this.SetState(SystemName + ".Schuko.Config", true, data[30].split(":")[1]);
				await this.SetState(SystemName + ".RCD.State", true, data[31].split(":")[1]);
				await this.SetState(SystemName + ".MCB.Type2State", true, data[32].split(":")[1]);
				await this.SetState(SystemName + ".MCB.SchukoState", true, data[33].split(":")[1]);
				await this.SetState(SystemName + ".CP_Vendor", true, data[34].split(":")[1]);
				await this.SetState(SystemName + ".Errors", true, data[35].split(":")[1]);
				await this.SetState(SystemName + ".CP_Model", true, data[36].split(":")[1]);
				await this.SetState(SystemName + ".DisplayText", true, data[37].split(":")[1]);

			} else {
				this.logError("error status: " + JSON.stringify(buffer));
			}


		} catch (e) {
			this.logError("exception in read_rest [" + e + "]");
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
				type: "number",
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
				type: "string",
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

	}
}
