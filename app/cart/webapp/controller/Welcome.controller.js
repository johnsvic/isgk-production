/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/library",
  ],
  function (
    Controller,
    BaseController,
    formatter,
    JSONModel,
    Filter,
    FilterOperator,
    MessageToast,
    MessageBox,
    library
  ) {
    "use strict";

    return BaseController.extend("sap.ui.demo.cart.controller.Welcome", {
      formatter: formatter,
      _iCarouselTimeout: 0,
      _iCarouselLoopTime: 8000,

      _mFilters: {
        Promoted: [new Filter("Type", FilterOperator.EQ, "Promoted")],
        Viewed: [new Filter("Type", FilterOperator.EQ, "Viewed")],
        Favorite: [new Filter("Type", FilterOperator.EQ, "Favorite")],
      },

      onInit: function () {
        console.debug(
          "[Welcome.controller.js][onInit] 🔄 Controller Initialization Started."
        );

        // Step 1: Initializing the ViewModel with default UI values
        var oViewModel = new JSONModel({
          welcomeCarouselShipping: "img/Shipping_273087.jpg",
          welcomeCarouselInviteFriend: "img/InviteFriend_276352.jpg",
          welcomeCarouselTablet: "img/Tablet_275777.jpg",
          welcomeCarouselCreditCard: "img/CreditCard_277268.jpg",
          Promoted: [],
          Viewed: [],
          Favorite: [],
          Currency: "JPY",
          isLoading: true,
        });

        // Step 2: Setting the ViewModel to the current view
        this.getView().setModel(oViewModel, "view");
        console.debug(
          "[Welcome.controller.js][onInit] ✅ ViewModel successfully initialized with properties:",
          JSON.stringify(oViewModel.getData(), null, 2) // Pretty-print JSON output for better debugging
        );

        // Step 3: Attaching the Router to the 'home' route
        var oComponent = this.getOwnerComponent();
        if (!oComponent) {
          console.error(
            "[Welcome.controller.js][onInit] ❌ ERROR: Owner Component is missing. Navigation might not function correctly."
          );
        } else {
          this._router = oComponent.getRouter();
          if (!this._router) {
            console.error(
              "[Welcome.controller.js][onInit] ❌ ERROR: Router not found in the component. Ensure routing is correctly defined."
            );
          } else {
            this._router
              .getRoute("home")
              .attachMatched(this._onRouteMatched, this);
            console.debug(
              "[Welcome.controller.js][onInit] 🛠️ Router successfully attached to the 'home' route."
            );
          }
        }

        // Step 4: Ensuring Metadata is loaded for OData Model
        console.debug(
          "[Welcome.controller.js][onInit] 🔄 Initiating Metadata Load Check..."
        );
        this._ensureMetadataLoaded();

        console.debug(
          "[Welcome.controller.js][onInit] ✅ Controller Initialization Completed Successfully."
        );
      },

      _ensureMetadataLoaded: function () {
        console.debug(
          "[Welcome.controller.js][_ensureMetadataLoaded] 🔄 Checking if OData metadata is loaded."
        );

        var oModel = this.getOwnerComponent().getModel("odata");
        if (!oModel || typeof oModel.getMetaModel !== "function") {
          console.error(
            "[Welcome.controller.js][_ensureMetadataLoaded] ❌ ERROR: OData model is missing or incorrectly defined. Cannot proceed with metadata loading."
          );
          return;
        }

        var oMetaModel = oModel.getMetaModel();
        if (!oMetaModel) {
          console.error(
            "[Welcome.controller.js][_ensureMetadataLoaded] ❌ ERROR: MetaModel not found in OData model. Ensure OData service metadata is correctly exposed."
          );
          return;
        }

        console.debug(
          "[Welcome.controller.js][_ensureMetadataLoaded] 🔄 Requesting metadata object from OData MetaModel..."
        );
        oMetaModel
          .requestObject("/")
          .then(() => {
            console.debug(
              "[Welcome.controller.js][_ensureMetadataLoaded] ✅ Metadata successfully loaded. Proceeding to fetch promoted items..."
            );
            this._loadPromotedItems();
          })
          .catch((oError) => {
            console.error(
              "[Welcome.controller.js][_ensureMetadataLoaded] ❌ ERROR: Failed to load OData metadata.",
              oError
            );
          });
      },

      onAfterRendering: function () {
        console.debug(
          "[Welcome.controller.js][onAfterRendering] 🖥️ View rendering completed. Checking carousel functionality."
        );

        if (typeof this.onCarouselPageChanged === "function") {
          console.debug(
            "[Welcome.controller.js][onAfterRendering] 🔄 Initiating carousel page change..."
          );
          this.onCarouselPageChanged();
        } else {
          console.error(
            "[Welcome.controller.js][onAfterRendering] ❌ ERROR: onCarouselPageChanged function is not defined. Ensure it is implemented correctly."
          );
        }
      },

      onCarouselPageChanged: function () {
        console.debug(
          "[Welcome.controller.js][onCarouselPageChanged] 🔄 Carousel page change initiated."
        );

        // Clearing the timeout to prevent unintended duplicate executions
        clearTimeout(this._iCarouselTimeout);
        console.debug(
          "[Welcome.controller.js][onCarouselPageChanged] ⏳ Timeout cleared. Resetting the carousel timer."
        );

        this._iCarouselTimeout = setTimeout(
          function () {
            console.debug(
              "[Welcome.controller.js][onCarouselPageChanged] 🔄 Executing carousel page change logic..."
            );

            var oWelcomeCarousel = this.byId("welcomeCarousel");
            if (oWelcomeCarousel) {
              console.debug(
                "[Welcome.controller.js][onCarouselPageChanged] ✅ Carousel found. Moving to the next page."
              );
              oWelcomeCarousel.next();
              this.onCarouselPageChanged(); // Recursive call to continue looping
            } else {
              console.error(
                "[Welcome.controller.js][onCarouselPageChanged] ❌ ERROR: Carousel control not found. Ensure the correct ID is being used."
              );
            }
          }.bind(this),
          this._iCarouselLoopTime
        );

        console.debug(
          "[Welcome.controller.js][onCarouselPageChanged] ⏳ Carousel loop time set to:",
          this._iCarouselLoopTime,
          "milliseconds."
        );
      },

      _onRouteMatched: function (oEvent) {
        console.debug(
          "[Welcome.controller.js][_onRouteMatched] 🔄 Route matched. Processing navigation..."
        );

        // Retrieving the route name from the event parameters
        var sRouteName = oEvent.getParameter("name");
        console.debug(
          "[Welcome.controller.js][_onRouteMatched] 📌 Matched route name:",
          sRouteName
        );

        // Checking if the matched route is 'home' and updating the layout accordingly
        if (sRouteName === "home") {
          this.setLayout("Two");
          console.debug(
            "[Welcome.controller.js][_onRouteMatched] 🏠 'home' route detected. Layout set to 'Two'."
          );
        } else {
          console.debug(
            "[Welcome.controller.js][_onRouteMatched] 🚀 Route is not 'home'. No layout changes applied."
          );
        }

        // Retrieving the promoted items from the view model
        var aPromotedItems = this.getView()
          .getModel("view")
          .getProperty("/Promoted");

        if (!aPromotedItems || aPromotedItems.length === 0) {
          console.warn(
            "[Welcome.controller.js][_onRouteMatched] ⚠️ No promoted items found. Triggering data fetch..."
          );
          this._loadPromotedItems();
        } else {
          console.debug(
            "[Welcome.controller.js][_onRouteMatched] ✅ Promoted items already exist. No fetch needed."
          );
        }

        console.debug(
          "[Welcome.controller.js][_onRouteMatched] ✅ Route processing completed."
        );
      },

      _loadPromotedItems: function () {
        console.debug(
          "[Welcome.controller.js][_loadPromotedItems] 🔄 Fetching promoted items from the backend."
        );

        var oModel = this.getOwnerComponent().getModel("odata");
        var oViewModel = this.getView().getModel("view");

        if (!oModel) {
          console.error(
            "[Welcome.controller.js][_loadPromotedItems] ❌ ERROR: OData model not found. Cannot retrieve promoted items."
          );
          return;
        }

        console.debug(
          "[Welcome.controller.js][_loadPromotedItems] ⏳ Setting 'isLoading' state to true."
        );
        oViewModel.setProperty("/isLoading", true);

        // Iterate through filters and apply them dynamically
        Object.keys(this._mFilters).forEach(
          function (sFilterKey) {
            console.debug(
              `[Welcome.controller.js][_loadPromotedItems] 🔍 Fetching '${sFilterKey}' items from OData.`
            );
            var oFilter = this._mFilters[sFilterKey];

            var oListBinding = oModel.bindList(
              "/FeaturedProducts",
              null,
              null,
              oFilter,
              { $expand: "Product" }
            );

            if (
              oListBinding &&
              typeof oListBinding.requestContexts === "function"
            ) {
              oListBinding
                .requestContexts()
                .then(
                  function (aContexts) {
                    console.debug(
                      `[Welcome.controller.js][_loadPromotedItems] ✅ Successfully fetched '${sFilterKey}' items. Processing results...`
                    );
                    var aResults = aContexts.map(
                      function (oContext) {
                        var oData = oContext.getObject();
                        return {
                          ProductId: oData.Product?.ProductId,
                          Name: oData.Product?.Name || "Unknown",
                          PictureUrl: oData.Product?.PictureUrl || "",
                          Type: oData.Type,
                          Price: oData.Product?.Price || "0.00",
                          CurrencyCode: oData.Product?.CurrencyCode || "EUR",
                          Category:
                            oData.Product?.Category_Category || "Unknown",
                          StatusText: this._getStatusText(
                            oData.Product?.Status || "Unavailable"
                          ),
                          StatusState: this._getStatusState(
                            oData.Product?.Status || "Unavailable"
                          ),
                        };
                      }.bind(this)
                    );

                    oViewModel.setProperty(`/${sFilterKey}`, aResults);
                    console.debug(
                      `[Welcome.controller.js][_loadPromotedItems] ✅ '${sFilterKey}' items successfully updated in the ViewModel.`
                    );

                    if (sFilterKey === "Promoted") {
                      this._selectPromotedItems();
                    }
                    oViewModel.setProperty("/isLoading", false);
                  }.bind(this)
                )
                .catch(function (oError) {
                  console.error(
                    `[Welcome.controller.js][_loadPromotedItems] ❌ ERROR: Failed to fetch '${sFilterKey}' items.`,
                    oError
                  );
                  oViewModel.setProperty("/isLoading", false);
                });
            } else {
              console.error(
                `[Welcome.controller.js][_loadPromotedItems] ❌ ERROR: Invalid ListBinding or requestContexts function not available for '${sFilterKey}'.`
              );
              oViewModel.setProperty("/isLoading", false);
            }
          }.bind(this)
        );
      },

      _selectPromotedItems: function () {
        console.debug(
          "[Welcome.controller.js][_selectPromotedItems] 🔄 Selecting promoted items for display."
        );
        var aPromotedItems = this.getView()
          .getModel("view")
          .getProperty("/Promoted");

        if (!aPromotedItems || aPromotedItems.length < 2) {
          console.warn(
            "[Welcome.controller.js][_selectPromotedItems] ⚠️ Not enough promoted items available for selection."
          );
          return;
        }

        var iRandom1, iRandom2;
        do {
          iRandom1 = Math.floor(Math.random() * aPromotedItems.length);
          iRandom2 = Math.floor(Math.random() * aPromotedItems.length);
        } while (iRandom1 === iRandom2);

        var aSelectedPromoted = [
          aPromotedItems[iRandom1],
          aPromotedItems[iRandom2],
        ];
        this.getView()
          .getModel("view")
          .setProperty("/Promoted", aSelectedPromoted);
        console.debug(
          "[Welcome.controller.js][_selectPromotedItems] ✅ Selected promoted items:",
          aSelectedPromoted
        );
      },

      _getStatusText: function (sStatus) {
        console.debug(
          "[Welcome.controller.js][_getStatusText] 🔄 Retrieving status text for:",
          sStatus
        );

        var mStatusTextMap = {
          A: "Available",
          O: "Out of Stock",
          D: "Discontinued",
        };

        var sStatusText = mStatusTextMap[sStatus] || "Unknown";
        console.debug(
          "[Welcome.controller.js][_getStatusText] ✅ Status text resolved to:",
          sStatusText
        );

        return sStatusText;
      },

      _getStatusState: function (sStatus) {
        console.debug(
          "[Welcome.controller.js][_getStatusState] 🔄 Retrieving status state for:",
          sStatus
        );

        var mStatusStateMap = {
          A: "Success",
          O: "Warning",
          D: "Error",
        };

        var sStatusState = mStatusStateMap[sStatus] || "None";
        console.debug(
          "[Welcome.controller.js][_getStatusState] ✅ Status state resolved to:",
          sStatusState
        );

        return sStatusState;
      },

      onSelectProduct: function (oEvent) {
        console.debug(
          "[Welcome.controller.js][onSelectProduct] 🛒 Product selection event triggered."
        );

        // Retrieve the binding context from the OData model
        var oBindContext = oEvent.getSource().getBindingContext("view");
        if (!oBindContext) {
          console.error(
            "[Welcome.controller.js][onSelectProduct] ❌ ERROR: No binding context found. Product selection failed."
          );
          return;
        }

        // Retrieve product object from binding context
        var oEntry = oBindContext.getObject();
        console.debug(
          "[Welcome.controller.js][onSelectProduct] 📌 Retrieved product data:",
          oEntry
        );

        var sProductId = oEntry.ProductId;
        var oCategory = oEntry.Category;

        if (!oCategory) {
          console.error(
            "[Welcome.controller.js][onSelectProduct] ❌ ERROR: No category found for the selected product."
          );
          return;
        }

        var sCategoryId = oEntry.Category; // Assuming 'Category' is the primary key

        if (!sCategoryId || !sProductId) {
          console.error(
            "[Welcome.controller.js][onSelectProduct] ❌ ERROR: Missing category ID or product ID. Navigation aborted."
          );
          return;
        }

        // Navigate to the product details page
        console.debug(
          "[Welcome.controller.js][onSelectProduct] 🔄 Navigating to product details page for Product ID:",
          sProductId
        );
        this.getRouter().navTo("product", {
          id: sCategoryId,
          productId: sProductId,
        });

        console.debug(
          "[Welcome.controller.js][onSelectProduct] ✅ Navigation successful."
        );
      },

      onShowCategories: function () {
        console.debug(
          "[Welcome.controller.js][onShowCategories] 🔄 Navigating to Categories page..."
        );
        this.getRouter().navTo("categories");
        console.debug(
          "[Welcome.controller.js][onShowCategories] ✅ Navigation to Categories successful."
        );
      },

      onAvatarPress: function () {
        console.debug(
          "[Welcome.controller.js][onAvatarPress] 🏆 Avatar press event triggered."
        );
        sap.m.MessageToast.show("Avatar pressed");
      },

      onAddToCart: function (oEvent) {
        console.debug(
          "[Welcome.controller.js][onAddToCart] 🛒 Add to Cart action triggered."
        );

        var oModel = this.getOwnerComponent().getModel("odata");
        if (!oModel) {
          console.error(
            "[Welcome.controller.js][onAddToCart] ❌ ERROR: OData model not found. Cannot proceed with cart update."
          );
          return;
        }

        var oProduct = oEvent.getSource().getBindingContext("view").getObject();
        console.debug(
          "[Welcome.controller.js][onAddToCart] 📦 Selected product details:",
          oProduct
        );

        // Get ResourceBundle or Promise
        var oResourceBundleOrPromise =
          this.getModel("i18n").getResourceBundle();

        if (oResourceBundleOrPromise instanceof Promise) {
          console.debug(
            "[Welcome.controller.js][onAddToCart] ⏳ Resolving i18n ResourceBundle Promise..."
          );
          oResourceBundleOrPromise.then(
            function (oResourceBundle) {
              console.debug(
                "[Welcome.controller.js][onAddToCart] ✅ ResourceBundle resolved."
              );
              this._addToCart(oResourceBundle, oProduct, oModel);
            }.bind(this)
          );
        } else {
          console.debug(
            "[Welcome.controller.js][onAddToCart] ✅ ResourceBundle retrieved synchronously."
          );
          this._addToCart(oResourceBundleOrPromise, oProduct, oModel);
        }
      },

      _addToCart: async function (oBundle, oProduct, oModel) {
        console.debug(
          "[Welcome.controller.js][_addToCart] 🛒 Processing Add to Cart for product:",
          oProduct
        );

        // Handle case where product details are wrapped in `Product` object
        if (oProduct.Product !== undefined) {
          console.debug(
            "[Welcome.controller.js][_addToCart] 🔄 Extracting nested product details..."
          );
          oProduct = oProduct.Product;
        }

        console.debug(
          "[Welcome.controller.js][_addToCart] 📌 Evaluating product status:",
          oProduct.StatusText
        );
        switch (oProduct.StatusText) {
          case "Discontinued":
            console.warn(
              "[Welcome.controller.js][_addToCart] ⚠️ Product is discontinued. Cannot be added to cart."
            );
            MessageBox.show(oBundle.getText("productStatusDiscontinuedMsg"), {
              icon: MessageBox.Icon.ERROR,
              title: oBundle.getText("productStatusDiscontinuedTitle"),
              actions: [MessageBox.Action.CLOSE],
            });
            break;
          case "Out of Stock":
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
          case "Available":
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
            "[Welcome.controller.js][_updateCartItem] 🔄 Checking if product already exists in the cart..."
          );
          var oEventBus = sap.ui.getCore().getEventBus();

          var oViewModel = this.getView().getModel("view");
          oViewModel.setProperty("/isCartUpdating", true); // Show loader

          var sFormattedProductId = oProductToBeAdded.ProductId;
          if (!sFormattedProductId) {
            console.error(
              "[Welcome.controller.js][_updateCartItem] ❌ ERROR: Product ID is undefined or null."
            );
            return;
          }
          var sFormattedUserId = "johnsvic";
          if (!sFormattedUserId) {
            console.error(
              "[Welcome.controller.js][_updateCartItem] ❌ ERROR: User ID is undefined or null."
            );
            return;
          }

          // 🔹 Ensure the UUID is enclosed in single quotes for OData filter
          var sODataFilterProductId = `'${sFormattedProductId}'`;
          var sODataFilterUserId = `'${sFormattedUserId}'`;
          console.debug(
            "[Welcome.controller.js][_updateCartItem] 🔍 Checking Cart for Product ID:",
            sFormattedProductId
          );
          console.debug(
            "[Welcome.controller.js][_updateCartItem] 📝 Filter Query Format:",
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
              "[Welcome.controller.js][_updateCartItem] ⏳ Fetching Cart Contexts..."
            );
            var aCartContexts = await oListBinding.requestContexts();
            console.debug(
              "[Welcome.controller.js][_updateCartItem] ✅ Cart Contexts Retrieved:",
              aCartContexts
            );
          } catch (oError) {
            console.error(
              "[Welcome.controller.js][_updateCartItem] ❌ ERROR: Cart retrieval error.",
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
              "[Welcome.controller.js][_updateCartItem] 🔄 Product already exists in cart. Updating quantity..."
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
                  "[Welcome.controller.js][_updateCartItem] ✅ Quantity updated successfully."
                );

                // ✅ **Refresh CartItems to reflect the latest quantity**
                oEventBus.publish("Cart", "Refresh");

                return oModel.bindList("/CartItems").requestContexts();
              })
              .catch((oError) => {
                console.error(
                  "[Welcome.controller.js][_updateCartItem] ❌ ERROR: Failed to update quantity.",
                  oError
                );
              })
              .finally(() => {
                oViewModel.setProperty("/isCartUpdating", false); // Hide loader
              });
            console.debug(
              "[Welcome.controller.js][_updateCartItem] 🔄 Sent Update Request for Cart Item with ID:",
              oExistingCartItem.ID
            );
          } else {
            console.debug(
              "[Welcome.controller.js][_updateCartItem] 🆕 Product not found in cart. Adding new item..."
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
                  "[Welcome.controller.js][_updateCartItem] ✅ New product added to cart."
                );
                // ✅ **Refresh CartItems to reflect the latest quantity**
                oEventBus.publish("Cart", "Refresh");
              })
              .catch(function (oError) {
                console.error(
                  "[Welcome.controller.js][_updateCartItem] ❌ ERROR: Failed to add product to cart.",
                  oError
                );
                MessageBox.error(
                  "Failed to add " + oProductToBeAdded.Name + " to cart."
                );
              })
              .finally(() => {
                oViewModel.setProperty("/isCartUpdating", false); // Hide loader
              });
          }

          // Submit batch request
          console.debug(
            "[Welcome.controller.js][_updateCartItem] 🔄 Submitting batch request for cart update..."
          );
          oModel.submitBatch("cartUpdateGroup").catch(function (oError) {
            console.error(
              "[Welcome.controller.js][_updateCartItem] ❌ ERROR: Batch submission failed.",
              oError
            );
          });
        } catch (oError) {
          console.error(
            "[Welcome.controller.js][_updateCartItem] ❌ ERROR: Cart retrieval error.",
            oError
          );
          MessageBox.error("Error checking cart items.");
          this.getView().getModel("view").setProperty("/isCartUpdating", false); // Hide loader
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

        // Determine the new layout based on button state
        var sNewLayout = bPressed ? "Three" : "Two";
        this.setLayout(sNewLayout);
        console.debug(
          "[Welcome.controller.js][onToggleCart] 🔄 Layout updated to:",
          sNewLayout
        );

        // Navigate to the appropriate view based on the button state
        var sTargetRoute = bPressed ? "cart" : "home";
        console.debug(
          "[Welcome.controller.js][onToggleCart] 🚀 Navigating to:",
          sTargetRoute
        );
        this.getRouter().navTo(sTargetRoute);

        console.debug(
          "[Welcome.controller.js][onToggleCart] ✅ Cart toggle action completed successfully."
        );
      },
    });
  }
);
