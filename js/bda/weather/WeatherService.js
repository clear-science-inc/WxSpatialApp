/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

/**
 * Angular service for weather.
 */
bdaSpatialApp.service('weatherService', function(propertiesFactory, alertService, utilService) {

    this.geoserverUrl;
    this.restServerUrl;
    this.proxy;
    this.metarTestFile;
    this.metarSiteFile;
    this.ncarUrl;
    this.selectionHandler;
    this.obsError;
	this.errorMessage = '';
    this.metarId;
    this.tafId;
    this.sigmetsId;
    this.aircraftreportId;
    this.vectorProduct;
    this.deleteVector;
    this.vectorError;

    var that = this;
    var promise = propertiesFactory.getProperties();
    promise.then(
        function(properties) {
            that.geoserverUrl = properties.data.geoserverUrl;
            that.restServerUrl += ':' + properties.data.restServerPort;
            that.proxy = that.restServerUrl + '/' + properties.data.proxy;
            that.metarTestFile = properties.data.metarTestFile;
            that.metarSiteFile = properties.data.metarSiteFile;
            that.ncarUrl = properties.data.ncarUrl;
        },
        function(error) {
            console.error('failure loading properties, no geoserver nor restful server URL: ', error);
        }
    );

    this.restServerUrl = 'http://' + window.location.hostname;

    // Recursive products list that's inputted into treeview
    // [{nodeLabel:String, type:String, parameter:String, productId: String, tooltip:String, status: ProductStatus, children: Array}]
    this.products = [];

    this.deletedLayer;
    this.errorLayer;


    /** @enum {String} */ // this.ProductTypes = {FORECAST_MODEL: 'Forecast Model',
                          //                     OBSERVATION: 'Observation', IMAGERY: 'Imagery',
                          //                     AMV: 'Air Motion Vector Demo'};
    /** @enum {String} */ this.ProductTypes = {FORECAST_MODEL: 'Forecast Model',
                                               OBSERVATION: 'Observation', IMAGERY: 'Imagery',
                                               ANIMATION: 'Imagery Time Lapse', AMV: 'Air Motion Vector Demo'};
    /** @enum {String} */ this.ProductStatus = { HEADER:'header', AVAILABLE:'available', NEW_PRODUCT:'new', REQUESTED:'requested', ERROR:'error' };    // enum for status of product
    /** @const */ var CHILDREN_PROPERTY = 'children';
    /** @const */ var TOOLTIP_STARTER = 'Select icon to expand/collapse ';


    /**
     * Adds a product to the treeview.
     * @param {{type: String, parameter: String}} product
     */
    this.addProduct = function(newProduct, showAlert) {
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
                tooltip: ((newProduct.type == this.ProductTypes.FORECAST_MODEL || newProduct.layerName) ? TOOLTIP_STARTER + 'choices' : 'Select to request ' + newProduct.parameter),
                status: ((newProduct.type == this.ProductTypes.FORECAST_MODEL || newProduct.layerName) ? this.ProductStatus.HEADER : this.ProductStatus.AVAILABLE)};
            addChild(productType, productObj);
        }

        if (newProduct.type == this.ProductTypes.FORECAST_MODEL) {
            // Add Sub products
            if (!utilService.defined(newProduct.modelName) || !utilService.defined(newProduct.modelSource) || !utilService.defined(newProduct.location)
                || !utilService.defined(newProduct.level) || !utilService.defined(newProduct.forecastTime)
                || !utilService.defined(newProduct.modelTime) || !utilService.defined(newProduct.uuid)) {
                throw new Exception("product not fully defined");
            }

            var locModel = newProduct.location+' '+newProduct.modelName+' '+newProduct.modelSource;

            var locModelObj = findProductType(productObj.children, locModel);
            if (!utilService.defined(locModelObj)) {
                locModelObj = {nodeLabel: locModel, productId: newProduct.type+'_'+locModel, tooltip: TOOLTIP_STARTER + 'forecast times', status: this.ProductStatus.HEADER};
                addChild(productObj, locModelObj);
            }


            // Add level levels
            var levelObj = findProductType(locModelObj.children, newProduct.level);
            if (!utilService.defined(levelObj)) {
                levelObj = {nodeLabel: newProduct.level, productId: newProduct.type+'_'+newProduct.forecastTime + '_'+newProduct.level, tooltip: TOOLTIP_STARTER + 'products', status: this.ProductStatus.HEADER};
                addChild(locModelObj, levelObj);
            }

            // Add time as selectable product
            var forecastTimeStr = new Date(parseInt(newProduct.forecastTime)).toUTCString();
            forecastTimeStr = forecastTimeStr.substr(4, forecastTimeStr.length - 14); // remove day of week, GMT, seconds, minutes
            forecastTimeStr += 'Z';
            var timeObj = findProductType(levelObj.children, forecastTimeStr);
            if (!utilService.defined(timeObj)) {
                timeObj = {nodeLabel: forecastTimeStr,
                    type: newProduct.type,
                    parameter: newProduct.parameter,
                    productId: newProduct.uuid,
                    tooltip: 'Select to request ' + newProduct.parameter,
                    status: this.ProductStatus.NEW_PRODUCT,
                    fullName: newProduct.parameter + ' ' + newProduct.level};
                addChild(levelObj, timeObj);
            }
            if (showAlert) {
                var weatherService = this;
                var alertText = newProduct.parameter + ' ' + locModel + ' ' + newProduct.level + ' ' + forecastTimeStr;
                alertService.selectionHandler = function(selection) {
                    if (utilService.defined(weatherService.selectionHandler)) {
                        weatherService.selectionHandler(timeObj);
                    }
                };
                alertService.showMessage(alertText);
            }
        }
        else if (newProduct.type == this.ProductTypes.ANIMATION)  {
            productObj.url = newProduct.url;
            productObj.queryName = newProduct.queryName;
        }
        else if (newProduct.type == this.ProductTypes.IMAGERY && utilService.defined(newProduct.layerName) || utilService.defined(newProduct.url)) {
            var layerObj = {
                type: newProduct.type,
                parameter: newProduct.parameter,
                url: newProduct.url,
                nodeLabel: newProduct.layerName,
                queryName: newProduct.queryName,
                queryable: newProduct.queryable,
                productId: utilService.createId(),
                tooltip: 'Select to request layer',
                status: this.ProductStatus.NEW_PRODUCT};
            addChild(productObj, layerObj);
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
     * @param [{{type: String, parameter: String}}]: newProducts
     */
    this.addProducts = function(newProducts, showAlert) {
        // Remove erroneous data
        cleanProducts(newProducts);

        // Delete products that are older than today
        newProducts = pruneProducts(newProducts, getMidnightUTC());

        // Delete forecast products that > 10 entries
//        newProducts = limitForecastProducts(newProducts, 10);
        newProducts = limitForecastProducts(newProducts, 24);

        // Change status from 'new' to 'available'
        changeStatus(this.products, this.ProductStatus.NEW_PRODUCT, this.ProductStatus.AVAILABLE);

        // Add Products to tree
        for (var i=0; i<newProducts.length; i++) {
            try {
            	if (newProducts[i] !== undefined) {
                   this.addProduct(newProducts[i], showAlert);
            	}
            } catch (error) {
                console.error('Error adding product to products tree: ' + error);
            }
        }

        /**
         * Removes products from list that do not have a parameter and a type
         * property.
         * @param [{{forecastTime: Number, parameter: String}}]: products
         */
        function cleanProducts(products) {
            var length = products.length;
            for (var i=length-1; i>= 0; i--) {
                if (!products[i].parameter || !products[i].type) {
                    // Remove erroneous data from array
                    products.splice(i, 1);
                }
            }
        }

        /**
         * Prunes out products that are older than inputted time.
         * @param [{{forecastTime: Number, parameter: String}}]: products
         * @param {number} timeInMS cut off time for products in epoch time in millisecs, older products are removed
         * @return [{{forecastTime: Number, parameter: String}}]: products
         */
        function pruneProducts(products, timeInMs) {
            var prune = products;
            //
            // GDIT - Commented the next two lines out to get the order I want
            //
            // prune.sort(sortProducts);
            // prune.reverse();   // Sort newest time to lowest time

            // Skip prune if only working with older data in case there is no current data and want to demo some gribs
            if (products.length >= 1 && products[0].forecastTime < timeInMs) {
                // The first products are early tmp products, that throw error when parsed
                // The third product should be first good forecast product
                return prune;
            }

            for (var i=0; i<products.length; i++) {
                if (products[i].forecastTime && parseInt(products[i].forecastTime) < timeInMs) {
                    // Delete remaining products
                    prune = products.slice(0, i);
                    break;
                }
            }

            return prune;

            /**
             * Sorts products by forecast time (if forecast product) else by product
             * name (parameter field).
             * @param [{forecastTime: String, parameter: String}]: p1
             * @param [{forecastTime: String, parameter: String}]: p2
             */
            function sortProducts(p1, p2) {
                // Sort by time if products have forecastTime property
                if (p1.forecastTime && p2.forecastTime) {
                    return parseInt(p1.forecastTime) - parseInt(p2.forecastTime);
                }
                else if (p1.forecastTime && !p2.forecastTime) {
                    return -1;  // sort "no time" ahead of time
                }
                else if (!p1.forecastTime && p2.forecastTime) {
                    return 1;   // sort "no time" ahead of time
                }
                else {
                    if (p1.parameter > p2.parameter) {
                        return 1;
                    }
                    else if (p1.parameter < p2.parameter) {
                        return -1;
                    }
                    else {
                        return 0;
                    }
                }
            }
        }

        /**
         * Limits the number of inputs pure forecast product branch.
         * @param [{{forecastTime: Number, parameter: String}}]: products
         * @param {number} limit number of forecast products
         * @return [{{forecastTime: Number, parameter: String}}]: products
         */
        function limitForecastProducts(products, limit) {
            var sortedProducts = products;
            //JPC sortedProducts.sort(sortProductsByBranch);
            var limitedProducts = [];
            var nextToLast = sortedProducts.length -1;

            limitedProducts.push(sortedProducts[0]);
            var count = 1;

            for (var i=1; i<sortedProducts.length; i++) {
                if (sameBranch(sortedProducts[i-1], sortedProducts[i])) {
                    count++;
                    if (count <= limit) {
                        limitedProducts.push(sortedProducts[i]);
                    }
                }
                else {
                    var p1 = sortedProducts[i];
                    limitedProducts.push(sortedProducts[i]);
                    count = 1;
                }
            }

            return limitedProducts;

            /**
             * Sorts products by tree branch.
             * @param [{forecastTime: String, parameter: String}]: p1
             * @param [{forecastTime: String, parameter: String}]: p2
             */
            function sortProductsByBranch(p1, p2) {

                var sortValue = 0;

                // Sort by Product Type
                if (p1.type > p2.type) {
                    sortValue = 1;
                }
                else if (p1.type < p2.type) {
                    sortValue = -1;
                }
                else if (p1.type == "Imagery") {
                	//
                	// JPC - we want Imagery in the order which is specified
                	//       Nato Demo.
                	//
                	sortValue = 0;
                }
                else {  // Same product type
                    // Sort by product name (parameter)
                    if (p1.parameter > p2.parameter) {
                        sortValue = 1;
                    }
                    else if (p1.parameter < p2.parameter) {
                        sortValue = -1;
                    }
                    else {  // Same parameter
                        // Sort by location
                        if (p1.location && p2.location) {
                            if (p1.location > p2.location) {
                                sortValue = 1;
                            }
                            else if (p1.location < p2.location) {
                                sortValue = -1;
                            }
                            else if (p1.modelName && p2.modelName) {
                                if (p1.modelName > p2.modelName) {
                                    sortValue = 1;
                                }
                                else if (p1.modelName < p2.modelName) {
                                    sortValue = -1;
                                }
                                else if (p1.modelSource && p2.modelSource) {
                                    if (p1.modelSource > p2.modelSource) {
                                        sortValue = 1;
                                    }
                                    else if (p1.modelSource < p2.modelSource) {
                                        sortValue = -1;
                                    }
                                    else if (p1.level && p2.level) {
                                        if (p1.level > p2.level) {
                                            sortValue = 1;
                                        }
                                        else if (p1.level < p2.level) {
                                            sortValue = -1;
                                        }
                                        // Sort by forecastTime property from highest to lowest
                                        else if (p1.forecastTime && p2.forecastTime) {
                                            sortValue = parseInt(p2.forecastTime) - parseInt(p1.forecastTime);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                return sortValue;
            }

            /**
             * Checks if the 2 products would be added to same weather products
             * branch based on matching parameters.
             */
            function sameBranch(p1, p2) {
                if (p1.type == p2.type
                    && (p1.parameter == p2.parameter)
                    && (p1.location && p2.location)
                    && (p1.location == p2.location)
                    && (p1.modelName && p2.modelName)
                    && (p1.modelName == p2.modelName)
                    && (p1.modelSource && p2.modelSource)
                    && (p1.modelSource == p2.modelSource)
                    && (p1.level && p2.level)
                    && (p1.level == p2.level)) {
                        return true;
                }
                else {
                    return false;
                }
            }
        }

        /**
         * Gets the current day and rolls it back midnight in UTC.
         * @return {Number} returns midnight time as epoch time in millisecs
         */
        function getMidnightUTC() {
            var d = new Date();
            d.setUTCHours(0);
            d.setUTCMinutes(0);
            d.setUTCSeconds(0);
            return d.setUTCMilliseconds(0);
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