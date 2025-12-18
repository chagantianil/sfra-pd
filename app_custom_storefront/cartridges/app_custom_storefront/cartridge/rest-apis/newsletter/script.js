var RESTResponseMgr = require("dw/system/RESTResponseMgr");
var CustomObjectMgr = require("dw/object/CustomObjectMgr");
var Transaction = require("dw/system/Transaction");
var Logger = require("dw/system/Logger");

exports.setNewsletterInfo = function () {
    // 1. Parse Parameters
    const params = request.httpParameters;
    const email = params.c_email ? params.c_email[0] : null;
    const firstName = params.c_firstName ? params.c_firstName[0] : null;
    const lastName = params.c_lastName ? params.c_lastName[0] : null;
    const phone = params.c_phone ? params.c_phone[0] : null;
    // Assuming consent is passed as a string "true" or "false"
    const consent = params.c_consent ? params.c_consent[0] : null;

    // 2. Validation: Email is the Primary Key, so it is mandatory
    if (!email) {
        return RESTResponseMgr.createError(400, "Missing required parameter: email").render();
    }

    var success = false;
    var message = "";

    try {
        // 3. Database Transaction
        Transaction.wrap(function () {
            // Try to find an existing subscription to update
            var co = CustomObjectMgr.getCustomObject("NewsletterSubscription", email);

            // If it doesn't exist, create a new one
            if (!co) {
                co = CustomObjectMgr.createCustomObject("NewsletterSubscription", email);
            }

            // 4. Update Attributes
            // Note: Custom attributes are always accessed via .custom
            if (firstName) co.custom.firstName = firstName;
            if (lastName) co.custom.lastName = lastName;
            if (phone) co.custom.phone = phone;
            
            // Handle Boolean conversion for consent if the CO attribute is type Boolean
            if (consent !== null) {
                co.custom.consent = (consent.toLowerCase() === 'true');
            }
        });

        success = true;
        message = "Newsletter subscription updated successfully.";

    } catch (e) {
        // Log the error for debugging
        Logger.error("Error updating NewsletterSubscription: {0}", e.message);
        return RESTResponseMgr.createError(500, "Internal Server Error").render();
    }

    // 5. Success Response
    var info = {
        success: success,
        message: message,
        email: email
    };

    RESTResponseMgr
        .createSuccess(info)
        .render();
};

exports.setNewsletterInfo.public = true;