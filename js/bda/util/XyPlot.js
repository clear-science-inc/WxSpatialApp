/**
 * Copyright 2014 General Dynamics Information Technology.
 */

'use strict';

/**
 * D3 plot functionality. 
 */
angular.module('bda.xyPlot',[]).directive('xyplotDir', function() {


    return {
        restrict : 'E',
        terminal : true,
        scope : {
            plotdata : '=',
            plottype : '=',
            thresholddata : '=',
            currenttime : '=',
            isthresholded : '=',
            applythreshold : '=',
            parentid : '@'
        },
        link : function(scope, element, attrs) {

            /** @const */ var DURATION = 750;     // 750 ms
            /** @const */ var WIDTH = 540;
            /** @const */ var HEIGHT = 330;
            /** @const */ var W_PADDING = 50;
            /** @const */ var H_PADDING = 74;
            /** @const */ var TOP_PADDING = 20;
            /** @const */ var CLIP_NAMES = ["severe", "marginal", "good"];
                       
            var yAxisLabel;
            
            //Create SVG element
            var svg = d3.select(element[0]).append("svg").attr("width", WIDTH).attr("height", HEIGHT);
            
            var envData;
            var timeData;
            var oldTime = 0;

            // Create scales
            var xScale = d3.time.scale.utc().range([W_PADDING, WIDTH - W_PADDING]);
            var yScale = d3.scale.linear().range([HEIGHT - H_PADDING, TOP_PADDING]);

            // Create axes
            var xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(9).tickFormat(d3.time.format.utc("%b %d#%H:%M"));
            var yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(5);
                
            // Create Lines
            var line = d3.svg.line()
                .defined(function(d) { return d[scope.plottype] != null; })
                .interpolate("linear")
                .x(function(d) {return xScale(d.time);})
                .y(function(d) {return yScale(d[scope.plottype]);});
                                        
            var currentTimeLine = d3.svg.line()
                .defined(function(d) { return d.height != null; })
                .x(function(d) {return xScale(d.time);})
                .y(function(d) {return d.height;});
                

            // Get parent node, so can extract scale from it
            var parentNode = document.getElementById(attrs.parentid);
            
            /**
             * Watches for scope changes on plotdata and updates the plot.
             * @param {{unitsData:Object, lineData: Object[]} newVal
             * @param {{unitsData:Object, lineData: Object[]} oldVal
             */
            scope.$watch('plotdata', function(newVal, oldVal) {

                // if 'plotdata' is undefined, exit
                if (!newVal || typeof newVal === 'undefined' || typeof newVal.lineData === 'undefined') {
                    return;
                }

                if (newVal.lineData.length == 1) {
                    throw ('Error: line needs at least 2 points');
                    return;
                }

                yAxisLabel = newVal.unitsData;
                               
                envData = newVal.lineData.sort(function(envData1, envData2) { return d3.ascending(envData1.time, envData2.time);});
                    
                // Attach data to  Line
                var needsToBeInitialized = svg.selectAll("path");
                if (needsToBeInitialized[0].length == 0) {
                    // Set scale domain functions
                    xScale.domain([new Date(envData[0].time), new Date(envData[envData.length -1].time)]).range([W_PADDING, WIDTH - W_PADDING]); 
                    yScale.domain([d3.min(envData, function(d) {return d[scope.plottype];}), d3.max(envData, function(d) {
                        return d[scope.plottype];
                    })]).range([HEIGHT - H_PADDING, TOP_PADDING]);
                    
                    // Add line with envData data
                    svg.append("svg:path").attr("d", line(envData)).attr("id", "d3plotline");
        
                    // Add time line
                    oldTime = scope.currenttime;
                    timeData = [{'time': scope.currenttime, 'height': (HEIGHT - H_PADDING)}, {'time': scope.currenttime, 'height': TOP_PADDING}];
                    svg.append("svg:path").attr("d", currentTimeLine(timeData)).attr("id", "timeLine");
                        
                    if (scope.isthresholded) {
                        // Add thesholding lines
                        scope.applythreshold();
                    }
                    
                    // Add Axes
                    svg.append("g").attr("class", "x axis").attr("id", "xAxis")
                        .attr("transform", "translate(0," + (HEIGHT - H_PADDING) + ")").call(xAxis);
                    svg.append("g").attr("class", "y axis")
                        .attr("transform", "translate(" + W_PADDING + ", 0)").call(yAxis);
                                                    
                    svg.selectAll('#xAxis g text').each(insertLineBreaks);
                    
                    // Label the x axis with Date
                    svg.append("text")
                        .attr("x", 245 )
                        .attr("y",  310)
                        .style("text-anchor", "middle")
                        .style("fill", "#eee")
                        .attr("font-family", "sans-serif")
                        .attr("font-size", "12px")
                        .text("Date UTC");
                        
                    // Label the y axis 
                    svg.append("text")
                        .attr("id", "yLabel")
                        .attr("transform", "rotate(-90)")
                        .attr("x", 30 - HEIGHT/2)
                        .attr("y", 14)
                        .attr("font-family", "sans-serif")
                        .attr("font-size", "12px")
                        .style("text-anchor", "middle")
                        .style("fill", "#eee")
                        .text(yAxisLabel[scope.plottype]);
                                                
                    // Create clipPaths for thresholding
                    svg.append("clipPath").attr("id", "clip-severe").append("rect");                      
                    svg.append("clipPath").attr("id", "clip-marginal").append("rect");                                            
                    svg.append("clipPath").attr("id", "clip-good").append("rect");
                            
                    if (scope.thresholddata) {
                        setThresholdClipAttributes();
                    }
                      
                    // Set thresholding clips
                    svg.selectAll(".line")
                        .data(CLIP_NAMES)
                        .enter().append("path")
                        .attr("class", function(d) { 
                            return "line " + d; })
                        .attr("clip-path", function(d) { 
                            return "url(#clip-" + d + ")"; })
                        .datum(envData)
                        .attr("d", line);
                        
                    // Add focus to display value
                    var d3pfocus = svg.append("g")
                        .attr("class", "d3pfocus")
                        .style("display", "none");
                        
                    d3pfocus.append("line")
                        .attr("class", "y0")
                        .attr("x1", WIDTH - 6) 
                        .attr("x2", WIDTH + 6);
                
                    d3pfocus.append("circle")
                        .attr("class", "y0")
                        .attr("r", 4);
                
                    d3pfocus.append("text")
                        .attr("class", "y0")
                        .attr("dy", "-1em");
                    
          
                    var bisectDate = d3.bisector(function(d) { return d.time; }).left;
                    
                    /**
                     * Formats the read out text with date, data, and units.
                     * @return {String} 
                     */
                    var formatReadout = function(d) { 
                        var readoutText = "";
                        try {
                            var date = new Date(d.time);
                            var formattedTime = d3.time.format.utc("%b %d %H:%M")(date);
                            var readoutText = formattedTime + "  " + d3.format(".1f")(d[scope.plottype]);
                 
                            // Add units from yAxisLabel[scope.plottype]
                            if (yAxisLabel[scope.plottype].indexOf('(') > 0) {
                                readoutText += yAxisLabel[scope.plottype].substring(yAxisLabel[scope.plottype].indexOf('(') + 1, 
                                    yAxisLabel[scope.plottype].indexOf(')'));
                            }
                        }
                        catch (error) {
                            console.error('got error: ' + error);
                        }
                     
                        return readoutText;
                    };
        
                    /**
                     * Catches mouse move events on plot and displays closest
                     * data point as a circle and displays a dotted line over 
                     * to y axis. 
                     */
                    var mousemove = function() {
                        if (!envData[0][scope.plottype]) {
                            return;
                        }
                        
                        var scaled = getScale();
                        var x0 = xScale.invert(d3.mouse(this)[0] / scaled);
                        var i = bisectDate(envData, x0, 1);
                        if (i == envData.length) {
                            i--;
                        }
                        else if (i == 0) {
                            i++;
                        }
                        var d0 = envData[i - 1];
                        var d1 = envData[i];
                        
                        var d = x0 - d0.time > d1.time - x0 ? d1 : d0;
                        
                        var widthOffset = WIDTH - (W_PADDING + 6);
                        d3pfocus.select("circle.y0").attr("transform", "translate(" + xScale(d.time) + "," + yScale(d[scope.plottype]) + ")");
                        d3pfocus.select("text.y0").attr("transform", "translate(" + xScale(d.time) + "," + yScale(d[scope.plottype]) + ")").text(formatReadout(d));
                        d3pfocus.select(".x").attr("transform", "translate(" + xScale(d.time) + ",0)");
                        d3pfocus.select(".y0").attr("transform", "translate(" + widthOffset * -1 + ", " + yScale(d[scope.plottype]) + ")").attr("x2", widthOffset + xScale(d.time));
                        
                        function getScale() {
                            var scale = .7;
                            if (parentNode.style.transform && parentNode.style.transform.indexOf("scale(") >= 0) {
                                var transform = parentNode.style.transform;
                                var scaleStr = transform.substring(transform.indexOf("scale(")+6, transform.indexOf(")"));
                                scale = parseFloat(scaleStr);
                            }
                            
                            return scale;
                        }
                    };
                    
                    // Set up rectangle in plot to get mouse events
                    svg.append("rect")
                        .attr("class", "d3poverlay")
                        .attr("width", WIDTH - W_PADDING * 2)
                        .attr("height", HEIGHT - H_PADDING)
                        .attr("x", W_PADDING)
                        .on("mouseover", function() { d3pfocus.style("display", null); })
                        .on("mouseout", function() { d3pfocus.style("display", "none"); })
                        .on("mousemove", mousemove);
                }
                else {
                    updatePlot();
                }
            });
            
            /**
             * Sets the thresholding clip attributes. 
             */
            function setThresholdClipAttributes() {
                
                var yMinMax = yScale.domain();
                var min = yMinMax[0];
                var max = yMinMax[1];
                if (typeof min == undefined|| typeof max == undefined) {
                    // min/max is not set because there is no data for plottype
                    return;
                }
                
                svg.select("#clip-good").select("rect")
                    .transition().duration(DURATION)
                    .attr("y",  function(d) { 
                        var y = 0;
                        if (scope.thresholddata.severeData[scope.plottype] > scope.thresholddata.marginalData[scope.plottype]) {
                            // Bottom of plot
                             y = yScale(scope.thresholddata.marginalData[scope.plottype]);
                        }
                        else {
                            // Top of plot
                            y = yScale(max);                            
                        }
                        return y; })                                                        
                    .attr("width", WIDTH)
                    .attr("height", function(d) { 
                        var height = 0;
                        if (scope.thresholddata.severeData[scope.plottype] > scope.thresholddata.marginalData[scope.plottype]) {
                            height = yScale(min) - yScale(scope.thresholddata.marginalData[scope.plottype]);
                        }
                        else {
                            // Top of plot
                            height = yScale(scope.thresholddata.marginalData[scope.plottype]) - yScale(max);
                        }
                        return height; });
                      
                svg.select("#clip-marginal").select("rect")
                    .transition().duration(DURATION)
                    .attr("y", function(d) { 
                        var y = 0;
                        if (scope.thresholddata.severeData[scope.plottype] > scope.thresholddata.marginalData[scope.plottype]) {
                            y = yScale(scope.thresholddata.severeData[scope.plottype]);
                        }
                        else {
                            y = yScale(scope.thresholddata.marginalData[scope.plottype]);
                        }
                        return y;})
                    .attr("width", WIDTH)
                    .attr("height", Math.abs(yScale(scope.thresholddata.severeData[scope.plottype]) - yScale(scope.thresholddata.marginalData[scope.plottype])));

                svg.select("#clip-severe").select("rect")
                    .transition().duration(DURATION)
                    .attr("y", function(d) { 
                        var y = 0;
                        if (scope.thresholddata.severeData[scope.plottype] > scope.thresholddata.marginalData[scope.plottype]) {
                            // Top of plot
                            y = yScale(max);                            
                        }
                        else {
                            y = yScale(scope.thresholddata.severeData[scope.plottype]);
                        }
                        return y;})
                    .attr("width", WIDTH)
                    .attr("height", function(d) { 
                        var height = 0;
                        if (scope.thresholddata.severeData[scope.plottype] > scope.thresholddata.marginalData[scope.plottype]) {
                            height = yScale(scope.thresholddata.severeData[scope.plottype]) - yScale(max);
                        }
                        else {
                            // Bottom of plot
                            height = yScale(min) - yScale(scope.thresholddata.severeData[scope.plottype]);
                        }
                        return height; });
                 
            }
            
            /**
             * Inserts line breaks so the x-axis labels show as 2 lines. 
             */
            function insertLineBreaks() {
                var el = d3.select(this);
                var words=d3.select(this).text().split('#');
            
                el.text('');
            
                for (var i = 0; i < words.length; i++) {
                    var tspan = el.append('tspan').text(words[i]);
                    if (i > 0) {
                        tspan.attr('x', 0).attr('dy', '15');
                    }
                };
            }     

            /**
             * Updates the plots lines and axes. 
             */
            function updatePlot() {
                if (typeof envData === 'undefined') {
                    return;
                }
                
                // Adjust scales' min and max
                xScale.domain([new Date(envData[0].time), new Date(envData[envData.length -1].time)]).range([W_PADDING, WIDTH - W_PADDING]); 
                
                if (envData[0][scope.plottype] || envData[0][scope.plottype] == 0) {
                    if (scope.thresholddata) {
                        var min = Math.min(d3.min(envData, function(d) {return d[scope.plottype];}),
                            scope.thresholddata.marginalData[scope.plottype], 
                            scope.thresholddata.severeData[scope.plottype]);
                        var max = Math.max(d3.max(envData, function(d) {return d[scope.plottype];}),
                            scope.thresholddata.marginalData[scope.plottype], 
                            scope.thresholddata.severeData[scope.plottype]);
                        yScale.domain([min, max]).range([HEIGHT - H_PADDING, TOP_PADDING]);
                    }
                    else {
                        yScale.domain([d3.min(envData, function(d) {return d[scope.plottype];}), d3.max(envData, function(d) {
                            return d[scope.plottype];
                        })]).range([HEIGHT - H_PADDING, TOP_PADDING]);
                    }
                }
                
                svg.select('#d3plotline')
                    .datum(envData)     // set the new data
                    .transition()       // start a transition to bring the new value into view
                    .attr("d", line)    // apply the new data values 
                    .ease("linear")
                    .duration(DURATION);
                    
                if (scope.thresholddata) {
                    setThresholdClipAttributes();             
                        
                    svg.selectAll(".line")
                        .data(CLIP_NAMES)
                        .attr("clip-path", function(d) { 
                            return "url(#clip-" + d + ")"; })
                        .datum(envData)
                        .transition()
                        .attr("d", line)
                        .ease("linear")
                        .duration(DURATION);     
                }                    
                
                svg.select(".y.axis")   // update the y axis
                    .transition()
                    .duration(DURATION)
                    .call(yAxis);   
                    
                svg.select("#yLabel").text(yAxisLabel[scope.plottype]);

                svg.select(".x.axis")   // update the x axis
                    .transition()
                    .duration(DURATION)
                    .call(xAxis);   
                        
                svg.selectAll('#xAxis g text').each(insertLineBreaks);
            };                                                                      
           
            /**
             * Updates the vertical time line in the xy plot. 
             */
            function updateTime() {
                if (typeof envData === 'undefined') {
                    return;
                }
                else if (scope.currenttime > envData[envData.length -1].time) {
                    timeData[0].time = envData[envData.length -1].time;
                    timeData[1].time = envData[envData.length -1].time;
                }
                else if (scope.currenttime < envData[0].time) {
                    timeData[0].time = envData[0].time;
                    timeData[1].time = envData[0].time;
                }
                else if (typeof timeData !== 'undefined') {                    
                    timeData[0].time = scope.currenttime;
                    timeData[1].time = scope.currenttime;
                }
                    
                svg.select('#timeLine')
                    .datum(timeData)
                    .transition() 
                    .attr("d", currentTimeLine)
                    .ease("linear")
                    .duration(150);   
            }  
                                                             
            /**
             * Watches for scope changes on plottype and updates the plot
             * lines with the selected plottype data.
             * @param {number} newVal
             * @param {number} oldVal
             */
            scope.$watch('plottype', function(newVal, oldVal) {
                // ignore first call which happens before we even have data
                if (newVal === oldVal) {
                    return;
                }
                if (newVal) {
                    updatePlot();
                }
            });
                        
            /**
             * Watches for scope changes on thresholddata and updates the plot
             * lines accordingly.
             * @param {{marginalData: Object[], severeData: Object[]}} newVal
             * @param {{marginalData: Object[], severeData: Object[]}} oldVal
             */
            scope.$watch('thresholddata', function(newVal, oldVal) {
                // ignore first call which happens before we even have data
                if (newVal === oldVal) {
                    return;
                }
                if (newVal) {
                   svg.select('#d3plotline').attr('display', 'none');
                    
                    // Toggle on clippaths
                    svg.selectAll(".line")
                        .data(CLIP_NAMES)
                        .attr("clip-path", function(d) { 
                            return "url(#clip-" + d + ")"; })
                        .attr('display', 'block');
                    updatePlot();
                }
                else {
                    // Toggle off clippaths
                    svg.selectAll(".line")
                        .data(CLIP_NAMES)
                        .attr("clip-path", function(d) { 
                            return "url(#clip-" + d + ")"; })
                        .attr('display', 'none');
                    svg.select('#d3plotline').attr('display', 'block');
               }
            });
                        
            /**
             * Watches for scope changes on currenttime and updates the plot
             * current time line accordingly.
             * @param {number} newVal The new current time in ms
             * @param {number} oldVal The old current time in ms
             */
            scope.$watch('currenttime', function(newVal, oldVal) {
                // ignore first call which happens before we even have data
                if (newVal === oldVal) {
                    return;
                }
                if (newVal) {
                    if (Math.abs(newVal - oldTime) > 1000) {
                        updateTime();   // update every 1 sec
                    }
                }
            });
        }        
    };
})

// XY Plot Controller business logic
.controller('XyPlotCtrl', function XyPlotCtrl($scope, thresholdingService) {

    $scope.thresholdingService = thresholdingService;

    // initialize the model
    $scope.parameters = initializeParameters(); // used by radio buttons and MapController
    $scope.plotBy = $scope.parameters[3];
    $scope.currentPlot;
    $scope.data;
    $scope.currentTime;
    $scope.isThresholded = false;
    
    /**
     * Changes plot with new plot data.
     * @param {string} plotName
     * @param {{unitsData:Object, lineData: Object[]} data
     */
    $scope.changePlot = function(plotName, data) {
        $scope.data = data;
        $scope.currentPlot = plotName;
        if (plotName !== undefined) {
            // See if any of plot options need to be disabled/enabled
            var radioButtons = angular.element(document.getElementsByName("plotTypeRadioButton"));
            var labels = angular.element(document.getElementsByClassName('plotTypeLabel'));
            
            for (var i=0; i<$scope.thresholdingService.thresholdingParameters.length; i++) {
                var parameter = $scope.thresholdingService.thresholdingParameters[i].name;
                var found = false;
                for (var j=0; j<data.lineData.length; j++) {
                    if (data.lineData[j][parameter] != null) {
                        found = true;
                        break;
                    }
                }
                
                for (var j=0; j<radioButtons.length; j++) {
                    if (radioButtons[j].value == parameter) {
                        radioButtons[j].disabled = !found;
                        if (!found && radioButtons[j].checked) {
                            $scope.plotBy = $scope.parameters[1];   // use a parameter in common
                        }
                        break;
                    }
                }
                
                for (var j=0; j<labels.length; j++) {
                    if ($scope.thresholdingService.thresholdingParameters[i].label == labels[j].textContent) {
                        labels[j].style.color = found ? 'white' : 'gray';
                    }
                }
            }
                        
            if ($scope.isThresholded) {
                // Update threshold to match to new time
                $scope.applyThreshold();
            }
            
            // Apply the new data
            $scope.$apply();
        }
    };      
    
    /**
     * Watches for scope changes on thresholdingApplied and updates the plot
     * lines accordingly.
     * @param {number} newVal
     * @param {number} oldVal
     */
    $scope.$watch("thresholdingService.thresholdingApplied", function(newVal, oldVal) {
        if (newVal == 0) {
            clearThreshold();        
        }
        else if (newVal > 0) {
            $scope.applyThreshold();
        }
    });
      
    /** 
     * Apply defined thresholds to xy plot. 
     */
    $scope.applyThreshold = function() {
        
        if (typeof $scope.data != 'undefined' && typeof $scope.data.lineData != 'undefined') {
            $scope.thresholdData = {};    
            var marginalData = [];
            var severeData = [];
            
            for (var i=0; i<$scope.thresholdingService.thresholdingParameters.length; i++) {
                marginalData[$scope.thresholdingService.thresholdingParameters[i].name] = $scope.thresholdingService.thresholdingParameters[i].marginal;
                severeData[$scope.thresholdingService.thresholdingParameters[i].name] = $scope.thresholdingService.thresholdingParameters[i].severe;
            }
    
            var thresholds = { 'marginalData': marginalData, 'severeData': severeData};
            
            $scope.thresholdData = thresholds;
        }
        
        $scope.isThresholded = true;
    };
    
    /** 
     * Clear the xy plot. 
     */
    $scope.clearPlot = function() {
        $scope.data = {};
        $scope.currentPlot = undefined;
        clearThreshold();
    };
    
    /**
     * Clear the thresholds from xy plot. 
     */
    function clearThreshold() {
        $scope.isThresholded = false;
        $scope.thresholdData = null;
    }
    
    /**
     * Initializes the radio button parameters with thresholding parameter
     * names.
     */
    function initializeParameters() {
        var parameters = [];
        for (var i=0; i<$scope.thresholdingService.thresholdingParameters.length; i++) {
            parameters.push($scope.thresholdingService.thresholdingParameters[i].name);
        }
        
        return parameters;
    }
});