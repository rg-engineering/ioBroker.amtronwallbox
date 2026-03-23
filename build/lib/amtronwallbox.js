"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
class Predictor extends base_1.default {
    active;
    constructor(adapter, id, config) {
        super(adapter, id, "amtronwallbox" + id);
        this.active = config.active;
    }
    async Start() {
    }
}
exports.default = Predictor;
//# sourceMappingURL=amtronwallbox.js.map