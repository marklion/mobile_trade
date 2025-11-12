"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var getQueryString = function (queryString) {
    if (queryString.length === 0) {
        return '';
    }
    var queryStrings = queryString.split('&');
    queryStrings = queryStrings.sort();
    var queryStringResult = '';
    queryStrings.map(function (item) {
        var strArr = item.split('=');
        var key = strArr[0];
        var value = strArr[1];
        if (queryStringResult.length > 0)
            queryStringResult = queryStringResult + "&" + encodeURIComponent(key) + "=" + encodeURIComponent(value);
        else
            queryStringResult = encodeURIComponent(key) + "=" + encodeURIComponent(value);
    });
    // console.log("queryStringResult", queryStringResult)
    return queryStringResult;
};
exports.default = getQueryString;
