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
    'Cesium/Core/Cartesian2',
    'Cesium/Core/Cartesian3',
    'Cesium/Core/Color',    
    'Cesium/Core/defined',
    'Cesium/Core/Ellipsoid',    
    'Cesium/Core/ScreenSpaceEventHandler',
    'Cesium/Core/ScreenSpaceEventType',
    'Cesium/Scene/BillboardCollection',    
    'Cesium/Scene/HorizontalOrigin',    
    'Cesium/Scene/VerticalOrigin'
], function(
    Cartesian2,
    Cartesian3,    
    Color,
    defined,    
    Ellipsoid,    
    ScreenSpaceEventHandler, 
    ScreenSpaceEventType,
    BillboardCollection,    
    HorizontalOrigin,   
    VerticalOrigin)
{
    "use strict";

    // static variables
    var ellipsoid = Ellipsoid.WGS84;

    // constructor
    var BillboardGroup = function(drawHelper, options) {

        this._drawHelper = drawHelper;
        this._scene = drawHelper._scene;
        
        this._options = copyOptions(options, drawHelper._defaultBillboard);

        // create one common billboard collection for all billboards
        var b = new BillboardCollection();

        // tag it as a drawing primitive
        b.tag = "DRAWHELPER";
        
        this._scene.primitives.add(b);
        this._billboards = b;
        // keep an ordered list of billboards
        this._orderedBillboards = [];
    }

    BillboardGroup.prototype.createBillboard = function(position, callbacks) {

        var billboard = this._billboards.add({
            show : true,
            position : position,
            pixelOffset : new Cartesian2(this._options.shiftX, this._options.shiftY),
            eyeOffset : new Cartesian3(0.0, 0.0, 0.0),
            horizontalOrigin : HorizontalOrigin.CENTER,
            verticalOrigin : VerticalOrigin.CENTER,
            scale : 1.0,
            image: this._options.iconUrl,
            color : new Color(1.0, 1.0, 1.0, 1.0)
        });

        // if editable
        if(callbacks) {
            var _self = this;
            var screenSpaceCameraController = this._scene.screenSpaceCameraController;
            if(callbacks.dragHandlers) {
                var _self = this;
                setListener(billboard, 'leftDown', function(position) {
                    // TODO - start the drag handlers here
                    // create handlers for mouseOut and leftUp for the billboard and a mouseMove
                    function onDrag(position) {
                        billboard.position = position;
                        // find index
                        for (var i = 0, I = _self._orderedBillboards.length; i < I && _self._orderedBillboards[i] != billboard; ++i);
                        callbacks.dragHandlers.onDrag && callbacks.dragHandlers.onDrag(getIndex(), position);
                    }
                    function onDragEnd(position) {
                        handler.destroy();
                        enableRotation(true);
                        callbacks.dragHandlers.onDragEnd && callbacks.dragHandlers.onDragEnd(getIndex(), position);
                    }

                    var handler = new ScreenSpaceEventHandler(_self._scene.canvas);

                    handler.setInputAction(function(movement) {
                        var cartesian = _self._scene.camera.pickEllipsoid(movement.endPosition, ellipsoid);
                        if (cartesian) {
                            onDrag(cartesian);
                        } else {
                            onDragEnd(cartesian);
                        }
                    }, ScreenSpaceEventType.MOUSE_MOVE);

                    handler.setInputAction(function(movement) {
                        onDragEnd(_self._scene.camera.pickEllipsoid(movement.position, ellipsoid));
                    }, ScreenSpaceEventType.LEFT_UP);

                    enableRotation(false);

                    callbacks.dragHandlers.onDragStart && callbacks.dragHandlers.onDragStart(getIndex(), _self._scene.camera.pickEllipsoid(position, ellipsoid));
                });
            }
            if(callbacks.onDoubleClick) {
                setListener(billboard, 'leftDoubleClick', function(position) {
                    callbacks.onDoubleClick(getIndex());
                });
            }
            if(callbacks.onClick) {
                setListener(billboard, 'leftClick', function(position) {
                    callbacks.onClick(getIndex());
                });
            }
            if(callbacks.tooltip) {
                setListener(billboard, 'mouseMove', function(position) {
                    _self._drawHelper._tooltip.showAt(position, callbacks.tooltip());
                });
                setListener(billboard, 'mouseOut', function(position) {
                    _self._drawHelper._tooltip.setVisible(false);
                });
            }
        }

        return billboard;
        
        function enableRotation(enable) {
            screenSpaceCameraController.enableRotate = enable;
        }
        function getIndex() {
            // find index
            for (var i = 0, I = _self._orderedBillboards.length; i < I && _self._orderedBillboards[i] != billboard; ++i);
            return i;
        }
    }

    BillboardGroup.prototype.insertBillboard = function(index, position, callbacks) {
        this._orderedBillboards.splice(index, 0, this.createBillboard(position, callbacks));
    }

    BillboardGroup.prototype.addBillboard = function(position, callbacks) {
        this._orderedBillboards.push(this.createBillboard(position, callbacks));
    }

    BillboardGroup.prototype.addBillboards = function(positions, callbacks) {
        var index =  0;
        for(; index < positions.length; index++) {
            this.addBillboard(positions[index], callbacks);
        }
    }

    BillboardGroup.prototype.updateBillboardsPositions = function(positions) {
        var index =  0;
        for(; index < positions.length; index++) {
            this.getBillboard(index).position = positions[index];
        }
    }

    BillboardGroup.prototype.countBillboards = function() {
        return this._orderedBillboards.length;
    }

    BillboardGroup.prototype.getBillboard = function(index) {
        return this._orderedBillboards[index];
    }

    BillboardGroup.prototype.removeBillboard = function(index) {
        this._billboards.remove(this.getBillboard(index));
        this._orderedBillboards.splice(index, 1);
    }

    BillboardGroup.prototype.remove = function() {
        this._billboards = this._billboards && this._billboards.removeAll() && this._billboards.destroy();
    }

    BillboardGroup.prototype.setOnTop = function() {
        this._scene.primitives.raiseToTop(this._billboards);
    }

    return BillboardGroup;
});
