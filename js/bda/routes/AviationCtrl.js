/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

/**
 * Aviation Angular controller for BDA spatial application.
 */
bdaSpatialApp.controller('aviationCtrl', function ($scope, progressService, toolbarService) {
    $scope.toolbarService = toolbarService;
    $scope.displayRoutesDemo = false;
    $scope.displayTrajectoryDemo = false;
    $scope.displaySatelliteDemo = false;
    $scope.displayInterpDemo = false;
    $scope.toggleTopDown = false;
    $scope.toggleSide = false;
    $scope.toggleAircraft = false;

    /** @const */ var FLIGHT_PROGRESS_MESSAGE = 'Retrieving Flight Data';

    /**
     * Toggle the aviation task.
     */
    $scope.toggleAviation = function(event) {
        var button = event.currentTarget;

        if ($scope.displayRoutesDemo || $scope.displayTrajectoryDemo) {
            progressService.showProgress(FLIGHT_PROGRESS_MESSAGE);

            // Show thresholding icon
            $scope.toolbarService.showMinimizeThresholding = true;
        }

        // Toggle button tooltip and decorations
        if (button.classList.contains('playing')) {
            button.classList.remove('playing');
            button.title = button.title.replace('End', 'Start');
        }
        else {
            button.title = button.title.replace('Start', 'End');
            button.classList.add('playing');

            // Show other demo as stopped
            var buttons = document.getElementsByClassName("bda-aviation-play-button");
            for (var i=0; i<buttons.length; i++) {
                if (buttons[i] != button) {
                    buttons[i].classList.remove('playing');
                    buttons[i].title = button.title.replace('End', 'Start');
                }
            }
        }
    };
});
