/**
 * Copyright 2014 General Dynamics Information Technology.
 */

/**
 * Creates the floatingPane angular widget.
 */

/* 
    To use:
        bda-floating-pane: the floating pane directive
        pane-id: floating pane unique ID
        [pane-title]: title displayed at top of floating pane
        [pane-minimize]: callback routine when minimize selected; default no minimize button
        [pane-class]: additional class to add to floating pane
        [pane-content]: content of floating pane
        [pane-include]: html file to include as content of pane
        [pane-close]: pass in true to show close icon or a callback expression; default false
        [pane-resize]: pass in true to show resize icon; default false

    Example html: (uses data prefix for HTML validation)
       
    <div data-bda-floating-pane="true"
        data-pane-id="myId"
        data-pane-title="My Title"
        data-pane-close= true
        data-pane-minimize='myMinimizeProcedure();'
        data-pane-class='bda-TitledFloatingPane'
        data-pane-content="<div><p>floating pane with MINIMIZE button</p></div>">
    </div>
*/

angular.module('bda.floatingPane',[])
    .directive('bdaFloatingPane', ['$compile', function($compile) {
    return {
        restrict: "A",
        transclude: true,
        controller: function($scope)  {
            // Set up drag variables
            $scope.x = 0;
            $scope.y = 0;
            $scope.startX = 0;
            $scope.startY = 0;

            // Set up resize variables
            $scope.mx;
            $scope.my;
            $scope.width;
            $scope.height;
            $scope.left;
            $scope.top;
            $scope.resizing;
            
            /**
             * Closes the floating pane.
             * @param {MouseEvent} event 
             */
            $scope.hidePanel = function(event) {
                var floatingPane = event.currentTarget.parentNode;
                floatingPane.show(false);
            };

            /**
             * Handles the drag start.
             * @param {MouseEvent} event 
             */
            $scope.handleDragStart = function(event) {
                $scope.startX = event.screenX - event.currentTarget.offsetLeft;
                $scope.startY = event.screenY - event.currentTarget.offsetTop;
                if (!$scope.resizing) {
                    this.classList.add('drag');
                }
                return false;
            };
       
            /**
             * Stops browser from redirecting.
             * @param {MouseEvent} event
             */
            $scope.stop = function(event) {
                event.preventDefault();
                if (event.stopPropagation) {
                    event.stopPropagation();
                } 
                
                $scope.x = event.screenX - $scope.startX;
                $scope.y = event.screenY - $scope.startY;
                
                return false;
            };
                    
            /**
             * Processes dragend event. 
             * @param {MouseEvent} event
             */
            $scope.handleDragEnd = function(event) {
                $scope.stop(event);
                this.style.opacity = '1.0';
                
                if ($scope.resizing) {
                    $scope.resizing = false;
                }
                else { // drag end
                    this.style.left = $scope.x + 'px';
                    this.style.top = $scope.y + 'px';
                    this.classList.remove('drag');
                }
                
                return false;
            };
            
            /**
             * Handles the start resize event. 
             * @param {MouseEvent} event
             */
            $scope.handleStartResize = function(event) {
                var floatingPane = event.currentTarget.parentNode;
                floatingPane.draggable = false;
                event.currentTarget.draggable = true;
                $scope.resizing = true;
                $scope.left = floatingPane.offsetLeft;
                $scope.top = floatingPane.offsetTop;
                $scope.height = floatingPane.offsetHeight;
                $scope.width = floatingPane.offsetWidth;
                $scope.mx = event.pageX;
                $scope.my = event.pageY;
                $scope.startX = event.screenX - floatingPane.offsetLeft;
                $scope.startY = event.screenY - floatingPane.offsetTop;
                return false;
            };
                
            /**
             * Handles the resize event, while the resize icon is being dragged.
             * The floating pane is rescaled based on where the mouse is.
             * @param {MouseEvent} event
             */
            $scope.handleResizeDrag = function(event) {
                event.preventDefault();
                if (event.pageX == 0) {
                    return;
                }

                try {
                    var floatingPane = event.currentTarget.parentNode;
                    var dx = event.pageX - $scope.mx;
                    var dy = event.pageY - $scope.my;
                    $scope.mx = event.pageX;
                    $scope.my = event.pageY;
                    
                    // Compute current height and width based on scale
                    var style = window.getComputedStyle(floatingPane, "");
                    var matrix = style.getPropertyValue("transform");
                    // The transform matrix syntax: (H scale, H skew, V skew, V scale, H move, V move)
                    var matrixValues = matrix.substring(7, matrix.length -1).split(',');
                    
                    var currentHeight = floatingPane.offsetHeight * matrixValues[3] + dy;
                    var currentWidth = floatingPane.offsetWidth * matrixValues[0] + dx;
                                        
                    var scaleX = Math.abs(currentWidth / $scope.width);
                    var scaleY = Math.abs(currentHeight / $scope.height);
                    
                    // // To maintain aspect ratio, just take the larger scale between x and y
                    // floatingPane.style.transform = "scale(" + Math.max(scaleX,scaleY) + ")";
                    
                    // Apply scale
                    floatingPane.style.transform = "scale(" + scaleX + ',' + scaleY + ")";
                } catch (error) {
                    console.error('Error trying to resize floating pane: ' + error);
                }
            };
        
            /**
             * Handles the end of resize event. 
             * @param {MouseEvent} event
             */
            $scope.handleResizeEnd = function(event) {
                event.currentTarget.draggable = false;
                event.currentTarget.parentNode.draggable = true;
            };
        },
        
        link: function (scope, element, attrs) {
            
            var paneId = attrs.paneId;
            var paneTitle = attrs.paneTitle;
            var paneContent = attrs.paneContent;
            var paneClose = attrs.paneClose;
            var paneMinimize = attrs.paneMinimize;
            var paneClass = attrs.paneClass;
            var paneInclude = attrs.paneInclude;
            var paneResize = attrs.paneResize;
            
            var template = '<div id="' + paneId + '" draggable=true';
            
            if (paneClass) {
                template += ' class="bda-floatingPane ' + paneClass + '"';
            }
            else {
                template += ' class="bda-floatingPane"';
            }
            
            template += '>';
            
            if (paneTitle) {
                template += '<h5>' + paneTitle + '</h5>';
            }
            if (!paneTitle && (paneClose || paneMinimize)) {
                // Display an empty title bar for close button (display a transparent '.')
                template += '<h5 style="color: rgba(0,0,0,0);">.</h5>';
            }
            
            if (paneClose) {
                var closeExpression = paneClose == 'true' ? "hidePanel($event);" : paneClose;
                template += '<button class="fp-close-btn" ng-click='+closeExpression+'></button>';
            }
            
            if (paneMinimize) {
                template += '<button class="fp-minimize-btn" ng-click='+paneMinimize;
                if (paneClose) {
                    // reset position
                    template = template + ' style="right:30px;"';
                }
                template += '></button>';
            }
            
            if (paneResize) {
                template += '<div title="Resize Pane" class="fp-resize" style="margin: 0px;" '
                    + 'ng-mousedown="handleStartResize($event);"></div>';
            }
            
            if (paneContent) {
                template = template + paneContent;
            }
            
            if (paneInclude) {
                template += ' <div ng-include="'+paneInclude + '" ></div>';
            }
            template += '</div>';
            
            // Create an angular element. (this is still the "view")
            var floatingPaneElement = angular.element(template);
    
            // Compile the view into a function.
            var compiled = $compile(floatingPaneElement);
    
            // Append this view to the element of the directive
            element.append(floatingPaneElement);
            compiled(scope);
            
            var floatingPaneDiv = angular.element(document.getElementById(paneId))[0];
            
            if (floatingPaneDiv) {
                // Add drag listeners (Note: this is a Chrome implementation and will not work with firefox)
                floatingPaneDiv.addEventListener('dragstart', scope.handleDragStart, false);
                floatingPaneDiv.addEventListener('dragend', scope.handleDragEnd, false);

                // Set this as drop target, to prevent getting no-drop cursor
                floatingPaneDiv.addEventListener('dragenter', scope.stop, false);
                floatingPaneDiv.addEventListener('dragover', scope.stop, false);
                             
                floatingPaneDiv.show = function(doShow) {
                    this.style.display = doShow ? 'block' : 'none';
                };  
                          
                if (paneResize) {
                    var resizeHandle = floatingPaneDiv.getElementsByClassName('fp-resize')[0];
                    resizeHandle.addEventListener('drag', scope.handleResizeDrag, false);
                    resizeHandle.addEventListener('dragend', scope.handleResizeEnd, false);
                    
                    // Set this as drop target, to prevent getting no-drop cursor
                    resizeHandle.addEventListener('dragenter', scope.stop, false);
                    resizeHandle.addEventListener('dragover', scope.stop, false);
                }
            }
            else {
                console.error("Error creating floatingPane=" + paneTitle);
            }
         }
      };
    }]);
