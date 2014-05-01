var env = process.env.NODE_ENV;
var credentials = require('./lib/config/keys' + env + '/node.json');

/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name : [credentials.newRelic.app_name],
  /**
   * Your New Relic license key.
   */
  license_key : credentials.newRelic.license_key,
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : credentials.newRelic.logging_level
  }
};
