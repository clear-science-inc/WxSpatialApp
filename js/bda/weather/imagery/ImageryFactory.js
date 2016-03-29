/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

// Set up the cache imagery
angular.module('bdaSpatialApp').factory('imageryCache', function($cacheFactory) {
    return $cacheFactory('imageryData', { capacity: 10 });
});

angular.module('bdaSpatialApp').factory('imageryFactory', 
    function($http, $q, imageryCache, imageryService, progressService, weatherService) {
        
    var imageryFactory = {};
    
    /**
     * Gets the capabilities of the inputted url.
     * @param {String} url - url to wms service
     * @return [{{parameter: String, queryName: String, layerName: String}}]
     */
    imageryFactory.getImageryCapabilities = function(url) {
        
        var proxy = weatherService.proxy + '/proxy?url=';
        var proxyUrl = proxy + encodeURIComponent(url + '?service=wms&version=1.3.0&request=GetCapabilities');        
        var request = $http({method: 'GET', url: proxyUrl, cache: imageryCache});
        return request.then(handleSuccess, handleError);
    };
        
    /**
     * Handles a successful http request.
     * @param {Object} response
     * @return [{{parameter: String, queryName: String, layerName: String}}]
     */
    function handleSuccess(response) {
        var layers = parseCapabilities(response.data);
        return layers;
    }
    
    /**
     * Handles an error on http request. 
     * @param {Object} response
     * @return {String}
     */
    function handleError(response) {
 
        // The API response from the server should be returned in a
        // normalized format. However, if the request was not handled by the
        // server (or what not handles properly - ex. server error), then we
        // may have to normalize it on our end, as best we can.
        if (!angular.isObject(response.data) ||!response.data.message) {
            if (response.data) {
                return $q.reject(response.data);
            }
            return $q.reject( "An unknown error occurred." ); 
        }
 
        // Otherwise, use expected error message.
        return $q.reject(response.data.message); 
    }
                
    /**
     * Parses for capabilities for the given xml file. 
     * @param {Object} xml
     * @return [{{parameter: String, queryName: String, queryable: boolean, layerName: String}}]
     */
    function parseCapabilities(xml) {
        var layers = [];
        if (window.DOMParser)
        {
            var parser=new DOMParser();
            var xmlDoc=parser.parseFromString(xml,"text/xml");
        }
        else // Internet Explorer
        {
            xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async=false;
            xmlDoc.loadXML(txt);
        } 
        
        try {
            var titles = xmlDoc.getElementsByTagName('Title');
            var productTitle = titles.length > 0 ? titles[0].textContent : 'WMS Layers';
            var layerNodes = xmlDoc.getElementsByTagName('Layer');
            
            for (var i=0; i<layerNodes.length; i++) {
                try {
                var queryable = false;
                var value = layerNodes[i].getAttribute('queryable');
                if (value != null && value == '1') {
                    queryable = true;
                }
                var nameNode = layerNodes[i].getElementsByTagName('Name')[0];
                var queryName = nameNode.childNodes[0].nodeValue;
                var layerTitle = layerNodes[i].getElementsByTagName('Title')[0];
                layers.push({type: weatherService.ProductTypes.IMAGERY, 
                    parameter:productTitle,
                    queryName: queryName,
                    queryable: queryable,
                    layerName: (layerTitle ? (layerTitle.textContent + ':' + queryName) : queryName)});
                } catch (error) {
                    console.error('Error parsing layer within capabilities: ' + error);
                }
            }
        } catch (error) {
            console.error('Error parsing capabilities: ' + error);
        }
        
        return layers;
    }
    
    return imageryFactory;
});
