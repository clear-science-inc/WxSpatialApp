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
    'Cesium/Core/EllipseGeometry',    
    'DrawHelper/ChangeablePrimitive'
], function(
    defined,
    DeveloperError,
    EllipseGeometry,        
    ChangeablePrimitive)
{
    "use strict";
    
    // constructor
    var EllipsePrimitive = function(options) {
        if(!(defined(options.center) && defined(options.semiMajorAxis) && defined(options.semiMinorAxis))) {
            throw new DeveloperError('Center and semi major and semi minor axis are required');
        }

        options = copyOptions(options, defaultEllipseOptions);

        this.initialiseOptions(options);

    }

    EllipsePrimitive.prototype = new ChangeablePrimitive();

    EllipsePrimitive.prototype.setCenter = function(center) {
        this.setAttribute('center', center);
    };

    EllipsePrimitive.prototype.setSemiMajorAxis = function(semiMajorAxis) {
        if(semiMajorAxis < this.getSemiMinorAxis()) return;
        this.setAttribute('semiMajorAxis', semiMajorAxis);
    };

    EllipsePrimitive.prototype.setSemiMinorAxis = function(semiMinorAxis) {
        if(semiMinorAxis > this.getSemiMajorAxis()) return;
        this.setAttribute('semiMinorAxis', semiMinorAxis);
    };

    EllipsePrimitive.prototype.setRotation = function(rotation) {
        return this.setAttribute('rotation', rotation);
    };

    EllipsePrimitive.prototype.getCenter = function() {
        return this.getAttribute('center');
    };

    EllipsePrimitive.prototype.getSemiMajorAxis = function() {
        return this.getAttribute('semiMajorAxis');
    };

    EllipsePrimitive.prototype.getSemiMinorAxis = function() {
        return this.getAttribute('semiMinorAxis');
    };

    EllipsePrimitive.prototype.getRotation = function() {
        return this.getAttribute('rotation');
    };

    EllipsePrimitive.prototype.getGeometry = function() {

        if(!(defined(this.center) && defined(this.semiMajorAxis) && defined(this.semiMinorAxis))) {
            return;
        }

        return new EllipseGeometry({
                    ellipsoid : this.ellipsoid,
                    center : this.center,
                    semiMajorAxis : this.semiMajorAxis,
                    semiMinorAxis : this.semiMinorAxis,
                    rotation : this.rotation,
                    height : this.height,
                    vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    stRotation : this.textureRotationAngle,
                    granularity : this.granularity
                });
    };

    EllipsePrimitive.prototype.getOutlineGeometry = function() {
        return new EllipseOutlineGeometry({
            center: this.getCenter(),
            semiMajorAxis: this.getSemiMajorAxis(),
            semiMinorAxis: this.getSemiMinorAxis(),
            rotation: this.getRotation()
        });
    }

    return EllipsePrimitive;
});
