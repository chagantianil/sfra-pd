'use strict';

/**
 * @namespace Home
 */

var server = require('server');

server.extend(module.superModule);
const ProductMgr = require('dw/catalog/ProductMgr');

server.get('Description', function (req, res, next) {
    res.cachePeriod = 4;
    res.cachePeriodUnit = 'hours';
    const apiProduct = ProductMgr.getProduct(req.querystring.pid)
    const shortDescription = apiProduct && apiProduct.shortDescription ? apiProduct.shortDescription.markup : '';
    res.render('product/components/descriptionAndDetailsRemote', {shortDescription: shortDescription});
    next();
});

server.get('Recommendations', function (req, res, next) {
    var productIds = [];
    const apiProduct = ProductMgr.getProduct(req.querystring.pid)
    productIds = apiProduct.recommendations
        .toArray()
        .filter((rec) => rec.recommendedItem && rec.recommendedItem.online)
        .map((rec) => rec.recommendedItemID);
    res.render('product/components/recommendations', {productIds: productIds});
    next();
});

module.exports = server.exports();
