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
    'Cesium/Core/CircleGeometry',
    'Cesium/Core/CircleOutlineGeometry',
    'Cesium/Core/defined',
    'Cesium/Core/DeveloperError',    
    'Cesium/Scene/EllipsoidSurfaceAppearance',
    'DrawHelper/ChangeablePrimitive'
], function(
    CircleGeometry,
    CircleOutlineGeometry,
    defined,
    DeveloperError,
    EllipsoidSurfaceAppearance,
    ChangeablePrimitive)
{
    "use strict";

    // constructor
    var CirclePrimitive = function(options, defaultSurfaceOptions) {
        
        if(!(defined(options.center) && defined(options.radius))) {
            throw new DeveloperError('Center and radius are required');
        }

        options = copyOptions(options, defaultSurfaceOptions);

        this.initialiseOptions(options);

        this.setRadius(options.radius);

    }

    CirclePrimitive.prototype = new ChangeablePrimitive();

    CirclePrimitive.prototype.setCenter = function(center) {
        this.setAttribute('center', center);
    };

    CirclePrimitive.prototype.setRadius = function(radius) {
        this.setAttribute('radius', Math.max(0.1, radius));
    };

    CirclePrimitive.prototype.getCenter = function() {
        return this.getAttribute('center');
    };

    CirclePrimitive.prototype.getRadius = function() {
        return this.getAttribute('radius');
    };

    CirclePrimitive.prototype.getGeometry = function() {

        if (!(defined(this.center) && defined(this.radius))) {
            return;
        }

        return new CircleGeometry({
            center : this.center,
            radius : this.radius,
            height : this.height,
            vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            stRotation : this.textureRotationAngle,
            ellipsoid : this.ellipsoid,
            granularity : this.granularity
        });
    };

    CirclePrimitive.prototype.getOutlineGeometry = function() {
        return new CircleOutlineGeometry({
            center: this.getCenter(),
            radius: this.getRadius()
        });
    }

    return CirclePrimitive;
});