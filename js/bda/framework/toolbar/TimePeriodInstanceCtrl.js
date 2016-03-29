/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';


/**
 * Angular controller for a Time Period modal instance.
 */

var timePeriodInstanceCtrl = function ($scope, $modalInstance, aoiToiService) {
    $scope.aoiToiService = aoiToiService;

    /**
     * Processes the OK button. Updates the time period with the selected
     * start and end times. 
     */
    $scope.ok = function () {
        $modalInstance.close();
        $scope.aoiToiService.startTime = $scope.aoiToiService.calStartTime;
        $scope.aoiToiService.endTime = $scope.aoiToiService.calEndTime;
        $scope.aoiToiService.selectedTimePeriod = $scope.aoiToiService.timePeriods[$scope.aoiToiService.timePeriods.length - 1];
    };

    /**
     * Processes the cancel button. Times do not get updated. 
     */
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
    
};