/* eslint-disable no-console */
sap.ui.define([
    "./BaseController",
    "sap/ui/core/UIComponent"
], function(BaseController, UIComponent) {
    "use strict";

    return BaseController.extend("sap.ui.demo.cart.controller.NotFound", {
        onInit: function () {
            console.debug("[NotFound.controller.js] onInit() called.");

            this._router = UIComponent.getRouterFor(this);

            // Log routing setup for the NotFound controller
            console.debug("[NotFound.controller.js] Router initialized for NotFound view.");
        }
    });
});
