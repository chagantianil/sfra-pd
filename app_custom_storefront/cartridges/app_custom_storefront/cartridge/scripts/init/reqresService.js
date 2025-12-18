'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var StringUtils = require('dw/util/StringUtils');

/**
 * Creates and configures the service to call the ReqRes API.
 * This function is called by SFCC to initialize the service.
 */
function createReqResService() {
    return LocalServiceRegistry.createService('user.info', {
        /**
         * @param {dw.svc.HTTPService} svc - The service instance
         * @param {Object} params - Parameters passed from the service.call()
         * @returns {string} - The full URL to call
         */
        createRequest: function (svc, params) {
            // Get the URL from the ServiceCredential
            var credentialURL = svc.getConfiguration().getCredential().getURL();
            svc.setURL(credentialURL + params.userID);
            svc.setRequestMethod('GET');
            svc.addHeader('Content-Type', 'application/json');
            // 'params' would be the request body for a POST, but this is a GET
            return params;
        },

        /**
         * @param {dw.svc.HTTPService} svc - The service instance
         * @param {dw.net.HTTPClient} client - The HTTP client
         * @returns {Object} - The parsed JSON response
         */
        parseResponse: function (svc, client) {
            // Check for a successful response
            if (client.statusCode === 200) {
                // Parse the JSON text into an object
                return JSON.parse(client.text);
            }
            
            // Handle errors
            return {
                error: true,
                statusCode: client.statusCode,
                errorMessage: client.errorText
            };
        },

        /**
         * (Optional) Define a mock response for testing
         */
        mockCall: function (svc, params) {
            return {
                statusCode: 200,
                statusMessage: 'Success',
                data: {
                    id: params.userID,
                    email: "mock.user@reqres.in",
                    first_name: "Mock",
                    last_name: "User",
                    avatar: "https://reqres.in/img/faces/1-image.jpg"
                }
            };
        }
    });
}

// Export the factory function
module.exports = {
    create: createReqResService
};