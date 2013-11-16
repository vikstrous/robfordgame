var Util = {
    rand: function(l, h) {
        return (Math.random() * (h-l))+l;
    },
    randInt: function(l, h) {
        return Math.floor((Math.random() * (h-l+1))+l);
    },
    randChoice: function(is, ps) { // items and probabilities
        var total = _.reduce(ps, function(a,b){ return a+b; }, 0);
        var choice = Util.rand(0, total);
        var current = 0;
        for (var i = 0; i < ps.length; i++){
            var p = ps[i];
            current += p;
            if (choice < current) {
                return is[i];
            }
        }
    }
}

var Game = {
    w: 500,
    h: 500,
    fps: 60,
    ctx: null,
    timer_min: 1,//seconds
    timer_max: 2, //seconds
    mousex: 500/2 - 70/2, // on top of player's original position
    mousey: 0
}

var Player = Backbone.Model.extend({
    defaults: {
        score: 0,
        crack: 0.5,
        addiction: 0.01, // crack per second needed
        tolerance: 0.02, // how much crack per pill
        s: 0, // speed in px per second
        max_s: 300, // speed in px per second
        max_s_original: 300, // speed in px per second DO NOT CHANGE
        a: 2000, // acceleration in px per second per second
        w: 70,
        h: 70,
        x: 500/2 - 70/2, // centered in the middle of the screen
        y: 500 - 70, // subtract width
        drunk: 1 // multiplier affecting speed and direction of movement
    }
});

var Item = Backbone.Model.extend({
    defaults: function(){
        var ret = {
            w: 20,
            h: 20,
            y: 0,
            min_s: 30, // pixels per second
            max_s: 100 // pixels per second
        }
        switch (Util.randChoice(['crack','football','food','alcohol'], [0.9, 0.04, 0.04, 0.1])){
            case "crack":
                ret.type = "crack";
                break;
            case "football":
                ret.type = "football";
                ret.derp = 2000; // duration
                break;
            case "food":
                ret.type = "food";
                ret.fat = 0.5; // how much it slows you down by
                ret.calories = 4000; // duration
                break;
            case "alcohol":
                ret.type = "alcohol";
                ret.alcohol = 5000; // duration
                break;
        };
        ret.x = Util.rand(0, Game.w - ret.w);
        ret.s = Util.rand(ret.min_s / Game.fps, ret.max_s / Game.fps ); // speed
        return ret;
    }
});

var Items = Backbone.Collection.extend({
    model: Item
});

var player = new Player;
var items = new Items;

var timer = 1;

function render(){
    // background
    Game.ctx.fillStyle = "rgba(245, 255, 255, 1)";
    Game.ctx.fillRect(0, 0, Game.w, Game.h);
    // initialize with some dummy data
    timer--;
    if (timer == 0) {
        items.add(new Item);
        timer = Util.randInt(Game.timer_min*Game.fps, Game.timer_min*Game.fps);
    }
    // falling things
    items.each(function(item){
        switch (item.get('type')) {
            case 'crack':
                Game.ctx.fillStyle = "rgb(230,230,230)";
                break;
            case 'football':
                Game.ctx.fillStyle = "rgb(200,0,0)";
                break;
            case 'food':
                Game.ctx.fillStyle = "rgb(100,150,0)";
                break;
            case 'alcohol':
                Game.ctx.fillStyle = "rgb(100,100,100)";
                break;
            default:
                Game.ctx.fillStyle = 'rgb(0,0,0)';
        }
        Game.ctx.fillRect(item.get('x'), item.get('y'), item.get('w'), item.get('h'));
    });
    Game.ctx.fillStyle = "rgb(0,0,200)";
    Game.ctx.fillRect(player.get('x'), player.get('y'), player.get('w'), player.get('h'));
}

function move(){
    var next;
    var s = player.get('s');
    var a = player.get('a') / Game.fps;
    var max_s = player.get('max_s');
    player.set('crack', Math.max(0, player.get('crack') - player.get('addiction')/Game.fps));
    if(player.get('crack') == 0) {
        gameOver();
        return;
    }
    if(Game.mousex + 1 >= player.get('x') + player.get('w')) {
        // mouse is to the right, increase speed to the right
        if (s+a < max_s && s+a > -max_s) {
            s = s+a;
            player.set('s', s);
        }
    } else if(Game.mousex - 1 <= player.get('x')){
        // mouse is to the left, increase speed to the left
        if (s-a < max_s && s-a > -max_s) {
            s = s-a;
            player.set('s', s);
        }
    } else {
        // slow down
        player.set('s', s > 0 ? Math.max(s - a/2, 0) : Math.min(s + a/2, 0));
    }
    next = player.get('x') + player.get('s') / Game.fps * player.get('drunk');
    if (next < Game.w - player.get('w') && next >= 0) {
        player.set('x', next);
    } else {
        player.set('s', 0); // stop moving
    }
    // TODO: is this efficient?
    items.reset(items.filter(function(item){
        next = item.get('y') + item.get('s');
        item.set('y', next);
        if (next + item.get('h') > player.get('y') && // fell low enough for collision  and overlaps
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
            switch(item.get('type')){
                case 'crack':
                    player.set('score', player.get('score') + 1);
                    player.set('crack', Math.min(player.get('crack') + player.get('tolerance'), 1));
                    break;
                case 'alcohol':
                    player.set('score', player.get('score') + 2);
                    var drunk = Util.rand(-0.5, 0.5);
                    drunk += drunk > 0 ? drunk + 0.5 : drunk - 0.5; // min speed
                    player.set('drunk', drunk);
                    clearInterval(soberUp);
                    soberUp = setTimeout(function(){
                        player.set('drunk', 1);
                    }, item.get('alcohol'));
                    break;
                case 'food':
                    var s = player.get('s');
                    var max_s = player.get('max_s_original');
                    var fat = item.get('fat');
                    // slow down to "fat" * max_s
                    player.set('s', s > 0 ? Math.min(s, fat * max_s) : Math.max(s, fat * max_s));
                    player.set('max_s', fat * max_s);
                    clearInterval(getUp);
                    clearInterval(endFoodComa);
                    var endFoodComa = setTimeout(function(){
                        player.set('max_s', player.get('max_s_original'));
                    }, item.get('calories'));

                    break;
                case 'football':
                    player.set('s', 0);
                    player.set('max_s', 0);
                    clearInterval(getUp);
                    clearInterval(endFoodComa);
                    var getUp = setTimeout(function(){
                        player.set('max_s', player.get('max_s_original'));
                    }, item.get('derp'));
                    break;
            }
            return false;
        }
        return next < Game.h;
    }));
}

function tick(){
    move();
    render();
}

var tickInterval;
var soberUp;
var getUp;
var endFoodComa;

function init(){
    // TODO: better scheduling of drawing
    tickInterval = setInterval(tick, 1000/Game.fps);
    var canvas = $('#canvas');
    canvas.mousemove(function(e){
        var pos = canvas.position();
        Game.mousex = e.pageX - pos.left;
        Game.mousey = e.pageY - pos.top;
    });
}

function gameOver(){
    clearInterval(tickInterval);
}


$(function(){
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    $score = $('#score');
    $crack = $('#crack');
    
    Game.ctx = ctx;
    player.on('change:score', function (){
        $score.text(Math.ceil(player.get('score')));
    });
    player.on('change:crack', function (){
        $crack.text(Math.ceil(player.get('crack')*100));
    });

    // begin the Game
    init();
});
