var superagent = require('superagent');
var expect = require('expect.js');
var Zombie = require('zombie');
var credentials = require('../lib/config/keys.json');
var wynnoUrl = 'http://' + credentials.publicDNS + ':' + credentials.port;

// TODO test clicking Try it now on landing page
// TODO test clicking Sign in with Twitter on landing page
// TODO test clicking Blog link in footer on landing page
// TODO test clicking Terms link in footer on landing page
// TODO test clicking Privacy link in footer on landing page

// TODO Delete test user from db, so we are mimicking a new user end-to-end

describe('User should be', function(){
  it('able to login successfully and be redirected to the #/in stream of tweets on wynno', function(done){
    this.timeout(20e3);
    var zombie = new Zombie();
    zombie.visit(wynnoUrl + '/auth/twitter', function(err){
      if (err) throw err
      zombie
      .fill('#username_or_email', credentials.testing.tw_username)
      .fill('#password', credentials.testing.tw_password)
      .pressButton('#allow', function(err){
        if (err) throw err
        expect(zombie.location.hash).to.eql('#/in');
        done();
      });
    });
  });
});

// If user clicks Cancel or X in the Welcome modal, 

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