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
 * 
 * Modified again Jan 21 2015, to provide save/load capability.
 */

define([
    'Cesium/Core/Color',
    'Cesium/Core/defined',
    'Cesium/Core/DeveloperError',
    'Cesium/Core/PinBuilder',
    'Cesium/Scene/BillboardCollection',
    'Cesium/Scene/LabelCollection',
    'Cesium/Scene/Material',
    'DrawHelper/BillboardGroup',
    'DrawHelper/CirclePrimitive',
    'DrawHelper/ExtentPrimitive',
    'DrawHelper/PolygonPrimitive',
    'DrawHelper/PolylinePrimitive'
], function(
    Color,
    defined,    
    DeveloperError,
    PinBuilder,
    BillboardCollection,
    LabelCollection,
    Material,
    BillboardGroup,
    CirclePrimitive,
    ExtentPrimitive,
    PolygonPrimitive,
    PolylinePrimitive)
{
    "use strict";

    // constructor
    var DrawHelperWidget = function(drawHelper, options) {

        // container must be specified
        if(!(defined(options.container))) {
            throw new DeveloperError('Container is required');
        }

        var pinBuilder = new PinBuilder();
        
        var drawOptions = {
            markerIcon: pinBuilder.fromColor(new Color(.1, .1, .1, .7), 26),
            polylineIcon: "js/dependencies/cesium-drawhelper/img/glyphicons_097_vector_path_line.png",
            polygonIcon: "js/dependencies/cesium-drawhelper/img/glyphicons_096_vector_path_polygon.png",
            circleIcon: "js/dependencies/cesium-drawhelper/img/glyphicons_095_vector_path_circle.png",
            extentIcon: "js/dependencies/cesium-drawhelper/img/glyphicons_094_vector_path_square.png",
            clearIcon: "js/dependencies/cesium-drawhelper/img/glyphicons_067_cleaning.png",
            saveIcon: "js/dependencies/cesium-drawhelper/img/save.svg",
            loadIcon: "js/dependencies/cesium-drawhelper/img/open_24.png",
            polylineDrawingOptions: drawHelper._defaultPolylineOptions,
            polygonDrawingOptions: drawHelper._defaultPolygonOptions,
            extentDrawingOptions: drawHelper._defaultExtentOptions,
            circleDrawingOptions: drawHelper._defaultCircleOptions
        };

        fillOptions(options, drawOptions);

        var _self = this;

        var toolbar = document.createElement('DIV');
        toolbar.className = "toolbar";
        options.container.appendChild(toolbar);

        function addIcon(id, url, title, callback) {
            var div = document.createElement('DIV');
            div.className = 'button';
            div.title = title;
            toolbar.appendChild(div);
            div.onclick = callback;
            
            // Check if Canvas node (i.e. Pinbuilder draws onto canvas)
            if (url.nodeName == 'CANVAS') {
                div.appendChild(url);
                div.style.padding = '2px 0px 0px 4px';
            }
            else {  // image is a png
                var span = document.createElement('SPAN');
                div.appendChild(span);
                var image = document.createElement('IMG');
                image.src = url;
                span.appendChild(image);
            }
            return div;
        }

        var scene = drawHelper._scene;

        addIcon('marker', options.markerIcon, 'Click to start drawing a 2D marker', function() {
            _self.executeListeners({name: 'drawingStarted', type: 'marker'});
            drawHelper.startDrawingMarker({
                callback: function(position) {
                    _self.executeListeners({name: 'markerCreated', position: position});
                }
            });
        });

        addIcon('polyline', options.polylineIcon, 'Click to start drawing a 2D polyline', function() {
            _self.executeListeners({name: 'drawingStarted', type: 'polyline'});
            drawHelper.startDrawingPolyline({
                callback: function(positions) {
                    _self.executeListeners({name: 'polylineCreated', positions: positions});
                }
            });
        });

        addIcon('polygon', options.polygonIcon, 'Click to start drawing a 2D polygon', function() {
            _self.executeListeners({name: 'drawingStarted', type: 'polygon'});
            drawHelper.startDrawingPolygon({
                callback: function(positions) {
                    _self.executeListeners({name: 'polygonCreated', positions: positions});
                }
            });
        });

        addIcon('extent', options.extentIcon, 'Click to start drawing an Extent', function() {
            _self.executeListeners({name: 'drawingStarted', type: 'extent'});
            drawHelper.startDrawingExtent({
                callback: function(extent) {
                    _self.executeListeners({name: 'extentCreated', extent: extent});
                }
            });
        });

        addIcon('circle', options.circleIcon, 'Click to start drawing a Circle', function() {
            _self.executeListeners({name: 'drawingStarted', type: 'circle'});
            drawHelper.startDrawingCircle({
                callback: function(center, radius) {
                    _self.executeListeners({name: 'circleCreated', center: center, radius: radius});
                }
            });
        });

        // Add load Dialog Box
        var storageObject;
        var loadDialog = makeLoadDialog();
        if (loadDialog) {
            var nodes = document.getElementsByClassName("cesium-viewer-cesiumWidgetContainer");
            nodes[0].appendChild(loadDialog);
            loadDialog.close();
            loadDialog.classList.add('closed');
        }

        // Make load icon button
        var div = document.createElement('div');
        div.className = 'divider';
        toolbar.appendChild(div);
        var loadDiv = addIcon('load', options.loadIcon, 'Load saved drawings', function() {
            var drawHelperStorage = localStorage.getItem("drawHelper");
            if (drawHelperStorage) {
                storageObject = JSON.parse(drawHelperStorage);
                var names = [];
                if (storageObject && storageObject.drawings) {
                    for (var i=0; i<storageObject.drawings.length; i++) {
                        names.push(storageObject.drawings[i].name);
                    }
                }
                
                if (names.length > 0) {
                    var drawLayersName;
                    if (!loadDialog) {
                        // Browser does not support the 'dialog' element: use 'prompt' instead
                        var drawLayersName = prompt("Enter draw layer to load: " + names.toString(), names[0]);
                        if (drawLayersName != null) {
                            loadSavedDrawings([drawLayersName]);
                        }
                        else {
                            console.error('user did not enter a drawing name to open');
                        }
                    }
                    else {  // Supported browsers are: chrome, safari, and opera
                        updateTable(names);
                        loadDialog.showModal();
                        loadDialog.classList.remove('closed');
                    }
                }
            }
        });
        loadDiv.id = 'drawingToolbar_load';

        // Add save Dialog Box
        var saveDialog = makeSaveDialog();
        if (saveDialog) {
            var nodes = document.getElementsByClassName("cesium-viewer-cesiumWidgetContainer");
            nodes[0].appendChild(saveDialog);
            saveDialog.close();
            saveDialog.classList.add('closed');
        }
        
        // Make save icon button
        var div = document.createElement('div');
        div.className = 'divider';
        toolbar.appendChild(div);
        var saveDiv = addIcon('save', options.saveIcon, 'Save all drawings in local storage', function() {
            if (!saveDialog) {
                // Browser does not support the 'dialog' element: use 'prompt' instead
                var drawLayersName = prompt("Enter draw layers name", "draw_layers_01");
                if (drawLayersName != null) {
                    savedDrawings(drawLayersName);
                }
                else {
                    console.error('user did not enter a drawing name to open');
                }
            }
            else {  // Supported browsers are: chrome, safari, and opera
                saveDialog.showModal();
                saveDialog.classList.remove('closed');
            }
        });
        saveDiv.id = 'drawingToolbar_save';
    
        // add a clear button at the end
        // add a divider first
        var div = document.createElement('DIV');
        div.className = 'divider';
        toolbar.appendChild(div);
        addIcon('clear', options.clearIcon, 'Remove all primitives', function() {
            // Remove all primitives tagged with "DRAWHELPER"
            var length = scene.primitives.length;
            for (var i=length-1; i>=0; i--) {
                var primitive = scene.primitives._primitives[i];
                if (defined(primitive.tag) && primitive.tag == "DRAWHELPER") {
                    scene.primitives.remove(primitive);
                }
            }           
        });

        enhanceWithListeners(this);

        /**
         * Makes the load dialog. 
         */
        function makeLoadDialog() {
            var loadDialog = document.createElement("dialog");
            loadDialog.setAttribute("open", "");
            if (loadDialog.open == true) {
                // browser supports the dialog element
                loadDialog.id = "drawhelper-loadDialog";
                loadDialog.className = 'modal-dialog';      // modal styles are defined in bootstrap.css
                var div = document.createElement('div');
                
                var header = document.createElement('div');
                header.className = 'modal-header';
                var h4 = document.createElement('h4');
                h4.innerHTML = "Select saved drawings to load:";
                header.appendChild(h4);
                div.appendChild(header);
                
                var body = document.createElement('div');
                body.className = 'modal-body';
                var table = document.createElement('table');
                table.id = "drawhelper-layersTable";
                body.appendChild(table);
                div.appendChild(body);
                
                var footerDiv = document.createElement('div');
                footerDiv.className = "modal-footer";
                footerDiv.style.textAlign = "center";
                var selectButton = document.createElement('button');
                selectButton.className = 'btn-primary';
                selectButton.classList.add('btn');
                selectButton.appendChild(document.createTextNode("Select"));
    
                var closeEventListener = function() {
                    loadDialog.close();
                    loadDialog.removeEventListener('webkitTransitionEnd', closeEventListener, false);
                };
                    
                var selectCallback = function() {
                    var checkBoxes = document.getElementsByClassName("drawhelper-layersTable-checkbox");
                    var layers = [];
                    for (var i=0; i<checkBoxes.length; i++) {
                        if (checkBoxes[i].checked) {
                            layers.push(checkBoxes[i].value);
                        }
                    }
                    loadSavedDrawings(layers);
    
                    loadDialog.classList.add('closed');
                    loadDialog.addEventListener('webkitTransitionEnd', closeEventListener, false);
                };
            
                selectButton.onclick = selectCallback;
                footerDiv.appendChild(selectButton);
                
                var cancelButton = document.createElement('button');
                cancelButton.className = 'btn-warning';
                cancelButton.classList.add('btn');
                var cancelCallback = function() {
                    loadDialog.classList.add('closed');
                    loadDialog.addEventListener('webkitTransitionEnd', closeEventListener, false);
                };
                cancelButton.appendChild(document.createTextNode("Cancel"));
                cancelButton.onclick = cancelCallback;
                footerDiv.appendChild(cancelButton);
                
                div.appendChild(footerDiv);                 
                loadDialog.appendChild(div);
            }
            else {
                loadDialog = undefined;
            }
            
            return loadDialog;
        };
    
        /**
         * Updates the selectable drawing titles in the load table. 
         * @param {String[]} titles of drawings
         */
        function updateTable(titles) {
            var table = document.getElementById('drawhelper-layersTable');
            
            // Remove old rows in table
            while (table.hasChildNodes()) {   
                table.removeChild(table.firstChild);
            }        
            
            // Add titles as checkboxes
            for (var i=0; i<titles.length; i++) {
                var tr = document.createElement('tr');
                var td = document.createElement('td');
                var checkBox = document.createElement('input');
                checkBox.type = "checkbox";
                checkBox.id = "drawhelper-layersTable-checkbox-" + i;
                checkBox.className = "drawhelper-layersTable-checkbox";
                checkBox.value = titles[i];
                var label = document.createElement("label");
                label.for = checkBox.id;
                label.innerHTML = titles[i];
                label.className = "drawhelper-layersTable-label";
                td.appendChild(checkBox);
                td.appendChild(label);
                tr.appendChild(td);
                table.appendChild(tr);
            }
        };

        /**
         * Loads the drawings saved in local storage.
         * Shapes get instantiated using saved parameters from the json object
         * that have already been parsed into storageObject.
         * @param {String[]} titles of drawings
         */
        function loadSavedDrawings(titles) {
            if (storageObject && storageObject.drawings) {
                for (var t=0; t<titles.length; t++) {
                    for (var i=0; i<storageObject.drawings.length; i++) {                    
                        if (storageObject.drawings[i].name == titles[t]) {
                            // add saved primitives to scene
                            for (var j=0; j<storageObject.drawings[i].data.length; j++) {
                                switch (storageObject.drawings[i].data[j].type) {
                                    case 'circle':
                                        var circle = new CirclePrimitive({
                                            center: storageObject.drawings[i].data[j].center,
                                            radius: storageObject.drawings[i].data[j].radius,
                                            material: Material.fromType('Color', {color: storageObject.drawings[i].data[j].color})
                                        }, drawHelper._defaultSurfaceOptions);
                                        scene.primitives.add(circle);
                                        circle.setEditable();
                                        break;
                                    case 'extent':
                                        var extentPrimitive = new ExtentPrimitive({
                                            extent: storageObject.drawings[i].data[j].extent,
                                            material: Material.fromType('Color', {color: storageObject.drawings[i].data[j].color})
                                        }, drawHelper._defaultSurfaceOptions);
                                        scene.primitives.add(extentPrimitive);
                                        extentPrimitive.setEditable();
                                        break;
                                    case 'label':
                                        var labels = new LabelCollection();
                                        var label = labels.add({
                                            position: storageObject.drawings[i].data[j].position,
                                            text: storageObject.drawings[i].data[j].text,
                                            horizontalOrigin: storageObject.drawings[i].data[j].horizontalOrigin,
                                            pixelOffset: storageObject.drawings[i].data[j].pixelOffset,
                                            font: storageObject.drawings[i].data[j].font,
                                            outlineColor: storageObject.drawings[i].data[j].outlineColor,
                                            outlineWidth: storageObject.drawings[i].data[j].outlineWidth,
                                            style: storageObject.drawings[i].data[j].style,
                                            translucencyByDistance: storageObject.drawings[i].data[j].translucencyByDistance,
                                            fillColor: storageObject.drawings[i].data[j].fillColor });
                                        labels.tag = 'DRAWHELPER';
                                        scene.primitives.add(labels);
                                        break;
                                    case 'marker':
                                        var billboardCollection = new BillboardCollection();
                                        billboardCollection.tag = "DRAWHELPER";
                                        var color = new Color(storageObject.drawings[i].data[j].color.red, 
                                            storageObject.drawings[i].data[j].color.green, 
                                            storageObject.drawings[i].data[j].color.blue, 
                                            storageObject.drawings[i].data[j].color.alpha);
                                        var billboard = billboardCollection.add({
                                            show : true,
                                            position : storageObject.drawings[i].data[j].position,
                                            image : pinBuilder.fromText(storageObject.drawings[i].data[j].text, color, 30),
                                        });
                                        billboard.setEditable();
                                        billboard.id = JSON.stringify({type: 'MARKER', 
                                            color: storageObject.drawings[i].data[j].color, 
                                            text: storageObject.drawings[i].data[j].text});
                                        scene.primitives.add(billboardCollection);
                                        break;                                    
                                    case 'polygon':
                                        var polygon = new PolygonPrimitive({
                                            positions: storageObject.drawings[i].data[j].positions,
                                            material: Material.fromType('Color', {color: storageObject.drawings[i].data[j].color})
                                        }, drawHelper._defaultSurfaceOptions);
                                        scene.primitives.add(polygon);
                                        polygon.setEditable();
                                        break;
                                    case 'polyline':
                                        var polyline = new PolylinePrimitive({
                                            positions: storageObject.drawings[i].data[j].positions,
                                            width: storageObject.drawings[i].data[j].width,
                                            geodesic: true,
                                            material: Material.fromType('Color', {color: storageObject.drawings[i].data[j].color})
                                        }, drawHelper._defaultPolylineOptions);                        
                                        scene.primitives.add(polyline);
                                        polyline.setEditable();
                                        break;
                                    
                                    default:
        
                                }
                            }
                        }
                    }
                }
            }        
        };
        
        /**
         * Makes the save dialog. 
         */
        function makeSaveDialog() {
            var saveDialog = document.createElement("dialog");
            saveDialog.setAttribute("open", "");
            if (saveDialog.open == true) {
                // browser supports the dialog element
                saveDialog.id = "drawhelper-saveDialog";
                saveDialog.className = 'modal-dialog';      // modal styles are defined in bootstrap.css
                
                var div = document.createElement('div');
                
                var header = document.createElement('div');
                header.className = 'modal-header';
                var h4 = document.createElement('h4');
                h4.innerHTML = "Enter name to save drawings:";
                header.appendChild(h4);
                div.appendChild(header);
                
                var body = document.createElement('div');
                body.className = 'modal-body';
                var input = document.createElement('input');
                input.id = "drawhelper-save-input";
                body.appendChild(input);
                div.appendChild(body);
                
                var footerDiv = document.createElement('div');
                footerDiv.className = "modal-footer";
                footerDiv.style.textAlign = "center";
                var saveButton = document.createElement('button');
                saveButton.className = 'btn-primary';
                saveButton.classList.add('btn');
                saveButton.appendChild(document.createTextNode("Save"));
    
                var closeSaveEventListener = function() {
                    saveDialog.close();
                    saveDialog.removeEventListener('webkitTransitionEnd', closeSaveEventListener, false);
                };
                    
                var selectCallback = function() {
                    var input = document.getElementById("drawhelper-save-input");
                    saveDrawings(input.value);    
                    saveDialog.classList.add('closed');
                    saveDialog.addEventListener('webkitTransitionEnd', closeSaveEventListener, false);
                };
            
                saveButton.onclick = selectCallback;
                footerDiv.appendChild(saveButton);
                
                var cancelButton = document.createElement('button');
                cancelButton.className = 'btn-warning';
                cancelButton.classList.add('btn');
                var cancelCallback = function() {
                    saveDialog.classList.add('closed');
                    saveDialog.addEventListener('webkitTransitionEnd', closeSaveEventListener, false);
                };
                cancelButton.appendChild(document.createTextNode("Cancel"));
                cancelButton.onclick = cancelCallback;
                footerDiv.appendChild(cancelButton);
                
                div.appendChild(footerDiv);
                saveDialog.appendChild(div);
            }
            else {
                saveDialog = undefined;
            }
            
            return saveDialog;
        };
        
        /**
         * Saves the drawings into local storage.
         * Shape parameters are saved off in json. 
         * @param {String} drawLayersName
         */
        function saveDrawings(drawLayersName) {
            var length = scene.primitives.length;
            var savePrimitives = [];
            for (var i=length-1; i>=0; i--) {
                var primitive = scene.primitives._primitives[i];
                if (defined(primitive.tag) && primitive.tag == "DRAWHELPER") {
                    // Save primitive parameters
                    if (primitive instanceof BillboardCollection) {
                        if (primitive._billboards) {
                            for (var j=0; j<primitive._billboards.length; j++) {
                                if (primitive._billboards[j].id) {
                                    // NOTE: for marker to be recreated, marker parameters
                                    //       must be extracted from the .id
                                    //       See js/bda/framework/toolbar/DrawingToolbar.js for example
                                    //       on how to save parameters.
                                    var pinParams = JSON.parse(primitive._billboards[j].id);
                                    if (pinParams.type == 'MARKER') {
                                        savePrimitives.push({type: 'marker', 
                                            color: pinParams.color, 
                                            text: pinParams.text, 
                                            position: primitive._billboards[j].position});
                                    }
                                }
                            } 
                        }
                    }
                    else if (primitive instanceof CirclePrimitive) {
                        savePrimitives.push({type: 'circle', 
                            color: primitive.material.uniforms.color, 
                            center: primitive.center, 
                            radius: primitive.radius});
                    }
                    else if (primitive instanceof ExtentPrimitive) {
                        savePrimitives.push({type: 'extent', 
                            color: primitive.material.uniforms.color, 
                            extent: primitive.extent});
                    }
                    else if (primitive instanceof LabelCollection) {
                        for (var j=0; j<primitive._labels.length; j++) {
                            savePrimitives.push({type: 'label', 
                                fillColor: primitive._labels[j].fillColor, 
                                outlineColor: primitive._labels[j].outlineColor, 
                                position: primitive._labels[j].position, 
                                text: primitive._labels[j].text,
                                horizontalOrigin: primitive._labels[j].horizontalOrigin,
                                pixelOffset: primitive._labels[j].pixelOffset,
                                font: primitive._labels[j].font,
                                outlineWidth: primitive._labels[j].outlineWidth,
                                style: primitive._labels[j].style,
                                translucencyByDistance: primitive._labels[j].translucencyByDistance});
                        }
                    }
                    else if (primitive instanceof PolygonPrimitive) {
                        savePrimitives.push({type: 'polygon', 
                            color: primitive.material.uniforms.color, 
                            positions: primitive.positions});
                    }
                    else if (primitive instanceof PolylinePrimitive) {
                        savePrimitives.push({type: 'polyline', 
                            color: primitive.material.uniforms.color, 
                            positions: primitive.positions, 
                            width: primitive.width});
                    }
                }
            }           
            
            var drawHelperStorage = localStorage.getItem("drawHelper");
            var storageObject;
            var newLayer = {name: drawLayersName, "data" : savePrimitives};
            
            if (drawHelperStorage) {
                storageObject = JSON.parse(drawHelperStorage);
                if (storageObject && storageObject.drawings) {
                    var found = false;
                    for (var i=0; i<storageObject.drawings.length; i++) {
                        if (storageObject.drawings[i].name == drawLayersName) {
                            found = true;
                            storageObject.drawings[i] = newLayer;
                            break;
                        }
                    }
                    
                    if (!found) {
                        storageObject.drawings.push(newLayer);
                    }
                }
                else {  // shouldn't get here
                    drawHelperStorage = undefined;
                }
            }
            
            if (!drawHelperStorage) {
                storageObject = {"drawings" : [newLayer]};                    
            }
            
            var savedObjStr = JSON.stringify(storageObject);
            localStorage.setItem("drawHelper", savedObjStr);           
        }
    };

    return DrawHelperWidget;

});

