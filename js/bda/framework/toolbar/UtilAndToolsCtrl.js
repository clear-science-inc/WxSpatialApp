/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';


/**
 * Angular controller for Utilities & Tools menu.
 */
bdaSpatialApp.controller('utilAndToolsCtrl', function ($scope, toolbarService, aoiToiService, distanceService) {
    $scope.aoiToiService = aoiToiService;
    $scope.toolbarService = toolbarService;
    $scope.distanceService = distanceService;
    $scope.showAoiMenu = false;
    $scope.showTimeMenu = false;
    $scope.showSearch = false;
    $scope.showMapView = false;
    $scope.showMapBaseLayer = false;
    $scope.showDistance = false;
    $scope.drawing = false;
        
    /**
     * Toggle the lat/lon readout on map. 
     */
    $scope.toggleLatLon = function() {
        $scope.toolbarService.showLatLon = !$scope.toolbarService.showLatLon;
    };
    
    /**
     * Toggle the Cesium map base layer picker. 
     */
    $scope.toggleMapBaseLayer = function() {
        $scope.showMapBaseLayer = !$scope.showMapBaseLayer;
        var baseLayerPicker = angular.element(document.getElementsByClassName("cesium-baseLayerPicker-selected"))[0];
        baseLayerPicker.style.visibility = $scope.showMapBaseLayer ? 'visible': 'hidden';
        if ($scope.showMapBaseLayer) {
            // click on button to display dropdown
            baseLayerPicker.click();
        }
    };
    
    /**
     * Toggle the Cesium map view picker. 
     */
    $scope.toggleMapView = function() {
        $scope.showMapView = !$scope.showMapView;
        var mapViewContainer = angular.element(document.getElementsByClassName("cesium-sceneModePicker-wrapper"))[0];
        mapViewContainer.style.visibility = $scope.showMapView ? 'visible': 'hidden';
        if ($scope.showMapView) {
            // click on button to display dropdown
            mapViewContainer.firstChild.click();
        }
    };
    
    /**
     * Sets the area of interest with the selected aoi (this). 
     */
    $scope.setAoi = function() {
        if (this.aoi.label.indexOf('Draw AOI') >= 0) {
            $scope.aoiToiService.toggledDrawAoi = !$scope.aoiToiService.toggledDrawAoi;            
        }
        else {
            $scope.aoiToiService.areaOfInterest = this.aoi.aoi;
        }
        $scope.aoiToiService.selectedAoi = this.aoi;
        $scope.showAoiMenu = false;
    };
    
   /**
     * Gets the area of interest.
     * @return {string} 
     */
    $scope.getAreaOfInterest = function() {
        return $scope.aoiToiService.areaOfInterest;
    };
    
    
   /**
     * Gets the area of interest.
     * @return {string} 
     */
    $scope.getAreaOfInterestObject = function() {
        var aoi = $scope.aoiToiService.areaOfInterest.split(',');
        return { north: aoi[3], east: aoi[2], south: aoi[1], west: aoi[0]};
    };
    
    /**
     * Sets the time period with the selected time period (this).
     */
    $scope.setTimePeriod = function() {
        if (this.timePeriod.label.indexOf('Define TOI') >= 0) {
            $scope.openTimePeriodModal();
        }
        else {
            $scope.aoiToiService.selectedTimePeriod = this.timePeriod;
            $scope.aoiToiService.updateStartAndEndTime();
        }
        
        $scope.showTimeMenu = false;
    };

    /**
     * Gets the start time formatted as an ISO 8601 date time string.
     * @return {string} 
     */
    $scope.getStartTimeString = function() {
        return $scope.aoiToiService.startTime.toISOString();
    };
    
    /**
     * Gets the start time formatted as an ISO 8601 date time string.
     * @return {string} 
     */
    $scope.getEndTimeString = function() {
        return $scope.aoiToiService.endTime.toISOString();            
    };
    
    
    /**
     * Watches for scope changes on distance unit and updates the distance
     * value.
     * @param {{label: String, conversion: number}} newVal
     * @param {{label: String, conversion: number}} oldVal
     */
    $scope.$watch('distanceService.unit', function (newVal, oldVal, scope) {
        if (newVal) { 
            distanceService.updateDistance();
        }
    });

    /**
     * Opens a modal dialog for time period. 
     */
    $scope.openTimePeriodModal = function() {
        
        $scope.openModal(timePeriodInstanceCtrl, 'views/timePeriod.html');
    };
});

