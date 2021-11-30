function _typeof(e){return(_typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}!function(e,t){"object"===("undefined"==typeof exports?"undefined":_typeof(exports))&&"undefined"!=typeof module?t(exports,require("espree"),require("uuid")):"function"==typeof define&&define.amd?define(["exports","espree","uuid"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).wsdebug={},e.espree,e.uuid)}(this,function(exports,espree,uuid){"use strict";function _interopNamespace(o){if(o&&o.__esModule)return o;var n=Object.create(null);return o&&Object.keys(o).forEach(function(e){var t;"default"!==e&&(t=Object.getOwnPropertyDescriptor(o,e),Object.defineProperty(n,e,t.get?t:{enumerable:!0,get:function(){return o[e]}}))}),n.default=o,Object.freeze(n)}var espree__namespace=_interopNamespace(espree),protocol={script:"script://",result:"result://",connect:"connect://",query:"query://",live:"live://",close:"close://",id:"id://",role:"role://",error:"error://"},idReg="(?:([\\w-]+)/)?(.+)$";function Base(e,t,o,n,r){var c;2===arguments.length&&"object"===_typeof(arguments[0])&&(void 0!==(c=arguments[0]).host&&(e=c.host),void 0!==c.port&&(t=c.port),void 0!==c.ssl&&(o=c.ssl),void 0!==c.onerror&&(n=c.onerror),r=arguments[1]),t=t||(o?443:8081);t="".concat(o?"wss":"ws","://").concat(e||"127.0.0.1",":").concat(t,"/websocket");this.socket=new WebSocket(t),this.socket.addEventListener("error",function(e){"function"==typeof n?n(e):console.error(e.message||"websocket error")}),this.on=function(e,t,o){var n;"connect"===e?"function"==typeof t&&(n=r.indexOf(t),o||-1!==n||r.push(t),o&&-1<n&&r.splice(n,1)):o?this.socket.removeEventListener(e,t):this.socket.addEventListener(e,t)}}function Client(){var _this=this,connectedCallbacks=[];Base.apply(this,[].concat(Array.prototype.slice.call(arguments),[connectedCallbacks]));var funcMap={},ids=[],context=null;this.register=function(e,t){"function"==typeof t&&(funcMap[e]=t)},this.remove=function(e,t){if(e)return delete funcMap[e];if("function"==typeof t)for(var o in funcMap)if(funcMap[o]===t)return delete funcMap[o];return!1},this.getId=function(){return ids},this.bind=function(e){"object"===_typeof(e)&&(context=e)},this.socket.addEventListener("message",function(_ref){var data=_ref.data,val,str;if(!data.indexOf(protocol.script)){var reg=new RegExp("^".concat(protocol.script).concat(idReg)),match=data.match(reg);if(match){var id=match[1],script=match[2],result=void 0,send=function(e,t){e?(e=e.message||"error",id?_this.socket.send("".concat(protocol.error).concat(id,"/").concat(e)):_this.socket.send("".concat(protocol.error).concat(e))):("object"===_typeof(t)&&(t=JSON.stringify(t)),id?_this.socket.send("".concat(protocol.result).concat(id,"/").concat(t)):_this.socket.send("".concat(protocol.result).concat(t)))};try{var res=espree__namespace.parse(script),bCalled=!1,fnName,func,getValue,args;res.body.length&&res.body[0].expression.callee&&res.body[0].expression.callee.name&&(fnName=res.body[0].expression.callee.name,func=funcMap[fnName]||("function"==typeof window[fnName]?window[fnName]:null),func&&(getValue=function t(e){if(void 0!==e.properties){var o={};return e.properties.forEach(function(e){o[e.key.name]=t(e.value)}),o}if(void 0===e.elements)return e.value;var n=[];return e.elements.forEach(function(e){n.push(t(e))}),n},args=[],res.body[0].expression.arguments.forEach(function(e){args.push(getValue(e))}),result=func.apply(context,args),bCalled=!0)),bCalled||(result=eval(script))}catch(e){return console.error(e),void send(e)}result instanceof Promise?result.then(function(e){return send(null,e)}).catch(function(e){console.error(e),send(e)}):send(null,result)}}data.indexOf(protocol.connect)||(val=data.substr(protocol.connect.length),connectedCallbacks.forEach(function(e){e(val)})),data.indexOf(protocol.id)||(str=data.substr(protocol.id.length),ids=str?str.split(","):[]),data.indexOf(protocol.error)||console.error(data.substr(protocol.error.length))})}function Master(){var r=this,c=[];Base.apply(this,[].concat(Array.prototype.slice.call(arguments),[c]));var s={};this.socket.addEventListener("open",function(){r.socket.send("".concat(protocol.role,"master"))}),this.connect=function(e){var t=1<arguments.length&&void 0!==arguments[1]?arguments[1]:1;1===this.socket.readyState&&e&&(t=1===t?1:0,this.socket.send("".concat(protocol.id).concat(e,"/").concat(t)))},this.run=function(e,t){var o;1===this.socket.readyState&&("function"==typeof t?(o=uuid.v4(),s[o]=t,this.socket.send("".concat(protocol.script).concat(o,"/").concat(e)),setTimeout(function(){delete s[o]},18e4)):this.socket.send("".concat(protocol.script).concat(e)))},this.socket.addEventListener("message",function(e){var t,o,e=e.data;if(e.indexOf(protocol.result)||(t=new RegExp("^".concat(protocol.result).concat(idReg)),(t=e.match(t))&&((o=t[1])&&s[o]?s[o](t[2]):r.receive(t[2]))),!e.indexOf(protocol.connect)){var n=new Array(2);try{n=e.substr(protocol.connect.length).split("/")}catch(e){console.error(e)}c.forEach(function(e){e({id:n[0],value:n[1]})})}e.indexOf(protocol.error)||(o=new RegExp("^".concat(protocol.error).concat(idReg)),!(t=e.match(o))||(o=t[1])&&s[o]&&s[o](null,new Error(t[2])),console.error(e.substr(protocol.error.length)))})}Base.prototype.setId=function(e){var t=1<arguments.length&&void 0!==arguments[1]?arguments[1]:1;this.socket&&1===this.socket.readyState&&/^[\w.-]+$/.test(e)&&(t=1===t?1:0,this.socket.send("".concat(protocol.id).concat(e,"/").concat(t)))},Base.prototype.getId=function(){return this.ids},Base.prototype.close=function(){this.socket&&this.socket.close()},Base.prototype.send=function(e){this.socket&&1===this.socket.readyState&&this.socket.send(e)},Base.prototype.query=function(){this.socket&&1===this.socket.readyState&&this.socket.send("".concat(protocol.query,"1"))},Base.prototype.live=function(){this.socket&&1===this.socket.readyState&&this.socket.send("".concat(protocol.live,"1"))},Base.prototype.receive=function(e){console.log(e)},Client.prototype=Base.prototype,Master.prototype=Base.prototype,exports.Client=Client,exports.Master=Master,Object.defineProperty(exports,"__esModule",{value:!0})});