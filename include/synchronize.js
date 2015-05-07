// REALLY I *SHOULD* JUST CONVERT EVERYTHING TO ASYNCHRONOUS !!!

/**
 *
 */
function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_";
  for ( var i=0; i < 10; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

/**
 * Takes a Promise or an asynchronous function
 * and waits for it to resolve before returning.
 *
 */
module.exports = function(p) {
  if (typeof p === 'function') {
    throw 'InvalidParameterException';
  }
  //else if (typeof p === 'Promise') {}
  var uid = makeid();
  global[uid] = undefined;

  var invl = setInterval(function() {
    if (p.isFulfilled()) {
      clearInterval(intvl);
      global[uid] = p.value();
    }
  }, 50);

};
