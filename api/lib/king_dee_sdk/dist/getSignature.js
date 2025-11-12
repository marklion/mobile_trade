"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sha256AndBase64_js_1 = require("./sha256AndBase64.js");
var getQueryString_js_1 = require("./getQueryString.js");
var getSignature = function (path, method, headers, queryString, clientSecret) {
    path = encodeURIComponent(path);
    queryString = (0, getQueryString_js_1.default)(queryString);
    // console.log("queryString", queryString)
    var headersString = '';
    var strArr = headers['X-Api-SignHeaders'].split(',');
    strArr = strArr.sort();
    strArr.map(function (item) {
        headersString = headersString + item.toLowerCase() + ":" + headers[item] + "\n";
    });
    var signString = method.toUpperCase() + "\n"
        + path + "\n"
        + queryString + "\n"
        + headersString;
    // console.log("signString", signString)
    var signature = (0, sha256AndBase64_js_1.default)(signString, clientSecret);
    // console.log("signature", signature)
    return signature;
};
exports.default = getSignature;
