/**
 * Created by thomas on 9/01/14.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * (c) www.geocento.com
 * www.metaaps.com
 *
 */

/**
 * Modified by General Dynamics Information Technology (2014) from DrawHelper.js
 * to be its own AMD module.
 */

define([
    'Cesium/Core/defined',
    'Cesium/Core/Ellipsoid',    
    'Cesium/Core/PolylineGeometry',    
    'Cesium/Scene/EllipsoidSurfaceAppearance',   
    'DrawHelper/ChangeablePrimitive'
], function(
    defined,
    Ellipsoid,    
    PolylineGeometry,    
    EllipsoidSurfaceAppearance, 
    ChangeablePrimitive)
{
    "use strict";

    // constructor
    var PolylinePrimitive = function(options, defaultPolylineOptions) {    

        options = copyOptions(options, defaultPolylineOptions);

        this.initialiseOptions(options);

    };

    PolylinePrimitive.prototype = new ChangeablePrimitive();

    PolylinePrimitive.prototype.setPositions = function(positions) {
        this.setAttribute('positions', positions);
    };

    PolylinePrimitive.prototype.setWidth = function(width) {
        this.setAttribute('width', width);
    };

    PolylinePrimitive.prototype.setGeodesic = function(geodesic) {
        this.setAttribute('geodesic', geodesic);
    };

    PolylinePrimitive.prototype.getPositions = function() {
        return this.getAttribute('positions');
    };

    PolylinePrimitive.prototype.getWidth = function() {
        return this.getAttribute('width');
    };

    PolylinePrimitive.prototype.getGeodesic = function(geodesic) {
        return this.getAttribute('geodesic');
    };

    PolylinePrimitive.prototype.getGeometry = function() {
        
        if (!defined(this.positions) || this.positions.length < 2) {
            return;
        }

        return new PolylineGeometry({
                positions: this.positions,
                height : this.height,
                width: this.width < 1 ? 1 : this.width,
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                ellipsoid : this.ellipsoid
            });
    };
    
    return PolylinePrimitive;
});