/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Cesium/Core/Color',
    'Cesium/Core/ClockRange',
    'Cesium/Core/defined',
    'Cesium/Core/JulianDate',
    'Cesium/DataSources/ConstantProperty'

], function(
    Color,
    ClockRange,
    defined,
    JulianDate,
    ConstantProperty
    ) {
   "use strict";

    /**
     * @constructor
     * @abstract
     */
    var ChildController = function() {
        if (this.constructor === ChildController) {
          throw new Error("Can't instantiate abstract class!");
        }
        // ChildController initialization...
    };

    /** @constant */ ChildController.DEFAULT_PROPERTY_COLOR = '#FFFFFF';    // white

    /**
     * @abstract
     */
    ChildController.prototype.handlePrimitivePicked = function(primitive, x, y) {
        throw new Error("Abstract method!");
    };

    /**
     * @abstract
     */
    ChildController.prototype.handleCameraHeightChanged = function(height) {
        throw new Error("Abstract method!");
    };

    /**
     * @abstract
     */
    ChildController.prototype.syncClock = function(clock) {
        throw new Error("Abstract method!");
    };

    /**
     * @abstract
     */
    ChildController.prototype.applyThresholding = function(thresholds) {
        throw new Error("Abstract method!");
    };

    /**
     * @abstract
     */
    ChildController.prototype.clearThresholding = function() {
        throw new Error("Abstract method!");
    };

    /**
     * Gets units data for all parameters in named object.
     * It returns a units object made up of parameter and unit.
     * @param {string} name  The name of dynamcic object (usually ICAO station name or flight route)
     * @param {string[]}  parameters  The array of parameters that should be included in plotted data
     * @param {DataSourceCollection} dataSources
     * @param {RouteDataSource|WxxmDataSource} dataSourceObject
     * @return {Object} units
     */
    ChildController.prototype.getUnitData = function(name, parameters, dataSources, dataSourceObject) {
        var unitData = {};
        var found = false;

        try {
            for (var i=0; i<dataSources.length; i++) {
                var dataSource = dataSources.get(i);
                if (dataSource instanceof dataSourceObject) {
                    var entityCollection = dataSource.entities;
                    var entities = entityCollection.values;
                    for (var j=0; j<entities.length; j++) {
                        var obj = entities[j];
                        if (defined(obj.name) && obj.name == name) {
                            if (defined (obj.envProperties)) {
                                found = true;
                                var properties = obj.envProperties;
                                for (var k=0; k<parameters.length; k++) {
                                    if (!unitData.hasOwnProperty(parameters[k]) && properties.hasOwnProperty(parameters[k])) {
                                        unitData[parameters[k]] = properties[parameters[k]].units;
                                    }
                                }

                                if (haveAllUnits()) {
                                    break;
                                }
                            }
                        }
                        else if (found) {
                            // Since these objects have been sorted by name, we know we
                            // can break out early when search moves on to next name
                            break;
                        }
                    }
                }
            }
        } catch (ex) {
            console.error("error getting units data for : " + name + ' error='+ ex);
        }

        if (!haveAllUnits) {
            fillInBlankUnits(unitData, parameters);
        }

        insertDataType(unitData);

        return unitData;

        /**
         * Checks if all parameters specified in parameters has a unit entry
         * in unitData.
         * @param {Object} unitData
         * @param {string[]}  parameters  The array of parameters that should be included in plotted data
         * @return {boolean}
         */
        function haveAllUnits(unitData, parameters) {
            for (var key in parameters) {
               if (parameters.hasOwnProperty(key) && !unitData.hasOwnProperty(key)) {
                  return false;
               }
            }

            return true;
        }

        /**
         * Fills in 'unknown' if a parameter is not in unitData.
         * @param {Object} unitData
         * @param {string[]}  parameters  The array of parameters that should be included in plotted data
         */
        function fillInBlankUnits(unitData, parameters) {
            for (var key in parameters) {
               if (parameters.hasOwnProperty(key) && !unitData.hasOwnProperty(key)) {
                  parameters[key] = 'unknown';
               }
            }
        }

        /**
         * Inserts the data type into the units string.
         * i.e. 'C' becomes 'Degrees (C)'
         * @param {Object} unitData
         */
        function insertDataType(unitData) {
            var scope = angular.element(document.getElementById("bdaSpatialCtrl")).scope();
            var thresholds = scope.getThresholdingParameters();
            for (var i=0; i<thresholds.length; i++) {
                if (unitData.hasOwnProperty(thresholds[i].name)) {
                    var key = thresholds[i].name;
                    unitData[key] = thresholds[i].type + (unitData[key] ? ' (' + unitData[key] + ')' : '');
                }
            }
        }
    };

    /**
     * Gets the overall threshold color property of a dynamic object.
     * And set the individual property color.
     * @param {Object} properties  The environment properties of a dynamic object
     * @param {Array} thresholds   The array of selected threshold values per threshold parameter
     * @return {ConstantProperty}
     */
    ChildController.prototype.getThresholdColor = function(properties, thresholds) {
        var red = new ConstantProperty(Color.RED);
        var green = new ConstantProperty(Color.GREEN);
        var yellow = new ConstantProperty(Color.YELLOW);
        var color = green;
        var determinedColor = false;

        for (var i=0; i<thresholds.length; i++) {
            if (properties.hasOwnProperty(thresholds[i].name)) {
                if (properties[thresholds[i].name] != null) {
                    var property = properties[thresholds[i].name];
                    var value = property.getValueString();
                    if (value == '') {
                        continue;   // Don't threshold if there is no value
                    }
                    var oldColor = property.color;
                    if (compareValues(thresholds[i].isFlipped,
                        value, parseFloat(thresholds[i].severe))) {
                        property.color = '#FF0000';
                        color = red;
                        determinedColor = true;
                    }
                    else if(compareValues(thresholds[i].isFlipped,
                        value, parseFloat(thresholds[i].marginal))) {
                        property.color =  '#FFFF00';
                        if (!determinedColor) {
                            color = yellow;
                        }
                    }
                    else {
                        property.color = '#00FF00';
                    }

                    if (property.color != oldColor) {
                        property.propertyChanged.raiseEvent(property, 'color', property.color, oldColor);
                    }
                }
            }
        }

        return color;

        /**
         * Compares 2 values based on the compare.
         * @param {boolean} lessThan
         * @param {number} value1
         * @param {number} value2
         * @return {boolean}
         */
        function compareValues(lessThan, value1, value2) {
            return lessThan ? value1 < value2 : value1 > value2;
        }
    };

    /**
     * Hides the progress bar UI.
     */
    ChildController.prototype.hideProgressBar = function() {
        var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
        scope.progressService.showProgressBar = false;
        scope.$apply();
    };

    /**
     * Hides the xy plot when hide is true; otherwise shows it.
     * @param {boolean} hide
     */
    ChildController.prototype.hideXyPlot = function(hide) {
        var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
        if (!hide && scope.toolbarService.showMinimizeXyPlot) {
            return; // plot is minimized, do nothing
        }

        scope.toolbarService.showXyPlot = !hide;
    };

    /**
     * Bumps the plot task counter by value passed in.
     * @param {number} value  either +1 or -1
     */
    ChildController.prototype.bumpMetarTafCounter = function(value) {
        var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
        scope.toolbarService.metar_taf_label = scope.toolbarService.metar_taf_label + value;
        if (scope.toolbarService.metar_taf_label < 0) {scope.toolbarService.metar_taf_label = 0;}
    };

    /**
     * Bumps the plot task counter by value passed in.
     * @param {number} value  either +1 or -1
     */
    ChildController.prototype.bumpPlotTasksCounter = function(value) {
        var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
        scope.toolbarService.plotTasks = scope.toolbarService.plotTasks + value;
        if (scope.toolbarService.plotTasks < 0) {scope.toolbarService.plotTasks = 0;}
    };

    /**
     * Bumps the thresholding task counter by value passed in.
     * @param {number} value  either +1 or -1
     */
    ChildController.prototype.bumpThresholdingTasksCounter = function(value) {
        var scope = angular.element(document.getElementById('bdaSpatialCtrl')).scope();
        scope.toolbarService.thresholdingTasks = scope.toolbarService.thresholdingTasks + value;
        if (scope.toolbarService.thresholdingTasks < 0) {scope.toolbarService.thresholdingTasks = 0;}
    };

    /**
     * Gets the DataSource by id.
     * @param {DataSourceCollection} dataSources
     * @param {String} id
     * @return {DataSource}
     */
    ChildController.prototype.getDataSourceById = function(dataSources, id) {
        var dataSource;
        for (var i=0; i<dataSources.length; i++) {
            var tmpDataSource = dataSources.get(i);
            if (defined(tmpDataSource.id) && tmpDataSource.id == id) {
                dataSource = tmpDataSource;
                break;
            }
        }

        return dataSource;
    };

    return ChildController;
});
