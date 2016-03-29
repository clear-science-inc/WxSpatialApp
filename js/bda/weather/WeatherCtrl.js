/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';


/**
 * Weather Angular controller.
 */
bdaSpatialApp.controller('weatherCtrl', function ($scope,
    imageryService, userPreferencesService, utilService,
    toolbarService, progressService, weatherService, griddedService) {

    $scope.imageryService = imageryService;
    $scope.toolbarService = toolbarService;
    $scope.progressService = progressService;
    $scope.weatherService = weatherService;
    $scope.griddedService = griddedService;
    $scope.userPreferencesService = userPreferencesService;
    $scope.utilService = utilService;
    $scope.readMetarSites = true;
    $scope.toggledGetMetars = false;
    $scope.toggledGetTafs = false;
    $scope.toggledGetSigmets = false;
    $scope.toggledGetAirReport = false;

    //
    // JPC - Echotop, Phoenix_BR, and PHoenix_ET where changed to add XX this turns off
    //       thier choice.
    //
    /** @enum  {String} */ var ObsTypes = {METARS: 'METARs', TAFS: 'TAFs', SIGMETS: 'Sigmets', AIRREPORT: 'Air Report'};
    /** @enum  {String} */ var ImageryTypes = {USRADAR: 'US Radar', USECSATELLITE_IR: 'US East Coast Satellite - IR',
    										   USECSATELLITE_VIS: 'US East Coast Satellite - VIS', USECSATELLITE_WV: 'US East Coast Satellite - WV',
    										   USWCSATELLITE_IR: 'US West Coast Satellite - IR', USWCSATELLITE_VIS: 'US West Coast Satellite - VIS',
    										   USWCSATELLITE_WV: 'US West Coast Satellite - WV', USSATELLITE_IR: 'US Satellite - IR',
    										   USSATELLITE_VIS: 'US Satellite - VIS', USSATELLITE_WV: 'US Satellite - WV',
    										   XXWORLD_VIS: 'World VIS',
    										   XXUSHASATELLITE_IR: 'US Hawaii Satellite - IR', XXUSHASATELLITE_VIS: 'US Hawaii Satellite - VIS',
    										   XXUSHASATELLITE_WV: 'US Hawaii Satellite - WV', XXUSAKSATELLITE_IR: 'US Alaska Satellite - IR',
    										   XXUSAKSATELLITE_VIS: 'US Alaska Satellite - VIS', XXUSAKSATELLITE_WV: 'US Alaska Satellite - WV',
    		                                   XXECHOTOP: 'Echotop', XXPHOENIX_BR: 'Base Reflectivity Phoenix AZ', XXPHOENIX_ET: 'Echo tops Phoenix AZ'};
    /** @enum  {String} */ var AmvTypes = { LOWER_LEVEL_IR_WIND:'Lower Level IR Winds',
            UPPER_LEVEL_IR_WINDS: 'Upper Level IR Winds' };
    /** @const {String} */ var TOOLTIP_ERROR = 'Error requesting ';
    /** @const {String} */ var TOOLTIP_CANCEL = 'Select to cancel ';
    /** @const {String} */ var TOOLTIP_REQUEST = 'Select to request ';


//        {type: $scope.weatherService.ProductTypes.ANIMATION, parameter: 'Nexrad Base Reflect (n0r)', url: "http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi", queryName: "nexrad-n0r-wmst"},
//        {type: $scope.weatherService.ProductTypes.ANIMATION, parameter: 'Nexrad Base Reflect (n0q)', url: "http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi", queryName: "nexrad-n0q-wmst"},
//        {type: $scope.weatherService.ProductTypes.ANIMATION, parameter: 'IEM WMS Service', url: "http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi", queryName: "nexrad_base_reflect"},
    var staticProducts = [
        {type: $scope.weatherService.ProductTypes.AMV, parameter: AmvTypes.LOWER_LEVEL_IR_WIND},
        {type: $scope.weatherService.ProductTypes.AMV, parameter: AmvTypes.UPPER_LEVEL_IR_WINDS},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.ECHOTOP},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.PHOENIX_BR},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.PHOENIX_ET},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USRADAR},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.WORLD_VIS},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USSATELLITE_IR},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USSATELLITE_VIS},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USSATELLITE_WV},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USECSATELLITE_IR},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USECSATELLITE_VIS},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USECSATELLITE_WV},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USWCSATELLITE_IR},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USWCSATELLITE_VIS},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USWCSATELLITE_WV},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USHASATELLITE_IR},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USHASATELLITE_VIS},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USHASATELLITE_WV},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USAKSATELLITE_IR},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USAKSATELLITE_VIS},
        {type: $scope.weatherService.ProductTypes.IMAGERY, parameter: ImageryTypes.USAKSATELLITE_WV},
        {type: $scope.weatherService.ProductTypes.OBSERVATION, parameter: ObsTypes.METARS},
        {type: $scope.weatherService.ProductTypes.OBSERVATION, parameter: ObsTypes.TAFS},
        {type: $scope.weatherService.ProductTypes.OBSERVATION, parameter: ObsTypes.SIGMETS},
        {type: $scope.weatherService.ProductTypes.OBSERVATION, parameter: ObsTypes.AIRREPORT}
        ];

    $scope.weatherService.selectionHandler = function(selection) {
        if (!$scope.toolbarService.showWeather) {
            $scope.toolbarService.showWeather = true;
            $scope.toolbarService.showActiveTasks++;
        }
        $scope.doClick(selection);
    };

    // Add the static products
    $scope.weatherService.addProducts(staticProducts);

    // DeletedLayer event can come from delete button on manipulate layers
    // panel or by deleting layer from Weather Products panel
    $scope.$watch('weatherService.deletedLayer', function(newVal, oldVal, scope) {
        if (newVal !== undefined) {
            var product = scope.weatherService.getProductById(newVal.id);
            if (product !== undefined) {
                product.status = $scope.weatherService.ProductStatus.AVAILABLE;
                product.tooltip = TOOLTIP_REQUEST + product.nodeLabel;

                if (product.type == $scope.weatherService.ProductTypes.IMAGERY && !product.url) {
                    toggleImagery(product, false);
                }
            }
        }
    });

    $scope.$watch('weatherService.errorLayer', function(newVal, oldVal, scope) {
        if (newVal !== undefined) {
            var product = scope.weatherService.getProductById(newVal);
            if (product !== undefined) {
                product.status = $scope.weatherService.ProductStatus.ERROR;
				product.tooltip = TOOLTIP_ERROR + product.nodeLabel;
            }
        }
    });

    $scope.$watch('userPreferencesService.preferences.selectedLayers', function(newVal, oldVal, scope) {
        if (newVal !== undefined) {
            if (newVal.length > 0) {
                if (!oldVal || oldVal.length == 0) {
                    $scope.weatherService.addProducts(newVal);
                }
                else if (newVal === oldVal) {
                    // Initial, go ahead and add all
                    $scope.weatherService.addProducts(newVal);
                }
               else {
                    var newProducts = [];
                    // Loop through newVal, if not in list add
                    for (var i=0; i<newVal.length; i++) {
                        if (utilService.indexOfEqualElement(oldVal, newVal[i]) < 0) {
                           newProducts.push(newVal[i]);
                        }
                    }

                    if (newProducts.length > 0) {
                        $scope.weatherService.addProducts(newProducts);
                    }
                }
            }
        }
    });

    $scope.$watch('weatherService.obsError', function(newVal, oldVal, scope) {
        if (newVal !== undefined) {
            var product = scope.weatherService.getProductById(newVal);
            if (product !== undefined) {
                product.status = scope.weatherService.ProductStatus.ERROR;
				product.tooltip = TOOLTIP_ERROR + product.nodeLabel;
        		scope.progressService.showProgressBar = false;
                if (newVal == scope.weatherService.metarId) {
                	scope.weatherService.obsError = undefined;
                	$scope.toggledGetMetars = false;
                	scope.showMetarErrorMessage();
                }
                else if (newVal == scope.weatherService.tafId) {
                	scope.weatherService.obsError = undefined;
                	$scope.toggledGetTafs = false;
                	scope.showTafErrorMessage();
                }
                else if (newVal == scope.weatherService.sigmetsId) {
                	scope.weatherService.obsError = undefined;
                	$scope.toggledGetSigmets = false;
                	scope.showMetarErrorMessage();
                }
                else if (newVal == scope.weatherService.aircraftreportId) {
                	scope.weatherService.obsError = undefined;
                	$scope.toggledGetAirReport = false;
                	scope.showMetarErrorMessage();
                }
            }
        }
    });


    $scope.$watch('weatherService.vectorError', function(newVal, oldVal, scope) {
        if (newVal !== undefined) {
            var product = scope.weatherService.getProductById(newVal);
            if (product !== undefined) {
                product.status = $scope.weatherService.ProductStatus.ERROR;
                product.tooltip = TOOLTIP_ERROR + product.nodeLabel;
            }
            scope.weatherService.vectorError = undefined;
        }
    });

    /**
     * Gets the thresholding parameters.
     * @return {Array}
     */
    $scope.getThresholdingParameters = function() {
        return $scope.thresholdingService.thresholdingParameters;
    };

    $scope.showMetarErrorMessage = function() {
         $scope.openModal(metarErrorInstanceCtrl, 'views/metarError.html');
   	};

    $scope.showTafErrorMessage = function() {
        $scope.openModal(tafErrorInstanceCtrl, 'views/tafError.html');
  	};

   /**
     * Processes the click on a product in the treeview.
     * @param {{nodeLabel:String, type: String, parameter: String, productId: String, status:String, tooltip:String}} product
     */
    $scope.doClick = function(product) {
        if (product.status != $scope.weatherService.ProductStatus.REQUESTED) {
            switch (product.type) {
                case $scope.weatherService.ProductTypes.FORECAST_MODEL:
                    requestGriddedData(product);
                    break;
                case $scope.weatherService.ProductTypes.OBSERVATION:
                    requestObs(product);
                    break;
                case $scope.weatherService.ProductTypes.IMAGERY:
                    requestImageryData(product);
                    break;
                case $scope.weatherService.ProductTypes.ANIMATION:
                    requestAnimationData(product);
                    break;
                case $scope.weatherService.ProductTypes.AMV:
                    requestVector(product);
                    break;
                default:
                    product.status = $scope.weatherService.ProductStatus.ERROR;
                    throw new Error('Product type ' + product.type + ' currently not supported');
            }

            product.status = $scope.weatherService.ProductStatus.REQUESTED;
            product.tooltip = TOOLTIP_CANCEL + product.nodeLabel;
        }
        else {
            switch (product.type) {
                case $scope.weatherService.ProductTypes.FORECAST_MODEL:
                case $scope.weatherService.ProductTypes.IMAGERY:
                case $scope.weatherService.ProductTypes.ANIMATION:
                    // Cancel product and remove from map by setting deletedLayer variable
                    weatherService.deletedLayer = {id: product.productId, animated:(product.type == $scope.weatherService.ProductTypes.ANIMATION) };
                    break;
                case $scope.weatherService.ProductTypes.OBSERVATION:
                    deleteObs(product);
                    break;
                case $scope.weatherService.ProductTypes.AMV:
                    deleteVector(product);
                    break;
                default:
                    product.status = $scope.weatherService.ProductStatus.ERROR;
                    throw new Error('Product type ' + product.type + ' currently not supported');
            }
        }

        /**
         * Initiates the request for gridded data layer.
         * @param {{nodeLabel:String, productId: String, status:String, tooltip:String}} product
         */
        function requestGriddedData(product) {
            $scope.progressService.showProgress('Retrieving ' + product.nodeLabel.split(' ')[0]);
            $scope.griddedService.tmsLayer = product;
            $scope.toolbarService.showManipulateLayers = true;
        }

        /**
         * Initiates the request for imagery data layer.
         * @param {{nodeLabel:String, productId: String, status:String, tooltip:String}} product
         */
        function requestImageryData(product) {
            if (product.url) {
                // Set up WMS layer request
                $scope.progressService.showProgress('Retrieving ' + product.nodeLabel.split(' ')[0]);
                $scope.imageryService.wmsLayer = product;
                $scope.toolbarService.showManipulateLayers = true;
            }
            else {
                toggleImagery(product, true);
            }
        }

        /**
         * Initiates the request for time lapsed imagery layer.
         * @param {{nodeLabel:String, productId: String, status:String, tooltip:String}} product
         */
        function requestAnimationData(product) {
            $scope.progressService.showProgress('Retrieving ' + product.nodeLabel.split(' ')[0]);
            $scope.imageryService.animationLayer = product;
            $scope.toolbarService.showManipulateLayers = true;
        }

        /**
         * Initiates the request for Observation data.
         * @param {{nodeLabel:String, productId: String, status:String, tooltip:String}} product
         */
        function requestObs(product) {
            switch (product.parameter) {
                case ObsTypes.METARS:
                    $scope.weatherService.metarId = product.productId;
                    $scope.toggledGetMetars = true;		// Send notice to non-angular code to get Metars
                    break;
                case ObsTypes.TAFS:
                    $scope.weatherService.tafId = product.productId;
                    $scope.toggledGetTafs = true;		// Send notice to non-angular code to get Tafs
                    break;
                case ObsTypes.SIGMETS:
                    $scope.weatherService.sigmetsId = product.productId;
                    $scope.toggledGetSigmets = true;		// Send notice to non-angular code to get Sigmets
                	break;
                case ObsTypes.AIRREPORT:
                    $scope.weatherService.aircraftreportId = product.productId;
                    $scope.toggledGetAirReport = true;		// Send notice to non-angular code to get Aircraft Reports
                	break;
                default:
                    throw new Error('Observation Parameter ' + product.parameter + ' is currently not supported');
            }

            $scope.progressService.showProgress('Retrieving ' + product.parameter);
        }

        /**
         * Deletes observations from map.
         * @param {{nodeLabel:String, productId: String, status:String, tooltip:String}} product
         */
        function deleteObs(product) {
            if (product !== undefined) {
                product.status = $scope.weatherService.ProductStatus.AVAILABLE;
    			product.tooltip = TOOLTIP_REQUEST + product.nodeLabel;

                switch (product.parameter) {
                    case ObsTypes.METARS:
                        $scope.weatherService.metarId = product.productId;
                        $scope.toggledGetMetars = false; // Send notice to non-angular code to delete Metars
                        break;
                    case ObsTypes.TAFS:
                        $scope.weatherService.tafId = product.productId;
                        $scope.toggledGetTafs = false; // Send notice to non-angular code to delete Tafs
                        break;
                    case ObsTypes.SIGMETS:
                        $scope.weatherService.sigmetsId = product.productId;
                        $scope.toggledGetSigmets = false;		// Send notice to non-angular code to delete Sigmets
                    	break;
                    case ObsTypes.AIRREPORT:
                        $scope.weatherService.aircraftreportId = product.productId;
                        $scope.toggledGetAirReport = false;		// Send notice to non-angular code to delete Aircraft Reports
                    	break;
                    default:
                        throw new Error('Observation Parameter ' + product.parameter + ' is currently not supported');
                }
            }
        }
    };

    /**
     * Initiates the request for Vector data.
     * @param {{nodeLabel:String, productId: String, status:String, tooltip:String}} product
     */
    function requestVector(product) {
        $scope.weatherService.vectorProduct = product;
        $scope.progressService.showProgress('Retrieving ' + product.parameter);
    }

    /**
     * Deletes a Vector product.
     * @param {{nodeLabel:String, productId: String, status:String, tooltip:String}} product
     */
    function deleteVector(product) {
        $scope.weatherService.deleteVector = product;
        product.status = $scope.weatherService.ProductStatus.AVAILABLE;
        product.tooltip = TOOLTIP_REQUEST + product.nodeLabel;
    }

    /**
     * Toggles the selected imagery layer product on/off.
     * @param {{nodeLabel:String, productId: String, status:String, tooltip:String}} product
     * @param {String | boolean} show   set false when off and to productId when on
     */
    function toggleImagery(product, show) {
        switch (product.parameter) {
            case ImageryTypes.USRADAR:
                $scope.imageryService.showUSRadar = show ? product.productId : show;
                break;
            case ImageryTypes.WORLD_VIS:
                $scope.imageryService.showWorldSatellite = show ? product.productId : show;
                break;
            case ImageryTypes.USSATELLITE_IR:
                $scope.imageryService.showUSSatellite_IR = show ? product.productId : show;
                break;
            case ImageryTypes.USSATELLITE_VIS:
                $scope.imageryService.showUSSatellite_VIS = show ? product.productId : show;
                break;
            case ImageryTypes.USSATELLITE_WV:
                $scope.imageryService.showUSSatellite_WV = show ? product.productId : show;
                break;
            case ImageryTypes.USECSATELLITE_IR:
                $scope.imageryService.showUSECSatellite_IR = show ? product.productId : show;
                break;
            case ImageryTypes.USECSATELLITE_VIS:
                $scope.imageryService.showUSECSatellite_VIS = show ? product.productId : show;
                break;
            case ImageryTypes.USECSATELLITE_WV:
                $scope.imageryService.showUSECSatellite_WV = show ? product.productId : show;
                break;
            case ImageryTypes.USWCSATELLITE_IR:
                $scope.imageryService.showUSWCSatellite_IR = show ? product.productId : show;
                break;
            case ImageryTypes.USWCSATELLITE_VIS:
                $scope.imageryService.showUSWCSatellite_VIS = show ? product.productId : show;
                break;
            case ImageryTypes.USWCSATELLITE_WV:
                $scope.imageryService.showUSWCSatellite_WV = show ? product.productId : show;
                break;
            case ImageryTypes.USHASATELLITE_IR:
                $scope.imageryService.showUSHASatellite_IR = show ? product.productId : show;
                break;
            case ImageryTypes.USHASATELLITE_VIS:
                $scope.imageryService.showUSHASatellite_VIS = show ? product.productId : show;
                break;
            case ImageryTypes.USHASATELLITE_WV:
                $scope.imageryService.showUSHASatellite_WV = show ? product.productId : show;
                break;
            case ImageryTypes.USAKSATELLITE_IR:
                $scope.imageryService.showUSAKSatellite_IR = show ? product.productId : show;
                break;
            case ImageryTypes.USAKSATELLITE_VIS:
                $scope.imageryService.showUSAKSatellite_VIS = show ? product.productId : show;
                break;
            case ImageryTypes.USAKSATELLITE_WV:
                $scope.imageryService.showUSAKSatellite_WV = show ? product.productId : show;
                break;
            case ImageryTypes.ECHOTOP:
                $scope.imageryService.showEchotop = show ? product.productId : show;
                break;
            case ImageryTypes.PHOENIX_BR:
                $scope.imageryService.showPhoenixBR = show ? product.productId : show;
                break;
            case ImageryTypes.PHOENIX_ET:
                $scope.imageryService.showPhoenixET = show ? product.productId : show;
                break;
            default:
                throw new Error("Unexpected imagery type requested: " + productType);
        }

        if (show) {
            $scope.toolbarService.showManipulateLayers = true;
        }
    }
});

/**
 * Creates instance of the METAR modal error dialog.
 * @param {UserPreferencesService} userPreferencesService
 */
var metarErrorInstanceCtrl = function ($scope, $modalInstance, userPreferencesService, weatherService) {

	$scope.userPreferencesService = userPreferencesService;
	$scope.weatherService = weatherService;

    /**
     * Processes the OK button. Displays Observation Preferences Dialog.
     */
    $scope.ok = function () {
        $scope.userPreferencesService.showObsPreferences = true;
        $modalInstance.close();
    };

    /**
     * Processes the cancel button. Exits the error dialog.
     */
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

};

/**
 * Creates instance of the TAF modal error dialog.
 * @param {UserPreferencesService} userPreferencesService
 */
var tafErrorInstanceCtrl = function ($scope, $modalInstance, userPreferencesService, weatherService) {

	$scope.userPreferencesService = userPreferencesService;
	$scope.weatherService = weatherService;

    /**
     * Processes the OK button. Displays Observation Preferences Dialog.
     */
    $scope.ok = function () {
        $scope.userPreferencesService.showObsPreferences = true;
        $modalInstance.close();
    };

    /**
     * Processes the cancel button. Exits the error dialog.
     */
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

};
