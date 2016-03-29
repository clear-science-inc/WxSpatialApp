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
    'Cesium/Core/PolygonGeometry',
    'Cesium/Core/PolygonOutlineGeometry',
    'Cesium/Scene/EllipsoidSurfaceAppearance',
    'DrawHelper/ChangeablePrimitive'
], function(
    defined,
    PolygonGeometry,
    PolygonOutlineGeometry,
    EllipsoidSurfaceAppearance,
    ChangeablePrimitive)
{
    "use strict";

    // constructor
    var PolygonPrimitive = function(options, defaultSurfaceOptions) {
        options = copyOptions(options, defaultSurfaceOptions);

        this.initialiseOptions(options);

        this.isPolygon = true;
    };

    PolygonPrimitive.prototype = new ChangeablePrimitive();

    PolygonPrimitive.prototype.setPositions = function(positions) {
        this.setAttribute('positions', positions);
    };

    PolygonPrimitive.prototype.getPositions = function() {
        return this.getAttribute('positions');
    };

    PolygonPrimitive.prototype.getGeometry = function() {

        if (!defined(this.positions) || this.positions.length < 3) {
            return;
        }

        return PolygonGeometry.fromPositions({
            positions : this.positions,
            height : this.height,
            vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            stRotation : this.textureRotationAngle,
            ellipsoid : this.ellipsoid,
            granularity : this.granularity
        });
    };

    PolygonPrimitive.prototype.getOutlineGeometry = function() {
        return PolygonOutlineGeometry.fromPositions({
            positions : this.getPositions()
        });
    };

    return PolygonPrimitive;
    
});
