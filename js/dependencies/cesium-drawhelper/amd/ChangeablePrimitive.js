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
    'Cesium/Core/ColorGeometryInstanceAttribute',
    'Cesium/Core/defined',
    'Cesium/Core/destroyObject',    
    'Cesium/Core/DeveloperError',
    'Cesium/Core/Ellipsoid',    
    'Cesium/Core/GeometryInstance',
    'Cesium/Scene/PerInstanceColorAppearance',
    'Cesium/Scene/Primitive'
], function(
    ColorGeometryInstanceAttribute,
    defined,
    destroyObject, 
    DeveloperError, 
    Ellipsoid,    
    GeometryInstance,
    PerInstanceColorAppearance,   
    Primitive)
{
    "use strict";
    
    // constructor
    var ChangeablePrimitive = function() {
    };

    ChangeablePrimitive.prototype.initialiseOptions = function(options) {

        fillOptions(this, options);

        this._ellipsoid = undefined;
        this._granularity = undefined;
        this._height = undefined;
        this._textureRotationAngle = undefined;
        this._id = undefined;

        // set the flags to initiate a first drawing
        this._createPrimitive = true;
        this._primitive = undefined;
        this._outlinePolygon = undefined;

        // tag it as a drawing primitive
        this.tag = "DRAWHELPER";

    }

    ChangeablePrimitive.prototype.setAttribute = function(name, value) {
        this[name] = value;
        this._createPrimitive = true;
    };

    ChangeablePrimitive.prototype.getAttribute = function(name) {
        return this[name];
    };

        
    /**
     * Associates a label with this primitive.
     * @param {Label} label
     */
    ChangeablePrimitive.prototype.setLabel = function(label) {
        this._label = label;
    };
        
    /**
     * @private
     */
    ChangeablePrimitive.prototype.update = function(context, frameState, commandList) {

        if (!defined(this.ellipsoid)) {
            throw new DeveloperError('this.ellipsoid must be defined.');
        }

        if (!defined(this.appearance)) {
            throw new DeveloperError('this.material must be defined.');
        }

        if (this.granularity < 0.0) {
            throw new DeveloperError('this.granularity and scene2D/scene3D overrides must be greater than zero.');
        }

        if (!this.show) {
            return;
        }

        if (!this._createPrimitive && (!defined(this._primitive))) {
            // No positions/hierarchy to draw
            return;
        }

        if (this._createPrimitive ||
            (this._ellipsoid !== this.ellipsoid) ||
            (this._granularity !== this.granularity) ||
            (this._height !== this.height) ||
            (this._textureRotationAngle !== this.textureRotationAngle) ||
            (this._id !== this.id)) {

            var geometry = this.getGeometry();
            if(!geometry) {
                return;
            }

            this._createPrimitive = false;
            this._ellipsoid = this.ellipsoid;
            this._granularity = this.granularity;
            this._height = this.height;
            this._textureRotationAngle = this.textureRotationAngle;
            this._id = this.id;

            this._primitive = this._primitive && this._primitive.destroy();

            this._primitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    geometry : geometry,
                    id : this.id,
                    pickPrimitive : this
                }),
                appearance : this.appearance,
                asynchronous : this.asynchronous
            });

            this._outlinePolygon = this._outlinePolygon && this._outlinePolygon.destroy();
            if(this.strokeColor && this.getOutlineGeometry) {
                // create the highlighting frame
                this._outlinePolygon = new Primitive({
                    geometryInstances : new GeometryInstance({
                        geometry : this.getOutlineGeometry(),
                        attributes : {
                            color : ColorGeometryInstanceAttribute.fromColor(this.strokeColor)
                        }
                    }),
                    appearance : new PerInstanceColorAppearance({
                        flat : true,
                        renderState : {
                            depthTest : {
                                enabled : true
                            },
                            lineWidth : Math.min(this.strokeWidth || 4.0, context._aliasedLineWidthRange[1])
                        }
                    })
                });
            }
        }

        var primitive = this._primitive;
        primitive.appearance.material = this.material;
        primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
        primitive.update(context, frameState, commandList);
        this._outlinePolygon && this._outlinePolygon.update(context, frameState, commandList);

    };

    ChangeablePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    ChangeablePrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    ChangeablePrimitive.prototype.setStrokeStyle = function(strokeColor, strokeWidth) {
        if(!this.strokeColor || !this.strokeColor.equals(strokeColor) || this.strokeWidth != strokeWidth) {
            this._createPrimitive = true;
            this.strokeColor = strokeColor;
            this.strokeWidth = strokeWidth;
        }
    };

    return ChangeablePrimitive;
});
