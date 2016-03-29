/**
 * Copyright 2014 General Dynamics Information Technology.
 */

define([
    'Cesium/Core/Cartographic',
    'Cesium/Core/defined',
    'Cesium/Core/EventHelper',
    'Cesium/Core/Rectangle',
    'Cesium/Core/Math',
    'Cesium/Core/ScreenSpaceEventHandler',
    'Cesium/Core/ScreenSpaceEventType',
    'Cesium/Scene/Billboard',
    'Cesium/Scene/CameraFlightPath',
    'Cesium/Scene/RectanglePrimitive',
    'Cesium/Scene/HorizontalOrigin',
    'Cesium/Scene/LabelCollection',
    'Cesium/Scene/SceneMode'
], function(
    Cartographic,
    defined,
    EventHelper,
    Rectangle,
    CesiumMath,
    ScreenSpaceEventHandler, 
    ScreenSpaceEventType,
    Billboard,
    CameraFlightPath,
    RectanglePrimitive,
    HorizontalOrigin,
    LabelCollection,
    SceneMode
)
{
    "use strict";

    /**
     * Constructor for user interaction for drawing rectangle on map.
     * @constructor
     * @param {Scene} scene
     * @param {function} handler
     */
    var DrawRectangle = function(scene, handler) {
        this._canvas = scene.canvas;
        this._scene = scene;
        this._ellipsoid = scene.globe._ellipsoid;

        this._finishHandler = handler;
        this._mouseHandler = new ScreenSpaceEventHandler(this._canvas);
        this._rectanglePrimitive = new RectanglePrimitive();
        this._rectanglePrimitive.asynchronous = false;
        this._scene.primitives.add(this._rectanglePrimitive);
    };

    /**
     * Starts the enable rectangle.
     */
    DrawRectangle.prototype.enableInput = function() {
        var controller = this._scene.screenSpaceCameraController;
        controller.enableInputs = true;
    };

    /**
     * Stops the rectangle.
     */
    DrawRectangle.prototype.disableInput = function() {
        var controller = this._scene.screenSpaceCameraController;
        controller.enableInputs = false;
    };

    /**
     * Gets the rectangle.
     * @param {Cartographic} mn
     * @param {Cartographic} mx
     */
    DrawRectangle.prototype.getRectangle = function(mn, mx) {
        var rectangle = new Rectangle();
        
        try {
            // Re-order so west < east and south < north
            rectangle.west = Math.min(mn.longitude, mx.longitude);
            rectangle.east = Math.max(mn.longitude, mx.longitude);
            rectangle.south = Math.min(mn.latitude, mx.latitude);
            rectangle.north = Math.max(mn.latitude, mx.latitude);
    
            // Check for approx equal (shouldn't require abs due to re-order)
            var epsilon = CesiumMath.EPSILON7;
    
            if ((rectangle.east - rectangle.west) < epsilon) {
                rectangle.east += epsilon * 2.0;
            }
    
            if ((rectangle.north - rectangle.south) < epsilon) {
                rectangle.north += epsilon * 2.0;
            }
        } catch (ex) {
            console.error('error: ' + ex);
        }
        return rectangle;
    };

    /**
     * Sets the rectangle points.
     * @param {Cartographic} mn
     * @param {Cartographic} mx
     */
    DrawRectangle.prototype.setPolyPts = function(mn, mx) {
        this._rectanglePrimitive.rectangle = this.getRectangle(mn, mx);
    };

    /**
     * Handles stop drawing rectangle event.
     * @param {{position: Cartesian2}} movement
     */
    DrawRectangle.prototype.handleRegionStop = function(movement) {
        this.enableInput();
        var cartesian = this._scene.camera.pickEllipsoid(movement.position,
                this._ellipsoid);
        if (cartesian) {
            this._click2 = this._ellipsoid.cartesianToCartographic(cartesian);
        }
        this._mouseHandler.destroy();

        this._rectanglePrimitive.show = false;
        if (this._click2) {
            this._finishHandler(this.getRectangle(this._click1, this._click2));
        }
        else {
            // user clicked off map, use last rectangle
            this._finishHandler(this._rectanglePrimitive.rectangle);
        }
        this._scene.primitives.remove(this._rectanglePrimitive);
        this._rectanglePrimitive = undefined;
    };

    /**
     * Handles the drawing rectangle event.
     * @param {{startPosition: Cartesian2, endPosition: Cartesian2}} movement
     */
    DrawRectangle.prototype.handleRegionDrawing = function(movement) {
        var cartesian = this._scene.camera.pickEllipsoid(movement.endPosition,
                this._ellipsoid);
        if (cartesian) {
            var cartographic = this._ellipsoid.cartesianToCartographic(cartesian);
            this.setPolyPts(this._click1, cartographic);
        }
    };

    /**
     * Handles the start drawing rectangle event.
     * @param {{position: Cartesian2}} movement
     */
    DrawRectangle.prototype.handleRegionStart = function(movement) {
        var cartesian = this._scene.camera.pickEllipsoid(movement.position,
            this._ellipsoid);
        if (cartesian) {
            var that = this;
            this._click1 = this._ellipsoid.cartesianToCartographic(cartesian);
            this._mouseHandler.setInputAction(function(movement) {
                that.handleRegionStop(movement);
            }, ScreenSpaceEventType.LEFT_UP);
            this._mouseHandler.setInputAction(function(movement) {
                that.handleRegionDrawing(movement);
            }, ScreenSpaceEventType.MOUSE_MOVE);
        }
    };

    /**
     * Start drawing rectangle on map.
     */
    DrawRectangle.prototype.start = function() {
        this.disableInput();

        var that = this;

        // Now wait for start
        this._mouseHandler.setInputAction(function(movement) {
            that.handleRegionStart(movement);
        }, ScreenSpaceEventType.LEFT_DOWN);
    };
    
    return DrawRectangle;
});