var request = require('supertest');
var superagent = require('superagent');
var expect = require('expect.js');
var Browser = require('zombie');
var credentials = require('../lib/config/keys.json');
var wynnoUrl = 'http://' + credentials.publicDNS + ':' + credentials.port;

// 1. END-TO-END TESTS

// TODO test clicking Try it now on landing page
// TODO test clicking Sign in with Twitter on landing page
// TODO test clicking Blog link in footer on landing page
// TODO test clicking Terms link in footer on landing page
// TODO test clicking Privacy link in footer on landing page

// TODO Delete test user from db, so we are mimicking a new user end-to-end

// helpful tutorial on mocha and zombie: http://redotheweb.com/2013/01/15/functional-testing-for-nodejs-using-mocha-and-zombie-js.html
var browser = new Browser();
describe('User should be', function(){
  it('able to login successfully and be redirected to the #/in stream of tweets on wynno', function(done){
    this.timeout(20e3);
    browser.visit(wynnoUrl + '/auth/twitter')
    .then(function(){
      browser.fill('#username_or_email', credentials.testing.tw_username);
      browser.fill('#password', credentials.testing.tw_password);
      return browser.pressButton('#allow');
    })
    .then(function() {
      expect(browser.location.hash).to.eql('#/in');
      done();
    }, done);
  });
});

// If user clicks Cancel or X in the Welcome modal, they should be redirected to the landing page
// If user accepts ToS in Welcome modal, they should be left on #/in and able to vote on tweets etc.
// etc.


// 2. INTEGRATION TESTS OF SERVER

describe('GET to protected routes:', function() {
  // Mock passport authentication based on https://gist.github.com/mweibel/5219403
  var agent = superagent.agent();
  beforeEach(function(done) {
    passportMock(app, {
      passAuthentication: true,
      userId: 1
    });
    request(app)
      .get('/mock/login')
      .end(function(err, result) {
        if (!err) {
          agent.saveCookies(result.res);
          done();
        } else {
          done(err);
        }
      });
  })
 
  it('should allow access to /protected-resource', function(done) {
    var req = request(app).get('/protected-resource');
    agent.attachCookies(req);
    req.expect(200, done);
  });
});


describe('express server', function() {
  it('should respond to GET /old with [the most recent] batch of tweets from the db', function(done) {
    superagent.get('http://localhost:8080/old?oldestTweetId=0')
    .end(function(error, res) {
      expect(error).to.eql(null);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.below(51);
      done();
    });
  });

  it('should respond to GET /new with new tweets', function(done) {
    superagent.get('http://localhost:8080/new')
    .end(function(error, res) {
      expect(error).to.eql(null);
      expect(res.body).to.be.an('array');
      done();
    });
  });

  it('should receive a 429 error for making another GET /new less than 61 seconds after the last one', function(done) {
    superagent.get('http://localhost:8080/new')
    .end(function(error, res) {
      expect(res.status).to.eql(429);
      done();
    });
  });

  // need to wait for 61 seconds to pass in order for the following test to succeed

  it('should respond to GET /middle with middle tweets, if there are any', function(done) {
    superagent.get('http://localhost:8080/new')
    .end(function(error, res) {
      expect(error).to.eql(null);
      expect(res.body).to.be.an('array');
      done();
    });
  });

  it('should receive a 429 error for making another GET /middle less than 61 seconds after the last one', function(done) {
    superagent.get('http://localhost:8080/new')
    .end(function(error, res) {
      expect(res.status).to.eql(429);
      done();
    });
  });

  it('should retrieve a users settings correctly', function(done) {
    superagent.get('http://localhost:8080/settings')
    .end(function(error, res) {
      expect(error).to.eql(null);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.key('activeFilters');
      expect(res.body).to.have.key('disabledFilters');
      expect(res.body).to.have.key('suggestedFilters');
      expect(res.body).to.have.key('dismissedFilters');
      expect(res.body).to.have.key('voteCount');
      expect(res.body).to.have.key('undismissedSugg');
      done();
    });
  });
})