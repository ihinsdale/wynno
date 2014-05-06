'use strict';

angular.module('wynnoApp.services')
.factory('filterBuilderModalService', ['$modalInstance', function($modalInstance) {
  var service = {
    close: function() {
      return $modalInstance.close;
    },
    dismiss: function() {
      return $modalInstance.dismiss;
    }
  };
}]);