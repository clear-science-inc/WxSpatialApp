/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Bda/util/Util',
    'Cesium/Core/DefaultProxy',
    'Cesium/Core/defaultValue',
    'Cesium/Core/defined',
    'Cesium/Core/EventHelper',
    'Cesium/Core/JulianDate',
    'Cesium/Core/Rectangle',
    'Cesium/Core/TimeInterval',
    'Cesium/Scene/SingleTileImageryProvider',
    'Cesium/Scene/TileMapServiceImageryProvider',
    'Cesium/Core/ClockRange',
    'Cesium/Core/ClockStep',
    'Cesium/Scene/WebMapServiceImageryProvider',
], function(
    Util,
    DefaultProxy,
    defaultValue,
    defined,
    EventHelper,
    JulianDate,
    Rectangle,
    TimeInterval,
    SingleTileImageryProvider,
    TileMapServiceImageryProvider,
    ClockRange,
    ClockStep,
    WebMapServiceImageryProvider
)
{
    "use strict";


    var theViewer;
    var layerCollection;

    /**
     * LayersController Object. It controls interactions between the layers UI
     * controls and the Cesium map.
     * @param {Viewer} viewer  The viewer instance
     */
    var LayersController = function(viewer) {
        theViewer = viewer;
        layerCollection = theViewer.scene.globe._imageryLayerCollection;
        setupWmsLayerListener();
        setupTmsLayerListener();
        setupManipulateLayerListener();
        setupImageryListener();
        setupAnimationLayerListener();
    };

    /**
     * Sets up listener on the wms layer.
     */
    function setupWmsLayerListener() {
        var scope = angular.element(document.getElementById('weatherCtrl')).scope();
        var proxy = new DefaultProxy(scope.weatherService.proxy + '/proxy?url=');

        scope.$watch('imageryService.wmsLayer', function(newVal, oldVal) {
            if (newVal !== undefined) {
                addLayer(newVal);
                scope.imageryService.wmsLayer = undefined;    // clear out variable
            }
        });

        /**
         * Adds a wms layer to the map's layer collection.
         * @param {Object} layer
         */
        function addLayer(product) {
            // Make new features of selected layers
            var webMapServiceImageryProvider = new WebMapServiceImageryProvider({
                url : product.url,
                layers : product.queryName,
                enablePickFeatures: product.queryable,
                parameters : {
                    transparent : 'true',
                    format : 'image/png'
// TODO: thresholding using sld_body parameter
//        ex.       sld_body : '<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:se="http://www.opengis.net/se" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.1.0" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd"><NamedLayer><se:Name>sevendays_rainfall_data</se:Name><UserStyle><se:FeatureTypeStyle><se:Rule><se:Name>red</se:Name><ogc:Filter><ogc:PropertyIsGreaterThan><ogc:PropertyName>da</ogc:PropertyName><ogc:Literal>.4</ogc:Literal></ogc:PropertyIsGreaterThan></ogc:Filter><se:MaxScaleDenominator>465000000.000000</se:MaxScaleDenominator><se:PolygonSymbolizer><se:Fill><se:SvgParameter name="fill">#ff0000</se:SvgParameter></se:Fill></se:PolygonSymbolizer></se:Rule><se:Rule><se:Name>2.00 - 12.0</se:Name><ogc:Filter><ogc:PropertyIsGreaterThan><ogc:PropertyName>da</ogc:PropertyName><ogc:Literal>.1</ogc:Literal></ogc:PropertyIsGreaterThan></ogc:Filter><se:MaxScaleDenominator>465000000.000000</se:MaxScaleDenominator><se:PolygonSymbolizer><se:Fill><se:SvgParameter name="fill">#ffff00</se:SvgParameter></se:Fill></se:PolygonSymbolizer></se:Rule><se:Rule><se:Name>green</se:Name><ogc:Filter><ogc:PropertyIsGreaterThan><ogc:PropertyName>da</ogc:PropertyName><ogc:Literal>0</ogc:Literal></ogc:PropertyIsGreaterThan></ogc:Filter><se:MaxScaleDenominator>465000000.000000</se:MaxScaleDenominator><se:PolygonSymbolizer><se:Fill><se:SvgParameter name="fill">#00ff00</se:SvgParameter></se:Fill></se:PolygonSymbolizer></se:Rule></se:FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>',
                },
                proxy : proxy
            });

            var layer = layerCollection.addImageryProvider(webMapServiceImageryProvider);
            layer.alpha = defaultValue(0.75, 0.75);
            layer.show = defaultValue(true, true);
            layer.id = product.productId;   // add new property
            layer.name = product.nodeLabel;

            var weatherCtrlScope = angular.element(document.getElementById('weatherCtrl')).scope();
            weatherCtrlScope.progressService.showProgressBar = false;

            // Catch request error
            webMapServiceImageryProvider.errorEvent.addEventListener(function(error) {
                // Remove layer, change color to red by setting the error variable
                var errorLayer = getLayerByProvider(error.provider);
                if (defined(errorLayer) && defined(errorLayer.id)) {
                    scope.weatherService.errorLayer = errorLayer.id;
                }
            });

            // Add layer to Manipulate layers
            var scope = angular.element(document.getElementById('manipulateLayersCtrl')).scope();
            scope.addLayer(layer.name, product.productId, layer.alpha*100);
        }
    }

    /**
     * Sets up listener on the animation wms-t layer.
     */
    function setupAnimationLayerListener() {
        var scope = angular.element(document.getElementById('weatherCtrl')).scope();
        var proxy = new DefaultProxy(scope.weatherService.proxy + '/proxy?url=');

        scope.$watch('imageryService.animationLayer', function(newVal, oldVal) {
            if (newVal !== undefined) {
                // TODO: fix the case where clock current time > now, therefore no data to retrieve
                var jOrigStartTime = JulianDate.now();
                JulianDate.addMinutes(theViewer.clock.currentTime, -360, jOrigStartTime);
                var origStartTime = JulianDate.toDate(jOrigStartTime);

                // Define parent of time layers
                var parent = { name: newVal.nodeLabel, id: newVal.productId, alpha: .75};

                // Let's animate the previous hour
                // TODO: fix the case where the previous hour < timeline.start
                var min = origStartTime.getMinutes();
                var startTime = origStartTime.toISOString();
                startTime = startTime.substring(0, startTime.indexOf(':'));   // lop off :MM:SSZ

                var closestMin = new String(Math.floor(min / 5) * 5);
                startTime += ':' + (closestMin.length == 1 ? ('0' + closestMin) : closestMin);
                startTime += ':00Z';

                var jEndTime = JulianDate.now();
                for (var i=0; i<12; i++) {
                    var jStartTime = JulianDate.fromIso8601(startTime);
                    JulianDate.addMinutes(jStartTime, i*5, jStartTime);
                    JulianDate.addMinutes(jStartTime, 5, jEndTime);
                    var timeInterval = new TimeInterval({start: jStartTime, stop: jEndTime});
                    addLayer(newVal, timeInterval, parent);
                }

//                var stop  = JulianDate.fromDate(new Date());
//                var start = JulianDate.addSeconds(stop, -360, new JulianDate());
//
//                // Reset current time on timeline
//        		theViewer.clock.startTime = start.clone();
//        		theViewer.clock.stopTime = stop.clone();
//        		theViewer.clock.clockRange = ClockRange.LOOP_STOP; //Loop at the end
//        		theViewer.clock.multiplier = 10;
//
//        		theViewer.clock.currentTime = start.clone();

                if (defined(theViewer.timeline)) {
                   theViewer.timeline.updateFromClock();
//                  theViewer.timeline.zoomTo(start, stop);
                }

                // Add layer to Manipulate layers
                var mlScope = angular.element(document.getElementById('manipulateLayersCtrl')).scope();
                mlScope.addLayer(parent.name, parent.id, parent.alpha*100, true);

                scope.imageryService.animationLayer = undefined;  // clear out new animation layer
            }
        });

        var eventHelper;

        /**
         * Adds a wms layer to the map's layer collection.
         * @param {Object} layer
         */
        function addLayer(product, timeInterval, parent) {
            var webMapServiceImageryProvider = new WebMapServiceImageryProvider({
                url : product.url,
                layers : product.queryName,
                enablePickFeatures: false,
                parameters : {
                    transparent : 'true',
                    format : 'image/png',
                    time : JulianDate.toDate(timeInterval.start).toISOString()
                },
                proxy : proxy
            });

            var layer = layerCollection.addImageryProvider(webMapServiceImageryProvider);
            layer.alpha = defaultValue(0.0, 0.0);
            layer.show = defaultValue(true, true);
            layer.id = product.productId + '_' + JulianDate.toDate(timeInterval.start).toISOString();   // add new property
            layer.timeInterval = timeInterval;      // Add new property
            layer.name = product.nodeLabel;
            layer.parent = parent;

            // Catch request error
            var weatherCtrlScope = angular.element(document.getElementById('weatherCtrl')).scope();
            weatherCtrlScope.progressService.showProgressBar = false;

            webMapServiceImageryProvider.errorEvent.addEventListener(function(error) {
                // Remove layer, change color to red by setting the error variable
                var errorLayer = getLayerByProvider(error.provider);
                if (defined(errorLayer) && defined(errorLayer.id)) {
                    scope.weatherService.errorLayer = errorLayer.id;
                }
            });

            if (!eventHelper) {
                // Set up clock listener.
                eventHelper = new EventHelper();
                eventHelper.add(theViewer.cesiumWidget.clock.onTick, animateLayers);
            }
        }

        /**
         * Updates animation layers to match clock.
         * @param {Clock} clock  the Cesium timeline clock
         */
        function animateLayers(clock) {
            var currentTime = clock.currentTime;
            var layers = layerCollection._layers;

            var lastIndex = layers.length - 1;
            for (var i=lastIndex; i>=0; i--) {
                if (layers[i].timeInterval) {
                    layers[i].alpha = TimeInterval.contains(layers[i].timeInterval, currentTime) ? layers[i].parent.alpha : 0.0;
                }
            }
        }
    }

    /**
     * Sets up listener on the tms layer.
     */
    function setupTmsLayerListener() {
        var scope = angular.element(document.getElementById('weatherCtrl')).scope();
        //var url = "griddedTestData/";   // TODO: delete
        var url = scope.weatherService.restServerUrl+"/bda-tile-service/rs/get/";
        scope.$watch('griddedService.tmsLayer', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                addLayer(newVal);
                scope.griddedService.tmsLayer = undefined;    // clear out variable
            }
        });

        /**
         * Adds a tms layer to the map's layer collection.
         * @param {{nodeLabel:String, productId:String}} product
         */
        function addLayer(product) {
            var layer = getLayer(product.productId);
            if (defined(layer)) {
                // layer is already on map, return
                return;
            }

            // Make new features of selected layers
            var tmsImageryProvider = new TileMapServiceImageryProvider({
                url : url+product.productId,
                layers : product.nodeLabel,     // TODO: this might not be used by tms, check
                parameters : {
                    transparent : 'true',
                    format : 'image/png'
                },
            });

            layer = layerCollection.addImageryProvider(tmsImageryProvider);
            layer.alpha = defaultValue(0.75, 0.75);
            layer.show = defaultValue(true, true);
            layer.id = product.productId;   // add new property

            var weatherCtrlScope = angular.element(document.getElementById('weatherCtrl')).scope();
            weatherCtrlScope.progressService.showProgressBar = false;

            tmsImageryProvider.errorEvent.addEventListener(function(error) {
                if (error.provider.maximumLevel == 18) {
                    // Remove layer, change color to red by setting the error variable
                    var errorLayer = getLayerByProvider(error.provider);
                    if (defined(errorLayer) && defined(errorLayer.id)) {
                        scope.weatherService.errorLayer = errorLayer.id;
                    }
                }
            });

            // Add layer to Manipulate layers
            var manipulateLayersCtrlScope = angular.element(document.getElementById('manipulateLayersCtrl')).scope();
            manipulateLayersCtrlScope.addLayer(product.fullName, layer.id, layer.alpha*100);
        }
    }

    /**
     * Sets up listener on the manipulate layers panel.
     */
    function setupManipulateLayerListener() {
        var scope = angular.element(document.getElementById('manipulateLayersCtrl')).scope();

        scope.$watch('raisedLayer', function(newVal, oldVal) {
            if (newVal !== undefined) {
                try {
                    var layers = newVal.animated ? getAnimatedLayers(newVal.id) : [getLayer(newVal.id)];
                    var raiseIndex = layers[0]._layerIndex + 1;
                    var raiseLayer = layerCollection.get(raiseIndex);
                    var raiseLayers = raiseLayer.timeInterval ? getAnimatedLayers(raiseLayer.parent.id) : [raiseLayer];

                    for (var i=0; i<layers.length; i++) {
                        for (var j=0; j<raiseLayers.length; j++) {
                            layerCollection.raise(layers[i]);
                        }
                    }
                } catch (error) {
                    console.warn("Cannot raise layer " + newVal + " out of sync, not in layerCollection " + error);
                }
            }
        });

        scope.$watch('loweredLayer', function(newVal, oldVal) {
            if (newVal !== undefined) {
                try {
                    var layers = newVal.animated ? getAnimatedLayers(newVal.id) : [getLayer(newVal.id)];
                    var lowerIndex = layers[0]._layerIndex - 1;
                    var lowerLayer = layerCollection.get(lowerIndex);
                    var lowerLayers = lowerLayer.timeInterval ? getAnimatedLayers(lowerLayer.parent.id) : [lowerLayer];

                    for (var i=0; i<layers.length; i++) {
                        for (var j=0; j<lowerLayers.length; j++) {
                            layerCollection.lower(layers[i]);
                        }
                    }
                } catch (error) {
                    console.warn("Cannot lower layer " + newVal + " out of sync, not in layerCollection " + error);
                }
            }
        });

        scope.$watchCollection('changedOpacity', function(newVal, oldVal) {
            if (newVal !== undefined) {
                if (!newVal.animated) {
                    var layer = getLayer(newVal.id);
                    if (layer !== undefined) {
                        layer.alpha = newVal.opacity / 100.0;
                    }
                    else {
                        console.warn("Cannot disable layer " + newVal + " out of sync, not in layerCollection");
                    }
                }
                else {
                    var layers = getAnimatedLayers(newVal.id);
                    for (var i=0; i<1; i++) {
                        // Only have to update the parent reference in one of the children
                        layers[i].parent.alpha = newVal.opacity / 100.0;
                    }
                }
            }
        });

        scope.$watch('enabledLayer', function(newVal, oldVal) {
            if (newVal !== undefined && newVal !== null) {
                try {
                    var layers = newVal.animated ? getAnimatedLayers(newVal.id) : [getLayer(newVal.id)];
                    for (var i=0; i<layers.length; i++) {
                        layers[i].show = true;
                    }
                } catch (error) {
                    console.warn("Cannot enable layer " + newVal + " out of sync, not in layerCollection " + error);
                }
            }
        });

        scope.$watch('disabledLayer', function(newVal, oldVal) {
            if (newVal !== undefined && newVal !== null) {
                try {
                    var layers = newVal.animated ? getAnimatedLayers(newVal.id) : [getLayer(newVal.id)];
                    for (var i=0; i<layers.length; i++) {
                        layers[i].show = false;
                    }
                } catch (error) {
                    console.warn("Cannot disable layer " + newVal + " out of sync, not in layerCollection " + error);
                }
            }
        });

        // DeletedLayer event can come from delete button on manipulate layers
        // panel or by deleting layer from Weather Products panel
        scope.$watch('weatherService.deletedLayer', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                try {
                    var layers = newVal.animated ? getAnimatedLayers(newVal.id) : [getLayer(newVal.id)];
                    for (var i=0; i<layers.length; i++) {
                        layerCollection.remove(layers[i]);
                    }
                    scope.weatherService.deletedLayer = undefined;  // clear out variable
                }
                catch (error) {
                    console.warn("LayersController: Cannot delete layer " + newVal + " out of sync, not in layerCollection " + error);
                }
            }
        });

        scope.$watch('weatherService.errorLayer', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                var layer = getLayer(newVal.id);
                if (layer !== undefined) {
                    layerCollection.remove(layer);
                    scope.weatherService.errorLayer = undefined;  // clear out variable
                }
                else {
                    console.warn("LayersController: Cannot delete layer " + newVal + " out of sync, not in layerCollection");
                }
            }
        });
    }

    /**
     * Sets up a listener on the imagery selections.
     */
    function setupImageryListener() {
        var scope = angular.element(document.getElementById('weatherCtrl')).scope();
        var proxy = new DefaultProxy(scope.weatherService.proxy + '/proxy?url=');

        scope.$watch('imageryService.showUSRadar', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var radarProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi?',
                        layers : 'nexrad-n0r',
                        credit : 'Radar data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(radarProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US RADAR";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showWorldSatellite', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var radarProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi?',
                        layers : 'nexrad-n0r',
                        credit : 'World Satellite data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(radarProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "World";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSSatellite_IR', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var ussatelliteIRProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/conus_ir.cgi?',
                        layers : 'goes_conus_ir',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(ussatelliteIRProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US Satellite - IR";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSSatellite_VIS', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var ussatelliteVISProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/conus_vis.cgi?',
                        layers : 'goes_conus_vis',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(ussatelliteVISProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US Satellite - VIS";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSSatellite_WV', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var ussatelliteWVProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/conus_wv.cgi?',
                        layers : 'goes_conus_wv',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(ussatelliteWVProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US Satellite - WV";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSECSatellite_IR', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usECsatelliteIRProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/east_ir.cgi?',
                        layers : 'goes_east_ir',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usECsatelliteIRProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US East Coast Satellite - IR";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSECSatellite_VIS', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usECsatelliteVISProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/east_vis.cgi? ',
                        layers : 'goes_east_vis',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usECsatelliteVISProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US East Coast Satellite - VIS";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSECSatellite_WV', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usECsatelliteWVProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/east_wv.cgi? ',
                        layers : 'goes_east_wv',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usECsatelliteWVProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US East Coast Satellite - WV";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSWCSatellite_IR', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usWCsatelliteIRProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/west_ir.cgi?',
                        layers : 'goes_west_ir',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usWCsatelliteIRProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US West Coast Satellite - IR";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSWCSatellite_VIS', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usWCsatelliteVISProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/west_vis.cgi?',
                        layers : 'goes_west_vis',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usWCsatelliteVISProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US West Coast Satellite - VIS";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSWCSatellite_WV', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usWCsatelliteWVProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/west_wv.cgi?',
                        layers : 'goes_west_wv',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usWCsatelliteWVProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US West Coast Satellite - WV";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSHASatellite_IR', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usHAsatelliteIRProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/hawaii_ir.cgi?',
                        layers : 'goes_hawaii_ir',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usHAsatelliteIRProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US Hawaii Satellite - IR";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSHASatellite_VIS', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usHAsatelliteVISProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/hawaii_vis.cgi? ',
                        layers : 'goes_hawaii_vis',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usHAsatelliteVISProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US Hawaii Satellite - VIS";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSHASatellite_WV', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usHAsatelliteWVProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/hawaii_wv.cgi? ',
                        layers : 'goes_hawaii_wv',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usHAsatelliteWVProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US Hawaii Satellite - WV";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSAKSatellite_IR', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usAKsatelliteIRProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/alaska_ir.cgi?',
                        layers : 'goes_alaska_ir',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usAKsatelliteIRProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US Alaska Satellite - IR";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSAKSatellite_VIS', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usAKsatelliteVISProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/alaska_vis.cgi?',
                        layers : 'goes_alaska_vis',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usAKsatelliteVISProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US Alaska Satellite - VIS";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showUSAKSatellite_WV', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var usAKsatelliteWVProvider = new WebMapServiceImageryProvider({
                        url : 'http://mesonet.agron.iastate.edu/cgi-bin/wms/goes/alaska_wv.cgi? ',
                        layers : 'goes_alaska_wv',
                        credit : 'Infrared data courtesy Iowa Environmental Mesonet',
                        enablePickFeatures: false,
                        parameters : {
                            transparent : 'true',
                            format : 'image/png'
                        },
                        proxy : proxy
                    });

                    var layer = layerCollection.addImageryProvider(usAKsatelliteWVProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "US Alaska Satellite - WV";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showEchotop', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var echotopProvider = new SingleTileImageryProvider({
                        url : 'resources/images/echotops-sample8.png',
                        rectangle : Rectangle.fromDegrees(-128.7, 22.5, -74.6, 53.7)
                    });

                    var layer = layerCollection.addImageryProvider(echotopProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "Echotop";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showPhoenixBR', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var ridgeUrl = 'http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::IWA-N0Z-0';
                    var proxyRidgeUrl = scope.weatherService.proxy + '/getTms?url=' + ridgeUrl;
                    var tmsProvider = new TileMapServiceImageryProvider({
                        url : proxyRidgeUrl,
                        fileExtension: 'png',
                    });

                    var layer = layerCollection.addImageryProvider(tmsProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "Base Reflectivity Phoenix AZ";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });

        scope.$watch('imageryService.showPhoenixET', function(newVal, oldVal, scope) {
            if (newVal !== undefined) {
                if (newVal) {
                    var ridgeUrl = 'http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::IWA-NET-0';
                    var proxyRidgeUrl = scope.weatherService.proxy + '/getTms?url=' + ridgeUrl;
                    var tmsProvider = new TileMapServiceImageryProvider({
                        url : proxyRidgeUrl,
                        fileExtension: 'png',
                    });

                    var layer = layerCollection.addImageryProvider(tmsProvider);
                    layer.alpha = defaultValue(0.75, 0.75);
                    layer.show = defaultValue(true, true);
                    layer.name = "Echotops Phoenix AZ";
                    layer.id = newVal;

                    addLayerToManipulateLayers(layer);
                }
            }
        });
    }

    /**
     * Adds the layer to manipulate layers panel.
     * @param {ImageryLayer} layer
     */
    function addLayerToManipulateLayers(layer) {
        var manipulateLayersCtrlScope = angular.element(document.getElementById('manipulateLayersCtrl')).scope();
        manipulateLayersCtrlScope.addLayer(layer.name, layer.id, layer.alpha*100);
    }

    /**
     * Gets the layer from CesiumViewer layerCollection based on product id.
     * @param {String} id
     * @return {ImageryLayer}
     */
    function getLayer(id) {
        var layer;
        var layers = layerCollection._layers;

        for (var i=0; i<layers.length; i++) {
            if (layers[i].id !== 'undefined' && layers[i].id == id) {
                layer = layers[i];
                break;
            }
        }

        return layer;
    }

    /**
     * Gets the animated layers from CesiumViewer layerCollection associated
     * with product id.
     * @param {String} id
     * @return [{ImageryLayer}]
     */
    function getAnimatedLayers(id) {
        var layers = layerCollection._layers;
        var childLayers = [];

        for (var i=0; i<layers.length; i++) {
            if (layers[i].parent && layers[i].parent.id == id) {
                childLayers.push(layers[i]);
            }
        }

        return childLayers;
    }

    /**
     * Gets the layer from CesiumViewer layerCollection based on imagery provider.
     * @param {ImageryProvider} provider
     * @return {ImageryLayer}
     */
    function getLayerByProvider(provider) {
        var layer;
        var layers = layerCollection._layers;

        for (var i=0; i<layers.length; i++) {
            if (layers[i].imageryProvider == provider) {
                layer = layers[i];
                break;
            }
        }

        return layer;
    }

    return LayersController;
});
