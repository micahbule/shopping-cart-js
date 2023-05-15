const Product = require('./Product');

const PRODUCT_CODES = {
    ULT_SMALL: 'ult_small',
    ULT_MEDIUM: 'ult_medium',
    ULT_LARGE: 'ult_large',
    ONEGB: '1gb',
};

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

const DISCOUNT_TYPE = {
    PERCENT: 'percent',
}

const productFactory = (productCode, price) => {
    const blueprint = PRODUCT_DEFAULTS[productCode];
    const finalPrice = price !== null && !Number.isNaN(Number(price)) ? price : blueprint.price;
    const product = new Product(productCode, blueprint.name, finalPrice);
    return product;
}

const PRICE_RULES = [
    function () {
        let counter = 0;

        this.items.forEach((item) => {
            if (item.code === PRODUCT_CODES.ULT_SMALL) {
                counter += 1;
            }

            if (counter !== 0 && counter % 3 === 0) {
                item.price = 0;
                counter = 0;
            }
        });
    },
    function () {
        let counter = 0;

        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].code === PRODUCT_CODES.ULT_LARGE) {
                counter += 1;
            }

            if (counter == 3) {
                break;
            }
        }

        if (counter !== 3) return;

        this.items.forEach((item) => {
            if (item.code === PRODUCT_CODES.ULT_LARGE) {
                item.price = 39.90;
            }
        });
    },
    function () {
        const countMedium = this.items.reduce((count, item) => {
            return item.code === PRODUCT_CODES.ULT_MEDIUM ? count + 1 : count;
        }, 0);

        if (countMedium > 0) {
            const additionalDataPacks = (new Array(countMedium)).fill(productFactory(PRODUCT_CODES.ONEGB, 0));
            this.items = this.items.concat(additionalDataPacks);
        }
    }
]

function ShoppingCart(priceRules) {
    this.items = [];
    this.appliedPromoCodes = [];
    this.availablePromoCodes = [
        { code: 'I<3AMAYSIM', discount: 10, type: DISCOUNT_TYPE.PERCENT },
    ];
    this.total = 0;
    this.priceRules = priceRules;

    this.addItem = (product, promoCode) => {
        this.items.push(product);

        const availablePromoCode = this.availablePromoCodes.find((availablePromoCode) => availablePromoCode.code == promoCode);

        if (availablePromoCode) {
            this.appliedPromoCodes.push(availablePromoCode);
        }

        this.computeTotal();
    }

    this.computeTotal = () => {
        if (this.priceRules.length > 0) {
            this.priceRules.forEach((priceRule) => {
                priceRule.call(this);
            });
        }

        let subTotal = this.items.reduce((sum, item) => {
            return Number((sum + item.price).toFixed(2));
        }, 0);

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