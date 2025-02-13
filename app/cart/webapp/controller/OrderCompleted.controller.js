/* eslint-disable no-console */
sap.ui.define(["./BaseController"], function (BaseController) {
  "use strict";

  return BaseController.extend("sap.ui.demo.cart.controller.OrderCompleted", {
    onInit: function () {
      console.debug("[OrderCompleted.controller.js] onInit() called.");

      this._oRouter = this.getRouter();
      console.debug("[OrderCompleted.controller.js] Router initialized.");
      this._oRouter
        .getRoute("ordercompleted")
        .attachPatternMatched(this._onOrderCompletedMatched, this);
    },

    /**
     * Retrieves order number from the route and updates the model
     */
    _onOrderCompletedMatched: function (oEvent) {
      var sOrderNumber = oEvent.getParameter("arguments").orderNumber;
      console.debug(
        "[OrderCompleted.controller.js] Retrieved Order Number:",
        sOrderNumber
      );

      var oModel = new sap.ui.model.json.JSONModel({
        orderNumber: sOrderNumber,
        orderMessage:
          "<h3>Thank you for your order!</h3>" +
          "<p><strong>Your order number: " +
          sOrderNumber +
          "</strong></p>",
      });
      this.getView().setModel(oModel, "orderData");
    },

    onReturnToShopButtonPress: function () {
      console.debug(
        "[OrderCompleted.controller.js] onReturnToShopButtonPress() called."
      );

      // Set layout to two columns and navigate to home
      this.setLayout("Two");
      this._oRouter.navTo("home");

      console.debug(
        "[OrderCompleted.controller.js] Navigation triggered to home screen."
      );
    },
  });
});
