/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';


/**
 * Main Angular controller for BDA spatial application.
 */
bdaSpatialApp.controller('bdaSpatialCtrl', function ($scope, $modal, $element, $compile, 
    thresholdingService, progressService, toolbarService, okModalService) {

    $scope.thresholdingService = thresholdingService;
    $scope.progressService = progressService;
    $scope.toolbarService = toolbarService;
    $scope.okModalService = okModalService;

    /**
     * Gets the thresholding parameters.
     * @return {Array}
     */
    $scope.getThresholdingParameters = function() {
        return $scope.thresholdingService.thresholdingParameters;
    };
    
    /**
     * Opens a modal dialog. 
     * @param {Object} ctrl  The angular controller to associate with modal dialog.
     * @param {String} url   template url content of modal dialog
     */
    $scope.openModal = function(ctrl, url) {

        var modalInstance = $modal.open({
            templateUrl: url,
            controller: ctrl
        });

        modalInstance.result.then(function() {
        }, function () {
            // Dialog closed
        });
    };
    
    /**
     * Shows the OK model dialog.
     * @param {String} title
     * @param {String} message 
     */
    $scope.showOkModalMessage = function(title, message) {
        $scope.okModalService.okTitle = title;
        $scope.okModalService.okMessage = message;
        $scope.openModal(okModalCtrl, 'views/okModalMessage.html');
    };
    
    /**
     * Creates and adds a floating pane into the DOM.
     * @param {String} title
     * @param {String} id
     * @param {String} paneClass
     */
    $scope.addFloatingPane = function(title, id, paneClass) {
        var template = '<div data-bda-floating-pane="true" data-pane-id="' + id
            + '" data-pane-title="'+title + '" ng-transclude'
            + ' data-pane-class='+paneClass
            + ' data-pane-close=true></div>';

        // Create an angular element. (this is still the "view")
        var floatingPaneElement = angular.element(template);
    
        // Compile the view into a function.
        var compiled = $compile(floatingPaneElement);
        
        $element.append(floatingPaneElement); 
        var compiledScope = compiled($scope);    
               
        return compiledScope[0].childNodes[0];
    };

});

