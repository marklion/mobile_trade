"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApigwClient = void 0;
var randomInt_1 = require("./randomInt");
var getQueryStringFromParams_1 = require("./getQueryStringFromParams");
var getSignature_1 = require("./getSignature");
var axios_1 = require("axios");
var ApigwClient = /** @class */ (function () {
    function ApigwClient(clientID, clientSecret) {
        this.clientID = clientID;
        this.clientSecret = clientSecret;
    }
    ApigwClient.prototype.request = function (_a) {
        var url = _a.url, method = _a.method, _b = _a.params, params = _b === void 0 ? {} : _b, _c = _a.headers, headers = _c === void 0 ? {} : _c, other = __rest(_a, ["url", "method", "params", "headers"]);
        var path = new URL(url).pathname;
        var headersAppend = {
            'Content-Type': 'application/json',
            'X-Api-ClientID': this.clientID,
            'X-Api-Auth-Version': "2.0",
            'X-Api-TimeStamp': Date.now(),
            'X-Api-SignHeaders': 'X-Api-TimeStamp,X-Api-Nonce',
            'X-Api-Nonce': (0, randomInt_1.default)(),
            'X-Api-Signature': '',
            // 'app-token': appToken,
            // 'X-GW-Router-Addr': domain
        };
        var queryString = (0, getQueryStringFromParams_1.default)(params);
        // console.log("queryString", queryString)
        headersAppend['X-Api-Signature'] = (0, getSignature_1.default)(path, method, headersAppend, queryString, this.clientSecret);
        // console.log('headers', headers)
        var fetchUrl;
        if (queryString.length === 0) {
            fetchUrl = url;
        }
        else {
            fetchUrl = url + "?" + queryString;
        }
        return axios_1.default.request(__assign({ url: fetchUrl, method: method, headers: __assign(__assign({}, headersAppend), headers) }, other));
    };
    return ApigwClient;
}());
exports.ApigwClient = ApigwClient;
