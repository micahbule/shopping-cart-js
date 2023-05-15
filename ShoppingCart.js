const Product = require('./Product');

/**
 * Define the product codes constants which will be used to reference the following:
 * - Product creation when you add items
 * - Discount computations in price rules
 */
const PRODUCT_CODES = {
    ULT_SMALL: 'ult_small',
    ULT_MEDIUM: 'ult_medium',
    ULT_LARGE: 'ult_large',
    ONEGB: '1gb',
};

/**
 * Define a map of product default values such as name and price
 * based on the product code
 */
const PRODUCT_DEFAULTS = {
    [PRODUCT_CODES.ULT_SMALL]: {
        name: 'Unlimited 1GB',
        price: 24.90,
    },
    [PRODUCT_CODES.ULT_MEDIUM]: {
        name: 'Unlimited 2GB',
        price: 29.90,
    },
    [PRODUCT_CODES.ULT_LARGE]: {
        name: 'Unlimited 5GB',
        price: 44.90,
    },
    [PRODUCT_CODES.ONEGB]: {
        name: '1 GB Data-pack',
        price: 9.90,
    },
}

/**
 * THIS IS JUST ADDITIONAL
 * 
 * Makes it more flexible to have more global discount types like
 * amount discounts or percentage discounts and apply it to the grand total
 */
const DISCOUNT_TYPE = {
    PERCENT: 'percent',
}

/**
 * A factory function that creates a new instance of a Product object
 * based on the product code. A second parameter is optional to override
 * the price for discount purposes.
 */
const productFactory = (productCode, price) => {
    const blueprint = PRODUCT_DEFAULTS[productCode];
    const finalPrice = price !== null && !Number.isNaN(Number(price)) ? price : blueprint.price;
    const product = new Product(productCode, blueprint.name, finalPrice);
    return product;
}

/**
 * Price Rules are basically functions with the same signature:
 * 
 * It accepts no arguments, but has access to the Shopping Cart context through
 * the "this" keyword. Meaning to say, a price rule can modify anything within
 * the Shopping cart object.
 */

/** START OF PRICE RULES HERE */

/**
 * Price rule for 1GB promo.
 */
function priceRule1GBPromo() {
    let counter = 0;

    /**
     * Using the same logic you used leveraging modulo, what I did is to have a counter
     */
    this.items.forEach((item) => {
        /**
         * For each iteration, just check if the current item is the correct product code.
         * 
         * If it is, increment the counter.
         */
        if (item.code === PRODUCT_CODES.ULT_SMALL) {
            counter += 1;
        }

        /**
         * For each iteration, if the counter is not 0 but is divisible by 3, I adjust the
         * price of the current item to 0. This basically means it's free. And you are sure
         * at this point that you've already counted up to 2 of the same item -- hence 3 for 2 promo.
         */
        if (counter !== 0 && counter % 3 === 0) {
            item.price = 0;
            counter = 0;
        }
    });
}

/** 
 * Price rule for 5GB promo.
 */
function priceRule5GBPromo() {
    let counter = 0;

    /**
     * I used for-loop here so I can use break once I already found 3 instances of the
     * 5GB item in my cart. No need to iterate over the whole array of items -- no
     * unnecessary iterations wasted.
     */
    for (let i = 0; i < this.items.length; i++) {
        if (this.items[i].code === PRODUCT_CODES.ULT_LARGE) {
            counter += 1;
        }

        if (counter == 3) {
            break;
        }
    }

    /**
     * If I didn't count anything, or did but not 3, just end the function by returning
     * early.
     */
    if (counter !== 3) return;

    /**
     * Effectively, you need to go over the whole array again to set the price of the 5GB
     * products manually.
     */
    this.items.forEach((item) => {
        if (item.code === PRODUCT_CODES.ULT_LARGE) {
            item.price = 39.90;
        }
    });
}

/**
 * Price rule for 2GB promo.
 */
function priceRule2GBDataPackPromo() {
    /**
     * Count all instances of 2GB items in the cart
     */
    const countMedium = this.items.reduce((count, item) => {
        return item.code === PRODUCT_CODES.ULT_MEDIUM ? count + 1 : count;
    }, 0);

    /**
     * Create an array with the size equal to the amount of 2GB items counted.
     * Afterwards, fill it with new 1GB Data-pack products, and override the prices to 0.
     * Append it to the cart items.
     */
    if (countMedium > 0) {
        const additionalDataPacks = (new Array(countMedium)).fill(productFactory(PRODUCT_CODES.ONEGB, 0));
        this.items = this.items.concat(additionalDataPacks);
    }
}
/** END OF PRICE RULES HERE */

/**
 * This array of price rules will be process accordingly before computing the total amount
 * of items in the card. This allows us to effectively declare other custom price rules to modify
 * the prices per item on the cart.
 */
const PRICE_RULES = [
    priceRule1GBPromo,
    priceRule5GBPromo,
    priceRule2GBDataPackPromo,
]

function ShoppingCart(priceRules) {
    this.items = [];
    /**
     * Array of applied promo codes, for flexibility
     */
    this.appliedPromoCodes = [];
    /**
     * Array of valid promo codes, for flexibility.
     * 
     * We can even use a separate object for this, but for simplicity, since we only have one,
     * I have hard-coded it here.
     */
    this.availablePromoCodes = [
        { code: 'I<3AMAYSIM', discount: 10, type: DISCOUNT_TYPE.PERCENT },
    ];
    this.total = 0;
    /**
     * Notice how I'm assigning the priceRules to this attribute -- aligned
     * to how they used it in the interface given.
     */
    this.priceRules = priceRules;

    this.addItem = (product, promoCode) => {
        this.items.push(product);

        const availablePromoCode = this.availablePromoCodes.find((availablePromoCode) => availablePromoCode.code == promoCode);

        if (availablePromoCode) {
            this.appliedPromoCodes.push(availablePromoCode);
        }

        /**
         * Every time we add a product to the cart, we always compute the total so value
         * becomes reactive.
         */
        this.computeTotal();
    }

    this.computeTotal = () => {
        /** 
         * Run all the price rules first to modify the prices of the items in the cart
         * depending on the price rule.
         */
        if (this.priceRules.length > 0) {
            this.priceRules.forEach((priceRule) => {
                /**
                 * Notice how we are calling each price rule function and using the "this"
                 * keyword so it will have access to the shopping cart context.
                 * 
                 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call
                 */
                priceRule.call(this);
            });
        }

        /**
         * After adjusting the prices of all items in the cart using price rules, we now get the subtotal
         */
        let subTotal = this.items.reduce((sum, item) => {
            return Number((sum + item.price).toFixed(2));
        }, 0);

        /**
         * After getting the subtotal, we now start applying the promo codes
         */
        if (this.appliedPromoCodes.length > 0) {
            this.appliedPromoCodes.forEach((availablePromoCode) => {
                if (availablePromoCode.type === DISCOUNT_TYPE.PERCENT) {
                    subTotal = Number(Number(subTotal - (subTotal * (availablePromoCode.discount / 100))).toFixed(2));
                }
            });
        }

        this.total = subTotal;
    }
}

const shoppingCart = new ShoppingCart(PRICE_RULES);

shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_SMALL));
shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_SMALL));
shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_SMALL));
shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_LARGE));

// shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_SMALL));
// shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_SMALL));
// shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_LARGE));
// shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_LARGE));
// shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_LARGE));
// shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_LARGE));

// shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_SMALL));
// shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_MEDIUM));
// shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_MEDIUM));

// shoppingCart.addItem(productFactory(PRODUCT_CODES.ULT_SMALL), 'I<3AMAYSIM');
// shoppingCart.addItem(productFactory(PRODUCT_CODES.ONEGB));

console.log(shoppingCart.total);