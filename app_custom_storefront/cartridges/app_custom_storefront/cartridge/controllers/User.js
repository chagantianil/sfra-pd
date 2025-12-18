'use strict';

// Import the controller base and the ISML rendering engine
var server = require('server');
var Template = require('dw/template/ISML');

// Import the helper script we created
var userHelper = require('*/cartridge/scripts/helpers/userHelper');

/**
 * @name Test-Show
 * @function
 * @description Renders user information based on a 'userID' query string parameter.
 * * URL: .../default/Test-Show?userID=2
 */
server.get('Show', function (req, res, next) {
    
    // 1. Get the userID from the URL query string
    var userID = req.querystring.userID;
    var user = null;
    var errorMessage = '';

    if (userID) {
        // 2. Call the helper function to get the user from the API
        user = userHelper.getUser(userID);

        if (!user) {
            errorMessage = 'Failed to retrieve user or user not found.';
        }
    } else {
        errorMessage = 'Please provide a userID in the query string (e.g., ?userID=2)';
    }
    
    // 3. Render the template and pass the data to it
    res.render('user/user', {
        user: user, // This will be null if an error occurred
        errorMessage: errorMessage
    });

    next();
});

module.exports = server.exports();