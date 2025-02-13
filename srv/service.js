/* eslint-disable no-console */
const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const { Products, Orders, OrderItems, CartItems, Users, OrderNumberRanges } =
    this.entities;

  // ✅ Get Available Stock for a Product
  this.on("getAvailableStock", async (req) => {
    const { ProductId } = req.data;
    const product = await SELECT.one.from(Products).where({ ProductId });

    if (!product) {
      return req.reject(404, `Product with ID ${ProductId} not found.`);
    }

    return product.Stock || 0;
  });

  // ✅ Add Item to Cart (Fixed User_ID field)
  this.on("addToCart", async (req) => {
    const { UserID, ProductId, Quantity } = req.data;

    // Check if the user exists
    const user = await SELECT.one.from(Users).where({ ID: UserID });
    if (!user) return req.reject(404, `User with ID ${UserID} not found.`);

    // Check if the product exists
    const product = await SELECT.one.from(Products).where({ ProductId });
    if (!product)
      return req.reject(404, `Product with ID ${ProductId} not found.`);

    // Check stock availability
    if (product.Stock < Quantity) {
      return req.reject(400, `Not enough stock available.`);
    }

    // Log data before UPSERT
    console.debug("Adding to Cart:", {
      User_ID: UserID, // ✅ Fixed Field Name
      Product: ProductId,
      Quantity,
    });

    // Add to cart (Insert or Update)
    await UPSERT.into(CartItems).entries({
      User_ID: UserID, // ✅ Fixed Field Name
      Product: ProductId,
      Quantity,
    });

    return `Product ${ProductId} added to cart.`;
  });

  // ✅ Remove Item from Cart (Fixed User_ID field)
  this.on("removeFromCart", async (req) => {
    const { UserID, ProductId } = req.data;
    await DELETE.from(CartItems).where({ User_ID: UserID, Product: ProductId }); // ✅ Fixed Field Name
    return `Product ${ProductId} removed from cart.`;
  });

  // ✅ Clear Cart
  this.on("clearCart", async (req) => {
    const { UserID } = req.data;
    await DELETE.from(CartItems).where({ User: UserID });
    return `Cart cleared for user ${UserID}.`;
  });

  // ✅ Place Order
  this.on("placeOrder", async (req) => {
    console.log("🔥 [Backend] placeOrder function triggered!");

    try {
      console.log("\n===== 🟢 NEW ORDER REQUEST =====\n");

      const {
        UserID,
        PaymentMethod,
        InvoiceAddress,
        DeliveryAddress,
        CurrencyCode,
      } = req.data;
      console.log("🔍 [Backend] Extracted Request Parameters:", {
        UserID,
        PaymentMethod,
        CurrencyCode,
      });

      // ✅ Validate User
      console.log("🔎 [Backend] Checking if User Exists:", UserID);
      // const user = await SELECT.one.from(Users).where({ ID: UserID });
      const user = await SELECT.one.from(Users).where({ ID: { "=": UserID } });

      if (!user) {
        console.error("❌ [Backend] User Not Found:", UserID);
        return req.error(404, `User not found.`);
      }
      console.log("✅ [Backend] User Exists:", user);

      // ✅ Fetch Cart Items
      console.log("🛒 [Backend] Fetching Cart Items for User:", UserID);
      const cartItems = await SELECT.from(CartItems).where({ User_ID: UserID });

      if (cartItems.length === 0) {
        console.error("❌ [Backend] Cart is Empty for User:", UserID);
        return req.error(400, `Cart is empty.`);
      }
      console.log(
        "✅ [Backend] Cart Items Retrieved:",
        cartItems.length,
        "items"
      );
      console.log("✅ [Backend] Cart Items Retrieved:", cartItems, "items");

      // ✅ Fetch Product Data for Validation
      console.log("🔄 [Backend] Validating Stock and Calculating Total Amount");
      const productIds = cartItems.map((item) => item.Product_ProductId);
      console.log("🔍 [Backend] Fetching Product Details for:", productIds);

      const products = await SELECT.from(Products).where({
        ProductId: { in: productIds },
      });
      console.log(
        "✅ [Backend] Product Data Fetched:",
        products.length,
        "products"
      );

      let totalAmount = 0;
      for (const item of cartItems) {
        const product = products.find(
          (p) => p.ProductId === item.Product_ProductId
        );

        if (!product) {
          console.error(
            "❌ [Backend] Product Not Found in Database:",
            item.Product_ProductId
          );
          return req.error(400, `Product not found.`);
        }

        if (product.Stock < item.Quantity) {
          console.error(
            "❌ [Backend] Not Enough Stock for Product:",
            product.ProductId,
            "Available:",
            product.Stock,
            "Requested:",
            item.Quantity
          );
          return req.error(400, `Not enough stock for ${product.Name}.`);
        }

        totalAmount += item.Quantity * product.Price;
        console.log(
          `🛒 [Backend] Product ${product.ProductId} added to order. Quantity: ${item.Quantity}, Price: ${product.Price}`
        );
      }
      console.log("💰 [Backend] Total Order Amount Calculated:", totalAmount);

      // ✅ Generate Order Number (Fix for SQLite)
      console.log("🔢 [Backend] Generating Unique Order Number...");
      await UPDATE(OrderNumberRanges)
        .set({ LastNumber: { "+=": 1 } })
        .where({ ID: "ORDER" });

      // 🔄 Fetch Updated Order Counter Separately
      const counter = await SELECT.one
        .from(OrderNumberRanges)
        .where({ ID: "ORDER" });

      if (!counter || !counter.LastNumber) {
        console.error("❌ [Backend] Failed to Retrieve Order Counter");
        return req.error(500, "Failed to generate order number.");
      }

      const orderNumber = `ORD-${new Date().getFullYear()}${String(
        counter.LastNumber
      ).padStart(4, "0")}`;
      console.log("✅ [Backend] Generated Order Number:", orderNumber);

      // ✅ Insert Order into Database
      console.log("📝 [Backend] Inserting Order into Database...");
      await INSERT.into(Orders).entries({
        OrderNumber: orderNumber,
        User_ID: UserID,
        OrderDate: new Date(),
        TotalAmount: totalAmount,
        CurrencyCode,
        Status: "Processing",
        PaymentMethod,
        InvoiceAddress: JSON.stringify(InvoiceAddress),
        DeliveryAddress: JSON.stringify(DeliveryAddress),
      });

      console.log("✅ [Backend] Order Inserted Successfully");

      // ✅ Insert Order Items and Deduct Stock
      console.log("📦 [Backend] Creating Order Items and Deducting Stock...");
      for (const item of cartItems) {
        const product = products.find(
          (p) => p.ProductId === item.Product_ProductId
        );

        console.log(
          `🛠️ [Backend] Processing Order Item: Product ${product.ProductId}, Quantity: ${item.Quantity}`
        );

        await INSERT.into(OrderItems).entries({
          ID: cds.utils.uuid(),
          Order_OrderNumber: orderNumber,
          Product_ProductId: item.Product_ProductId,
          Quantity: item.Quantity,
          Price: item.Quantity * product.Price,
          CurrencyCode,
        });

        await UPDATE(Products)
          .set({ Stock: { "-=": item.Quantity } })
          .where({ ProductId: item.Product_ProductId });

        console.log(
          `✅ [Backend] Order Item Added and Stock Updated for Product ${product.ProductId}`
        );
      }

      console.log("📌 [Backend] Order Items and Stock Updates Completed");

      // ✅ Clear User's Cart
      console.log("🗑️ [Backend] Clearing Cart Items for User:", UserID);
      await DELETE.from(CartItems).where({ User_ID: UserID });
      console.log("✅ [Backend] Cart Cleared Successfully");

      console.log("✅ [Backend] Order Successfully Created:", orderNumber);

      // ✅ Return Order Details
      // return `Order ${orderNumber} created successfully.`;
      return {
        OrderNumber: orderNumber,
        message: "Order placed successfully",
      };
    } catch (error) {
      console.error("🚨 [Backend] Order Placement Failed!", error.message);
      console.debug("🔴 [Backend] Full Error Details:", error);
      return req.error(500, `Order placement failed: ${error.message}`);
    }
  });
});
