/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';


/**
 * Angular controller for a layer view.
 */
bdaSpatialApp.controller('manipulateLayersCtrl', function ($scope, /*$location, $anchorScroll,*/ weatherService) {
    
    // The following constants should match the parameter name coming out of the websocket service
    /** @const */ var TEMPERATURE_NAME = 'TMP';
    /** @const */ var PRESSURE_NAME = 'PRES';
    /** @const */ var RH_NAME = 'RH';
    /** @const */ var VISIBILITY_NAME = 'Visibility';
    
    // Array of user requested layers
    // [{layerName:String, opacity: number, enabled:boolean, id: String}]
    $scope.layers = [];
    
    $scope.showLegends = [];
    $scope.legends = [ { parameter: TEMPERATURE_NAME, image: "resources/images/temperatureScale.svg"},
                       { parameter: RH_NAME, image: "resources/images/relHumidityScale.svg"},
                       { parameter: VISIBILITY_NAME, image: "resources/images/visibilityScale.svg"},
                       { parameter: PRESSURE_NAME, image: "resources/images/pressureScale.svg"}];

    $scope.weatherService = weatherService;
    
    // Map events
    $scope.raisedLayer;
    $scope.loweredLayer;
    $scope.changedOpacity;
    $scope.enabledLayer;
    $scope.disabledLayer;
    
    // DeletedLayer event can come from delete button on manipulate layers
    // panel or by deleting layer from Weather Products panel
    $scope.$watch('weatherService.deletedLayer', deleteLayer);
    $scope.$watch('weatherService.errorLayer', deleteLayer);
    
    /**
     * Deletes a layer from Manipulate Layers panel.
     * @param {String} newVal id of layer to be deleted
     * @param {String} oldVal 
     * @param {Object} scope
     */
    function deleteLayer(newVal, oldVal, scope) {
        if (newVal !== undefined) {
            var layer;
            for (var i=0; i<scope.layers.length; i++) {
                if (scope.layers[i].id == newVal.id) {
                    layer = scope.layers[i];
                    break;
                }
            }
            
            if (layer !== undefined) {
                var index = scope.layers.indexOf(layer);
                scope.layers.splice(index, 1);
                
                if (scope.layers.length == 0) {
                    scope.toolbarService.showManipulateLayers = false;
                    scope.toolbarService.showMinimizeManipulateLayers = false;            
                }            
            }
            else {
                console.warn("ManipulateLayers: Cannot delete layer " + newVal.id + " out of sync, not in treeview");
            }
        }
    };
    
    $scope.enableLayer = function(layer) {
        if (layer.enabled) {
            $scope.enabledLayer = layer;
            $scope.disabledLayer = null;
        }
        else {
            $scope.disabledLayer = layer;
            $scope.enabledLayer = null;
        }
    };
    
    $scope.deleteLayer = function(layer) {
        // Tell map to delete layer
        $scope.weatherService.deletedLayer = layer;
    };
    
    $scope.raiseLayer = function(layer) {
        if ($scope.raisedLayer == layer) {
            $scope.raisedLayer = undefined;    // Clear out event
            $scope.$apply();
        }
        $scope.raisedLayer = layer;
        
        // Raise layer in array of layers
        var indexToSwap = $scope.layers.indexOf(layer);
        $scope.layers.splice(indexToSwap -1,2,$scope.layers[indexToSwap],$scope.layers[indexToSwap -1]);
    };
    
    $scope.lowerLayer = function(layer) {
        // Tell map to lower layer        
        if ($scope.loweredLayer == layer) {
            $scope.loweredLayer = undefined;    // Clear out event
            $scope.$apply();
        }
        $scope.loweredLayer = layer;
        
        // Lower layer in array of layers
        var indexToSwap = $scope.layers.indexOf(layer);
        $scope.layers.splice(indexToSwap,2,$scope.layers[indexToSwap+1],$scope.layers[indexToSwap]);
    };
    
    $scope.changeOpacity = function(layer) {
        $scope.changedOpacity = layer;
    };
    
    /**
     * 
     * @param {Object} layerName
     * @param {Object} id
     * @param {Object} opacity
     * @param {boolean} [animated = false]  true if represents a group of time animated layers
     */
    $scope.addLayer = function(layerName, id, opacity, animated) {
        // Add layer to front of layers array
        $scope.layers.unshift({layerName: layerName, id: id, opacity:opacity, animated: animated, enabled: true });
        
        // Check if need legend for layer, for now: show them all
        var legend;
        for (var i=0; i<$scope.legends.length; i++) {
            if (layerName.indexOf($scope.legends[i].parameter) >= 0) {
                legend = $scope.legends[i];
                break;
            }
        }
        
        if (legend) {
            if ($scope.showLegends.indexOf(legend) == -1) {
                $scope.showLegends.push(legend);
            }
            
            // FIXME: scroll to legend of new layer in legends panel
            // $location.hash(legend.image);
            // $anchorScroll();
        }
         
    };

});
