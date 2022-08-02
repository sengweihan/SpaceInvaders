import { fromEvent, interval, merge, Subscription } from 'rxjs'; 
import { map, filter, scan ,tap} from 'rxjs/operators';


type Key = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'Space' 
type Event = 'keydown' | 'keyup'

  /**
 * apply f to every element of a and return the result in a flat array
 * @param a an array
 * @param f a function that produces an array
 */
   function flatMap<T,U>(
  
    a:ReadonlyArray<T>,
    f:(a:T)=>ReadonlyArray<U>
  ): ReadonlyArray<U> {
    return Array.prototype.concat(...a.map(f));
  }
  
  const 
  /**
   * Composable not: invert boolean result of given function
   * @param f a function returning boolean
   * @param x the value that will be tested with f
   */
    not = <T>(f:(x:T)=>boolean)=> (x:T)=> !f(x),
  /**
   * is e an element of a using the eq function to test equality?
   * @param eq equality test function for two Ts
   * @param a an array that will be searched
   * @param e an element to search a for
   */
    elem = 
      <T>(eq: (_:T)=>(_:T)=>boolean)=> 
        (a:ReadonlyArray<T>)=> 
          (e:T)=> a.findIndex(eq(e)) >= 0,
  /**
   * array a except anything in b
   * @param eq equality test function for two Ts
   * @param a array to be filtered
   * @param b array of elements to be filtered out of a
   */ 
    except = 
      <T>(eq: (_:T)=>(_:T)=>boolean)=>
        (a:ReadonlyArray<T>)=> 
          (b:ReadonlyArray<T>)=> a.filter(not(elem(eq)(b))),
  /**
   * set a number of attributes on an Element at once
   * @param e the Element
   * @param o a property bag

   */         
    attr = (e:Element,o:Object) =>
      { for(const k in o) e.setAttribute(k,String(o[k])) }
  /**
   * Type guard for use in filters
   * @param input something that might be null or undefined
   */
  function isNotNullOrUndefined<T extends Object>(input: null | undefined | T): input is T {
    return input != null;
  }

function spaceinvaders() {
    // Inside this function you will use the classes and functions 
    // from rx.js
    // to add visuals to the svg element in pong.html, animate them, and make them interactive.
    // Study and complete the tasks in observable exampels first to get ideas.
    // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
    // You will be marked on your functional programming style
    // as well as the functionality that you implement.
    // Document your code!  

    class Vec {
      /*
      This is a vector class which allow us to create an objects of vector type to access the position of x and y.
      On the other hand it also allow us to use the provided functions to carry out arithmetic calculations


      */
      constructor(public readonly x: number = 0, public readonly y: number = 0) {}
        add = (b:Vec) => new Vec(this.x + b.x, this.y + b.y)
        sub = (b:Vec) => this.add(b.scale(-1))
        len = ()=> Math.sqrt(this.x*this.x + this.y*this.y)
        scale = (s:number) => new Vec(this.x*s,this.y*s)
        ortho = ()=> new Vec(this.y,-this.x)
        rotate = (deg:number) =>
                  (rad =>(
                      (cos,sin,{x,y})=>new Vec(x*cos - y*sin, x*sin + y*cos)
                    )(Math.cos(rad), Math.sin(rad), this)
                  )(Math.PI * deg / 180)

        static unitVecInDirection = (deg: number) => new Vec(0,-1).rotate(deg)
        static Zero = new Vec();
      }
   
    const Constants = {
    /*
      This is a constant variables which stores the key and data 
      for each and every variables which is going to be constant throughout the whole game.

    */
        CanvasSize: 600,
        BulletExpirationTime: 1000,
        BulletRadius: 4,
        BulletVelocity: 3,
        StartRockRadius: 20,
        StartRocksCount: 10,
        RockColumn : 5,
        RotationAcc: 0.3,
        ThrustAcc: 0.3,
        StartTime: 0
      } as const
    

    
    type ViewType = 'ship' | 'rock' | 'bullet' | 'rockBullet'; // our game has the following view element types:
  

   
    // Four types of game state transitions which allow us to create objects to this particular class
    class Tick { constructor(public readonly elapsed:number) {} }
    class MoveShip { constructor(public readonly direction:number) {} }
    class Rock_shoot {constructor(){}}
    class Shoot { constructor() {} }
  
    const 
    /*
    This particular game clock allow us to trigger our event such as moving the space,shooting and others
    in 10 milliseconds which eventually contributed to our game being able to run smoothly.

    */
      gameClock = interval(10)
        .pipe(map(elapsed=>new Tick(elapsed))),
  
    /*
    This function, observable stream allows us to create Observable to handle asychronous events 
    such as keyboard down event and keyboard up event 
  
    */
      observableStream = <T>(e:Event, k:Key, result:()=>T)=>
        fromEvent<KeyboardEvent>(document,e)
          .pipe(
            filter(({code})=>code === k),
            filter(({repeat})=>!repeat),
            map(result)),
      

      startLeftMove = observableStream('keydown','ArrowLeft',()=>new MoveShip(-4)), // Observable to allow ship to move left when keydown.
      startRightMove = observableStream('keydown','ArrowRight',()=>new MoveShip(4)), // Observable to allow ship to move right when keydown.
      stopLeftMove = observableStream('keyup','ArrowLeft',()=>new MoveShip(0)), // Observable to stop the ship from moving left on keyup.
      stopRightMove = observableStream('keyup','ArrowRight',()=>new MoveShip(0)), // Observable to stop the ship from moving right on keyup.
      shoot = observableStream('keydown','Space', ()=>new Shoot()), // Observable to allow space to shoot on keydown event.
      rock_shoot = interval(1000).pipe(map(_=> new Rock_shoot())) // Observable to handle random rock shooting every 1 second.


    
   
    // Declare type which will be used later for creating rocks , rocks bullet and ship bullet.
    type Circle = Readonly<{pos:Vec, radius:number}>
    type ObjectId = Readonly<{id:string,createTime:number}>
  
    interface IBody extends Circle, ObjectId {
      /*
      Create an interface which is extended from ObjectId and Circle type.

    */
      viewType: ViewType,
      vel:Vec,
      acc:Vec,
      angle:number,
      rotation:number,
      torque:number,
      row:number,
      col : number
       
      }
  
    // Declare a body type which handles all the movements,speed , acceleration of those viewType.
    /*
      Citations : " This code is originally derived from Asteroid Example coded by Sir Tim Dwyer
      link = https://stackblitz.com/edit/asteroids05?file=index.ts  "
    */
    type Body = Readonly<IBody>

   
    /*
    Game State that consist of every elements required to run this game.


    */
    type State = Readonly<{
      time:number,
      ship:Body,
      bullets:ReadonlyArray<Body>,
      rocks:ReadonlyArray<Body>,
      exit:ReadonlyArray<Body>,
      objCount:number,
      gameOver:boolean,
      score : number,
      rocks_bullet : ReadonlyArray<Body>
  
    }>
  
    
    const Bullet = (viewType: ViewType)=> (oid:ObjectId)=> (circ:Circle)=> (vel:Vec)=>
    /*
      A curried function which is used to create bullet for the ship and the rock. We can also use this function to create the rock
      since they all are having their own body we can just easily reuse this function to prevent duplicate codes.

    */
      <Body>{
        ...oid,
        ...circ,
        vel:vel,
        acc:Vec.Zero,
        angle:0, rotation:0, torque:0,
        id: viewType+oid.id,
        viewType: viewType,
      }
      
    // Since the bullet function is a curried function , we can pass one parameter at a time and when the next
    // parameter is ready then we will call either the createRock, createBullet or createRockBullet.
    //Citations : " This code is originally derived from Asteroid Example coded by Sir Tim Dwyer  link = https://stackblitz.com/edit/asteroids05?file=index.ts "
    const createRock = Bullet('rock'), createBullet = Bullet('bullet') , createRockBullet = Bullet('rockBullet')
  
    
    function createShip():Body {
    /*
    A function used to create the ship and return the body part which is the data and key objects.

    */
      return {
        id: 'ship',
        viewType: 'ship',
        pos: new Vec(Constants.CanvasSize/2,Constants.CanvasSize-50),
        vel: Vec.Zero,
        acc: Vec.Zero,
        angle:0,
        rotation:0,
        torque:0,
        radius:20,
        createTime:0,
        row: 0,
        col : 0   
      }
    }

    // StartRocks is an array which is created based on the number of initial count rocks.If also checks if the initial rock id value 
    // exceeded the rock column, if it do exceed, then we will call the createRock function and create those rock on the second row
    // else, it will create it on the first row and limit them to have rocks only equal to value of rock column.
    // Since we are not allow to use any loops due to its imperative behaviour . Hence, my implementation only allow me to create 2 rows of rocks.
    
    const startRocks = [...Array(Constants.StartRocksCount)].map((_,i)=> (Constants.RockColumn > i ) ? createRock({id:String(i), createTime:Constants.StartTime})({pos:new Vec(i*75+150,95), radius:Constants.StartRockRadius})
        (new Vec(0.3 ,0.1)) : createRock({id:String(i), createTime:Constants.StartTime})({pos:new Vec(i* 75 -230,185), radius:Constants.StartRockRadius})(new Vec(0.3, 0.1)))
              
  
    const initialState: State = {
    /*
    It is a state which stores the initial state of our game which is before the game start operating.
 
    */
        time:0,
        ship: createShip(), // call the function createShip() which was declared earlier and it returns a body.
        bullets: [], // bullets , exit and rock bullets are just an empty array initially.
        rocks: startRocks,
        exit: [],
        objCount: Constants.StartRocksCount,
        gameOver: false, // Initially game over is set to false 
        score : 0,
        rocks_bullet : [] 
      },
    
   
      torusWrap = ({x,y}:Vec) => { 
      /*
      A function to Wrap a positions around edges of the screen when it reaches the canvas size. It takes in a Vec
      and return a new vec.
      */
        const s=Constants.CanvasSize, 
        wrap = (v:number) => v < 0 ? v + s : v > s ? v - s : v;
        return new Vec(wrap(x),wrap(y))
      },
  
      // Movement for ship and bullet will be based on moveBody function.
      moveBody = (o:Body) => <Body>{
        ...o,
        pos:torusWrap(o.pos.add(o.vel).add(new Vec(o.torque))), // wrap the position of the ship and bullet when it reaches the edge of screen.
        vel: o.vel.add(o.acc)
      },

      
      // Basically this function is same as the above, except its for rocks bullet without using torus wrap so that it wont appear
      // after it reaches the edge of screen.
      // This code is originally implemented by me but based on the idea of the Asteroid Example implemented by Sir Tim Dwyer.
      moveBodyRockBullet = (o:Body) => <Body>{
        ...o,    // copy all the body except for position and vel.
        pos:(o.pos.add(o.vel).add(new Vec(o.torque))), // Do not wrap the position once it reach the edge of screen.
        vel: o.vel.add(o.acc)
      }

 
      // check a State for collisions:
      //   bullets destroy rocks spawning smaller ones
      //   ship colliding with rock ends game
    const handleCollisions = (s:State) => {
      /*
      Check a State for collisions and handle it . It is a function which takes in state type and return a state.  
      */
        const
          bodiesCollided = ([a,b]:[Body,Body]) => a.pos.sub(b.pos).len() < a.radius + b.radius, // Checks whether 2 bodies collided.Returns boolean type
          shipCollided = s.rocks.filter(r=>bodiesCollided([s.ship,r])).length > 0, // Check whether the ship have collided with the rocks.Return boolean type
          allBulletsAndRocks = flatMap(s.bullets, b=> s.rocks.map<[Body,Body]>(r=>([b,r]))), 
          collidedBulletsAndRocks = allBulletsAndRocks.filter(bodiesCollided), // It will filter out those which bodies which have been collided.
          collidedBullets = collidedBulletsAndRocks.map(([bullet,_])=>bullet), // return the array of only those bullets which is collided excluding rock
          collidedRocks = collidedBulletsAndRocks.map(([_,rock])=>rock), //  return an array of those rocks which is collided excluding bullet
          shipCollidedWithRockBullet = s.rocks_bullet.filter(r=>bodiesCollided([s.ship,r])).length > 0, // Check whether the ship have collided with the rocks bullet.Return boolean type

          cut = except((a:Body)=>(b:Body)=>a.id === b.id) // Check whether 2 bodies having the same id.
  
        return <State>{
          ...s,
          bullets: cut(s.bullets)(collidedBullets), // filter out those bullet which is already collided and return bullets which is not collided.
          rocks: cut(s.rocks)(collidedRocks), // filter out those rocks and return rocks which is not collided
          exit: s.exit.concat(collidedBullets,collidedRocks), // exit array will stores those collided bullets or rocks to be removed from svg later.
          objCount: s.objCount , 
          gameOver: shipCollided || shipCollidedWithRockBullet, // checks whether the ship have collided with rocks or ship collided with rock bullet if they do then the game will be over and it will restart automatically
          score : s.score + (collidedRocks.length * 5) // It will increment the score based on the length of the collided rocks array
          
          
          
        }
      }

      const tick = (s:State,elapsed:number) => {
        /*
        Interval is a function which takes in state and elapsed and check for those expired stuff to be eventually remove every tick seconds or 
        milliseconds.
        */
        const 
          expired = (b:Body)=>(elapsed - b.createTime) > 120, //If the ship's bullet exceed 120 it will be considered expired bullets
          expired_rock = (b:Body) => (elapsed - b.createTime) > 50, // If the rock's bullet exceed 50, it will be considered expired bullets.
          expiredBullets:Body[] = s.bullets.filter(expired), //expired ship's bullets which be stored here.
          expiredRockBullet:Body[] = s.rocks_bullet.filter(expired_rock), // expired rock's bullet will be stored here
          activeBullets = s.bullets.filter(not(expired)), // those ship's bullets which is not expired will be stored here
          activeRockBullets = s.rocks_bullet.filter(not(expired_rock)) // those rock's bullet which is not expired will be stored here

        return handleCollisions({...s, 
          ship:moveBody(s.ship), // allow movement of the ship based on moveBody function
          bullets:activeBullets.map(moveBody),  // Control the movement of the ship's bullet based on the position of the ships.
          rocks: s.rocks.map(moveBody), // Control movement of the rocks with torus wrap.
          rocks_bullet : activeRockBullets.map(moveBodyRockBullet), // control the movement of the rock's bullet without torus wrap
          exit:expiredBullets.concat(expiredRockBullet), // an array which stores expired stuff to be removed from svg after the game ended.
          time:elapsed,      
        })
      }

      
      function rockShoot(s:State):State{ 
        /*
        What this function does is that it will select random rocks position using Math.random() and for each position selected,
        it will create the bullet for that particular rock position so that every 1 second, any random rocks being selected will lauch
        a shooting to the ship.
        */
        const randomRock = Math.floor(Math.random() * s.rocks.length) ; // Select random rocks based on position index.
        const ROCKBULLET = createRockBullet({id:String(s.objCount),createTime:s.time}) // for each position selected , create the bullet for that rock
          ({radius:Constants.BulletRadius,pos:new Vec(s.rocks[randomRock].pos.x,s.rocks[randomRock].pos.y)})
          (new Vec(0,10))
       
        return <State>{
          ...s,
          rocks_bullet :s.rocks.length > 0? s.rocks_bullet.concat([ROCKBULLET]) : s.rocks_bullet, // concat the new created bullet into the rock_bullet array.
          objCount : s.objCount + 1   // every body created we will need to increment the object count by 1
        }

      }

      // state transducer
      const reduceState = (s:State, e:MoveShip|Tick|Shoot|Rock_shoot)=> {
        /*
         Encapsulate all the possible transformations of state in a function
         Checks whether the event is being triggered is an instance of one of the 4 transformation if yes it will do something to the state.

        */
         
      return  e instanceof MoveShip ? {...s,
          ship: {...s.ship,torque:e.direction} // It will use torque to determine the position of how far the x_axis will go and same goes for the y_axis.
        } :
        e instanceof Shoot ? {...s,
          bullets: s.bullets.concat([ // it the shoot event is being triggered, then it will create the bullet for the ship so that it can shoot
                ((unitVec:Vec)=>
                  createBullet({id:String(s.objCount),createTime:s.time})
                    ({radius:Constants.BulletRadius,pos:new Vec(s.ship.pos.x,s.ship.pos.y)})
                    (s.ship.vel.add(unitVec.scale(Constants.BulletVelocity)))
                 )(Vec.unitVecInDirection(s.ship.angle))]),
          objCount: s.objCount + 1 // every body created will nid to increment the object count.
          
        } : e instanceof Rock_shoot? // every 1 second interval, this event will be triggered and hence once it is triggered it will call the function rock shoot to create bullet.
        rockShoot(s):
        tick(s,e.elapsed)
      }

    function updateView(s: State) {
      /*
        Update the svg scene.This is the only impure function in this program

      */
      const 
        svg = document.getElementById("svgCanvas")!,
        ship = document.getElementById("ship")!,
        PLAYER_SCORE = document.getElementById('playerScore')!
      
      PLAYER_SCORE.innerHTML = 'Player score: ' + String(s.score) + ' points' //display the score in the svg.
      
  
      const updateBodyView = (b:Body) => {
          function createBodyView() { // create the view of each ellipse object so that it can be drawn into the svg.
            const v = document.createElementNS(svg.namespaceURI, "ellipse")!;
            attr(v,{id:b.id,rx:b.radius,ry:b.radius});
            v.classList.add(b.viewType)
            svg.appendChild(v)
            return v;
          }
          const v = document.getElementById(b.id) || createBodyView();
          attr(v,{cx:b.pos.x,cy:b.pos.y});
        };
      attr(ship,{transform:`translate(${s.ship.pos.x},${s.ship.pos.y})`}); // transform the position of x and y to allow movement of ships.
      
      s.bullets.forEach(updateBodyView);
      s.rocks.forEach(updateBodyView);
      s.rocks_bullet.forEach(updateBodyView);
      s.exit.map(o=>document.getElementById(o.id))
      
            .filter(isNotNullOrUndefined)
            .forEach(v=>{
              try {
                svg.removeChild(v)
              } catch(e) {
                // rarely it can happen that a bullet can be in exit 
                // for both expiring and colliding in the same tick,
                // which will cause this exception
                console.log("Already removed: "+v.id)
              }
            })

      // If all the rocks is being shoot down, it will unsubscribe and remove all stuff from svg and will automatically restart by calling space invader again
      if (s.rocks.length <= 0){
        subscription.unsubscribe();
        s.exit.forEach( x => { const v = document.getElementById(x.id); if (v) {svg.removeChild(v)} })
        s.rocks.forEach(x => { const v = document.getElementById(x.id); if (v) {svg.removeChild(v)}})
        s.bullets.forEach(x => { const v = document.getElementById(x.id); if (v) {svg.removeChild(v)}})
        s.rocks_bullet.forEach(x => { const v = document.getElementById(x.id); if (v) {svg.removeChild(v)}})  
        // subscription.unsubscribe();
        spaceinvaders()
      }
      if(s.gameOver) {
        // Once game Over is True, it will unsubscribe the stream of observable and will remove all stuff from svg and restart the whole game automatically
        subscription.unsubscribe();
        s.exit.forEach( x => { const v = document.getElementById(x.id); if (v) {svg.removeChild(v)} })
        s.rocks.forEach(x => { const v = document.getElementById(x.id); if (v) {svg.removeChild(v)}})
        s.bullets.forEach(x => { const v = document.getElementById(x.id); if (v) {svg.removeChild(v)}})
        s.rocks_bullet.forEach(x => { const v = document.getElementById(x.id); if (v) {svg.removeChild(v)}})    
        spaceinvaders()     
      }
    }
 
    // main game stream to produce efficiency of code with only one subscribe being used to handle the whole game.
   
    const subscription = merge(gameClock,startLeftMove,startRightMove,stopLeftMove,stopRightMove,
      shoot,rock_shoot).pipe(scan(reduceState, initialState)).subscribe(updateView)  
  
 }
  
  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      spaceinvaders();
    }
    
  
  
  
