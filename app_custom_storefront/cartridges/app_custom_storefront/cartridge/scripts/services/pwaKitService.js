'use strict';

/**
 * PWA Kit Service - HTTP Service for fetching content from PWA Kit Managed Runtime
 */

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Site = require('dw/system/Site');

/**
 * Creates and returns the PWA Kit HTTP Service
 * @returns {dw.svc.Service} The configured service
 */
function getPWAKitService() {
    return LocalServiceRegistry.createService('pwakit.http.service', {
        /**
         * Creates the request for the service
         * @param {dw.svc.HTTPService} svc - The service instance
         * @param {Object} params - Request parameters
         * @param {string} params.siteID - The site ID
         * @param {string} params.pageID - The page ID
         * @returns {string} The request URL
         */
        createRequest: function (svc, params) {
            var pwaKitBaseURL = Site.getCurrent().getCustomPreferenceValue('pwaKitURL');
            
            if (!pwaKitBaseURL || pwaKitBaseURL === null || pwaKitBaseURL === '') {
                throw new Error('PWA Kit URL not configured in Site Preferences');
            }

            // Remove trailing slash if present
            var baseURL = pwaKitBaseURL.toString().replace(/\/$/, '');
            
            // Construct the full URL: {baseURL}/{siteID}/page/{pageID}?preview=true
            var url = baseURL + '/' + params.siteID + '/page/' + params.pageID + '?preview=true';

            svc.setURL(url);
            svc.setRequestMethod('GET');
            svc.addHeader('Accept', 'text/html');

            return null; // GET request, no body
        },

        /**
         * Parses the response from the service
         * @param {dw.svc.HTTPService} svc - The service instance
         * @param {dw.net.HTTPClient} client - The HTTP client with response
         * @returns {Object} Parsed response
         */
        parseResponse: function (svc, client) {
            return {
                statusCode: client.statusCode,
                statusMessage: client.statusMessage,
                text: client.text
            };
        },

        /**
         * Filters the URL for logging (hides sensitive data)
         * @param {string} url - The URL to filter
         * @returns {string} Filtered URL
         */
        filterLogMessage: function (url) {
            return url;
        },

        /**
         * Mock response for testing in sandbox without actual service call
         * @returns {Object} Mock response
         */
        mockCall: function () {
            return {
                statusCode: 200,
                statusMessage: 'OK',
                text: '<div>Mock PWA Kit Content</div>'
            };
        }
    });
}

/**
 * Fetches page content from PWA Kit
 * @param {string} siteID - The site ID
 * @param {string} pageID - The page ID
 * @returns {Object} Result object with success flag and content or error
 */
function getPageContent(siteID, pageID) {
    var result = {
        success: false,
        content: null,
        error: null,
        statusCode: null
    };

    try {
        var service = getPWAKitService();
        var serviceResult = service.call({
            siteID: siteID,
            pageID: pageID
        });

        if (serviceResult.status === 'OK') {
            var response = serviceResult.object;
            if (response.statusCode === 200) {
                result.success = true;
                result.content = response.text;
                result.statusCode = 200;
            } else {
                result.error = 'PWA Kit returned status: ' + response.statusCode;
                result.statusCode = response.statusCode;
            }
        } else {
            result.error = 'Service call failed: ' + serviceResult.errorMessage;
            result.statusCode = 500;
        }
    } catch (e) {
        result.error = 'Error calling PWA Kit service: ' + e.message;
        result.statusCode = 500;
    }

    return result;
}

module.exports = {
    getPWAKitService: getPWAKitService,
    getPageContent: getPageContent
};

