window.addEventListener('load', () => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const CANVAS_WIDTH = canvas.width = 1920;
  const CANVAS_HEIGHT = canvas.height = 1080;

  class Game {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.groundMargin = 120;
      this.speed = 0;
      this.maxSpeed = 1.5;
      this.background = new Background(this);
      this.player = new Player(this);
      this.input = new InputHandler(this);
      this.UI = new UI(this);
      this.enemies = [];
      this.particles = [];
      this.collisions = [];
      this.floatingMessages = [];
      this.enemyTimer = 0;
      this.enemyInterval = 1000;
      this.score = 0;
      this.gameOver = false;

      this.debug = false;

      this.player.currentState = this.player.states[0];
      this.player.currentState.enter();
    }

    draw = (ctx) => {
      this.background.draw(ctx);
      this.player.draw(ctx);
      this.enemies.forEach((enemy) => {
        enemy.draw(ctx);
      });
      this.particles.forEach((particle) => {
        particle.draw(ctx);
      });
      this.collisions.forEach((collision) => {
        collision.draw(ctx);
      });
      this.floatingMessages.forEach((message) => {
        message.draw(ctx);
      });
      this.UI.draw(ctx);
    };

    update = (deltaTime) => {
      this.background.update();
      this.player.update(this.input.keys, deltaTime);

      this.handleEnemies(deltaTime);
      this.handleParticles();
      this.handleCollisionSprites(deltaTime);
      this.handleFloatingMessages();
    };

    handleEnemies = (deltaTime) => {
      this.enemyInterval = Math.random() * 200000;

      if (this.enemyTimer > this.enemyInterval) {
        this.addEnemy();

        this.enemyTimer = 0;
      } else {
        this.enemyTimer += deltaTime;
      }

      this.enemies.forEach((enemy) => {
        enemy.update(deltaTime);
      });

      this.enemies = this.enemies.filter((enemy) => !enemy.needToRemove);
    };

    addEnemy = () => {
      // if (this.speed > 0) {
        //
        //   if (Math.random() < 0.5) {
        //     this.enemies.push(
        //       new GroundEnemy(this)
        //     );
        //   } else {
        //     this.enemies.push(
        //       new ClimbingEnemy(this)
        //     );
        //   }
        this.enemies.push(
          new FlyingEnemy(this),
          // new CrawlingEnemy(this)
        );
      // }
    };

    handleParticles = () => {
      this.particles.forEach((particle) => {
        particle.update();
      });

      this.particles = this.particles.filter((particle) => !particle.needToRemove);
    };

    handleCollisionSprites = (deltaTime) => {
      this.collisions.forEach((collision) => {
        collision.update(deltaTime);
      });

      this.collisions = this.collisions.filter((collision) => !collision.needToRemove);
    };

    handleFloatingMessages = () => {
      this.floatingMessages.forEach((message) => {
        message.update();
      });

      this.floatingMessages = this.floatingMessages.filter((message) => !message.needToRemove);
    };
  }

  const game = new Game(CANVAS_WIDTH, CANVAS_HEIGHT);

  let lastTime = 0;

  const animate = (timeStamp) => {
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    game.update(deltaTime);
    game.draw(ctx);

    if (!game.gameOver) {
      requestAnimationFrame(animate);
    }
  };

  animate(0);
});

class Player {
  constructor(game) {
    this.game = game;
    this.image = document.getElementById('player_idle');
    this.frameX = 0;
    this.frameY = 0;
    this.maxFrame = 2;
    this.fps = 20;
    this.frameInterval = 1000 / this.fps;
    this.frameTimer = 0;
    this.endlessAnimate = true;
    this.hp = 3;

    this.width = 192;
    this.height = 192;

    this.x = 300;
    this.y = this.game.height - this.height - this.game.groundMargin;
    this.speed = 0;
    this.maxSpeed = 10;
    this.velocityY = 0;
    this.weight = 0.5;

    this.states = [
      new Idle(this.game),
      new Walking(this.game),
      new Running(this.game),
      new Sitting(this.game),
      new Standing(this.game),
      new Jumping(this.game),
      new Falling(this.game),
      new Fighting(this.game),
      new Dashing(this.game),
      new Dying(this.game)
    ];
  }

  draw = (ctx) => {
    if (this.game.debug) {
      ctx.strokeRect(
        this.x,
        this.y,
        this.width,
        this.height
      );
    }

    ctx.drawImage(
      this.image,
      this.frameX * this.width,
      this.frameY * this.height,
      this.width,
      this.height,
      this.x,
      this.y,
      this.width,
      this.height
    );
  };

  update = (keys, deltaTime) => {
    this.checkCollision();
    this.currentState.handleInput(keys);

    this.horizontalMove(keys);
    this.verticalMove();

    this.spriteAnimation(deltaTime);
  };

  get isOnGround() {
    return this.y >= this.game.height - this.height - this.game.groundMargin;
  }

  get controls() {
    return this.game.input.controls;
  }

  horizontalMove = (keys) => {
    if (['SITTING', 'DYING'].includes(this.currentState.state)) {
      this.speed = 0;
    }

    this.x += this.speed;

    if (this.controls.left.some((key) => keys.includes(key))) {
      this.speed = -this.maxSpeed;
    } else if (this.controls.right.some((key) => keys.includes(key))) {
      this.speed = this.maxSpeed;
    } else {
      this.speed = 0;
    }

    if (this.x < 0) {
      this.x = 0;
    }

    if (this.x > 300) {
      this.x = 300;
    }
  };

  verticalMove = () => {
    this.y += this.velocityY;

    if (!this.isOnGround) {
      this.velocityY += this.weight;
    } else {
      this.velocityY = 0;
    }
  };

  spriteAnimation = (deltaTime) => {
    if (this.frameTimer > this.frameInterval) {
      this.frameTimer = 0;

      if (this.frameX < this.maxFrame) {
        this.frameX++;
      } else {
        this.frameX = this.endlessAnimate ? 0 : this.maxFrame;
      }
    } else {
      this.frameTimer += deltaTime;
    }
  };

  setState = (state, speed) => {
    this.currentState = this.states[state];
    this.currentState.enter();

    this.game.speed = this.game.maxSpeed * speed;
  };

  checkCollision = () => {
    this.game.enemies.forEach((enemy) => {

      // top right player`s corner vs top left enemy`s corner
      const firstCollision = enemy.x < this.x + this.width;
      // top left player`s corner vs top right enemy`s corner
      const secondCollision = enemy.x + enemy.width > this.x;
      // top right player`s corner vs bottom right enemy`s corner
      const thirdCollision = enemy.y < this.y + this.height;
      // bottom right player`s corner vs top right enemy`s corner
      const fourthCollision = enemy.y + enemy.height > this.y;

      const hasCollision = firstCollision && secondCollision && thirdCollision && fourthCollision;

      if (hasCollision) {
        switch (this.currentState.state) {
          case 'IDLE':
          case 'WALKING':
          case 'RUNNING':
          case 'SITTING':
          case 'STANDING':
          case 'JUMPING':
          case 'FALLING': {
            enemy.needToRemove = true;

            this.game.particles.unshift(
              new Splash(
                this.game,
                this.game.player.x + this.game.player.width * 0.5,
                this.game.player.y
              )
            );

            this.game.collisions.push(
              new CollisionAnimation(
                this.game,
                enemy.x + enemy.width * 0.5,
                enemy.y + enemy.height * 0.5
              )
            );

            this.hp--;
            break;
          }
          case 'FIGHTING': {
            enemy.needToRemove = true;

            this.game.collisions.push(
              new CollisionAnimation(
                this.game,
                enemy.x + enemy.width * 0.5,
                enemy.y + enemy.height * 0.5
              )
            );

            this.game.floatingMessages.push(
              new FloatingMessages('+1', enemy.x, enemy.y, 90, 120)
            );

            setTimeout(() => {
              this.game.score++;
            }, 1000);
            break;
          }
          case 'DASHING':
          case 'DYING': {
            // do nothing
          }
        }

        if (!this.hp && this.currentState.state !== 'DYING') {
          this.setState(this.currentState.states.DYING, 0);
        }
      } else {
        // no collision
      }
    });
  };
}

class InputHandler {
  codes = [
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'KeyW',
    'KeyS',
    'KeyA',
    'KeyD',
    'Space',
    'ShiftLeft',
    'ShiftRight',
    'Enter',
    'NumpadEnter',
    'MouseClick',
    'KeyQ',
    'NumpadMultiply'
  ];

  constructor(game) {
    this.keySet = new Set();
    this.game = game;

    window.addEventListener('keydown', (e) => {
      if (this.codes.includes(e.code)) {
        this.keySet.add(e.code);
      }

      if (e.code === 'Backquote') {
        this.game.debug = !this.game.debug;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.codes.includes(e.code)) {
        this.keySet.delete(e.code);
      }
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.keySet.add('MouseClick');
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.keySet.delete('MouseClick');
      }
    });
  }

  get controls() {
    return {
      up: ['ArrowUp', 'KeyW', 'Space'],
      down: ['ArrowDown', 'KeyS'],
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
      run: ['ShiftLeft', 'ShiftRight'],
      fight: ['Enter', 'NumpadEnter', 'MouseClick'],
      dash: ['KeyQ'],
      suicide: ['NumpadMultiply']
    };
  }

  get keys() {
    return [...this.keySet];
  }
}

class State {
  constructor(state, game) {
    this.state = state;
    this.game = game;
  }

  get states() {
    return {
      IDLE: 0,
      WALKING: 1,
      RUNNING: 2,
      SITTING: 3,
      STANDING: 4,
      JUMPING: 5,
      FALLING: 6,
      FIGHTING: 7,
      DASHING: 8,
      DYING: 9
    };
  }

  calculateMovesAndSpeed = (controls, keys) => {
    const jumping = controls.up.some((key) => keys.includes(key));
    const sitting = controls.down.some((key) => keys.includes(key));
    const movingLeft = controls.left.some((key) => keys.includes(key));
    const movingRight = controls.right.some((key) => keys.includes(key));
    const speedUp = controls.run.some((key) => keys.includes(key));
    const beatUp = controls.fight.some((key) => keys.includes(key));
    const dashing = controls.dash.some((key) => keys.includes(key));
    const dying = controls.suicide.some((key) => keys.includes(key));

    let speed = 0;

    if (movingRight) {
      speed = speedUp ? 6 : 3;
    }

    if (dashing) {
      speed = 8;
    }

    if (sitting || dying) {
      speed = 0;
    }

    return {
      jumping,
      sitting,
      movingLeft,
      movingRight,
      speedUp,
      beatUp,
      dashing,
      dying,
      moving: movingLeft || movingRight,
      idle: !(jumping || sitting || movingLeft || movingRight),
      speed
    };
  };
}

class Idle extends State {
  constructor(game) {
    super('IDLE', game);
  }

  enter = () => {
    this.game.player.image = document.getElementById('player_idle');
    this.game.player.width = 96;
    this.game.player.height = 168;
    this.frameX = 0;
    this.frameY = 0;
    this.game.player.maxFrame = 31;
    this.game.player.endlessAnimate = true;
    this.game.player.fps = 25;
    this.game.player.frameInterval = 1000 / this.game.player.fps;
  };

  handleInput = (keys) => {
    this.game.particles.push(
      new Dust(
        this.game,
        this.game.player.x + this.game.player.width * 0.5 + 10,
        this.game.player.y + 40,
        null,
        1.7
      )
    );

    const moves = this.calculateMovesAndSpeed(this.game.player.controls, keys);

    if (moves.moving) {
      return moves.speedUp ?
        this.game.player.setState(this.states.RUNNING, moves.speed) :
        this.game.player.setState(this.states.WALKING, moves.speed);
    }

    if (moves.sitting) {
      return this.game.player.setState(this.states.SITTING, moves.speed);
    }

    if (moves.jumping) {
      return this.game.player.setState(this.states.JUMPING, moves.speed);
    }

    if (moves.beatUp) {
      return this.game.player.setState(this.states.FIGHTING, moves.speed);
    }

    if (moves.dashing) {
      return this.game.player.setState(this.states.DASHING, moves.speed);
    }

    if (moves.dying) {
      return this.game.player.setState(this.states.DYING, moves.speed);
    }
  };
}

class Walking extends State {
  constructor(game) {
    super('WALKING', game);
  }

  enter = () => {
    this.game.player.maxSpeed = 5;
    this.game.player.fps = 10;
    this.game.player.frameInterval = 1000 / this.game.player.fps;
    this.game.player.endlessAnimate = true;
    this.game.player.maxFrame = 3;

    this.game.player.image = document.getElementById('player_walk');
    this.game.player.frameX = 0;
    this.game.player.frameY = 0;
    this.game.player.width = 108;
    this.game.player.height = 168;
  };

  handleInput = (keys) => {
    this.game.particles.push(
      new Dust(
        this.game,
        this.game.player.x + this.game.player.width * 0.5,
        this.game.player.y + 40
      )
    );

    const moves = this.calculateMovesAndSpeed(this.game.player.controls, keys);

    if (moves.idle) {
      return this.game.player.setState(this.states.IDLE, moves.speed);
    }

    if (moves.speedUp && moves.moving) {
      return this.game.player.setState(this.states.RUNNING, moves.speed);
    }

    if (moves.jumping) {
      return this.game.player.setState(this.states.JUMPING, moves.speed);
    }

    if (moves.sitting) {
      return this.game.player.setState(this.states.SITTING, moves.speed);
    }

    if (moves.beatUp) {
      return this.game.player.setState(this.states.FIGHTING, moves.speed);
    }

    if (moves.dashing) {
      return this.game.player.setState(this.states.DASHING, moves.speed);
    }

    if (moves.dying) {
      return this.game.player.setState(this.states.DYING, moves.speed);
    }
  };
}

class Running extends State {
  constructor(game) {
    super('RUNNING', game);
  }

  enter = () => {
    this.game.player.image = document.getElementById('player_run');
    this.game.player.width = 102;
    this.game.player.height = 168;
    this.game.player.frameX = 0;
    this.game.player.frameY = 0;
    this.game.player.maxFrame = 7;
    this.game.player.endlessAnimate = true;
    this.game.player.fps = 30;
    this.game.player.frameInterval = 1000 / this.game.player.fps;
    this.game.player.maxSpeed = 10;
  };

  handleInput = (keys) => {
    this.game.particles.push(
      new Dust(
        this.game,
        this.game.player.x + this.game.player.width * 0.5,
        this.game.player.y + 40
      )
    );

    const moves = this.calculateMovesAndSpeed(this.game.player.controls, keys);

    if (moves.idle) {
      return this.game.player.setState(this.states.IDLE, moves.speed);
    }

    if (!moves.speedUp && moves.moving) {
      return this.game.player.setState(this.states.WALKING, moves.speed);
    }

    if (moves.jumping) {
      return this.game.player.setState(this.states.JUMPING, moves.speed);
    }

    if (moves.sitting) {
      return this.game.player.setState(this.states.SITTING, moves.speed);
    }

    if (moves.beatUp) {
      return this.game.player.setState(this.states.FIGHTING, moves.speed);
    }

    if (moves.dashing) {
      return this.game.player.setState(this.states.DASHING, moves.speed);
    }

    if (moves.dying) {
      return this.game.player.setState(this.states.DYING, moves.speed);
    }
  };
}

class Sitting extends State {
  constructor(game) {
    super('SITTING', game);
  }

  enter = () => {
    this.game.player.image = document.getElementById('player_sit');
    this.game.player.width = 132;
    this.game.player.height = 168;
    this.game.player.frameX = 0;
    this.game.player.frameY = 0;
    this.game.player.maxFrame = 3;
    this.game.player.endlessAnimate = false;
    this.game.player.fps = 40;
    this.game.player.frameInterval = 1000 / this.game.player.fps;
  };

  handleInput = (keys) => {
    this.game.particles.push(
      new Dust(
        this.game,
        this.game.player.x + this.game.player.width * 0.5 + 10,
        this.game.player.y + 95,
        null,
        1.7
      )
    );
    const moves = this.calculateMovesAndSpeed(this.game.player.controls, keys);

    if (!moves.sitting) {
      return this.game.player.setState(this.states.STANDING, moves.speed);
    }

    if (moves.dying) {
      return this.game.player.setState(this.states.DYING, moves.speed);
    }
  };
}

class Standing extends State {
  constructor(game) {
    super('STANDING', game);
  }

  enter = () => {
    this.game.player.image = document.getElementById('player_sit');
    this.game.player.width = 132;
    this.game.player.height = 168;
    this.game.player.frameX = 3;
    this.game.player.frameY = 0;
    this.game.player.maxFrame = 5;
    this.game.player.endlessAnimate = false;
    this.game.player.fps = 40;
    this.game.player.frameInterval = 1000 / this.game.player.fps;
  };

  handleInput = (keys) => {
    this.game.particles.push(
      new Dust(
        this.game,
        this.game.player.x + this.game.player.width * 0.5 + 10,
        this.game.player.y + 40,
        null,
        1.7
      )
    );
    const moves = this.calculateMovesAndSpeed(this.game.player.controls, keys);

    if (this.game.player.frameX === this.game.player.maxFrame && moves.idle) {
      return this.game.player.setState(this.states.IDLE, moves.speed);
    }

    if (moves.moving) {
      return moves.speedUp ?
        this.game.player.setState(this.states.RUNNING, moves.speed) :
        this.game.player.setState(this.states.WALKING, moves.speed);
    }

    if (moves.beatUp) {
      return this.game.player.setState(this.states.FIGHTING, moves.speed);
    }

    if (moves.dashing) {
      return this.game.player.setState(this.states.DASHING, moves.speed);
    }

    if (moves.dying) {
      return this.game.player.setState(this.states.DYING, moves.speed);
    }
  };
}

class Jumping extends State {
  constructor(game) {
    super('JUMPING', game);
  }

  enter = () => {
    if (this.game.player.isOnGround) {
      this.game.player.velocityY -= 25;
    }

    this.game.player.image = document.getElementById('player_jump');
    this.game.player.width = 114;
    this.game.player.height = 168;
    this.game.player.frameX = 0;
    this.game.player.frameY = 0;
    this.game.player.maxFrame = 3;
    this.game.player.endlessAnimate = false;
    this.game.player.fps = 25;
    this.game.player.frameInterval = 1000 / this.game.player.fps;
  };

  handleInput = (keys) => {
    this.game.particles.push(
      new Dust(
        this.game,
        this.game.player.x + this.game.player.width * 0.5 + 10,
        this.game.player.y + 40
      )
    );

    const moves = this.calculateMovesAndSpeed(this.game.player.controls, keys);

    if (this.game.player.velocityY > this.game.player.weight) {
      this.game.player.setState(this.states.FALLING, moves.speed);
    }

    if (moves.beatUp) {
      return this.game.player.setState(this.states.FIGHTING, moves.speed);
    }

    if (moves.dashing) {
      return this.game.player.setState(this.states.DASHING, moves.speed);
    }

    if (moves.dying) {
      return this.game.player.setState(this.states.DYING, moves.speed);
    }
  };
}

class Falling extends State {
  constructor(game) {
    super('FALLING', game);
  }

  enter = () => {
    this.game.player.image = document.getElementById('player_jump');
    this.game.player.width = 114;
    this.game.player.height = 168;
    this.game.player.frameX = 4;
    this.game.player.frameY = 0;
    this.game.player.maxFrame = 7;
    this.game.player.endlessAnimate = false;
    this.game.player.fps = 25;
    this.game.player.frameInterval = 1000 / this.game.player.fps;
  };

  handleInput = (keys) => {
    this.game.particles.push(
      new Dust(
        this.game,
        this.game.player.x + this.game.player.width * 0.5 + 10,
        this.game.player.y + 40
      )
    );

    const moves = this.calculateMovesAndSpeed(this.game.player.controls, keys);

    if (this.game.player.isOnGround) {
      this.game.player.setState(this.states.IDLE, moves.speed);
    }

    if (moves.dashing) {
      return this.game.player.setState(this.states.DASHING, moves.speed);
    }

    if (moves.dying) {
      return this.game.player.setState(this.states.DYING, moves.speed);
    }
  };
}

class Fighting extends State {
  constructor(game) {
    super('FIGHTING', game);
  }

  enter = () => {
    this.game.player.image = document.getElementById('player_fight');
    this.game.player.width = 156;
    this.game.player.height = 192;
    this.game.player.frameX = 0;
    this.game.player.frameY = 0;
    this.game.player.maxFrame = 7;
    this.game.player.endlessAnimate = false;
    this.game.player.fps = 25;
    this.game.player.frameInterval = 1000 / this.game.player.fps;
    this.game.player.y = this.game.player.y - 24;
  };

  handleInput = (keys) => {
    this.game.particles.push(
      new Dust(
        this.game,
        this.game.player.x + this.game.player.width * 0.5 - 20,
        this.game.player.y + 75
      )
    );

    const moves = this.calculateMovesAndSpeed(this.game.player.controls, keys);

    if (this.game.player.frameX === this.game.player.maxFrame) {
      this.game.player.setState(this.states.IDLE, moves.speed);
    }

    if (moves.dying) {
      return this.game.player.setState(this.states.DYING, moves.speed);
    }
  };
}

class Dashing extends State {
  constructor(game) {
    super('DASHING', game);
  }

  enter = () => {
    this.game.player.image = document.getElementById('player_dash');
    this.game.player.width = 108;
    this.game.player.height = 168;
    this.game.player.frameX = 0;
    this.game.player.frameY = 0;
    this.game.player.maxFrame = 7;
    this.game.player.endlessAnimate = false;
    this.game.player.fps = 25;
    this.game.player.frameInterval = 1000 / this.game.player.fps;
  };

  handleInput = (keys) => {
    this.game.particles.push(
      new Dust(
        this.game,
        this.game.player.x + this.game.player.width * 0.5 + 10,
        this.game.player.y + 40,
        5,
        0
      )
    );

    const moves = this.calculateMovesAndSpeed(this.game.player.controls, keys);

    if (this.game.player.frameX === this.game.player.maxFrame) {
      this.game.player.setState(this.states.IDLE, moves.speed);
    }
  };
}

class Dying extends State {
  constructor(game) {
    super('DYING', game);
  }

  enter = () => {
    this.game.player.image = document.getElementById('player_die');
    this.game.player.width = 174;
    this.game.player.height = 168;
    this.game.player.frameX = 0;
    this.game.player.frameY = 0;
    this.game.player.maxFrame = 7;
    this.game.player.endlessAnimate = false;
    this.game.player.fps = 10;
    this.game.player.frameInterval = 1000 / this.game.player.fps;
    this.game.player.hp = 0;
  };

  handleInput = (keys) => {
    if (this.game.player.frameX === this.game.player.maxFrame) {
      this.game.enemies.forEach((enemy) => {
        enemy.needToRemove = true;

        this.game.collisions.push(
          new CollisionAnimation(
            this.game,
            enemy.x + enemy.width * 0.5,
            enemy.y + enemy.height * 0.5
          )
        );
      });

      if (!this.game.enemies.length) {
        setTimeout(() => {
          this.game.gameOver = true;
        }, 2000);
      }
    }
  };
}

class Layer {
  constructor(game, width, height, speedModifier, image) {
    this.game = game;
    this.width = width;
    this.height = height;
    this.image = image;
    this.speedModifier = speedModifier;
    this.x = 0;
    this.y = 0;
  }

  draw = (ctx) => {
    ctx.drawImage(
      this.image,
      this.x,
      this.y,
      this.width,
      this.height
    );

    ctx.drawImage(
      this.image,
      this.x + this.width,
      this.y,
      this.width,
      this.height
    );
  };

  update = () => {
    if (this.x < -this.width) {
      this.x = 0;
    } else {
      this.x -= this.game.speed * this.speedModifier;
    }
  };
}

class Background {
  image1 = document.getElementById('layer1');
  image2 = document.getElementById('layer2');
  image3 = document.getElementById('layer3');
  image4 = document.getElementById('layer4');
  image5 = document.getElementById('layer5');

  constructor(game) {
    this.game = game;
    this.width = 1920;
    this.height = 1080;

    this.backgroundLayers = [
      new Layer(this.game, this.width, this.height, 1, this.image1),
      new Layer(this.game, this.width, this.height, 1.2, this.image2),
      new Layer(this.game, this.width, this.height, 1.4, this.image3),
      new Layer(this.game, this.width, this.height, 1.8, this.image4),
      new Layer(this.game, this.width, this.height, 2, this.image5)
    ];
  }

  draw = (ctx) => {
    this.backgroundLayers.forEach((layer) => {
      layer.draw(ctx);
    });
  };

  update = () => {
    this.backgroundLayers.forEach((layer) => {
      layer.update();
    });
  };
}

class Enemy {
  constructor(game) {
    this.frameX = 0;
    this.frameY = 0;
    this.fps = 30;
    this.frameInterval = 1000 / this.fps;
    this.frameTimer = 0;
    this.needToRemove = false;
  }

  draw(ctx) {
    if (this.game.debug) {
      ctx.strokeRect(
        this.x,
        this.y,
        this.width,
        this.height
      );
    }

    ctx.drawImage(
      this.image,
      this.frameX * this.width,
      this.frameY * this.height,
      this.width,
      this.height,
      this.x,
      this.y,
      this.width,
      this.height
    );
  };

  update(deltaTime) {
    this.animation(deltaTime);
    this.movement();
    this.removing();
  };

  movement = () => {
    this.x -= this.speedX + this.game.speed;
    this.y += this.speedY;
  };

  reverseMovement = () => {
    this.x += this.speedX - this.game.speed;
    this.y += this.speedY;
  }

  animation = (deltaTime) => {
    if (this.frameTimer > this.frameInterval) {
      this.frameTimer = 0;

      if (this.frameX < this.maxFrame) {
        this.frameX++;
      } else {
        this.frameX = 0;
      }
    } else {
      this.frameTimer += deltaTime;
    }
  }

  removing = () => {
    if (this.x + this.width < 0) {
      this.needToRemove = true;
    }
  };
}

class FlyingEnemy extends Enemy {
  constructor(game) {
    super(game);

    this.game = game;
    this.image = document.getElementById('bat');
    this.width = 120;
    this.height = 104;

    this.maxFrame = 7;
    this.frameY = 1;

    this.x = this.game.width + Math.random() * this.game.width * 0.5;
    this.y = Math.random() * this.game.height * 0.5;

    this.speedX = Math.random() * 10 + 1;
    this.speedY = 0;
    this.angle = 0;
    this.velocityAngle = (Math.random() * 0.1 - 0.01) / 1.2;
  }

  update = (deltaTime) => {
    super.update(deltaTime);

    this.angle += this.velocityAngle;
    this.y += Math.sin(this.angle);
  };
}

class CrawlingEnemy extends Enemy {
  constructor(game) {
    super();

    this.game = game;
    this.image = document.getElementById('slime');
    this.width = 120;
    this.height = 88;

    this.maxFrame = 7;
    this.frameY = 0;

    this.x = this.game.width + Math.random() * this.game.width * 0.5;
    this.y = this.game.height - this.height - this.game.groundMargin;

    this.speedX = Math.random() * 10 + 1;
    this.speedY = 0;
  }

  update = (deltaTime) => {
    super.update(deltaTime);
  };
}

// class GroundEnemy extends Enemy {
//   constructor(game) {
//     super();
//
//     this.game = game;
//     this.image = document.getElementById('enemies');
//     this.width = 192;
//     this.height = 192;
//
//     this.maxFrame = 7;
//     this.frameX = 0;
//
//     this.x = this.game.width;
//     this.y = this.game.height - this.height - this.game.groundMargin;
//
//     this.speedX = 0;
//     this.speedY = 0;
//   }
// }
//
// class ClimbingEnemy extends Enemy {
//   constructor(game) {
//     super();
//
//     this.game = game;
//     this.image = document.getElementById('enemies');
//     this.width = 192;
//     this.height = 192;
//
//     this.maxFrame = 7;
//     this.frameX = 0;
//
//     this.x = this.game.width;
//     this.y = Math.random() * this.game.height * 0.5;
//
//     this.speedX = 0;
//     this.speedY = Math.random() > 0.5 ? 1 : -1;
//   }
//
//   get ground() {
//     return this.game.height - this.height - this.game.groundMargin;
//   }
//
//   update = (deltaTime) => {
//     super.update(deltaTime);
//
//     if (this.y > this.ground) {
//       // this.speedY *= -1;
//       this.speedY = 0;
//     }
//
//     if (this.y < -this.height) {
//       this.needToRemove = true;
//     }
//   };
//
//   draw = (ctx) => {
//     ctx.lineWidth = 5;
//     ctx.beginPath();
//     ctx.moveTo((this.x + this.width / 2) - 10, 0);
//     ctx.lineTo((this.x + this.width / 2) - 10, this.y + 100);
//     ctx.stroke();
//
//     super.draw(ctx);
//   };
// }

class UI {
  heart = document.getElementById('heart');
  mana = document.getElementById('mana');
  stamina = document.getElementById('stamina');

  constructor(game) {
    this.game = game;
    this.fontSize = 30;
    this.fontFamily = 'Creepster';
  }

  drawHeart = (ctx) => {
    const width = 90;
    const height = 80;
    const maxHP = 3;

    [...Array(maxHP).keys()].forEach((point) => {
      ctx.drawImage(
        this.heart,
        0,
        this.game.player.hp >= point + 1 ? 0 : height,
        width,
        height,
        25 + (point * 10) + (point * width * 0.6),
        25,
        width * 0.6,
        height * 0.6
      );
    });
  };

  draw = (ctx) => {
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, .6)';

    ctx.fillText(`Kills: ${this.game.score}`, 25, 125);

    this.drawHeart(ctx);
  };
}

class Particle {
  constructor(game) {
    this.game = game;
    this.needToRemove = false;
  }

  update() {
    this.x -= this.speedX + this.game.speed;
    this.y -= this.speedY;
    this.size *= 0.95;

    if (this.size < 0.5) {
      this.needToRemove = true;
    }
  }
}

class Dust extends Particle {
  constructor(game, x, y, speedX, speedY) {
    super(game);

    this.size = Math.random() * 20 + 20;
    this.x = x;
    this.y = y;
    this.speedX = speedX || Math.random();
    this.speedY = speedY || Math.random();
    this.color = 'rgba(0, 0, 0, 0.05)';
  }

  draw = (ctx) => {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  };
}

class Splash extends Particle {
  constructor(game, x, y) {
    super(game);

    this.size = Math.random() * 100 + 100;
    this.x = x - this.size * 0.4;
    this.y = y - this.size * 0.4;
    this.speedX = Math.random() * 6 - 3;
    this.speedY = Math.random() * 2 + 2;
    this.gravity = 0;
    this.image = document.getElementById('fire');
  }

  update = () => {
    super.update();

    this.gravity += 0.1;
    this.y += this.gravity;
  };

  draw = (ctx) => {
    ctx.drawImage(
      this.image,
      this.x,
      this.y,
      this.size,
      this.size
    );
  };
}

class CollisionAnimation {
  constructor(game, x, y) {
    this.game = game;
    this.image = document.getElementById('boom');
    this.frameWidth = 100;
    this.frameHeight = 90;
    this.sizeModifier = Math.random() + 0.5;
    this.width = this.frameWidth * this.sizeModifier;
    this.height = this.frameHeight * this.sizeModifier;
    this.x = x - this.width * 0.5;
    this.y = y - this.width * 0.5;
    this.frameX = 0;
    this.maxFrame = 4;
    this.needToRemove = false;
    this.fps = 15;
    this.frameInterval = 1000 / this.fps;
    this.frameTimer = 0;
  }

  draw = (ctx) => {
    ctx.drawImage(
      this.image,
      this.frameX * this.frameWidth,
      0,
      this.frameWidth,
      this.frameHeight,
      this.x,
      this.y,
      this.width,
      this.height
    );
  };

  update = (deltaTime) => {
    this.x -= this.game.speed;

    if (this.frameTimer > this.frameInterval) {
      this.frameX++;
      this.frameTimer = 0;
    } else {
      this.frameTimer += deltaTime;
    }

    if (this.frameX > this.maxFrame) {
      this.needToRemove = true;
    }
  };
}

class FloatingMessages {
  constructor(value, x, y, targetX, targetY) {
    this.value = value;
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.needToRemove = false;
    this.timer = 0;
  }

  update = () => {
    this.x += (this.targetX - this.x) * 0.03;
    this.y += (this.targetY - this.y) * 0.03;
    this.timer++;

    if (this.timer > 100) {
      this.needToRemove = true;
    }
  };

  draw = (ctx) => {
    ctx.font = '20px Creepster';
    ctx.fillStyle = 'rgba(255, 255, 255, .6)';
    ctx.fillText(this.value, this.x, this.y);
  };
}