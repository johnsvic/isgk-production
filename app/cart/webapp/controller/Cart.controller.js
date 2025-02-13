/* eslint-disable no-console */
sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/ui/model/odata/v4/ODataModel", // OData V4 model for backend integration
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
  ],
  function (
    BaseController,
    JSONModel,
    Device,
    ODataModel,
    formatter,
    MessageBox,
    MessageToast
  ) {
    "use strict";

    var sCartModelName = "cartProducts";
    var sUserId = "johnsvic";

    return BaseController.extend("sap.ui.demo.cart.controller.Cart", {
      formatter: formatter,

      onInit: function () {
        console.debug("[Cart.controller.js] onInit() called.");

        var oEventBus = sap.ui.getCore().getEventBus();
        oEventBus.subscribe("Cart", "Refresh", this._refreshCartData, this);

        // ✅ Initialize the cartProducts model
        var oCartModel = new JSONModel({
          CartItems: [],
          showProceedButton: false,
          showEditButton: false,
        });
        this.getView().setModel(oCartModel, "cartProducts");
        console.debug(
          "[Cart.controller.js] ✅ cartProducts model initialized."
        );

        // Attach route matched handler
        this._oRouter = this.getRouter();
        this._oRouter
          .getRoute("cart")
          .attachPatternMatched(this._routePatternMatched, this);
        this._oRouter
          .getRoute("productCart")
          .attachPatternMatched(this._routePatternMatched, this);
        console.debug(
          "[Cart.controller.js] Router initialized for cart routes."
        );

        // Set initial UI configuration model
        var oCfgModel = new JSONModel({});
        this.getView().setModel(oCfgModel, "cfg");
        this._toggleCfgModel();
        console.debug("[Cart.controller.js] UI configuration model set.");
      },

      _toggleCfgModel: function () {
        console.debug("[Cart.controller.js] _toggleCfgModel() called.");

        var oCfgModel = this.getView().getModel("cfg");
        if (!oCfgModel) {
          console.error(
            "[Cart.controller.js] ❌ ERROR: Configuration model 'cfg' is missing."
          );
          return;
        }

        var oData = oCfgModel.getData();
        var oBundle = this.getResourceBundle();
        var bDataNoSetYet = !oData.hasOwnProperty("inDelete");
        var bInDelete = bDataNoSetYet ? true : oData.inDelete;
        var sPhoneMode = Device.system.phone ? "None" : "SingleSelectMaster";
        var sPhoneType = Device.system.phone ? "Active" : "Inactive";

        oCfgModel.setData({
          inDelete: !bInDelete,
          notInDelete: bInDelete,
          listMode: bInDelete ? sPhoneMode : "Delete",
          listItemType: bInDelete ? sPhoneType : "Inactive",
          pageTitle: bInDelete
            ? oBundle.getText("appTitle")
            : oBundle.getText("cartTitleEdit"),
        });

        console.debug(
          "[Cart.controller.js] 🔄 Configuration model toggled:",
          oCfgModel.getData()
        );
      },

      onEditOrDoneButtonPress: function () {
        this._toggleCfgModel();
      },

      _routePatternMatched: function () {
        console.debug("[Cart.controller.js] _routePatternMatched() called.");
        this.setLayout("Three");
        this._refreshCartData();
      },

      _refreshCartData: async function () {
        console.debug("[Cart.controller.js] _refreshCartData() called.");

        var oModel = this.getOwnerComponent().getModel("odata"); // OData V4 model
        if (!oModel) {
          console.error(
            "[Cart.controller.js] ❌ ERROR: OData model not found."
          );
          return;
        }

        var oCartModel = this.getView().getModel("cartProducts");
        if (!oCartModel) {
          console.warn(
            "[Cart.controller.js] ⚠️ Model 'cartProducts' is missing. Creating a new one."
          );
          oCartModel = new JSONModel({
            CartItems: [],
            showProceedButton: false,
            showEditButton: false,
          });
          this.getView().setModel(oCartModel, "cartProducts");
        }
        try {
          this.getView().setBusy(true);
          console.debug(
            "[Cart.controller.js] 🔄 Fetching cart items using OData V4 binding..."
          );
          var oListBinding = oModel.bindList("/CartItems", null, null, null, {
            $expand: "Product", // Expand the Product association
          });
          var aCartContexts = await oListBinding.requestContexts();

          if (aCartContexts.length > 0) {
            console.debug(
              `[Cart.controller.js] ✅ Cart has ${aCartContexts.length} items.`
            );
            var aCartItems = await Promise.all(
              aCartContexts.map((ctx) => ctx.requestObject())
            );
            var aFilteredCartItems = aCartItems.filter(
              (item) => item.User_ID === sUserId
            );
            oCartModel.setProperty("/CartItems", aFilteredCartItems);

            // Log the updated cartProducts model for debugging
            console.debug(
              "[Cart.controller.js] 🔍 Updated cartProducts model:",
              JSON.stringify(oCartModel.getData(), null, 2)
            );

            oCartModel.setProperty(
              "/showProceedButton",
              aFilteredCartItems.length > 0
            );
            oCartModel.setProperty(
              "/showEditButton",
              aFilteredCartItems.length > 0
            );
          } else {
            console.debug("[Cart.controller.js] 🛒 Cart is empty.");
            oCartModel.setProperty("/CartItems", []);
            oCartModel.setProperty("/showProceedButton", false);
            oCartModel.setProperty("/showEditButton", false);

            // Log the empty cartProducts model for debugging
            console.debug(
              "[Cart.controller.js] 🔍 Updated cartProducts model (empty):",
              JSON.stringify(oCartModel.getData(), null, 2)
            );
          }
          this._calculateTotalPrice();
          oCartModel.updateBindings(true); // Ensure UI updates
        } catch (oError) {
          console.error(
            "[Cart.controller.js] ❌ ERROR: Failed to fetch cart data.",
            oError
          );
        } finally {
          this.getView().setBusy(false);
          oCartModel.refresh(true);
        }
      },

      _calculateTotalPrice: function () {
        const oCartModel = this.getView().getModel("cartProducts");
        if (!oCartModel) {
          console.error(
            "[Cart.controller.js] ❌ cartProducts model is missing."
          );
          return;
        }

        const aCartItems = oCartModel.getProperty("/CartItems") || [];
        if (!Array.isArray(aCartItems) || aCartItems.length === 0) {
          console.debug(
            "[Cart.controller.js] 🛒 Cart is empty. Setting total to 0.00 JPY."
          );
          oCartModel.setProperty("/TotalPrice", "0.00");
          return;
        }

        // Calculate total price
        const fTotalPrice = aCartItems.reduce((total, item) => {
          const fPrice = parseFloat(item?.Product?.Price) || 0; // Handle undefined or non-numeric values
          const iQuantity = parseInt(item?.Quantity, 10) || 0; // Ensure Quantity is an integer
          return total + fPrice * iQuantity;
        }, 0);

        oCartModel.setProperty("/TotalPrice", fTotalPrice.toFixed(2));
        console.debug(
          "[Cart.controller.js] Total Price calculated:",
          fTotalPrice
        );
      },

      onQuantityChange: function (oEvent) {
        console.debug("[Cart.controller.js] onQuantityChange() called.");

        var oItem = oEvent.getSource().getBindingContext(sCartModelName);
        var oProduct = oItem.getObject();
        var oCartModel = this.getModel(sCartModelName);
        var oModel = this.getOwnerComponent().getModel("odata");

        var iNewQuantity = parseInt(oEvent.getParameter("value"), 10);
        if (isNaN(iNewQuantity) || iNewQuantity < 1) {
          MessageToast.show("Invalid quantity. Must be at least 1.");
          return;
        }

        console.debug(
          "[Cart.controller.js] Updating quantity for Product ID:",
          oProduct.ProductId,
          " New Quantity:",
          iNewQuantity
        );

        oItem.setProperty("Quantity", iNewQuantity);
        oCartModel.setProperty("/isUpdating", true);

        oModel
          .submitBatch("cartUpdateGroup")
          .then(function () {
            MessageToast.show("Quantity updated to " + iNewQuantity);
            console.debug(
              "[Cart.controller.js] ✅ Quantity updated successfully."
            );
          })
          .catch(function (oError) {
            console.error(
              "[Cart.controller.js] ❌ ERROR: Failed to update quantity.",
              oError
            );
            MessageToast.show("Error updating cart.");
          })
          .finally(function () {
            oCartModel.setProperty("/isUpdating", false);
            oCartModel.refresh(true);
          });
      },

      onCartEntriesDelete: function (oEvent) {
        console.debug("[Cart.controller.js] onCartEntriesDelete() called.");

        var oListItem = oEvent.getParameter("listItem");
        if (!oListItem) {
          console.error(
            "[Cart.controller.js] ❌ ERROR: No list item selected for deletion."
          );
          return;
        }

        var oJSONBindingContext = oListItem.getBindingContext("cartProducts");
        if (!oJSONBindingContext) {
          console.error(
            "[Cart.controller.js] ❌ ERROR: No binding context found in JSONModel."
          );
          return;
        }

        var oItemData = oJSONBindingContext.getObject();
        if (!oItemData || !oItemData.ID) {
          console.error(
            "[Cart.controller.js] ❌ ERROR: Unable to retrieve item data or ID."
          );
          return;
        }

        console.debug(
          "[Cart.controller.js] Selected Item Data from JSONModel:",
          oItemData
        );

        var sItemID = oItemData.ID;
        var sODataPath = "/CartItems('" + sItemID + "')";

        console.debug(
          "[Cart.controller.js] OData Path for Deletion:",
          sODataPath
        );

        var oModel = this.getView().getModel("odata");

        // 🔥 Fix: Preserve `this` correctly
        var that = this;

        // Retrieve the correct OData Binding Context
        oModel
          .bindList("/CartItems")
          .requestContexts()
          .then(function (aContexts) {
            var oODataBindingContext = aContexts.find(
              (ctx) => ctx.getObject().ID === sItemID
            );

            if (!oODataBindingContext) {
              console.error(
                "[Cart.controller.js] ❌ ERROR: Could not find OData binding context for ID:",
                sItemID
              );
              return;
            }

            console.debug(
              "[Cart.controller.js] ✅ OData Binding Context Found:",
              oODataBindingContext.getPath()
            );

            var oCartModel = that.getView().getModel("cartProducts");
            var aCartItems = oCartModel.getProperty("/CartItems");
            var aUpdatedCartItems = aCartItems.filter(
              (item) => item.ID !== sItemID
            );
            oCartModel.setProperty("/CartItems", aUpdatedCartItems);

            MessageBox.confirm("Are you sure you want to delete this item?", {
              title: "Confirm Deletion",
              actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
              onClose: function (oAction) {
                if (oAction !== MessageBox.Action.DELETE) {
                  console.debug(
                    "[Cart.controller.js] Deletion cancelled. Restoring item in JSONModel."
                  );
                  oCartModel.setProperty("/CartItems", aCartItems);
                  return;
                }

                console.debug(
                  "[Cart.controller.js] Proceeding to delete item with ID:",
                  sItemID
                );

                // 🔥 Fix: Ensure 'this' is preserved correctly
                oODataBindingContext
                  .delete("$auto")
                  .then(function () {
                    console.debug(
                      "[Cart.controller.js] ✅ Item deleted successfully from OData."
                    );
                    MessageToast.show("Item deleted from cart.");
                    that._refreshCartData(); // ✅ Fix: Now correctly calls _refreshCartData()
                  })
                  .catch(function (oError) {
                    console.error(
                      "[Cart.controller.js] ❌ ERROR: Failed to delete item from backend.",
                      oError
                    );
                    oCartModel.setProperty("/CartItems", aCartItems);
                    MessageToast.show("Error deleting item.");
                  });
              },
            });
          })
          .catch(function (oError) {
            console.error(
              "[Cart.controller.js] ❌ ERROR: Failed to retrieve OData list binding contexts.",
              oError
            );
          });
      },

      onProceedButtonPress: function () {
        console.debug(
          "[Cart.controller.js][onCartEntriesDelete] onProceedButtonPress() called."
        );
        var oCartModel = this.getView().getModel("cartProducts");
        if (!oCartModel || oCartModel.getProperty("/CartItems").length === 0) {
          MessageToast.show("Your cart is empty. Add items to proceed.");
          return;
        }
        this.getRouter().navTo("checkout");
      },
    });
  }
);
