var superagent = require('superagent');
var expect = require('expect.js');

describe('express server', function() {
  it('should respond to GET /old with [the most recent] batch of tweets from the db', function(done) {
    superagent.get('http://localhost:8080/old?oldestTweetId=0')
    .end(function(error, res) {
      expect(error).to.eql(null);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.below(21);
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

  it('should retrieve a users settings correctly', function(done) {
    superagent.get('http://localhost:8080/settings')
    .end(function(error, res) {
      expect(error).to.eql(null);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.key('mutedUsers');
      expect(res.body).to.have.key('protectedUsers');
      expect(res.body).to.have.key('mutedWords');
      expect(res.body).to.have.key('protectedWords');
      done();
    });
  });
})