"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var randomInt = function () {
    var max = 9999999999999999;
    var min = 1000000000000000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
exports.default = randomInt;
