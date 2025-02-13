/* eslint-disable no-console */
sap.ui.define(
    [
      "sap/ui/core/mvc/Controller",
      "sap/m/MessageToast",
      "sap/ui/core/UIComponent",
      "sap/ui/core/routing/History",
    ],
    function (Controller, MessageToast, UIComponent, History) {
      "use strict";
  
      return Controller.extend("sap.ui.demo.cart.controller.BaseController", {
        
        /**
         * Retrieves the router instance.
         * @returns {sap.ui.core.routing.Router} The router instance
         */
        getRouter: function () {
          console.debug(
            "[BaseController.js][getRouter] getRouter() - Retrieving router instance."
          );
          var oRouter = UIComponent.getRouterFor(this);
          if (!oRouter) {
            console.error(
              "[BaseController.js][getRouter] getRouter() - Router instance not found!"
            );
          }
          return oRouter;
        },
  
        /**
         * Retrieves the specified model or the default model from the view or component.
         * @param {string} [sName] The name of the model
         * @returns {sap.ui.model.Model} The requested model
         */
        getModel: function (sName) {
          console.debug(
            "[BaseController.js][getModel] getModel() - Retrieving model:",
            sName
          );
          var oModel =
            this.getView().getModel(sName) ||
            this.getOwnerComponent().getModel(sName);
          if (!oModel) {
            console.warn(
              "[BaseController.js][getModel] getModel() - Model not found:",
              sName
            );
          }
          return oModel;
        },
  
        /**
         * Sets the specified model to the view.
         * @param {sap.ui.model.Model} oModel The model instance
         * @param {string} sName The name of the model
         */
        setModel: function (oModel, sName) {
          console.debug(
            "[BaseController.js][setModel] setModel() - Setting model:",
            sName,
            oModel
          );
          if (!oModel) {
            console.error(
              "[BaseController.js][setModel] setModel() - Cannot set a null model:",
              sName
            );
            return;
          }
          return this.getView().setModel(oModel, sName);
        },
  
        /**
         * Retrieves the resource bundle from the i18n model.
         * @returns {sap.ui.model.resource.ResourceModel} The resource bundle
         */
        getResourceBundle: function () {
          console.debug(
            "[BaseController.js][getResourceBundle] getResourceBundle() - Retrieving i18n resource bundle."
          );
          var oBundle = this.getOwnerComponent()
            .getModel("i18n")
            ?.getResourceBundle();
          if (!oBundle) {
            console.error(
              "[BaseController.js][getResourceBundle] getResourceBundle() - Resource bundle not found!"
            );
          }
          return oBundle;
        },
  
        /**
         * Handles state changes in the FlexibleColumnLayout.
         * Updates the layout and adjusts small screen mode properties.
         * @param {sap.ui.base.Event} oEvent The state change event
         */
        onStateChange: function (oEvent) {
          console.debug(
            "[BaseController.js][onStateChange] onStateChange() - State change detected."
          );
          var sLayout = oEvent.getParameter("layout");
          var iColumns = oEvent.getParameter("maxColumnsCount");
  
          console.debug(
            "[BaseController.js][onStateChange] onStateChange() - Current layout:",
            sLayout,
            ", Max columns:",
            iColumns
          );
  
          if (iColumns === 1) {
            this.getModel("appView").setProperty("/smallScreenMode", true);
            console.debug(
              "[BaseController.js][onStateChange] onStateChange() - Small screen mode activated."
            );
          } else {
            this.getModel("appView").setProperty("/smallScreenMode", false);
            console.debug(
              "[BaseController.js][onStateChange] onStateChange() - Small screen mode deactivated."
            );
  
            if (sLayout === "OneColumn") {
              this.setLayout("Two");
              console.debug(
                "[BaseController.js][onStateChange] onStateChange() - Layout changed to 'TwoColumnsMidExpanded'."
              );
            }
          }
        },
  
        /**
         * Sets the flexible column layout to one, two, or three columns for different scenarios across the app.
         * @param {string} sColumns The target number of columns ("One", "Two", "Three")
         */
        setLayout: function (sColumns) {
          console.debug(
            "[BaseController.js][onStateChange] setLayout() - Changing layout to:",
            sColumns
          );
          if (!sColumns) {
            console.warn(
              "[BaseController.js][onStateChange] setLayout() - No layout specified. Aborting."
            );
            return;
          }
  
          try {
            var sLayout =
              sColumns + "Column" + (sColumns === "One" ? "" : "sMidExpanded");
            this.getModel("appView").setProperty("/layout", sLayout);
            console.debug(
              "[BaseController.js][onStateChange] setLayout() - Layout successfully updated:",
              sLayout
            );
          } catch (error) {
            console.error(
              "[BaseController.js][onStateChange] setLayout() - Error updating layout:",
              error
            );
          }
        },
  
        /**
         * Navigates back in browser history or to the home screen if no previous history exists.
         */
        onBack: function () {
          console.debug("[BaseController.js][onBack] onBack() - Navigation triggered.");
  
          try {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
  
            if (sPreviousHash !== undefined) {
              console.debug(
                "[BaseController.js][onBack] onBack() - Navigating back in history."
              );
              window.history.go(-1);
            } else {
              console.debug(
                "[BaseController.js][onBack] onBack() - No history found. Navigating to home."
              );
              this.getRouter().navTo("home");
            }
          } catch (error) {
            console.error(
              "[BaseController.js][onBack] onBack() - Error during navigation:",
              error
            );
          }
        },
        /**
         * Adds a product to the cart using OData V4 with proper context resolution.
         * @param {sap.ui.base.Event} oEvent The event object
         */
        onAddToCart: function (oEvent) {
          console.debug(
            "[BaseController.js][onAddToCart] onAddToCart: Event triggered.",
            oEvent
          );
  
          var oSource = oEvent.getSource();
          console.debug(
            "[BaseController.js][onAddToCart] onAddToCart: Event source retrieved.",
            oSource
          );
  
          // Ensure oSource is a UI5 control
          if (!(oSource instanceof sap.ui.core.Element)) {
            console.error(
              "[BaseController.js][onAddToCart] onAddToCart: Event source is not a UI5 control."
            );
            MessageToast.show("Unable to retrieve product details.");
            return;
          }
  
          var oBindingContext = oSource.getBindingContext();
          console.debug(
            "[BaseController.js][onAddToCart] onAddToCart: Binding context retrieved.",
            oBindingContext
          );
  
          if (!oBindingContext) {
            console.error(
              "[BaseController.js][onAddToCart] onAddToCart: No binding context found."
            );
            MessageToast.show("Unable to retrieve product details.");
            return;
          }
  
          var oProduct = oBindingContext.getObject();
          console.debug(
            "[BaseController.js][onAddToCart] onAddToCart: Product data retrieved from context.",
            oProduct
          );
  
          if (!oProduct || !oProduct.ProductId) {
            console.error(
              "[BaseController.js][onAddToCart] onAddToCart: Invalid product data.",
              oProduct
            );
            MessageToast.show("Invalid product details.");
            return;
          }
  
          var oCartModel = this.getModel("odata");
          console.debug(
            "[BaseController.js][onAddToCart] onAddToCart: OData model retrieved.",
            oCartModel
          );
  
          // 🔹 Use `bindContext()` to check if product already exists in cart
          var oCartItemContext = oCartModel.bindContext(
            "/CartItems(ProductId='" + oProduct.ProductId + "')"
          );
  
          oCartItemContext
            .requestObject()
            .then((oExistingItem) => {
              if (oExistingItem) {
                console.debug(
                  "[BaseController.js][onAddToCart] onAddToCart: Product exists in cart. Updating quantity."
                );
  
                // 🔹 Use `setProperty()` to update quantity
                var sQuantityPath = oCartItemContext.getPath() + "/Quantity";
                var iCurrentQuantity = oCartModel.getProperty(sQuantityPath);
                oCartModel.setProperty(sQuantityPath, iCurrentQuantity + 1);
  
                oCartModel
                  .submitBatch("cartUpdateGroup")
                  .then(() => {
                    console.debug(
                      "[BaseController.js][onAddToCart] onAddToCart: Quantity updated successfully."
                    );
                    MessageToast.show("Product quantity updated in cart.");
                  })
                  .catch((oError) => {
                    console.error(
                      "[BaseController.js][onAddToCart] onAddToCart: Error updating quantity.",
                      oError
                    );
                    MessageToast.show("Failed to update product in cart.");
                  });
              } else {
                console.debug(
                  "[BaseController.js][onAddToCart] onAddToCart: Product not found in cart. Adding new item."
                );
  
                // 🔹 Use `bindList().create()` to add a new cart item
                var oCartListBinding = oCartModel.bindList("/CartItems");
                oCartListBinding.create({
                  UserID: "currentUser",
                  ProductId: oProduct.ProductId,
                  Quantity: 1,
                });
  
                oCartModel
                  .submitBatch("cartCreateGroup")
                  .then(() => {
                    console.debug(
                      "[BaseController.js][onAddToCart] onAddToCart: New product added to cart."
                    );
                    MessageToast.show("Product added to cart.");
                  })
                  .catch((oError) => {
                    console.error(
                      "[BaseController.js][onAddToCart] onAddToCart: Error adding new cart item.",
                      oError
                    );
                    MessageToast.show("Failed to add product to cart.");
                  });
              }
            })
            .catch((oError) => {
              console.error(
                "[BaseController.js][onAddToCart] onAddToCart: Error requesting cart item.",
                oError
              );
              MessageToast.show("Error accessing cart items.");
            });
        },
      });
    }
  );
  