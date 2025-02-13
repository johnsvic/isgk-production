using isgk.shoppingcart as db from '../db/schema';

type PlaceOrderResult {
    OrderNumber : String;
    message     : String;
}

service ShoppingCartService @(path: '/odata/v4') {
    entity Users             as projection on db.Users;
    entity ProductCategories as projection on db.ProductCategories;

    entity Products          as projection on db.Products
        actions {
            action getAvailableStock(ProductId : UUID) returns Integer;
        };

    entity OrderNumberRanges as projection on db.OrderNumberRanges;
    entity Orders            as projection on db.Orders;
    entity OrderItems        as projection on db.OrderItems;

    action placeOrder(UserID : UUID,
                      PaymentMethod : String,
                      InvoiceAddress : String,
                      DeliveryAddress : String,
                      CurrencyCode : String) returns PlaceOrderResult;

    entity CartItems         as projection on db.CartItems
        actions {
            action addToCart(UserID : UUID, ProductId : UUID, Quantity : Integer);
            action removeFromCart(UserID : UUID, ProductId : UUID);
            action clearCart(UserID : UUID);
        };

    entity FeaturedProducts  as projection on db.FeaturedProducts;
}
// annotate ShoppingCartService.Orders with @odata.draft.enabled; 
annotate ShoppingCartService with @(requires: 'support');
// annotate ShoppingCartService with @(requires: 'admin');
