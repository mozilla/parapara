function initialize(wall, wallData, design, $) {
  var SpaceWall = function() {
      this.addCharacter = function(character) {
        // XXX
        return wall.addCharacter(character);
      };
    };
  SpaceWall.prototype = wall;

  return new SpaceWall();
}

document.initialize = initialize;
