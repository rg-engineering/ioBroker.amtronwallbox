"use strict";
/* eslint-disable prefer-template */
Object.defineProperty(exports, "__esModule", { value: true });
const cron_1 = require("cron");
class Base {
    adapter;
    id;
    name;
    IsActive;
    readInterval;
    Type;
    IPAddress;
    ApiKey;
    Name;
    timezone;
    sVersion;
    cronJobs = [];
    constructor(adapter, id, name, config, readInterval, timezone) {
        if (adapter != null) {
            this.adapter = adapter;
        }
        else {
            this.adapter = null;
        }
        this.id = id;
        this.name = name;
        this.IsActive = config.IsActive;
        this.readInterval = readInterval;
        this.Type = config.Type;
        this.IPAddress = config.IPAddress;
        this.ApiKey = config.ApiKey;
        this.Name = config.Name;
        this.timezone = timezone;
        this.sVersion = "unknown;";
        this.cronJobs = [];
        this.logDebug("instance created");
    }
    GetVersion() {
        return this.name + ": " + this.sVersion + " ";
    }
    GetForbiddenChars() {
        if (this.adapter == null) {
            return new RegExp("");
        }
        else {
            if (this.adapter.FORBIDDEN_CHARS !== undefined && this.adapter.FORBIDDEN_CHARS != null) {
                return this.adapter.FORBIDDEN_CHARS;
            }
            else {
                return new RegExp("");
            }
        }
    }
    async Start() {
        this.logDebug("start  ");
        await Promise.resolve();
        //read all data
        //await this.ReadData();
        let readInterval = 15;
        if (this.readInterval > 0) {
            readInterval = this.readInterval;
        }
        else {
            this.logWarn("read interval not defined");
        }
        this.logDebug("read every  " + readInterval + " minutes");
        this.CronCreate(readInterval, this.Do);
        this.CronStatus();
    }
    async Stop() {
        await this.CronStop();
    }
    async Do() {
        this.logDebug("starting ... ");
        await this.ReadData();
        //to do
        //await WriteData();
    }
    async ReadData() {
        //do nothing    here, just for overwriting in the child class
    }
    logDebug(message) {
        if (this.adapter != null) {
            this.adapter.log.debug(this.name + ": " + message);
        }
    }
    logInfo(message) {
        if (this.adapter != null) {
            this.adapter.log.info(this.name + ": " + message);
        }
    }
    logError(message) {
        if (this.adapter != null) {
            this.adapter.log.error(this.name + ": " + message);
        }
    }
    logWarn(message) {
        if (this.adapter != null) {
            this.adapter.log.warn(this.name + ": " + message);
        }
    }
    async CreateObject(key, obj) {
        await this.CreateDatapoint(key, obj.common.name, obj.type, obj.common.role, obj.common.type, obj.common.unit, obj.common.read, obj.common.write, obj.common.desc);
    }
    async CreateDatapoint(key, name, type, common_role, common_type, common_unit, common_read, common_write, common_desc) {
        if (this.adapter == null) {
            return;
        }
        let objName = "";
        if (name === undefined) {
            const names = key.split(".");
            let idx = names.length;
            objName = key;
            if (idx > 0) {
                idx--;
                objName = names[idx];
            }
        }
        else {
            objName = name;
        }
        await this.adapter.setObjectNotExistsAsync(key, {
            type: type,
            common: {
                name: objName,
                role: common_role,
                type: common_type,
                unit: common_unit ? common_unit : "",
                read: common_read,
                write: common_write,
                desc: common_desc
            },
            native: { id: key }
        });
        const obj = await this.adapter.getObjectAsync(key);
        if (obj != null) {
            if (obj.common.role != common_role
                || obj.common.type != common_type
                || obj.common.unit != common_unit
                || obj.common.read != common_read
                || obj.common.write != common_write
                || obj.common.name != name
                || obj.common.desc != common_desc) {
                await this.adapter.extendObject(key, {
                    common: {
                        name: name,
                        role: common_role,
                        type: common_type,
                        unit: common_unit ? common_unit : "",
                        read: common_read,
                        write: common_write,
                        desc: common_desc
                    }
                });
            }
        }
    }
    async SetDefault(key, value) {
        if (this.adapter == null) {
            return;
        }
        const current = await this.adapter.getStateAsync(key);
        //set default only if nothing was set before
        if (current === null || current === undefined || current.val === undefined) {
            this.logInfo("set default " + key + " to " + value);
            await this.adapter.setState(key, { ack: true, val: value });
        }
    }
    async SetState(key, ack, val) {
        if (this.adapter == null) {
            return;
        }
        await this.adapter.setState(key, { ack: ack, val: val });
    }
    //===============================================================================
    //cron functions
    async CronStop() {
        if (this.cronJobs.length > 0) {
            this.logDebug("delete " + this.cronJobs.length + " cron jobs");
            //cancel all cron jobs...
            const start = this.cronJobs.length - 1;
            for (let n = start; n >= 0; n--) {
                await this.cronJobs[n].stop();
            }
            this.cronJobs = [];
        }
    }
    /*
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
    */
    CronCreate(Minute, callback) {
        try {
            const timezone = this.timezone || "Europe/Berlin";
            let cronString = "";
            let sMinute = "";
            //https://crontab-generator.org/
            if (Minute == -99) {
                //every day late evening
                cronString = "5 23 * * *";
                //just for logging
                sMinute = "late evening";
            }
            else {
                cronString = "*/" + Minute + " * * * *";
                sMinute = Minute.toString();
            }
            const nextCron = this.cronJobs.length;
            this.logDebug("create cron job #" + nextCron + " every " + sMinute + " string: " + cronString + " " + timezone);
            //details siehe https://www.npmjs.com/package/cron
            const job = cron_1.CronJob.from({
                cronTime: cronString,
                onTick: () => callback(),
                onComplete: () => this.logDebug("cron job stopped"),
                start: true,
                timeZone: timezone
            });
            this.cronJobs.push(job);
        }
        catch (e) {
            this.logError("exception in CronCreate [" + e + "]");
        }
    }
    CronStatus() {
        let n = 0;
        let length = 0;
        try {
            if (this.cronJobs !== undefined && this.cronJobs != null) {
                length = this.cronJobs.length;
                //adapter.log.debug("cron jobs");
                for (n = 0; n < length; n++) {
                    if (this.cronJobs[n] !== undefined && this.cronJobs[n] != null) {
                        this.logDebug("cron status = " + this.cronJobs[n].isActive + " next event: " + this.timeConverter("DE", this.cronJobs[n].nextDate().toJSDate()));
                    }
                }
                if (length > 500) {
                    this.logError("more then 500 cron jobs existing for this adapter, this might be a configuration error! (" + length + ")");
                }
                else {
                    this.logInfo(length + " cron job(s) created");
                }
            }
        }
        catch (e) {
            this.logError("exception in getCronStat [" + e + "] : " + n + " of " + length);
        }
    }
    timeConverter(SystemLanguage, time, timeonly = false) {
        let a;
        if (time != null) {
            a = new Date(time);
        }
        else {
            a = new Date();
        }
        let months;
        if (SystemLanguage === "de") {
            months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        }
        else if (SystemLanguage === "en") {
            months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        }
        else {
            months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        }
        const year = a.getFullYear();
        const month = months[a.getMonth()];
        const date = a.getDate();
        const sdate = date < 10 ? " " + date.toString() : date.toString();
        const hour = a.getHours();
        const shour = hour < 10 ? "0" + hour.toString() : hour.toString();
        const min = a.getMinutes();
        const smin = min < 10 ? "0" + min.toString() : min.toString();
        const sec = a.getSeconds();
        const ssec = sec < 10 ? "0" + sec.toString() : sec.toString();
        let sRet = "";
        if (timeonly) {
            sRet = shour + ":" + smin + ":" + ssec;
        }
        else {
            sRet = sdate + " " + month + " " + year.toString() + " " + shour + ":" + smin + ":" + ssec;
        }
        return sRet;
    }
}
exports.default = Base;
//# sourceMappingURL=base.js.map