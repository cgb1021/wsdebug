function _typeof(e){return(_typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}!function(e,t){"object"===("undefined"==typeof exports?"undefined":_typeof(exports))&&"undefined"!=typeof module?t(exports,require("espree")):"function"==typeof define&&define.amd?define(["exports","espree"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).wsdebug={},e.espree)}(this,function(exports,espree){"use strict";function _interopNamespace(o){if(o&&o.__esModule)return o;var n=Object.create(null);return o&&Object.keys(o).forEach(function(e){var t;"default"!==e&&(t=Object.getOwnPropertyDescriptor(o,e),Object.defineProperty(n,e,t.get?t:{enumerable:!0,get:function(){return o[e]}}))}),n.default=o,Object.freeze(n)}var espree__namespace=_interopNamespace(espree),protocol={script:"script://",result:"result://",connect:"connect://",query:"query://",close:"close://",id:"id://",role:"role://",error:"error://"},prototype={close:function(){this.socket.close()},send:function(e){this.socket.send("".concat(protocol.result).concat(e))},query:function(){this.socket.send("".concat(protocol.query,"1"))}};function Client(){var _this=this,host=0<arguments.length&&void 0!==arguments[0]?arguments[0]:"127.0.0.1",port=1<arguments.length&&void 0!==arguments[1]?arguments[1]:8081,url="ws://".concat(host,":").concat(port,"/websocket"),context=null,id=100*Date.now()+Math.floor(100*Math.random()),funcMap={},connectedCallbacks=[];this.socket=new WebSocket(url),this.socket.addEventListener("error",function(e){console.error(e.message||"websocket error")}),this.socket.addEventListener("message",function(_ref){var data=_ref.data,val;if(!data.indexOf(protocol.script)){var reg=new RegExp("^".concat(protocol.script,"(?:(\\w+)/)?(.+)$")),match=data.match(reg);if(match){var _id=match[1],script=match[2],result=void 0,send=function(e,t){e?(e=e.message||"error",_id?_this.socket.send("".concat(protocol.error).concat(_id,"/").concat(e)):_this.socket.send("".concat(protocol.error).concat(e))):("object"===_typeof(t)&&(t=JSON.stringify(t)),_id?_this.socket.send("".concat(protocol.result).concat(_id,"/").concat(t)):_this.socket.send("".concat(protocol.result).concat(t)))};try{var res=espree__namespace.parse(script),bCalled=!1,fnName,func,args;res.body.length&&res.body[0].expression.callee.name&&(fnName=res.body[0].expression.callee.name,func=funcMap[fnName]||("function"==typeof window[fnName]?window[fnName]:null),func&&(args=[],res.body[0].expression.arguments.forEach(function(e){args.push(e.value)}),result=func.apply(null,args),bCalled=!0)),bCalled||(result=eval(script))}catch(e){return console.error(e),void send(e)}result instanceof Promise?result.then(function(e){return send(null,e)}).catch(function(e){console.error(e),send(e)}):send(null,result)}}data.indexOf(protocol.connect)||(val=data.substr(protocol.connect.length),connectedCallbacks.forEach(function(e){e(val)})),data.indexOf(protocol.error)||console.error(data.substr(protocol.error.length))}),this.bind=function(e){e&&"object"===_typeof(e)&&(context=e)},this.register=function(e,t){"function"==typeof t&&(funcMap[e]=context?t.bind(context):t)},this.setId=function(e){e&&/^\w+$/.test(e)&&(id=e),this.socket.send("".concat(protocol.id).concat(id))},this.getId=function(){return id},this.on=function(e,t,o){var n;"connect"===e?"function"==typeof t&&(n=connectedCallbacks.indexOf(t),o||-1!==n||connectedCallbacks.push(t),o&&-1<n&&connectedCallbacks.splice(n,1)):o?this.socket.removeEventListener(e,t):this.socket.addEventListener(e,t)}}function Master(){var c=this,e=0<arguments.length&&void 0!==arguments[0]?arguments[0]:"127.0.0.1",t=1<arguments.length&&void 0!==arguments[1]?arguments[1]:8081,t="ws://".concat(e,":").concat(t,"/websocket"),r={},s=[];this.socket=new WebSocket(t),this.socket.addEventListener("open",function(){c.socket.send("".concat(protocol.role,"master"))}),this.socket.addEventListener("error",function(e){console.error(e.message||"websocket error")}),this.socket.addEventListener("message",function(e){var t,o=e.data;if(o.indexOf(protocol.result)||(e=new RegExp("^".concat(protocol.result,"(?:(\\w+)/)?(.+)$")),(t=o.match(e))&&((e=t[1])&&r[e]?(r[e](t[2]),delete r[e]):c.receive(t[2]))),!o.indexOf(protocol.connect)){var n=new Array(2);try{n=o.substr(protocol.connect.length).split("/")}catch(e){console.error(e)}s.forEach(function(e){e({id:n[0],value:n[1]})})}o.indexOf(protocol.error)||(t=new RegExp("^".concat(protocol.error,"(?:(\\w+)/)?(.+)$")),!(t=o.match(t))||(t=t[1])&&r[t]&&delete r[t],console.error(o.substr(protocol.error.length)))}),this.run=function(e,t){var o;"function"==typeof t?(o=100*Date.now()+Math.floor(100*Math.random()),r[o]=t,this.socket.send("".concat(protocol.script).concat(o,"/").concat(e))):this.socket.send("".concat(protocol.script).concat(e))},this.connect=function(e){e&&this.socket.send("".concat(protocol.id).concat(e))},this.on=function(e,t,o){var n;"connect"===e?"function"==typeof t&&(n=s.indexOf(t),o||-1!==n||s.push(t),o&&-1<n&&s.splice(n,1)):o?this.socket.removeEventListener(e,t):this.socket.addEventListener(e,t)}}Object.assign(Client.prototype,prototype),Object.assign(Master.prototype,prototype),Master.prototype.receive=function(e){console.log("receive",e)},exports.Client=Client,exports.Master=Master,Object.defineProperty(exports,"__esModule",{value:!0})});