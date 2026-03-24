"use strict";
/* eslint-disable prefer-template */
/*
 * Created with @iobroker/create-adapter v2.6.5
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Amtronwallbox = void 0;
// https://www.iobroker.net/#en/documentation/dev/adapterdev.md
const utils = __importStar(require("@iobroker/adapter-core"));
const amtron_MHCP_1 = __importDefault(require("./lib/amtron_MHCP"));
const amtron_rest_1 = __importDefault(require("./lib/amtron_rest"));
class Amtronwallbox extends utils.Adapter {
    wallboxes = [];
    constructor(options = {}) {
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
    async onReady() {
        this.log.debug(JSON.stringify(this.config));
        try {
            if (!Array.isArray(this.config.WallboxSystems)) {
                this.log.error("no Wallbox-config found.");
                return;
            }
            for (let l = 0; l < this.config.WallboxSystems.length; l++) {
                const config = this.config.WallboxSystems[l];
                if (config && config.IsActive) {
                    this.log.debug("create amtron wallbox instance");
                    if (config.Type === "ChargeControl") {
                        const instance = new amtron_rest_1.default(this, l + 1, config, this.config.readInterval, this.config.timezone);
                        this.wallboxes.push(instance);
                    }
                    else if (config.Type === "Compact" || config.Type === "Xtra") {
                        const instance = new amtron_MHCP_1.default(this, l + 1, config, this.config.readInterval, this.config.timezone);
                        this.wallboxes.push(instance);
                    }
                    else {
                        this.log.error("Systemtyp " + config.Type + " (" + typeof config.Type + ") not yet implemented");
                    }
                }
            }
            for (let n = 0; n < this.wallboxes.length; n++) {
                // Muss auch in den Cron / Intervall
                await this.wallboxes[n].Start();
            }
        }
        catch (e) {
            this.log.error("Exception in onReady [" + e + "]");
        }
    }
    /**
     * Wird aufgerufen, wenn der Adapter heruntergefahren wird - Callback MUSS unter allen Umständen aufgerufen werden!
     */
    async onUnload(callback) {
        try {
            // Hier müssen alle Timeouts oder Intervalle gelöscht werden, die noch aktiv sein könnten
            for (let n = 0; n < this.wallboxes.length; n++) {
                await this.wallboxes[n].Stop();
            }
            callback();
        }
        catch (e) {
            this.log.error("Exception in onUnload " + e);
            callback();
        }
    }
    /**
     * Wird aufgerufen, wenn ein abonniertes Objekt geändert wird
     */
    onObjectChange(id, obj) {
        if (obj) {
            this.log.info(`Objekt ${id} geändert: ${JSON.stringify(obj)}`);
        }
        else {
            this.log.info(`Objekt ${id} gelöscht`);
        }
    }
    /**
     * Wird aufgerufen, wenn ein abonnierter State geändert wird
     */
    onStateChange(id, state) {
        if (state) {
            // State wurde geändert
        }
        else {
            this.log.info(`State ${id} gelöscht`);
        }
    }
    /**
     * Nachrichtenbehandlung
     */
    async onMessage(obj) {
        this.log.info("on message " + JSON.stringify(obj));
        await Promise.resolve();
        if (typeof obj === "object" && obj.command) {
            switch (obj.command) {
                case "checkCurrentVersion":
                    this.CheckVersion("current", obj);
                    break;
            }
        }
    }
    CheckVersion(version, msg) {
        if (version == "installable") {
            const version = "";
            this.sendTo(msg.from, msg.command, version, msg.callback);
        }
        else if (version == "current") {
            const version = this.GetInstalledVersions();
            this.sendTo(msg.from, msg.command, version, msg.callback);
        }
        else if (version == "supported") {
            this.sendTo(msg.from, msg.command, "", msg.callback);
        }
    }
    GetInstalledVersions() {
        let version = "";
        for (let l = 0; l < this.wallboxes.length; l++) {
            version += this.wallboxes[l].GetVersion();
        }
        return version;
    }
}
exports.Amtronwallbox = Amtronwallbox;
if (require.main !== module) {
    // Exportiere den Konstruktor im Kompaktmodus
    module.exports = (options) => new Amtronwallbox(options);
}
else {
    // Starte die Instanz direkt
    (() => new Amtronwallbox())();
}
//# sourceMappingURL=main.js.map