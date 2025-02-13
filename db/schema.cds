using {
    managed,
    cuid
} from '@sap/cds/common';

namespace isgk.shoppingcart;

entity Users : managed {
    key ID                     : UUID;
        FirstName              : String;
        LastName               : String;
        Email                  : String @mandatory;
        Password               : String; // Hashed passwords
        Orders                 : Association to many Orders
                                     on Orders.User = $self;
        Cart                   : Association to many CartItems
                                     on Cart.User = $self;
        DefaultAddress         : String; // 🔥 NEW: Store default shipping address (optional)
        PreferredPaymentMethod : String; // 🔥 NEW: Store user’s preferred payment method (optional)
}

entity ProductCategories : managed {
    key Category         : String;
        CategoryName     : String;
        NumberOfProducts : Integer;
        Products         : Association to many Products
                               on Products.Category = $self;
}

entity Products : managed {
    key ProductId        : UUID;
        Name             : String;
        ShortDescription : String;
        SupplierName     : String;
        Category         : Association to ProductCategories;
        Weight           : Decimal(10, 2);
        WeightUnit       : String;
        PictureUrl       : String;
        Status           : String;
        Price            : Decimal(10, 2);
        DimensionWidth   : Decimal(10, 2);
        DimensionDepth   : Decimal(10, 2);
        DimensionHeight  : Decimal(10, 2);
        DimensionUnit    : String;
        CurrencyCode     : String;
        Stock            : Integer;
}

entity OrderNumberRanges {
    key ID         : String(10); // Fixed identifier (e.g., "ORDER")
        LastNumber : Integer; // Last assigned order number
}

entity Orders : managed {
    key OrderNumber     : String(20);
        User            : Association to Users;
        OrderDate       : Timestamp;
        TotalAmount     : Decimal(10, 2);
        CurrencyCode    : String; // 🔥 NEW: Store the currency of the order
        Status          : String;
        Items           : Composition of many OrderItems
                              on Items.Order = $self;
        PaymentMethod   : String; // 🔥 NEW: Store selected payment method
        InvoiceAddress  : String; // 🔥 NEW: Store billing address
        DeliveryAddress : String; // 🔥 NEW: Store shipping address
}

entity OrderItems : managed {
    key ID           : UUID;
        Order        : Association to Orders;
        Product      : Association to Products;
        Quantity     : Integer;
        Price        : Decimal(10, 2);
        CurrencyCode : String; // 🔥 NEW: Store the currency of the order
}

entity CartItems : managed {
    key ID       : UUID;
        User     : Association to Users;
        Product  : Association to Products;
        Quantity : Integer;
}

entity FeaturedProducts : managed {
    key ID      : UUID;
        Product : Association to Products;
        Type    : String;
}
