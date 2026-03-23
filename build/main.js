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
//https://www.iobroker.net/#en/documentation/dev/adapterdev.md
const utils = __importStar(require("@iobroker/adapter-core"));
const amtronwallbox_1 = __importDefault(require("./lib/amtronwallbox"));
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
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        this.log.debug(JSON.stringify(this.config));
        try {
            for (let l = 0; l < this.config.wallboxes.length; l++) {
                const config = this.config.wallboxes[l];
                if (this.config.wallboxes[l].active) {
                    this.log.debug("create instance of amtronwallbox");
                    const instance = new amtronwallbox_1.default(this, l + 1, config);
                    this.wallboxes.push(instance);
                }
            }
            for (let n = 0; n < this.wallboxes.length; n++) {
                //muss auch in den cron / intervall
                await this.wallboxes[n].Start();
            }
        }
        catch (e) {
            this.log.error("exception in onReady [" + e + "]");
        }
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    async onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            callback();
        }
        catch (e) {
            this.log.error("exception in onUnload " + e);
            callback();
        }
    }
    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        }
        else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }
    /**
     * Is called if a subscribed state changes
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            //const ids = id.split(".");
        }
        else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }
    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  */
    async onMessage(obj) {
        this.log.info("on message " + JSON.stringify(obj));
        if (typeof obj === "object" && obj.command) {
            //if (obj.command === "getIP") {
            //	this.log.info("get IP");
            //
            //	const myIP = this.GetIP();
            //	// Send response in callback if required
            //	if (obj.callback) {
            //		this.sendTo(obj.from, obj.command, myIP, obj.callback);
            //	}
            //} else if (obj.command === "getUUID") {
            if (obj.command === "´xxx") {
                // Send response in callback if required
                if (obj.callback) {
                    this.sendTo(obj.from, obj.command, "", obj.callback);
                }
            }
        }
    }
}
exports.Amtronwallbox = Amtronwallbox;
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new Amtronwallbox(options);
}
else {
    // otherwise start the instance directly
    (() => new Amtronwallbox())();
}
//# sourceMappingURL=main.js.map