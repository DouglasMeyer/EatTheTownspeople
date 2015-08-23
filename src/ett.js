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
    //{ x: 50, y: 50 },//, moveTo: { x: 0, y: 0 } }
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



function initGame(input, gameState){
  if (gameState.townspeople.length) return;
  var townspeople = [],
      x,y;
  for (var i=0; i<10; i++){
    while (!x || !y || gameState.obstacles.some(function(obstacle){
      return obstacle.contains(x,y);
    })){
      x = Math.floor(Math.random() * 400); //FIXME magic numbers, map size
      y = Math.floor(Math.random() * 300);
    }
    townspeople.push({
      x: x,
      y: y
    });
    y = x = undefined;
  }
  return extend({}, gameState, {
    townspeople: townspeople
  });
}

var speedLimit = 20; //FIXME: magic number, monster movement speed
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
      dy = 0,
      x = gameState.monster.x,
      y = gameState.monster.y;
  if (movingUp   ) dy -= speed;
  if (movingDown ) dy += speed;
  if (movingLeft ) dx -= speed;
  if (movingRight) dx += speed;
  if (dx === 0 && dy === 0) return;
  x += dx;
  y += dy;

  if (gameState.obstacles.some(function(obstacle){
    return obstacle.contains(x,y);
  })) return;

  return extend({}, gameState, {
    monster: extend({}, gameState.monster, {
      x: gameState.monster.x + dx,
      y: gameState.monster.y + dy
    })
  });
}
function eatTownspeople(timeDelta, gameState){
  var monster = gameState.monster;
  if (monster.chewing) {
    var chewing = monster.chewing - timeDelta / 1000;
    if (chewing < 0) chewing = 0;
    return extend({}, gameState, {
      monster: extend({}, monster, {
        chewing: chewing
      })
    });
  }
  var townspeopleDistances = gameState.townspeople.reduce(function(tpDistances, townsperson){
    tpDistances.set(townsperson, Math.pow(
      Math.pow(townsperson.x - monster.x, 2) +
      Math.pow(townsperson.y - monster.y, 2)
    , 0.5));
    return tpDistances;
  }, new WeakMap);
  var closestTownsperson = gameState.townspeople.sort(function(tp1, tp2){
    return townspeopleDistances.get(tp1) - townspeopleDistances.get(tp2);
  })[0];
  //FIXME: magic number 5, monster's size.
  if (closestTownsperson && townspeopleDistances.get(closestTownsperson) < 5){
    return extend({}, gameState, {
      monster: extend({}, monster, {
        chewing: 10 //FIXME: magic number 10, monster's chewing time
      }),
      townspeople: gameState.townspeople.filter(function(townsperson){
        return townsperson !== closestTownsperson
      })
    });
  }
}
function moveTownspeople(timeDelta, gameState){
  if (!gameState.townspeople.length) return;
  var newTownspeople = gameState.townspeople.map(function(townsperson){
    var moveTo = townsperson.moveTo;
    if (!moveTo || (moveTo.x === townsperson.x && moveTo.y === townsperson.y)){
      moveTo = {
        x: Math.floor(Math.random() * 400), //FIXME magic numbers, map size
        y: Math.floor(Math.random() * 300)
      };
    }
    var dx = moveTo.x - townsperson.x,
        dy = moveTo.y - townsperson.y,
        distance = Math.pow(Math.pow(dx,2) + Math.pow(dy,2), 0.5);
    //FIXME magic numbers, villager movement speed
    if (distance > timeDelta / 30){
      dx /= distance / timeDelta * 30;
      dy /= distance / timeDelta * 30;
    }
    if (gameState.obstacles.some(function(obstacle){
      return obstacle.contains(townsperson.x+dx,townsperson.y+dy);
    })) {
      moveTo = undefined;
      if (moveTo === townsperson.moveTo) return townsperson;
      return extend({}, townsperson, {
        moveTo: undefined
      });
    }
    return extend({}, townsperson, {
      x: townsperson.x + dx,
      y: townsperson.y + dy,
      moveTo: moveTo
    });
  });
  return extend({}, gameState, {
    townspeople: newTownspeople
  });
}

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

  function HudContainer(){
    PIXI.Container.call(this);
    this.addChild( this.chewing = new PIXI.Text('Chewing: 0', { font: '10px Arial', fill: 0xDDDDDD }) );
    //this.addChild( window.log = new PIXI.Text('log', { font: '6px Arial', fill: 0xDDDDDD }) );
    //window.log.position = { x: 0, y: 100 };
  }
  HudContainer.prototype = Object.create(PIXI.Container.prototype);
  HudContainer.prototype.constructor = HudContainer;
  HudContainer.prototype.setGameState = function setGameState(gameState){
    this.chewing.text = 'Chewing: '+gameState.monster.chewing;
  };


  var stage,
      world, hudContainer,
      obstaclesContainer, townspeopleContainer, monsterContainer;
  PIXI.DEFAULT_RENDER_OPTIONS.backgroundColor = 0x111111;
  stage = new PIXI.Container();
  stage.addChild( world = new PIXI.Container() );
  stage.addChild( hudContainer = new HudContainer() );
  world.addChild( obstaclesContainer = new ObstaclesContainer() );
  world.addChild( townspeopleContainer = new TownspeopleContainer() );
  world.addChild( monsterContainer = new MonsterContainer() );
  var renderer = PIXI.autoDetectRenderer();
  function onWindowResize(){
    renderer.resize(document.body.clientWidth, document.body.clientHeight);
    var scale = Math.max(
      document.body.clientWidth  / 400,
      document.body.clientHeight / 300
    );
    stage.scale = new PIXI.Point(scale, scale);
    renderer.render(stage);
  }
  addEventListener('resize', onWindowResize);
  onWindowResize();
  renderer.render(stage);
  document.body.appendChild(renderer.view);


  var lastGameState;
  return function output(gameState){
    if (lastGameState === gameState) return;

    hudContainer.setGameState( gameState );
    obstaclesContainer.setObstacles( gameState.obstacles );
    monsterContainer.setMonster( gameState.monster );
    townspeopleContainer.setTownspeople( gameState.townspeople );

    world.x = renderer.width  / stage.scale.x / 2 - gameState.monster.x;
    world.y = renderer.height / stage.scale.y / 2 - gameState.monster.y;

    renderer.render(stage);
    lastGameState = gameState;
  };
})();
