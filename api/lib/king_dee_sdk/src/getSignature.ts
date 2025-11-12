import sha256AndBase64 from "./sha256AndBase64.js";
import getQueryString from "./getQueryString.js";

const getSignature = function(
  path: string,
  method: string,
  headers: { [key: string]: any },
  queryString: string,
  clientSecret: string
) {
  path = encodeURIComponent(path);
  queryString = getQueryString(queryString);
  // console.log("queryString", queryString)

  let headersString = "";
  let strArr = headers["X-Api-SignHeaders"].split(",");
  strArr = strArr.sort();
  strArr.map((item: string) => {
    headersString =
      headersString + item.toLowerCase() + ":" + headers[item] + "\n";
  });

  let signString =
    method.toUpperCase() +
    "\n" +
    path +
    "\n" +
    queryString +
    "\n" +
    headersString;
  // console.log("signString", signString)

  let signature = sha256AndBase64(signString, clientSecret);
  // console.log("signature", signature)

  return signature;
};

export default getSignature;
