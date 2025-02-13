
sap.ui.define(
  [
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/library",
  ],
  function (
    BaseController,
    formatter,
    ODataModel,
    JSONModel,
    Filter,
    FilterOperator,
    MessageToast,
    MessageBox,
    library
  ) {
    "use strict";

    return BaseController.extend("sap.ui.demo.cart.controller.Product", {
      formatter: formatter,

      onInit: function () {
        console.debug("[Product.controller.js] onInit() called.");

        const oComponent = this.getOwnerComponent();
        this._router = oComponent.getRouter();
        this._router
          .getRoute("product")
          .attachPatternMatched(this._routePatternMatched, this);

        // Ensure metadata is loaded before proceeding
        const oModel = this.getOwnerComponent().getModel("odata");
        if (!oModel || typeof oModel.getMetaModel !== "function") {
          console.error(
            "[Product.controller.js] ensureMetadataLoaded() - OData model not found."
          );
          return;
        }

        const oMetaModel = oModel.getMetaModel();
        if (!oMetaModel) {
          console.error(
            "[Product.controller.js] ensureMetadataLoaded() - MetaModel not found."
          );
          return;
        }

        oMetaModel
          .requestObject("/")
          .then(() => {
            console.debug(
              "[Product.controller.js] Metadata successfully loaded."
            );
          })
          .catch((error) => {
            console.error(
              "[Product.controller.js] Error loading metadata:",
              error
            );
          });
      },

      _routePatternMatched: function (oEvent) {
        console.debug("[Product.controller.js] _routePatternMatched() called.");

        const sId = oEvent.getParameter("arguments").productId;
        const oView = this.getView();
        const oModel = oView.getModel("odata");

        if (!oModel) {
          console.error(
            "[Product.controller.js] OData model is not available."
          );
          return;
        }

        const sPath = `/Products('${sId}')`;

        console.debug(
          "[Product.controller.js] Binding path for product:",
          sPath
        );

        // Directly bind the element to the view
        oView.bindElement({
          path: sPath,
          model: "odata",
          parameters: {
            $expand: "Category", // Expand related entity data if necessary
          },
          events: {
            dataRequested: function () {
              oView.setBusy(true);
            },
            dataReceived: function () {
              oView.setBusy(false);
              this._checkIfProductAvailable(sPath);
            }.bind(this),
            change: function () {
              console.debug(
                "[Product.controller.js] Element binding data change detected."
              );
            },
          },
        });

        // Check if the binding context is resolved properly
        const oContext = oView.getBindingContext("odata");
        if (!oContext) {
          console.warn(
            "[Product.controller.js] Binding context is not resolved. Data might be unavailable."
          );
        }
      },

      _checkIfProductAvailable: function (sPath) {
        const oView = this.getView();
        const oContext = oView.getBindingContext("odata");

        if (!oContext) {
          console.error("[Product.controller.js] No binding context found.");
          this._router.getTargets().display("notFound");
          return;
        }

        const oData = oContext.getObject(); // Retrieve the data from the binding context

        if (!oData) {
          this._router.getTargets().display("notFound");
          console.debug(
            "[Product.controller.js] Product not found, navigating to NotFound view."
          );
        }
      },

      onToggleCart: function (oEvent) {
        console.debug(
          "[Welcome.controller.js][onToggleCart] 🔄 Cart toggle event triggered."
        );

        // Retrieve the 'pressed' state from the event
        var bPressed = oEvent.getParameter("pressed");
        console.debug(
          "[Welcome.controller.js][onToggleCart] 📌 Button pressed state:",
          bPressed
        );

        const oContext = this.getView().getBindingContext("odata");
        if (!oContext) {
          console.error("[Product.controller.js] Binding context is missing.");
          return;
        }

        const oEntry = oContext.getObject();
        if (!oEntry) {
          console.error("[Product.controller.js] Context object is missing.");
          return;
        }

        // Determine the new layout based on button state
        var sNewLayout = bPressed ? "Three" : "Two";
        this.setLayout(sNewLayout);
        console.debug(
          "[Welcome.controller.js][onToggleCart] 🔄 Layout updated to:",
          sNewLayout
        );

        // Navigate to the appropriate view based on the button state
        this.getRouter().navTo(
          bPressed ? "productCart" : "product",
          {
            id: oEntry.Category.Category,
            productId: oEntry.ProductId,
          },
          { replace: true }
        );

        console.debug(
          "[Product.controller.js] Navigation triggered for productId:",
          oEntry.ProductId
        );
      },

      onBack: function () {
        const oHistory = sap.ui.core.routing.History.getInstance();
        const sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          this.getRouter().navTo("home", {}, { replace: true });
        }
      },

      onAvatarPress: function () {
        sap.m.MessageToast.show("Avatar pressed");
      },

      onAddToCart: function (oEvent) {
        console.debug(
          "[Product.controller.js][onAddToCart] 🛒 Add to Cart action triggered."
        );

        var oModel = this.getOwnerComponent().getModel("odata");
        if (!oModel) {
          console.error(
            "[Product.controller.js][onAddToCart] ❌ ERROR: OData model not found. Cannot proceed with cart update."
          );
          return;
        }

        var oProduct = oEvent
          .getSource()
          .getBindingContext("odata")
          .getObject();
        console.debug(
          "[Product.controller.js][onAddToCart] 📦 Selected product details:",
          oProduct
        );

        // Get ResourceBundle or Promise
        var oResourceBundleOrPromise =
          this.getModel("i18n").getResourceBundle();

        if (oResourceBundleOrPromise instanceof Promise) {
          console.debug(
            "[Product.controller.js][onAddToCart] ⏳ Resolving i18n ResourceBundle Promise..."
          );
          oResourceBundleOrPromise.then(
            function (oResourceBundle) {
              console.debug(
                "[Product.controller.js][onAddToCart] ✅ ResourceBundle resolved."
              );
              this._addToCart(oResourceBundle, oProduct, oModel);
            }.bind(this)
          );
        } else {
          console.debug(
            "[Product.controller.js][onAddToCart] ✅ ResourceBundle retrieved synchronously."
          );
          this._addToCart(oResourceBundleOrPromise, oProduct, oModel);
        }
      },

      _addToCart: async function (oBundle, oProduct, oModel) {
        console.debug(
          "[Product.controller.js][_addToCart] 🛒 Processing Add to Cart for product:",
          oProduct
        );

        // Handle case where product details are wrapped in `Product` object
        if (oProduct.Product !== undefined) {
          console.debug(
            "[Product.controller.js][_addToCart] 🔄 Extracting nested product details..."
          );
          oProduct = oProduct.Product;
        }

        console.debug(
          "[Product.controller.js][_addToCart] 📌 Evaluating product status:",
          oProduct.StatusText
        );
        switch (oProduct.Status) {
          case "D":
            console.warn(
              "[Welcome.controller.js][_addToCart] ⚠️ Product is discontinued. Cannot be added to cart."
            );
            MessageBox.show(oBundle.getText("productStatusDiscontinuedMsg"), {
              icon: MessageBox.Icon.ERROR,
              title: oBundle.getText("productStatusDiscontinuedTitle"),
              actions: [MessageBox.Action.CLOSE],
            });
            break;
          case "O":
            console.warn(
              "[Welcome.controller.js][_addToCart] ⚠️ Product is out of stock. Prompting user confirmation."
            );
            MessageBox.show(oBundle.getText("productStatusOutOfStockMsg"), {
              icon: MessageBox.Icon.QUESTION,
              title: oBundle.getText("productStatusOutOfStockTitle"),
              actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
              onClose: async function (oAction) {
                if (MessageBox.Action.OK === oAction) {
                  console.debug(
                    "[Welcome.controller.js][_addToCart] ✅ User confirmed adding out-of-stock item."
                  );
                  await this._updateCartItem(oBundle, oProduct, oModel);
                } else {
                  console.debug(
                    "[Welcome.controller.js][_addToCart] ❌ User cancelled adding out-of-stock item."
                  );
                }
              }.bind(this),
            });
            break;
          case "A":
          default:
            console.debug(
              "[Welcome.controller.js][_addToCart] ✅ Product available. Proceeding to update cart."
            );
            await this._updateCartItem(oBundle, oProduct, oModel);
            break;
        }
      },

      _updateCartItem: async function (oBundle, oProductToBeAdded, oModel) {
        try {
          console.debug(
            "[Product.controller.js][_updateCartItem] 🔄 Checking if product already exists in the cart..."
          );

          var oEventBus = sap.ui.getCore().getEventBus();

          var oViewModel = this.getView().getModel("odata");
          // oViewModel.setProperty("/isCartUpdating", true); // Show loader

          var sFormattedProductId = oProductToBeAdded.ProductId;
          if (!sFormattedProductId) {
            console.error(
              "[Product.controller.js][_updateCartItem] ❌ ERROR: Product ID is undefined or null."
            );
            return;
          }
          var sFormattedUserId = "johnsvic";
          if (!sFormattedUserId) {
            console.error(
              "[Product.controller.js][_updateCartItem] ❌ ERROR: User ID is undefined or null."
            );
            return;
          }

          // 🔹 Ensure the UUID is enclosed in single quotes for OData filter
          var sODataFilterProductId = `'${sFormattedProductId}'`;
          var sODataFilterUserId = `'${sFormattedUserId}'`;
          console.debug(
            "[Product.controller.js][_updateCartItem] 🔍 Checking Cart for Product ID:",
            sFormattedProductId
          );
          console.debug(
            "[Product.controller.js][_updateCartItem] 📝 Filter Query Format:",
            sODataFilterProductId
          );

          var oListBinding = oModel.bindList("/CartItems", null, null, [
            new sap.ui.model.Filter({
              path: "Product_ProductId",
              operator: sap.ui.model.FilterOperator.EQ,
              value1: sODataFilterProductId,
            }),
            new sap.ui.model.Filter({
              path: "User_ID",
              operator: sap.ui.model.FilterOperator.EQ,
              value1: sODataFilterUserId,
            }),
          ]);

          try {
            console.debug(
              "[Product.controller.js][_updateCartItem] ⏳ Fetching Cart Contexts..."
            );
            var aCartContexts = await oListBinding.requestContexts();
            console.debug(
              "[Product.controller.js][_updateCartItem] ✅ Cart Contexts Retrieved:",
              aCartContexts
            );
          } catch (oError) {
            console.error(
              "[Product.controller.js][_updateCartItem] ❌ ERROR: Cart retrieval error.",
              oError
            );
          }

          var oExistingCartItem =
            aCartContexts.length > 0
              ? await aCartContexts[0].requestObject()
              : null;

          if (oExistingCartItem) {
            var oCartContext = aCartContexts[0];
            console.debug(
              "[Product.controller.js][_updateCartItem] 🔄 Product already exists in cart. Updating quantity..."
            );
            var iNewQuantity = oExistingCartItem.Quantity + 1;

            // ✅ Correctly update the quantity
            oCartContext.setProperty("Quantity", iNewQuantity);

            // 🔹 Update the quantity using `submitBatch()`
            oModel
              .submitBatch("cartUpdateGroup")
              .then(() => {
                MessageToast.show(
                  oBundle.getText("productMsgQuantityUpdated", [
                    oProductToBeAdded.Name,
                    iNewQuantity,
                  ])
                );
                console.debug(
                  "[Product.controller.js][_updateCartItem] ✅ Quantity updated successfully."
                );
                // ✅ **Refresh CartItems to reflect the latest quantity**
                oEventBus.publish("Cart", "Refresh");
              })
              .catch((oError) => {
                console.error(
                  "[Product.controller.js][_updateCartItem] ❌ ERROR: Failed to update quantity.",
                  oError
                );
              })
              .finally(() => {
                // oViewModel.setProperty("/isCartUpdating", false); // Hide loader
              });
            console.debug(
              "[Product.controller.js][_updateCartItem] 🔄 Sent Update Request for Cart Item with ID:",
              oExistingCartItem.ID
            );
          } else {
            console.debug(
              "[Product.controller.js][_updateCartItem] 🆕 Product not found in cart. Adding new item..."
            );

            var oNewCartItem = {
              User_ID: sFormattedUserId, // Placeholder user (replace with actual user logic)
              Product_ProductId: oProductToBeAdded.ProductId,
              Quantity: 1,
            };

            var oCartBinding = oModel.bindList("/CartItems");
            var oContext = oCartBinding.create(oNewCartItem);

            oContext
              .created()
              .then(function () {
                MessageToast.show(
                  oBundle.getText("productMsgAddedToCart", [
                    oProductToBeAdded.Name,
                  ])
                );
                console.debug(
                  "[Product.controller.js][_updateCartItem] ✅ New product added to cart."
                );
                // ✅ **Refresh CartItems to reflect the latest quantity**
                oEventBus.publish("Cart", "Refresh");
              })
              .catch(function (oError) {
                console.error(
                  "[Product.controller.js][_updateCartItem] ❌ ERROR: Failed to add product to cart.",
                  oError
                );
                MessageBox.error(
                  "Failed to add " + oProductToBeAdded.Name + " to cart."
                );
              })
              .finally(() => {
                // oViewModel.setProperty("/isCartUpdating", false); // Hide loader
              });
          }

          // Submit batch request
          console.debug(
            "[Product.controller.js][_updateCartItem] 🔄 Submitting batch request for cart update..."
          );
          oModel.submitBatch("cartUpdateGroup").catch(function (oError) {
            console.error(
              "[Product.controller.js][_updateCartItem] ❌ ERROR: Batch submission failed.",
              oError
            );
          });
        } catch (oError) {
          console.error(
            "[Product.controller.js][_updateCartItem] ❌ ERROR: Cart retrieval error.",
            oError
          );
          MessageBox.error("Error checking cart items.");
          // this.getView().getModel("view").setProperty("/isCartUpdating", false); // Hide loader
        }
      },
    });
  }
);
