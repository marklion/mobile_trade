import { createHmac } from "crypto";

const sha256AndBase64 = function(key: string, secret: string) {
  let sha256 = createHmac("sha256", secret);
  sha256.update(key);
  return Buffer.from(sha256.digest("hex"), "utf8").toString("base64");
};

export default sha256AndBase64;
