(function(){  
  var _status = {};
  var lib = {
    ip:"172.25.149.233",
    init:{
      init: function(){
        lib.init.pack();
        window.onload = function(){
          document.body.ontouchmove = function (e) {
            e.preventDefault();
          };
          
          game.frames.loading.show();
          game.frames.loading.loadImage(function(){
            game.frames.loading.hide();
            game.frames.login.show();
          });
        };
      },
      pack: function(){
        game.frames.loading = ui.create.pack({
          comps:{
            text: ui.create.div(".loading_text","正在加载资源(0%)"),
          },
          tags:{
            loadImage:function(callback){
              var count = 0 , all = 30;
              var that = this.nodes.text;
              function loadImage(num){
                var img = new Image();
                if(num < 10) num = "0" + num;
                img.src = "http://"+lib.ip+":80/images/biaoqing/c"+num+".ico";
                img.timeId = setInterval(function(){
                  if(img.complete){
                    count++;
                    that.innerHTML = "正在加载资源("+Math.floor((count/all)*100)+"%)"
                    clearInterval(img.timeId);
                  }
                },50);
              }
              var timeId = setInterval(function(){
                if(count >= all){
                  that.innerHTML = "加载完成";
                  if(typeof callback == "function"){
                    callback();
                  }
                  clearInterval(timeId);
                }
              },50);
              for(var i=1;i<=all;i++){
                loadImage(i);
              }
            },
          },
        });
        game.frames.login = ui.create.pack({
          comps:{
            header: ui.create.div(".login_header","输入游戏名字"),
            input: ui.create.div(".login_input",{
              comps:{
                input: ui.create.input(".login_input_input",{
                  tags:{
                    autofocus:"autofocus",
                    maxlength: 6,
                    value: localStorage.getItem("cxy2048_lastName")||"",
                  },
                  evts:{
                    focus: function(){
                      game.frames.login.nodes.input.style["border-bottom"] = "1px solid rgb(200,20,20)";
                    },
                    blur: function(){
                      game.frames.login.nodes.input.style["border-bottom"] = "1px solid rgb(150,150,150)";
                    },
                  },
                }),
              },
            }),
            button: ui.create.div(".login_button","进入大厅",{
              evts:{
                click:function(){
                  var value = game.frames.login.nodes.input.nodes.input.value;
                  if(!value)return ;
                  if(!game.me)game.me = {};
                  game.me.name = value;
                  localStorage.setItem("cxy2048_lastName",game.me.name);
                  game.ws = game.createWs();
                },
              },
            }),
          },
        });
        game.frames.hall = ui.create.pack({
          comps: {
            exit: ui.create.div(".hall_exit hall_button","退出大厅",{
              evts:{
                click:function(){
                  if(game.ws){
                    game.ws.send(JSON.stringify({
                      type:"logout"
                    }));
                  }
                },
              },
            }),
            chat: ui.create.div(".hall_chat hall_button","聊天",{
              evts:{
                click:function(){
                  game.prompt("输入聊天内容",function(str){
                    var msg = {
                      type:"chatInWorld",
                      str: str 
                    }
                    game.ws.send(JSON.stringify(msg));
                  })
                },
              },
            }),
            online: ui.create.div(".hall_online hall_button","在线",{
              comps:{
                count: ui.create.div(".hall_online_count","0",{
                  tags:{
                    update:function(count){
                      var str = "" + count;
                      if(count > 999){
                        str = "999";
                      }
                      this.innerHTML = str;
                    },
                  },
                }),
              },
            }),
            msgArea: ui.create.div(".hall_msgArea"),
            rooms: ui.create.div(".hall_rooms",{
              comps:{
                room1: ui.create.room(1),
                room2: ui.create.room(2),
                room3: ui.create.room(3),
                room4: ui.create.room(4),
              },
            }),
          },
        });
        game.frames.game = ui.create.pack({
          comps: {
            time: ui.create.div(".game_time","120").hide(),
            mineArea: ui.create.div(".game_mineArea",{
              comps: ui.create.lattics(),
              tags:{
                update:function(map){
                  if(!map)map = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
                  var lattics = this.nodes;
                  for(var i=0;i<4;i++){
                    for(var k=0;k<4;k++){
                      lattics["lattics"+i+k].setAttribute("latticValue",map[i][k]);
                      if(map[i][k] != 0)
                        lattics["lattics"+i+k].nodes.span.innerHTML = map[i][k];
                      else 
                        lattics["lattics"+i+k].nodes.span.innerHTML = "";
                    }
                  }
                },
                showBingDong:function(num){
                  var lattics = this.nodes;
                  for(var i in lattics){
                    lattics[i].showBingDong(num);
                  }
                },
                hideBingDong:function(){
                  var lattics = this.nodes;
                  for(var i in lattics){
                    lattics[i].hideBingDong();
                  }
                },
              },
              evts:{
                touchstart:function(e){
                  if(!_status.touch){
                    _status.touch = {};
                  }
                  _status.touch = {
                    x: e.changedTouches[0].clientX,
                    y: e.changedTouches[0].clientY,
                  };
                },
                touchend:function(e){
                  if(!_status.touch)return ;
                  var touch = {
                    x: e.changedTouches[0].clientX,
                    y: e.changedTouches[0].clientY,
                  };
                  var fangxiang = get.fangxiang(_status.touch,touch);
                  if(!fangxiang)return ;
                  if(!game.ws)return ;
                  game.ws.send(JSON.stringify({type:"moveLattics",fangxiang:fangxiang}));
                },
              },
            }),
            enemyArea: ui.create.div(".game_enemyArea",{
              comps: ui.create.latticsx(),
              tags:{
                update:function(map){
                  if(!map)map = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
                  var lattics = this.nodes;
                  for(var i=0;i<4;i++){
                    for(var k=0;k<4;k++){
                      lattics["lattics"+i+k].setAttribute("latticValue",map[i][k]);
                      if(map[i][k] != 0)
                        lattics["lattics"+i+k].nodes.span.innerHTML = map[i][k];
                      else 
                        lattics["lattics"+i+k].nodes.span.innerHTML = "";
                    }
                  }
                },
                showBingDong:function(num){
                  var lattics = this.nodes;
                  for(var i in lattics){
                    lattics[i].showBingDong(num);
                  }
                },
                hideBingDong:function(){
                  var lattics = this.nodes;
                  for(var i in lattics){
                    lattics[i].hideBingDong();
                  }
                },
              },
            }),
            mine: ui.create.div(".game_mine",{
              comps:{
                hoster: ui.create.div(".game_mine_hoster","房主").hide(),
                name: ui.create.div(".game_mine_name","(我)").hide(),
                score: ui.create.div(".game_mine_score",{
                  comps:{
                    title: ui.create.div(".game_enemy_score_title","得分"),
                    score: ui.create.div(".game_enemy_score_score","0"),
                  },
                }).hide(),
                readyButton: ui.create.div(".game_mine_readyButton","准备",{
                  evts:{
                    click:function(){
                      if(this.innerHTML == "准备"){
                        game.ws.send(JSON.stringify({type:"playerReady"}));
                      } else {
                        game.ws.send(JSON.stringify({type:"playerUnReady"}));
                      }
                    },
                  },
                  tags:{
                    isReady:function(){
                      this.innerHTML = "已准备";
                    },
                    isUnReady:function(){
                      this.innerHTML = "准备";
                    },
                  },
                }).hide(),
                startButton: ui.create.div(".game_mine_startButton","开始",{
                  evts:{
                    click:function(){
                      game.ws.send(JSON.stringify({type:"gameReadyStart"}));
                    },
                  },
                }).hide(),
                skillArea: ui.create.div(".game_mine_skillArea",{
                  comps: {
                    bingDongShu: ui.create.div(".game_mine_skillArea_bingDongShu","冻",{
                      comps:{
                        count: ui.create.div(".game_mine_skillArea_bingDongShu_count","0"),
                      },
                      evts:{
                        click:function(){
                          if(this.nodes.count.innerHTML == "0")return ;
                          game.ws.send(JSON.stringify({type:"useBingDongShu"}));
                        },
                      },
                    }),
                    zhangAiShu: ui.create.div(".game_mine_skillArea_zhangAiShu","障",{
                      comps:{
                        count: ui.create.div(".game_mine_skillArea_zhangAiShu_count","0"),
                      },
                      evts:{
                        click:function(){
                          if(this.nodes.count.innerHTML == "0")return ;
                          game.ws.send(JSON.stringify({type:"useZhangAiShu"}));
                        },
                      },
                    }),
                  },
                }).hide(),
              },
              tags:{
                update:function(info){
                  if(!info) info = {
                    bingDongShu:0,
                    zhangAiShu:0,
                    score:0,
                  };
                  var map = game.frames.game.nodes.mineArea;
                  map.update(info.map);
                  this.nodes.skillArea.nodes.bingDongShu.nodes.count.innerHTML = info.bingDongShu;
                  this.nodes.skillArea.nodes.zhangAiShu.nodes.count.innerHTML = info.zhangAiShu;
                  this.nodes.score.nodes.score.innerHTML = info.score;
                  this.nodes.skillArea.show();
                  this.nodes.name.show();
                  this.nodes.score.show();
                  if(info.isBingDong){
                    map.showBingDong(info.isBingDong);
                  } else {
                    map.hideBingDong();
                  }
                },
              },
            }),
            enemy: ui.create.div(".game_enemy",{
              comps:{
                hoster: ui.create.div(".game_enemy_hoster","房主").hide(),
                name: ui.create.div(".game_enemy_name","(敌)").hide(),
                score: ui.create.div(".game_enemy_score",{
                  comps:{
                    title: ui.create.div(".game_enemy_score_title","得分"),
                    score: ui.create.div(".game_enemy_score_score","0"),
                  },
                }).hide(),
                readyArea: ui.create.div(".game_enemy_readyArea",{
                  comps:{
                    text: ui.create.div(".game_enemy_readyArea_text","已准备"),
                  },
                }).hide(),
                skillArea: ui.create.div(".game_enemy_skillArea",{
                  comps:{
                    bingDongShu: ui.create.div(".game_enemy_skillArea_bingDongShu","冻",{
                      comps:{
                        count: ui.create.div(".game_enemy_skillArea_bingDongShu_count","0"),
                      },
                    }),
                    zhangAiShu: ui.create.div(".game_enemy_skillArea_zhangAiShu","障",{
                      comps:{
                        count: ui.create.div(".game_enemy_skillArea_zhangAiShu_count","0"),
                      },
                    }),
                  },
                }).hide(),
              },
              tags:{
                update:function(info){
                  if(!info) info = {
                    bingDongShu:0,
                    zhangAiShu:0,
                    score:0,
                  };
                  var map = game.frames.game.nodes.enemyArea;
                  map.update(info.map);
                  this.nodes.skillArea.nodes.bingDongShu.nodes.count.innerHTML = info.bingDongShu;
                  this.nodes.skillArea.nodes.zhangAiShu.nodes.count.innerHTML = info.zhangAiShu;
                  this.nodes.score.nodes.score.innerHTML = info.score;
                  this.nodes.skillArea.show();
                  this.nodes.name.show();
                  this.nodes.score.show();
                  if(info.isBingDong){
                    map.showBingDong(info.isBingDong);
                  } else {
                    map.hideBingDong();
                  }
                },
              },
            }),
            exit: ui.create.div(".game_exit hall_button","退出房间",{
              evts:{
                click:function(){
                  var msg = {
                    type:"leaveRoom",
                  };
                  game.ws.send(JSON.stringify(msg));
                  game.frames.game.hide();
                  game.frames.hall.show();
                }
              },
            }).hide(),
            chat: ui.create.div(".game_chat hall_button","聊天",{
              evts:{
                click:function(){
                  game.prompt("请输入聊天内容",function(str){
                    game.ws.send(JSON.stringify({type:"chatInRoom",text:str}));
                  });
                },
              },
            }),
            mineChat: ui.create.div(".game_mineChat",{
              tags:{
                onshow:function(){
                  var chat = this;
                  setTimeout(function(){
                    chat.hide();
                    chat.innerHTML = "";
                  },3000);
                },
              },
            }).hide(),
            enemyChat: ui.create.div(".game_enemyChat",{
              tags:{
                onshow:function(){
                  var chat = this;
                  setTimeout(function(){
                    chat.hide();
                    chat.innerHTML = "";
                  },3000);
                },
              },
            }).hide(),
            express: ui.create.div(".game_express hall_button","表情",{
              evts:{
                click:function(){
                  var pack = ui.create.div(".biaoqing",{
                    comps:{
                      biaoqings:ui.create.div(".biaoqing_biaoqings",{
                        comps:ui.create.biaoqing(),
                      }),
                      close: ui.create.div(".biaoqing_close hall_button","关闭",{
                        evts:{
                          click:function(){
                            this.parentElement.hide();
                          },
                        },
                      }),
                    },
                    tags:{
                      hide:function(){
                        document.body.removeChild(this);
                      },
                    },
                  });
                  document.body.appendChild(pack);
                },
              },
            }),
          },
          tags:{
            gameOver:function(result){
              var pack = ui.create.div(".gameOver",{
                comps:{
                  text: ui.create.div(".gameOver_text "+(result?"win":"fail"),result?"胜利":"失败"),
                },
                evts:{
                  click:function(){
                    document.body.removeChild(this);
                    game.frames.game.reReady();
                    game.ws.send(JSON.stringify({type:"getMyRoomInfo"}));
                  },
                },
              });
              
              document.body.appendChild(pack);
            },
            gameStart:function(msg){
              this.reReady();
              this.nodes.exit.hide();
              var me = null , enemy = null;
              if(msg.player1.player.number == game.me.number){
                me = msg.player1;
                enemy = msg.player2;
              } else {
                me = msg.player2;
                enemy = msg.player1;
              }
              this.nodes.mine.update(me);
              this.nodes.enemy.update(enemy);
            },
            onshow:function(){
               if(game.ws)
                 game.ws.send(JSON.stringify({type:"getMyRoomInfo"}));
            },
            updateRoomPlayersInfo:function(msg){
              var me = null , enemy = null;
              if(msg.player1.player.number == game.me.number){
                me = msg.player1;
                enemy = msg.player2;
              } else {
                me = msg.player2;
                enemy = msg.player1;
              }
              this.nodes.mine.update(me);
              this.nodes.enemy.update(enemy);
            },
            reReady:function(){
              this.nodes.mine.update();
              this.nodes.enemy.update();
              var mine = this.nodes.mine.nodes;
              var enemy = this.nodes.enemy.nodes;
              for(var i in mine){
                mine[i].hide();
              }
              for(var i in enemy){
                enemy[i].hide();
              }
              mine.readyButton.isUnReady();
              this.nodes.exit.show();
              this.nodes.time.hide();
            },
            updateInfo:function(roomInfo){
              this.reReady();
              var players = roomInfo.players;
              var me = null , enemy = null; 
              if(players[0].number == game.me.number){
                me = players[0];
                if(players[1]) enemy = players[1];
              } else if(players.length){
                enemy = players[0];
                me = players[1];
              }
              me == players[0]?this.nodes.mine.nodes.hoster.show():this.nodes.enemy.nodes.hoster.show();
              me == players[0]?this.nodes.mine.nodes.startButton.show():this.nodes.mine.nodes.readyButton.show();
              this.nodes.mine.nodes.name.innerHTML = me.name + "(我)";
              this.nodes.mine.nodes.name.show();
              if(enemy){
                this.nodes.enemy.nodes.name.innerHTML = enemy.name + "(敌)";
                this.nodes.enemy.nodes.name.show();
              }
              if(roomInfo.ready){
                me != players[0] ? this.nodes.mine.nodes.readyButton.isReady():this.nodes.enemy.nodes.readyArea.show();
              } else {
                this.nodes.mine.nodes.readyButton.isUnReady();
              }
              if(roomInfo.ready && me != players[0]){
                this.nodes.exit.hide();
              }
            },
          },
        });
      },
    },
  };
  var game = {
    frames:{},
    alert:function(info){
      var frame = ui.create.div('#cxyDYBMAlert');
      var body = ui.create.div('#cxyDYBMAlert_body');
      var comps = {
        title:ui.create.div('#cxyDYBMAlert_body_title','提示'),
        text: ui.create.div('#cxyDYBMAlert_body_text',info),
        okButton: ui.create.div('#cxyDYBMAlert_body_okButton','确定'),
      };
      for(var i in comps){
        body.appendChild(comps[i]);
      }
      frame.hide = function(){
        document.body.removeChild(this);
      };
      comps.okButton.addEventListener('click',function(){
        frame.hide();
      });
      frame.appendChild(body);
      document.body.appendChild(frame);
      return frame;
    },
    prompt:function(title,onDown){
      var frame = ui.create.div('#cxyDYBMPrompt');
      var body = ui.create.div('#cxyDYBMPrompt_body');
      var comps = {
        title:ui.create.div('#cxyDYBMPrompt_body_title',title||'请输入'),
        input:(function(title){
          var input = document.createElement('input');
          input.id = 'cxyDYBMPrompt_body_input';
          input.placeholder = title||'';
          input.setAttribute("maxlength",20);
          return input;
        })(title),
        cancelButton:ui.create.div('#cxyDYBMPrompt_body_cancelButton','取消'),
        okButton:ui.create.div('#cxyDYBMPrompt_body_okButton','确定'),
      };
      
      for(var i in comps){
        body.appendChild(comps[i]);
      }
      frame.hide = function(){
        document.body.removeChild(this);
      };
      comps.cancelButton.addEventListener('click',function(){
        frame.hide();
      });
      comps.okButton.addEventListener('click',function(){
        var value = comps.input.value;
        if(!value)return ;
        if(typeof onDown == 'function'){
          onDown(value);
        }
        frame.hide();
      });
      comps.input.addEventListener('keydown',function(){
        setTimeout(function(){
          if(comps.input.value){
            comps.okButton.style.color = 'rgb(20,200,20)';
          } else {
            comps.okButton.style.color = 'rgb(180,180,180)';
          }
        },100);
      });
      frame.appendChild(body);
      document.body.appendChild(frame);
      comps.input.focus();
      return frame;
    },
    createWs:function(){
      if(game.ws){
        var msg = {
          type: "login",
          name: game.me.name
        };
        game.ws.send(JSON.stringify(msg));
        return game.ws;
      }
      if(WebSocket) {
        var ws = new WebSocket("ws://"+lib.ip+":8101");
        ws.onopen = function(){
          var msg = {
            type: "login",
            name: game.me.name
          };
          ws.send(JSON.stringify(msg));
        };
        ws.onmessage = function(e){
          var msg = JSON.parse(e.data);
          if(msg.type=="newPlayer"){
            game.frames.hall.nodes.online.nodes.count.update(msg.count);
          } else if(msg.type=="loginSuccess") {
            game.me.number = msg.number;
            game.frames.login.hide();
            game.frames.hall.show();
          } else if(msg.type=="playerLogout") {
            game.frames.hall.nodes.online.nodes.count.update(msg.count);
          } else if(msg.type=="logoutSuccess") {
            game.frames.hall.hide();
            game.frames.login.show();
          } else if(msg.type == "chatInWorld"){
            var str = msg.source.name + "：" + msg.text;
            ui.create.chat(str);
          } else if(msg.type == "roomState"){
            var rooms = game.frames.hall.nodes.rooms.nodes;
            var news = msg.rooms;
            for(var i in news){
              rooms[i].update(news[i]);
            }
          } else if(msg.type=="joinRoomSuccess"){
            game.frames.hall.hide();
            game.frames.game.show();
          } else if(msg.type=="joinRoomFail"){
            game.alert("进入房间失败！");
          } else if(msg.type=="updateMyRoom"){
            game.frames.game.updateInfo(msg.roomInfo);
          } else if(msg.type=="gameStart"){
            game.frames.game.gameStart(msg);
          } else if(msg.type=="updateRoomPlayersInfo"){
            game.frames.game.updateRoomPlayersInfo(msg);
          } else if(msg.type=="updateGameTime"){
            game.frames.game.nodes.time.innerHTML = msg.time;
            game.frames.game.nodes.time.show();
          } else if(msg.type=="gameOver"){
            if(msg.failer){
              if(msg.failer.number == game.me.number)game.frames.game.gameOver(false);
              else game.frames.game.gameOver(true);
            } else {
              game.frames.game.gameOver(false);
            }
          } else if(msg.type=="chatInRoom"){
            if(msg.player.number == game.me.number){
              game.frames.game.nodes.mineChat.innerHTML = msg.text;
              game.frames.game.nodes.mineChat.show();
            } else {
              game.frames.game.nodes.enemyChat.innerHTML = msg.text;
              game.frames.game.nodes.enemyChat.show();
            }
          } else if(msg.type=="chatInRoom_biaoqing"){
            var img = ui.create.div(".biaoqing_biaoqings_biaoqing");
            img.style.position = "relative";
            img.style["background-image"] = "url("+get.biaoqingSrc(msg.code)+")";
            if(msg.player.number == game.me.number){
              game.frames.game.nodes.mineChat.appendChild(img);
              game.frames.game.nodes.mineChat.show();
            } else {
              game.frames.game.nodes.enemyChat.appendChild(img);
              game.frames.game.nodes.enemyChat.show();
            }
          }
        };
        ws.onclose = function(){
          game.alert("服务器已关闭！");
        };
        ws.onerror = function(){
          game.alert("服务器发生故障！");
        };
        return ws;
      } else {
        game.alert("当前浏览器不支持WebSocket，您可以更换浏览器打开该网页！");
        return null;
      }
    },
  };
  var ui = {
    create:{
      biaoqing:function(){
        var comps = {} , all = 30;
        for(var i=1;i<=all;i++){
          var tmp = ui.create.div(".biaoqing_biaoqings_biaoqing",{
            tags:{
              code: i,
            },
            evts:{
              click:function(){
                this.parentElement.parentElement.hide();
                var code = this.code;
                var msg = {
                  type:"chatInRoom_biaoqing",
                  code: code,
                };
                game.ws.send(JSON.stringify(msg));
              },
            },
          });
          tmp.style.left = (Math.floor(((i-1)%6))*50 + 5) + "px";
          tmp.style.top = (Math.floor(((i-1)/6))*50 + 5) + "px";
          tmp.style["background-image"] = "url("+get.biaoqingSrc(i)+")";
          comps["b"+i] = tmp;
        }
        return comps;
      },
      chat:function(str){
        if(typeof str != 'string')return ;
        var chat = ui.create.div(".chat",str,{
          tags:{
            run:function(){
              var node = this , id;
              var run = function(){
                node.style.left = (node.offsetLeft-10) + "px";
                if(node.offsetLeft + node.offsetWidth <= 0){
                  clearInterval(id);
                  if(_status.chatPos == node){
                    delete _status.chatPos;
                  }
                  node.remove();
                }
              };
              id = setInterval(run,100);
            },
            remove:function(){
              game.frames.hall.nodes.msgArea.removeChild(this);
            },
          },
        });
        if(_status.chatPos==undefined){
          chat.style.left = document.body.offsetWidth+"px";
          _status.lastChat = chat;
        } else {
          if(_status.chatPos.offsetLeft + _status.chatPos.offsetWidth >= document.body.offsetWidth){
            chat.style.left = (_status.chatPos.offsetLeft + _status.chatPos.offsetWidth + 10) + "px";
          } else {
            chat.style.left = document.body.offsetWidth+"px";
          }
          _status.lastChat = chat;
        }
        chat.run();
        game.frames.hall.nodes.msgArea.appendChild(chat);
      },
      div:function(){
        var id = "" , className = "" , innerHTML = ""
        tags = {} , evts = {} , comps = {};
        for(var i=0;i<arguments.length;i++){
          if(typeof arguments[i] == 'string'){
            if(arguments[i][0] == '#' && !id){
              id = arguments[i].substring(1);
            } else if(arguments[i][0] == '.' && !className){
              className = arguments[i].substring(1);
            } else if(!innerHTML){
              innerHTML = arguments[i];
            }
          } else if(typeof arguments[i] == 'object' && !Array.isArray(arguments[i])){
            tags = arguments[i]['tags']||{};
            evts = arguments[i]['evts']||{};
            comps = arguments[i]['comps']||{};
          }
        }
        var div = document.createElement("div");
        div.nodes = {};
        if(id) div.id = id;
        if(className) div.className = className;
        if(innerHTML) div.innerHTML = innerHTML;
        for(var i in tags){
          if(i == 'nodes')continue;
          div[i] = tags[i];
        }
        for(var i in evts){
          div.addEventListener(i,evts[i]);
        }
        for(var i in comps){
          div.nodes[i] = comps[i];
          div.appendChild(comps[i]);
        }
        if(!div.hide){
          div.hide = function(){
            this.classList.add("hidden");
            return this;
          };
        } if(!div.show){
          div.show = function(){
            this.classList.remove("hidden");
            if(typeof this.onshow == 'function'){
              this.onshow();
            }
            return this;
          };
        }
        return div;
      },
      input:function(){
        var id = "" , className = "" , innerHTML = ""
        tags = {} , evts = {} , comps = {};
        for(var i=0;i<arguments.length;i++){
          if(typeof arguments[i] == 'string'){
            if(arguments[i][0] == '#' && !id){
              id = arguments[i].substring(1);
            } else if(arguments[i][0] == '.' && !className){
              className = arguments[i].substring(1);
            } else if(!innerHTML){
              innerHTML = arguments[i];
            }
          } else if(typeof arguments[i] == 'object' && !Array.isArray(arguments[i])){
            tags = arguments[i]['tags']||{};
            evts = arguments[i]['evts']||{};
            comps = arguments[i]['comps']||{};
          }
        }
        var div = document.createElement("input");
        div.nodes = {};
        if(id) div.id = id;
        if(className) div.className = className;
        if(innerHTML) div.innerHTML = innerHTML;
        for(var i in tags){
          if(i == 'nodes')continue;
          if(i == 'maxlength'){
            div.setAttribute(i,tags[i]);
            continue;
          }
          div[i] = tags[i];
        }
        for(var i in evts){
          div.addEventListener(i,evts[i]);
        }
        for(var i in comps){
          div.nodes[i] = comps[i];
          div.appendChild(comps[i]);
        }
        return div;
      },
      pack:function(){
        var comps = {} , tags = {} , evts = {};
        for(var i=0;i<arguments.length;i++){
          if(typeof arguments[i] == 'object' && !Array.isArray(arguments[i])){
            comps = arguments[i]['comps']||{};
            tags = arguments[i]['tags']||{};
            evts = arguments[i]['evts']||{};
          }
        }
        tags.show = function(){
          document.body.appendChild(this);
          if(typeof this.onshow == 'function'){
            this.onshow();
          }
        };
        tags.hide = function(){
          document.body.removeChild(this);
          if(typeof this.onhide == 'function'){
            this.onhide();
          }
        };
        var pack = ui.create.div(".pack",{
          comps:comps,
          tags:tags,
          evts:evts,
        });
        
        return pack;
      },
      room: function(position){
        var room = ui.create.div(".room pos"+position,{
          tags:{
            id: "room"+position,
            update:function(msg){
              this.nodes.playersLen.hide();
              this.nodes.player1.hide();
              this.nodes.player2.hide();
              this.nodes.state.innerHTML = msg.state;
              var players = msg.players;
              if(players.length)this.nodes.playersLen.show();
              for(var i=0;i<players.length;i++){
                this.nodes["player"+(i+1)].innerHTML = players[i].name;
                this.nodes["player"+(i+1)].show();
              }
            },
          },
          comps:{
            state: ui.create.div(".room_state","空房间"),
            playersLen: ui.create.div(".room_playersLen","玩家列表：").hide(),
            player1: ui.create.div(".room_player").hide(),
            player2: ui.create.div(".room_player").hide(),
          },
          evts:{
            click:function(){
              var msg = {
                type:"joinRoom",
                room:this.id,
              };
              game.ws.send(JSON.stringify(msg));
            },
          },
        });
        
        return room;
      },
      lattics: function(){
        var lattics = {};
        for(var i=0;i<4;i++){
          for(var k=0;k<4;k++){
            var tmp = ui.create.div(".lattic",{
              comps:{
                span: ui.create.div(),
                bingdong: ui.create.div(".lattic_bingdong").hide(),
              },
              tags:{
                showBingDong:function(num){
                  if(this.nodes.span.innerHTML != ""){
                    this.nodes.bingdong.innerHTML = num;
                    this.nodes.bingdong.show();
                  }
                },
                hideBingDong:function(){
                  this.nodes.bingdong.innerHTML = "";
                  this.nodes.bingdong.hide();
                },
              },
            });
            tmp.style.left = (12+72*i)+"px";
            tmp.style.top = (12+72*k) +"px";
            lattics["lattics"+i+k] = tmp;
          }
        }
        return lattics;
      },
      latticsx: function(){
        var lattics = {};
        for(var i=0;i<4;i++){
          for(var k=0;k<4;k++){
            var tmp = ui.create.div(".latticx",{
              comps:{
                span: ui.create.div(),
                bingdong: ui.create.div(".latticx_bingdong").hide(),
              },
              tags:{
                showBingDong:function(num){
                  if(this.nodes.span.innerHTML != ""){
                    this.nodes.bingdong.innerHTML = num;
                    this.nodes.bingdong.show();
                  }
                },
                hideBingDong:function(){
                  this.nodes.bingdong.innerHTML = "";
                  this.nodes.bingdong.hide();
                },
              },
            });
            tmp.style.left = (4+24*i)+"px";
            tmp.style.top = (4+24*k) +"px";
            lattics["lattics"+i+k] = tmp;
          }
        }
        return lattics;
      },
    },
  };
  var get = {
    biaoqingSrc:function(num){
      if(num < 10)num = "0"+num;
      return "http://"+lib.ip+":80/images/biaoqing/c"+num+".ico";
    },
    fangxiang:function(begin,end){
      var x = end.x - begin.x;
      var y = end.y - begin.y;
      if( Math.abs(x) > Math.abs(y) ) {
        if(Math.abs(x) < 5) return "";
        return x > 0 ? "right":"left";
      } else {
        if(Math.abs(y) < 5)return "";
        return y > 0 ? "bottom":"top";
      }
      return "";
    },
    string:function(obj){
      return JSON.stringify(obj);
    },
  };
  lib.init.init();
})();