/**
 * Copyright 2014 General Dynamics Information Technology.
 */


'use strict';

/**
 * Creates the CollapsiblePane widget pane.
 */

/* 
    To use:
        bda-collapsible-pane: the collapsible pane directive
        pane-id: collapsible pane unique ID
        [pane-attach]: where to attach pane (north, south, east, or west)
        [pane-class]: additional class to add to pane
        [pane-content]: content of collapsible pane
        [pane-include]: html file to include as content of pane
        [button-tip-name]: name to display in collapse/expand button tooltip

    Example html: (uses data prefix for HTML validation)
       
    <div data-bda-collapsible-pane="true"
        data-pane-id="pane_123"
        data-pane-attach="west"
        pane-class="myClass"
        data-pane-content="<div><p>this is my content in pane</p></div>"
        data-button-tip-name="My Pane">
    </div>
*/

angular.module('bda.collapsiblePane',[])
    .directive('bdaCollapsiblePane', ['$compile', function($compile) {
    return {
        restrict: "A",
        transclude: true,
        controller: function($scope)  {

            /**
             * @param {MouseEvent} event 
             */
            $scope.togglePane = function(event) {
                var button = event.currentTarget;
                var parent = event.currentTarget.parentNode;
                var panel = angular.element(parent.getElementsByClassName("bda-collapsiblePane"))[0];
                if (button.classList.contains('collapsed')) {
                    button.classList.remove('collapsed');
                    button.title = button.title.replace('Expand', 'Collapse');
                    panel.classList.remove('collapsed');
                }
                else {
                    button.title = button.title.replace('Collapse', 'Expand');
                    button.classList.add('collapsed');
                    panel.classList.add('collapsed');
                }
            };  
        },
        
        link: function (scope, element, attrs) {
            
            var paneId = attrs.paneId;
            var paneClass = attrs.paneClass;
            var paneContent = attrs.paneContent;
            var paneAttach = attrs.paneAttach ? attrs.paneAttach : 'west';
            var paneInclude = attrs.paneInclude;
            var buttonTipName = attrs.buttonTipName ? ('Collapse ' + attrs.buttonTipName) : 'Collapse';
            
            var template = '<div id=' + paneId + '>';
            template += '<div class="bda-collapsiblePane bda-collapsiblePane-' + paneAttach;
                        
            if (paneClass) {
                template += ' ' + paneClass;
            }
            template += '">';
            
            if (paneContent) {                
                template = template + paneContent;
            }
            
            if (paneInclude) {
                template += ' <div ng-include="'+paneInclude + '" ></div>';
            }
            template += '</div>';
            
            // Add collapsible button
            template += '<button class="bda-collapsibleButton bda-collapsibleButton-' + paneAttach + '"';
            template += ' title="' + buttonTipName + '"';
            template += ' ng-click="togglePane($event)"></button></div>';
            
            // Create an angular element. (this is still the "view")
            var collapsiblePaneElement = angular.element(template);
    
            // Compile the view into a function.
            var compiled = $compile(collapsiblePaneElement);
    
            // Append this view to the element of the directive
            element.append(collapsiblePaneElement);
            compiled(scope);    
                        
         }
      };
    }]);
