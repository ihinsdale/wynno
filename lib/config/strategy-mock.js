/**
 * Author: Michael Weibel <michael.weibel@gmail.com>
 * Cf. https://gist.github.com/mweibel/5219403
 * License: MIT
 */
'use strict';
 
var passport = require('passport');
var util = require('util');
 
function StrategyMock(options, verify) {
  this.name = 'mock';
  this.passAuthentication = options.passAuthentication || true;
  this.userId = options.userId || 1;
  this.verify = verify;
}
 
util.inherits(StrategyMock, passport.Strategy);
 
StrategyMock.prototype.authenticate = function authenticate(req) {
  if (this.passAuthentication) {
    var user = {
      id: this.userId
    };
    var self = this;
    this.verify(req, user, function(err, resident) {
      if (err) {
        self.fail(err);
      } else {
        self.success(resident);
      }
    });
  } else {
    this.fail('Unauthorized');
  }
}
 
module.exports = StrategyMock;
