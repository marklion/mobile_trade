const randomInt = function() {
  let max = 9999999999999999;
  let min = 1000000000000000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export default randomInt;
