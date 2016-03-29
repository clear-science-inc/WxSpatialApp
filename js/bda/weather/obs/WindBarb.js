/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Cesium/Core/Math'  
], function(CesiumMath) {
    
   "use strict";
    
    var WindBarb = {};


    /**
     * Look up the image file name based on wind speed, direction, and hemisphere. 
     * @param {Object}  envProperties
     * @param {boolean} isNorthernHemisphere
     */
    WindBarb.lookupImage = function(envProperties, isNorthernHemisphere) {
        if (window.chrome) {
            return lookupPngImage(envProperties, isNorthernHemisphere);
        }
        else {
            return lookupSvgImage(envProperties, isNorthernHemisphere);
        }
    
        /**
         * Look up the svg image file name based on wind speed, direction, and hemisphere. 
         * @param {Object}  envProperties
         * @param {boolean} isNorthernHemisphere
         */
        function lookupSvgImage(envProperties, isNorthernHemisphere) {
    
            var image = 'resources/icons/Converted_WMO_Symbols/WeatherSymbol_WMO_WindArrowMissing_99.svg';
            var hemisphere = isNorthernHemisphere ? 'NH' : 'SH';
            
            try {
                if (envProperties.hasOwnProperty('windSpeed')) {
                    var windSpeed = parseFloat(envProperties['windSpeed'].value);                
                    if (!isNaN(windSpeed)) {
                        var index = Math.floor(windSpeed / 5);
                        if (index == 0) {
                            image = 'resources/icons/calmWind.svg';
                        }
                        else {
                            image = 'resources/icons/Converted_WMO_Symbols/WeatherSymbol_WMO_WindArrow' + hemisphere + '_';
                            if (index < 10) {
                                image = image + '0';
                            }
                            image = image + index + '.svg';
                        }
                    }
                }
            
            } catch (ex) {
                console.error('error reading envProperties for windSpeed' + ex);
            }
            
            return image;
        }
        
        /**
         * Look up the png image file name based on wind speed, direction, and hemisphere. 
         * @param {Object}  envProperties
         * @param {boolean} isNorthernHemisphere
         */
        // TODO: hopefully this can go away if Cesium fixes svg for chrome
        function lookupPngImage(envProperties, isNorthernHemisphere) {
    
            var image = 'resources/icons/WorldWeatherSymbols-png/WeatherSymbol_WMO_WindArrowMissing_99.png';
            var hemisphere = isNorthernHemisphere ? 'NH' : 'SH';
            
            try {
                if (envProperties.hasOwnProperty('windSpeed')) {
                    var windSpeed = parseFloat(envProperties['windSpeed'].value);                
                    if (!isNaN(windSpeed)) {
                        var index = Math.floor(windSpeed / 5);
                        if (index == 0) {
                            image = 'resources/icons/calmWind.png';
                        }
                        else {
                            image = 'resources/icons/WorldWeatherSymbols-png/WeatherSymbol_WMO_WindArrow' + hemisphere + '_';
                            if (index < 10) {
                                image = image + '0';
                            }
                            image = image + index + '.png';
                        }
                    }
                }
            
            } catch (ex) {
                console.error('error reading envProperties for windSpeed' + ex);
            }
            return image;
        }   
    };
    
    /**
     * Calculates the wind direction in Radians.
     * @param {Object}  envProperties
     * @param {boolean} isNorthernHemisphere
     */
    WindBarb.getWindDirInRadians = function(envProperties, isNorthernHemisphere) {
        var windDir = 0;
        try {
            if (envProperties.hasOwnProperty('windDirection')) {   
                // wind barb is not drawn at zero degrees             
                var rotateToZero = isNorthernHemisphere ? 270 : 90;
                windDir = CesiumMath.toRadians(rotateToZero - parseFloat(envProperties['windDirection'].value));  
            }              
        } catch (ex) {
            console.error('error reading envProperties for windDirection' + ex);
        }
        
        return windDir;        
    };
    
    return WindBarb;
});