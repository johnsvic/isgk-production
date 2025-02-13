sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "./BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/Device",
    "../model/formatter",
  ],
  (Controller, BaseController, Filter, FilterOperator, Device, formatter) => {
    "use strict";

    return BaseController.extend("sap.ui.demo.cart.controller.Home", {
      formatter: formatter,

      /**
       * Lifecycle method to initialize the Home controller.
       */
      onInit: function () {
        console.debug(
          "[Home.controller.js][onInit] onInit() - Initializing Home controller."
        );
        var oComponent = this.getOwnerComponent();
        this._router = oComponent.getRouter();

        this._router
          .getRoute("categories")
          .attachMatched(this._onRouteMatched, this);
      },

      /**
       * Route matched handler for the "categories" route.
       */
      _onRouteMatched: function () {
        console.debug(
          "[Home.controller.js][_onRouteMatched] _onRouteMatched() - Categories route matched."
        );

        var bSmallScreen =
          this.getModel("appView").getProperty("/smallScreenMode");
        if (bSmallScreen) {
          this.setLayout("One");
          console.debug(
            "[Home.controller.js][_onRouteMatched] _onRouteMatched() - Layout set to 'One' for small screen mode."
          );
        }
      },

      /**
       * Trigger search logic based on the search field value.
       */
      onSearch: function () {
        console.debug("[Home.controller.js][onInit] onSearch() - Search triggered.");
        this._search();
      },

      /**
       * Executes the search logic and updates the UI accordingly.
       */
      _search: function () {
        console.debug(
          "[Home.controller.js][_search] _search() - Executing search logic."
        );

        var oView = this.getView();
        var oProductList = oView.byId("productList");
        var oCategoryList = oView.byId("categoryList");
        var oSearchField = oView.byId("searchField");

        if (!oProductList || !oCategoryList || !oSearchField) {
          console.error(
            "[Home.controller.js][_search] _search() - Missing required UI elements for search."
          );
          return;
        }

        var bShowSearchResults = oSearchField.getValue().length !== 0;
        oProductList.setVisible(bShowSearchResults);
        oCategoryList.setVisible(!bShowSearchResults);

        var oBinding = oProductList.getBinding("items");
        if (oBinding) {
          if (bShowSearchResults) {
            var oFilter = new Filter(
              "Name",
              FilterOperator.Contains,
              oSearchField.getValue()
            );
            oBinding.filter([oFilter]);
            console.debug(
              "[Home.controller.js][_search] _search() - Applied filter:",
              oFilter
            );
          } else {
            oBinding.filter([]);
            console.debug("[Home.controller.js][_search] _search() - Cleared filters.");
          }
        }
      },

      /**
       * Refreshes the product list and hides pull-to-refresh after data is ready.
       */
      onRefresh: function () {
        console.debug("[Home.controller.js][onRefresh] onRefresh() - Refresh triggered.");
        var oProductList = this.byId("productList");
        var oBinding = oProductList.getBinding("items");

        if (!oBinding) {
          console.warn(
            "[Home.controller.js][onRefresh] onRefresh() - No binding found for product list."
          );
          return;
        }

        var fnHandler = function () {
          this.byId("pullToRefresh").hide();
          oBinding.detachDataReceived(fnHandler);
          console.debug(
            "[Home.controller.js][onRefresh] onRefresh() - Data received and pull-to-refresh hidden."
          );
        }.bind(this);

        oBinding.attachDataReceived(fnHandler);
        this._search();
      },

      /**
       * Handles category list item press and navigates to the category view.
       * @param {sap.ui.base.Event} oEvent The press event
       */
      onCategoryListItemPress: function (oEvent) {
        console.debug(
          "[Home.controller.js][onCategoryListItemPress] onCategoryListItemPress() - Category list item pressed."
        );
        var oBindContext = oEvent.getSource().getBindingContext("odata");

        if (!oBindContext) {
          console.error(
            "[Home.controller.js][onCategoryListItemPress] onCategoryListItemPress() - No binding context found."
          );
          return;
        }

        var sCategoryId = oBindContext.getProperty("Category");
        this._sCategoryId = sCategoryId;
        this.getRouter().navTo("category", { id: sCategoryId });
        console.debug(
          "[Home.controller.js][onCategoryListItemPress] onCategoryListItemPress() - Navigated to category:",
          sCategoryId
        );
      },

      /**
       * Handles product list selection and navigates to the product view.
       * @param {sap.ui.base.Event} oEvent The selection event
       */
      onProductListSelect: function (oEvent) {
        console.debug(
          "[Home.controller.js][onProductListSelect] onProductListSelect() - Product selected."
        );
        console.debug(
          "[Home.controller.js][onProductListSelect] Selected Category ID:",
          this._sCategoryId
        );
        var oItem = oEvent.getParameter("listItem");
        this._showProduct(oItem);
      },

      /**
       * Navigates to the product view for the given product.
       * @param {sap.m.ListItemBase} oItem The selected product item
       */
      _showProduct: function (oItem) {
        // Ensure the binding context is available
        if (!oItem || !oItem.getBindingContext("odata")) {
          console.error(
            "[Home.controller.js][_showProduct] _showProduct() - Invalid item or Missing binding context."
          );
          return;
        }

        // Retrieve the Product data from the binding context
        var oEntry = oItem.getBindingContext("odata").getObject();
        console.debug("[Home.controller.js][_showProduct] _showProduct() - oEntry.", oEntry);

        var sProductId = oEntry.ProductId;
        var oCategory = oEntry.Category || oEntry.Category_Category;

        // Ensure that the Category association exists
        if (!oCategory) {
          console.warn(
            "[Home.controller.js][_showProduct] _showProduct() - Missing category, using default."
          );
          oCategory = { Category: "DefaultCategory" }; // Fallback
        }

        // Retrieve the CategoryId from the Category association
        var sCategoryId = oCategory.Category || oCategory;

        // Ensure that both category and product IDs are available
        if (!sCategoryId || !sProductId) {
          console.error(
            "[Home.controller.js][_showProduct] _showProduct() - Missing category or product ID."
          );
          return;
        }

        // Navigate to the product view with both CategoryId and ProductId
        this.getRouter().navTo(
          "product",
          {
            id: sCategoryId, // Category ID
            productId: sProductId, // Product ID
          },
          !Device.system.phone
        );
        console.debug(
          "[Home.controller.js][_showProduct] _showProduct() - Navigated to product:",
          sProductId
        );
      },

      /**
       * Handles product list item press and navigates to the product view.
       * @param {sap.ui.base.Event} oEvent The press event
       */
      onProductListItemPress: function (oEvent) {
        console.debug(
          "[Home.controller.js][onProductListItemPress] onProductListItemPress() - Product list item pressed."
        );
        var oItem = oEvent.getSource();
        this._showProduct(oItem);
      },

      /**
       * Always navigates back to the home view.
       * @override
       */
      onBack: function () {
        console.debug(
          "[Home.controller.js][onBack] onBack() - Navigating back to home."
        );
        this.getRouter().navTo("home");
      },
    });
  }
);
