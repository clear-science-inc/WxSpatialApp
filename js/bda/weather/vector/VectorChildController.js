/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Bda/framework/ChildController',
    'Bda/weather/vector/VectorDataSource',
    'Cesium/Core/ClockRange',
    'Cesium/Core/ClockStep',
    'Cesium/Core/defined',
    'Cesium/Core/loadText',
    'Cesium/Core/TimeInterval',
    'Cesium/DataSources/DataSourceClock',
    'Cesium/Scene/Billboard',
    'Cesium/Scene/Label',
    'Cesium/ThirdParty/when'

], function(
    ChildController,
    VectorDataSource,
    ClockRange,
    ClockStep,
    defined,
    loadText,
    TimeInterval,
    DataSourceClock,
    Billboard,
    Label,
    when
)
{
    "use strict";
    
    
    var theViewer;
    var dataSources;
    var showVector = {showMarker: true, showBarb: false};
    var propertiesUis = {};
    var that;
    
    /** @const */ var VECTOR_ERROR_MESSAGE = 'Error Requesting Vectors';

    /**
     * VectorChildController Object. It controls interactions between the MetocVis UI
     * controls and the Cesium map. 
     * @constructor
     * @param {Viewer} viewer  The viewer instance
     */
    var VectorChildController = function(viewer) {
        theViewer = viewer;
        ChildController.apply(this, arguments);
        dataSources = theViewer.dataSources;
        setupListeners();
        that = this;
    };
    
    VectorChildController.prototype = Object.create(ChildController.prototype);
    VectorChildController.prototype.constructor = VectorChildController;

    /**
     * Handles objects selected on 3d map.
     * @param {DynamicObj} pickedOb
     * @param {number} x  x position of mouse click
     * @param {number} y  y position of mouse click
     */
    VectorChildController.prototype.handlePrimitivePicked = function(pickedOb, x, y) {
        // do nothing
    };
    
    /**
     * Handles when camera height changes.
     * Updates what part of METOCVis object is displayed.
     * @param {number} height
     */
    VectorChildController.prototype.handleCameraHeightChanged = function(height) {
        // Apply zoom settings
        var showMarker = false;
        var showBarb = false;
        
        if (height < 10000000) {   
            showBarb = true;
        }
        else if (height < 50000000) {
            showMarker = true;
        }
        
        if (showMarker != showVector.showMarker || showBarb != showVector.showBarb) {
            showVector.showBarb = showBarb;
            showVector.showMarker = showMarker;
            updateShowVectors();
        }
    };
    
    /** 
     * Updates floating panes to show properties for the correct time interval.
     * @param {Clock} clock  The Cesium timeline clock 
     */
    VectorChildController.prototype.syncClock = function(clock) {
        // do nothing
    };
    
    /**
     * Sets up listeners on the angular variables. 
     */
    function setupListeners() {
        var scope = angular.element(document.getElementById('weatherCtrl')).scope();
        scope.$watch('weatherService.vectorProduct', function(newVal, oldVal, scope) {
            if (newVal) {
                getVectors(newVal);
                scope.weatherService.vectorProduct = undefined;
            }
        });
        scope.$watch('weatherService.deleteVector', function(newVal, oldVal, scope) {
            if (newVal) {
                var dataSourceToDelete = that.getDataSourceById(dataSources, newVal.productId);
                if (dataSourceToDelete) {
                    dataSources.remove(dataSourceToDelete, true);
                    scope.weatherService.deleteVector = undefined;
                }
            }
        });                
	}
        
    /**
     * Updates observation dataSource object in the maps dynamic scene based on
     * whether the label, wind barb, or point should be showing.
     */
    function updateShowVectors() {
        try {
            for (var i=0; i<dataSources.length; i++) {
                var dataSource = dataSources.get(i);
                if (dataSource instanceof VectorDataSource) {
                    var entityCollection = dataSource.entities;
                    var objects = entityCollection.values;
                    for (var j=0; j<objects.length; j++) {
                        var obj = objects[j];
                        if (defined(obj.label)) {
                            obj.label.show._value = showVector.showMarker;
                        }
                        if (defined(obj.billboard)) {
                            obj.billboard.show._value = showVector.showBarb;
                        }
                    }
                }
            }
        } catch (ex) {
            console.error("error updating obs: " + ex);
        }        
    }
        
    /**
     * Loads the vector object file. And parses it into dynamcic objects
     * that can be displayed on Cesium map. 
     * @param {Object} vectorProduct
     * @param {string} url
     */
    function loadFile(vectorProduct, url) {
        
        var windType = getWindType(vectorProduct.parameter);
        var level = vectorProduct.parameter.split(' ')[0];
        
        when (loadText(url), processLoadSuccess, processLoadFailure);
        
        /**
         * Processes the load failure.
         * @param {String} error
         */                  
        function processLoadFailure(error) {
            that.hideProgressBar();
            showVectorError(vectorProduct, VECTOR_ERROR_MESSAGE + '. Status code: ' + error.statusCode);
            console.error(error);
        }
        
        /**
         * Processes the vector data and adds them to the map.
         * @param {String} vectorsString
         */                      
        function processLoadSuccess(vectorsString) {
            that.hideProgressBar();
            if (!defined(vectorsString)) {
                showVectorError(vectorProduct, "Error reading vector file: " + http.statusText);
                return;
            }
            
            var dataSource = new VectorDataSource();
            
            dataSource.load(vectorsString, windType, level);
            
            var entityCollection = dataSource.entities;
            if (entityCollection.values.length == 0) {
                showVectorError(vectorProduct, "No Vector data for selected time range and area.");
                return;
            }
            
            // set the clock
            var timeInterval = entityCollection.computeAvailability();
            var dataSourceClock = new DataSourceClock();
            dataSourceClock.startTime = timeInterval.start;
            dataSourceClock.stopTime = timeInterval.stop;
            dataSourceClock.clockRange = ClockRange.LOOP_STOP;
            dataSourceClock.multiplier = 1.0;
            dataSourceClock.currentTime = dataSourceClock.startTime;
            dataSourceClock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
            dataSource.clock = dataSourceClock;
            
            //dataSources.removeAll();    // TODO: do i really want to do this?? or should merge times??
            
            // Update TimeLine and clock
            // Note: live data shouldn't have to do this, but test data does
            if (defined(theViewer.timeline)) {
                dataSourceClock.getValue(theViewer.clock);
                theViewer.timeline.updateFromClock();
                theViewer.timeline.zoomTo(dataSourceClock.startTime, dataSourceClock.stopTime);
            }                
            
            // Set new ID property on dataSource
            dataSource.id = vectorProduct.productId;

            // Add observation objects to dynamic scene
            dataSources.add(dataSource);

            // Make adjustments for camera height
            updateShowVectors();
        }
        
        /**
         * Gets the wind type based on product name.
         * @param {String} name   product name (ie Lower Level IR Winds)
         * @param {String} type   wind type abbreviation from Type of wind in 
         * {@link: http://tropic.ssec.wisc.edu/archive/data/samples/windsqi.readme.txt}
         */
        function getWindType(name) {
            var type;
            if (name.indexOf('IR Winds') >= 0) {
                type = 'IR';
            }
            // TODO: WV, SWIR, VIS, WV10, WV11
            
            return type;
        }
    }
    
    /**
     * Loads Vector data for the selected area and time period.
     */
    function getVectors(vectorProduct) {
     // var url = 'resources/data/20131107.06.NWPacific.txt';
        var url = 'resources/data/Full_20131107.06.NWPacific.txt';

        try {
            loadFile(vectorProduct, url);
        } catch (e) {
       	    showVectorError(vectorProduct, VECTOR_ERROR_MESSAGE + ' ' + vectorProduct.parameter);
            console.error('error reading vector file');       
        }
    }
    
    /**
     * Displays an error message in the modal OK dialog box.
     * @parame {Object} vectorProduct
     * @param {String} errorMessage
     */
    function showVectorError(vectorProduct, errorMessage) {
        var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
        scope.showOkModalMessage('AMV Error', errorMessage);
        
        // Notifies weather service of the error
        var weatherScope = angular.element(document.getElementById('weatherCtrl')).scope();
        weatherScope.weatherService.vectorError = vectorProduct.productId;
    }
 
    /**
     * Applies inputted thresholding onto METOCVis plotted objects.
     * @param {Array} thresholds  array of selected threshold values per threshold parameter
     */
    VectorChildController.prototype.applyThresholding = function(thresholds) {
        // do nothing, vectors do not contain thresholded parameters
    };

    /**
     * Clears thresholding. The observation objects are reverted back to blue
     * and parameters are reverted back to white in the floating panes.
     */
    VectorChildController.prototype.clearThresholding = function() {
        // do nothing, vectors do not contain thresholded parameters
    };

    return VectorChildController;
});