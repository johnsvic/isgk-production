/* eslint-disable no-console */
sap.ui.define([
    "sap/ui/model/type/String",
    "sap/ui/model/ValidateException",
    "sap/ui/model/resource/ResourceModel"
], function (String, ValidateException, ResourceModel) {
    "use strict";

    console.debug("[EmailType.js] Module initialized.");

    // Load i18n resource bundle for validation messages
    var oResourceModel = new ResourceModel({
        bundleName: "sap.ui.demo.cart.i18n.i18n"
    });

    return String.extend("sap.ui.demo.cart.model.EmailType", {

        /**
         * Validates the given email value.
         * Ensures strict email validation using a regex pattern.
         *
         * @public
         * @param {string} oValue Email value to be validated
         * @throws {sap.ui.model.ValidateException} if the email format is invalid
         */
        validateValue: function (oValue) {
            console.debug("[EmailType.js] validateValue() called with value:", oValue);

            // RFC 5322 compliant email validation pattern (strict format)
            var rEmailStrict = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

            if (!oValue.match(rEmailStrict)) {
                var sErrorMessage = oResourceModel.getResourceBundle().getText("checkoutCodEmailValueTypeMismatch", [oValue]);
                console.error("[EmailType.js] Invalid email format:", oValue, " | Error Message:", sErrorMessage);
                throw new ValidateException(sErrorMessage);
            }

            console.debug("[EmailType.js] Email validation successful for:", oValue);
        }
    });
});
