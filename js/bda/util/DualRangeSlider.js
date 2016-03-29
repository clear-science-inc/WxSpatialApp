/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

/**
 * Dual Range Slider module.
 */

/*
    To use:
        dual-range-slider-dir: the dual range slider directive
        left-range: left-most range value (usually min scale)
        right-range: right-most range value (usually max scale)
        marker1: where to place first brush marker 
        marker2: where to place second brush marker
        num-ticks: number of tick marks on scale
        is-flipped: set to true to reverse scale, high-to-low
          
    HTML Example:      
        <dual-range-slider-dir 
            left-range=0
            right-range=100
            marker1=30 
            marker2=70
            num-ticks=10
            is-flipped=false>
        </dual-range-slider-dir>
 */
angular.module('bda.dualRangeSlider',[]).directive('dualRangeSliderDir', function() {


    return {
        restrict : 'E',
        terminal : true,
        scope : {
            rightRange : '=',
            leftRange : '=',
            marker2 : '=',
            marker1 : '=',
            isFlipped : '=',
            numTicks : '='
        },
        link : function(scope, element, attrs) {
            
            var numTicks = scope.numTicks ? scope.numTicks : 10;
            var margin = {top: 6, right: 20, bottom: 16, left: 20};
            var width = 220 - margin.left - margin.right;
            var height = 40 - margin.top - margin.bottom;
                     
            // Create slider scale
            var xScale = d3.scale.linear().range([0, width]);   
            setSliderDomain();
            
            // Create slider axis
            var xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks([numTicks]).tickFormat(d3.format("d"));
                  
            var brush = d3.svg.brush()
                .x(xScale)
                .extent([scope.marker1, scope.marker2])
                .on("brushstart", brushstart)
                .on("brush", brushmove)
                .on("brushend", brushend);
            
            var arc = d3.svg.arc()
                .outerRadius(height / 2)
                .startAngle(0)
                .endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });
            
            var svg = d3.select(element[0]).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                
            // Add slider axis
            svg.append("g").attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);
            
            var leftRect = svg.append("rect").attr("x", 0).attr("width", 400).attr("height",height).attr("fill", "#00ff00");
            var rightRect = svg.append("rect").attr("x", 400).attr("width", 460).attr("height",height).attr("fill", "#ff0000");
            
            var brushg = svg.append("g")
                .attr("class", "brush")
                .call(brush);
            
            brushg.selectAll(".resize").append("path")
                .attr("transform", "translate(0," +  height / 2 + ")")
                .attr("d", arc);
                        
            brushg.selectAll("rect")
                .attr("height", height);
            
            brushstart();
            brushmove();
            
            /**
             * Start brush event handler. 
             */
            function brushstart() {
                svg.classed("selecting", true);
            }
            
            /**
             * Brush move event handler. 
             */
            function brushmove() {
                var s = brush.extent();
                leftRect.attr("width", xScale(s[0]));
                rightRect.attr('x', xScale(s[1])).attr("width", width - xScale(s[1]));
            }
            
            /**
             * Brush end moving handler. 
             */
            function brushend() {
                var s = brush.extent();
                svg.classed("selecting", !d3.event.target.empty());
                scope.$apply(function() {
                    if (!scope.isFlipped) {
                        scope.marker1 = s[0];
                        scope.marker2 = s[1];
                    }
                    else {
                        scope.marker1 = s[1];
                        scope.marker2 = s[0];                        
                    }
                });
            }
            
            /**
             * Watches for flip scale.
             * @param {number} newVal
             * @param {number} oldVal
             */
            scope.$watch("isFlipped", function(newVal, oldVal) {
                if (newVal === oldVal) {
                    return;       
                }
                
                setSliderDomain();
                               
                // Flip axis and flip brush
                svg.select(".x.axis")
                    .transition()
                    .duration(750)
                    .call(xAxis)
                    .each("end", function() {
                        var s = brush.extent();
                        brush.extent([s[1], s[0]]); // flip brush
                        svg.select('.brush').call(brush);
                        brushmove();
                        scope.$apply(function() {
                            var s = brush.extent();
                            if (!scope.isFlipped) {
                                scope.marker1 = Math.min(s[0], s[1]);
                                scope.marker2 = Math.max(s[0], s[1]);
                            }
                            else {
                                scope.marker2 = Math.min(s[0], s[1]);
                                scope.marker1 = Math.max(s[0], s[1]);
                                
                            }
                        });                   
                    });
             });
            
            /**
             * Sets the domain for the xScale on the slider. 
             */
            function setSliderDomain () {
                if (!scope.isFlipped) {
                    xScale.domain([scope.leftRange, scope.rightRange]);
                }
                else {
                    xScale.domain([scope.rightRange, scope.leftRange]);
                }                
            }
        }
    };
});