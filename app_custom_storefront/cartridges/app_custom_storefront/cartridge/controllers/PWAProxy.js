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
    var Site = require('dw/system/Site');
    var pwaKitService = require('*/cartridge/scripts/services/pwaKitService');

    // Get siteID directly from the current site
    var siteID = Site.getCurrent().getID();
    var pageID = req.querystring.pageID;

    if (!pageID) {
        res.setStatusCode(400);
        res.json({ error: 'Missing pageID' });
        return next();
    }

    // Use the SFCC Service Framework to fetch content
    // PWA Kit URL is configured in service credential, not site preference
    var result = pwaKitService.getPageContent(siteID, pageID);

    if (result.success) {
        res.setContentType('text/html');
        res.print(result.content);
    } else {
        res.setStatusCode(result.statusCode || 500);
        res.json({
            error: result.error,
            status: result.statusCode
        });
    }

    return next();
});

module.exports = server.exports();
