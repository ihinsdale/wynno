var credentials = require('../lib/config/keys.json');
var env = process.env.NODE_ENV;
var wynnoUrl = 'http://' + credentials[env].publicDNS;
var request = require('supertest');
var superagent = require('superagent');
var expect = require('expect.js');
var Browser = require('zombie');
var async = require('async');

// // 1. END-TO-END TESTS (disabled for now, while focusing on integration tests)

// // TODO test clicking Try it now on landing page
// // TODO test clicking Sign in with Twitter on landing page
// // TODO test clicking Blog link in footer on landing page
// // TODO test clicking Terms link in footer on landing page
// // TODO test clicking Privacy link in footer on landing page

// // TODO Delete test user from db, so we are mimicking a new user end-to-end

// // helpful tutorial on mocha and zombie: http://redotheweb.com/2013/01/15/functional-testing-for-nodejs-using-mocha-and-zombie-js.html
// var browser = new Browser();
// describe('User should be', function(){
//   it('able to login successfully and be redirected to the #/in stream of tweets on wynno', function(done){
//     this.timeout(20e3);
//     browser.visit(wynnoUrl + '/auth/twitter')
//     .then(function(){
//       browser.fill('#username_or_email', credentials.testing.tw_username);
//       browser.fill('#password', credentials.testing.tw_password);
//       return browser.pressButton('#allow');
//     })
//     .then(function() {
//       expect(browser.location.hash).to.eql('#/in');
//       done();
//     }, done);
//   });
// });

// // If user clicks Cancel or X in the Welcome modal, they should be redirected to the landing page
// // If user accepts ToS in Welcome modal, they should be left on #/in and able to vote on tweets etc.
// // etc.

// 2. INTEGRATION TESTS OF SERVER

describe('POST protected routes:', function() {
  // Mock passport authentication based on https://gist.github.com/mweibel/5219403
  var agent;
  beforeEach(function(done) {
    this.timeout(20e3);
    agent = superagent.agent();
    var req = request(wynnoUrl).get('/mock/login');
    req.end(function(err, result) {
      if (!err) {
        //console.log('response headers after mock login:', result.headers);
        agent.saveCookies(result.res); // this only seems to be saving the connect session id cookie
        // so we make an additional request to /checkin directly (maybe superagent isn't following the redirect
        // to /checkin after login?)
        var req = request(wynnoUrl).get('/checkin');
        agent.attachCookies(req);
        req.end(function(err, result) {
          if (!err) {
            agent.saveCookies(result.res);
            done();
          } else {
            done(err);
          }
        });
      } else {
        done(err);
      }
    });
  });
 
  // Logging out after each request is important because we want to test that rate limiting, for the
  // /new and /middle (and /old) routes when they make calls to the Twitter API, does not depend on sessions;
  // The rate limiting is managed with Redis, independent of user sessions.
  afterEach(function(done) {
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/logout')
    agent.attachCookies(req);
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, result) {
      if (!err) {
        done();
      } else {
        done(err);
      }
    });
  });

  it("/old queried with no X-XSRF-TOKEN header should return 403", function(done) { 
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/old');
    agent.attachCookies(req);
    req.send({oldestTweetIdStr: '0'});
    req.end(function(err, res) {
      expect(res.status).to.eql(403);
      done();
    });
  });


  it("/old queried with oldestTweetIdStr: '0' should return 50 old tweets", function(done) { // 50 is current batch size
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/old');
    agent.attachCookies(req);
    req.send({oldestTweetIdStr: '0'}); // the setting of the request JSON **MUST** come after the attachment of cookies
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, res) {
      expect(err).to.eql(null);
      expect(res.status).to.eql(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.key('tweets');
      expect(res.body).not.to.have.key('settings');
      expect(res.body.tweets).to.be.an('array');
      expect(res.body.tweets.length).to.eql(50);
      done();
    });
  });

  it("/old queried with oldestTweetIdStr: 0 and settings: true should return 50 old tweets", function(done) { // 50 is current batch size
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/old');
    agent.attachCookies(req);
    req.send({oldestTweetIdStr: '0', settings: true});
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, res) {
      expect(err).to.eql(null);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.key('tweets');
      expect(res.body.tweets).to.be.an('array');
      expect(res.body.tweets.length).to.eql(50);
      expect(res.body).to.have.key('settings');
      expect(res.body.settings).to.be.an('object');
      expect(res.body.settings).to.have.key('activeFilters');
      expect(res.body.settings).to.have.key('disabledFilters');
      expect(res.body.settings).to.have.key('suggestedFilters');
      expect(res.body.settings).to.have.key('dismissedFilters');
      expect(res.body.settings).to.have.key('voteCount');
      expect(res.body.settings).to.have.key('undismissedSugg');
      expect(res.body.settings).to.have.key('autoWynnoing');
      done();
    });
  });

  it('/new should respond with new tweets', function(done) {
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/new');
    agent.attachCookies(req);
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, res) {
      expect(err).to.eql(null);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.key('tweets');
      expect(res.body.tweets).to.be.an('array');
      done();
    });
  });

  it('/new should respond with a 429 error for making another request less than 61 seconds after the last one', function(done) {
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/new');
    agent.attachCookies(req);
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, res) {
      expect(res.status).to.eql(429);
      done();
    });
  });

  it('/new should respond with OK after waiting 61 seconds since the last successful call to /new', function(done) {
    this.timeout(80e3);
    var req = request(wynnoUrl).post('/new');
    agent.attachCookies(req);
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    setTimeout(function() {
      req.end(function(err, res) {
        expect(err).to.eql(null);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.key('tweets');
        expect(res.body.tweets).to.be.an('array');
        done();
      });
    }, 61000);
  });

  it('/middle should respond with a 400 error for making a request that does not contain oldestOfMoreRecentTweetsIdStr', function(done) {
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/middle');
    agent.attachCookies(req);
    req.send({secondNewestOfOlderTweetsIdStr: '451232592243589120', newestOfOlderTweetsIdStr: '451233635417726976'});
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, res) {
      expect(res.status).to.eql(400);
      done();
    });
  });

  it('/middle should respond with a 400 error for making a request that does not contain secondNewestOfOlderTweetsIdStr', function(done) {
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/middle');
    agent.attachCookies(req);
    req.send({oldestOfMoreRecentTweetsIdStr: '451242657101012992', newestOfOlderTweetsIdStr: '451233635417726976'});
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, res) {
      expect(res.status).to.eql(400);
      done();
    });
  });

  it('/middle should respond with a 400 error for making a request that does not contain newestOfOlderTweetsIdStr', function(done) {
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/middle');
    agent.attachCookies(req);
    req.send({oldestOfMoreRecentTweetsIdStr: '451242657101012992', secondNewestOfOlderTweetsIdStr: '451232592243589120'});
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, res) {
      expect(res.status).to.eql(400);
      done();
    });
  });

  var validMiddleQuery = {oldestOfMoreRecentTweetsIdStr: '451242657101012992', secondNewestOfOlderTweetsIdStr: '451232592243589120', newestOfOlderTweetsIdStr:'451233635417726976'};
  // these id strings will result in 3 tweets being returned from Twitter, one of which gets discarded because the gap is closed
  // but we can't test here for a result length of 3 because the /middle route also saves the tweets received from Twitter
  // and then fetches based on the id_str's, so the length of /middle's results is not stable because we keep adding duplicate tweets
  // so instead we'll just test that the results array of tweets is not empty

  it('/middle should respond with a 429 error for making the request less than 61 seconds after the last successful Twitter API call via /new', function(done) {
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/middle');
    agent.attachCookies(req);
    req.send(validMiddleQuery);
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, res) {
      expect(res.status).to.eql(429);
      done();
    });
  });

  it('/middle should respond with OK after waiting 61 seconds since the last successful Twitter API call via /new', function(done) {
    // note we're not actually testing that the route correctly responds with any middle tweets
    // that would require prepping the right db data
    this.timeout(80e3);
    var req = request(wynnoUrl).post('/middle');
    agent.attachCookies(req);
    req.send(validMiddleQuery);
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    setTimeout(function() {
      req.end(function(err, res) {
        expect(err).to.eql(null);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.key('tweets');
        expect(res.body.tweets).to.be.an('array');
        expect(res.body.tweets).not.to.be.empty();
        done();
      });
    }, 61000);
  });

  it('/middle should respond with a 429 error for making the request less than 61 seconds after the last successful Twitter API call via /middle', function(done) {
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/middle');
    agent.attachCookies(req);
    req.send(validMiddleQuery);
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, res) {
      expect(res.status).to.eql(429);
      done();
    });
  });

  it('/middle should respond with OK after waiting 61 seconds since the last successful Twitter API call via /middle', function(done) {
    // note we're not actually testing that the route correctly responds with any middle tweets
    // that would require prepping the right db data
    this.timeout(80e3);
    var req = request(wynnoUrl).post('/middle');
    agent.attachCookies(req);
    req.send(validMiddleQuery);
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    setTimeout(function() {
      req.end(function(err, res) {
        expect(err).to.eql(null);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.key('tweets');
        expect(res.body.tweets).to.be.an('array');
        expect(res.body.tweets).not.to.be.empty();
        done();
      });
    }, 61000);
  });

  it('/new should respond with a 429 error for making another request less than 61 seconds after the last successful Twitter API call via /middle', function(done) {
    this.timeout(20e3);
    var req = request(wynnoUrl).post('/new');
    agent.attachCookies(req);
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    req.end(function(err, res) {
      expect(res.status).to.eql(429);
      done();
    });
  });

  it('/new should respond with OK after waiting 61 seconds since the last successful Twitter API call via /middle', function(done) {
    this.timeout(80e3);
    var req = request(wynnoUrl).post('/new');
    agent.attachCookies(req);
    var csrfToken = (/XSRF-TOKEN=(.*?);/.exec(req.cookies)[1]);
    req.set('X-XSRF-TOKEN', unescape(csrfToken));
    setTimeout(function() {
      req.end(function(err, res) {
        expect(err).to.eql(null);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.key('tweets');
        expect(res.body.tweets).to.be.an('array');
        done();
      });
    }, 61000);
  });

// TODO: test /old when oldestTweetId is the oldest tweet in the db,
// which results in a call to the Twitter API via twitter.fetchMiddle()

});


// old route tests below here -- they can be revised along the lines of the above

// describe('express server', function() {
//   it('should respond to GET /new with new tweets', function(done) {
//     superagent.get('http://localhost:8080/new')
//     .end(function(error, res) {
//       expect(error).to.eql(null);
//       expect(res.body).to.be.an('array');
//       done();
//     });
//   });

//   it('should receive a 429 error for making another GET /new less than 61 seconds after the last one', function(done) {
//     superagent.get('http://localhost:8080/new')
//     .end(function(error, res) {
//       expect(res.status).to.eql(429);
//       done();
//     });
//   });

//   // need to wait for 61 seconds to pass in order for the following test to succeed

//   it('should respond to GET /middle with middle tweets, if there are any', function(done) {
//     superagent.get('http://localhost:8080/new')
//     .end(function(error, res) {
//       expect(error).to.eql(null);
//       expect(res.body).to.be.an('array');
//       done();
//     });
//   });

//   it('should receive a 429 error for making another GET /middle less than 61 seconds after the last one', function(done) {
//     superagent.get('http://localhost:8080/new')
//     .end(function(error, res) {
//       expect(res.status).to.eql(429);
//       done();
//     });
//   });

//   it('should retrieve a users settings correctly', function(done) {
//     superagent.get('http://localhost:8080/settings')
//     .end(function(error, res) {
//       expect(error).to.eql(null);
//       expect(res.body).to.be.an('object');
//       expect(res.body).to.have.key('activeFilters');
//       expect(res.body).to.have.key('disabledFilters');
//       expect(res.body).to.have.key('suggestedFilters');
//       expect(res.body).to.have.key('dismissedFilters');
//       expect(res.body).to.have.key('voteCount');
//       expect(res.body).to.have.key('undismissedSugg');
//       done();
//     });
//   });
// })
