"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var sha256AndBase64 = function (key, secret) {
    var sha256 = (0, crypto_1.createHmac)('sha256', secret);
    sha256.update(key);
    return Buffer.from(sha256.digest('hex'), 'utf8').toString('base64');
};
exports.default = sha256AndBase64;
