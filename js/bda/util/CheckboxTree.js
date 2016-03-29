/*
    [TREE attribute]
    bda-checkbox-tree : the checkboxTree directive
    tree-id : each tree's unique id.
    allow-inline-edit : enables edit tree nodes, this applies to underlying data
    checkbox-tree-model : the tree model on $scope.
    node-id : each node's id
    node-label : each node's label
    node-children: each node's children
    
    <div 
        data-bda-checkbox-tree="true"
        data-tree-id="tree123"
        data-allow-inline-edit=true
        data-checkbox-tree-model="myService.myModel"
        data-node-id="idField"
        data-node-label="name"
        data-node-children="children" >
    </div>        
*/

(function (angular) {
	'use strict';

	angular.module('bdaCheckboxTree', [] ).directive('checkboxTreeModel', ['$compile', function($compile) {
		return {
			restrict: 'A',
			link: function (scope, element, attrs) {
				//tree id
				var treeId = attrs.treeId;
			
				//tree model
				var checkboxTreeModel = attrs.checkboxTreeModel;

				//node id
				var nodeId = attrs.nodeId || 'id';

				//node label
				var nodeLabel = attrs.nodeLabel || 'label';

				//children
				var nodeChildren = attrs.nodeChildren || 'children';
				
                var allowInlineEdit = (attrs.allowInlineEdit && attrs.allowInlineEdit == "true") || false;				
				
				//tree template
				var template =
					'<ul>' +
						'<li class="notediting" data-ng-repeat="node in ' + checkboxTreeModel + '">' +
							'<i class="collapsed" data-ng-show="node.' + nodeChildren + '.length && node.collapsed" data-ng-click="' + treeId + '.selectNodeHead(node)"></i>' +
							'<i class="expanded" data-ng-show="node.' + nodeChildren + '.length && !node.collapsed" data-ng-click="' + treeId + '.selectNodeHead(node)"></i>' +
                            '<i class="normal" data-ng-hide="node.' + nodeChildren + '.length"></i> ';
                            
                if (allowInlineEdit) {
                    template += 
                            '<input type="checkbox" data-ng-model="' + 'node.checked" data-ng-change="' + treeId + '.checkboxChanged(node)">' +
                            '<span title="Double-click to rename" data-ng-hide="node.treeInlineEdit" data-ng-dblclick="' + treeId + '.treeInlineEdit($event, node);">{{node.' + nodeLabel + '}}</span>' +
                            '<input type="text" class="treeInlineEdit" data-ng-show="node.treeInlineEdit" data-ng-blur="' + treeId + '.treeInlineEdit($event, node);" data-ng-model="node.' + nodeLabel + '"> ';                    
                }
                else {
                    template += 
                            '<input type="checkbox" data-ng-model="' + 'node.checked" data-ng-change="' + treeId + '.checkboxChanged(node)">' + '{{node.' + nodeLabel + '}}';
                }
				
			    template +=			
                            '<div data-ng-hide="node.collapsed" data-tree-id="' + treeId + '" data-checkbox-tree-model="node.' + nodeChildren + '" data-allow-inline-edit=' + allowInlineEdit + ' data-node-id=' + nodeId + ' data-node-label=' + nodeLabel + ' data-node-children=' + nodeChildren + '></div>' +
						'</li>' +
					'</ul>';
                 
				//check tree id, tree model
				if (treeId && checkboxTreeModel) {
                     
					//root node
					if (attrs.bdaCheckboxTree) {
					
						//create tree object if not exists
						scope[treeId] = scope[treeId] || {};

						//if node head clicks,
						scope[treeId].selectNodeHead = scope[treeId].selectNodeHead || function(selectedNode) {

							//Collapse or Expand
							selectedNode.collapsed = !selectedNode.collapsed;
						};

                        // if checkbox selected
                        scope[treeId].checkboxChanged = scope[treeId].checkboxChanged || function (selectedNode) {
                            if (selectedNode.children) {                                
                                for (var i=0; i<selectedNode.children.length; i++) {
                                    selectedNode.children[i].checked = selectedNode.checked;
                                }
                            }
                        };
                        
                        // if inline edit
                        scope[treeId].treeInlineEdit = scope[treeId].treeInlineEdit || function (event, selectedNode) {
                            selectedNode.treeInlineEdit = !selectedNode.treeInlineEdit;
                            var parent = event.currentTarget.parentNode;
                            if (parent.classList.contains('editing')) {
                                parent.classList.remove('editing');
                                parent.classList.add('notediting');
                            }
                            else {
                                parent.classList.remove('notediting');
                                parent.classList.add('editing');
                                
                                // find the input text element and make it selected
                                for (var i=0; i<parent.childElementCount; i++) {
                                    var element = parent.children[i];
                                    if (element.classList.contains('treeInlineEdit')) {
                                        element.focus();
                                        element.select();
                                        element.selectionDirection='forward';
                                        break;
                                    }
                                }
                            }
                        };
					}
 
					//Rendering template.
					element.html('').append($compile(template)(scope));
				}
			}
		};
	}]);
})(angular);
