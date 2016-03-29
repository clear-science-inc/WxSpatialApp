/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

/**
 * Angular factory for properties.
 */

// Set up the imagery cache.
angular.module('bdaSpatialApp').factory('propertyCache', function($cacheFactory) {
    return $cacheFactory('propertyData', { capacity: 1 });
});

bdaSpatialApp.factory('propertiesFactory', function($http, propertyCache) { 

    return {
        getProperties: function() {
            return $http({method: 'GET', url: 'resources/data/properties.json', cache: propertyCache});
        }
    };
});