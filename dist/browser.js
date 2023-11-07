"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var legoBoost_1 = require("./legoBoost");
var boost = new legoBoost_1.default();
// @ts-ignore
window.boost = boost;
// @ts-ignore
boost.logDebug = console.log;
//# sourceMappingURL=browser.js.map