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
  monster: { x: 5, y: 5, chewing: 0, roaring: 0 },
  townspeople: [
    { x: 50, y: 50 },//, monsterAt: { x: 0, y: 0 } }
  ],
  obstacles: [
    new PIXI.Rectangle(10, 10, 100, 20), // x y w h
  ]
};
var gameState = initialGameState;

tick(function gameTick(timeDelta){
  output( gameState = update(timeDelta, input.get(), gameState) );
});



var input = (function(){
  var actions = [],
      keyMappings = {
        'Up':    'Up',    'U+0057': 'Up',    // W
        'Left':  'Left',  'U+0041': 'Left',  // A
        'Down':  'Down',  'U+0053': 'Down',  // S
        'Right': 'Right', 'U+0044': 'Right', // D
        'U+0020': 'Lunge', // Space
        'Shift':  'Roar',
        'Enter': 'Start'
      };

  function onKeyDown(e){
    var key = keyMappings[e.keyIdentifier];
    if (actions.indexOf(key) === -1)
      actions.push(key);
  }
  function onKeyUp(e){
    var key = keyMappings[e.keyIdentifier],
        index = actions.indexOf( key );
    if (index !== -1)
      actions.splice(index, 1);
  }
  document.body.addEventListener('keydown', onKeyDown);
  document.body.addEventListener('keyup',   onKeyUp);

  return {
    get: function(){ return actions; }
  };
})();



function initGame(input, gameState){}
var speedLimit = 30; // blocks per second
function moveMonster(timeDelta, input, gameState){
  if (!input.length) return;
  var movingUp    = input.indexOf('Up'   ) !== -1,
      movingDown  = input.indexOf('Down' ) !== -1,
      movingLeft  = input.indexOf('Left' ) !== -1,
      movingRight = input.indexOf('Right') !== -1,
      movements = [
          movingUp, movingDown, movingLeft, movingRight
        ].reduce(function(c,b){ return c + (b?1:0); }, 0),
      speed = (timeDelta / speedLimit) / Math.pow(movements, 0.5),
      dx = 0,
      dy = 0;
  if (movingUp   ) dy -= speed;
  if (movingDown ) dy += speed;
  if (movingLeft ) dx -= speed;
  if (movingRight) dx += speed;
  return extend({}, gameState, {
    monster: extend({}, gameState.monster, {
      x: gameState.monster.x + dx,
      y: gameState.monster.y + dy
    })
  });
}
function eatTownspeople(timeDelta, gameState){}
function moveTownspeople(timeDelta, gameState){}

function update(timeDelta, input, gameState){
  return [
    initGame.bind(null, input),
    moveMonster.bind(null, timeDelta, input),
    eatTownspeople.bind(null, timeDelta),
    moveTownspeople.bind(null, timeDelta)
  ].reduce(function updateReduceChanges(gameState, f){ return f(gameState) || gameState; }, gameState);
}



var output = (function outputInit(){
  function ObstaclesContainer(){
    PIXI.Graphics.call(this);
  }
  ObstaclesContainer.prototype = Object.create(PIXI.Graphics.prototype);
  ObstaclesContainer.prototype.constructor = ObstaclesContainer;
  ObstaclesContainer.prototype.setObstacles = function setObstacles(obstacles){
    this.clear();
    var color = 0x664433;
    this.lineStyle( 1, color );
    this.beginFill( color, 0.7 );
    obstacles.forEach(function renderObstacle(obstacle){
      this.drawShape( obstacle );
    }, this);
  };


  function MonsterContainer(){
    PIXI.Graphics.call(this);
    var color = 0x448800;
    this.lineStyle( 1, color );
    this.beginFill( color, 0.7 );
    this.drawCircle( 0, 0, 5 );
  }
  MonsterContainer.prototype = Object.create(PIXI.Graphics.prototype);
  MonsterContainer.prototype.constructor = MonsterContainer;
  MonsterContainer.prototype.setMonster = function setMonster(monster){
    this.x = monster.x;
    this.y = monster.y;
  };


  function TownspeopleContainer(){
    PIXI.Graphics.call(this);
  }
  TownspeopleContainer.prototype = Object.create(PIXI.Graphics.prototype);
  TownspeopleContainer.prototype.constructor = TownspeopleContainer;
  TownspeopleContainer.prototype.setTownspeople = function setTownspeople(townspeople){
    this.clear();
    var color = 0xCCCCCC;
    this.lineStyle( 1, color );
    this.beginFill( color, 0.7 );
    townspeople.forEach(function renderTownsperson(townsperson){
      this.drawCircle( townsperson.x, townsperson.y, 3 );
    }, this);
  };


  var stage,
      world, hud,
      obstaclesContainer, townspeopleContainer, monsterContainer;
  PIXI.DEFAULT_RENDER_OPTIONS.backgroundColor = 0x111111;
  stage = new PIXI.Container();
  stage.addChild( world = new PIXI.Container() );
  stage.addChild( hud = new PIXI.Container() );
  world.addChild( obstaclesContainer = new ObstaclesContainer() );
  world.addChild( townspeopleContainer = new TownspeopleContainer() );
  world.addChild( monsterContainer = new MonsterContainer() );
  var renderer = PIXI.autoDetectRenderer(document.body.clientWidth, document.body.clientHeight);
  var scale = Math.max(
    document.body.clientWidth  / 400,
    document.body.clientHeight / 300
  );
  stage.scale = new PIXI.Point(scale, scale);
  addEventListener('resize', function onWindowResize(){
    renderer.resize(document.body.clientWidth, document.body.clientHeight);
    var scale = Math.max(
      document.body.clientWidth  / 400,
      document.body.clientHeight / 300
    );
    stage.scale = new PIXI.Point(scale, scale);
    renderer.render(stage);
  });
  renderer.render(stage);
  document.body.appendChild(renderer.view);


  var lastGameState;
  return function output(gameState){
    if (lastGameState === gameState) return;

    obstaclesContainer.setObstacles( gameState.obstacles );
    monsterContainer.setMonster( gameState.monster );
    townspeopleContainer.setTownspeople( gameState.townspeople );

    world.x = renderer.width  / stage.scale.x / 2 - gameState.monster.x;
    world.y = renderer.height / stage.scale.y / 2 - gameState.monster.y;

    renderer.render(stage);
    lastGameState = gameState;
  };
})();
