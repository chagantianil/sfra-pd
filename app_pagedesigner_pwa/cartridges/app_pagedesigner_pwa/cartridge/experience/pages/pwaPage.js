'use strict';

var Template = require('dw/util/Template');
var HashMap = require('dw/util/HashMap');
var PageRenderHelper = require('*/cartridge/experience/utilities/PageRenderHelper.js');

/**
 * Render logic for PWA Page Designer page type.
 * This page fetches and displays content from PWA Kit via the PWAProxy controller.
 *
 * @param {dw.experience.PageScriptContext} context - The page script context object
 * @param {dw.util.Map} [modelIn] - Additional model values from another cartridge
 * @returns {string} The markup to be displayed
 */
module.exports.render = function (context, modelIn) {
    var model = modelIn || new HashMap();

    // Pass page to template (used for page ID in proxy call)
    model.page = context.page;

    // Enable Page Designer edit mode if applicable
    if (PageRenderHelper.isInEditMode()) {
        var HookManager = require('dw/system/HookMgr');
        HookManager.callHook('app.experience.editmode', 'editmode');
    }

    return new Template('experience/pages/pwaPage').render(model).text;
};
