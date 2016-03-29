/**
 * Copyright 2014 General Dynamics Information Technology.
 */
'use strict';


/**
 * Social Media Angular controller for BDA spatial application.
 */
bdaSpatialApp.controller('socialMediaCtrl', function ($scope, socialMediaService) {

    $scope.socialMediaService = socialMediaService;

    $scope.displayTweet = false;
    $scope.deleteTweet = false;
    $scope.displayKML = false;
    $scope.deleteKML = false;
    $scope.tweetDisplayError = false;

    var TweetTypes = {TEST0: 'Website', TEST1: 'Storm', TEST2: 'Storm200', TEST3: 'Test1988', TEST4: 'Test6653', TEST5: 'Ebola'};
    var FacebookTypes = {WEBSITE: 'Website'};
    var YouTubeTypes = {WEBSITE: 'Website'};
    var WeiboTypes = {WEBSITE: 'Weibo Website'};
    var VKontakteTypes = {WEBSITE: 'VKontakte Website'};
    var TumblrTypes = {WEBSITE: 'Website'};
    var InstagramTypes = {WEBSITE: 'Website'};
//    var MiscTypes = {GSFACILITIES: "Global Science Sites", HSANDY: "Hurricane Sandy" }
    var MiscTypes = {GSFACILITIES: 'Global Science Sites'}

//        {type : $scope.socialMediaService.ProductTypes.MISC, parameter : MiscTypes.HSANDY, source: $scope.socialMediaService.ProductSource.REQUEST},
    var staticProducts = [
        {type : $scope.socialMediaService.ProductTypes.TWEETS, parameter : TweetTypes.TEST0, source: $scope.socialMediaService.ProductSource.LINK},
        {type : $scope.socialMediaService.ProductTypes.TWEETS, parameter : TweetTypes.TEST1, source: $scope.socialMediaService.ProductSource.REQUEST},
        {type : $scope.socialMediaService.ProductTypes.TWEETS, parameter : TweetTypes.TEST2, source: $scope.socialMediaService.ProductSource.REQUEST},
        {type : $scope.socialMediaService.ProductTypes.TWEETS, parameter : TweetTypes.TEST3, source: $scope.socialMediaService.ProductSource.REQUEST},
        {type : $scope.socialMediaService.ProductTypes.TWEETS, parameter : TweetTypes.TEST4, source: $scope.socialMediaService.ProductSource.REQUEST},
        {type : $scope.socialMediaService.ProductTypes.TWEETS, parameter : TweetTypes.TEST5, source: $scope.socialMediaService.ProductSource.REQUEST},
        {type : $scope.socialMediaService.ProductTypes.FACEBOOK, parameter : FacebookTypes.WEBSITE, source: $scope.socialMediaService.ProductSource.LINK},
        {type : $scope.socialMediaService.ProductTypes.YOUTUBE, parameter : YouTubeTypes.WEBSITE, source: $scope.socialMediaService.ProductSource.LINK},
        {type : $scope.socialMediaService.ProductTypes.CHINA, parameter : WeiboTypes.WEBSITE, source: $scope.socialMediaService.ProductSource.LINK},
        {type : $scope.socialMediaService.ProductTypes.RUSSIA, parameter : VKontakteTypes.WEBSITE, source: $scope.socialMediaService.ProductSource.LINK},
        {type : $scope.socialMediaService.ProductTypes.TUMBLER, parameter : TumblrTypes.WEBSITE, source: $scope.socialMediaService.ProductSource.LINK},
        {type : $scope.socialMediaService.ProductTypes.INSTAGRAM, parameter : InstagramTypes.WEBSITE, source: $scope.socialMediaService.ProductSource.LINK},
        {type : $scope.socialMediaService.ProductTypes.MISC, parameter : MiscTypes.GSFACILITIES, source: $scope.socialMediaService.ProductSource.REQUEST},
     ];

    // Add the static products
    $scope.socialMediaService.addProducts(staticProducts);

    $scope.$watch('tweetDisplayError', function(newVal, oldVal, scope) {
        if (newVal) {
            var product = scope.socialMediaService.getProductById(newVal);
            if (product !== undefined) {
                product.status = $scope.socialMediaService.ProductStatus.ERROR;
                product.tooltip = 'Error requesting tweets';
                scope.tweetDisplayError = false;
            }
        }
    });

    /**
     * Processes the click on a product in the treeview.
     * @param {{nodeLabel:String, type: String, parameter: String, productId: String, status:String, tooltip:String}} product
     */
    $scope.doClick = function(product) {

       if (product.status != $scope.socialMediaService.ProductStatus.REQUESTED) {
            switch (product.type) {
            	case $scope.socialMediaService.ProductTypes.TWEETS:
            	    switch (product.parameter) {
            	        case TweetTypes.TEST0:
        	            	window.open("https://twitter.com");
            	    	    break;
            	        case TweetTypes.TEST1:
            	        case TweetTypes.TEST2:
            	        case TweetTypes.TEST3:
            	        case TweetTypes.TEST4:
                        case TweetTypes.TEST5:
            	        	$scope.displayTweet = {id: product.productId, filename: 'tweets-'+ product.parameter + '.czml'};
            	    	    break;
            	        default:
                            product.status = $scope.socialMediaService.ProductStatus.ERROR;
                            throw new Error('Product type TWEETS parameter ' + product.parameter + ' currently not supported 1 ');
            	    }
                    break;
            	case $scope.socialMediaService.ProductTypes.MISC:
            	    switch (product.parameter) {
                    case MiscTypes.GSFACILITIES:
                    	$scope.displayKML = {id: product.productId, filename: 'GlobalScienceFacilities.kml'};
                    	break;
                    case MiscTypes.HSANDY:
                    	$scope.displayKML = {id: product.productId, filename: 'HurricaneSandy.kmz'};
                    	break;
        	        default:
                        product.status = $scope.socialMediaService.ProductStatus.ERROR;
                        throw new Error('Product type MISC parameter ' + product.parameter + ' currently not supported 1 ');
        	        }
                    break;
            	case $scope.socialMediaService.ProductTypes.FACEBOOK:
	            	window.open("https://www.facebook.com");
                    break;
            	case $scope.socialMediaService.ProductTypes.YOUTUBE:
	            	window.open("http://www.youtube.com");
                    break;
            	case $scope.socialMediaService.ProductTypes.CHINA:
	            	window.open("https://weibo.com");
                    break;
            	case $scope.socialMediaService.ProductTypes.RUSSIA:
	            	window.open("https://vk.com");
                    break;
            	case $scope.socialMediaService.ProductTypes.TUMBLER:
	            	window.open("https://www.tumblr.com");
                    break;
            	case $scope.socialMediaService.ProductTypes.INSTAGRAM:
	            	window.open("http://www.instagram.com");
                    break;
                default:
                    product.status = $scope.socialMediaService.ProductStatus.ERROR;
                    throw new Error('Product type ' + product.type + ' currently not supported 1 ' + product.parameter);
            }

            if (product.status == $scope.socialMediaService.ProductStatus.HYPERLINK) {
                product.status = $scope.socialMediaService.ProductStatus.FOLLOWED_HYPERLINK;
            }
            else if (product.status != $scope.socialMediaService.ProductStatus.FOLLOWED_HYPERLINK) {
                product.status = $scope.socialMediaService.ProductStatus.REQUESTED;
                product.tooltip = product.tooltip.replace('request', 'cancel');
            }
        }
        else {
        	// Delete the overlay
            switch (product.type) {
                case $scope.socialMediaService.ProductTypes.TWEETS:
            	    switch (product.parameter) {
        	            case TweetTypes.TEST0:
        	    	        break;
        	            case TweetTypes.TEST1:
        	            case TweetTypes.TEST2:
        	            case TweetTypes.TEST3:
        	            case TweetTypes.TEST4:
                        case TweetTypes.TEST5:
                            $scope.deleteTweet = 'tweets-'+ product.parameter + '.czml';
        	    	        break;
        	            default:
                            product.status = $scope.socialMediaService.ProductStatus.ERROR;
                            throw new Error('Product type TWEETS parameter ' + product.parameter + ' currently not supported 1 ');
         	        }
                    break;
                case $scope.socialMediaService.ProductTypes.MISC:
            	    switch (product.parameter) {
                        case MiscTypes.GSFACILITIES:
                        	$scope.deleteKML = 'GlobalScienceFacilities.kml';
                        	break;
                        case MiscTypes.HSANDY:
                        	$scope.deleteKML = 'HurricaneSandy.kmz';
                        	break;
        	            default:
                            product.status = $scope.socialMediaService.ProductStatus.ERROR;
                            throw new Error('Product type MISC parameter ' + product.parameter + ' currently not supported 1 ');
         	        }
                    break;
                case $scope.socialMediaService.ProductTypes.FACEBOOK:
                    break;
                case $scope.socialMediaService.ProductTypes.YOUTUBE:
                    break;
                case $scope.socialMediaService.ProductTypes.CHINA:
                    break;
                case $scope.socialMediaService.ProductTypes.RUSSIA:
                    break;
                case $scope.socialMediaService.ProductTypes.TUMBLER:
                    break;
                case $scope.socialMediaService.ProductTypes.INSTAGRAM:
                    break;
                default:
                    product.status = $scope.socialMediaService.ProductStatus.ERROR;
                    throw new Error('Product type ' + product.type + ' currently not supported 2 ' + product.parameter);
            }

            product.status = $scope.socialMediaService.ProductStatus.AVAILABLE;
            product.tooltip = product.tooltip.replace('cancel',  'request');
        }
    };
});
