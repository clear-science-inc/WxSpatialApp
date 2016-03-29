/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';


bdaSpatialApp.service('okModalService', function() {
    
    this.okTitle;
    this.okMessage;
});

/**
 * OK modal message box Angular controller.
 */
var okModalCtrl = function ($scope, $modalInstance, okModalService) {
    
    $scope.okModalService = okModalService;
    
    /**
     * Closes the dialog on OK.
     */
    $scope.ok = function () {
        $modalInstance.close();
    };
};