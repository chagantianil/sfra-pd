'use strict';

/**
 * @namespace Demo
 */

var server = require('server');

/**
 * Demo-Start : Test controller
 * @name Base/Demo-Start
 * @function
 * @memberof Demo
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.get('Show', function (req, res, next) {
    res.render('demo/demoPage');
    next();
});

module.exports = server.exports();
