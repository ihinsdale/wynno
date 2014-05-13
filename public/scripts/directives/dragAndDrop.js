'use strict';

// Cf. http://blog.parkji.co.uk/2013/08/11/native-drag-and-drop-in-angularjs.html

angular.module('wynnoApp.directives')
.directive('draggable', function() {
    return function(scope, element) {
        // this gives us the native JS object
        var el = element[0];

        el.draggable = true;

        el.addEventListener(
          'dragstart',
          function(e) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('Text', this.id);
            this.classList.add('drag');
            return false;
          },
          false
        );

        el.addEventListener(
          'dragend',
          function(e) {
            this.classList.remove('drag');
            return false;
          },
          false
        );
    }
})
.directive('droppable', function() {
    return {
        scope: {
          drop: '&', // parent
          bin: '=' // bi-directional scope
        },
        link: function(scope, element) {
            // again we need the native object
            var el = element[0];

            el.addEventListener(
              'dragover',
              function(e) {
                e.dataTransfer.dropEffect = 'move';
                // allows us to drop
                if (e.preventDefault) e.preventDefault();
                this.classList.add('over');
                return false;
              },
              false
            );

            el.addEventListener(
              'dragenter',
              function(e) {
                this.classList.add('over');

                var binId = this.id;
                var item = document.getElementById(e.dataTransfer.getData('Text'));
                // if entered bin is above source, move items in between down
                
                // if entered bin is below source, move items in between up
                return false;
              },
              false
            );

            el.addEventListener(
              'dragleave',
              function(e) {
                this.classList.remove('over');

                var binId = this.id;
                return false;
              },
              false
            );

            el.addEventListener(
              'drop',
              function(e) {
                // Stops some browsers from redirecting.
                //if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();

                this.classList.remove('over');

                var binId = this.id;
                var item = document.getElementById(e.dataTransfer.getData('Text'));
                this.appendChild(item);

                // call the passed drop function
                scope.$apply(function(scope) {
                    var fn = scope.drop();
                    if ('undefined' !== typeof fn) {
                      fn(item.id, binId);
                    }
                });

                return false;
              },
              false
            );

        }
    }
});
