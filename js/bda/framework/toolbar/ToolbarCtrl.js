/**
 * Copyright 2014 General Dynamics Information Technology.
 */
'use strict';


/**
 * Angular controller for BDA toolbar.
 */
bdaSpatialApp.controller('toolbarCtrl', function ($scope, toolbarService, userPreferencesService) {
    $scope.toolbarService = toolbarService;
    $scope.userPreferencesService = userPreferencesService;

    $scope.$watch('toolbarService.plotTasks', function(newVal, oldVal, scope) {
	    if (newVal != oldVal) {
	        if (newVal == 0) {
	        	// When there are no more plot tasks, make sure the minimized xy plot icon is hidden
       			$scope.toolbarService.showMinimizeXyPlot = false;
	        }
	    }
	});
});
