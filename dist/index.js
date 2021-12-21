function _typeof(e){return(_typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}!function(e,t){"object"===("undefined"==typeof exports?"undefined":_typeof(exports))&&"undefined"!=typeof module?t(exports,require("espree"),require("uuid")):"function"==typeof define&&define.amd?define(["exports","espree","uuid"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).wsdebug={},e.espree,e.uuid)}(this,function(exports,espree,uuid){"use strict";function _interopNamespace(o){if(o&&o.__esModule)return o;var n=Object.create(null);return o&&Object.keys(o).forEach(function(e){var t;"default"!==e&&(t=Object.getOwnPropertyDescriptor(o,e),Object.defineProperty(n,e,t.get?t:{enumerable:!0,get:function(){return o[e]}}))}),n.default=o,Object.freeze(n)}var espree__namespace=_interopNamespace(espree),protocol={script:"script://",result:"result://",connect:"connect://",query:"query://",live:"live://",close:"close://",id:"id://",role:"role://",error:"error://",version:"version://",route:"route://",sid:"sid://"},idReg="(?:([\\w-]+)/)?(.+)$",_require=require("../package.json"),version=_require.version;function Base(e,t,o,n){var r;2===arguments.length&&"object"===_typeof(arguments[0])&&(void 0!==(r=arguments[0]).host&&(e=r.host),void 0!==r.port&&(t=r.port),void 0!==r.ssl&&(o=r.ssl),void 0!==r.onerror&&(n=r.onerror));var c=arguments[arguments.length-1].connectedCallbacks;t=t||(o?443:8081);var t="".concat(o?"wss":"ws","://").concat(e||"127.0.0.1",":").concat(t,"/websocket"),s=[],i="",a=new WebSocket(t);a.addEventListener("error",function(e){"function"==typeof n?n(e):console.error(e.message||"websocket error")}),a.addEventListener("message",function(e){e=e.data;if(e.indexOf(protocol.sid)){if(!e.indexOf(protocol.connect)){var t=new Array(2);try{t=e.substr(protocol.connect.length).split("/")}catch(e){console.error(e)}c.forEach(function(e){e({increase:t[0]?t[0].split(","):[],decrease:t[1]?t[1].split(","):[]})})}}else i=e.substr(protocol.sid.length)}),this.on=function(e,t,o){var n;"connect"===e?"function"==typeof t?(n=c.indexOf(t),o||-1!==n||c.push(t),o&&-1<n&&c.splice(n,1)):c.length=0:o?a.removeEventListener(e,t):a.addEventListener(e,t)},this.sessionId=function(){return i},this.send=function(e){a&&1===a.readyState&&a.send(e)},this.close=function(){a&&a.close()},this.readyState=function(){return a.readyState},this.setId=function(e){var o=1<arguments.length&&void 0!==arguments[1]?arguments[1]:1,e=e.split(",");e.length&&e[0]?e.forEach(function(e){var t;/^[\w,.-]+$/.test(e)&&(t=s.indexOf(e),o&&-1===t?s.push(e):!o&&-1<t&&s.splice(t,1))}):s.length=0,this.send("".concat(protocol.id).concat(s.length?s.join(","):"*"))},this.getId=function(){return s}}function Client(){var _this=this,data={connectedCallbacks:[]};Base.apply(this,[].concat(Array.prototype.slice.call(arguments),[data]));var onerror=3<arguments.length&&"function"==typeof arguments[3]?arguments[3]:null,funcMap={},context=null;this.register=function(e,t){"function"==typeof t&&(funcMap[e]=t)},this.remove=function(e,t){if(e)return delete funcMap[e];if("function"==typeof t)for(var o in funcMap)if(funcMap[o]===t)return delete funcMap[o];return!1},this.bind=function(e){"object"===_typeof(e)&&(context=e)},this.on("message",function(_ref2){var data=_ref2.data;if(data.indexOf(protocol.script)){if(!data.indexOf(protocol.error)){var msg=data.substr(protocol.error.length);if(onerror)return void onerror(new Error(msg));console.error(msg)}_this.receive(data)}else{var reg=new RegExp("^".concat(protocol.script).concat(idReg)),match=data.match(reg);if(match){var sid=match[1],reg2=new RegExp("^".concat(idReg)),match2=match[2].match(reg2),id=match2?match2[1]:"",script=(match2||match)[2],result=void 0,send=function(e,t){var o="";o=e?(e=e.message||"error",(id?"".concat(protocol.error).concat(id,"/"):"".concat(protocol.error)).concat(e)):("object"===_typeof(t)&&(t=JSON.stringify(t)),(id?"".concat(protocol.result).concat(id,"/"):"".concat(protocol.result)).concat(t)),_this.send("".concat(protocol.route).concat(sid,"/").concat(o))},bCalled=!1;try{var res=espree__namespace.parse(script),fnName,func,getValue,args;res.body.length&&res.body[0].expression.callee&&res.body[0].expression.callee.name&&(fnName=res.body[0].expression.callee.name,func=funcMap[fnName]||("function"==typeof window[fnName]?window[fnName]:null),func&&(getValue=function t(e){if(void 0!==e.properties){var o={};return e.properties.forEach(function(e){o[e.key.name]=t(e.value)}),o}if(void 0===e.elements)return e.value;var n=[];return e.elements.forEach(function(e){n.push(t(e))}),n},args=[],res.body[0].expression.arguments.forEach(function(e){args.push(getValue(e))}),result=func.apply(context,args),bCalled=!0))}catch(e){console.log(e.message||e)}if(!bCalled)try{result=eval(script)}catch(e){return console.error(e),void send(e)}result instanceof Promise?result.then(function(e){return send(null,e)}).catch(function(e){console.error(e),send(e)}):send(null,result)}}})}function Master(){var r=this;Base.apply(this,[].concat(Array.prototype.slice.call(arguments),[{connectedCallbacks:[]}]));var c=3<arguments.length&&"function"==typeof arguments[3]?arguments[3]:null,s={};this.password="",this.name="",this.on("open",function(){r.send("".concat(protocol.role,"master/").concat(r.name,":").concat(r.password))}),this.connect=this.setId,this.run=function(e,t){var o,n;1===this.readyState()&&(o=this.sessionId(),"function"==typeof t?(n=uuid.v4(),s[n]=t,this.send("".concat(protocol.script).concat(o,"/").concat(n,"/").concat(e)),setTimeout(function(){delete s[n]},18e4)):this.send("".concat(protocol.script).concat(o,"/").concat(e)))},this.on("message",function(e){e=e.data;if(!e.indexOf(protocol.result)){var t=new RegExp("^".concat(protocol.result).concat(idReg)),o=e.match(t);if(o){var n=o[1];if(n&&s[n])return void s[n](o[2])}}if(!e.indexOf(protocol.error)){t=new RegExp("^".concat(protocol.error).concat(idReg)),n=e.match(t),o=null;if(n&&(t=n[1],o=new Error(n[2]),t&&s[t]&&s[t](null,o)),c)return void c(o||new Error("unknow error"));console.error(o?o.message:"unknow error")}r.receive(e)})}Base.prototype.version=function(e){return e?this.send("".concat(protocol.version,"*")):version},Base.prototype.query=function(){this.send("".concat(protocol.query,"1"))},Base.prototype.live=function(){this.send("".concat(protocol.live,"1"))},Base.prototype.receive=function(e){console.log(e)},Client.prototype=Base.prototype,Master.prototype=Base.prototype,exports.Client=Client,exports.Master=Master,Object.defineProperty(exports,"__esModule",{value:!0})});