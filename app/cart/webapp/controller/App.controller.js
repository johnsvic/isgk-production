sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel"
], (BaseController, JSONModel) => {
  "use strict";

  return BaseController.extend("sap.ui.demo.cart.controller.App", {
      onInit: function () {
        console.debug("[App.controller.js][onInit] onInit() - Initializing App controller.");

            var iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

            // Initialize JSONModel for UI state (busy indicator, layout, smallScreenMode)
            var oViewModel = new JSONModel({
                busy: true,
                delay: 0,
                layout: "TwoColumnsMidExpanded",
                smallScreenMode: true // Consider handling this dynamically if needed
            });
            this.setModel(oViewModel, "appView");
            console.debug("[App.controller.js][onInit] onInit() - appView model initialized:", oViewModel.getData());

            // Retrieve OData Model from Component.js
            var oModel = this.getOwnerComponent().getModel();
            if (oModel && typeof oModel.getMetaModel === "function") {
                console.debug("[App.controller.js][onInit] OData model detected. Waiting for metadata to load...");

                // Wait for metadata before marking app as "not busy"
                oModel.getMetaModel().requestObject("/").then(() => {
                    console.debug("[App.controller.js][onInit] Metadata loaded. Setting app to not busy.");
                    oViewModel.setProperty("/busy", false);
                    oViewModel.setProperty("/delay", iOriginalBusyDelay);
                }).catch((oError) => {
                    console.error("[App.controller.js][onInit] Error loading OData metadata. App will proceed without metadata:", oError);
                    oViewModel.setProperty("/busy", false); // Prevent app from staying stuck in busy state
                });
            } else {
                console.warn("[App.controller.js][onInit] OData model is not available. Skipping metadata loading.");
                oViewModel.setProperty("/busy", false);
                oViewModel.setProperty("/delay", iOriginalBusyDelay);
            }
            

            console.debug("[App.controller.js][onInit] Metadata load request sent (if model available).");

            // Apply content density mode to root view
            try {
                var sContentDensityClass = this.getOwnerComponent().getContentDensityClass();
                this.getView().addStyleClass(sContentDensityClass);
                console.debug("[App.controller.js][onInit] Content density class applied:", sContentDensityClass);
            } catch (error) {
                console.error("[App.controller.js][onInit] Error applying content density class:", error);
            }

            console.debug("[App.controller.js][onInit] App controller initialization completed.");
      }
  });
});