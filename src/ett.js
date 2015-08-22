"use strict";

function extend(dest /*, srcs...*/){
  Array.prototype.slice.call(arguments, 1)
  .forEach(function(src){
    for (var key in src){
      dest[key] = src[key];
    }
  });
  return dest;
}

var tick = (function(){
  var callback, lastTime;

  function onTick(time){
    requestAnimationFrame(onTick);
    callback(time - lastTime);
    lastTime = time;
  }

  return function initTick(cb){
    if (callback) throw "tick called more than once!"
    requestAnimationFrame(onTick);
    callback = cb;
    lastTime = performance.now();
  };
})();




var initialGameState = {
  //monster: { x: 0, y: 0, chewing: 0, roaring: 0 },
  //townspeople: [
  //  { x: 0, y: 0, monsterAt: { x: 0, y: 0 } }
  //],
  //obstacles: [
  //  new PIXI.Polygon([ new PIXI.Point(x,y) ]),
  //  new PIXI.Rectangle(x, y, width, height)
  //]
};
var gameState = initialGameState;

tick(function gameTick(timeDelta){
  output( gameState = update(timeDelta, input.get(), gameState) );
});



var input = (function(){
  return {
    get: function(){
    }
  };
})();


function update(timeDelta, input, gameState){
  var newObstacles;
  if (!gameState.obstacles){
    newObstacles = [
      new PIXI.Polygon([
        new PIXI.Point(200 +   0, 200 +   0),
        new PIXI.Point(200 +   0, 200 + 100),
        new PIXI.Point(200 + 100, 200 + 100),
        new PIXI.Point(200 + 100, 200 +   0)
      ])
    ];
  }
  if (newObstacles){
    return extend({}, gameState, {
      obstacles: newObstacles || gameState.obstacles
    });
  }
  return gameState;
}


var output = (function outputInit(){
  var stage,
      world, hud,
      obstaclesLayer, townspeopleLayer, monsterLayer;
  PIXI.DEFAULT_RENDER_OPTIONS.backgroundColor = 0x111111;
  stage = new PIXI.Container();
  stage.addChild( world = new PIXI.Container() );
  stage.addChild( hud = new PIXI.Container() );
  world.addChild( obstaclesLayer = new PIXI.Graphics() );
  world.addChild( townspeopleLayer = new PIXI.Container() );
  world.addChild( monsterLayer = new PIXI.Container() );
  var renderer = PIXI.autoDetectRenderer(document.body.clientWidth, document.body.clientHeight);
  addEventListener('resize', function onWindowResize(){
    renderer.resize(document.body.clientWidth, document.body.clientHeight);
    renderer.render(stage);
  });
  renderer.render(stage);
  document.body.appendChild(renderer.view);

  function renderObstacles(obstacles){
    obstaclesLayer.removeChildren();
    obstaclesLayer.lineStyle( 5, 0x664433 );
    obstaclesLayer.beginFill( 0x664433, 0.7 );
    obstacles.forEach(function renderObstacle(obstacle){
      obstaclesLayer.drawShape( obstacle );
    });
  }

  var lastGameState;
  return function output(gameState){
    if (lastGameState === gameState) return;

    renderObstacles(gameState.obstacles);

    //world.position.x = renderer.width  / 2 - gameState.monster.x;
    //world.position.y = renderer.height / 2 - gameState.monster.y;

    renderer.render(stage);
    lastGameState = gameState;
  };
})();
