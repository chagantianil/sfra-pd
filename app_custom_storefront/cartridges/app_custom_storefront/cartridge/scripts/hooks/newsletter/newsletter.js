var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');

exports.post = function (request, response) {
    var payload = JSON.parse(request.httpBody);
    var email = payload.email;

    Transaction.wrap(function () {
        var co = CustomObjectMgr.createCustomObject('NewsletterSubscription', email);
        co.custom.firstName = payload.firstName;
        co.custom.lastName = payload.lastName;
    });

    response.setStatus(200);
    return { success: true };
};