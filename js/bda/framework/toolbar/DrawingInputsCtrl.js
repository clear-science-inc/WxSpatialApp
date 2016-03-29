/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';


/**
 * Angular controller for drawing inputs pane.
 */
bdaSpatialApp.controller('drawingInputsCtrl', function ($scope) {
    /** @const */ var DEFAULT_COLOR = '#4169E1';
    /** @const */ var DEFAULT_OPACITY = 100;
    
    $scope.temporaryName;
    $scope.temporaryColor = DEFAULT_COLOR;
    $scope.temporaryOpacity = DEFAULT_OPACITY;
    
    $scope.name;
    $scope.color = DEFAULT_COLOR;
    $scope.opacity = DEFAULT_OPACITY;
       
    /**
     * Reset the temporary parameters. 
     */
    var resetTemporary = function() {
        $scope.temporaryName = '';
        $scope.temporaryColor = DEFAULT_COLOR;
        $scope.temporaryOpacity = DEFAULT_OPACITY;
    };
    
    /**
     * OK input handler. 
     */
    $scope.ok = function() {
        $scope.name = $scope.temporaryName;
        $scope.color = $scope.temporaryColor;
        $scope.opacity = $scope.temporaryOpacity;
        resetTemporary();
    };
    
    /** 
     * Cancel input handler. 
     */
    $scope.cancel = function() {
        $scope.name = '';
        $scope.color = DEFAULT_COLOR;
        $scope.opacity = DEFAULT_OPACITY;
        resetTemporary();
    };
});