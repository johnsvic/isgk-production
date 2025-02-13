/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
sap.ui.define(
  [
    "./BaseController",
    "../model/EmailType",
    "../model/formatter",
    "sap/m/Link",
    "sap/m/MessageBox",
    "sap/m/MessageItem",
    "sap/m/MessagePopover",
    "sap/ui/core/Messaging",
    "sap/ui/model/json/JSONModel",
    "sap/base/i18n/ResourceBundle",
  ],
  function (
    BaseController,
    EmailType,
    formatter,
    Link,
    MessageBox,
    MessageItem,
    MessagePopover,
    Messaging,
    JSONModel,
    ResourceBundle
  ) {
    "use strict";

    return BaseController.extend("sap.ui.demo.cart.controller.Checkout", {
      types: {
        email: new EmailType(),
      },

      formatter: formatter,

      onInit: function () {
        // Initialize cart model first
        var oCartModel = new JSONModel({
          CartItems: [],
          TotalPrice: "0.00",
          CurrencyCode: "EUR",
        });
        this.getView().setModel(oCartModel, "cartProducts");

        // Initialize local view model for form data
        var oModel = new JSONModel({
          SelectedPayment: "Credit Card",
          SelectedDeliveryMethod: "Standard Delivery",
          DifferentDeliveryAddress: false,
          CashOnDelivery: {
            FirstName: "",
            LastName: "",
            PhoneNumber: "",
            Email: "",
          },
          InvoiceAddress: {
            Address: "",
            City: "",
            ZipCode: "",
            Country: "",
            Note: "",
          },
          DeliveryAddress: {
            Address: "",
            Country: "",
            City: "",
            ZipCode: "",
            Note: "",
          },
          CreditCard: {
            Name: "",
            CardNumber: "",
            SecurityCode: "",
            Expire: "",
          },
        });

        this.setModel(oModel);
        var oReturnToShopButton = this.byId("returnToShopButton");

        // Initialize wizard history
        this._oHistory = {
          prevPaymentSelect: null,
          prevDiffDeliverySelect: null,
        };

        // Set up message handling
        this.setModel(Messaging.getMessageModel(), "message");

        // Initialize OData model reference
        this._oODataModel = this.getOwnerComponent().getModel("odata");

        // Route handling
        this.getRouter()
          .getRoute("checkout")
          .attachMatched(
            function () {
              this.setLayout("One");
              this._loadCartData();
            }.bind(this)
          );

        // Set focus on return button
        this.getView().addEventDelegate({
          onAfterShow: function () {
            oReturnToShopButton.focus();
          },
        });
      },
      /**
       * Loads cart data using OData V4
       * @private
       */
      _loadCartData: function () {
        var oList = this.byId("entryList");
        if (!oList) {
          return;
        }

        oList.setBusy(true);
        var oCartModel = this.getView().getModel("cartProducts");

        this._oODataModel
          .bindList("/CartItems", null, [], [], {
            $expand: "Product",
          })
          .requestContexts()
          .then(
            function (aContexts) {
              var aCartItems = aContexts.map(function (oContext) {
                return oContext.getObject();
              });

              oCartModel.setProperty("/CartItems", aCartItems);
              this._calculateTotalPrice(aCartItems);
              oList.setBusy(false);
            }.bind(this)
          )
          .catch(function (oError) {
            oList.setBusy(false);
            MessageBox.error("Error loading cart data: " + oError.message);
          });
      },
      /**
       * Calculates total price from cart items
       * @private
       * @param {Array} aContexts Array of cart item contexts
       */
      _calculateTotalPrice: function (aCartItems) {
        var fTotalPrice = 0;
        var oCurrencyCode = "EUR";

        aCartItems.forEach(function (oItem) {
          if (oItem.Product) {
            fTotalPrice += oItem.Product.Price * oItem.Quantity;
            oCurrencyCode = oItem.Product.CurrencyCode || "EUR";
          }
        });

        var oCartModel = this.getView().getModel("cartProducts");
        oCartModel.setProperty("/TotalPrice", fTotalPrice.toFixed(2));
        oCartModel.setProperty("/CurrencyCode", oCurrencyCode);
      },
      /**
       * Only validation on client side, does not involve a back-end server.
       * @param {sap.ui.base.Event} oEvent Press event of the button to display the MessagePopover
       */
      onShowMessagePopoverPress: function (oEvent) {
        var oButton = oEvent.getSource();
        var oLink = new Link({
          text: "Show more information",
          href: "http://sap.com",
          target: "_blank",
        });

        var oMessageTemplate = new MessageItem({
          type: "{message>type}",
          title: "{message>message}",
          subtitle: "{message>additionalText}",
          link: oLink,
        });

        if (!this.byId("errorMessagePopover")) {
          var oMessagePopover = new MessagePopover(
            this.createId("messagePopover"),
            {
              items: {
                path: "message>/",
                template: oMessageTemplate,
              },
              afterClose: function () {
                oMessagePopover.destroy();
              },
            }
          );
          this._addDependent(oMessagePopover);
        }

        oMessagePopover.openBy(oButton);
      },

      //To be able to stub the addDependent function in unit test, we added it in a separate function
      _addDependent: function (oMessagePopover) {
        this.getView().addDependent(oMessagePopover);
      },

      /**
       * Shows next WizardStep according to user selection
       */
      goToPaymentStep: function () {
        var selectedKey = this.getModel().getProperty("/SelectedPayment");
        var oElement = this.byId("paymentTypeStep");

        // var selectedKey2 =
        //   this.getModel("checkoutModel").getProperty("/SelectedPayment");
        // var oElement2 = this.byId("paymentTypeStep");

        switch (selectedKey) {
          case "Bank Transfer":
            oElement.setNextStep(this.byId("bankAccountStep"));
            break;
          case "Cash on Delivery":
            oElement.setNextStep(this.byId("cashOnDeliveryStep"));
            break;
          case "Credit Card":
          default:
            oElement.setNextStep(this.byId("creditCardStep"));
            break;
        }
      },

      /**
       * Checks the corresponding step after activation to decide whether the user can proceed or needs
       * to correct the input
       * @param {sap.ui.base.Event} oEvent Event object
       */
      onCheckStepActivation: function (oEvent) {
        this._clearMessages();
        var sWizardStepId = oEvent.getSource().getId();

        switch (sWizardStepId) {
          case this.createId("creditCardStep"):
            this.checkCreditCardStep();
            break;
          case this.createId("cashOnDeliveryStep"):
            this.checkCashOnDeliveryStep();
            break;
          case this.createId("invoiceStep"):
            this.checkInvoiceStep();
            break;
          case this.createId("deliveryAddressStep"):
            this.checkDeliveryAddressStep();
            break;
        }
      },

      /**
       * Removes validation error messages from the previous step
       */
      _clearMessages: function () {
        Messaging.removeAllMessages();
      },

      /**
       * Validates the credit card step initially and after each input
       */
      checkCreditCardStep: function () {
        this._checkStep("creditCardStep", [
          "creditCardHolderName",
          "creditCardNumber",
          "creditCardSecurityNumber",
          "creditCardExpirationDate",
        ]);
      },

      /**
       * Validates the cash on delivery step initially and after each input
       */
      checkCashOnDeliveryStep: function () {
        this._checkStep("cashOnDeliveryStep", [
          "cashOnDeliveryName",
          "cashOnDeliveryLastName",
          "cashOnDeliveryPhoneNumber",
          "cashOnDeliveryEmail",
        ]);
      },

      /**
       * Validates the invoice step initially and after each input
       */
      checkInvoiceStep: function () {
        this._checkStep("invoiceStep", [
          "invoiceAddressAddress",
          "invoiceAddressCity",
          "invoiceAddressZip",
          "invoiceAddressCountry",
        ]);
      },

      /**
       * Validates the delivery address step initially and after each input
       */
      checkDeliveryAddressStep: function () {
        this._checkStep("deliveryAddressStep", [
          "deliveryAddressAddress",
          "deliveryAddressCity",
          "deliveryAddressZip",
          "deliveryAddressCountry",
        ]);
      },

      /**
       * Hides button to proceed to next WizardStep if validation conditions are not fulfilled
       * @param {string} sStepName - the ID of the step to be checked
       * @param {array} aInputIds - Input IDs to be checked
       * @private
       */
      _checkStep: function (sStepName, aInputIds) {
        var oWizard = this.byId("shoppingCartWizard"),
          oStep = this.byId(sStepName),
          bEmptyInputs = this._checkInputFields(aInputIds),
          bValidationError = !!Messaging.getMessageModel().getData().length;

        if (!bValidationError && !bEmptyInputs) {
          oWizard.validateStep(oStep);
        } else {
          oWizard.invalidateStep(oStep);
        }
      },

      /**
       * Checks if one or more of the inputs are empty
       * @param {array} aInputIds - Input ids to be checked
       * @returns {boolean} Whether at least one input field contains invalid data
       * @private
       */
      _checkInputFields: function (aInputIds) {
        var oView = this.getView();
        return aInputIds.some(function (sInputId) {
          var oInput = oView.byId(sInputId);
          var oBinding = oInput.getBinding("value");
          try {
            oBinding.getType().validateValue(oInput.getValue());
          } catch (oException) {
            return true;
          }
          return false;
        });
      },

      /**
       * Shows warning message if user changes previously selected payment method
       */
      setPaymentMethod: function () {
        this._setDiscardableProperty({
          message: this.getResourceBundle().getText(
            "checkoutControllerChangePayment"
          ),
          discardStep: this.byId("paymentTypeStep"),
          modelPath: "/SelectedPayment",
          historyPath: "prevPaymentSelect",
        });
      },

      /**
       * Shows warning message if user changes previously selected delivery address
       */
      setDifferentDeliveryAddress: function () {
        this._setDiscardableProperty({
          message: this.getResourceBundle().getText(
            "checkoutControllerChangeDelivery"
          ),
          discardStep: this.byId("invoiceStep"),
          modelPath: "/DifferentDeliveryAddress",
          historyPath: "prevDiffDeliverySelect",
        });
      },

      /**
       * Called from WizardStep "invoiceStep"
       * shows next WizardStep "DeliveryAddressStep" or "DeliveryTypeStep" according to user selection
       */
      invoiceAddressComplete: function () {
        var sNextStepId = this.getModel().getProperty(
          "/DifferentDeliveryAddress"
        )
          ? "deliveryAddressStep"
          : "deliveryTypeStep";
        this.byId("invoiceStep").setNextStep(this.byId(sNextStepId));
      },

      /**
       * Called from both <code>setPaymentMethod</code> and <code>setDifferentDeliveryAddress</code> functions.
       * Shows warning message if user changes previously selected choice
       * @private
       * @param {Object} oParams Object containing message text, model path and WizardSteps
       */
      _setDiscardableProperty: function (oParams) {
        var oWizard = this.byId("shoppingCartWizard");
        if (oWizard.getProgressStep() !== oParams.discardStep) {
          MessageBox.warning(oParams.message, {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: function (oAction) {
              if (oAction === MessageBox.Action.YES) {
                oWizard.discardProgress(oParams.discardStep);
                this._oHistory[oParams.historyPath] =
                  this.getModel().getProperty(oParams.modelPath);
              } else {
                this.getModel().setProperty(
                  oParams.modelPath,
                  this._oHistory[oParams.historyPath]
                );
              }
            }.bind(this),
          });
        } else {
          this._oHistory[oParams.historyPath] = this.getModel().getProperty(
            oParams.modelPath
          );
        }
      },

      /**
       * Called from  Wizard on <code>complete</code>
       * Navigates to the summary page in case there are no errors
       */
      checkCompleted: function () {
        if (Messaging.getMessageModel().getData().length > 0) {
          MessageBox.error(
            this.getResourceBundle().getText("popOverMessageText")
          );
        } else {
          this.byId("wizardNavContainer").to(this.byId("summaryPage"));
        }
      },

      /**
       * navigates to "home" for further shopping
       */
      onReturnToShopButtonPress: function () {
        this.setLayout("Two");
        this.getRouter().navTo("home");
      },

      /**
       * gets customData from ButtonEvent
       * and navigates to WizardStep
       * @private
       * @param {sap.ui.base.Event} oEvent the press event of the button
       */
      _navBackToStep: function (oEvent) {
        var sStep = oEvent.getSource().data("navBackTo");
        var oStep = this.byId(sStep);
        this._navToWizardStep(oStep);
      },

      /**
       * navigates to WizardStep
       * @private
       * @param {Object} oStep WizardStep DOM element
       */
      _navToWizardStep: function (oStep) {
        var oNavContainer = this.byId("wizardNavContainer");
        var _fnAfterNavigate = function () {
          this.byId("shoppingCartWizard").goToStep(oStep);
          oNavContainer.detachAfterNavigate(_fnAfterNavigate);
        }.bind(this);

        oNavContainer.attachAfterNavigate(_fnAfterNavigate);
        oNavContainer.to(this.byId("wizardContentPage"));
      },

      /**
       * Called from <code>ordersummary</code>
       * shows warning message and cancels order if confirmed
       */
      handleWizardSubmit: function () {
        var sText = this.getResourceBundle().getText(
          "checkoutControllerAreYouSureSubmit"
        );
        this._handleSubmitOrCancel(sText, "confirm", "ordercompleted");
      },

      /**
       * Called from <code>ordersummary</code>
       * shows warning message and cancels order if confirmed
       */
      handleWizardCancel: function () {
        var sText = this.getResourceBundle().getText(
          "checkoutControllerAreYouSureCancel"
        );
        this._handleSubmitOrCancel(sText, "warning", "home");
      },

      _handleSubmitOrCancel: function (sMessage, sMessageBoxType, sRoute) {
        MessageBox[sMessageBoxType](sMessage, {
          actions: [MessageBox.Action.YES, MessageBox.Action.NO],
          onClose: function (oAction) {
            if (oAction === MessageBox.Action.YES) {
              if (sRoute === "ordercompleted") {
                this._processOrderSubmission(sRoute);
              } else {
                this._processCancellation(sRoute);
              }
            }
          }.bind(this),
        });
      },

      _processOrderSubmission: async function (sRoute) {
        console.debug("🟢 [UI] Order submission process started...");

        var oFormData = this.getModel().getData();

        // 🔄 Step 1: Retrieve the logged-in user dynamically
        var sUserID;
        try {
          // sUserID = this.getOwnerComponent()
          //   .getModel("user")
          //   .getProperty("/ID");
          sUserID = "johnsvic";
        } catch (error) {
          console.error("🔴 [UI] Failed to retrieve User ID!", error);
          MessageBox.error("User authentication failed. Please log in again.");
          return;
        }

        if (!sUserID) {
          console.error("🔴 [UI] User ID is missing!");
          MessageBox.error("User ID is missing.");
          return;
        }

        // 🔄 Step 2: Validate Address Fields
        let sInvoiceAddress, sDeliveryAddress;
        try {
          sInvoiceAddress = JSON.stringify(oFormData.InvoiceAddress);
          sDeliveryAddress = JSON.stringify(
            oFormData.DifferentDeliveryAddress && oFormData.DeliveryAddress
              ? oFormData.DeliveryAddress
              : oFormData.InvoiceAddress
          );
        } catch (error) {
          console.error(
            "🔴 [UI] JSON Conversion Failed: Invalid address format!",
            error
          );
          MessageBox.error(
            "Invalid address format. Please re-enter the address."
          );
          return;
        }

        // 🔄 Step 3: Construct Order Data
        var oOrderData = {
          UserID: sUserID,
          PaymentMethod: oFormData.SelectedPayment,
          InvoiceAddress: sInvoiceAddress,
          DeliveryAddress: sDeliveryAddress,
          CurrencyCode: this.getView()
            .getModel("cartProducts")
            .getProperty("/CurrencyCode"),
        };

        console.debug("🔵 [UI] Order Data Prepared:", oOrderData);

        // 🔄 Step 4: Bind OData Action (`placeOrder`)
        var oOperation = this._oODataModel.bindContext(
          "/ShoppingCartService.placeOrder(...)",
          null,
          { $$groupId: "$auto" }
        );
        if (!oOperation) {
          console.error("🔴 [UI] Failed to create operation binding!");
          return;
        }

        // Log some debug info
        console.debug("[UI] OData Operation Created:", oOperation);
        console.debug(
          "[UI] Available binding methods:",
          Object.keys(oOperation)
        );

        oOperation.setParameter("UserID", oOrderData.UserID);
        oOperation.setParameter("PaymentMethod", oOrderData.PaymentMethod);
        oOperation.setParameter("InvoiceAddress", oOrderData.InvoiceAddress);
        oOperation.setParameter("DeliveryAddress", oOrderData.DeliveryAddress);
        oOperation.setParameter("CurrencyCode", oOrderData.CurrencyCode);

        // 🔄 Step 5: Execute the Request & Handle Responses
        try {
          this.getView().setBusy(true);
          console.debug(
            "⏳ [UI] Triggering unbound OData action via requestObject()..."
          );

          // Trigger the action's network request
          await oOperation.execute();

          // For actions returning a complex type (PlaceOrderResult),
          // requestObject() returns the plain JS object:
          const oResultData = await oOperation.requestObject();
          // Verify we got data back
          if (!oResultData) {
            throw new Error("🚨 [UI] No data returned from placeOrder");
          } else {
            console.debug("⏳ [UI] Data returned from placeOrder", oResultData);
          }

          // Confirm we have an OrderNumber
          console.log("placeOrder result =>", oResultData);
          if (!oResultData.OrderNumber) {
            throw new Error("OData response missing 'OrderNumber'");
          }

          var sOrderNumber = oResultData.OrderNumber;

          MessageBox.success(
            this.getResourceBundle().getText("orderPlacedSuccess", [
              sOrderNumber,
            ]),
            {
              onClose: function () {
                this._resetApplicationState();
                this.getRouter().navTo(sRoute, { orderNumber: sOrderNumber });
              }.bind(this),
            }
          );
        } catch (oError) {
          console.error("🔴 [UI] Order submission failed!", oError);
          MessageBox.error(
            this.getResourceBundle().getText("checkoutErrorSubmit"),
            {
              details: oError.message,
              actions: [MessageBox.Action.CLOSE],
              onClose: function () {
                this._backToWizardContent();
              }.bind(this),
            }
          );
        } finally {
          this.getView().setBusy(false);
          console.debug("🛑 [UI] Resetting busy indicator...");
        }
      },

      _processCancellation: async function (sRoute) {
        try {
          this.getView().setBusy(true); // Show busy indicator

          await this._clearCartData(); // Ensure cart data is cleared before resetting UI state

          this._resetApplicationState(); // Reset only after cart is cleared
          this.getRouter().navTo(sRoute); // Navigate only after success
        } catch (oError) {
          MessageBox.error("Failed to cancel order. Please try again.", {
            details: oError.message,
          });
        } finally {
          this.getView().setBusy(false); // Remove busy indicator after process completion
        }
      },

      _clearCartData: function () {
        return new Promise((resolve, reject) => {
          var oModel = this.getView().getModel("odata"); // OData V4 Model
          // var sUserID = this.getOwnerComponent()
          //   .getModel("user")
          //   .getProperty("/ID"); // Get current user ID dynamically
          var sUserID = "johnsvic";

          // Ensure UserID is available
          if (!sUserID) {
            MessageBox.error("User ID is missing.");
            reject("User ID is missing.");
            return;
          }

          // ✅ Step 1: Fetch one CartItem entry for the user
          oModel
            .bindList("/CartItems")
            .requestContexts()
            .then((aContexts) => {
              var oUserCartItem = aContexts.find(
                (ctx) => ctx.getObject().User_ID === sUserID
              );

              if (!oUserCartItem) {
                MessageBox.error("Cart is already empty.");
                resolve();
                return;
              }

              var sCartItemID = oUserCartItem.getObject().ID; // Get the ID of a cart item

              // ✅ Step 2: Call `clearCart` bound action on a specific CartItem
              var oAction = oModel.bindContext(
                `/CartItems(${sCartItemID})/ShoppingCartService.clearCart(...)`
              );
              oAction.setParameter("UserID", sUserID);

              oAction
                .execute()
                .then(() => {
                  MessageBox.show("Cart cleared successfully.");
                  resolve();
                })
                .catch((oError) => {
                  MessageBox.error("Error clearing cart: " + oError.message);
                  reject(oError);
                });
            })
            .catch((oError) => {
              MessageBox.error(
                "Error retrieving cart items: " + oError.message
              );
              reject(oError);
            });
        });
      },

      _resetApplicationState: function () {
        var oWizard = this.byId("shoppingCartWizard");
        this._navToWizardStep(this.byId("contentsStep"));
        oWizard.discardProgress(oWizard.getSteps()[0]);

        var oCartModel = this.getModel("cartProducts");
        var oModel = this.getModel();
    
        // Reset form model using setProperty() to ensure UI updates
        oModel.setProperty("/SelectedPayment", "Credit Card");
        oModel.setProperty("/SelectedDeliveryMethod", "Standard Delivery");
        oModel.setProperty("/DifferentDeliveryAddress", false);
    
        // Reset structured data instead of using empty objects
        oModel.setProperty("/CashOnDelivery", {
            FirstName: "",
            LastName: "",
            PhoneNumber: "",
            Email: "",
        });
    
        oModel.setProperty("/InvoiceAddress", {
            Address: "",
            City: "",
            ZipCode: "",
            Country: "",
            Note: "",
        });
    
        oModel.setProperty("/DeliveryAddress", {
            Address: "",
            Country: "",
            City: "",
            ZipCode: "",
            Note: "",
        });
    
        oModel.setProperty("/CreditCard", {
            Name: "",
            CardNumber: "",
            SecurityCode: "",
            Expire: "",
        });
    
        // Reset cart model
        if (oCartModel) {
            oCartModel.setData({
                CartItems: [],
                TotalPrice: "0.00",
                CurrencyCode: "JPY",
            });
        }
    
        console.debug("🛒 Cart reset successfully.");
    },
    

      /**
       * Called from <code>_handleSubmitOrCancel</code>
       * resets Wizard after submitting or canceling order
       */
      _backToWizardContent: function () {
        this.byId("wizardNavContainer").backToPage(
          this.byId("wizardContentPage").getId()
        );
      },
    });
  }
);
