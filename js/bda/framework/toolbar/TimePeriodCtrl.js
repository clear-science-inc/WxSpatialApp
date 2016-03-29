/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';


/**
 * Time Period Angular controller.
 */
bdaSpatialApp.controller('timePeriodCtrl', function ($scope, aoiToiService) {
    $scope.aoiToiService = aoiToiService;
    
    $scope.aoiToiService.calStartTime = $scope.aoiToiService.startTime;
    $scope.aoiToiService.calEndTime = $scope.aoiToiService.endTime;
    
    $scope.hstep = 1;
    $scope.mstep = 15;

    $scope.options = {
        hstep: [1, 2, 3],
        mstep: [1, 5, 10, 15, 25, 30]
    };
    
  
    $scope.dateOptions = {
        'year-format': "'yy'",
        'starting-day': 1
    };

    $scope.format = 'dd-MMMM-yyyy';

    /**
     * Toggles popup start calendar. 
     * @param {Object} $event
     */
    $scope.openStart = function($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.startOpened = !$scope.startOpened;
    };

    /**
     * Toggles popup end calendar. 
     * @param {Object} $event
     */
    $scope.openEnd = function($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.endOpened = !$scope.endOpened;
    };
});
