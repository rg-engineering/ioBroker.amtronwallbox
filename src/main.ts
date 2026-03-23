/* eslint-disable prefer-template */
/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// https://www.iobroker.net/#en/documentation/dev/adapterdev.md

import * as utils from "@iobroker/adapter-core";

import amtron_MHCP from "./lib/amtron_MHCP";
import amtron_rest from "./lib/amtron_rest";

export class Amtronwallbox extends utils.Adapter {

	private wallboxes: (amtron_MHCP | amtron_rest)[] = [];

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "amtronwallbox",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("objectChange", this.onObjectChange.bind(this));
		this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Wird aufgerufen, wenn die Datenbanken verbunden sind und die Adapter-Konfiguration empfangen wurde.
	 */
	private async onReady(): Promise<void> {
		this.log.debug(JSON.stringify(this.config));

		try {
			if (!Array.isArray(this.config.wallboxes)) {
				this.log.error("Keine Wallbox-Konfiguration gefunden.");
				return;
			}

			for (let l = 0; l < this.config.wallboxes.length; l++) {
				const config = this.config.wallboxes[l];

				if (config && config.IsActive) {
					this.log.debug("Erzeuge Instanz der Amtronwallbox");

					if (config.Type === "ChargeControl") {
						const instance = new amtron_rest(this, l + 1, config);
						this.wallboxes.push(instance);
					} else if (config.Type === "Compact" || config.Type === "Xtra") {
						const instance = new amtron_MHCP(this, l + 1, config);
						this.wallboxes.push(instance);
					} else {
						this.log.error("Systemtyp " + config.Type + " (" + typeof config.Type + ") ist noch nicht implementiert");
					}
				}
			}

			for (let n = 0; n < this.wallboxes.length; n++) {
				// Muss auch in den Cron / Intervall
				await this.wallboxes[n].Start();
			}

		} catch (e) {
			this.log.error("Exception in onReady [" + e + "]");
		}
	}

	/**
	 * Wird aufgerufen, wenn der Adapter heruntergefahren wird - Callback MUSS unter allen Umständen aufgerufen werden!
	 */
	private async onUnload(callback: () => void): Promise<void> {
		try {
			// Hier müssen alle Timeouts oder Intervalle gelöscht werden, die noch aktiv sein könnten
			for (let n = 0; n < this.wallboxes.length; n++) {
				await this.wallboxes[n].Stop();
			}
			callback();
		} catch (e) {
			this.log.error("Exception in onUnload " + e);
			callback();
		}
	}

	/**
	 * Wird aufgerufen, wenn ein abonniertes Objekt geändert wird
	 */
	private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
		if (obj) {
			this.log.info(`Objekt ${id} geändert: ${JSON.stringify(obj)}`);
		} else {
			this.log.info(`Objekt ${id} gelöscht`);
		}
	}

	/**
	 * Wird aufgerufen, wenn ein abonnierter State geändert wird
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// State wurde geändert
		} else {
			this.log.info(`State ${id} gelöscht`);
		}
	}

	/**
	 * Nachrichtenbehandlung
	 */
	private async onMessage(obj: ioBroker.Message): Promise<void> {
		this.log.info("on message " + JSON.stringify(obj));
		if (typeof obj === "object" && obj.command) {
			if (obj.command === "´xxx") {
				if (obj.callback) {
					this.sendTo(obj.from, obj.command, "", obj.callback);
				}
			}
		}
	}
}

if (require.main !== module) {
	// Exportiere den Konstruktor im Kompaktmodus
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Amtronwallbox(options);
} else {
	// Starte die Instanz direkt
	(() => new Amtronwallbox())();
}