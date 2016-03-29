/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';


/**
 * Angular controller for BDA user preferences.
 */
bdaSpatialApp.controller('userPreferencesCtrl', function ($scope, toolbarService, userPreferencesService) {
    $scope.toolbarService = toolbarService;
    $scope.userPreferencesService = userPreferencesService;
    
    $scope.$watch('toolbarService.showUserPreferences', function(newVal, oldVal, scope) {
        if (newVal != oldVal && !newVal) {
            // Automatically save preferences when panel closes
            $scope.userPreferencesService.saveUserPreferences();
        }
    });
    
    $scope.$watch('userPreferencesService.showLayersPreferences', function(newVal, oldVal, scope) {
        if (newVal != oldVal && !newVal) {
            // Automatically save preferences when panel closes
            $scope.userPreferencesService.saveUserPreferences();
        }
    });
    
    $scope.$watch('userPreferencesService.showObsPreferences', function(newVal, oldVal, scope) {
        if (newVal != oldVal && !newVal) {
            // Automatically save preferences when panel closes
            $scope.userPreferencesService.saveUserPreferences();
        }
    });
});