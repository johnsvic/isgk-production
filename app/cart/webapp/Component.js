/* eslint-disable no-console */
sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/demo/cart/model/models",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/resource/ResourceModel",
    "sap/ui/model/odata/v4/ODataModel",
  ],
  (UIComponent, models, Device, JSONModel, ResourceModel, ODataModel) => {
    "use strict";

    return UIComponent.extend("sap.ui.demo.cart.Component", {
      metadata: {
        manifest: "json",
        interfaces: ["sap.ui.core.IAsyncContentCreation"],
      },

      init() {
        console.log("[Component.js][init] Initializing application...");
        // call the base component's init function
        UIComponent.prototype.init.apply(this, arguments);

        try {
          console.log(
            "[Component.js][init] Retrieving application manifest..."
          );
          var oAppConfig = this.getManifestEntry("/sap.app");
          console.log(
            "[Component.js][init] Manifest retrieved successfully.",
            oAppConfig
          );

          // 🔹 Ensure `appView` model is initialized first
          var oAppView = new JSONModel({
            busy: true,
            delay: 0,
            layout: "TwoColumnsMidExpanded",
          });
          this.setModel(oAppView, "appView");
          console.debug(
            "[Component.js][init] appView model initialized globally."
          );

          // 🔹 Validate OData Configuration
          var oDataSources = oAppConfig.dataSources;
          if (
            !oDataSources ||
            !oDataSources.mainService ||
            !oDataSources.mainService.uri
          ) {
            throw new Error(
              "[Component.js][init] Missing OData service configuration in manifest."
            );
          }

          var oDataServiceUrl = oDataSources.mainService.uri;
          if (!oDataServiceUrl.startsWith('/')) {
            oDataServiceUrl = '/' + oDataServiceUrl;
          }
          console.log(
            "[Component.js][init] OData service URL:",
            oDataServiceUrl
          );

          // 🔹 FIX: Explicitly set OData model as "odata"
          var oDataModel = new ODataModel({
            serviceUrl: oDataServiceUrl,
            synchronizationMode: "None",
            operationMode: "Server",
            autoExpandSelect: true,
          });

          this.setModel(oDataModel, "odata");
          console.log("[Component.js][init] ODataModel set successfully.");

          // Ensure metadata is loaded
          this._ensureMetadataLoaded(oDataModel);
        } catch (error) {
          console.error(
            "[Component.js][init] Error initializing ODataModel:",
            error.message
          );
        }

        // Initialize i18n model
        try {
          var i18nModel = new ResourceModel({
            bundleName: "sap.ui.demo.cart.i18n.i18n",
          });
          this.setModel(i18nModel, "i18n");
          console.log("[Component.js][init] i18n model set successfully.");
        } catch (error) {
          console.error(
            "[Component.js][init] Error initializing i18n model:",
            error.message
          );
        }

        // Initialize device model
        var oDeviceModel = new JSONModel(Device);
        this.setModel(oDeviceModel, "device");
        console.log("[Component.js][init] Device model initialized.");

        // ✅ 🔹 FIX: Initialize the router and navigate to home
        this.getRouter().initialize();
        console.debug(
          "[Component.js][init] Router initialized and navigating..."
        );

        // Update browser title dynamically
        this.getRouter().attachTitleChanged(function (oEvent) {
          var sTitle = oEvent.getParameter("title");
          console.debug("[Component.js][init] sTitle...", sTitle);
          document.addEventListener("DOMContentLoaded", function () {
            document.title = sTitle;
          });
        });
      },

      _ensureMetadataLoaded: function (oModel) {
        console.log("[Component.js] Ensuring OData metadata is loaded...");
        if (!oModel || typeof oModel.getMetaModel !== "function") {
          console.error(
            "[Component.js][_ensureMetadataLoaded] ODataModel is undefined or missing getMetaModel()."
          );
          return;
        }
        oModel
          .getMetaModel()
          .requestObject("/")
          .then(() => {
            console.log(
              "[Component.js][_ensureMetadataLoaded] OData metadata successfully loaded."
            );
          })
          .catch((oError) => {
            console.error(
              "[Component.js][_ensureMetadataLoaded] Error loading OData metadata:",
              oError.message,
              oError
            );
          });
      },

      getContentDensityClass: function () {
        if (!this._sContentDensityClass) {
          this._sContentDensityClass = Device.support.touch
            ? "sapUiSizeCozy"
            : "sapUiSizeCompact";
          console.log(
            "[Component.js][getContentDensityClass] Content density set to:",
            this._sContentDensityClass
          );
        }
        return this._sContentDensityClass;
      },
    });
  }
);
