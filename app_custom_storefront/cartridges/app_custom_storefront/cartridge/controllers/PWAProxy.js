'use strict';

/**
 * @namespace PWAProxy
 */

var server = require('server');

/**
 * PWAProxy-GetContent : Fetches content from PWA app server-side to bypass CORS
 * @name PWAProxy-GetContent
 * @function
 * @memberof PWAProxy
 * @param {middleware} - server.middleware.include - Support for remote includes
 * @param {querystringparameter} - pageID - The page ID
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('GetContent', server.middleware.include, function (req, res, next) {
    var HTTPClient = require('dw/net/HTTPClient');
    var Site = require('dw/system/Site');

    // Get siteID directly from the current site
    var siteID = Site.getCurrent().getID();
    var pageID = req.querystring.pageID;

    if (!pageID) {
        res.setStatusCode(400);
        res.json({ error: 'Missing pageID' });
        return next();
    }

    // Get PWA Kit URL from Site Preferences
    var pwaKitBaseURL = Site.getCurrent().getCustomPreferenceValue('pwaKitURL');
    
    if (!pwaKitBaseURL || pwaKitBaseURL === null || pwaKitBaseURL === '') {
        res.setStatusCode(500);
        res.json({ 
            error: 'PWA Kit URL not configured. Please set the "PWA Kit URL" preference in Business Manager > Site Preferences > Custom Preferences > PWA Kit.' 
        });
        return next();
    }

    // Remove trailing slash if present
    var baseURL = pwaKitBaseURL.toString().replace(/\/$/, '');
    
    // Construct the full URL: {baseURL}/{siteID}/page/{pageID}?preview=true
    var pwaURL = baseURL + '/' + siteID + '/page/' + pageID + '?preview=true';

    var httpClient = new HTTPClient();
    httpClient.setTimeout(10000);
    httpClient.open('GET', pwaURL);

    try {
        httpClient.send();

        if (httpClient.statusCode === 200) {
            res.setContentType('text/html');
            res.print(httpClient.text);
        } else {
            res.setStatusCode(httpClient.statusCode || 500);
            res.json({ 
                error: 'Failed to fetch PWA content', 
                status: httpClient.statusCode,
                url: pwaURL 
            });
        }
    } catch (e) {
        res.setStatusCode(500);
        res.json({ 
            error: 'Error fetching PWA content: ' + e.message,
            url: pwaURL 
        });
    }

    return next();
});

module.exports = server.exports();


