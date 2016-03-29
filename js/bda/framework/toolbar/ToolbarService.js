/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

bdaSpatialApp.service('toolbarService', function() {

    this.showActiveTasks = 0;
    this.showUserPreferences = false;
    this.showUtilAndTools = false;
    this.showAnalytics = false;
    this.showDrawingTools = false;
    this.showDrawHelperInputs = false;
    this.startPlaceMarker = false;
    this.showLatLon = false;
    this.thresholdingTasks = 0;
    this.showMinimizeThresholding = false;
    this.showManipulateLayers = false;
    this.showMinimizeManipulateLayers = false;
    this.latLonReadout = '';
    this.showWeather = false;
    this.openWeather = false;
    this.showAviation = false;
    this.openAviation = false;
    this.showSocial = false;
    this.openSocial = false;
    this.showXyPlot = false;
    this.plotTasks = 0;
    this.showMinimizeXyPlot = false;
    this.xyplotId = 'xyPlotContainer';
    this.metar_taf_label = 0;
    this.zoomTimeOne = false;
    this.flightCategory = false;

    /**
     * Minimizes the XY plot to a plot icon.
     */
    this.minimizeXyPlot = function() {
        this.showXyPlot = false;
        this.showMinimizeXyPlot = true;
    };

    /**
     * Restores XY plot to pane.
     */
    this.restoreXyPlot = function() {
        this.showXyPlot = true;
        this.showMinimizeXyPlot = false;
    };
});