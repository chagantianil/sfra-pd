'use strict';

var server = require('server');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var URLUtils = require('dw/web/URLUtils');
const renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
const csrfProtectionApi = require('dw/web/CSRFProtection');

/**
 * Newsletter-Show : Renders the newsletter subscription form
 */
server.get('Show', csrfProtection.generateToken, function (req, res, next) {
    var newsletterForm = server.forms.getForm('newsletter');
    newsletterForm.clear();

    const isRemote = req.querystring.remote;

    res.render('newsletter/newsletterForm', {
        form: newsletterForm,
        isRemote: !empty(isRemote) ? isRemote : false,
        csrf: {
            tokenName: csrfProtectionApi.getTokenName(),
            token: csrfProtectionApi.generateToken(),
        }
    });
    next();
});

/**
 * Newsletter-Subscribe : Handles the form submission for newsletter subscription
 * This endpoint is designed to be called via AJAX and returns JSON.
 */
server.post('Subscribe', csrfProtection.validateRequest, function (req, res, next) {
    var newsletterForm = server.forms.getForm('newsletter');

    // Perform server-side validation
    if (!newsletterForm.valid) {
        res.json({
            success: false,
            error: Resource.msg('form.error.invalid', 'newsletter', null)
        });
        return next();
    }

    // Check if a subscription with this email already exists
    var existingSubscription = CustomObjectMgr.getCustomObject('NewsletterSubscription', newsletterForm.email.value);
    
    if (existingSubscription) {
        res.json({
            success: false,
            error: Resource.msg('form.error.email.exists', 'newsletter', null)
        });
        return next();
    }

    var co;
    try {
        // Use Transaction to ensure data integrity
        Transaction.wrap(function () {
            // Create the new Custom Object, using the email as the primary key
            co = CustomObjectMgr.createCustomObject('NewsletterSubscription', newsletterForm.email.value);
            
            // Set the custom attributes
            co.custom.firstName = newsletterForm.firstName.value;
            co.custom.lastName = newsletterForm.lastName.value;
            co.custom.phone = newsletterForm.phone.value;
            co.custom.consent = newsletterForm.consent.value;
        });

    } catch (e) {
        // Log the error
        var Logger = require('dw/system/Logger');
        Logger.error('Error creating NewsletterSubscription CO: {0}', e.message);
        
        res.json({
            success: false,
            error: Resource.msg('form.error.server', 'newsletter', null)
        });
        return next();
    }

    var template = 'newsletter/components/newsletterSuccessContent';
    var renderedHtml = renderTemplateHelper.getRenderedHtml({}, template);

    // On success, return JSON with the URL to the success page
    res.json({
        success: true,
        message: Resource.msg('form.success.message', 'newsletter', null),
        html: renderedHtml
    });
    
    next();
});

module.exports = server.exports();