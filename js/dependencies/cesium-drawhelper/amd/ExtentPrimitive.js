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
    'Cesium/Core/DeveloperError',
    'Cesium/Core/Rectangle',
    'Cesium/Core/RectangleGeometry',
    'Cesium/Core/RectangleOutlineGeometry',    
    'Cesium/Core/Ellipsoid',    
    'Cesium/Scene/EllipsoidSurfaceAppearance',
    'DrawHelper/ChangeablePrimitive'
], function(
    defined,
    DeveloperError,
    Rectangle,
    RectangleGeometry,
    RectangleOutlineGeometry,    
    Ellipsoid,    
    EllipsoidSurfaceAppearance,
    ChangeablePrimitive)
{
    "use strict";

    // constructor
    var ExtentPrimitive = function(options, defaultSurfaceOptions) {
        if(!defined(options.extent)) {
            throw new DeveloperError('Extent is required');
        }

        options = copyOptions(options, defaultSurfaceOptions);

        this.initialiseOptions(options);

        this.setExtent(options.extent);

    };

    ExtentPrimitive.prototype = new ChangeablePrimitive();

    ExtentPrimitive.prototype.setExtent = function(extent) {
        this.setAttribute('extent', extent);
    };

    ExtentPrimitive.prototype.getExtent = function() {
        return this.getAttribute('extent');
    };

    ExtentPrimitive.prototype.getGeometry = function() {

        if (!defined(this.extent)) {
            return;
        }

        return new RectangleGeometry({
            rectangle : this.extent,
            height : this.height,
            vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            stRotation : this.textureRotationAngle,
            ellipsoid : this.ellipsoid,
            granularity : this.granularity
        });
    };

    ExtentPrimitive.prototype.getOutlineGeometry = function() {
        return new RectangleOutlineGeometry({
            rectangle: this.extent
        });
    };

    return ExtentPrimitive;
});
    
