/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

/**
 * Angular service for social media.
 */
bdaSpatialApp.service('socialMediaService', function(utilService) {


    // Recursive products list that's inputted into treeview
    // [{nodeLabel:String, type:String, parameter:String, productId: String, tooltip:String, status: ProductStatus, children: Array}]
    this.products = [];

    this.deletedLayer;


    /** @enum {String} */ this.ProductTypes = {TWEETS: 'Tweets', FACEBOOK: 'Facebook', YOUTUBE: 'YouTube', CHINA: 'China', RUSSIA: 'Russia', TUMBLER: 'Tumblr', INSTAGRAM: 'Instagram', MISC: 'Other Sources' };
    /** @enum {String} */ this.ProductStatus = { HEADER:'header', AVAILABLE:'available', NEW_PRODUCT:'new', REQUESTED:'requested', ERROR:'error', HYPERLINK: 'hyperlink', FOLLOWED_HYPERLINK: 'followedHyperlink' };    // enum for status of product
    /** @enum {String} */ this.ProductSource = { LINK: 'link', REQUEST: 'request'};
    /** @const */ var CHILDREN_PROPERTY = 'children';
    /** @const */ var TOOLTIP_STARTER = 'Select icon to expand/collapse ';


    /**
     * Adds a product to the treeview.
     * @param {{type: String, parameter: String, source: String}} product
     */
    this.addProduct = function(newProduct) {
        if (!utilService.defined(newProduct.type) || !utilService.defined(newProduct.parameter)) {
            throw new Exception("product not fully defined");
        }

        var productType = findProductType(this.products, newProduct.type);

        if (!utilService.defined(productType)) {
            productType = {nodeLabel : newProduct.type, productId: newProduct.type+'_ID', tooltip: TOOLTIP_STARTER + newProduct.type + ' Products', status: this.ProductStatus.HEADER};
            this.products.push(productType);
        }

        var productObj = findProductType(productType.children, newProduct.parameter);
        if (!utilService.defined(productObj)) {
            productObj = {nodeLabel: newProduct.parameter, type: newProduct.type,
                parameter: newProduct.parameter, productId: utilService.createId(),
                tooltip: newProduct.source == this.ProductSource.LINK ? 'Select to visit web page': 'Select to request ' + newProduct.parameter,
                status: newProduct.source == this.ProductSource.LINK ? this.ProductStatus.HYPERLINK : this.ProductStatus.AVAILABLE};
            addChild(productType, productObj);
        }
    };

    /**
     * Deletes a product from the treeview.
     * @param {{nodeLabel:String, type:String, parameter:String, productId: String, tooltip:String, status: ProductStatus, children: Array}} product
     */
    this.deleteProduct = function(product) {
        // Delete the map layer
        if (product.status == this.ProductStatus.REQUESTED) {
            this.deletedLayer = product.productId;
        }

        // Delete Product
        var index = this.products.indexOf(product);
        if (index != -1) {
            this.products.splice(index, 1);
        }
        else {
            // See if its a child of array object
            deleteProductFromTree(this.products, this.products, product);
        }

        /**
         * Recursively deletes product and empty leaf nodes from tree.
         * @param {{nodeLabel:String, type:String, parameter:String, productId: String, tooltip:String, status: ProductStatus, children: Array}} tree
         * @param [{{nodeLabel:String, type:String, parameter:String, productId: String, tooltip:String, status: ProductStatus, children: Array}}] products
         * @param {{nodeLabel:String, type:String, parameter:String, productId: String, tooltip:String, status: ProductStatus, children: Array}} product
         */
       function deleteProductFromTree(tree, products, product) {
            var deleted = false;
            var list = products;
            for (var i=products.length -1; i>=0; i--) {
                if (utilService.defined(products[i].children)) {
                    var index = products[i].children.indexOf(product);
                    if (index != -1) {
                        // Delete product
                        products[i].children.splice(index, 1);

                        // Delete parent too, if no more children
                        if (products[i].children.length < 1) {
                            deleteProductFromTree(tree, tree, products[i]);
                        }
                        deleted = true;
                        break;
                    }
                    else {
                        deleted = deleteProductFromTree(tree, products[i].children, product);
                    }
                }
            }

            return deleted;
        }
    };

    /**
     * Adds products to the treeview.
     * @param [{{type: String, parameter: String, source: String}}]: newProducts
     */
    this.addProducts = function(newProducts) {
        // Change status from 'new' to 'available'
        changeStatus(this.products, this.ProductStatus.NEW_PRODUCT, this.ProductStatus.AVAILABLE);

        // Add Products to tree
        for (var i=0; i<newProducts.length; i++) {
            this.addProduct(newProducts[i]);
        }
    };

    /**
     * Gets the product from treeview by id.
     * @param {String} id
     * @return {{nodeLabel:String, type:String, parameter:String, productId: String, tooltip:String, status: ProductStatus, children: Array}}
     */
    this.getProductById = function(id) {
        return getProductById(this.products, id);

        function getProductById(products, id) {
            var product;
            for (var i=0; i<products.length; i++) {
                if (products[i].productId == id) {
                    product = products[i];
                    break;
                }
                else if (utilService.defined(products[i].children)) {
                    product = getProductById(products[i].children, id);
                    if (utilService.defined(product)) {
                        break;
                    }
                }
            }
            return product;
        }
    };

    /**
     * Adds a child node to parent node in treeview.
     * @param {{nodeLabel:String, productId: String, tooltip:String, status: ProductStatus, children: Array}} product
     * @param {{nodeLabel:String, productId: String, tooltip:String, status: ProductStatus, children: Array}} child
     */
    function addChild(product, child) {
        var children = product[CHILDREN_PROPERTY];
        if (!utilService.defined(children)) {
            product[CHILDREN_PROPERTY] = [child];
        }
        else {
            if (!utilService.defined(findProductType(children, child.parameter))) {
                children.push(child);
            }
            else {
                console.error('duplicate product: ' + child.parameter);
            }
        }
    }

    /**
     * Finds product type in list of products. Returns undefined if not found.
     * @param [{{nodeLabel:String, productId: String, tooltip:String, status: ProductStatus, children: Array}}] products
     * @param {String} productTypeName
     * @return {{nodeLabel:String, productId: String, tooltip:String, status: ProductStatus, children: Array}}
     */
    function findProductType(products, productTypeName) {
        var productType;
        if (utilService.defined(products)) {
            for (var i=0; i<products.length; i++) {
                if (products[i].nodeLabel == productTypeName) {
                    productType = products[i];
                    break;
                }
            }
        }

        return productType;
    };

    /**
     * Changes all products that are set to current status to the new status
     * in the treeview.
     * @param [{{nodeLabel:String, productId: String, tooltip:String, status: ProductStatus, children: Array}}] products
     * @param {String} currentStatus
     * @param {String} newStatus
     */
    function changeStatus(products, currentStatus, newStatus) {
        for (var i=0; i<products.length; i++) {
            if (products[i].status == currentStatus) {
                products[i].status = newStatus;
            }
            if (utilService.defined (products[i].children)) {
                changeStatus(products[i].children, currentStatus, newStatus);
            }
        }
    }
});