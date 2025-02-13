/* eslint-disable no-console */
sap.ui.define([], function () {
  "use strict";
  return {
    price: function (sValue) {
      if (!sValue) {
        return "0.00";
      }
      var value = String(sValue).replace(",", ".");
      var numberFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
        maxFractionDigits: 2,
        minFractionDigits: 2,
        groupingEnabled: true,
        groupingSeparator: ".",
        decimalSeparator: ",",
      });
      return numberFormat.format(parseFloat(value).toFixed(2));
    },
    statusText: function (sStatus) {
      var oBundle = this.getResourceBundle();
      var mStatusText = {
        A: oBundle.getText("statusA"),
        O: oBundle.getText("statusO"),
        D: oBundle.getText("statusD"),
      };
      return mStatusText[sStatus] || sStatus;
    },
    statusState: function (sStatus) {
      console.debug(
        "[formatter.js] statusState() called with status:",
        sStatus
      );

      var mStatusMap = {
        A: sap.ui.core.ValueState.Success, // ✅ Correct UI5 enum
        O: sap.ui.core.ValueState.Warning, // ✅ Correct UI5 enum
        D: sap.ui.core.ValueState.Error, // ✅ Correct UI5 enum
        Available: sap.ui.core.ValueState.Success, // ✅ Map correctly
        "Out of Stock": sap.ui.core.ValueState.Warning,
        Discontinued: sap.ui.core.ValueState.Error,
      };

      var sMappedStatus = mStatusMap[sStatus] || sap.ui.core.ValueState.None;
      console.debug("[formatter.js] Resolved status state:", sMappedStatus);
      return sMappedStatus;
    },
    pictureUrl: function (sUrl) {
      console.debug("[formatter.js] Original sURL:", sUrl);
      
      if (!sUrl) {
          return sap.ui.require.toUrl("sap/ui/demo/cart/img/placeholder.png");
      }
  
      // If it's already a full URL, return as is
      if (sUrl.startsWith('http')) {
          return sUrl;
      }
  
      // Check if we're accessing through launchpage
      var isLaunchpage = window.location.pathname.includes('launchpage.html');
      
      // If accessing through launchpage and path doesn't have /cart/webapp, add it
      if (isLaunchpage && !sUrl.startsWith('/cart/webapp/')) {
          console.debug("[formatter.js] Adding /cart/webapp/ prefix for launchpage access");
          return `/cart/webapp/${sUrl.replace(/^\//, '')}`;  // Remove leading slash if exists
      }
      
      // For direct access, use the URL as is
      return sUrl;
  },
    formatDimensions: function (width, depth, height, unit) {
      if (width && depth && height) {
        return `${width}x${depth}x${height} ${unit}`;
      } else {
        return "N/A";
      }
    },
    /**
     * Checks if one of the collections contains items.
     * @param {object} oCollection1 First array or object to check
     * @param {object} oCollection2 Second array or object to check
     * @return {boolean} true if one of the collections is not empty, otherwise - false.
     */
    hasItems: function (oCollection1, oCollection2) {
      var bCollection1Filled = !!(
          oCollection1 && Object.keys(oCollection1).length
        ),
        bCollection2Filled = !!(
          oCollection2 && Object.keys(oCollection2).length
        );

      return bCollection1Filled || bCollection2Filled;
    },

    /**
     * Sums up the price for all products in the cart
     * @param {object} oCartEntries current cart entries
     * @return {string} string with the total value
     */
    totalPrice: function (oCartEntries) {
      var oBundle = this.getResourceBundle(),
        fTotalPrice = 0;

      Object.keys(oCartEntries).forEach(function (sProductId) {
        var oProduct = oCartEntries[sProductId];
        fTotalPrice += parseFloat(oProduct.Price) * oProduct.Quantity;
      });

      return oBundle.getText("cartTotalPrice", [formatter.price(fTotalPrice)]);
    },
  };
});
