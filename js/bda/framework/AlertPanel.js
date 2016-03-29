bdaSpatialApp.controller("AlertPanelCtrl", function($scope, alertService) {

    var expanded = false;
    var maxEntryCount = 25;
    var entryCount = 0;
    var alertScroller = document.getElementById("alertScroller");
    var alertExpander = document.getElementById("alertExpander");
    var currentAlertDisplay = new CurrentAlertDisplay();
    var scrollerItemFlasher = new ScrollerItemFlasher();
    
    alertService.messageHandler = function(message) {
        var scrollerItem;
        if (entryCount < maxEntryCount) {
            entryCount++;
            scrollerItem = document.createElement("div");
            alertScroller.appendChild(scrollerItem);
        } else {
            var scrollerItems = alertScroller.children;
            var maxIndex = scrollerItems.length - 1;
            for (i = 0; i < maxIndex; i++) {
                scrollerItems[i].innerHTML = scrollerItems[i+1].innerHTML;
            }
            scrollerItem = scrollerItems[maxIndex];
        }
        scrollerItem.innerHTML = message;
        if (expanded) {
            alertScroller.scrollTop = alertScroller.scrollHeight;
        } else {
            currentAlertDisplay.show(message);
        }
        scrollerItemFlasher.flash(scrollerItem);
    };

    $scope.expand = function() {
        if (expanded) {
            expanded = false;
            alertExpander.style.backgroundImage = "url(resources/icons/down.png)";
            animateScrollerExpand(-5, 60);
        } else {
            expanded = true;
            currentAlertDisplay.hide();
            alertExpander.style.backgroundImage = "url(resources/icons/up.png)";
            animateScrollerExpand(5, 60);
        }
    };
    
    $scope.selectCurrentAlert = function() {
        alertService.fireSelection();
        currentAlertDisplay.hide();
    };

    function animateScrollerExpand(yDelta, amount) {
        var height = parseInt(alertScroller.style.height.substring(
            0, alertScroller.style.height.length - 2));
        var y = parseInt(alertExpander.style.top.substring(
            0, alertExpander.style.top.length - 2));
        var count = 0;
        var endCount = Math.abs(amount / yDelta);

        function frame() {
            y += yDelta;
            height += yDelta;
            count++;
            alertExpander.style.top = y + "px";
            alertScroller.style.height = height + "px";
            alertScroller.scrollTop = alertScroller.scrollHeight;
            if (count >= endCount) {
                clearInterval(id);
            }
        }

        var id = setInterval(frame, 10);
    }
    
    function CurrentAlertDisplay() {
        
        var currentAlert = document.getElementById("currentAlert");
        var frameLength = 50;
        var animationId;
        
        this.hide = function() {
            clearInterval(animationId);
            currentAlert.style.visibility = "hidden";
        };
        
        this.show = function(message) {
            clearInterval(animationId);
            currentAlert.style.visibility = "visible";
            currentAlert.style.opacity = 1.0;
            currentAlert.innerHTML = message;
            var opacity = 1.0;
            var timeToPersist = 10000;
        
            function frame() {
                if (timeToPersist > 0) {
                    timeToPersist -= frameLength;
                } else {
                    opacity -= 0.02;
                    if (opacity > 0) {
                        currentAlert.style.opacity = opacity;
                    } else {
                        currentAlertDisplay.hide();
                    }
                }
            }
            
            animationId = setInterval(frame, frameLength);
        };
    };
    
    function ScrollerItemFlasher() {
        var currentElement = null;
        var frameLength = 50;
        var animationId;
        
        this.stop = function() {
            if (currentElement != null) {
                clearInterval(animationId);
                currentElement.className = "";
                currentElement.onclick = null;
                currentElement = null;
            }
        };
        
        this.flash = function(element) {
            this.stop();
            currentElement = element;
            currentElement.className = "alert-flashing";
            currentElement.onclick = function() {
                $scope.selectCurrentAlert();
                scrollerItemFlasher.stop();
            };
            
            var timeToPersist = 10000;
            
            function frame() {
                if (timeToPersist > 0) {
                    timeToPersist -= frameLength;
                } else {
                    scrollerItemFlasher.stop();
                }
            }
            
            animationId = setInterval(frame, frameLength);
        };
    };
});