"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var getQueryStringFromParams = function (params) {
    var queryString = '';
    for (var key in params) {
        if (queryString.length > 0) {
            queryString = queryString + "&" + encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
        }
        else {
            queryString = encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
        }
    }
    return queryString;
};
exports.default = getQueryStringFromParams;
