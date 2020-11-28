var express = require('express');
var ws = require('nodejs-websocket');
var router = express.Router();
Array.prototype.randomSort = function(){
  var copy = [];
  for(var i=0;i<this.length;i++){
    copy[i] = this[i];
  }
  for(var i=0;i<copy.length;i++){
    var tmp = copy[i];
    var ran = Math.floor(Math.random()*1000%(copy.length - i) + i);
    copy[i] = copy[ran];
    copy[ran] = tmp;
  }
  return copy;
};
Array.prototype.randomGet = function(){
  var copy = this.randomSort();
  return copy[Math.floor(Math.random()*1000%copy.length)];
};
var game = {
  players:[],
  numbers:[],
  rooms:{
    room1:{
      state:0,
      conns:[],
      players:[],
    },
    room2:{
      state:0,
      conns:[],
      players:[],
    },
    room3:{
      state:0,
      conns:[],
      players:[],
    },
    room4:{
      state:0,
      conns:[],
      players:[],
    },
  },
  roomState:["空房间","等待中","已满人","对战中"],
  chatInRoom_biaoqing: function(player,code){
    if(!player.isInRoom)return ;
    var room = game.rooms[player.isInRoom];
    var msg = {
      type:"chatInRoom_biaoqing",
      player: {
        name: player.name,
        number: player.number,
      },
      code: code,
    };
    msg = JSON.stringify(msg);
    room.conns.forEach(function(current){
      current.sendText(msg);
    });
  },
  chatInRoom: function(player,text){
    if(!player.isInRoom)return ;
    var room = game.rooms[player.isInRoom];
    var msg = {
      type:"chatInRoom",
      player: {
        name: player.name,
        number: player.number,
      },
      text: text,
    };
    msg = JSON.stringify(msg);
    room.conns.forEach(function(current){
      current.sendText(msg);
    });
  },
  useZhangAiShu:function(player){
    if(!player.isInRoom)return ;
    var room = game.rooms[player.isInRoom];
    if(!room.isInGame)return ;
    var info = room["player"+(room.conns.indexOf(player)+1)];
    if(!info)return ;
    if(info.zhangAiShu <= 0)return ;
    room.evts.useZhangAiShu(info);
  },
  useBingDongShu:function(player){
    if(!player.isInRoom)return ;
    var room = game.rooms[player.isInRoom];
    if(!room.isInGame)return ;
    var info = room["player"+(room.conns.indexOf(player)+1)];
    if(!info)return ;
    if(info.bingDongShu <= 0)return ;
    room.evts.useBingDongShu(info);
  },
  moveLattics:function(player,fangxiang){
    if(!player.isInRoom)return ;
    var room = game.rooms[player.isInRoom];
    if(!room.isInGame)return ;
    var info = room["player"+(room.conns.indexOf(player)+1)];
    if(!info)return ;
    if(info.isBingDong)return ;
    room.evts.move(info,fangxiang);
  },
  gameStart:function(room){
    if(room.players.length != 2 || room.conns.length != 2)return ;
    if(!room.ready)return ;
    room.player1 = {
      conn: 0,
      player: room.players[0],
      map:[
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0]
      ],
      score: 0,
      isBingDong: false,
      bingDongShu: 0,
      zhangAiShu: 0,
    };
    room.player2 = {
      conn: 1,
      player: room.players[1],
      map:[
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0]
      ],
      score: 0,
      isBingDong: false,
      bingDongShu: 0,
      zhangAiShu: 0,
    };
    room.evts = {
      useZhangAiShu:function(player){
        var enemy = room["player"+(player.conn==0?"2":"1")];
        player.zhangAiShu--;
        var lattic = this.getFreeLattic(enemy);
        enemy.map[lattic.x][lattic.y] = "x";
        room.evts.sendPlayersInfo();
      },
      useBingDongShu:function(player){
        var enemy = room["player"+(player.conn==0?"2":"1")];
        player.bingDongShu--;
        if(typeof enemy.isBingDong != 'number')enemy.isBingDong = 0;
        enemy.isBingDong += 3;
        room.evts.sendPlayersInfo();
        if(!room.bingDongTimeout[enemy.player.number]){
          room.bingDongTimeout[enemy.player.number] = setInterval(function(){
            enemy.isBingDong--;
            if(enemy.isBingDong <= 0){
              enemy.isBingDong = false;
              clearInterval(room.bingDongTimeout[enemy.player.number]);
              delete room.bingDongTimeout[enemy.player.number];
            }
            room.evts.sendPlayersInfo();
          },1000);
        }
      },
      over:function(reason){
        var msg = {
          type:"gameOver",
        };
        if(reason.type=="dusi"){
          msg.failer = reason.player.player;
        } else if(reason.type=="timeOver"){
          msg.failer = room.player1.score > room.player2.score? room.player2.player:room.player1.player;
        } else if(reason.type=="taopao"){
          msg.failer = reason.failer;
        }
        msg = JSON.stringify(msg);
        for(var i in room){
          if(i=="state")continue;
          if(i=="conns")continue;
          if(i=="players")continue;
          if(i=="timeId"){
            clearInterval(room[i]);
          }
          delete room[i];
        }
        room.state = room.players.length;
        game.players.forEach(function(current){
          game.sendRoomState(current);
        });
        room.conns.forEach(function(current){
          current.sendText(msg);
        });
      },
      setTime:function(num){
        var sec = typeof num == 'number'?num:120;
        room.time = sec;
        room.timeId = setInterval(function(){
          room.time--;
          var msg = {
            type:"updateGameTime",
            time: room.time
          };
          msg = JSON.stringify(msg);
          room.conns.forEach(function(current){
            current.sendText(msg);
          });
          if(room.time <= 0){
            clearInterval(room.timeId);
            delete room.timeId;
            room.evts.over({
              type:"timeOver",
            });
          }
        },1000);
      },
      checkover:function(map){
        for(var i=0;i<4;i++){
          for(var k=0;k<4;k++){
            if(map[i][k] == "x")continue;
            if(map[i][k]==0){
              return false;
            }
            if(i-1>=0&&map[i-1][k] == map[i][k])return false;
            if(i+1<=3&&map[i+1][k] == map[i][k])return false;
            if(k-1>=0&&map[i][k-1] == map[i][k])return false;
            if(k+1<=3&&map[i][k+1] == map[i][k])return false;
          }
        }
        return true;
      },
      sendPlayersInfo:function(){
        var msg = {
          type:"updateRoomPlayersInfo",
          player1: room.player1,
          player2: room.player2
        };
        msg = JSON.stringify(msg);
        room.conns.forEach(function(current){
          current.sendText(msg);
        });
      },
      move:function(player,fangxiang){
        var moves = 0;
        switch(fangxiang){
          case "left":
            moves = this.moveLeft(player);
            break;
          case "right":
            moves = this.moveRight(player);
            break;
          case "top":
            moves = this.moveTop(player);
            break;
          case "bottom":
            moves = this.moveDown(player);
            break;
          default: return ;
        }
        if(moves > 0){
          this.randomSetNumber(player);
        }
        this.sendPlayersInfo();
        if(this.checkover(player.map)){
          this.over({
            type: "dusi",
            player: player,
          });
        }
      },
      moveLeft:function(player){
        var map = player.map , moves = 0 , score = 0;
        for(var i=0;i<4;i++){
          if(i==0)continue;
          for(var k=0;k<4;k++){
            if(map[i][k] == 0)continue;
            if(map[i][k] == "x")continue;
            for(var n=i-1;n>=0;n--){
              if(map[n][k]!=0){
                if(map[n][k] == map[i][k]){
                  map[n][k] *= 2;
                  map[i][k] = 0;
                  score += map[n][k];
                  if(map[n][k] == 128){
                    player.bingDongShu++;
                  } else if(map[n][k] == 256){
                    player.zhangAiShu++;
                  }
                  moves++;
                } else if(n+1 != i){
                  map[n+1][k] = map[i][k];
                  map[i][k] = 0;
                  moves++;
                }
                break;
              }
              if(n==0){
                if(map[n][k] == 0){
                  map[n][k] = map[i][k];
                  map[i][k] = 0;
                } else if(map[n][k] == map[i][k]){
                  map[n][k] *= 2;
                  map[i][k] = 0;
                  score += map[n][k];
                }
                moves++;
                break;
              }
            }
          }
        }
        player.map = map;
        if(score > 0){
          player.score += score;
        }
        return moves;
      },
      moveRight:function(player){
        var map = player.map , moves = 0 , score = 0;
        for(var i=3;i>=0;i--){
          if(i==3)continue;
          for(var k=0;k<4;k++){
            if(map[i][k] == 0)continue;
            if(map[i][k] == "x")continue;
            for(var n=i+1;n<4;n++){
              if(map[n][k]!=0){
                if(map[n][k] == map[i][k]){
                  map[n][k] *= 2;
                  map[i][k] = 0;
                  score += map[n][k];
                  if(map[n][k] == 128){
                    player.bingDongShu++;
                  } else if(map[n][k] == 256){
                    player.zhangAiShu++;
                  }
                  moves++;
                } else if(n-1 != i){
                  map[n-1][k] = map[i][k];
                  map[i][k] = 0;
                  moves++;
                }
                break;
              }
              if(n==3){
                if(map[n][k] == 0){
                  map[n][k] = map[i][k];
                  map[i][k] = 0;
                } else if(map[n][k] == map[i][k]){
                  map[n][k] *= 2;
                  map[i][k] = 0;
                  score += map[n][k];
                }
                moves++;
                break;
              }
            }
          }
        }
        player.map = map;
        if(score > 0){
          player.score += score;
        }
        return moves;
      },
      moveTop:function(player){
        var map = player.map , moves = 0 , score = 0;
        for(var i=0;i<4;i++){
          if(i==0)continue;
          for(var k=0;k<4;k++){
            if(map[k][i] == 0)continue;
            if(map[k][i] == "x")continue;
            for(var n=i-1;n>=0;n--){
              if(map[k][n]!=0){
                if(map[k][n] == map[k][i]){
                  map[k][n] *= 2;
                  map[k][i] = 0;
                  score += map[k][n];
                  if(map[k][n] == 128){
                    player.bingDongShu++;
                  } else if(map[k][n] == 256){
                    player.zhangAiShu++;
                  }
                  moves++;
                } else if(n+1 != i){
                  map[k][n+1] = map[k][i];
                  map[k][i] = 0;
                  moves++;
                }
                break;
              }
              if(n==0){
                if(map[k][n] == 0){
                  map[k][n] = map[k][i];
                  map[k][i] = 0;
                } else if(map[k][n] == map[k][i]){
                  map[k][n] *= 2;
                  map[k][i] = 0;
                  score += map[k][n];
                }
                moves++;
                break;
              }
            }
          }
        }
        player.map = map;
        if(score > 0){
          player.score += score;
        }
        return moves;
      },
      moveDown:function(player){
        var map = player.map , moves = 0 , score = 0;
        for(var i=3;i>=0;i--){
          if(i==3)continue;
          for(var k=0;k<4;k++){
            if(map[k][i] == 0)continue;
            if(map[k][i] == "x")continue;
            for(var n=i+1;n<4;n++){
              if(map[k][n]!=0){
                if(map[k][n] == map[k][i]){
                  map[k][n] *= 2;
                  map[k][i] = 0;
                  score += map[k][n];
                  if(map[k][n] == 128){
                    player.bingDongShu++;
                  } else if(map[k][n] == 256){
                    player.zhangAiShu++;
                  }
                  moves++;
                } else if(n-1 != i){
                  map[k][n-1] = map[k][i];
                  map[k][i] = 0;
                  moves++;
                }
                break;
              }
              if(n==3){
                if(map[k][n] == 0){
                  map[k][n] = map[k][i];
                  map[k][i] = 0;
                } else if(map[k][n] == map[k][i]){
                  map[k][n] *= 2;
                  map[k][i] = 0;
                  score += map[k][n];
                }
                moves++;
                break;
              }
            }
          }
        }
        player.map = map;
        if(score > 0){
          player.score += score;
        }
        return moves;
      },
      getFreeLattics:function(player){
        var map = player.map;
        var lattics = [];
        for(var i=0;i<4;i++){
          for(var k=0;k<4;k++){
            if(map[i][k]==0){
              lattics.push({x:i,y:k});
            }
          }
        }
        return lattics;
      },
      getFreeLattic:function(player){
        var lattics = this.getFreeLattics(player);
        return lattics.randomGet();
      },
      randomSetNumber:function(player,num){
        var num2 = Math.random() < 0.8?2:4;
        var lattic = this.getFreeLattic(player);
        player.map[lattic.x][lattic.y] = num2;
        if(typeof num == 'number' && --num > 0){
          this.randomSetNumber(player,num);
        }
      },
    };
    room.bingDongTimeout = {
      
    };
    room.state = 3;
    room.isInGame = true;
    room.evts.randomSetNumber(room.player1,2);
    room.evts.randomSetNumber(room.player2,2);
    room.evts.setTime(120);
    var msg = {
      type:"gameStart",
      player1:room.player1,
      player2:room.player2,
    };
    msg = JSON.stringify(msg);
    room.conns.forEach(function(current){
      current.sendText(msg);
    });
    game.players.forEach(function(current){
      game.sendRoomState(current);
    });
  },
  gameReadyStart:function(player){
    if(!player.isInRoom)return ;
    var room = game.rooms[player.isInRoom];
    if(room.players.length != 2 || room.conns.length != 2){
      player.sendText(JSON.stringify({type:"gameReadyStartFail",reason:"原因：人数不足"}));
      return ;
    }
    if(!room.ready){
      player.sendText(JSON.stringify({type:"gameReadyStartFail",reason:"原因：玩家尚未准备"}));
      return ;
    }
    game.gameStart(room);
  },
  playerUnReady:function(player){
    if(!player.isInRoom)return ;
    var room = game.rooms[player.isInRoom];
    if(!room.ready)return ;
    delete room.ready;
    room.conns.forEach(function(current){
      game.sendRoomInfo(current);
    });
  },
  playerReady:function(player){
    if(!player.isInRoom)return ;
    var room = game.rooms[player.isInRoom];
    if(room.ready) return ;
    room.ready = true;
    room.conns.forEach(function(current){
      game.sendRoomInfo(current);
    });
  },
  sendRoomInfo:function(player){
    var room = game.rooms[player.isInRoom];
    if(!room) return ;
    var msg = {
      type:"updateMyRoom",
      roomInfo:{
        state: room.state,
        players: room.players,
        ready: room.ready||false,
      },
    };
    player.sendText(JSON.stringify(msg));
  },
  sendRoomState:function(player){
    var msg = {
      room1:{},
      room2:{},
      room3:{},
      room4:{},
    };
    for(var i in game.rooms){
      for(var k in game.rooms[i]){
        if(k != 'state' && k != 'players')continue;
        msg[i][k] = game.rooms[i][k];
      }
      msg[i].state = game.roomState[msg[i].state];
    }
    msg = JSON.stringify({
      type:"roomState",
      rooms: msg
    });
    player.sendText(msg);
  },
  leaveRoom:function(player){
    if(!player.isInRoom) return ;
    var room = game.rooms[player.isInRoom];
    var findPlayer = null;
    for(var i=0;i<room.players.length;i++){
      if(room.players[i].number === player.number){
        findPlayer = room.players[i];
      }
    }
    room.players.splice(room.players.indexOf(findPlayer),1);
    room.conns.splice(room.conns.indexOf(player),1);
    room.state = room.players.length?1:0;
    if(room.isInGame){
      room.evts.over({
        type:"taopao",
        failer: {
          name: player.name,
          number: player.number
        }
      });
    }
    delete room.ready;
    delete player.isInRoom;
    game.players.forEach(function(current){
      game.sendRoomState(current);
    });
    if(room.conns.length){
      room.conns.forEach(function(current){
        game.sendRoomInfo(current);
      });
    }
  },
  joinRoom:function(player,room,id){
    var state = room.state;
    var msg = {
      type: room.state>1?"joinRoomFail":"joinRoomSuccess",
      roomId: id,
    };
    player.sendText(JSON.stringify(msg));
    if(msg.type == "joinRoomSuccess"){
      player.isInRoom = id;
      room.conns.push(player);
      room.players.push({
        name: player.name,
        number: player.number,
        state: 0,
      });
      room.state ++;
      game.players.forEach(function(current){
        game.sendRoomState(current);
      });
      if(room.players.length && room.conns.length){
        room.conns.forEach(function(current){
          game.sendRoomInfo(current);
        });
      }
    }
  },
  chatInWorld:function(player,msg){
    if(game.players.indexOf(player) == -1)return ;
    var msg = {
      type:"chatInWorld",
      source: {
        name: player.name,
        number: player.number
      },
      text: msg
    };
    msg = JSON.stringify(msg);
    game.players.forEach(function(current){
      current.sendText(msg);
    });
  },
  randNumber:function(){
    var num = Math.floor(Math.random()*10000%9000 + 1000);
    while(game.numbers.indexOf(num) != -1){
      num = Math.floor(Math.random()*10000%9000 + 1000);
    }
    return num;
  },
  removePlayer:function(player){
    var pos = game.players.indexOf(player);
    if(pos == -1)return ;
    game.numbers.splice(game.numbers.indexOf(player.number),1);
    game.players.splice(game.players.indexOf(player),1);
    if(player.isInRoom){
      game.leaveRoom(player);
    }
    player.sendText(JSON.stringify({type:"logoutSuccess"}));
    var msg = {
      type:"playerLogout",
      name: player.name,
      id: player.number,
      count: game.players.length
    };
    msg = JSON.stringify(msg);
    game.players.forEach(function(current){
      current.sendText(msg);
    });
  },
  addPlayer:function(player){
    if(game.players.indexOf(player) != -1){
      player.sendText(JSON.stringify({
        type:"loginFail"
      }));
      return ;
    }
    var num = game.randNumber();
    player.number = num;
    game.numbers.push(num);
    game.players.push(player);
    game.sendRoomState(player);
    player.sendText(JSON.stringify({
      type:"loginSuccess",
      number: player.number,
    }));
    var msg = {
      type:"newPlayer",
      name: player.name,
      id: player.number,
      count: game.players.length,
    };
    msg = JSON.stringify(msg);
    game.players.forEach(function(current){
      current.sendText(msg);
    });
  },
};

console.log("正在建立websocket");

ws.createServer(function(conn){
  conn.on("text",function(str){
    var msg = JSON.parse(str);
    if(msg.type == "login"){
      conn.name = msg.name;
      game.addPlayer(conn);
      console.log(conn.name+"["+conn.number+"]",str);
    } else if(msg.type == "logout"){
      game.removePlayer(conn);
      console.log(conn.name+"["+conn.number+"]",str);
    } else if(msg.type=="chatInWorld"){
      game.chatInWorld(conn,msg.str);
      console.log(conn.name+"["+conn.number+"]",str);
    } else if(msg.type=="joinRoom"){
      game.joinRoom(conn,game.rooms[msg.room],msg.room);
    } else if(msg.type=="leaveRoom"){
      game.leaveRoom(conn);
    } else if(msg.type=="getMyRoomInfo"){
      game.sendRoomInfo(conn);
    } else if(msg.type=="playerReady"){
      game.playerReady(conn);
    } else if(msg.type=="playerUnReady"){
      game.playerUnReady(conn);
    } else if(msg.type=="gameReadyStart"){
      game.gameReadyStart(conn);
    } else if(msg.type=="moveLattics"){
      game.moveLattics(conn,msg.fangxiang);
    } else if(msg.type=="useBingDongShu"){
      game.useBingDongShu(conn);
    } else if(msg.type=="useZhangAiShu"){
      game.useZhangAiShu(conn);
    } else if(msg.type=="chatInRoom"){
      game.chatInRoom(conn,msg.text);
      console.log(conn.name+"["+conn.number+"]",str);
    } else if(msg.type=="chatInRoom_biaoqing"){
      game.chatInRoom_biaoqing(conn,msg.code);
      console.log(conn.name+"["+conn.number+"]",str);
    }
  });
  
  conn.on("close",function(code,reason){
    game.removePlayer(conn);
  });
  
  conn.on("error",function(code,reason){
    game.removePlayer(conn);
  });
}).listen(8101);
console.log("websocket建立完成");
module.exports = function(app){
  app.get('/2048',function(req,res){
    res.render('index', { title: '' });
  });
};
