'use strict';

var reqresService = require('~/cartridge/scripts/init/reqresService').create();
var Logger = require('dw/system/Logger');

function getUser(userID) {
    try {
        // Pass the userID to the createRequest callback
        var result = reqresService.call({
            userID: userID
        });

        if (result.ok) {
            // The 'result.object' is the object returned from parseResponse
            var user = result.object.data;
            Logger.info('Successfully fetched user: {0} {1}', user.first_name, user.last_name);
            return user;
        } else {
            // The service call failed (e.g., 404, 500, or timeout)
            Logger.error('Error calling ReqRes service: {0}', result.errorMessage);
            return null;
        }

    } catch (e) {
        Logger.error('Exception in userHelper: {0}', e.message);
        return null;
    }
}

module.exports = {
    getUser: getUser
};