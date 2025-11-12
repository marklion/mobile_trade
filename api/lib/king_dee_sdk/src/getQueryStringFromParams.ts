const getQueryStringFromParams = function(params: { [key: string]: string }) {
  let queryString = "";
  for (let key in params) {
    if (queryString.length > 0) {
      queryString =
        queryString +
        "&" +
        encodeURIComponent(key) +
        "=" +
        encodeURIComponent(params[key]);
    } else {
      queryString =
        encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    }
  }
  return queryString;
};

export default getQueryStringFromParams;
