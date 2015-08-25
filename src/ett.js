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

function Line(m,b){
  this.m = m;
  this.b = b;
}
Line.prototype.y = function y(x){
  return this.m*x+this.b;
};




var maps = [
  {
    width: 400,
    height: 300,
    obstacles: [
      new PIXI.Rectangle( 20,  45, 50, 25),
      new PIXI.Rectangle( 90,  40, 35, 30),
      new PIXI.Rectangle(140,  50, 50, 20),
      new PIXI.Rectangle(220,  30, 50, 40),
      new PIXI.Rectangle(300,  50, 20, 20),

      new PIXI.Rectangle(110, 100, 40, 20),
      new PIXI.Rectangle(160, 100, 30, 40),
      new PIXI.Rectangle(220, 100, 30, 30),

      new PIXI.Rectangle(160, 150, 30, 50),
      new PIXI.Rectangle(220, 140, 30, 30),

      new PIXI.Rectangle(220, 190, 40, 40)
    ]
  }, {
    width: 400,
    height: 300,
    obstacles: [
      new PIXI.Rectangle(  0,   0, 100, 20),
      new PIXI.Rectangle(100,   0,  50, 40),
      new PIXI.Rectangle(150,   0,  80, 30),
      new PIXI.Rectangle(230,   0, 120, 20),
      new PIXI.Rectangle(350,   0,  50, 50),

      new PIXI.Rectangle(370,  50,  30, 80),
      new PIXI.Rectangle(380, 130,  20, 50),
      new PIXI.Rectangle(330, 180,  70, 30),
      new PIXI.Rectangle(350, 210,  50, 30),
      new PIXI.Rectangle(380, 240,  20, 60),

      new PIXI.Rectangle(320, 280,  60, 20),
      new PIXI.Rectangle(280, 260,  40, 40),
      new PIXI.Rectangle(200, 280,  80, 20),
      new PIXI.Rectangle(130, 270,  70, 30),
      new PIXI.Rectangle( 80, 280,  50, 20),
      new PIXI.Rectangle(  0, 280,  80, 20),

      new PIXI.Rectangle(  0, 230,  40, 50),
      new PIXI.Rectangle(  0, 150,  30, 80),
      new PIXI.Rectangle(  0, 110,  80, 40),
      new PIXI.Rectangle(  0,  20,  20, 90),

      new PIXI.Rectangle(120, 100,  30, 70),
      new PIXI.Rectangle(220,  50,  50, 50),
      new PIXI.Rectangle(180, 160,  80, 80)
    ]
  }, {
    width: 800,
    height: 100,
    obstacles: [
      new PIXI.Rectangle( 30, 30, 300, 20 ),
      new PIXI.Rectangle(300, 40, 200, 30 ),
      new PIXI.Rectangle(480, 20, 200, 60 ),
    ]
  }
];
var gameState = {
  // state: undefined, 'started', 'died', 'releaseStart', 'levelComplete', 'won'
};

tick(function gameTick(timeDelta){
  output( gameState = update(timeDelta, input.get(), gameState) );
});



var input = (function(){
  var actions = [],
      window = {
        width: document.body.clientWidth,
        height: document.body.clientHeight
      },
      keyMappings = {
        'Up':    'Up',    'U+0057': 'Up',    // W
        'Left':  'Left',  'U+0041': 'Left',  // A
        'Down':  'Down',  'U+0053': 'Down',  // S
        'Right': 'Right', 'U+0044': 'Right', // D
        'U+0020': 'Roar', // Space
        'Enter': 'Start'
      };

  function onKeyDown(e){
    e.preventDefault();
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
  addEventListener('resize', function(){
    window.width  = document.body.clientWidth;
    window.height = document.body.clientHeight;
  });
  addEventListener('mousedown', function(e){
    this.focus();
  });

  return {
    get: function(){
      return { actions: actions, window: window };
    }
  };
})();



function setWindowSize(input, gameState){
  if (
    gameState.window &&
    input.window.width  === gameState.window.width &&
    input.window.height === gameState.window.height
  ) return;
  var width = input.window.width,
      height = input.window.height,
      scale = Math.min(
        width  / (gameState.map.width  + 25),
        height / (gameState.map.height + 25)
      );
  return extend({}, gameState, {
    window: {
      width:  width,
      height: height,
      scale: scale
    }
  });
}

function initGame(input, gameState){
  var gameStateChanged = false,
      startPressed = input.actions.indexOf('Start') !== -1;
  if (!gameState.state && startPressed){
    gameState = extend({}, gameState, { state: 'started' });
    gameStateChanged = true;
  } else if (gameState.state === 'died' && startPressed){
    gameState = extend({}, gameState, { state: 'releaseStart', map: undefined, townspeople: undefined });
    gameStateChanged = true;
  } else if (gameState.state === 'releaseStart' && !startPressed){
    gameState = extend({}, gameState, { state: null });
    gameStateChanged = true;
  } else if (gameState.state === 'started' && gameState.townspeople.length === 0){
    var mapIndex = maps.indexOf(gameState.map);
    if (!maps[mapIndex+1]) return extend({}, gameState, { state: 'won' });
    gameState = {
      state: 'levelComplete',
      map: maps[mapIndex+1],
      townspeople: undefined
    };
    gameStateChanged = true;
  } else if (gameState.state === 'levelComplete' && startPressed){
    return extend({}, gameState, { state: 'started' });
  } else if (gameState.state === 'won' && startPressed){
    gameState = { state: 'releaseStart' };
    gameStateChanged = true;
  }

  if (!gameState.map){
    gameState = extend({}, gameState, { map: maps[0] });
    gameStateChanged = true;
  }

  if (!gameState.monster && gameState.state === 'started'){
    var x, y;
    while (
      !x ||
      gameState.map.obstacles.some(function(o){ return o.contains(x,y); })
    ){
      x = gameState.map.width  * Math.random();
      y = gameState.map.height * Math.random();
    }
    //FIXME: should I not modify gameState?
    gameState.monster = { x: x, y: y, chewing: 0, roaring: 0, roarCooldown: 0, health: 100 };
  }

  if (!gameState.townspeople){
    var townspeople = [],
        x,y;
    for (var i=0; i<10; i++){
      while (!x || !y || gameState.map.obstacles.some(function(obstacle){
        return obstacle.contains(x,y);
      })){
        x = Math.floor(Math.random() * gameState.map.width);
        y = Math.floor(Math.random() * gameState.map.height);
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
  if (gameStateChanged) return gameState;
}

//NOTE: this could be optimized by not updating (every time) townspeople who are far away, or storing position separate from monster/townsperson
var lastMonster, townspeopleDistances;
function updateDistances(gameState){
  if (gameState.monster !== lastMonster) townspeopleDistances = new WeakMap;

  var anyTownspersonUpdated = false,
      newTownspeople = gameState.townspeople.map(function(townsperson){
        if (!gameState.monster) return extend({}, townsperson, { distanceFromMonster: 1/0 });
        if (townspeopleDistances.get(townsperson)) return townsperson;
        var distance = Math.pow(
          Math.pow(townsperson.x - gameState.monster.x, 2) +
          Math.pow(townsperson.y - gameState.monster.y, 2)
        , 0.5);
        townspeopleDistances.set(townsperson, distance);
        anyTownspersonUpdated = true;
        return extend({}, townsperson, { distanceFromMonster: distance });
      });
  if (!anyTownspersonUpdated) return;
  return extend({}, gameState, { townspeople: newTownspeople });
}

var speedLimit = 20; //FIXME: magic number, monster movement speed
function moveMonster(timeDelta, input, gameState){
  if (!input.actions.length || !gameState.monster) return;
  var movingUp    = input.actions.indexOf('Up'   ) !== -1,
      movingDown  = input.actions.indexOf('Down' ) !== -1,
      movingLeft  = input.actions.indexOf('Left' ) !== -1,
      movingRight = input.actions.indexOf('Right') !== -1,
      movements = [
          movingUp, movingDown, movingLeft, movingRight
        ].reduce(function(c,b){ return c + (b?1:0); }, 0),
      speed = (timeDelta / (speedLimit + gameState.townspeople.filter(function(tp){ return tp.distanceFromMonster < 10; }).length * 5 )) / Math.pow(movements, 0.5), //FIXME: magic number
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

  if (
    x < 0 || y < 0 ||
    x >= gameState.map.width ||
    y >= gameState.map.height
  ) return;
  if (gameState.map.obstacles.some(function(obstacle){
    return obstacle.contains(x,y);
  })) return;

  return extend({}, gameState, {
    monster: extend({}, gameState.monster, {
      x: gameState.monster.x + dx,
      y: gameState.monster.y + dy
    })
  });
}
function scareTownspeople(timeDelta, input, gameState){
  var monster = gameState.monster;
  if (!monster) return;
  if (monster.roarCooldown){
    var roarCooldown = monster.roarCooldown - timeDelta / 1000;
    if (roarCooldown < 0) roarCooldown = 0;
    return extend({}, gameState, {
      monster: extend({}, monster, {
        roarCooldown: roarCooldown
      })
    });
  }
  if (input.actions.indexOf('Roar') !== -1){
    return extend({}, gameState, {
      monster: extend({}, monster, {
        roarCooldown: 10 //FIXME: magic number 10: roarCooldown
      })
    });
  }
}
function eatTownspeople(timeDelta, gameState){
  var monster = gameState.monster;
  if (!monster) return;
  if (monster.chewing) {
    var chewing = monster.chewing - timeDelta / 1000;
    if (chewing < 0) chewing = 0;
    return extend({}, gameState, {
      monster: extend({}, monster, {
        chewing: chewing
      })
    });
  }
  var closestTownsperson = gameState.townspeople.sort(function(tp1, tp2){
    return tp1.distanceFromMonster - tp2.distanceFromMonster;
  })[0];
//log.text = JSON.stringify(closestTownsperson);
  //FIXME: magic number 5, monster's size.
  if (closestTownsperson && closestTownsperson.distanceFromMonster < 5){
    return extend({}, gameState, {
      monster: extend({}, monster, {
        chewing: 5 //FIXME: magic number 5, monster's chewing time
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
    var moveTo = townsperson.moveTo,
        distanceFromMonster = townsperson.distanceFromMonster;
    if (gameState.monster && distanceFromMonster < 200){ //FIXME: magic number
      var dx = (gameState.monster.x - townsperson.x) / distanceFromMonster,
          dy = (gameState.monster.y - townsperson.y) / distanceFromMonster;
      for (var distance = 1; distance < distanceFromMonster; distance++){
        if (gameState.map.obstacles.some(function(obstacle){ return obstacle.contains(townsperson.x+dx*distance, townsperson.y+dy*distance); })) break;
      }
      if (distance >= distanceFromMonster) { // townsperson can see monster
        if (gameState.monster.roarCooldown > 9){ //FIXME: magic number: roarCooldown - 1
          moveTo = {
            x: townsperson.x - dx * 10,
            y: townsperson.y - dy * 10
          };
        } else if (
          distanceFromMonster > 150 || //FIXME: magic number
          gameState.townspeople.filter(function(otherTownsperson){
            return otherTownsperson.distanceFromMonster < townsperson.distanceFromMonster + 50; //FIXME: magic number
          }).length >= Math.min(3, gameState.townspeople.length)
        )
          moveTo = {
            x: gameState.monster.x,
            y: gameState.monster.y
          };
        else
          moveTo = {
            x: townsperson.x - dx * 10,
            y: townsperson.y - dy * 10
          };
      } else if (gameState.monster.roarCooldown > 9){ //FIXME: magic number: roarCooldown - 1
        moveTo = {
          x: gameState.monster.x,
          y: gameState.monster.y
        };
      }
    }
    if (!moveTo || (moveTo.x === townsperson.x && moveTo.y === townsperson.y)){
      moveTo = {
        x: Math.floor(Math.random() * gameState.map.width),
        y: Math.floor(Math.random() * gameState.map.height)
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
    var x = townsperson.x + dx,
        y = townsperson.y + dy;
    if (
      x < 0 || y < 0 ||
      x >= gameState.map.width ||
      y >= gameState.map.height ||
      gameState.map.obstacles.some(function(obstacle){
        return obstacle.contains(townsperson.x+dx,townsperson.y+dy);
      })
    ) {
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

function attackMonster(timeDelta, gameState){
  if (!gameState.monster) return;
  var numberOfAttackers = gameState.townspeople.filter(function(townsperson){
    return townsperson.distanceFromMonster <= 5; //FIXME: magic number, monster's size + townsperson's size
  }).length;
  if (numberOfAttackers === 0) return;
  var health = gameState.monster.health - numberOfAttackers * timeDelta / 100;

  if (health <= 0) return extend({}, gameState, { state: 'died', monster: undefined });
  return extend({}, gameState, {
    monster: extend({}, gameState.monster, {
      health: health
    })
  });
}

function update(timeDelta, input, gameState){
  return [
    initGame.bind(null, input),
    setWindowSize.bind(null, input),
    updateDistances.bind(null),
    eatTownspeople.bind(null, timeDelta),
    attackMonster.bind(null, timeDelta),
    moveMonster.bind(null, timeDelta, input),
    scareTownspeople.bind(null, timeDelta, input),
    moveTownspeople.bind(null, timeDelta),
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
  }
  MonsterContainer.prototype = Object.create(PIXI.Graphics.prototype);
  MonsterContainer.prototype.constructor = MonsterContainer;
  MonsterContainer.prototype.setGameState = function setGameState(gameState){
    if (gameState.state === 'died') return;
    if (!gameState.monster){
      this.clear();
      return;
    }
    this.clear();
    var health = Math.floor(gameState.monster.health);
    var color = 0x010000*(255-Math.floor(health/100*255))+0x000100*(health*2);
    this.lineStyle( 1, color );
    this.beginFill( color, 0.7 );
    this.drawCircle( 0, 0, 5 );

    this.x = gameState.monster.x;
    this.y = gameState.monster.y;
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


  function BoarderContainer(){
    PIXI.Graphics.call(this);
  }
  BoarderContainer.prototype = Object.create(PIXI.Graphics.prototype);
  BoarderContainer.prototype.constructor = BoarderContainer;
  BoarderContainer.prototype.setGameState = function setGameState(gameState){
    this.clear();
    var color = 0x333333;
    this.lineStyle( 1, color, 1 );
    this.drawRect(0,0,gameState.map.width,gameState.map.height);
  };


  function HudContainer(){
    PIXI.Container.call(this);
    this.addChild( this.chewingBar = new PIXI.Graphics );
    this.addChild( this.roarCooldownBar = new PIXI.Graphics );

    this.introduction = document.getElementById('introduction');
    this.levelComplete = document.getElementById('levelComplete');
    this.gameOver = document.getElementById('gameOver');
    this.won = document.getElementById('won');
  }
  HudContainer.prototype = Object.create(PIXI.Container.prototype);
  HudContainer.prototype.constructor = HudContainer;
  HudContainer.prototype.setGameState = function setGameState(gameState){
    this.introduction.classList.toggle('hide', gameState.state);
    this.gameOver.classList.toggle('hide', gameState.state !== 'died');
    this.levelComplete.classList.toggle('hide', gameState.state !== 'levelComplete');
    this.won.classList.toggle('hide', gameState.state !== 'won');

    var windowWidth = gameState.window.width / gameState.window.scale,
        windowHeight = gameState.window.height / gameState.window.scale;
    this.chewingBar.clear();
    if (gameState.state === 'started' && gameState.monster && gameState.monster.chewing){
      this.chewingBar.beginFill( 0xDDDD00, 0.5 );
      var chewProgress = 100*gameState.monster.chewing/5;
      this.chewingBar.drawRect( 0, windowHeight - chewProgress, 20, chewProgress );
      this.chewingBar.endFill();
      this.chewingBar.lineStyle( 1, 0x888888, 1 );
      this.chewingBar.drawRect( 0, windowHeight-100, 20, 100 );
      this.chewingBar.lineStyle( 0 );
    }
    this.roarCooldownBar.clear();
    if (gameState.state === 'started' && gameState.monster && gameState.monster.roarCooldown){
      this.roarCooldownBar.beginFill( 0xFF0000, 0.5 );
      var chewProgress = 100*gameState.monster.roarCooldown/10;
      this.roarCooldownBar.drawRect( windowWidth - 21, windowHeight - chewProgress, 20, chewProgress );
      this.roarCooldownBar.endFill();
      this.roarCooldownBar.lineStyle( 1, 0x888888, 1 );
      this.roarCooldownBar.drawRect( windowWidth - 21, windowHeight-100, 20, 100 );
    }
  };


  var stage,
      world, hudContainer,
      boarderContainer, obstaclesContainer, townspeopleContainer, monsterContainer;
  PIXI.DEFAULT_RENDER_OPTIONS.backgroundColor = 0x111111;
  stage = new PIXI.Container();
  stage.addChild( world = new PIXI.Container() );
  stage.addChild( hudContainer = new HudContainer() );
  world.addChild( boarderContainer = new BoarderContainer() );
  world.addChild( obstaclesContainer = new ObstaclesContainer() );
  world.addChild( townspeopleContainer = new TownspeopleContainer() );
  world.addChild( monsterContainer = new MonsterContainer() );
  var renderer = PIXI.autoDetectRenderer();
  renderer.render(stage);
  document.body.appendChild(renderer.view);

  var lastMap, lastWindow;
  function resize(gameState){
    if (!gameState.window || gameState.map === lastMap && gameState.window === lastWindow) return;
    lastMap = gameState.map;
    lastWindow = gameState.window;

    renderer.resize(gameState.window.width, gameState.window.height);
    stage.scale = new PIXI.Point(gameState.window.scale, gameState.window.scale);
  }

  var lastGameState;
  return function output(gameState){
    if (lastGameState === gameState) return;

    resize( gameState );
    hudContainer.setGameState( gameState );
    boarderContainer.setGameState( gameState );
    obstaclesContainer.setObstacles( gameState.map.obstacles );
    monsterContainer.setGameState( gameState );
    townspeopleContainer.setTownspeople( gameState.townspeople );

    if (gameState.monster){
      world.x = renderer.width  / stage.scale.x / 2 - gameState.monster.x;
      world.y = renderer.height / stage.scale.y / 2 - gameState.monster.y;
    } else {
      world.x = renderer.width  / stage.scale.x / 2 - gameState.map.width  / 2;
      world.y = renderer.height / stage.scale.y / 2 - gameState.map.height / 2;
    }

    renderer.render(stage);
    lastGameState = gameState;
  };
})();
