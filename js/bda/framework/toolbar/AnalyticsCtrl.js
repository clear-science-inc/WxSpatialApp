/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';


/**
 * Analytics Angular controller for BDA spatial application.
 */
bdaSpatialApp.controller('analyticsCtrl', function ($scope, toolbarService) {
    $scope.toolbarService = toolbarService;
    
    /** @const */ var SELECT_FLIGHT_PATH_DEMO_TITLE = 'Flight Path Demo';
    
    $scope.aviationButtonTitle = SELECT_FLIGHT_PATH_DEMO_TITLE;
    
    /**
     * Toggles the weather task in/out of the active tasks list. 
     */
    $scope.toggleWeather = function() {
        $scope.toolbarService.showAnalytics = false;
        $scope.toolbarService.showWeather = !$scope.toolbarService.showWeather;
        if ($scope.toolbarService.showWeather) {
            $scope.toolbarService.showActiveTasks++;
            $scope.toolbarService.openWeather = true;
        }
        else {
            $scope.toolbarService.showActiveTasks--;            
        }
     };
    
    /**
     * Toggles the aviation task in/out of the active tasks list. 
     */
    $scope.toggleAviation = function() {
        $scope.toolbarService.showAnalytics = false;
        $scope.toolbarService.showAviation = !$scope.toolbarService.showAviation;
        if ($scope.toolbarService.showAviation) {
            $scope.toolbarService.showActiveTasks++;
            $scope.toolbarService.openAviation = true;
        }
        else {
            $scope.toolbarService.showActiveTasks--;
        }
     };
     
    /**
     * Toggles the social media task in/out of the active tasks list.
     */
    $scope.toggleSocial = function() {
        $scope.toolbarService.showAnalytics = false;
        $scope.toolbarService.showSocial = !$scope.toolbarService.showSocial;
        if ($scope.toolbarService.showSocial) {
            $scope.toolbarService.showActiveTasks++;
            $scope.toolbarService.openSocial = true;
        }
        else {
            $scope.toolbarService.showActiveTasks--;            
        }        
    };
});

