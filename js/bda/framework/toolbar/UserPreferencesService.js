/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

/**
 * Angular service for user preferences.
 */

bdaSpatialApp.service('userPreferencesService', function($localStorage, imageryFactory, utilService, propertiesFactory) {

    /** @const */ this.ENGLISH_UNITS = "English";
    /** @const */ this.METRIC_UNITS = "Metric";
    /** @const */ this.GEOSERVER_OBS_SOURCE = "Geoserver";
    /** @const */ this.ADDS_OBS_SOURCE = "ADDS";
    /** @const */ this.TESTFILE_OBS_SOURCE = "Test File";
    /** @const */ this.PREFIX = "BDA-";
    /** @const */ var DEFAULT_UNITS = this.METRIC_UNITS;
    /** @const */ var DEFAULT_OBS_SOURCE = "ADDS";
    /** @const */ var LAYER_PROPERTIES = ['parameter', 'queryName'];

    this.preferences = {};

    this.imageryFactory = imageryFactory;
    this.utilService = utilService;

    this.wmsSources = [
        { url: 'http://geo.compusult.net/mapmanconnector/weather'},
        { url: 'http://gis.srh.noaa.gov/arcgis/services/QPF/MapServer/WMSServer'},
        { url: 'http://gis.srh.noaa.gov/arcgis/services/Radar_warnings/MapServer/WMSServer'},
        { url: 'http://gis.srh.noaa.gov/arcgis/services/atStorms/MapServer/WMSServer'},
        { url: 'http://gis.srh.noaa.gov/arcgis/services/FOP/MapServer/WMSServer'},
        { url: 'http://wms.chartbundle.com/wms'},
        { url: 'http://nowcoast.noaa.gov/wms/com.esri.wms.Esrimap/obs'} // contains queryable layers
    ];

    this.availableLayers = [];
    this.showLayersPreferences = false;
    this.showObsPreferences = false;

    this.bdaStorage;

    this.newWmsUrl = "";

    initializePreferences(this);
    initializeLayers(this);

    /**
     * Initializes the WMS layers.
     * @param {userPreferencesService} service
     */
    function initializeLayers(service) {
        var urls = service.wmsSources.slice(0);
        var wmsSource = urls.pop();

        // Wait for WeatherService to read in properties, so proxy path is available, and then call getCapabilities
        var promise = propertiesFactory.getProperties();
        promise.then(
            function(properties) {
                getCapabilities(service, urls, wmsSource);
            },
            function(error) {
                console.error('failure loading properties, will not be able to request WMS capabilities ', error);
            }
        );
    }

    /**
     * Requests the WMS capabilities one at a time from list of urls.
     * @param {userPreferencesService} service
     * @param [{{url: String}}] urls
     * @param {url: String} wmsSource
     */
    function getCapabilities(service, urls, wmsSource) {
        service.imageryFactory.getImageryCapabilities(wmsSource.url)
            .then(function(capabilities) {
                if (capabilities && capabilities.length > 0) {
                    var index = utilService.indexOfElementWithMatchingProperties(service.preferences.selectedLayers, wmsSource, ['url']);
                    var productTitle = index >= 0 ? service.preferences.selectedLayers[index].parameter : capabilities[0].parameter;    // copy title just in case it was edited
                    var parentObj = { layerName: productTitle, id: utilService.createId(), url: wmsSource.url, children: []};
                    for (var i=0; i<capabilities.length; i++) {
                        capabilities[i].parameter = productTitle;
                        var index = utilService.indexOfElementWithMatchingProperties(service.preferences.selectedLayers, capabilities[i], LAYER_PROPERTIES);
                        if (index >= 0 && service.preferences.selectedLayers[index].url == parentObj.url) {
                            capabilities[i].checked = true;
                            capabilities[i].layerName = service.preferences.selectedLayers[index].layerName;   // copy layer name just in case it was edited
                        }

                        capabilities[i].id = utilService.createId();
                        parentObj.children.push(capabilities[i]);
                    }

                    service.availableLayers.push(parentObj);
                }
                else {
                    console.info('no capabilites from ' + wmsSource.url);
                }
            })
            .catch(function(error) {
                console.error('got error back from request: ' + error);
            })
            .finally(function() {
                if (urls.length > 0) {
                    // Get capabilities for next wms service in array
                    var nextSource = urls.pop();
                    getCapabilities(service, urls, nextSource);
                }
            });
    }

    /**
     * Initialize the user preferences. If they exist read them in and set them
     * up, else use default values.
     * @param {userPreferencesService} service
     */
    function initializePreferences(service) {
        if ($localStorage.bdaPreferences) {
            service.bdaStorage = $localStorage;
            var savedPreferences = JSON.parse(service.bdaStorage.bdaPreferences);
            service.preferences.units = setProperty(savedPreferences.units, DEFAULT_UNITS);
            service.preferences.selectedLayers = setProperty(savedPreferences.selectedLayers, []);
            service.preferences.obsDataSource = setProperty(savedPreferences.obsDataSource, DEFAULT_OBS_SOURCE);
            updateSources(service);
        }
        else {
            service.preferences.units = DEFAULT_UNITS;
            service.preferences.selectedLayers = [];
            service.bdaStorage = $localStorage.$default({bdaPreferences: JSON.stringify(service.preferences)});
        }

        /**
         * Sets the property to default property if there is no saved property.
         * @param {Object} savedValue
         * @param {Object} defaultValue
         */
        function setProperty(savedValue, defaultValue) {
            return (savedValue ? savedValue : defaultValue);
        }

        /**
         * Updates the WMS sources with any selectedLayers that are not in the
         * predefined list.
         * @param {userPreferencesService} service
         */
        function updateSources(service) {
            for (var i=0; i<service.preferences.selectedLayers.length; i++) {
                var index = utilService.indexOfEqualElement(service.wmsSources, { url: service.preferences.selectedLayers[i].url});
                if (index < 0) {
                    service.wmsSources.push({ url: service.preferences.selectedLayers[i].url});
                }
            }
        }
    };

    /**
     * Gets the user preferences.
     * @return {Object}
     */
    this.getUserPreferences = function() {
        return this.preferences;
    };

    /**
     * Sets user preferences.
     * @param {Object} userPreferences
     */
    this.setUserPreferences = function(userPreferences) {
        this.preferences = userPreferences;
    };

    /**
     * Saves the user preferences to local storage.
     */
    this.saveUserPreferences = function() {
        // Update selected layers
        this.preferences.selectedLayers = getSelectedLayers(this.availableLayers);
        this.bdaStorage.bdaPreferences = JSON.stringify(this.preferences);

        function getSelectedLayers(availableLayers) {
            var selectedLayers = [];
            for (var i=0; i<availableLayers.length; i++) {
                for (var j=0; j<availableLayers[i].children.length; j++) {
                    if (availableLayers[i].children[j].checked) {
                        var availableLayer = { layerName: availableLayers[i].children[j].layerName,
                            parameter: availableLayers[i].layerName,    // title of parent in tree
                            queryName: availableLayers[i].children[j].queryName,
                            queryable: availableLayers[i].children[j].queryable,
                            type: availableLayers[i].children[j].type,
                            url: availableLayers[i].url };
                        selectedLayers.push(availableLayer);
                    }
                }
            }

            return selectedLayers;
        }
    };

    /**
     * Adds the new WMS source to the WMS Layer Sources with its capabilities.
     */
    this.addWmsSource = function() {
        var wmsSource = { url: this.newWmsUrl};
        getCapabilities(this, [], wmsSource);
        this.newWmsUrl = '';
    };
});