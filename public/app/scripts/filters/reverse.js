angular.module('wynnoApp.filters', [])
.filter('reverse', function() {
  return function(items) {
  	if (items.length) {
  	  return items.slice().reverse();	
  	} else {
  	  return items
  	}

  };
});