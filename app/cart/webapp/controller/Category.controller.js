/* eslint-disable no-console */
sap.ui.define(
  [
    "./BaseController",
    "sap/ui/Device",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "../model/formatter"
  ],
  function (
    BaseController,
    Device,
    Filter,
    FilterOperator,
    JSONModel,
    Fragment,
    formatter
  ) {
    "use strict";

    return BaseController.extend("sap.ui.demo.cart.controller.Category", {
      formatter: formatter,
      _iLowFilterPreviousValue: 0,
      _iHighFilterPreviousValue: 5000,

      onInit: function () {
        console.debug(
          "[Category.controller.js] onInit() - Initializing Category controller."
        );

        var oViewModel = new JSONModel({
          Suppliers: [],
        });
        this.getView().setModel(oViewModel, "view");
        console.debug(
          "[Category.controller.js] View model for suppliers initialized."
        );

        var oComponent = this.getOwnerComponent();
        this._oRouter = oComponent.getRouter();

        // Routing Setup
        this._setUpRoutes();

        console.debug(
          "[Category.controller.js] onInit() - Initialization complete."
        );
      },

      _setUpRoutes: function () {
        console.debug(
          "[Category.controller.js] _setUpRoutes() - Setting up routes."
        );
        ["category", "productCart", "product"].forEach(function (routeName) {
          if (this._oRouter.getRoute(routeName)) {
            this._oRouter
              .getRoute(routeName)
              .attachMatched(this._loadCategories, this);
            console.debug(
              `[Category.controller.js] Route '${routeName}' found and attached.`
            );
          } else {
            console.error(
              `[Category.controller.js] Route '${routeName}' not found.`
            );
          }
        }, this);
      },

      _loadCategories: function (oEvent) {
        console.debug(
          "[Category.controller.js] _loadCategories() - Loading categories."
        );

        var bSmallScreen =
            this.getModel("appView").getProperty("/smallScreenMode"),
          sRouteName = oEvent.getParameter("name");

        console.debug(
          `[Category.controller.js] _loadCategories() - Route: ${sRouteName}, Small Screen Mode: ${bSmallScreen}`
        );

        // switch to first column in full screen mode for category route on small devices
        if (sRouteName === "category") {
          this.setLayout(bSmallScreen ? "One" : "Two");
        }

        var oModel = this.getModel("odata");

        // Check if the model is an instance of OData V4 Model
        if (!(oModel instanceof sap.ui.model.odata.v4.ODataModel)) {
          console.error(
            "[Category.controller.js] _loadCategories() - Invalid OData model. Ensure that OData V4 Model is being used."
          );
          return; // Prevent further execution if model is not OData V4
        }

        var sId = oEvent.getParameter("arguments").id; // Category ID from the route parameter

        console.debug(
          `[Category.controller.js] _loadCategories() - Category ID: ${sId}`
        );

        // Binding products related to the category using $expand
        var oView = this.getView();
        var sPath = `/ProductCategories(Category='${sId}')/Products`; // Correct binding path for OData V4

        console.debug(
          `[Category.controller.js] _loadCategories() - Binding path: ${sPath}`
        );

        // Bind the list to the expanded Products data
        var oListBinding = oModel.bindList(sPath);

        if (
          oListBinding &&
          typeof oListBinding.requestContexts === "function"
        ) {
          // Fetch and handle the data asynchronously
          oListBinding
            .requestContexts()
            .then(
              function (aContexts) {
                console.debug(
                  "[Category.controller.js] _loadCategories() - Received contexts:",
                  aContexts
                );

                // Check if aContexts is defined and contains data
                if (
                  !aContexts ||
                  !Array.isArray(aContexts) ||
                  aContexts.length === 0
                ) {
                  console.error(
                    "[Category.controller.js] _loadCategories() - No products found for this category."
                  );
                  oView.setBusy(false); // Stop the busy indicator
                  return;
                }

                // If aContexts is valid, proceed to extract products
                var aProducts = aContexts.map((oContext) => {
                  var oProduct = oContext.getObject();
                  return {
                    ProductId: oProduct.ProductId,
                    Name: oProduct.Name,
                    SupplierName: oProduct.SupplierName,
                    Price: oProduct.Price,
                    PictureUrl: oProduct.PictureUrl,
                    Status: oProduct.Status,
                    CurrencyCode: oProduct.CurrencyCode,
                    CategoryId: oProduct.Category ? oProduct.Category.Category : null
                  };
                }); // Bind 'this' correctly for the controller

                console.debug(
                  "[Category.controller.js] _loadCategories() - Processed products:",
                  aProducts
                );

                // Set the product data into the view model (assuming the view model is used to store product data)
                oView.getModel("view").setProperty("/Products", aProducts);

                // Optionally, handle additional UI tasks like stopping the busy indicator
                oView.setBusy(false);

                // Refresh the list binding to update the UI
                oListBinding.refresh();

                // Call the _loadSuppliers function to load the suppliers
                this._loadSuppliers();
              }.bind(this)
            )
            .catch(function (oError) {
              console.error(
                "[Category.controller.js] _loadCategories() - Error loading category products:",
                oError
              );
              oView.setBusy(false);
            });

          // Set the view as busy while waiting for data
          oView.setBusy(true);
        } else {
          console.error(
            "[Category.controller.js] _loadCategories() - Invalid ListBinding or requestContexts method unavailable."
          );
          oView.setBusy(false);
        }
      },

      _loadSuppliers: function () {
        console.debug("[Category.controller.js] _loadSuppliers() - Loading suppliers.");
        
        var oModel = this.getModel("odata");
      
        // Instead of using $expand, simply bind to /Products
        var oListBinding = oModel.bindList("/Products");
      
        console.debug("[Category.controller.js] _loadSuppliers() - ListBinding created for Products.");
        
        var aSuppliers = [];
      
        // Attach dataReceived event AFTER the binding is established
        oListBinding.attachDataReceived(function (oEvent) {
          console.debug("[Category.controller.js] _loadSuppliers() - Data received for suppliers.");
      
          var aProducts = oEvent.getSource().getContexts(); // Get contexts for all products
          console.debug("[Category.controller.js] _loadSuppliers() - " + aProducts.length + " products received.");
          
          // Now directly extract SupplierName from the products
          aProducts.forEach(function (oContext) {
            var oProduct = oContext.getObject();
            if (oProduct && oProduct.SupplierName) {
              aSuppliers.push(oProduct.SupplierName);
            }
          });
      
          // Remove duplicates and sort the supplier names
          var aUniqueSuppliers = aSuppliers.filter(function (sName, iIndex, aUniqueSuppliers) {
            return aUniqueSuppliers.indexOf(sName) === iIndex;
          }).sort();
      
          console.debug("[Category.controller.js] _loadSuppliers() - Duplicates removed and sorted.");
      
          // Create array of supplier objects for binding
          aUniqueSuppliers = aUniqueSuppliers.map(function (sSupplierName) {
            return { SupplierName: sSupplierName };
          });
      
          console.debug("[Category.controller.js] _loadSuppliers() - Unique suppliers created.");
      
          // Set the unique suppliers to the view model
          this.getModel("view").setProperty("/Suppliers", aUniqueSuppliers);
          console.debug("[Category.controller.js] _loadSuppliers() - Suppliers set in view model.");
        }.bind(this));
      
        // Initiate the data fetch
        oListBinding.refresh();
        console.debug("[Category.controller.js] _loadSuppliers() - ListBinding refresh triggered.");
      }
      ,
      
      onProductDetails: function (oEvent) {
        console.debug(
          "[Category.controller.js] onProductDetails() - Product details view triggered."
        );

        var oBindContext;
        if (Device.system.phone) {
          oBindContext = oEvent.getSource().getBindingContext("view"); // Use the "view" model here
        } else {
          oBindContext = oEvent
            .getSource()
            .getSelectedItem()
            .getBindingContext("view"); // Also use "view" model for non-phone devices
        }

        if (!oBindContext) {
          console.error(
            "[Category.controller.js] onProductDetails() - Binding context is undefined!"
          );
          return;
        }
        console.debug(
          "[Category.controller.js] onProductDetails() - Binding context:",
          oBindContext
        );

        var aProducts = oBindContext.getObject(); // Get the object from the binding context
        console.debug("[Category.controller.js] Product object:", aProducts);
        var sCategoryId = this.getOwnerComponent()
        .getRouter()
        .getHashChanger()
        .getHash()
        .split("/")[1]; // Access Category from the object
        var sProductId = aProducts.ProductId ? aProducts.ProductId : "Unknown"; // Access ProductId from the object

        console.debug(
          `[Category.controller.js] onProductDetails() - Category: ${sCategoryId}, Product ID: ${sProductId}`
        );

        var bCartVisible = this.getModel("appView")
          .getProperty("/layout")
          .startsWith("Three");
        this.setLayout("Two");

        this._oRouter.navTo(
          bCartVisible ? "productCart" : "product",
          {
            id: sCategoryId,
            productId: sProductId,
          },
          !Device.system.phone
        );
      },

      onFilter: function () {
        console.debug(
          "[Category.controller.js] onFilter() - Filter dialog opened."
        );

        // Asynchronously load the CategoryFilterDialog fragment
        if (!this._pCategoryFilterDialog) {
          this._pCategoryFilterDialog = Fragment.load({
            id: this.getView().getId(),
            name: "sap.ui.demo.cart.view.CategoryFilterDialog",
            controller: this,
          }).then(
            function (oDialog) {
              this.getView().addDependent(oDialog);
              oDialog.addStyleClass(
                this.getOwnerComponent().getContentDensityClass()
              );
              console.debug(
                "[Category.controller.js] onFilter() - Filter dialog loaded."
              );
              return oDialog;
            }.bind(this)
          );
        }

        this._pCategoryFilterDialog.then(function (oDialog) {
          oDialog.open();
          console.debug(
            "[Category.controller.js] onFilter() - Filter dialog opened."
          );
        });
      },

      handleConfirm: function (oEvent) {
        console.debug(
          "[Category.controller.js] handleConfirm() - Confirm filter selection."
        );
        var oCustomFilter = this.byId(
          "categoryFilterDialog"
        ).getFilterItems()[1];
        var oSlider = oCustomFilter
          .getCustomControl()
          .getAggregation("content")[0];
        this._iLowFilterPreviousValue = oSlider.getValue();
        this._iHighFilterPreviousValue = oSlider.getValue2();
        this._applyFilter(oEvent);
      },

      handleCancel: function () {
        console.debug(
          "[Category.controller.js] handleCancel() - Reset filter values."
        );
        var oCustomFilter = this.byId(
          "categoryFilterDialog"
        ).getFilterItems()[1];
        var oSlider = oCustomFilter
          .getCustomControl()
          .getAggregation("content")[0];

        oSlider
          .setValue(this._iLowFilterPreviousValue)
          .setValue2(this._iHighFilterPreviousValue);

        if (
          this._iLowFilterPreviousValue > oSlider.getMin() ||
          this._iHighFilterPreviousValue !== oSlider.getMax()
        ) {
          oCustomFilter.setFilterCount(1);
        } else {
          oCustomFilter.setFilterCount(0);
        }
      },

      handleChange: function (oEvent) {
        console.debug(
          "[Category.controller.js] handleChange() - Filter slider value changed."
        );
        var oCustomFilter = this.byId(
          "categoryFilterDialog"
        ).getFilterItems()[1];
        var oSlider = oCustomFilter
          .getCustomControl()
          .getAggregation("content")[0];
        var iLowValue = oEvent.getParameter("range")[0];
        var iHighValue = oEvent.getParameter("range")[1];

        if (iLowValue !== oSlider.getMin() || iHighValue !== oSlider.getMax()) {
          oCustomFilter.setFilterCount(1);
        } else {
          oCustomFilter.setFilterCount(0);
        }
      },

      handleResetFilters: function () {
        console.debug(
          "[Category.controller.js] handleResetFilters() - Reset all filters."
        );
        var oCustomFilter = this.byId(
          "categoryFilterDialog"
        ).getFilterItems()[1];
        var oSlider = oCustomFilter
          .getCustomControl()
          .getAggregation("content")[0];

        oSlider.setValue(oSlider.getMin());
        oSlider.setValue2(oSlider.getMax());

        oCustomFilter.setFilterCount(0);
      },

      _applyFilter: function (oEvent) {
        console.debug("[Category.controller.js] _applyFilter() - Applying filters.");
        var oList = this.byId("productList2"),
          oBinding = oList.getBinding("items"),
          aSelectedFilterItems = oEvent.getParameter("filterItems"),
          oCustomFilter = this.byId("categoryFilterDialog").getFilterItems()[1],
          oFilter,
          aFilters = [],
          aAvailableFilters = [],
          aPriceFilters = [],
          aSupplierFilters = [];
      
        if (
          oCustomFilter
            .getCustomControl()
            .getAggregation("content")[0]
            .getValue() !==
            oCustomFilter
              .getCustomControl()
              .getAggregation("content")[0]
              .getMin() ||
          oCustomFilter
            .getCustomControl()
            .getAggregation("content")[0]
            .getValue2() !==
            oCustomFilter
              .getCustomControl()
              .getAggregation("content")[0]
              .getMax()
        ) {
          aSelectedFilterItems.push(oCustomFilter);
        }
      
        aSelectedFilterItems.forEach(function (oItem) {
          var sFilterKey = oItem.getProperty("key"),
            iValueLow,
            iValueHigh;
      
          switch (sFilterKey) {
            case "A":
              oFilter = new Filter("Status", FilterOperator.EQ, "A");
              aAvailableFilters.push(oFilter);
              break;
      
            case "O":
              oFilter = new Filter("Status", FilterOperator.EQ, "O");
              aAvailableFilters.push(oFilter);
              break;
      
            case "D":
              oFilter = new Filter("Status", FilterOperator.EQ, "D");
              aAvailableFilters.push(oFilter);
              break;
      
            case "Price":
              iValueLow = oItem
                .getCustomControl()
                .getAggregation("content")[0]
                .getValue();
              iValueHigh = oItem
                .getCustomControl()
                .getAggregation("content")[0]
                .getValue2();
              oFilter = new Filter(
                "Price",
                FilterOperator.BT,
                iValueLow,
                iValueHigh
              );
              aPriceFilters.push(oFilter);
              break;
      
            default:
              // Corrected Filter Logic: Filter for SupplierName within the Products entity
              oFilter = new Filter("SupplierName", FilterOperator.EQ, sFilterKey);
              aSupplierFilters.push(oFilter);
          }
        });
      
        if (aAvailableFilters.length > 0) {
          aFilters.push(new Filter({ filters: aAvailableFilters }));
        }
        if (aPriceFilters.length > 0) {
          aFilters.push(new Filter({ filters: aPriceFilters }));
        }
        if (aSupplierFilters.length > 0) {
          aFilters.push(new Filter({ filters: aSupplierFilters }));
        }
      
        oFilter = new Filter({ filters: aFilters, and: true });
        if (aFilters.length > 0) {
          oBinding.filter(oFilter);
          this.byId("categoryInfoToolbar").setVisible(true);
        } else {
          oBinding.filter(null);
          this.byId("categoryInfoToolbar").setVisible(false);
        }
      }
      ,

      onBack: function () {
        console.debug(
          "[Category.controller.js] onBack() - Navigating back to categories."
        );
        this.getRouter().navTo("categories");
      },
    });
  }
);
