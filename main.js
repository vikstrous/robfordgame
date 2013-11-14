var Game = Backbone.Model.extend({
    defaults: {
        w: 500,
        h: 500,
        fps: 30,
        ctx: null,
        timer_min: 1,//seconds
        timer_max: 2, //seconds
        mousex: 500/2 - 100/2, // on top of player's original position
        mousey: 0
    }
});

var Player = Backbone.Model.extend({
    defaults: {
        score: 0,
        s: 300, //px per second
        w: 100,
        h: 100,
        x: 500/2 - 100/2, // centered in the middle of the screen
        y: 500 - 100, // subtract width
        drunk: 1 // multiplier affecting speed and direction of movement
    }
});

var Item = Backbone.Model.extend({
    defaults: function(){
        var ret = {
            type: "crack",
            w: 20,
            h: 20,
            y: 0,
            min_s: 30, // pixels per second
            max_s: 100 // pixels per second
        }
        ret.x = Math.random() * (game.get('w') - ret.w);
        ret.s = Math.round((Math.random() * (ret.max_s - ret.min_s) + ret.min_s) / game.get('fps')); // speed
        return ret;
    }
});

var Items = Backbone.Collection.extend({
    model: Item
});

var game = new Game;
var player = new Player;
var items = new Items;

var timer = 1;

function render(){
    // background
    game.get('ctx').fillStyle = "rgba(255, 255, 255, 1)";
    game.get('ctx').fillRect(0, 0, game.get('w'), game.get('h'));
    // initialize with some dummy data
    timer--;
    if (timer == 0) {
        items.add(new Item);
        timer = Math.round((Math.random() * (game.get('timer_max') - game.get('timer_min')) + game.get('timer_min')) * game.get('fps'));
    }
    // falling things
    items.each(function(item){
        game.get('ctx').fillStyle = "rgb(200,0,0)";
        game.get('ctx').fillRect(item.get('x'), item.get('y'), item.get('w'), item.get('h'));
    });
    game.get('ctx').fillStyle = "rgb(0,0,200)";
    game.get('ctx').fillRect(player.get('x'), player.get('y'), player.get('w'), player.get('h'));
}

function move(){
    var next;
    if(game.get('mousex') > player.get('x')+player.get('w')){
        next = player.get('x') + player.get('s') / game.get('fps') * player.get('drunk');
        if (next < game.get('w') - player.get('w') && next >= 0) {
            player.set('x', next);
        }
    }
    if(game.get('mousex') < player.get('x')){
        next = player.get('x') - player.get('s') / game.get('fps') * player.get('drunk');
        if (next < game.get('w') - player.get('w') && next >= 0) {
            player.set('x', next);
        }
    }
    // TODO: is this efficient?
    items.reset(items.filter(function(item){
        next = item.get('y') + item.get('s');
        item.set('y', next);
        if (next + item.get('h') > game.get('h') - player.get('h') && // fell low enough for collision  and overlaps
            (
                (
                    item.get('x') < player.get('x') && 
                    item.get('x') + item.get('w') >= player.get('x')
                )
            ||
                (
                    item.get('x') + item.get('w') > player.get('x') + player.get('w') && 
                    item.get('x') <= player.get('x') + player.get('w')
                )
            ||
                (
                    item.get('x') > player.get('x') && 
                    item.get('x') + item.get('w') < player.get('x') + player.get('w')
                )
            )
            ) {
            return false;
        }
        return next < game.get('h');
    }));
}

function tick(){
    move();
    render();
}

function init(){
    // TODO: better scheduling of drawing
    setInterval(tick, 1000/game.get('fps'));
    var canvas = $('#canvas');
    canvas.mousemove(function(e){
        var pos = canvas.position();
        game.set('mousex', e.pageX - pos.left);
        game.set('mousey', e.pageY - pos.top);
    });
}


$(function(){
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    
    game.set('ctx', ctx);

    // begin the game
    init();
});
