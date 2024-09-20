var Wa=Object.defineProperty;var qa=(t,e,i)=>e in t?Wa(t,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[e]=i;var Qn=(t,e,i)=>qa(t,typeof e!="symbol"?e+"":e,i);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))r(o);new MutationObserver(o=>{for(const c of o)if(c.type==="childList")for(const l of c.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&r(l)}).observe(document,{childList:!0,subtree:!0});function i(o){const c={};return o.integrity&&(c.integrity=o.integrity),o.referrerPolicy&&(c.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?c.credentials="include":o.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function r(o){if(o.ep)return;o.ep=!0;const c=i(o);fetch(o.href,c)}})();function rt(){}function js(t){return t()}function Wr(){return Object.create(null)}function _n(t){t.forEach(js)}function $s(t){return typeof t=="function"}function Ka(t,e){return t!=t?e==e:t!==e||t&&typeof t=="object"||typeof t=="function"}function Ja(t){return Object.keys(t).length===0}function an(t,e){t.appendChild(e)}function bi(t,e,i){t.insertBefore(e,i||null)}function In(t){t.parentNode&&t.parentNode.removeChild(t)}function cn(t){return document.createElement(t)}function ui(t){return document.createTextNode(t)}function Xa(){return ui(" ")}function qr(t,e,i){t.getAttribute(e)!==i&&t.setAttribute(e,i)}function Ya(t){return Array.from(t.childNodes)}function Qa(t,e){e=""+e,t.data!==e&&(t.data=e)}let Rt;function St(t){Rt=t}function Za(){if(!Rt)throw new Error("Function called outside component initialization");return Rt}function ec(t){Za().$$.on_mount.push(t)}const Ye=[],Kr=[];let Ze=[];const Jr=[],tc=Promise.resolve();let di=!1;function nc(){di||(di=!0,tc.then(Bs))}function fi(t){Ze.push(t)}const Zn=new Set;let Xe=0;function Bs(){if(Xe!==0)return;const t=Rt;do{try{for(;Xe<Ye.length;){const e=Ye[Xe];Xe++,St(e),ic(e.$$)}}catch(e){throw Ye.length=0,Xe=0,e}for(St(null),Ye.length=0,Xe=0;Kr.length;)Kr.pop()();for(let e=0;e<Ze.length;e+=1){const i=Ze[e];Zn.has(i)||(Zn.add(i),i())}Ze.length=0}while(Ye.length);for(;Jr.length;)Jr.pop()();di=!1,Zn.clear(),St(t)}function ic(t){if(t.fragment!==null){t.update(),_n(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(fi)}}function rc(t){const e=[],i=[];Ze.forEach(r=>t.indexOf(r)===-1?e.push(r):i.push(r)),i.forEach(r=>r()),Ze=e}const sc=new Set;function oc(t,e){t&&t.i&&(sc.delete(t),t.i(e))}function ac(t,e,i){const{fragment:r,after_update:o}=t.$$;r&&r.m(e,i),fi(()=>{const c=t.$$.on_mount.map(js).filter($s);t.$$.on_destroy?t.$$.on_destroy.push(...c):_n(c),t.$$.on_mount=[]}),o.forEach(fi)}function cc(t,e){const i=t.$$;i.fragment!==null&&(rc(i.after_update),_n(i.on_destroy),i.fragment&&i.fragment.d(e),i.on_destroy=i.fragment=null,i.ctx=[])}function lc(t,e){t.$$.dirty[0]===-1&&(Ye.push(t),nc(),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function hc(t,e,i,r,o,c,l=null,d=[-1]){const g=Rt;St(t);const T=t.$$={fragment:null,ctx:[],props:c,update:rt,not_equal:o,bound:Wr(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(e.context||(g?g.$$.context:[])),callbacks:Wr(),dirty:d,skip_bound:!1,root:e.target||g.$$.root};l&&l(T.root);let b=!1;if(T.ctx=i?i(t,e.props||{},(A,C,...D)=>{const k=D.length?D[0]:C;return T.ctx&&o(T.ctx[A],T.ctx[A]=k)&&(!T.skip_bound&&T.bound[A]&&T.bound[A](k),b&&lc(t,A)),C}):[],T.update(),b=!0,_n(T.before_update),T.fragment=r?r(T.ctx):!1,e.target){if(e.hydrate){const A=Ya(e.target);T.fragment&&T.fragment.l(A),A.forEach(In)}else T.fragment&&T.fragment.c();e.intro&&oc(t.$$.fragment),ac(t,e.target,e.anchor),Bs()}St(g)}class uc{constructor(){Qn(this,"$$");Qn(this,"$$set")}$destroy(){cc(this,1),this.$destroy=rt}$on(e,i){if(!$s(i))return rt;const r=this.$$.callbacks[e]||(this.$$.callbacks[e]=[]);return r.push(i),()=>{const o=r.indexOf(i);o!==-1&&r.splice(o,1)}}$set(e){this.$$set&&!Ja(e)&&(this.$$.skip_bound=!0,this.$$set(e),this.$$.skip_bound=!1)}}const dc="4";typeof window<"u"&&(window.__svelte||(window.__svelte={v:new Set})).v.add(dc);var Xr={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vs=function(t){const e=[];let i=0;for(let r=0;r<t.length;r++){let o=t.charCodeAt(r);o<128?e[i++]=o:o<2048?(e[i++]=o>>6|192,e[i++]=o&63|128):(o&64512)===55296&&r+1<t.length&&(t.charCodeAt(r+1)&64512)===56320?(o=65536+((o&1023)<<10)+(t.charCodeAt(++r)&1023),e[i++]=o>>18|240,e[i++]=o>>12&63|128,e[i++]=o>>6&63|128,e[i++]=o&63|128):(e[i++]=o>>12|224,e[i++]=o>>6&63|128,e[i++]=o&63|128)}return e},fc=function(t){const e=[];let i=0,r=0;for(;i<t.length;){const o=t[i++];if(o<128)e[r++]=String.fromCharCode(o);else if(o>191&&o<224){const c=t[i++];e[r++]=String.fromCharCode((o&31)<<6|c&63)}else if(o>239&&o<365){const c=t[i++],l=t[i++],d=t[i++],g=((o&7)<<18|(c&63)<<12|(l&63)<<6|d&63)-65536;e[r++]=String.fromCharCode(55296+(g>>10)),e[r++]=String.fromCharCode(56320+(g&1023))}else{const c=t[i++],l=t[i++];e[r++]=String.fromCharCode((o&15)<<12|(c&63)<<6|l&63)}}return e.join("")},Hs={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(t,e){if(!Array.isArray(t))throw Error("encodeByteArray takes an array as a parameter");this.init_();const i=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let o=0;o<t.length;o+=3){const c=t[o],l=o+1<t.length,d=l?t[o+1]:0,g=o+2<t.length,T=g?t[o+2]:0,b=c>>2,A=(c&3)<<4|d>>4;let C=(d&15)<<2|T>>6,D=T&63;g||(D=64,l||(C=64)),r.push(i[b],i[A],i[C],i[D])}return r.join("")},encodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(t):this.encodeByteArray(Vs(t),e)},decodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(t):fc(this.decodeStringToByteArray(t,e))},decodeStringToByteArray(t,e){this.init_();const i=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let o=0;o<t.length;){const c=i[t.charAt(o++)],d=o<t.length?i[t.charAt(o)]:0;++o;const T=o<t.length?i[t.charAt(o)]:64;++o;const A=o<t.length?i[t.charAt(o)]:64;if(++o,c==null||d==null||T==null||A==null)throw new pc;const C=c<<2|d>>4;if(r.push(C),T!==64){const D=d<<4&240|T>>2;if(r.push(D),A!==64){const k=T<<6&192|A;r.push(k)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let t=0;t<this.ENCODED_VALS.length;t++)this.byteToCharMap_[t]=this.ENCODED_VALS.charAt(t),this.charToByteMap_[this.byteToCharMap_[t]]=t,this.byteToCharMapWebSafe_[t]=this.ENCODED_VALS_WEBSAFE.charAt(t),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[t]]=t,t>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(t)]=t,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(t)]=t)}}};class pc extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const gc=function(t){const e=Vs(t);return Hs.encodeByteArray(e,!0)},ln=function(t){return gc(t).replace(/\./g,"")},zs=function(t){try{return Hs.decodeString(t,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mc(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yc=()=>mc().__FIREBASE_DEFAULTS__,vc=()=>{if(typeof process>"u"||typeof Xr>"u")return;const t=Xr.__FIREBASE_DEFAULTS__;if(t)return JSON.parse(t)},_c=()=>{if(typeof document>"u")return;let t;try{t=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=t&&zs(t[1]);return e&&JSON.parse(e)},Ai=()=>{try{return yc()||vc()||_c()}catch(t){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${t}`);return}},Gs=t=>{var e,i;return(i=(e=Ai())===null||e===void 0?void 0:e.emulatorHosts)===null||i===void 0?void 0:i[t]},Ic=t=>{const e=Gs(t);if(!e)return;const i=e.lastIndexOf(":");if(i<=0||i+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(i+1),10);return e[0]==="["?[e.substring(1,i-1),r]:[e.substring(0,i),r]},Ws=()=>{var t;return(t=Ai())===null||t===void 0?void 0:t.config},qs=t=>{var e;return(e=Ai())===null||e===void 0?void 0:e[`_${t}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wc{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,i)=>{this.resolve=e,this.reject=i})}wrapCallback(e){return(i,r)=>{i?this.reject(i):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(i):e(i,r))}}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Tc(t,e){if(t.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const i={alg:"none",type:"JWT"},r=e||"demo-project",o=t.iat||0,c=t.sub||t.user_id;if(!c)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const l=Object.assign({iss:`https://securetoken.google.com/${r}`,aud:r,iat:o,exp:o+3600,auth_time:o,sub:c,user_id:c,firebase:{sign_in_provider:"custom",identities:{}}},t);return[ln(JSON.stringify(i)),ln(JSON.stringify(l)),""].join(".")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function J(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function Ec(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(J())}function bc(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Ks(){const t=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof t=="object"&&t.id!==void 0}function Ac(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Sc(){const t=J();return t.indexOf("MSIE ")>=0||t.indexOf("Trident/")>=0}function Js(){try{return typeof indexedDB=="object"}catch{return!1}}function Xs(){return new Promise((t,e)=>{try{let i=!0;const r="validate-browser-context-for-indexeddb-analytics-module",o=self.indexedDB.open(r);o.onsuccess=()=>{o.result.close(),i||self.indexedDB.deleteDatabase(r),t(!0)},o.onupgradeneeded=()=>{i=!1},o.onerror=()=>{var c;e(((c=o.error)===null||c===void 0?void 0:c.message)||"")}}catch(i){e(i)}})}function Cc(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kc="FirebaseError";class oe extends Error{constructor(e,i,r){super(i),this.code=e,this.customData=r,this.name=kc,Object.setPrototypeOf(this,oe.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,He.prototype.create)}}class He{constructor(e,i,r){this.service=e,this.serviceName=i,this.errors=r}create(e,...i){const r=i[0]||{},o=`${this.service}/${e}`,c=this.errors[e],l=c?Rc(c,r):"Error",d=`${this.serviceName}: ${l} (${o}).`;return new oe(o,d,r)}}function Rc(t,e){return t.replace(Pc,(i,r)=>{const o=e[r];return o!=null?String(o):`<${r}?>`})}const Pc=/\{\$([^}]+)}/g;function Oc(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}function Pt(t,e){if(t===e)return!0;const i=Object.keys(t),r=Object.keys(e);for(const o of i){if(!r.includes(o))return!1;const c=t[o],l=e[o];if(Yr(c)&&Yr(l)){if(!Pt(c,l))return!1}else if(c!==l)return!1}for(const o of r)if(!i.includes(o))return!1;return!0}function Yr(t){return t!==null&&typeof t=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nt(t){const e=[];for(const[i,r]of Object.entries(t))Array.isArray(r)?r.forEach(o=>{e.push(encodeURIComponent(i)+"="+encodeURIComponent(o))}):e.push(encodeURIComponent(i)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function Dc(t,e){const i=new Nc(t,e);return i.subscribe.bind(i)}class Nc{constructor(e,i){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=i,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(i=>{i.next(e)})}error(e){this.forEachObserver(i=>{i.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,i,r){let o;if(e===void 0&&i===void 0&&r===void 0)throw new Error("Missing Observer.");Lc(e,["next","error","complete"])?o=e:o={next:e,error:i,complete:r},o.next===void 0&&(o.next=ei),o.error===void 0&&(o.error=ei),o.complete===void 0&&(o.complete=ei);const c=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?o.error(this.finalError):o.complete()}catch{}}),this.observers.push(o),c}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let i=0;i<this.observers.length;i++)this.sendOne(i,e)}sendOne(e,i){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{i(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Lc(t,e){if(typeof t!="object"||t===null)return!1;for(const i of e)if(i in t&&typeof t[i]=="function")return!0;return!1}function ei(){}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mc=1e3,Uc=2,xc=4*60*60*1e3,Fc=.5;function Qr(t,e=Mc,i=Uc){const r=e*Math.pow(i,t),o=Math.round(Fc*r*(Math.random()-.5)*2);return Math.min(xc,r+o)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function De(t){return t&&t._delegate?t._delegate:t}class se{constructor(e,i,r){this.name=e,this.instanceFactory=i,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xe="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jc{constructor(e,i){this.name=e,this.container=i,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const i=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(i)){const r=new wc;if(this.instancesDeferred.set(i,r),this.isInitialized(i)||this.shouldAutoInitialize())try{const o=this.getOrInitializeService({instanceIdentifier:i});o&&r.resolve(o)}catch{}}return this.instancesDeferred.get(i).promise}getImmediate(e){var i;const r=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),o=(i=e==null?void 0:e.optional)!==null&&i!==void 0?i:!1;if(this.isInitialized(r)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:r})}catch(c){if(o)return null;throw c}else{if(o)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(Bc(e))try{this.getOrInitializeService({instanceIdentifier:xe})}catch{}for(const[i,r]of this.instancesDeferred.entries()){const o=this.normalizeInstanceIdentifier(i);try{const c=this.getOrInitializeService({instanceIdentifier:o});r.resolve(c)}catch{}}}}clearInstance(e=xe){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(i=>"INTERNAL"in i).map(i=>i.INTERNAL.delete()),...e.filter(i=>"_delete"in i).map(i=>i._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=xe){return this.instances.has(e)}getOptions(e=xe){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:i={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const o=this.getOrInitializeService({instanceIdentifier:r,options:i});for(const[c,l]of this.instancesDeferred.entries()){const d=this.normalizeInstanceIdentifier(c);r===d&&l.resolve(o)}return o}onInit(e,i){var r;const o=this.normalizeInstanceIdentifier(i),c=(r=this.onInitCallbacks.get(o))!==null&&r!==void 0?r:new Set;c.add(e),this.onInitCallbacks.set(o,c);const l=this.instances.get(o);return l&&e(l,o),()=>{c.delete(e)}}invokeOnInitCallbacks(e,i){const r=this.onInitCallbacks.get(i);if(r)for(const o of r)try{o(e,i)}catch{}}getOrInitializeService({instanceIdentifier:e,options:i={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:$c(e),options:i}),this.instances.set(e,r),this.instancesOptions.set(e,i),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=xe){return this.component?this.component.multipleInstances?e:xe:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function $c(t){return t===xe?void 0:t}function Bc(t){return t.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vc{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const i=this.getProvider(e.name);if(i.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);i.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const i=new jc(e,this);return this.providers.set(e,i),i}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var O;(function(t){t[t.DEBUG=0]="DEBUG",t[t.VERBOSE=1]="VERBOSE",t[t.INFO=2]="INFO",t[t.WARN=3]="WARN",t[t.ERROR=4]="ERROR",t[t.SILENT=5]="SILENT"})(O||(O={}));const Hc={debug:O.DEBUG,verbose:O.VERBOSE,info:O.INFO,warn:O.WARN,error:O.ERROR,silent:O.SILENT},zc=O.INFO,Gc={[O.DEBUG]:"log",[O.VERBOSE]:"log",[O.INFO]:"info",[O.WARN]:"warn",[O.ERROR]:"error"},Wc=(t,e,...i)=>{if(e<t.logLevel)return;const r=new Date().toISOString(),o=Gc[e];if(o)console[o](`[${r}]  ${t.name}:`,...i);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class wn{constructor(e){this.name=e,this._logLevel=zc,this._logHandler=Wc,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in O))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Hc[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,O.DEBUG,...e),this._logHandler(this,O.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,O.VERBOSE,...e),this._logHandler(this,O.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,O.INFO,...e),this._logHandler(this,O.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,O.WARN,...e),this._logHandler(this,O.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,O.ERROR,...e),this._logHandler(this,O.ERROR,...e)}}const qc=(t,e)=>e.some(i=>t instanceof i);let Zr,es;function Kc(){return Zr||(Zr=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Jc(){return es||(es=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Ys=new WeakMap,pi=new WeakMap,Qs=new WeakMap,ti=new WeakMap,Si=new WeakMap;function Xc(t){const e=new Promise((i,r)=>{const o=()=>{t.removeEventListener("success",c),t.removeEventListener("error",l)},c=()=>{i(Pe(t.result)),o()},l=()=>{r(t.error),o()};t.addEventListener("success",c),t.addEventListener("error",l)});return e.then(i=>{i instanceof IDBCursor&&Ys.set(i,t)}).catch(()=>{}),Si.set(e,t),e}function Yc(t){if(pi.has(t))return;const e=new Promise((i,r)=>{const o=()=>{t.removeEventListener("complete",c),t.removeEventListener("error",l),t.removeEventListener("abort",l)},c=()=>{i(),o()},l=()=>{r(t.error||new DOMException("AbortError","AbortError")),o()};t.addEventListener("complete",c),t.addEventListener("error",l),t.addEventListener("abort",l)});pi.set(t,e)}let gi={get(t,e,i){if(t instanceof IDBTransaction){if(e==="done")return pi.get(t);if(e==="objectStoreNames")return t.objectStoreNames||Qs.get(t);if(e==="store")return i.objectStoreNames[1]?void 0:i.objectStore(i.objectStoreNames[0])}return Pe(t[e])},set(t,e,i){return t[e]=i,!0},has(t,e){return t instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in t}};function Qc(t){gi=t(gi)}function Zc(t){return t===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...i){const r=t.call(ni(this),e,...i);return Qs.set(r,e.sort?e.sort():[e]),Pe(r)}:Jc().includes(t)?function(...e){return t.apply(ni(this),e),Pe(Ys.get(this))}:function(...e){return Pe(t.apply(ni(this),e))}}function el(t){return typeof t=="function"?Zc(t):(t instanceof IDBTransaction&&Yc(t),qc(t,Kc())?new Proxy(t,gi):t)}function Pe(t){if(t instanceof IDBRequest)return Xc(t);if(ti.has(t))return ti.get(t);const e=el(t);return e!==t&&(ti.set(t,e),Si.set(e,t)),e}const ni=t=>Si.get(t);function Zs(t,e,{blocked:i,upgrade:r,blocking:o,terminated:c}={}){const l=indexedDB.open(t,e),d=Pe(l);return r&&l.addEventListener("upgradeneeded",g=>{r(Pe(l.result),g.oldVersion,g.newVersion,Pe(l.transaction),g)}),i&&l.addEventListener("blocked",g=>i(g.oldVersion,g.newVersion,g)),d.then(g=>{c&&g.addEventListener("close",()=>c()),o&&g.addEventListener("versionchange",T=>o(T.oldVersion,T.newVersion,T))}).catch(()=>{}),d}const tl=["get","getKey","getAll","getAllKeys","count"],nl=["put","add","delete","clear"],ii=new Map;function ts(t,e){if(!(t instanceof IDBDatabase&&!(e in t)&&typeof e=="string"))return;if(ii.get(e))return ii.get(e);const i=e.replace(/FromIndex$/,""),r=e!==i,o=nl.includes(i);if(!(i in(r?IDBIndex:IDBObjectStore).prototype)||!(o||tl.includes(i)))return;const c=async function(l,...d){const g=this.transaction(l,o?"readwrite":"readonly");let T=g.store;return r&&(T=T.index(d.shift())),(await Promise.all([T[i](...d),o&&g.done]))[0]};return ii.set(e,c),c}Qc(t=>({...t,get:(e,i,r)=>ts(e,i)||t.get(e,i,r),has:(e,i)=>!!ts(e,i)||t.has(e,i)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class il{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(i=>{if(rl(i)){const r=i.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(i=>i).join(" ")}}function rl(t){const e=t.getComponent();return(e==null?void 0:e.type)==="VERSION"}const mi="@firebase/app",ns="0.10.11";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ye=new wn("@firebase/app"),sl="@firebase/app-compat",ol="@firebase/analytics-compat",al="@firebase/analytics",cl="@firebase/app-check-compat",ll="@firebase/app-check",hl="@firebase/auth",ul="@firebase/auth-compat",dl="@firebase/database",fl="@firebase/database-compat",pl="@firebase/functions",gl="@firebase/functions-compat",ml="@firebase/installations",yl="@firebase/installations-compat",vl="@firebase/messaging",_l="@firebase/messaging-compat",Il="@firebase/performance",wl="@firebase/performance-compat",Tl="@firebase/remote-config",El="@firebase/remote-config-compat",bl="@firebase/storage",Al="@firebase/storage-compat",Sl="@firebase/firestore",Cl="@firebase/vertexai-preview",kl="@firebase/firestore-compat",Rl="firebase",Pl="10.13.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yi="[DEFAULT]",Ol={[mi]:"fire-core",[sl]:"fire-core-compat",[al]:"fire-analytics",[ol]:"fire-analytics-compat",[ll]:"fire-app-check",[cl]:"fire-app-check-compat",[hl]:"fire-auth",[ul]:"fire-auth-compat",[dl]:"fire-rtdb",[fl]:"fire-rtdb-compat",[pl]:"fire-fn",[gl]:"fire-fn-compat",[ml]:"fire-iid",[yl]:"fire-iid-compat",[vl]:"fire-fcm",[_l]:"fire-fcm-compat",[Il]:"fire-perf",[wl]:"fire-perf-compat",[Tl]:"fire-rc",[El]:"fire-rc-compat",[bl]:"fire-gcs",[Al]:"fire-gcs-compat",[Sl]:"fire-fst",[kl]:"fire-fst-compat",[Cl]:"fire-vertex","fire-js":"fire-js",[Rl]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hn=new Map,Dl=new Map,vi=new Map;function is(t,e){try{t.container.addComponent(e)}catch(i){ye.debug(`Component ${e.name} failed to register with FirebaseApp ${t.name}`,i)}}function le(t){const e=t.name;if(vi.has(e))return ye.debug(`There were multiple attempts to register component ${e}.`),!1;vi.set(e,t);for(const i of hn.values())is(i,t);for(const i of Dl.values())is(i,t);return!0}function ze(t,e){const i=t.container.getProvider("heartbeat").getImmediate({optional:!0});return i&&i.triggerHeartbeat(),t.container.getProvider(e)}function Re(t){return t.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nl={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Oe=new He("app","Firebase",Nl);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ll{constructor(e,i,r){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},i),this._name=i.name,this._automaticDataCollectionEnabled=i.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new se("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Oe.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const at=Pl;function eo(t,e={}){let i=t;typeof e!="object"&&(e={name:e});const r=Object.assign({name:yi,automaticDataCollectionEnabled:!1},e),o=r.name;if(typeof o!="string"||!o)throw Oe.create("bad-app-name",{appName:String(o)});if(i||(i=Ws()),!i)throw Oe.create("no-options");const c=hn.get(o);if(c){if(Pt(i,c.options)&&Pt(r,c.config))return c;throw Oe.create("duplicate-app",{appName:o})}const l=new Vc(o);for(const g of vi.values())l.addComponent(g);const d=new Ll(i,r,l);return hn.set(o,d),d}function Ci(t=yi){const e=hn.get(t);if(!e&&t===yi&&Ws())return eo();if(!e)throw Oe.create("no-app",{appName:t});return e}function ne(t,e,i){var r;let o=(r=Ol[t])!==null&&r!==void 0?r:t;i&&(o+=`-${i}`);const c=o.match(/\s|\//),l=e.match(/\s|\//);if(c||l){const d=[`Unable to register library "${o}" with version "${e}":`];c&&d.push(`library name "${o}" contains illegal characters (whitespace or "/")`),c&&l&&d.push("and"),l&&d.push(`version name "${e}" contains illegal characters (whitespace or "/")`),ye.warn(d.join(" "));return}le(new se(`${o}-version`,()=>({library:o,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ml="firebase-heartbeat-database",Ul=1,Ot="firebase-heartbeat-store";let ri=null;function to(){return ri||(ri=Zs(Ml,Ul,{upgrade:(t,e)=>{switch(e){case 0:try{t.createObjectStore(Ot)}catch(i){console.warn(i)}}}}).catch(t=>{throw Oe.create("idb-open",{originalErrorMessage:t.message})})),ri}async function xl(t){try{const i=(await to()).transaction(Ot),r=await i.objectStore(Ot).get(no(t));return await i.done,r}catch(e){if(e instanceof oe)ye.warn(e.message);else{const i=Oe.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});ye.warn(i.message)}}}async function rs(t,e){try{const r=(await to()).transaction(Ot,"readwrite");await r.objectStore(Ot).put(e,no(t)),await r.done}catch(i){if(i instanceof oe)ye.warn(i.message);else{const r=Oe.create("idb-set",{originalErrorMessage:i==null?void 0:i.message});ye.warn(r.message)}}}function no(t){return`${t.name}!${t.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fl=1024,jl=30*24*60*60*1e3;class $l{constructor(e){this.container=e,this._heartbeatsCache=null;const i=this.container.getProvider("app").getImmediate();this._storage=new Vl(i),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,i;try{const o=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),c=ss();return((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((i=this._heartbeatsCache)===null||i===void 0?void 0:i.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===c||this._heartbeatsCache.heartbeats.some(l=>l.date===c)?void 0:(this._heartbeatsCache.heartbeats.push({date:c,agent:o}),this._heartbeatsCache.heartbeats=this._heartbeatsCache.heartbeats.filter(l=>{const d=new Date(l.date).valueOf();return Date.now()-d<=jl}),this._storage.overwrite(this._heartbeatsCache))}catch(r){ye.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const i=ss(),{heartbeatsToSend:r,unsentEntries:o}=Bl(this._heartbeatsCache.heartbeats),c=ln(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=i,o.length>0?(this._heartbeatsCache.heartbeats=o,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),c}catch(i){return ye.warn(i),""}}}function ss(){return new Date().toISOString().substring(0,10)}function Bl(t,e=Fl){const i=[];let r=t.slice();for(const o of t){const c=i.find(l=>l.agent===o.agent);if(c){if(c.dates.push(o.date),os(i)>e){c.dates.pop();break}}else if(i.push({agent:o.agent,dates:[o.date]}),os(i)>e){i.pop();break}r=r.slice(1)}return{heartbeatsToSend:i,unsentEntries:r}}class Vl{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Js()?Xs().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const i=await xl(this.app);return i!=null&&i.heartbeats?i:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var i;if(await this._canUseIndexedDBPromise){const o=await this.read();return rs(this.app,{lastSentHeartbeatDate:(i=e.lastSentHeartbeatDate)!==null&&i!==void 0?i:o.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var i;if(await this._canUseIndexedDBPromise){const o=await this.read();return rs(this.app,{lastSentHeartbeatDate:(i=e.lastSentHeartbeatDate)!==null&&i!==void 0?i:o.lastSentHeartbeatDate,heartbeats:[...o.heartbeats,...e.heartbeats]})}else return}}function os(t){return ln(JSON.stringify({version:2,heartbeats:t})).length}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Hl(t){le(new se("platform-logger",e=>new il(e),"PRIVATE")),le(new se("heartbeat",e=>new $l(e),"PRIVATE")),ne(mi,ns,t),ne(mi,ns,"esm2017"),ne("fire-js","")}Hl("");var zl="firebase",Gl="10.13.2";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ne(zl,Gl,"app");function ki(t,e){var i={};for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&e.indexOf(r)<0&&(i[r]=t[r]);if(t!=null&&typeof Object.getOwnPropertySymbols=="function")for(var o=0,r=Object.getOwnPropertySymbols(t);o<r.length;o++)e.indexOf(r[o])<0&&Object.prototype.propertyIsEnumerable.call(t,r[o])&&(i[r[o]]=t[r[o]]);return i}function io(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const Wl=io,ro=new He("auth","Firebase",io());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const un=new wn("@firebase/auth");function ql(t,...e){un.logLevel<=O.WARN&&un.warn(`Auth (${at}): ${t}`,...e)}function nn(t,...e){un.logLevel<=O.ERROR&&un.error(`Auth (${at}): ${t}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ve(t,...e){throw Ri(t,...e)}function ae(t,...e){return Ri(t,...e)}function so(t,e,i){const r=Object.assign(Object.assign({},Wl()),{[e]:i});return new He("auth","Firebase",r).create(e,{appName:t.name})}function je(t){return so(t,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function Ri(t,...e){if(typeof t!="string"){const i=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=t.name),t._errorFactory.create(i,...r)}return ro.create(t,...e)}function S(t,e,...i){if(!t)throw Ri(e,...i)}function pe(t){const e="INTERNAL ASSERTION FAILED: "+t;throw nn(e),new Error(e)}function _e(t,e){t||pe(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _i(){var t;return typeof self<"u"&&((t=self.location)===null||t===void 0?void 0:t.href)||""}function Kl(){return as()==="http:"||as()==="https:"}function as(){var t;return typeof self<"u"&&((t=self.location)===null||t===void 0?void 0:t.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Jl(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Kl()||Ks()||"connection"in navigator)?navigator.onLine:!0}function Xl(){if(typeof navigator>"u")return null;const t=navigator;return t.languages&&t.languages[0]||t.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lt{constructor(e,i){this.shortDelay=e,this.longDelay=i,_e(i>e,"Short delay should be less than long delay!"),this.isMobile=Ec()||Ac()}get(){return Jl()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pi(t,e){_e(t.emulator,"Emulator should always be set here");const{url:i}=t.emulator;return e?`${i}${e.startsWith("/")?e.slice(1):e}`:i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oo{static initialize(e,i,r){this.fetchImpl=e,i&&(this.headersImpl=i),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;pe("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;pe("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;pe("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yl={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ql=new Lt(3e4,6e4);function Oi(t,e){return t.tenantId&&!e.tenantId?Object.assign(Object.assign({},e),{tenantId:t.tenantId}):e}async function ct(t,e,i,r,o={}){return ao(t,o,async()=>{let c={},l={};r&&(e==="GET"?l=r:c={body:JSON.stringify(r)});const d=Nt(Object.assign({key:t.config.apiKey},l)).slice(1),g=await t._getAdditionalHeaders();g["Content-Type"]="application/json",t.languageCode&&(g["X-Firebase-Locale"]=t.languageCode);const T=Object.assign({method:e,headers:g},c);return bc()||(T.referrerPolicy="no-referrer"),oo.fetch()(co(t,t.config.apiHost,i,d),T)})}async function ao(t,e,i){t._canInitEmulator=!1;const r=Object.assign(Object.assign({},Yl),e);try{const o=new eh(t),c=await Promise.race([i(),o.promise]);o.clearNetworkTimeout();const l=await c.json();if("needConfirmation"in l)throw en(t,"account-exists-with-different-credential",l);if(c.ok&&!("errorMessage"in l))return l;{const d=c.ok?l.errorMessage:l.error.message,[g,T]=d.split(" : ");if(g==="FEDERATED_USER_ID_ALREADY_LINKED")throw en(t,"credential-already-in-use",l);if(g==="EMAIL_EXISTS")throw en(t,"email-already-in-use",l);if(g==="USER_DISABLED")throw en(t,"user-disabled",l);const b=r[g]||g.toLowerCase().replace(/[_\s]+/g,"-");if(T)throw so(t,b,T);ve(t,b)}}catch(o){if(o instanceof oe)throw o;ve(t,"network-request-failed",{message:String(o)})}}async function Zl(t,e,i,r,o={}){const c=await ct(t,e,i,r,o);return"mfaPendingCredential"in c&&ve(t,"multi-factor-auth-required",{_serverResponse:c}),c}function co(t,e,i,r){const o=`${e}${i}?${r}`;return t.config.emulator?Pi(t.config,o):`${t.config.apiScheme}://${o}`}class eh{constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((i,r)=>{this.timer=setTimeout(()=>r(ae(this.auth,"network-request-failed")),Ql.get())})}clearNetworkTimeout(){clearTimeout(this.timer)}}function en(t,e,i){const r={appName:t.name};i.email&&(r.email=i.email),i.phoneNumber&&(r.phoneNumber=i.phoneNumber);const o=ae(t,e,r);return o.customData._tokenResponse=i,o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function th(t,e){return ct(t,"POST","/v1/accounts:delete",e)}async function lo(t,e){return ct(t,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ct(t){if(t)try{const e=new Date(Number(t));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function nh(t,e=!1){const i=De(t),r=await i.getIdToken(e),o=Di(r);S(o&&o.exp&&o.auth_time&&o.iat,i.auth,"internal-error");const c=typeof o.firebase=="object"?o.firebase:void 0,l=c==null?void 0:c.sign_in_provider;return{claims:o,token:r,authTime:Ct(si(o.auth_time)),issuedAtTime:Ct(si(o.iat)),expirationTime:Ct(si(o.exp)),signInProvider:l||null,signInSecondFactor:(c==null?void 0:c.sign_in_second_factor)||null}}function si(t){return Number(t)*1e3}function Di(t){const[e,i,r]=t.split(".");if(e===void 0||i===void 0||r===void 0)return nn("JWT malformed, contained fewer than 3 sections"),null;try{const o=zs(i);return o?JSON.parse(o):(nn("Failed to decode base64 JWT payload"),null)}catch(o){return nn("Caught error parsing JWT payload as JSON",o==null?void 0:o.toString()),null}}function cs(t){const e=Di(t);return S(e,"internal-error"),S(typeof e.exp<"u","internal-error"),S(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Dt(t,e,i=!1){if(i)return e;try{return await e}catch(r){throw r instanceof oe&&ih(r)&&t.auth.currentUser===t&&await t.auth.signOut(),r}}function ih({code:t}){return t==="auth/user-disabled"||t==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rh{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){var i;if(e){const r=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),r}else{this.errorBackoff=3e4;const o=((i=this.user.stsTokenManager.expirationTime)!==null&&i!==void 0?i:0)-Date.now()-3e5;return Math.max(0,o)}}schedule(e=!1){if(!this.isRunning)return;const i=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},i)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ii{constructor(e,i){this.createdAt=e,this.lastLoginAt=i,this._initializeTime()}_initializeTime(){this.lastSignInTime=Ct(this.lastLoginAt),this.creationTime=Ct(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function dn(t){var e;const i=t.auth,r=await t.getIdToken(),o=await Dt(t,lo(i,{idToken:r}));S(o==null?void 0:o.users.length,i,"internal-error");const c=o.users[0];t._notifyReloadListener(c);const l=!((e=c.providerUserInfo)===null||e===void 0)&&e.length?ho(c.providerUserInfo):[],d=oh(t.providerData,l),g=t.isAnonymous,T=!(t.email&&c.passwordHash)&&!(d!=null&&d.length),b=g?T:!1,A={uid:c.localId,displayName:c.displayName||null,photoURL:c.photoUrl||null,email:c.email||null,emailVerified:c.emailVerified||!1,phoneNumber:c.phoneNumber||null,tenantId:c.tenantId||null,providerData:d,metadata:new Ii(c.createdAt,c.lastLoginAt),isAnonymous:b};Object.assign(t,A)}async function sh(t){const e=De(t);await dn(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function oh(t,e){return[...t.filter(r=>!e.some(o=>o.providerId===r.providerId)),...e]}function ho(t){return t.map(e=>{var{providerId:i}=e,r=ki(e,["providerId"]);return{providerId:i,uid:r.rawId||"",displayName:r.displayName||null,email:r.email||null,phoneNumber:r.phoneNumber||null,photoURL:r.photoUrl||null}})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ah(t,e){const i=await ao(t,{},async()=>{const r=Nt({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:o,apiKey:c}=t.config,l=co(t,o,"/v1/token",`key=${c}`),d=await t._getAdditionalHeaders();return d["Content-Type"]="application/x-www-form-urlencoded",oo.fetch()(l,{method:"POST",headers:d,body:r})});return{accessToken:i.access_token,expiresIn:i.expires_in,refreshToken:i.refresh_token}}async function ch(t,e){return ct(t,"POST","/v2/accounts:revokeToken",Oi(t,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class et{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){S(e.idToken,"internal-error"),S(typeof e.idToken<"u","internal-error"),S(typeof e.refreshToken<"u","internal-error");const i="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):cs(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,i)}updateFromIdToken(e){S(e.length!==0,"internal-error");const i=cs(e);this.updateTokensAndExpiration(e,null,i)}async getToken(e,i=!1){return!i&&this.accessToken&&!this.isExpired?this.accessToken:(S(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,i){const{accessToken:r,refreshToken:o,expiresIn:c}=await ah(e,i);this.updateTokensAndExpiration(r,o,Number(c))}updateTokensAndExpiration(e,i,r){this.refreshToken=i||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,i){const{refreshToken:r,accessToken:o,expirationTime:c}=i,l=new et;return r&&(S(typeof r=="string","internal-error",{appName:e}),l.refreshToken=r),o&&(S(typeof o=="string","internal-error",{appName:e}),l.accessToken=o),c&&(S(typeof c=="number","internal-error",{appName:e}),l.expirationTime=c),l}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new et,this.toJSON())}_performRefresh(){return pe("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function be(t,e){S(typeof t=="string"||typeof t>"u","internal-error",{appName:e})}class ge{constructor(e){var{uid:i,auth:r,stsTokenManager:o}=e,c=ki(e,["uid","auth","stsTokenManager"]);this.providerId="firebase",this.proactiveRefresh=new rh(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=i,this.auth=r,this.stsTokenManager=o,this.accessToken=o.accessToken,this.displayName=c.displayName||null,this.email=c.email||null,this.emailVerified=c.emailVerified||!1,this.phoneNumber=c.phoneNumber||null,this.photoURL=c.photoURL||null,this.isAnonymous=c.isAnonymous||!1,this.tenantId=c.tenantId||null,this.providerData=c.providerData?[...c.providerData]:[],this.metadata=new Ii(c.createdAt||void 0,c.lastLoginAt||void 0)}async getIdToken(e){const i=await Dt(this,this.stsTokenManager.getToken(this.auth,e));return S(i,this.auth,"internal-error"),this.accessToken!==i&&(this.accessToken=i,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),i}getIdTokenResult(e){return nh(this,e)}reload(){return sh(this)}_assign(e){this!==e&&(S(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(i=>Object.assign({},i)),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const i=new ge(Object.assign(Object.assign({},this),{auth:e,stsTokenManager:this.stsTokenManager._clone()}));return i.metadata._copy(this.metadata),i}_onReload(e){S(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,i=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),i&&await dn(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(Re(this.auth.app))return Promise.reject(je(this.auth));const e=await this.getIdToken();return await Dt(this,th(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return Object.assign(Object.assign({uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>Object.assign({},e)),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId},this.metadata.toJSON()),{apiKey:this.auth.config.apiKey,appName:this.auth.name})}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,i){var r,o,c,l,d,g,T,b;const A=(r=i.displayName)!==null&&r!==void 0?r:void 0,C=(o=i.email)!==null&&o!==void 0?o:void 0,D=(c=i.phoneNumber)!==null&&c!==void 0?c:void 0,k=(l=i.photoURL)!==null&&l!==void 0?l:void 0,x=(d=i.tenantId)!==null&&d!==void 0?d:void 0,M=(g=i._redirectEventId)!==null&&g!==void 0?g:void 0,he=(T=i.createdAt)!==null&&T!==void 0?T:void 0,Q=(b=i.lastLoginAt)!==null&&b!==void 0?b:void 0,{uid:j,emailVerified:ie,isAnonymous:Ne,providerData:X,stsTokenManager:v}=i;S(j&&v,e,"internal-error");const u=et.fromJSON(this.name,v);S(typeof j=="string",e,"internal-error"),be(A,e.name),be(C,e.name),S(typeof ie=="boolean",e,"internal-error"),S(typeof Ne=="boolean",e,"internal-error"),be(D,e.name),be(k,e.name),be(x,e.name),be(M,e.name),be(he,e.name),be(Q,e.name);const p=new ge({uid:j,auth:e,email:C,emailVerified:ie,displayName:A,isAnonymous:Ne,photoURL:k,phoneNumber:D,tenantId:x,stsTokenManager:u,createdAt:he,lastLoginAt:Q});return X&&Array.isArray(X)&&(p.providerData=X.map(m=>Object.assign({},m))),M&&(p._redirectEventId=M),p}static async _fromIdTokenResponse(e,i,r=!1){const o=new et;o.updateFromServerResponse(i);const c=new ge({uid:i.localId,auth:e,stsTokenManager:o,isAnonymous:r});return await dn(c),c}static async _fromGetAccountInfoResponse(e,i,r){const o=i.users[0];S(o.localId!==void 0,"internal-error");const c=o.providerUserInfo!==void 0?ho(o.providerUserInfo):[],l=!(o.email&&o.passwordHash)&&!(c!=null&&c.length),d=new et;d.updateFromIdToken(r);const g=new ge({uid:o.localId,auth:e,stsTokenManager:d,isAnonymous:l}),T={uid:o.localId,displayName:o.displayName||null,photoURL:o.photoUrl||null,email:o.email||null,emailVerified:o.emailVerified||!1,phoneNumber:o.phoneNumber||null,tenantId:o.tenantId||null,providerData:c,metadata:new Ii(o.createdAt,o.lastLoginAt),isAnonymous:!(o.email&&o.passwordHash)&&!(c!=null&&c.length)};return Object.assign(g,T),g}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ls=new Map;function me(t){_e(t instanceof Function,"Expected a class definition");let e=ls.get(t);return e?(_e(e instanceof t,"Instance stored in cache mismatched with class"),e):(e=new t,ls.set(t,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uo{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,i){this.storage[e]=i}async _get(e){const i=this.storage[e];return i===void 0?null:i}async _remove(e){delete this.storage[e]}_addListener(e,i){}_removeListener(e,i){}}uo.type="NONE";const hs=uo;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function rn(t,e,i){return`firebase:${t}:${e}:${i}`}class tt{constructor(e,i,r){this.persistence=e,this.auth=i,this.userKey=r;const{config:o,name:c}=this.auth;this.fullUserKey=rn(this.userKey,o.apiKey,c),this.fullPersistenceKey=rn("persistence",o.apiKey,c),this.boundEventHandler=i._onStorageEvent.bind(i),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);return e?ge._fromJSON(this.auth,e):null}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const i=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,i)return this.setCurrentUser(i)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,i,r="authUser"){if(!i.length)return new tt(me(hs),e,r);const o=(await Promise.all(i.map(async T=>{if(await T._isAvailable())return T}))).filter(T=>T);let c=o[0]||me(hs);const l=rn(r,e.config.apiKey,e.name);let d=null;for(const T of i)try{const b=await T._get(l);if(b){const A=ge._fromJSON(e,b);T!==c&&(d=A),c=T;break}}catch{}const g=o.filter(T=>T._shouldAllowMigration);return!c._shouldAllowMigration||!g.length?new tt(c,e,r):(c=g[0],d&&await c._set(l,d.toJSON()),await Promise.all(i.map(async T=>{if(T!==c)try{await T._remove(l)}catch{}})),new tt(c,e,r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function us(t){const e=t.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(mo(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(fo(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(vo(e))return"Blackberry";if(_o(e))return"Webos";if(po(e))return"Safari";if((e.includes("chrome/")||go(e))&&!e.includes("edge/"))return"Chrome";if(yo(e))return"Android";{const i=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=t.match(i);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function fo(t=J()){return/firefox\//i.test(t)}function po(t=J()){const e=t.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function go(t=J()){return/crios\//i.test(t)}function mo(t=J()){return/iemobile/i.test(t)}function yo(t=J()){return/android/i.test(t)}function vo(t=J()){return/blackberry/i.test(t)}function _o(t=J()){return/webos/i.test(t)}function Ni(t=J()){return/iphone|ipad|ipod/i.test(t)||/macintosh/i.test(t)&&/mobile/i.test(t)}function lh(t=J()){var e;return Ni(t)&&!!(!((e=window.navigator)===null||e===void 0)&&e.standalone)}function hh(){return Sc()&&document.documentMode===10}function Io(t=J()){return Ni(t)||yo(t)||_o(t)||vo(t)||/windows phone/i.test(t)||mo(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wo(t,e=[]){let i;switch(t){case"Browser":i=us(J());break;case"Worker":i=`${us(J())}-${t}`;break;default:i=t}const r=e.length?e.join(","):"FirebaseCore-web";return`${i}/JsCore/${at}/${r}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uh{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,i){const r=c=>new Promise((l,d)=>{try{const g=e(c);l(g)}catch(g){d(g)}});r.onAbort=i,this.queue.push(r);const o=this.queue.length-1;return()=>{this.queue[o]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const i=[];try{for(const r of this.queue)await r(e),r.onAbort&&i.push(r.onAbort)}catch(r){i.reverse();for(const o of i)try{o()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function dh(t,e={}){return ct(t,"GET","/v2/passwordPolicy",Oi(t,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fh=6;class ph{constructor(e){var i,r,o,c;const l=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=(i=l.minPasswordLength)!==null&&i!==void 0?i:fh,l.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=l.maxPasswordLength),l.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=l.containsLowercaseCharacter),l.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=l.containsUppercaseCharacter),l.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=l.containsNumericCharacter),l.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=l.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=(o=(r=e.allowedNonAlphanumericCharacters)===null||r===void 0?void 0:r.join(""))!==null&&o!==void 0?o:"",this.forceUpgradeOnSignin=(c=e.forceUpgradeOnSignin)!==null&&c!==void 0?c:!1,this.schemaVersion=e.schemaVersion}validatePassword(e){var i,r,o,c,l,d;const g={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,g),this.validatePasswordCharacterOptions(e,g),g.isValid&&(g.isValid=(i=g.meetsMinPasswordLength)!==null&&i!==void 0?i:!0),g.isValid&&(g.isValid=(r=g.meetsMaxPasswordLength)!==null&&r!==void 0?r:!0),g.isValid&&(g.isValid=(o=g.containsLowercaseLetter)!==null&&o!==void 0?o:!0),g.isValid&&(g.isValid=(c=g.containsUppercaseLetter)!==null&&c!==void 0?c:!0),g.isValid&&(g.isValid=(l=g.containsNumericCharacter)!==null&&l!==void 0?l:!0),g.isValid&&(g.isValid=(d=g.containsNonAlphanumericCharacter)!==null&&d!==void 0?d:!0),g}validatePasswordLengthOptions(e,i){const r=this.customStrengthOptions.minPasswordLength,o=this.customStrengthOptions.maxPasswordLength;r&&(i.meetsMinPasswordLength=e.length>=r),o&&(i.meetsMaxPasswordLength=e.length<=o)}validatePasswordCharacterOptions(e,i){this.updatePasswordCharacterOptionsStatuses(i,!1,!1,!1,!1);let r;for(let o=0;o<e.length;o++)r=e.charAt(o),this.updatePasswordCharacterOptionsStatuses(i,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,i,r,o,c){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=i)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=o)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=c))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gh{constructor(e,i,r,o){this.app=e,this.heartbeatServiceProvider=i,this.appCheckServiceProvider=r,this.config=o,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new ds(this),this.idTokenSubscription=new ds(this),this.beforeStateQueue=new uh(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=ro,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=o.sdkClientVersion}_initializeWithPersistence(e,i){return i&&(this._popupRedirectResolver=me(i)),this._initializationPromise=this.queue(async()=>{var r,o;if(!this._deleted&&(this.persistenceManager=await tt.create(this,e),!this._deleted)){if(!((r=this._popupRedirectResolver)===null||r===void 0)&&r._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(i),this.lastNotifiedUid=((o=this.currentUser)===null||o===void 0?void 0:o.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const i=await lo(this,{idToken:e}),r=await ge._fromGetAccountInfoResponse(this,i,e);await this.directlySetCurrentUser(r)}catch(i){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",i),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var i;if(Re(this.app)){const l=this.app.settings.authIdToken;return l?new Promise(d=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(l).then(d,d))}):this.directlySetCurrentUser(null)}const r=await this.assertedPersistence.getCurrentUser();let o=r,c=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const l=(i=this.redirectUser)===null||i===void 0?void 0:i._redirectEventId,d=o==null?void 0:o._redirectEventId,g=await this.tryRedirectSignIn(e);(!l||l===d)&&(g!=null&&g.user)&&(o=g.user,c=!0)}if(!o)return this.directlySetCurrentUser(null);if(!o._redirectEventId){if(c)try{await this.beforeStateQueue.runMiddleware(o)}catch(l){o=r,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(l))}return o?this.reloadAndSetCurrentUserOrClear(o):this.directlySetCurrentUser(null)}return S(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===o._redirectEventId?this.directlySetCurrentUser(o):this.reloadAndSetCurrentUserOrClear(o)}async tryRedirectSignIn(e){let i=null;try{i=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return i}async reloadAndSetCurrentUserOrClear(e){try{await dn(e)}catch(i){if((i==null?void 0:i.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Xl()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(Re(this.app))return Promise.reject(je(this));const i=e?De(e):null;return i&&S(i.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(i&&i._clone(this))}async _updateCurrentUser(e,i=!1){if(!this._deleted)return e&&S(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),i||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return Re(this.app)?Promise.reject(je(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return Re(this.app)?Promise.reject(je(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(me(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const i=this._getPasswordPolicyInternal();return i.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):i.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await dh(this),i=new ph(e);this.tenantId===null?this._projectPasswordPolicy=i:this._tenantPasswordPolicies[this.tenantId]=i}_getPersistence(){return this.assertedPersistence.persistence.type}_updateErrorMap(e){this._errorFactory=new He("auth","Firebase",e())}onAuthStateChanged(e,i,r){return this.registerStateListener(this.authStateSubscription,e,i,r)}beforeAuthStateChanged(e,i){return this.beforeStateQueue.pushCallback(e,i)}onIdTokenChanged(e,i,r){return this.registerStateListener(this.idTokenSubscription,e,i,r)}authStateReady(){return new Promise((e,i)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},i)}})}async revokeAccessToken(e){if(this.currentUser){const i=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:i};this.tenantId!=null&&(r.tenantId=this.tenantId),await ch(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)===null||e===void 0?void 0:e.toJSON()}}async _setRedirectUser(e,i){const r=await this.getOrInitRedirectPersistenceManager(i);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const i=e&&me(e)||this._popupRedirectResolver;S(i,this,"argument-error"),this.redirectPersistenceManager=await tt.create(this,[me(i._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var i,r;return this._isInitialized&&await this.queue(async()=>{}),((i=this._currentUser)===null||i===void 0?void 0:i._redirectEventId)===e?this._currentUser:((r=this.redirectUser)===null||r===void 0?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var e,i;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const r=(i=(e=this.currentUser)===null||e===void 0?void 0:e.uid)!==null&&i!==void 0?i:null;this.lastNotifiedUid!==r&&(this.lastNotifiedUid=r,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,i,r,o){if(this._deleted)return()=>{};const c=typeof i=="function"?i:i.next.bind(i);let l=!1;const d=this._isInitialized?Promise.resolve():this._initializationPromise;if(S(d,this,"internal-error"),d.then(()=>{l||c(this.currentUser)}),typeof i=="function"){const g=e.addObserver(i,r,o);return()=>{l=!0,g()}}else{const g=e.addObserver(i);return()=>{l=!0,g()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return S(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=wo(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var e;const i={"X-Client-Version":this.clientVersion};this.app.options.appId&&(i["X-Firebase-gmpid"]=this.app.options.appId);const r=await((e=this.heartbeatServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getHeartbeatsHeader());r&&(i["X-Firebase-Client"]=r);const o=await this._getAppCheckToken();return o&&(i["X-Firebase-AppCheck"]=o),i}async _getAppCheckToken(){var e;const i=await((e=this.appCheckServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getToken());return i!=null&&i.error&&ql(`Error while retrieving App Check token: ${i.error}`),i==null?void 0:i.token}}function Li(t){return De(t)}class ds{constructor(e){this.auth=e,this.observer=null,this.addObserver=Dc(i=>this.observer=i)}get next(){return S(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Mi={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function mh(t){Mi=t}function yh(t){return Mi.loadJS(t)}function vh(){return Mi.gapiScript}function _h(t){return`__${t}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ih(t,e){const i=ze(t,"auth");if(i.isInitialized()){const o=i.getImmediate(),c=i.getOptions();if(Pt(c,e??{}))return o;ve(o,"already-initialized")}return i.initialize({options:e})}function wh(t,e){const i=(e==null?void 0:e.persistence)||[],r=(Array.isArray(i)?i:[i]).map(me);e!=null&&e.errorMap&&t._updateErrorMap(e.errorMap),t._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function Th(t,e,i){const r=Li(t);S(r._canInitEmulator,r,"emulator-config-failed"),S(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const o=!1,c=To(e),{host:l,port:d}=Eh(e),g=d===null?"":`:${d}`;r.config.emulator={url:`${c}//${l}${g}/`},r.settings.appVerificationDisabledForTesting=!0,r.emulatorConfig=Object.freeze({host:l,port:d,protocol:c.replace(":",""),options:Object.freeze({disableWarnings:o})}),bh()}function To(t){const e=t.indexOf(":");return e<0?"":t.substr(0,e+1)}function Eh(t){const e=To(t),i=/(\/\/)?([^?#/]+)/.exec(t.substr(e.length));if(!i)return{host:"",port:null};const r=i[2].split("@").pop()||"",o=/^(\[[^\]]+\])(:|$)/.exec(r);if(o){const c=o[1];return{host:c,port:fs(r.substr(c.length+1))}}else{const[c,l]=r.split(":");return{host:c,port:fs(l)}}}function fs(t){if(!t)return null;const e=Number(t);return isNaN(e)?null:e}function bh(){function t(){const e=document.createElement("p"),i=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",i.position="fixed",i.width="100%",i.backgroundColor="#ffffff",i.border=".1em solid #000000",i.color="#b50000",i.bottom="0px",i.left="0px",i.margin="0px",i.zIndex="10000",i.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",t):t())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Eo{constructor(e,i){this.providerId=e,this.signInMethod=i}toJSON(){return pe("not implemented")}_getIdTokenResponse(e){return pe("not implemented")}_linkToIdToken(e,i){return pe("not implemented")}_getReauthenticationResolver(e){return pe("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function nt(t,e){return Zl(t,"POST","/v1/accounts:signInWithIdp",Oi(t,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ah="http://localhost";class $e extends Eo{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const i=new $e(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(i.idToken=e.idToken),e.accessToken&&(i.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(i.nonce=e.nonce),e.pendingToken&&(i.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(i.accessToken=e.oauthToken,i.secret=e.oauthTokenSecret):ve("argument-error"),i}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const i=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:o}=i,c=ki(i,["providerId","signInMethod"]);if(!r||!o)return null;const l=new $e(r,o);return l.idToken=c.idToken||void 0,l.accessToken=c.accessToken||void 0,l.secret=c.secret,l.nonce=c.nonce,l.pendingToken=c.pendingToken||null,l}_getIdTokenResponse(e){const i=this.buildRequest();return nt(e,i)}_linkToIdToken(e,i){const r=this.buildRequest();return r.idToken=i,nt(e,r)}_getReauthenticationResolver(e){const i=this.buildRequest();return i.autoCreate=!1,nt(e,i)}buildRequest(){const e={requestUri:Ah,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const i={};this.idToken&&(i.id_token=this.idToken),this.accessToken&&(i.access_token=this.accessToken),this.secret&&(i.oauth_token_secret=this.secret),i.providerId=this.providerId,this.nonce&&!this.pendingToken&&(i.nonce=this.nonce),e.postBody=Nt(i)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bo{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mt extends bo{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ae extends Mt{constructor(){super("facebook.com")}static credential(e){return $e._fromParams({providerId:Ae.PROVIDER_ID,signInMethod:Ae.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Ae.credentialFromTaggedObject(e)}static credentialFromError(e){return Ae.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Ae.credential(e.oauthAccessToken)}catch{return null}}}Ae.FACEBOOK_SIGN_IN_METHOD="facebook.com";Ae.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Se extends Mt{constructor(){super("google.com"),this.addScope("profile")}static credential(e,i){return $e._fromParams({providerId:Se.PROVIDER_ID,signInMethod:Se.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:i})}static credentialFromResult(e){return Se.credentialFromTaggedObject(e)}static credentialFromError(e){return Se.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:i,oauthAccessToken:r}=e;if(!i&&!r)return null;try{return Se.credential(i,r)}catch{return null}}}Se.GOOGLE_SIGN_IN_METHOD="google.com";Se.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ce extends Mt{constructor(){super("github.com")}static credential(e){return $e._fromParams({providerId:Ce.PROVIDER_ID,signInMethod:Ce.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Ce.credentialFromTaggedObject(e)}static credentialFromError(e){return Ce.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Ce.credential(e.oauthAccessToken)}catch{return null}}}Ce.GITHUB_SIGN_IN_METHOD="github.com";Ce.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ke extends Mt{constructor(){super("twitter.com")}static credential(e,i){return $e._fromParams({providerId:ke.PROVIDER_ID,signInMethod:ke.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:i})}static credentialFromResult(e){return ke.credentialFromTaggedObject(e)}static credentialFromError(e){return ke.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:i,oauthTokenSecret:r}=e;if(!i||!r)return null;try{return ke.credential(i,r)}catch{return null}}}ke.TWITTER_SIGN_IN_METHOD="twitter.com";ke.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class st{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,i,r,o=!1){const c=await ge._fromIdTokenResponse(e,r,o),l=ps(r);return new st({user:c,providerId:l,_tokenResponse:r,operationType:i})}static async _forOperation(e,i,r){await e._updateTokensIfNecessary(r,!0);const o=ps(r);return new st({user:e,providerId:o,_tokenResponse:r,operationType:i})}}function ps(t){return t.providerId?t.providerId:"phoneNumber"in t?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fn extends oe{constructor(e,i,r,o){var c;super(i.code,i.message),this.operationType=r,this.user=o,Object.setPrototypeOf(this,fn.prototype),this.customData={appName:e.name,tenantId:(c=e.tenantId)!==null&&c!==void 0?c:void 0,_serverResponse:i.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,i,r,o){return new fn(e,i,r,o)}}function Ao(t,e,i,r){return(e==="reauthenticate"?i._getReauthenticationResolver(t):i._getIdTokenResponse(t)).catch(c=>{throw c.code==="auth/multi-factor-auth-required"?fn._fromErrorAndOperation(t,c,e,r):c})}async function Sh(t,e,i=!1){const r=await Dt(t,e._linkToIdToken(t.auth,await t.getIdToken()),i);return st._forOperation(t,"link",r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ch(t,e,i=!1){const{auth:r}=t;if(Re(r.app))return Promise.reject(je(r));const o="reauthenticate";try{const c=await Dt(t,Ao(r,o,e,t),i);S(c.idToken,r,"internal-error");const l=Di(c.idToken);S(l,r,"internal-error");const{sub:d}=l;return S(t.uid===d,r,"user-mismatch"),st._forOperation(t,o,c)}catch(c){throw(c==null?void 0:c.code)==="auth/user-not-found"&&ve(r,"user-mismatch"),c}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function kh(t,e,i=!1){if(Re(t.app))return Promise.reject(je(t));const r="signIn",o=await Ao(t,r,e),c=await st._fromIdTokenResponse(t,r,o);return i||await t._updateCurrentUser(c.user),c}function Rh(t,e,i,r){return De(t).onIdTokenChanged(e,i,r)}function Ph(t,e,i){return De(t).beforeAuthStateChanged(e,i)}const pn="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class So{constructor(e,i){this.storageRetriever=e,this.type=i}_isAvailable(){try{return this.storage?(this.storage.setItem(pn,"1"),this.storage.removeItem(pn),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,i){return this.storage.setItem(e,JSON.stringify(i)),Promise.resolve()}_get(e){const i=this.storage.getItem(e);return Promise.resolve(i?JSON.parse(i):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Oh=1e3,Dh=10;class Co extends So{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,i)=>this.onStorageEvent(e,i),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Io(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const i of Object.keys(this.listeners)){const r=this.storage.getItem(i),o=this.localCache[i];r!==o&&e(i,o,r)}}onStorageEvent(e,i=!1){if(!e.key){this.forAllChangedKeys((l,d,g)=>{this.notifyListeners(l,g)});return}const r=e.key;i?this.detachListener():this.stopPolling();const o=()=>{const l=this.storage.getItem(r);!i&&this.localCache[r]===l||this.notifyListeners(r,l)},c=this.storage.getItem(r);hh()&&c!==e.newValue&&e.newValue!==e.oldValue?setTimeout(o,Dh):o()}notifyListeners(e,i){this.localCache[e]=i;const r=this.listeners[e];if(r)for(const o of Array.from(r))o(i&&JSON.parse(i))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,i,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:i,newValue:r}),!0)})},Oh)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,i){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(i)}_removeListener(e,i){this.listeners[e]&&(this.listeners[e].delete(i),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,i){await super._set(e,i),this.localCache[e]=JSON.stringify(i)}async _get(e){const i=await super._get(e);return this.localCache[e]=JSON.stringify(i),i}async _remove(e){await super._remove(e),delete this.localCache[e]}}Co.type="LOCAL";const Nh=Co;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ko extends So{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,i){}_removeListener(e,i){}}ko.type="SESSION";const Ro=ko;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Lh(t){return Promise.all(t.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(i){return{fulfilled:!1,reason:i}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tn{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const i=this.receivers.find(o=>o.isListeningto(e));if(i)return i;const r=new Tn(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const i=e,{eventId:r,eventType:o,data:c}=i.data,l=this.handlersMap[o];if(!(l!=null&&l.size))return;i.ports[0].postMessage({status:"ack",eventId:r,eventType:o});const d=Array.from(l).map(async T=>T(i.origin,c)),g=await Lh(d);i.ports[0].postMessage({status:"done",eventId:r,eventType:o,response:g})}_subscribe(e,i){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(i)}_unsubscribe(e,i){this.handlersMap[e]&&i&&this.handlersMap[e].delete(i),(!i||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Tn.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ui(t="",e=10){let i="";for(let r=0;r<e;r++)i+=Math.floor(Math.random()*10);return t+i}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mh{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,i,r=50){const o=typeof MessageChannel<"u"?new MessageChannel:null;if(!o)throw new Error("connection_unavailable");let c,l;return new Promise((d,g)=>{const T=Ui("",20);o.port1.start();const b=setTimeout(()=>{g(new Error("unsupported_event"))},r);l={messageChannel:o,onMessage(A){const C=A;if(C.data.eventId===T)switch(C.data.status){case"ack":clearTimeout(b),c=setTimeout(()=>{g(new Error("timeout"))},3e3);break;case"done":clearTimeout(c),d(C.data.response);break;default:clearTimeout(b),clearTimeout(c),g(new Error("invalid_response"));break}}},this.handlers.add(l),o.port1.addEventListener("message",l.onMessage),this.target.postMessage({eventType:e,eventId:T,data:i},[o.port2])}).finally(()=>{l&&this.removeMessageHandler(l)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ce(){return window}function Uh(t){ce().location.href=t}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Po(){return typeof ce().WorkerGlobalScope<"u"&&typeof ce().importScripts=="function"}async function xh(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function Fh(){var t;return((t=navigator==null?void 0:navigator.serviceWorker)===null||t===void 0?void 0:t.controller)||null}function jh(){return Po()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Oo="firebaseLocalStorageDb",$h=1,gn="firebaseLocalStorage",Do="fbase_key";class Ut{constructor(e){this.request=e}toPromise(){return new Promise((e,i)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{i(this.request.error)})})}}function En(t,e){return t.transaction([gn],e?"readwrite":"readonly").objectStore(gn)}function Bh(){const t=indexedDB.deleteDatabase(Oo);return new Ut(t).toPromise()}function wi(){const t=indexedDB.open(Oo,$h);return new Promise((e,i)=>{t.addEventListener("error",()=>{i(t.error)}),t.addEventListener("upgradeneeded",()=>{const r=t.result;try{r.createObjectStore(gn,{keyPath:Do})}catch(o){i(o)}}),t.addEventListener("success",async()=>{const r=t.result;r.objectStoreNames.contains(gn)?e(r):(r.close(),await Bh(),e(await wi()))})})}async function gs(t,e,i){const r=En(t,!0).put({[Do]:e,value:i});return new Ut(r).toPromise()}async function Vh(t,e){const i=En(t,!1).get(e),r=await new Ut(i).toPromise();return r===void 0?null:r.value}function ms(t,e){const i=En(t,!0).delete(e);return new Ut(i).toPromise()}const Hh=800,zh=3;class No{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await wi(),this.db)}async _withRetries(e){let i=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(i++>zh)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Po()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Tn._getInstance(jh()),this.receiver._subscribe("keyChanged",async(e,i)=>({keyProcessed:(await this._poll()).includes(i.key)})),this.receiver._subscribe("ping",async(e,i)=>["keyChanged"])}async initializeSender(){var e,i;if(this.activeServiceWorker=await xh(),!this.activeServiceWorker)return;this.sender=new Mh(this.activeServiceWorker);const r=await this.sender._send("ping",{},800);r&&!((e=r[0])===null||e===void 0)&&e.fulfilled&&!((i=r[0])===null||i===void 0)&&i.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||Fh()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await wi();return await gs(e,pn,"1"),await ms(e,pn),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,i){return this._withPendingWrite(async()=>(await this._withRetries(r=>gs(r,e,i)),this.localCache[e]=i,this.notifyServiceWorker(e)))}async _get(e){const i=await this._withRetries(r=>Vh(r,e));return this.localCache[e]=i,i}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(i=>ms(i,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(o=>{const c=En(o,!1).getAll();return new Ut(c).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const i=[],r=new Set;if(e.length!==0)for(const{fbase_key:o,value:c}of e)r.add(o),JSON.stringify(this.localCache[o])!==JSON.stringify(c)&&(this.notifyListeners(o,c),i.push(o));for(const o of Object.keys(this.localCache))this.localCache[o]&&!r.has(o)&&(this.notifyListeners(o,null),i.push(o));return i}notifyListeners(e,i){this.localCache[e]=i;const r=this.listeners[e];if(r)for(const o of Array.from(r))o(i)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Hh)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,i){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(i)}_removeListener(e,i){this.listeners[e]&&(this.listeners[e].delete(i),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}No.type="LOCAL";const Gh=No;new Lt(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wh(t,e){return e?me(e):(S(t._popupRedirectResolver,t,"argument-error"),t._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xi extends Eo{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return nt(e,this._buildIdpRequest())}_linkToIdToken(e,i){return nt(e,this._buildIdpRequest(i))}_getReauthenticationResolver(e){return nt(e,this._buildIdpRequest())}_buildIdpRequest(e){const i={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(i.idToken=e),i}}function qh(t){return kh(t.auth,new xi(t),t.bypassAuthState)}function Kh(t){const{auth:e,user:i}=t;return S(i,e,"internal-error"),Ch(i,new xi(t),t.bypassAuthState)}async function Jh(t){const{auth:e,user:i}=t;return S(i,e,"internal-error"),Sh(i,new xi(t),t.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lo{constructor(e,i,r,o,c=!1){this.auth=e,this.resolver=r,this.user=o,this.bypassAuthState=c,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(i)?i:[i]}execute(){return new Promise(async(e,i)=>{this.pendingPromise={resolve:e,reject:i};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:i,sessionId:r,postBody:o,tenantId:c,error:l,type:d}=e;if(l){this.reject(l);return}const g={auth:this.auth,requestUri:i,sessionId:r,tenantId:c||void 0,postBody:o||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(d)(g))}catch(T){this.reject(T)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return qh;case"linkViaPopup":case"linkViaRedirect":return Jh;case"reauthViaPopup":case"reauthViaRedirect":return Kh;default:ve(this.auth,"internal-error")}}resolve(e){_e(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){_e(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xh=new Lt(2e3,1e4);class Qe extends Lo{constructor(e,i,r,o,c){super(e,i,o,c),this.provider=r,this.authWindow=null,this.pollId=null,Qe.currentPopupAction&&Qe.currentPopupAction.cancel(),Qe.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return S(e,this.auth,"internal-error"),e}async onExecution(){_e(this.filter.length===1,"Popup operations only handle one event");const e=Ui();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(i=>{this.reject(i)}),this.resolver._isIframeWebStorageSupported(this.auth,i=>{i||this.reject(ae(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)===null||e===void 0?void 0:e.associatedEvent)||null}cancel(){this.reject(ae(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,Qe.currentPopupAction=null}pollUserCancellation(){const e=()=>{var i,r;if(!((r=(i=this.authWindow)===null||i===void 0?void 0:i.window)===null||r===void 0)&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(ae(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,Xh.get())};e()}}Qe.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yh="pendingRedirect",sn=new Map;class Qh extends Lo{constructor(e,i,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],i,void 0,r),this.eventId=null}async execute(){let e=sn.get(this.auth._key());if(!e){try{const r=await Zh(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(i){e=()=>Promise.reject(i)}sn.set(this.auth._key(),e)}return this.bypassAuthState||sn.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const i=await this.auth._redirectUserForId(e.eventId);if(i)return this.user=i,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function Zh(t,e){const i=nu(e),r=tu(t);if(!await r._isAvailable())return!1;const o=await r._get(i)==="true";return await r._remove(i),o}function eu(t,e){sn.set(t._key(),e)}function tu(t){return me(t._redirectPersistence)}function nu(t){return rn(Yh,t.config.apiKey,t.name)}async function iu(t,e,i=!1){if(Re(t.app))return Promise.reject(je(t));const r=Li(t),o=Wh(r,e),l=await new Qh(r,o,i).execute();return l&&!i&&(delete l.user._redirectEventId,await r._persistUserIfCurrent(l.user),await r._setRedirectUser(null,e)),l}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ru=10*60*1e3;class su{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let i=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(i=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!ou(e)||(this.hasHandledPotentialRedirect=!0,i||(this.queuedRedirectEvent=e,i=!0)),i}sendToConsumer(e,i){var r;if(e.error&&!Mo(e)){const o=((r=e.error.code)===null||r===void 0?void 0:r.split("auth/")[1])||"internal-error";i.onError(ae(this.auth,o))}else i.onAuthEvent(e)}isEventForConsumer(e,i){const r=i.eventId===null||!!e.eventId&&e.eventId===i.eventId;return i.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=ru&&this.cachedEventUids.clear(),this.cachedEventUids.has(ys(e))}saveEventToCache(e){this.cachedEventUids.add(ys(e)),this.lastProcessedEventTime=Date.now()}}function ys(t){return[t.type,t.eventId,t.sessionId,t.tenantId].filter(e=>e).join("-")}function Mo({type:t,error:e}){return t==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function ou(t){switch(t.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Mo(t);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function au(t,e={}){return ct(t,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cu=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,lu=/^https?/;async function hu(t){if(t.config.emulator)return;const{authorizedDomains:e}=await au(t);for(const i of e)try{if(uu(i))return}catch{}ve(t,"unauthorized-domain")}function uu(t){const e=_i(),{protocol:i,hostname:r}=new URL(e);if(t.startsWith("chrome-extension://")){const l=new URL(t);return l.hostname===""&&r===""?i==="chrome-extension:"&&t.replace("chrome-extension://","")===e.replace("chrome-extension://",""):i==="chrome-extension:"&&l.hostname===r}if(!lu.test(i))return!1;if(cu.test(t))return r===t;const o=t.replace(/\./g,"\\.");return new RegExp("^(.+\\."+o+"|"+o+")$","i").test(r)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const du=new Lt(3e4,6e4);function vs(){const t=ce().___jsl;if(t!=null&&t.H){for(const e of Object.keys(t.H))if(t.H[e].r=t.H[e].r||[],t.H[e].L=t.H[e].L||[],t.H[e].r=[...t.H[e].L],t.CP)for(let i=0;i<t.CP.length;i++)t.CP[i]=null}}function fu(t){return new Promise((e,i)=>{var r,o,c;function l(){vs(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{vs(),i(ae(t,"network-request-failed"))},timeout:du.get()})}if(!((o=(r=ce().gapi)===null||r===void 0?void 0:r.iframes)===null||o===void 0)&&o.Iframe)e(gapi.iframes.getContext());else if(!((c=ce().gapi)===null||c===void 0)&&c.load)l();else{const d=_h("iframefcb");return ce()[d]=()=>{gapi.load?l():i(ae(t,"network-request-failed"))},yh(`${vh()}?onload=${d}`).catch(g=>i(g))}}).catch(e=>{throw on=null,e})}let on=null;function pu(t){return on=on||fu(t),on}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gu=new Lt(5e3,15e3),mu="__/auth/iframe",yu="emulator/auth/iframe",vu={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},_u=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function Iu(t){const e=t.config;S(e.authDomain,t,"auth-domain-config-required");const i=e.emulator?Pi(e,yu):`https://${t.config.authDomain}/${mu}`,r={apiKey:e.apiKey,appName:t.name,v:at},o=_u.get(t.config.apiHost);o&&(r.eid=o);const c=t._getFrameworks();return c.length&&(r.fw=c.join(",")),`${i}?${Nt(r).slice(1)}`}async function wu(t){const e=await pu(t),i=ce().gapi;return S(i,t,"internal-error"),e.open({where:document.body,url:Iu(t),messageHandlersFilter:i.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:vu,dontclear:!0},r=>new Promise(async(o,c)=>{await r.restyle({setHideOnLeave:!1});const l=ae(t,"network-request-failed"),d=ce().setTimeout(()=>{c(l)},gu.get());function g(){ce().clearTimeout(d),o(r)}r.ping(g).then(g,()=>{c(l)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Tu={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},Eu=500,bu=600,Au="_blank",Su="http://localhost";class _s{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function Cu(t,e,i,r=Eu,o=bu){const c=Math.max((window.screen.availHeight-o)/2,0).toString(),l=Math.max((window.screen.availWidth-r)/2,0).toString();let d="";const g=Object.assign(Object.assign({},Tu),{width:r.toString(),height:o.toString(),top:c,left:l}),T=J().toLowerCase();i&&(d=go(T)?Au:i),fo(T)&&(e=e||Su,g.scrollbars="yes");const b=Object.entries(g).reduce((C,[D,k])=>`${C}${D}=${k},`,"");if(lh(T)&&d!=="_self")return ku(e||"",d),new _s(null);const A=window.open(e||"",d,b);S(A,t,"popup-blocked");try{A.focus()}catch{}return new _s(A)}function ku(t,e){const i=document.createElement("a");i.href=t,i.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),i.dispatchEvent(r)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ru="__/auth/handler",Pu="emulator/auth/handler",Ou=encodeURIComponent("fac");async function Is(t,e,i,r,o,c){S(t.config.authDomain,t,"auth-domain-config-required"),S(t.config.apiKey,t,"invalid-api-key");const l={apiKey:t.config.apiKey,appName:t.name,authType:i,redirectUrl:r,v:at,eventId:o};if(e instanceof bo){e.setDefaultLanguage(t.languageCode),l.providerId=e.providerId||"",Oc(e.getCustomParameters())||(l.customParameters=JSON.stringify(e.getCustomParameters()));for(const[b,A]of Object.entries({}))l[b]=A}if(e instanceof Mt){const b=e.getScopes().filter(A=>A!=="");b.length>0&&(l.scopes=b.join(","))}t.tenantId&&(l.tid=t.tenantId);const d=l;for(const b of Object.keys(d))d[b]===void 0&&delete d[b];const g=await t._getAppCheckToken(),T=g?`#${Ou}=${encodeURIComponent(g)}`:"";return`${Du(t)}?${Nt(d).slice(1)}${T}`}function Du({config:t}){return t.emulator?Pi(t,Pu):`https://${t.authDomain}/${Ru}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oi="webStorageSupport";class Nu{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Ro,this._completeRedirectFn=iu,this._overrideRedirectResult=eu}async _openPopup(e,i,r,o){var c;_e((c=this.eventManagers[e._key()])===null||c===void 0?void 0:c.manager,"_initialize() not called before _openPopup()");const l=await Is(e,i,r,_i(),o);return Cu(e,l,Ui())}async _openRedirect(e,i,r,o){await this._originValidation(e);const c=await Is(e,i,r,_i(),o);return Uh(c),new Promise(()=>{})}_initialize(e){const i=e._key();if(this.eventManagers[i]){const{manager:o,promise:c}=this.eventManagers[i];return o?Promise.resolve(o):(_e(c,"If manager is not set, promise should be"),c)}const r=this.initAndGetManager(e);return this.eventManagers[i]={promise:r},r.catch(()=>{delete this.eventManagers[i]}),r}async initAndGetManager(e){const i=await wu(e),r=new su(e);return i.register("authEvent",o=>(S(o==null?void 0:o.authEvent,e,"invalid-auth-event"),{status:r.onEvent(o.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=i,r}_isIframeWebStorageSupported(e,i){this.iframes[e._key()].send(oi,{type:oi},o=>{var c;const l=(c=o==null?void 0:o[0])===null||c===void 0?void 0:c[oi];l!==void 0&&i(!!l),ve(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const i=e._key();return this.originValidationPromises[i]||(this.originValidationPromises[i]=hu(e)),this.originValidationPromises[i]}get _shouldInitProactively(){return Io()||po()||Ni()}}const Lu=Nu;var ws="@firebase/auth",Ts="1.7.9";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mu{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)===null||e===void 0?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const i=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,i),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const i=this.internalListeners.get(e);i&&(this.internalListeners.delete(e),i(),this.updateProactiveRefresh())}assertAuthConfigured(){S(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Uu(t){switch(t){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function xu(t){le(new se("auth",(e,{options:i})=>{const r=e.getProvider("app").getImmediate(),o=e.getProvider("heartbeat"),c=e.getProvider("app-check-internal"),{apiKey:l,authDomain:d}=r.options;S(l&&!l.includes(":"),"invalid-api-key",{appName:r.name});const g={apiKey:l,authDomain:d,clientPlatform:t,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:wo(t)},T=new gh(r,o,c,g);return wh(T,i),T},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,i,r)=>{e.getProvider("auth-internal").initialize()})),le(new se("auth-internal",e=>{const i=Li(e.getProvider("auth").getImmediate());return(r=>new Mu(r))(i)},"PRIVATE").setInstantiationMode("EXPLICIT")),ne(ws,Ts,Uu(t)),ne(ws,Ts,"esm2017")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fu=5*60,ju=qs("authIdTokenMaxAge")||Fu;let Es=null;const $u=t=>async e=>{const i=e&&await e.getIdTokenResult(),r=i&&(new Date().getTime()-Date.parse(i.issuedAtTime))/1e3;if(r&&r>ju)return;const o=i==null?void 0:i.token;Es!==o&&(Es=o,await fetch(t,{method:o?"POST":"DELETE",headers:o?{Authorization:`Bearer ${o}`}:{}}))};function Bu(t=Ci()){const e=ze(t,"auth");if(e.isInitialized())return e.getImmediate();const i=Ih(t,{popupRedirectResolver:Lu,persistence:[Gh,Nh,Ro]}),r=qs("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const c=new URL(r,location.origin);if(location.origin===c.origin){const l=$u(c.toString());Ph(i,l,()=>l(i.currentUser)),Rh(i,d=>l(d))}}const o=Gs("auth");return o&&Th(i,`http://${o}`),i}function Vu(){var t,e;return(e=(t=document.getElementsByTagName("head"))===null||t===void 0?void 0:t[0])!==null&&e!==void 0?e:document}mh({loadJS(t){return new Promise((e,i)=>{const r=document.createElement("script");r.setAttribute("src",t),r.onload=e,r.onerror=o=>{const c=ae("internal-error");c.customData=o,i(c)},r.type="text/javascript",r.charset="UTF-8",Vu().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});xu("Browser");var bs=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Uo;(function(){var t;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(v,u){function p(){}p.prototype=u.prototype,v.D=u.prototype,v.prototype=new p,v.prototype.constructor=v,v.C=function(m,y,I){for(var f=Array(arguments.length-2),ue=2;ue<arguments.length;ue++)f[ue-2]=arguments[ue];return u.prototype[y].apply(m,f)}}function i(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}e(r,i),r.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function o(v,u,p){p||(p=0);var m=Array(16);if(typeof u=="string")for(var y=0;16>y;++y)m[y]=u.charCodeAt(p++)|u.charCodeAt(p++)<<8|u.charCodeAt(p++)<<16|u.charCodeAt(p++)<<24;else for(y=0;16>y;++y)m[y]=u[p++]|u[p++]<<8|u[p++]<<16|u[p++]<<24;u=v.g[0],p=v.g[1],y=v.g[2];var I=v.g[3],f=u+(I^p&(y^I))+m[0]+3614090360&4294967295;u=p+(f<<7&4294967295|f>>>25),f=I+(y^u&(p^y))+m[1]+3905402710&4294967295,I=u+(f<<12&4294967295|f>>>20),f=y+(p^I&(u^p))+m[2]+606105819&4294967295,y=I+(f<<17&4294967295|f>>>15),f=p+(u^y&(I^u))+m[3]+3250441966&4294967295,p=y+(f<<22&4294967295|f>>>10),f=u+(I^p&(y^I))+m[4]+4118548399&4294967295,u=p+(f<<7&4294967295|f>>>25),f=I+(y^u&(p^y))+m[5]+1200080426&4294967295,I=u+(f<<12&4294967295|f>>>20),f=y+(p^I&(u^p))+m[6]+2821735955&4294967295,y=I+(f<<17&4294967295|f>>>15),f=p+(u^y&(I^u))+m[7]+4249261313&4294967295,p=y+(f<<22&4294967295|f>>>10),f=u+(I^p&(y^I))+m[8]+1770035416&4294967295,u=p+(f<<7&4294967295|f>>>25),f=I+(y^u&(p^y))+m[9]+2336552879&4294967295,I=u+(f<<12&4294967295|f>>>20),f=y+(p^I&(u^p))+m[10]+4294925233&4294967295,y=I+(f<<17&4294967295|f>>>15),f=p+(u^y&(I^u))+m[11]+2304563134&4294967295,p=y+(f<<22&4294967295|f>>>10),f=u+(I^p&(y^I))+m[12]+1804603682&4294967295,u=p+(f<<7&4294967295|f>>>25),f=I+(y^u&(p^y))+m[13]+4254626195&4294967295,I=u+(f<<12&4294967295|f>>>20),f=y+(p^I&(u^p))+m[14]+2792965006&4294967295,y=I+(f<<17&4294967295|f>>>15),f=p+(u^y&(I^u))+m[15]+1236535329&4294967295,p=y+(f<<22&4294967295|f>>>10),f=u+(y^I&(p^y))+m[1]+4129170786&4294967295,u=p+(f<<5&4294967295|f>>>27),f=I+(p^y&(u^p))+m[6]+3225465664&4294967295,I=u+(f<<9&4294967295|f>>>23),f=y+(u^p&(I^u))+m[11]+643717713&4294967295,y=I+(f<<14&4294967295|f>>>18),f=p+(I^u&(y^I))+m[0]+3921069994&4294967295,p=y+(f<<20&4294967295|f>>>12),f=u+(y^I&(p^y))+m[5]+3593408605&4294967295,u=p+(f<<5&4294967295|f>>>27),f=I+(p^y&(u^p))+m[10]+38016083&4294967295,I=u+(f<<9&4294967295|f>>>23),f=y+(u^p&(I^u))+m[15]+3634488961&4294967295,y=I+(f<<14&4294967295|f>>>18),f=p+(I^u&(y^I))+m[4]+3889429448&4294967295,p=y+(f<<20&4294967295|f>>>12),f=u+(y^I&(p^y))+m[9]+568446438&4294967295,u=p+(f<<5&4294967295|f>>>27),f=I+(p^y&(u^p))+m[14]+3275163606&4294967295,I=u+(f<<9&4294967295|f>>>23),f=y+(u^p&(I^u))+m[3]+4107603335&4294967295,y=I+(f<<14&4294967295|f>>>18),f=p+(I^u&(y^I))+m[8]+1163531501&4294967295,p=y+(f<<20&4294967295|f>>>12),f=u+(y^I&(p^y))+m[13]+2850285829&4294967295,u=p+(f<<5&4294967295|f>>>27),f=I+(p^y&(u^p))+m[2]+4243563512&4294967295,I=u+(f<<9&4294967295|f>>>23),f=y+(u^p&(I^u))+m[7]+1735328473&4294967295,y=I+(f<<14&4294967295|f>>>18),f=p+(I^u&(y^I))+m[12]+2368359562&4294967295,p=y+(f<<20&4294967295|f>>>12),f=u+(p^y^I)+m[5]+4294588738&4294967295,u=p+(f<<4&4294967295|f>>>28),f=I+(u^p^y)+m[8]+2272392833&4294967295,I=u+(f<<11&4294967295|f>>>21),f=y+(I^u^p)+m[11]+1839030562&4294967295,y=I+(f<<16&4294967295|f>>>16),f=p+(y^I^u)+m[14]+4259657740&4294967295,p=y+(f<<23&4294967295|f>>>9),f=u+(p^y^I)+m[1]+2763975236&4294967295,u=p+(f<<4&4294967295|f>>>28),f=I+(u^p^y)+m[4]+1272893353&4294967295,I=u+(f<<11&4294967295|f>>>21),f=y+(I^u^p)+m[7]+4139469664&4294967295,y=I+(f<<16&4294967295|f>>>16),f=p+(y^I^u)+m[10]+3200236656&4294967295,p=y+(f<<23&4294967295|f>>>9),f=u+(p^y^I)+m[13]+681279174&4294967295,u=p+(f<<4&4294967295|f>>>28),f=I+(u^p^y)+m[0]+3936430074&4294967295,I=u+(f<<11&4294967295|f>>>21),f=y+(I^u^p)+m[3]+3572445317&4294967295,y=I+(f<<16&4294967295|f>>>16),f=p+(y^I^u)+m[6]+76029189&4294967295,p=y+(f<<23&4294967295|f>>>9),f=u+(p^y^I)+m[9]+3654602809&4294967295,u=p+(f<<4&4294967295|f>>>28),f=I+(u^p^y)+m[12]+3873151461&4294967295,I=u+(f<<11&4294967295|f>>>21),f=y+(I^u^p)+m[15]+530742520&4294967295,y=I+(f<<16&4294967295|f>>>16),f=p+(y^I^u)+m[2]+3299628645&4294967295,p=y+(f<<23&4294967295|f>>>9),f=u+(y^(p|~I))+m[0]+4096336452&4294967295,u=p+(f<<6&4294967295|f>>>26),f=I+(p^(u|~y))+m[7]+1126891415&4294967295,I=u+(f<<10&4294967295|f>>>22),f=y+(u^(I|~p))+m[14]+2878612391&4294967295,y=I+(f<<15&4294967295|f>>>17),f=p+(I^(y|~u))+m[5]+4237533241&4294967295,p=y+(f<<21&4294967295|f>>>11),f=u+(y^(p|~I))+m[12]+1700485571&4294967295,u=p+(f<<6&4294967295|f>>>26),f=I+(p^(u|~y))+m[3]+2399980690&4294967295,I=u+(f<<10&4294967295|f>>>22),f=y+(u^(I|~p))+m[10]+4293915773&4294967295,y=I+(f<<15&4294967295|f>>>17),f=p+(I^(y|~u))+m[1]+2240044497&4294967295,p=y+(f<<21&4294967295|f>>>11),f=u+(y^(p|~I))+m[8]+1873313359&4294967295,u=p+(f<<6&4294967295|f>>>26),f=I+(p^(u|~y))+m[15]+4264355552&4294967295,I=u+(f<<10&4294967295|f>>>22),f=y+(u^(I|~p))+m[6]+2734768916&4294967295,y=I+(f<<15&4294967295|f>>>17),f=p+(I^(y|~u))+m[13]+1309151649&4294967295,p=y+(f<<21&4294967295|f>>>11),f=u+(y^(p|~I))+m[4]+4149444226&4294967295,u=p+(f<<6&4294967295|f>>>26),f=I+(p^(u|~y))+m[11]+3174756917&4294967295,I=u+(f<<10&4294967295|f>>>22),f=y+(u^(I|~p))+m[2]+718787259&4294967295,y=I+(f<<15&4294967295|f>>>17),f=p+(I^(y|~u))+m[9]+3951481745&4294967295,v.g[0]=v.g[0]+u&4294967295,v.g[1]=v.g[1]+(y+(f<<21&4294967295|f>>>11))&4294967295,v.g[2]=v.g[2]+y&4294967295,v.g[3]=v.g[3]+I&4294967295}r.prototype.u=function(v,u){u===void 0&&(u=v.length);for(var p=u-this.blockSize,m=this.B,y=this.h,I=0;I<u;){if(y==0)for(;I<=p;)o(this,v,I),I+=this.blockSize;if(typeof v=="string"){for(;I<u;)if(m[y++]=v.charCodeAt(I++),y==this.blockSize){o(this,m),y=0;break}}else for(;I<u;)if(m[y++]=v[I++],y==this.blockSize){o(this,m),y=0;break}}this.h=y,this.o+=u},r.prototype.v=function(){var v=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);v[0]=128;for(var u=1;u<v.length-8;++u)v[u]=0;var p=8*this.o;for(u=v.length-8;u<v.length;++u)v[u]=p&255,p/=256;for(this.u(v),v=Array(16),u=p=0;4>u;++u)for(var m=0;32>m;m+=8)v[p++]=this.g[u]>>>m&255;return v};function c(v,u){var p=d;return Object.prototype.hasOwnProperty.call(p,v)?p[v]:p[v]=u(v)}function l(v,u){this.h=u;for(var p=[],m=!0,y=v.length-1;0<=y;y--){var I=v[y]|0;m&&I==u||(p[y]=I,m=!1)}this.g=p}var d={};function g(v){return-128<=v&&128>v?c(v,function(u){return new l([u|0],0>u?-1:0)}):new l([v|0],0>v?-1:0)}function T(v){if(isNaN(v)||!isFinite(v))return A;if(0>v)return M(T(-v));for(var u=[],p=1,m=0;v>=p;m++)u[m]=v/p|0,p*=4294967296;return new l(u,0)}function b(v,u){if(v.length==0)throw Error("number format error: empty string");if(u=u||10,2>u||36<u)throw Error("radix out of range: "+u);if(v.charAt(0)=="-")return M(b(v.substring(1),u));if(0<=v.indexOf("-"))throw Error('number format error: interior "-" character');for(var p=T(Math.pow(u,8)),m=A,y=0;y<v.length;y+=8){var I=Math.min(8,v.length-y),f=parseInt(v.substring(y,y+I),u);8>I?(I=T(Math.pow(u,I)),m=m.j(I).add(T(f))):(m=m.j(p),m=m.add(T(f)))}return m}var A=g(0),C=g(1),D=g(16777216);t=l.prototype,t.m=function(){if(x(this))return-M(this).m();for(var v=0,u=1,p=0;p<this.g.length;p++){var m=this.i(p);v+=(0<=m?m:4294967296+m)*u,u*=4294967296}return v},t.toString=function(v){if(v=v||10,2>v||36<v)throw Error("radix out of range: "+v);if(k(this))return"0";if(x(this))return"-"+M(this).toString(v);for(var u=T(Math.pow(v,6)),p=this,m="";;){var y=ie(p,u).g;p=he(p,y.j(u));var I=((0<p.g.length?p.g[0]:p.h)>>>0).toString(v);if(p=y,k(p))return I+m;for(;6>I.length;)I="0"+I;m=I+m}},t.i=function(v){return 0>v?0:v<this.g.length?this.g[v]:this.h};function k(v){if(v.h!=0)return!1;for(var u=0;u<v.g.length;u++)if(v.g[u]!=0)return!1;return!0}function x(v){return v.h==-1}t.l=function(v){return v=he(this,v),x(v)?-1:k(v)?0:1};function M(v){for(var u=v.g.length,p=[],m=0;m<u;m++)p[m]=~v.g[m];return new l(p,~v.h).add(C)}t.abs=function(){return x(this)?M(this):this},t.add=function(v){for(var u=Math.max(this.g.length,v.g.length),p=[],m=0,y=0;y<=u;y++){var I=m+(this.i(y)&65535)+(v.i(y)&65535),f=(I>>>16)+(this.i(y)>>>16)+(v.i(y)>>>16);m=f>>>16,I&=65535,f&=65535,p[y]=f<<16|I}return new l(p,p[p.length-1]&-2147483648?-1:0)};function he(v,u){return v.add(M(u))}t.j=function(v){if(k(this)||k(v))return A;if(x(this))return x(v)?M(this).j(M(v)):M(M(this).j(v));if(x(v))return M(this.j(M(v)));if(0>this.l(D)&&0>v.l(D))return T(this.m()*v.m());for(var u=this.g.length+v.g.length,p=[],m=0;m<2*u;m++)p[m]=0;for(m=0;m<this.g.length;m++)for(var y=0;y<v.g.length;y++){var I=this.i(m)>>>16,f=this.i(m)&65535,ue=v.i(y)>>>16,lt=v.i(y)&65535;p[2*m+2*y]+=f*lt,Q(p,2*m+2*y),p[2*m+2*y+1]+=I*lt,Q(p,2*m+2*y+1),p[2*m+2*y+1]+=f*ue,Q(p,2*m+2*y+1),p[2*m+2*y+2]+=I*ue,Q(p,2*m+2*y+2)}for(m=0;m<u;m++)p[m]=p[2*m+1]<<16|p[2*m];for(m=u;m<2*u;m++)p[m]=0;return new l(p,0)};function Q(v,u){for(;(v[u]&65535)!=v[u];)v[u+1]+=v[u]>>>16,v[u]&=65535,u++}function j(v,u){this.g=v,this.h=u}function ie(v,u){if(k(u))throw Error("division by zero");if(k(v))return new j(A,A);if(x(v))return u=ie(M(v),u),new j(M(u.g),M(u.h));if(x(u))return u=ie(v,M(u)),new j(M(u.g),u.h);if(30<v.g.length){if(x(v)||x(u))throw Error("slowDivide_ only works with positive integers.");for(var p=C,m=u;0>=m.l(v);)p=Ne(p),m=Ne(m);var y=X(p,1),I=X(m,1);for(m=X(m,2),p=X(p,2);!k(m);){var f=I.add(m);0>=f.l(v)&&(y=y.add(p),I=f),m=X(m,1),p=X(p,1)}return u=he(v,y.j(u)),new j(y,u)}for(y=A;0<=v.l(u);){for(p=Math.max(1,Math.floor(v.m()/u.m())),m=Math.ceil(Math.log(p)/Math.LN2),m=48>=m?1:Math.pow(2,m-48),I=T(p),f=I.j(u);x(f)||0<f.l(v);)p-=m,I=T(p),f=I.j(u);k(I)&&(I=C),y=y.add(I),v=he(v,f)}return new j(y,v)}t.A=function(v){return ie(this,v).h},t.and=function(v){for(var u=Math.max(this.g.length,v.g.length),p=[],m=0;m<u;m++)p[m]=this.i(m)&v.i(m);return new l(p,this.h&v.h)},t.or=function(v){for(var u=Math.max(this.g.length,v.g.length),p=[],m=0;m<u;m++)p[m]=this.i(m)|v.i(m);return new l(p,this.h|v.h)},t.xor=function(v){for(var u=Math.max(this.g.length,v.g.length),p=[],m=0;m<u;m++)p[m]=this.i(m)^v.i(m);return new l(p,this.h^v.h)};function Ne(v){for(var u=v.g.length+1,p=[],m=0;m<u;m++)p[m]=v.i(m)<<1|v.i(m-1)>>>31;return new l(p,v.h)}function X(v,u){var p=u>>5;u%=32;for(var m=v.g.length-p,y=[],I=0;I<m;I++)y[I]=0<u?v.i(I+p)>>>u|v.i(I+p+1)<<32-u:v.i(I+p);return new l(y,v.h)}r.prototype.digest=r.prototype.v,r.prototype.reset=r.prototype.s,r.prototype.update=r.prototype.u,l.prototype.add=l.prototype.add,l.prototype.multiply=l.prototype.j,l.prototype.modulo=l.prototype.A,l.prototype.compare=l.prototype.l,l.prototype.toNumber=l.prototype.m,l.prototype.toString=l.prototype.toString,l.prototype.getBits=l.prototype.i,l.fromNumber=T,l.fromString=b,Uo=l}).apply(typeof bs<"u"?bs:typeof self<"u"?self:typeof window<"u"?window:{});var tn=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};(function(){var t,e=typeof Object.defineProperties=="function"?Object.defineProperty:function(n,s,a){return n==Array.prototype||n==Object.prototype||(n[s]=a.value),n};function i(n){n=[typeof globalThis=="object"&&globalThis,n,typeof window=="object"&&window,typeof self=="object"&&self,typeof tn=="object"&&tn];for(var s=0;s<n.length;++s){var a=n[s];if(a&&a.Math==Math)return a}throw Error("Cannot find global object")}var r=i(this);function o(n,s){if(s)e:{var a=r;n=n.split(".");for(var h=0;h<n.length-1;h++){var _=n[h];if(!(_ in a))break e;a=a[_]}n=n[n.length-1],h=a[n],s=s(h),s!=h&&s!=null&&e(a,n,{configurable:!0,writable:!0,value:s})}}function c(n,s){n instanceof String&&(n+="");var a=0,h=!1,_={next:function(){if(!h&&a<n.length){var w=a++;return{value:s(w,n[w]),done:!1}}return h=!0,{done:!0,value:void 0}}};return _[Symbol.iterator]=function(){return _},_}o("Array.prototype.values",function(n){return n||function(){return c(this,function(s,a){return a})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var l=l||{},d=this||self;function g(n){var s=typeof n;return s=s!="object"?s:n?Array.isArray(n)?"array":s:"null",s=="array"||s=="object"&&typeof n.length=="number"}function T(n){var s=typeof n;return s=="object"&&n!=null||s=="function"}function b(n,s,a){return n.call.apply(n.bind,arguments)}function A(n,s,a){if(!n)throw Error();if(2<arguments.length){var h=Array.prototype.slice.call(arguments,2);return function(){var _=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(_,h),n.apply(s,_)}}return function(){return n.apply(s,arguments)}}function C(n,s,a){return C=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?b:A,C.apply(null,arguments)}function D(n,s){var a=Array.prototype.slice.call(arguments,1);return function(){var h=a.slice();return h.push.apply(h,arguments),n.apply(this,h)}}function k(n,s){function a(){}a.prototype=s.prototype,n.aa=s.prototype,n.prototype=new a,n.prototype.constructor=n,n.Qb=function(h,_,w){for(var E=Array(arguments.length-2),N=2;N<arguments.length;N++)E[N-2]=arguments[N];return s.prototype[_].apply(h,E)}}function x(n){const s=n.length;if(0<s){const a=Array(s);for(let h=0;h<s;h++)a[h]=n[h];return a}return[]}function M(n,s){for(let a=1;a<arguments.length;a++){const h=arguments[a];if(g(h)){const _=n.length||0,w=h.length||0;n.length=_+w;for(let E=0;E<w;E++)n[_+E]=h[E]}else n.push(h)}}class he{constructor(s,a){this.i=s,this.j=a,this.h=0,this.g=null}get(){let s;return 0<this.h?(this.h--,s=this.g,this.g=s.next,s.next=null):s=this.i(),s}}function Q(n){return/^[\s\xa0]*$/.test(n)}function j(){var n=d.navigator;return n&&(n=n.userAgent)?n:""}function ie(n){return ie[" "](n),n}ie[" "]=function(){};var Ne=j().indexOf("Gecko")!=-1&&!(j().toLowerCase().indexOf("webkit")!=-1&&j().indexOf("Edge")==-1)&&!(j().indexOf("Trident")!=-1||j().indexOf("MSIE")!=-1)&&j().indexOf("Edge")==-1;function X(n,s,a){for(const h in n)s.call(a,n[h],h,n)}function v(n,s){for(const a in n)s.call(void 0,n[a],a,n)}function u(n){const s={};for(const a in n)s[a]=n[a];return s}const p="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function m(n,s){let a,h;for(let _=1;_<arguments.length;_++){h=arguments[_];for(a in h)n[a]=h[a];for(let w=0;w<p.length;w++)a=p[w],Object.prototype.hasOwnProperty.call(h,a)&&(n[a]=h[a])}}function y(n){var s=1;n=n.split(":");const a=[];for(;0<s&&n.length;)a.push(n.shift()),s--;return n.length&&a.push(n.join(":")),a}function I(n){d.setTimeout(()=>{throw n},0)}function f(){var n=Sn;let s=null;return n.g&&(s=n.g,n.g=n.g.next,n.g||(n.h=null),s.next=null),s}class ue{constructor(){this.h=this.g=null}add(s,a){const h=lt.get();h.set(s,a),this.h?this.h.next=h:this.g=h,this.h=h}}var lt=new he(()=>new la,n=>n.reset());class la{constructor(){this.next=this.g=this.h=null}set(s,a){this.h=s,this.g=a,this.next=null}reset(){this.next=this.g=this.h=null}}let ht,ut=!1,Sn=new ue,Ki=()=>{const n=d.Promise.resolve(void 0);ht=()=>{n.then(ha)}};var ha=()=>{for(var n;n=f();){try{n.h.call(n.g)}catch(a){I(a)}var s=lt;s.j(n),100>s.h&&(s.h++,n.next=s.g,s.g=n)}ut=!1};function Ie(){this.s=this.s,this.C=this.C}Ie.prototype.s=!1,Ie.prototype.ma=function(){this.s||(this.s=!0,this.N())},Ie.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function $(n,s){this.type=n,this.g=this.target=s,this.defaultPrevented=!1}$.prototype.h=function(){this.defaultPrevented=!0};var ua=function(){if(!d.addEventListener||!Object.defineProperty)return!1;var n=!1,s=Object.defineProperty({},"passive",{get:function(){n=!0}});try{const a=()=>{};d.addEventListener("test",a,s),d.removeEventListener("test",a,s)}catch{}return n}();function dt(n,s){if($.call(this,n?n.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,n){var a=this.type=n.type,h=n.changedTouches&&n.changedTouches.length?n.changedTouches[0]:null;if(this.target=n.target||n.srcElement,this.g=s,s=n.relatedTarget){if(Ne){e:{try{ie(s.nodeName);var _=!0;break e}catch{}_=!1}_||(s=null)}}else a=="mouseover"?s=n.fromElement:a=="mouseout"&&(s=n.toElement);this.relatedTarget=s,h?(this.clientX=h.clientX!==void 0?h.clientX:h.pageX,this.clientY=h.clientY!==void 0?h.clientY:h.pageY,this.screenX=h.screenX||0,this.screenY=h.screenY||0):(this.clientX=n.clientX!==void 0?n.clientX:n.pageX,this.clientY=n.clientY!==void 0?n.clientY:n.pageY,this.screenX=n.screenX||0,this.screenY=n.screenY||0),this.button=n.button,this.key=n.key||"",this.ctrlKey=n.ctrlKey,this.altKey=n.altKey,this.shiftKey=n.shiftKey,this.metaKey=n.metaKey,this.pointerId=n.pointerId||0,this.pointerType=typeof n.pointerType=="string"?n.pointerType:da[n.pointerType]||"",this.state=n.state,this.i=n,n.defaultPrevented&&dt.aa.h.call(this)}}k(dt,$);var da={2:"touch",3:"pen",4:"mouse"};dt.prototype.h=function(){dt.aa.h.call(this);var n=this.i;n.preventDefault?n.preventDefault():n.returnValue=!1};var Ft="closure_listenable_"+(1e6*Math.random()|0),fa=0;function pa(n,s,a,h,_){this.listener=n,this.proxy=null,this.src=s,this.type=a,this.capture=!!h,this.ha=_,this.key=++fa,this.da=this.fa=!1}function jt(n){n.da=!0,n.listener=null,n.proxy=null,n.src=null,n.ha=null}function $t(n){this.src=n,this.g={},this.h=0}$t.prototype.add=function(n,s,a,h,_){var w=n.toString();n=this.g[w],n||(n=this.g[w]=[],this.h++);var E=kn(n,s,h,_);return-1<E?(s=n[E],a||(s.fa=!1)):(s=new pa(s,this.src,w,!!h,_),s.fa=a,n.push(s)),s};function Cn(n,s){var a=s.type;if(a in n.g){var h=n.g[a],_=Array.prototype.indexOf.call(h,s,void 0),w;(w=0<=_)&&Array.prototype.splice.call(h,_,1),w&&(jt(s),n.g[a].length==0&&(delete n.g[a],n.h--))}}function kn(n,s,a,h){for(var _=0;_<n.length;++_){var w=n[_];if(!w.da&&w.listener==s&&w.capture==!!a&&w.ha==h)return _}return-1}var Rn="closure_lm_"+(1e6*Math.random()|0),Pn={};function Ji(n,s,a,h,_){if(Array.isArray(s)){for(var w=0;w<s.length;w++)Ji(n,s[w],a,h,_);return null}return a=Qi(a),n&&n[Ft]?n.K(s,a,T(h)?!!h.capture:!!h,_):ga(n,s,a,!1,h,_)}function ga(n,s,a,h,_,w){if(!s)throw Error("Invalid event type");var E=T(_)?!!_.capture:!!_,N=Dn(n);if(N||(n[Rn]=N=new $t(n)),a=N.add(s,a,h,E,w),a.proxy)return a;if(h=ma(),a.proxy=h,h.src=n,h.listener=a,n.addEventListener)ua||(_=E),_===void 0&&(_=!1),n.addEventListener(s.toString(),h,_);else if(n.attachEvent)n.attachEvent(Yi(s.toString()),h);else if(n.addListener&&n.removeListener)n.addListener(h);else throw Error("addEventListener and attachEvent are unavailable.");return a}function ma(){function n(a){return s.call(n.src,n.listener,a)}const s=ya;return n}function Xi(n,s,a,h,_){if(Array.isArray(s))for(var w=0;w<s.length;w++)Xi(n,s[w],a,h,_);else h=T(h)?!!h.capture:!!h,a=Qi(a),n&&n[Ft]?(n=n.i,s=String(s).toString(),s in n.g&&(w=n.g[s],a=kn(w,a,h,_),-1<a&&(jt(w[a]),Array.prototype.splice.call(w,a,1),w.length==0&&(delete n.g[s],n.h--)))):n&&(n=Dn(n))&&(s=n.g[s.toString()],n=-1,s&&(n=kn(s,a,h,_)),(a=-1<n?s[n]:null)&&On(a))}function On(n){if(typeof n!="number"&&n&&!n.da){var s=n.src;if(s&&s[Ft])Cn(s.i,n);else{var a=n.type,h=n.proxy;s.removeEventListener?s.removeEventListener(a,h,n.capture):s.detachEvent?s.detachEvent(Yi(a),h):s.addListener&&s.removeListener&&s.removeListener(h),(a=Dn(s))?(Cn(a,n),a.h==0&&(a.src=null,s[Rn]=null)):jt(n)}}}function Yi(n){return n in Pn?Pn[n]:Pn[n]="on"+n}function ya(n,s){if(n.da)n=!0;else{s=new dt(s,this);var a=n.listener,h=n.ha||n.src;n.fa&&On(n),n=a.call(h,s)}return n}function Dn(n){return n=n[Rn],n instanceof $t?n:null}var Nn="__closure_events_fn_"+(1e9*Math.random()>>>0);function Qi(n){return typeof n=="function"?n:(n[Nn]||(n[Nn]=function(s){return n.handleEvent(s)}),n[Nn])}function B(){Ie.call(this),this.i=new $t(this),this.M=this,this.F=null}k(B,Ie),B.prototype[Ft]=!0,B.prototype.removeEventListener=function(n,s,a,h){Xi(this,n,s,a,h)};function q(n,s){var a,h=n.F;if(h)for(a=[];h;h=h.F)a.push(h);if(n=n.M,h=s.type||s,typeof s=="string")s=new $(s,n);else if(s instanceof $)s.target=s.target||n;else{var _=s;s=new $(h,n),m(s,_)}if(_=!0,a)for(var w=a.length-1;0<=w;w--){var E=s.g=a[w];_=Bt(E,h,!0,s)&&_}if(E=s.g=n,_=Bt(E,h,!0,s)&&_,_=Bt(E,h,!1,s)&&_,a)for(w=0;w<a.length;w++)E=s.g=a[w],_=Bt(E,h,!1,s)&&_}B.prototype.N=function(){if(B.aa.N.call(this),this.i){var n=this.i,s;for(s in n.g){for(var a=n.g[s],h=0;h<a.length;h++)jt(a[h]);delete n.g[s],n.h--}}this.F=null},B.prototype.K=function(n,s,a,h){return this.i.add(String(n),s,!1,a,h)},B.prototype.L=function(n,s,a,h){return this.i.add(String(n),s,!0,a,h)};function Bt(n,s,a,h){if(s=n.i.g[String(s)],!s)return!0;s=s.concat();for(var _=!0,w=0;w<s.length;++w){var E=s[w];if(E&&!E.da&&E.capture==a){var N=E.listener,F=E.ha||E.src;E.fa&&Cn(n.i,E),_=N.call(F,h)!==!1&&_}}return _&&!h.defaultPrevented}function Zi(n,s,a){if(typeof n=="function")a&&(n=C(n,a));else if(n&&typeof n.handleEvent=="function")n=C(n.handleEvent,n);else throw Error("Invalid listener argument");return 2147483647<Number(s)?-1:d.setTimeout(n,s||0)}function er(n){n.g=Zi(()=>{n.g=null,n.i&&(n.i=!1,er(n))},n.l);const s=n.h;n.h=null,n.m.apply(null,s)}class va extends Ie{constructor(s,a){super(),this.m=s,this.l=a,this.h=null,this.i=!1,this.g=null}j(s){this.h=arguments,this.g?this.i=!0:er(this)}N(){super.N(),this.g&&(d.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function ft(n){Ie.call(this),this.h=n,this.g={}}k(ft,Ie);var tr=[];function nr(n){X(n.g,function(s,a){this.g.hasOwnProperty(a)&&On(s)},n),n.g={}}ft.prototype.N=function(){ft.aa.N.call(this),nr(this)},ft.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Ln=d.JSON.stringify,_a=d.JSON.parse,Ia=class{stringify(n){return d.JSON.stringify(n,void 0)}parse(n){return d.JSON.parse(n,void 0)}};function Mn(){}Mn.prototype.h=null;function ir(n){return n.h||(n.h=n.i())}function wa(){}var pt={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function Un(){$.call(this,"d")}k(Un,$);function xn(){$.call(this,"c")}k(xn,$);var Ge={},rr=null;function Fn(){return rr=rr||new B}Ge.La="serverreachability";function sr(n){$.call(this,Ge.La,n)}k(sr,$);function gt(n){const s=Fn();q(s,new sr(s))}Ge.STAT_EVENT="statevent";function or(n,s){$.call(this,Ge.STAT_EVENT,n),this.stat=s}k(or,$);function K(n){const s=Fn();q(s,new or(s,n))}Ge.Ma="timingevent";function ar(n,s){$.call(this,Ge.Ma,n),this.size=s}k(ar,$);function mt(n,s){if(typeof n!="function")throw Error("Fn must not be null and must be a function");return d.setTimeout(function(){n()},s)}function yt(){this.g=!0}yt.prototype.xa=function(){this.g=!1};function Ta(n,s,a,h,_,w){n.info(function(){if(n.g)if(w)for(var E="",N=w.split("&"),F=0;F<N.length;F++){var P=N[F].split("=");if(1<P.length){var V=P[0];P=P[1];var H=V.split("_");E=2<=H.length&&H[1]=="type"?E+(V+"="+P+"&"):E+(V+"=redacted&")}}else E=null;else E=w;return"XMLHTTP REQ ("+h+") [attempt "+_+"]: "+s+`
`+a+`
`+E})}function Ea(n,s,a,h,_,w,E){n.info(function(){return"XMLHTTP RESP ("+h+") [ attempt "+_+"]: "+s+`
`+a+`
`+w+" "+E})}function We(n,s,a,h){n.info(function(){return"XMLHTTP TEXT ("+s+"): "+Aa(n,a)+(h?" "+h:"")})}function ba(n,s){n.info(function(){return"TIMEOUT: "+s})}yt.prototype.info=function(){};function Aa(n,s){if(!n.g)return s;if(!s)return null;try{var a=JSON.parse(s);if(a){for(n=0;n<a.length;n++)if(Array.isArray(a[n])){var h=a[n];if(!(2>h.length)){var _=h[1];if(Array.isArray(_)&&!(1>_.length)){var w=_[0];if(w!="noop"&&w!="stop"&&w!="close")for(var E=1;E<_.length;E++)_[E]=""}}}}return Ln(a)}catch{return s}}var jn={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},Sa={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},$n;function Vt(){}k(Vt,Mn),Vt.prototype.g=function(){return new XMLHttpRequest},Vt.prototype.i=function(){return{}},$n=new Vt;function we(n,s,a,h){this.j=n,this.i=s,this.l=a,this.R=h||1,this.U=new ft(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new cr}function cr(){this.i=null,this.g="",this.h=!1}var lr={},Bn={};function Vn(n,s,a){n.L=1,n.v=Wt(de(s)),n.m=a,n.P=!0,hr(n,null)}function hr(n,s){n.F=Date.now(),Ht(n),n.A=de(n.v);var a=n.A,h=n.R;Array.isArray(h)||(h=[String(h)]),br(a.i,"t",h),n.C=0,a=n.j.J,n.h=new cr,n.g=Vr(n.j,a?s:null,!n.m),0<n.O&&(n.M=new va(C(n.Y,n,n.g),n.O)),s=n.U,a=n.g,h=n.ca;var _="readystatechange";Array.isArray(_)||(_&&(tr[0]=_.toString()),_=tr);for(var w=0;w<_.length;w++){var E=Ji(a,_[w],h||s.handleEvent,!1,s.h||s);if(!E)break;s.g[E.key]=E}s=n.H?u(n.H):{},n.m?(n.u||(n.u="POST"),s["Content-Type"]="application/x-www-form-urlencoded",n.g.ea(n.A,n.u,n.m,s)):(n.u="GET",n.g.ea(n.A,n.u,null,s)),gt(),Ta(n.i,n.u,n.A,n.l,n.R,n.m)}we.prototype.ca=function(n){n=n.target;const s=this.M;s&&fe(n)==3?s.j():this.Y(n)},we.prototype.Y=function(n){try{if(n==this.g)e:{const H=fe(this.g);var s=this.g.Ba();const Je=this.g.Z();if(!(3>H)&&(H!=3||this.g&&(this.h.h||this.g.oa()||Or(this.g)))){this.J||H!=4||s==7||(s==8||0>=Je?gt(3):gt(2)),Hn(this);var a=this.g.Z();this.X=a;t:if(ur(this)){var h=Or(this.g);n="";var _=h.length,w=fe(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){Le(this),vt(this);var E="";break t}this.h.i=new d.TextDecoder}for(s=0;s<_;s++)this.h.h=!0,n+=this.h.i.decode(h[s],{stream:!(w&&s==_-1)});h.length=0,this.h.g+=n,this.C=0,E=this.h.g}else E=this.g.oa();if(this.o=a==200,Ea(this.i,this.u,this.A,this.l,this.R,H,a),this.o){if(this.T&&!this.K){t:{if(this.g){var N,F=this.g;if((N=F.g?F.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!Q(N)){var P=N;break t}}P=null}if(a=P)We(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,zn(this,a);else{this.o=!1,this.s=3,K(12),Le(this),vt(this);break e}}if(this.P){a=!0;let re;for(;!this.J&&this.C<E.length;)if(re=Ca(this,E),re==Bn){H==4&&(this.s=4,K(14),a=!1),We(this.i,this.l,null,"[Incomplete Response]");break}else if(re==lr){this.s=4,K(15),We(this.i,this.l,E,"[Invalid Chunk]"),a=!1;break}else We(this.i,this.l,re,null),zn(this,re);if(ur(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),H!=4||E.length!=0||this.h.h||(this.s=1,K(16),a=!1),this.o=this.o&&a,!a)We(this.i,this.l,E,"[Invalid Chunked Response]"),Le(this),vt(this);else if(0<E.length&&!this.W){this.W=!0;var V=this.j;V.g==this&&V.ba&&!V.M&&(V.j.info("Great, no buffering proxy detected. Bytes received: "+E.length),Xn(V),V.M=!0,K(11))}}else We(this.i,this.l,E,null),zn(this,E);H==4&&Le(this),this.o&&!this.J&&(H==4?Fr(this.j,this):(this.o=!1,Ht(this)))}else za(this.g),a==400&&0<E.indexOf("Unknown SID")?(this.s=3,K(12)):(this.s=0,K(13)),Le(this),vt(this)}}}catch{}finally{}};function ur(n){return n.g?n.u=="GET"&&n.L!=2&&n.j.Ca:!1}function Ca(n,s){var a=n.C,h=s.indexOf(`
`,a);return h==-1?Bn:(a=Number(s.substring(a,h)),isNaN(a)?lr:(h+=1,h+a>s.length?Bn:(s=s.slice(h,h+a),n.C=h+a,s)))}we.prototype.cancel=function(){this.J=!0,Le(this)};function Ht(n){n.S=Date.now()+n.I,dr(n,n.I)}function dr(n,s){if(n.B!=null)throw Error("WatchDog timer not null");n.B=mt(C(n.ba,n),s)}function Hn(n){n.B&&(d.clearTimeout(n.B),n.B=null)}we.prototype.ba=function(){this.B=null;const n=Date.now();0<=n-this.S?(ba(this.i,this.A),this.L!=2&&(gt(),K(17)),Le(this),this.s=2,vt(this)):dr(this,this.S-n)};function vt(n){n.j.G==0||n.J||Fr(n.j,n)}function Le(n){Hn(n);var s=n.M;s&&typeof s.ma=="function"&&s.ma(),n.M=null,nr(n.U),n.g&&(s=n.g,n.g=null,s.abort(),s.ma())}function zn(n,s){try{var a=n.j;if(a.G!=0&&(a.g==n||Gn(a.h,n))){if(!n.K&&Gn(a.h,n)&&a.G==3){try{var h=a.Da.g.parse(s)}catch{h=null}if(Array.isArray(h)&&h.length==3){var _=h;if(_[0]==0){e:if(!a.u){if(a.g)if(a.g.F+3e3<n.F)Qt(a),Xt(a);else break e;Jn(a),K(18)}}else a.za=_[1],0<a.za-a.T&&37500>_[2]&&a.F&&a.v==0&&!a.C&&(a.C=mt(C(a.Za,a),6e3));if(1>=gr(a.h)&&a.ca){try{a.ca()}catch{}a.ca=void 0}}else Ue(a,11)}else if((n.K||a.g==n)&&Qt(a),!Q(s))for(_=a.Da.g.parse(s),s=0;s<_.length;s++){let P=_[s];if(a.T=P[0],P=P[1],a.G==2)if(P[0]=="c"){a.K=P[1],a.ia=P[2];const V=P[3];V!=null&&(a.la=V,a.j.info("VER="+a.la));const H=P[4];H!=null&&(a.Aa=H,a.j.info("SVER="+a.Aa));const Je=P[5];Je!=null&&typeof Je=="number"&&0<Je&&(h=1.5*Je,a.L=h,a.j.info("backChannelRequestTimeoutMs_="+h)),h=a;const re=n.g;if(re){const Zt=re.g?re.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Zt){var w=h.h;w.g||Zt.indexOf("spdy")==-1&&Zt.indexOf("quic")==-1&&Zt.indexOf("h2")==-1||(w.j=w.l,w.g=new Set,w.h&&(Wn(w,w.h),w.h=null))}if(h.D){const Yn=re.g?re.g.getResponseHeader("X-HTTP-Session-Id"):null;Yn&&(h.ya=Yn,L(h.I,h.D,Yn))}}a.G=3,a.l&&a.l.ua(),a.ba&&(a.R=Date.now()-n.F,a.j.info("Handshake RTT: "+a.R+"ms")),h=a;var E=n;if(h.qa=Br(h,h.J?h.ia:null,h.W),E.K){mr(h.h,E);var N=E,F=h.L;F&&(N.I=F),N.B&&(Hn(N),Ht(N)),h.g=E}else Ur(h);0<a.i.length&&Yt(a)}else P[0]!="stop"&&P[0]!="close"||Ue(a,7);else a.G==3&&(P[0]=="stop"||P[0]=="close"?P[0]=="stop"?Ue(a,7):Kn(a):P[0]!="noop"&&a.l&&a.l.ta(P),a.v=0)}}gt(4)}catch{}}var ka=class{constructor(n,s){this.g=n,this.map=s}};function fr(n){this.l=n||10,d.PerformanceNavigationTiming?(n=d.performance.getEntriesByType("navigation"),n=0<n.length&&(n[0].nextHopProtocol=="hq"||n[0].nextHopProtocol=="h2")):n=!!(d.chrome&&d.chrome.loadTimes&&d.chrome.loadTimes()&&d.chrome.loadTimes().wasFetchedViaSpdy),this.j=n?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function pr(n){return n.h?!0:n.g?n.g.size>=n.j:!1}function gr(n){return n.h?1:n.g?n.g.size:0}function Gn(n,s){return n.h?n.h==s:n.g?n.g.has(s):!1}function Wn(n,s){n.g?n.g.add(s):n.h=s}function mr(n,s){n.h&&n.h==s?n.h=null:n.g&&n.g.has(s)&&n.g.delete(s)}fr.prototype.cancel=function(){if(this.i=yr(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const n of this.g.values())n.cancel();this.g.clear()}};function yr(n){if(n.h!=null)return n.i.concat(n.h.D);if(n.g!=null&&n.g.size!==0){let s=n.i;for(const a of n.g.values())s=s.concat(a.D);return s}return x(n.i)}function Ra(n){if(n.V&&typeof n.V=="function")return n.V();if(typeof Map<"u"&&n instanceof Map||typeof Set<"u"&&n instanceof Set)return Array.from(n.values());if(typeof n=="string")return n.split("");if(g(n)){for(var s=[],a=n.length,h=0;h<a;h++)s.push(n[h]);return s}s=[],a=0;for(h in n)s[a++]=n[h];return s}function Pa(n){if(n.na&&typeof n.na=="function")return n.na();if(!n.V||typeof n.V!="function"){if(typeof Map<"u"&&n instanceof Map)return Array.from(n.keys());if(!(typeof Set<"u"&&n instanceof Set)){if(g(n)||typeof n=="string"){var s=[];n=n.length;for(var a=0;a<n;a++)s.push(a);return s}s=[],a=0;for(const h in n)s[a++]=h;return s}}}function vr(n,s){if(n.forEach&&typeof n.forEach=="function")n.forEach(s,void 0);else if(g(n)||typeof n=="string")Array.prototype.forEach.call(n,s,void 0);else for(var a=Pa(n),h=Ra(n),_=h.length,w=0;w<_;w++)s.call(void 0,h[w],a&&a[w],n)}var _r=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Oa(n,s){if(n){n=n.split("&");for(var a=0;a<n.length;a++){var h=n[a].indexOf("="),_=null;if(0<=h){var w=n[a].substring(0,h);_=n[a].substring(h+1)}else w=n[a];s(w,_?decodeURIComponent(_.replace(/\+/g," ")):"")}}}function Me(n){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,n instanceof Me){this.h=n.h,zt(this,n.j),this.o=n.o,this.g=n.g,Gt(this,n.s),this.l=n.l;var s=n.i,a=new wt;a.i=s.i,s.g&&(a.g=new Map(s.g),a.h=s.h),Ir(this,a),this.m=n.m}else n&&(s=String(n).match(_r))?(this.h=!1,zt(this,s[1]||"",!0),this.o=_t(s[2]||""),this.g=_t(s[3]||"",!0),Gt(this,s[4]),this.l=_t(s[5]||"",!0),Ir(this,s[6]||"",!0),this.m=_t(s[7]||"")):(this.h=!1,this.i=new wt(null,this.h))}Me.prototype.toString=function(){var n=[],s=this.j;s&&n.push(It(s,wr,!0),":");var a=this.g;return(a||s=="file")&&(n.push("//"),(s=this.o)&&n.push(It(s,wr,!0),"@"),n.push(encodeURIComponent(String(a)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a=this.s,a!=null&&n.push(":",String(a))),(a=this.l)&&(this.g&&a.charAt(0)!="/"&&n.push("/"),n.push(It(a,a.charAt(0)=="/"?La:Na,!0))),(a=this.i.toString())&&n.push("?",a),(a=this.m)&&n.push("#",It(a,Ua)),n.join("")};function de(n){return new Me(n)}function zt(n,s,a){n.j=a?_t(s,!0):s,n.j&&(n.j=n.j.replace(/:$/,""))}function Gt(n,s){if(s){if(s=Number(s),isNaN(s)||0>s)throw Error("Bad port number "+s);n.s=s}else n.s=null}function Ir(n,s,a){s instanceof wt?(n.i=s,xa(n.i,n.h)):(a||(s=It(s,Ma)),n.i=new wt(s,n.h))}function L(n,s,a){n.i.set(s,a)}function Wt(n){return L(n,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),n}function _t(n,s){return n?s?decodeURI(n.replace(/%25/g,"%2525")):decodeURIComponent(n):""}function It(n,s,a){return typeof n=="string"?(n=encodeURI(n).replace(s,Da),a&&(n=n.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),n):null}function Da(n){return n=n.charCodeAt(0),"%"+(n>>4&15).toString(16)+(n&15).toString(16)}var wr=/[#\/\?@]/g,Na=/[#\?:]/g,La=/[#\?]/g,Ma=/[#\?@]/g,Ua=/#/g;function wt(n,s){this.h=this.g=null,this.i=n||null,this.j=!!s}function Te(n){n.g||(n.g=new Map,n.h=0,n.i&&Oa(n.i,function(s,a){n.add(decodeURIComponent(s.replace(/\+/g," ")),a)}))}t=wt.prototype,t.add=function(n,s){Te(this),this.i=null,n=qe(this,n);var a=this.g.get(n);return a||this.g.set(n,a=[]),a.push(s),this.h+=1,this};function Tr(n,s){Te(n),s=qe(n,s),n.g.has(s)&&(n.i=null,n.h-=n.g.get(s).length,n.g.delete(s))}function Er(n,s){return Te(n),s=qe(n,s),n.g.has(s)}t.forEach=function(n,s){Te(this),this.g.forEach(function(a,h){a.forEach(function(_){n.call(s,_,h,this)},this)},this)},t.na=function(){Te(this);const n=Array.from(this.g.values()),s=Array.from(this.g.keys()),a=[];for(let h=0;h<s.length;h++){const _=n[h];for(let w=0;w<_.length;w++)a.push(s[h])}return a},t.V=function(n){Te(this);let s=[];if(typeof n=="string")Er(this,n)&&(s=s.concat(this.g.get(qe(this,n))));else{n=Array.from(this.g.values());for(let a=0;a<n.length;a++)s=s.concat(n[a])}return s},t.set=function(n,s){return Te(this),this.i=null,n=qe(this,n),Er(this,n)&&(this.h-=this.g.get(n).length),this.g.set(n,[s]),this.h+=1,this},t.get=function(n,s){return n?(n=this.V(n),0<n.length?String(n[0]):s):s};function br(n,s,a){Tr(n,s),0<a.length&&(n.i=null,n.g.set(qe(n,s),x(a)),n.h+=a.length)}t.toString=function(){if(this.i)return this.i;if(!this.g)return"";const n=[],s=Array.from(this.g.keys());for(var a=0;a<s.length;a++){var h=s[a];const w=encodeURIComponent(String(h)),E=this.V(h);for(h=0;h<E.length;h++){var _=w;E[h]!==""&&(_+="="+encodeURIComponent(String(E[h]))),n.push(_)}}return this.i=n.join("&")};function qe(n,s){return s=String(s),n.j&&(s=s.toLowerCase()),s}function xa(n,s){s&&!n.j&&(Te(n),n.i=null,n.g.forEach(function(a,h){var _=h.toLowerCase();h!=_&&(Tr(this,h),br(this,_,a))},n)),n.j=s}function Fa(n,s){const a=new yt;if(d.Image){const h=new Image;h.onload=D(Ee,a,"TestLoadImage: loaded",!0,s,h),h.onerror=D(Ee,a,"TestLoadImage: error",!1,s,h),h.onabort=D(Ee,a,"TestLoadImage: abort",!1,s,h),h.ontimeout=D(Ee,a,"TestLoadImage: timeout",!1,s,h),d.setTimeout(function(){h.ontimeout&&h.ontimeout()},1e4),h.src=n}else s(!1)}function ja(n,s){const a=new yt,h=new AbortController,_=setTimeout(()=>{h.abort(),Ee(a,"TestPingServer: timeout",!1,s)},1e4);fetch(n,{signal:h.signal}).then(w=>{clearTimeout(_),w.ok?Ee(a,"TestPingServer: ok",!0,s):Ee(a,"TestPingServer: server error",!1,s)}).catch(()=>{clearTimeout(_),Ee(a,"TestPingServer: error",!1,s)})}function Ee(n,s,a,h,_){try{_&&(_.onload=null,_.onerror=null,_.onabort=null,_.ontimeout=null),h(a)}catch{}}function $a(){this.g=new Ia}function Ba(n,s,a){const h=a||"";try{vr(n,function(_,w){let E=_;T(_)&&(E=Ln(_)),s.push(h+w+"="+encodeURIComponent(E))})}catch(_){throw s.push(h+"type="+encodeURIComponent("_badmap")),_}}function qt(n){this.l=n.Ub||null,this.j=n.eb||!1}k(qt,Mn),qt.prototype.g=function(){return new Kt(this.l,this.j)},qt.prototype.i=function(n){return function(){return n}}({});function Kt(n,s){B.call(this),this.D=n,this.o=s,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}k(Kt,B),t=Kt.prototype,t.open=function(n,s){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=n,this.A=s,this.readyState=1,Et(this)},t.send=function(n){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const s={headers:this.u,method:this.B,credentials:this.m,cache:void 0};n&&(s.body=n),(this.D||d).fetch(new Request(this.A,s)).then(this.Sa.bind(this),this.ga.bind(this))},t.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,Tt(this)),this.readyState=0},t.Sa=function(n){if(this.g&&(this.l=n,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=n.headers,this.readyState=2,Et(this)),this.g&&(this.readyState=3,Et(this),this.g)))if(this.responseType==="arraybuffer")n.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof d.ReadableStream<"u"&&"body"in n){if(this.j=n.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;Ar(this)}else n.text().then(this.Ra.bind(this),this.ga.bind(this))};function Ar(n){n.j.read().then(n.Pa.bind(n)).catch(n.ga.bind(n))}t.Pa=function(n){if(this.g){if(this.o&&n.value)this.response.push(n.value);else if(!this.o){var s=n.value?n.value:new Uint8Array(0);(s=this.v.decode(s,{stream:!n.done}))&&(this.response=this.responseText+=s)}n.done?Tt(this):Et(this),this.readyState==3&&Ar(this)}},t.Ra=function(n){this.g&&(this.response=this.responseText=n,Tt(this))},t.Qa=function(n){this.g&&(this.response=n,Tt(this))},t.ga=function(){this.g&&Tt(this)};function Tt(n){n.readyState=4,n.l=null,n.j=null,n.v=null,Et(n)}t.setRequestHeader=function(n,s){this.u.append(n,s)},t.getResponseHeader=function(n){return this.h&&this.h.get(n.toLowerCase())||""},t.getAllResponseHeaders=function(){if(!this.h)return"";const n=[],s=this.h.entries();for(var a=s.next();!a.done;)a=a.value,n.push(a[0]+": "+a[1]),a=s.next();return n.join(`\r
`)};function Et(n){n.onreadystatechange&&n.onreadystatechange.call(n)}Object.defineProperty(Kt.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(n){this.m=n?"include":"same-origin"}});function Sr(n){let s="";return X(n,function(a,h){s+=h,s+=":",s+=a,s+=`\r
`}),s}function qn(n,s,a){e:{for(h in a){var h=!1;break e}h=!0}h||(a=Sr(a),typeof n=="string"?a!=null&&encodeURIComponent(String(a)):L(n,s,a))}function U(n){B.call(this),this.headers=new Map,this.o=n||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}k(U,B);var Va=/^https?$/i,Ha=["POST","PUT"];t=U.prototype,t.Ha=function(n){this.J=n},t.ea=function(n,s,a,h){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+n);s=s?s.toUpperCase():"GET",this.D=n,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():$n.g(),this.v=this.o?ir(this.o):ir($n),this.g.onreadystatechange=C(this.Ea,this);try{this.B=!0,this.g.open(s,String(n),!0),this.B=!1}catch(w){Cr(this,w);return}if(n=a||"",a=new Map(this.headers),h)if(Object.getPrototypeOf(h)===Object.prototype)for(var _ in h)a.set(_,h[_]);else if(typeof h.keys=="function"&&typeof h.get=="function")for(const w of h.keys())a.set(w,h.get(w));else throw Error("Unknown input type for opt_headers: "+String(h));h=Array.from(a.keys()).find(w=>w.toLowerCase()=="content-type"),_=d.FormData&&n instanceof d.FormData,!(0<=Array.prototype.indexOf.call(Ha,s,void 0))||h||_||a.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[w,E]of a)this.g.setRequestHeader(w,E);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{Pr(this),this.u=!0,this.g.send(n),this.u=!1}catch(w){Cr(this,w)}};function Cr(n,s){n.h=!1,n.g&&(n.j=!0,n.g.abort(),n.j=!1),n.l=s,n.m=5,kr(n),Jt(n)}function kr(n){n.A||(n.A=!0,q(n,"complete"),q(n,"error"))}t.abort=function(n){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=n||7,q(this,"complete"),q(this,"abort"),Jt(this))},t.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Jt(this,!0)),U.aa.N.call(this)},t.Ea=function(){this.s||(this.B||this.u||this.j?Rr(this):this.bb())},t.bb=function(){Rr(this)};function Rr(n){if(n.h&&typeof l<"u"&&(!n.v[1]||fe(n)!=4||n.Z()!=2)){if(n.u&&fe(n)==4)Zi(n.Ea,0,n);else if(q(n,"readystatechange"),fe(n)==4){n.h=!1;try{const E=n.Z();e:switch(E){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var s=!0;break e;default:s=!1}var a;if(!(a=s)){var h;if(h=E===0){var _=String(n.D).match(_r)[1]||null;!_&&d.self&&d.self.location&&(_=d.self.location.protocol.slice(0,-1)),h=!Va.test(_?_.toLowerCase():"")}a=h}if(a)q(n,"complete"),q(n,"success");else{n.m=6;try{var w=2<fe(n)?n.g.statusText:""}catch{w=""}n.l=w+" ["+n.Z()+"]",kr(n)}}finally{Jt(n)}}}}function Jt(n,s){if(n.g){Pr(n);const a=n.g,h=n.v[0]?()=>{}:null;n.g=null,n.v=null,s||q(n,"ready");try{a.onreadystatechange=h}catch{}}}function Pr(n){n.I&&(d.clearTimeout(n.I),n.I=null)}t.isActive=function(){return!!this.g};function fe(n){return n.g?n.g.readyState:0}t.Z=function(){try{return 2<fe(this)?this.g.status:-1}catch{return-1}},t.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},t.Oa=function(n){if(this.g){var s=this.g.responseText;return n&&s.indexOf(n)==0&&(s=s.substring(n.length)),_a(s)}};function Or(n){try{if(!n.g)return null;if("response"in n.g)return n.g.response;switch(n.H){case"":case"text":return n.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in n.g)return n.g.mozResponseArrayBuffer}return null}catch{return null}}function za(n){const s={};n=(n.g&&2<=fe(n)&&n.g.getAllResponseHeaders()||"").split(`\r
`);for(let h=0;h<n.length;h++){if(Q(n[h]))continue;var a=y(n[h]);const _=a[0];if(a=a[1],typeof a!="string")continue;a=a.trim();const w=s[_]||[];s[_]=w,w.push(a)}v(s,function(h){return h.join(", ")})}t.Ba=function(){return this.m},t.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function bt(n,s,a){return a&&a.internalChannelParams&&a.internalChannelParams[n]||s}function Dr(n){this.Aa=0,this.i=[],this.j=new yt,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=bt("failFast",!1,n),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=bt("baseRetryDelayMs",5e3,n),this.cb=bt("retryDelaySeedMs",1e4,n),this.Wa=bt("forwardChannelMaxRetries",2,n),this.wa=bt("forwardChannelRequestTimeoutMs",2e4,n),this.pa=n&&n.xmlHttpFactory||void 0,this.Xa=n&&n.Tb||void 0,this.Ca=n&&n.useFetchStreams||!1,this.L=void 0,this.J=n&&n.supportsCrossDomainXhr||!1,this.K="",this.h=new fr(n&&n.concurrentRequestLimit),this.Da=new $a,this.P=n&&n.fastHandshake||!1,this.O=n&&n.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=n&&n.Rb||!1,n&&n.xa&&this.j.xa(),n&&n.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&n&&n.detectBufferingProxy||!1,this.ja=void 0,n&&n.longPollingTimeout&&0<n.longPollingTimeout&&(this.ja=n.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}t=Dr.prototype,t.la=8,t.G=1,t.connect=function(n,s,a,h){K(0),this.W=n,this.H=s||{},a&&h!==void 0&&(this.H.OSID=a,this.H.OAID=h),this.F=this.X,this.I=Br(this,null,this.W),Yt(this)};function Kn(n){if(Nr(n),n.G==3){var s=n.U++,a=de(n.I);if(L(a,"SID",n.K),L(a,"RID",s),L(a,"TYPE","terminate"),At(n,a),s=new we(n,n.j,s),s.L=2,s.v=Wt(de(a)),a=!1,d.navigator&&d.navigator.sendBeacon)try{a=d.navigator.sendBeacon(s.v.toString(),"")}catch{}!a&&d.Image&&(new Image().src=s.v,a=!0),a||(s.g=Vr(s.j,null),s.g.ea(s.v)),s.F=Date.now(),Ht(s)}$r(n)}function Xt(n){n.g&&(Xn(n),n.g.cancel(),n.g=null)}function Nr(n){Xt(n),n.u&&(d.clearTimeout(n.u),n.u=null),Qt(n),n.h.cancel(),n.s&&(typeof n.s=="number"&&d.clearTimeout(n.s),n.s=null)}function Yt(n){if(!pr(n.h)&&!n.s){n.s=!0;var s=n.Ga;ht||Ki(),ut||(ht(),ut=!0),Sn.add(s,n),n.B=0}}function Ga(n,s){return gr(n.h)>=n.h.j-(n.s?1:0)?!1:n.s?(n.i=s.D.concat(n.i),!0):n.G==1||n.G==2||n.B>=(n.Va?0:n.Wa)?!1:(n.s=mt(C(n.Ga,n,s),jr(n,n.B)),n.B++,!0)}t.Ga=function(n){if(this.s)if(this.s=null,this.G==1){if(!n){this.U=Math.floor(1e5*Math.random()),n=this.U++;const _=new we(this,this.j,n);let w=this.o;if(this.S&&(w?(w=u(w),m(w,this.S)):w=this.S),this.m!==null||this.O||(_.H=w,w=null),this.P)e:{for(var s=0,a=0;a<this.i.length;a++){t:{var h=this.i[a];if("__data__"in h.map&&(h=h.map.__data__,typeof h=="string")){h=h.length;break t}h=void 0}if(h===void 0)break;if(s+=h,4096<s){s=a;break e}if(s===4096||a===this.i.length-1){s=a+1;break e}}s=1e3}else s=1e3;s=Mr(this,_,s),a=de(this.I),L(a,"RID",n),L(a,"CVER",22),this.D&&L(a,"X-HTTP-Session-Id",this.D),At(this,a),w&&(this.O?s="headers="+encodeURIComponent(String(Sr(w)))+"&"+s:this.m&&qn(a,this.m,w)),Wn(this.h,_),this.Ua&&L(a,"TYPE","init"),this.P?(L(a,"$req",s),L(a,"SID","null"),_.T=!0,Vn(_,a,null)):Vn(_,a,s),this.G=2}}else this.G==3&&(n?Lr(this,n):this.i.length==0||pr(this.h)||Lr(this))};function Lr(n,s){var a;s?a=s.l:a=n.U++;const h=de(n.I);L(h,"SID",n.K),L(h,"RID",a),L(h,"AID",n.T),At(n,h),n.m&&n.o&&qn(h,n.m,n.o),a=new we(n,n.j,a,n.B+1),n.m===null&&(a.H=n.o),s&&(n.i=s.D.concat(n.i)),s=Mr(n,a,1e3),a.I=Math.round(.5*n.wa)+Math.round(.5*n.wa*Math.random()),Wn(n.h,a),Vn(a,h,s)}function At(n,s){n.H&&X(n.H,function(a,h){L(s,h,a)}),n.l&&vr({},function(a,h){L(s,h,a)})}function Mr(n,s,a){a=Math.min(n.i.length,a);var h=n.l?C(n.l.Na,n.l,n):null;e:{var _=n.i;let w=-1;for(;;){const E=["count="+a];w==-1?0<a?(w=_[0].g,E.push("ofs="+w)):w=0:E.push("ofs="+w);let N=!0;for(let F=0;F<a;F++){let P=_[F].g;const V=_[F].map;if(P-=w,0>P)w=Math.max(0,_[F].g-100),N=!1;else try{Ba(V,E,"req"+P+"_")}catch{h&&h(V)}}if(N){h=E.join("&");break e}}}return n=n.i.splice(0,a),s.D=n,h}function Ur(n){if(!n.g&&!n.u){n.Y=1;var s=n.Fa;ht||Ki(),ut||(ht(),ut=!0),Sn.add(s,n),n.v=0}}function Jn(n){return n.g||n.u||3<=n.v?!1:(n.Y++,n.u=mt(C(n.Fa,n),jr(n,n.v)),n.v++,!0)}t.Fa=function(){if(this.u=null,xr(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var n=2*this.R;this.j.info("BP detection timer enabled: "+n),this.A=mt(C(this.ab,this),n)}},t.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,K(10),Xt(this),xr(this))};function Xn(n){n.A!=null&&(d.clearTimeout(n.A),n.A=null)}function xr(n){n.g=new we(n,n.j,"rpc",n.Y),n.m===null&&(n.g.H=n.o),n.g.O=0;var s=de(n.qa);L(s,"RID","rpc"),L(s,"SID",n.K),L(s,"AID",n.T),L(s,"CI",n.F?"0":"1"),!n.F&&n.ja&&L(s,"TO",n.ja),L(s,"TYPE","xmlhttp"),At(n,s),n.m&&n.o&&qn(s,n.m,n.o),n.L&&(n.g.I=n.L);var a=n.g;n=n.ia,a.L=1,a.v=Wt(de(s)),a.m=null,a.P=!0,hr(a,n)}t.Za=function(){this.C!=null&&(this.C=null,Xt(this),Jn(this),K(19))};function Qt(n){n.C!=null&&(d.clearTimeout(n.C),n.C=null)}function Fr(n,s){var a=null;if(n.g==s){Qt(n),Xn(n),n.g=null;var h=2}else if(Gn(n.h,s))a=s.D,mr(n.h,s),h=1;else return;if(n.G!=0){if(s.o)if(h==1){a=s.m?s.m.length:0,s=Date.now()-s.F;var _=n.B;h=Fn(),q(h,new ar(h,a)),Yt(n)}else Ur(n);else if(_=s.s,_==3||_==0&&0<s.X||!(h==1&&Ga(n,s)||h==2&&Jn(n)))switch(a&&0<a.length&&(s=n.h,s.i=s.i.concat(a)),_){case 1:Ue(n,5);break;case 4:Ue(n,10);break;case 3:Ue(n,6);break;default:Ue(n,2)}}}function jr(n,s){let a=n.Ta+Math.floor(Math.random()*n.cb);return n.isActive()||(a*=2),a*s}function Ue(n,s){if(n.j.info("Error code "+s),s==2){var a=C(n.fb,n),h=n.Xa;const _=!h;h=new Me(h||"//www.google.com/images/cleardot.gif"),d.location&&d.location.protocol=="http"||zt(h,"https"),Wt(h),_?Fa(h.toString(),a):ja(h.toString(),a)}else K(2);n.G=0,n.l&&n.l.sa(s),$r(n),Nr(n)}t.fb=function(n){n?(this.j.info("Successfully pinged google.com"),K(2)):(this.j.info("Failed to ping google.com"),K(1))};function $r(n){if(n.G=0,n.ka=[],n.l){const s=yr(n.h);(s.length!=0||n.i.length!=0)&&(M(n.ka,s),M(n.ka,n.i),n.h.i.length=0,x(n.i),n.i.length=0),n.l.ra()}}function Br(n,s,a){var h=a instanceof Me?de(a):new Me(a);if(h.g!="")s&&(h.g=s+"."+h.g),Gt(h,h.s);else{var _=d.location;h=_.protocol,s=s?s+"."+_.hostname:_.hostname,_=+_.port;var w=new Me(null);h&&zt(w,h),s&&(w.g=s),_&&Gt(w,_),a&&(w.l=a),h=w}return a=n.D,s=n.ya,a&&s&&L(h,a,s),L(h,"VER",n.la),At(n,h),h}function Vr(n,s,a){if(s&&!n.J)throw Error("Can't create secondary domain capable XhrIo object.");return s=n.Ca&&!n.pa?new U(new qt({eb:a})):new U(n.pa),s.Ha(n.J),s}t.isActive=function(){return!!this.l&&this.l.isActive(this)};function Hr(){}t=Hr.prototype,t.ua=function(){},t.ta=function(){},t.sa=function(){},t.ra=function(){},t.isActive=function(){return!0},t.Na=function(){};function te(n,s){B.call(this),this.g=new Dr(s),this.l=n,this.h=s&&s.messageUrlParams||null,n=s&&s.messageHeaders||null,s&&s.clientProtocolHeaderRequired&&(n?n["X-Client-Protocol"]="webchannel":n={"X-Client-Protocol":"webchannel"}),this.g.o=n,n=s&&s.initMessageHeaders||null,s&&s.messageContentType&&(n?n["X-WebChannel-Content-Type"]=s.messageContentType:n={"X-WebChannel-Content-Type":s.messageContentType}),s&&s.va&&(n?n["X-WebChannel-Client-Profile"]=s.va:n={"X-WebChannel-Client-Profile":s.va}),this.g.S=n,(n=s&&s.Sb)&&!Q(n)&&(this.g.m=n),this.v=s&&s.supportsCrossDomainXhr||!1,this.u=s&&s.sendRawJson||!1,(s=s&&s.httpSessionIdParam)&&!Q(s)&&(this.g.D=s,n=this.h,n!==null&&s in n&&(n=this.h,s in n&&delete n[s])),this.j=new Ke(this)}k(te,B),te.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},te.prototype.close=function(){Kn(this.g)},te.prototype.o=function(n){var s=this.g;if(typeof n=="string"){var a={};a.__data__=n,n=a}else this.u&&(a={},a.__data__=Ln(n),n=a);s.i.push(new ka(s.Ya++,n)),s.G==3&&Yt(s)},te.prototype.N=function(){this.g.l=null,delete this.j,Kn(this.g),delete this.g,te.aa.N.call(this)};function zr(n){Un.call(this),n.__headers__&&(this.headers=n.__headers__,this.statusCode=n.__status__,delete n.__headers__,delete n.__status__);var s=n.__sm__;if(s){e:{for(const a in s){n=a;break e}n=void 0}(this.i=n)&&(n=this.i,s=s!==null&&n in s?s[n]:void 0),this.data=s}else this.data=n}k(zr,Un);function Gr(){xn.call(this),this.status=1}k(Gr,xn);function Ke(n){this.g=n}k(Ke,Hr),Ke.prototype.ua=function(){q(this.g,"a")},Ke.prototype.ta=function(n){q(this.g,new zr(n))},Ke.prototype.sa=function(n){q(this.g,new Gr)},Ke.prototype.ra=function(){q(this.g,"b")},te.prototype.send=te.prototype.o,te.prototype.open=te.prototype.m,te.prototype.close=te.prototype.close,jn.NO_ERROR=0,jn.TIMEOUT=8,jn.HTTP_ERROR=6,Sa.COMPLETE="complete",wa.EventType=pt,pt.OPEN="a",pt.CLOSE="b",pt.ERROR="c",pt.MESSAGE="d",B.prototype.listen=B.prototype.K,U.prototype.listenOnce=U.prototype.L,U.prototype.getLastError=U.prototype.Ka,U.prototype.getLastErrorCode=U.prototype.Ba,U.prototype.getStatus=U.prototype.Z,U.prototype.getResponseJson=U.prototype.Oa,U.prototype.getResponseText=U.prototype.oa,U.prototype.send=U.prototype.ea,U.prototype.setWithCredentials=U.prototype.Ha}).apply(typeof tn<"u"?tn:typeof self<"u"?self:typeof window<"u"?window:{});const As="@firebase/firestore";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class z{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}z.UNAUTHENTICATED=new z(null),z.GOOGLE_CREDENTIALS=new z("google-credentials-uid"),z.FIRST_PARTY=new z("first-party-uid"),z.MOCK_USER=new z("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let xt="10.13.2";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ot=new wn("@firebase/firestore");function Z(t,...e){if(ot.logLevel<=O.DEBUG){const i=e.map(ji);ot.debug(`Firestore (${xt}): ${t}`,...i)}}function Fi(t,...e){if(ot.logLevel<=O.ERROR){const i=e.map(ji);ot.error(`Firestore (${xt}): ${t}`,...i)}}function Hu(t,...e){if(ot.logLevel<=O.WARN){const i=e.map(ji);ot.warn(`Firestore (${xt}): ${t}`,...i)}}function ji(t){if(typeof t=="string")return t;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return function(i){return JSON.stringify(i)}(t)}catch{return t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $i(t="Unexpected state"){const e=`FIRESTORE (${xt}) INTERNAL ASSERTION FAILED: `+t;throw Fi(e),new Error(e)}function Ti(t,e){t||$i()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const G={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class W extends oe{constructor(e,i){super(e,i),this.code=e,this.message=i,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class it{constructor(){this.promise=new Promise((e,i)=>{this.resolve=e,this.reject=i})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xo{constructor(e,i){this.user=i,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class zu{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,i){e.enqueueRetryable(()=>i(z.UNAUTHENTICATED))}shutdown(){}}class Gu{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,i){this.changeListener=i,e.enqueueRetryable(()=>i(this.token.user))}shutdown(){this.changeListener=null}}class Wu{constructor(e){this.t=e,this.currentUser=z.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,i){let r=this.i;const o=g=>this.i!==r?(r=this.i,i(g)):Promise.resolve();let c=new it;this.o=()=>{this.i++,this.currentUser=this.u(),c.resolve(),c=new it,e.enqueueRetryable(()=>o(this.currentUser))};const l=()=>{const g=c;e.enqueueRetryable(async()=>{await g.promise,await o(this.currentUser)})},d=g=>{Z("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=g,this.auth.addAuthTokenListener(this.o),l()};this.t.onInit(g=>d(g)),setTimeout(()=>{if(!this.auth){const g=this.t.getImmediate({optional:!0});g?d(g):(Z("FirebaseAuthCredentialsProvider","Auth not yet detected"),c.resolve(),c=new it)}},0),l()}getToken(){const e=this.i,i=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(i).then(r=>this.i!==e?(Z("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(Ti(typeof r.accessToken=="string"),new xo(r.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.auth.removeAuthTokenListener(this.o)}u(){const e=this.auth&&this.auth.getUid();return Ti(e===null||typeof e=="string"),new z(e)}}class qu{constructor(e,i,r){this.l=e,this.h=i,this.P=r,this.type="FirstParty",this.user=z.FIRST_PARTY,this.I=new Map}T(){return this.P?this.P():null}get headers(){this.I.set("X-Goog-AuthUser",this.l);const e=this.T();return e&&this.I.set("Authorization",e),this.h&&this.I.set("X-Goog-Iam-Authorization-Token",this.h),this.I}}class Ku{constructor(e,i,r){this.l=e,this.h=i,this.P=r}getToken(){return Promise.resolve(new qu(this.l,this.h,this.P))}start(e,i){e.enqueueRetryable(()=>i(z.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class Ju{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class Xu{constructor(e){this.A=e,this.forceRefresh=!1,this.appCheck=null,this.R=null}start(e,i){const r=c=>{c.error!=null&&Z("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${c.error.message}`);const l=c.token!==this.R;return this.R=c.token,Z("FirebaseAppCheckTokenProvider",`Received ${l?"new":"existing"} token.`),l?i(c.token):Promise.resolve()};this.o=c=>{e.enqueueRetryable(()=>r(c))};const o=c=>{Z("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=c,this.appCheck.addTokenListener(this.o)};this.A.onInit(c=>o(c)),setTimeout(()=>{if(!this.appCheck){const c=this.A.getImmediate({optional:!0});c?o(c):Z("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(i=>i?(Ti(typeof i.token=="string"),this.R=i.token,new Ju(i.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.appCheck.removeTokenListener(this.o)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yu(t){const e=typeof self<"u"&&(self.crypto||self.msCrypto),i=new Uint8Array(t);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(i);else for(let r=0;r<t;r++)i[r]=Math.floor(256*Math.random());return i}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qu{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",i=Math.floor(256/e.length)*e.length;let r="";for(;r.length<20;){const o=Yu(40);for(let c=0;c<o.length;++c)r.length<20&&o[c]<i&&(r+=e.charAt(o[c]%e.length))}return r}}function Fo(t){return t.name==="IndexedDbTransactionError"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zu{constructor(e,i,r,o,c,l,d,g,T){this.databaseId=e,this.appId=i,this.persistenceKey=r,this.host=o,this.ssl=c,this.forceLongPolling=l,this.autoDetectLongPolling=d,this.longPollingOptions=g,this.useFetchStreams=T}}class mn{constructor(e,i){this.projectId=e,this.database=i||"(default)"}static empty(){return new mn("","")}get isDefaultDatabase(){return this.database==="(default)"}isEqual(e){return e instanceof mn&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ss,R;(R=Ss||(Ss={}))[R.OK=0]="OK",R[R.CANCELLED=1]="CANCELLED",R[R.UNKNOWN=2]="UNKNOWN",R[R.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",R[R.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",R[R.NOT_FOUND=5]="NOT_FOUND",R[R.ALREADY_EXISTS=6]="ALREADY_EXISTS",R[R.PERMISSION_DENIED=7]="PERMISSION_DENIED",R[R.UNAUTHENTICATED=16]="UNAUTHENTICATED",R[R.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",R[R.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",R[R.ABORTED=10]="ABORTED",R[R.OUT_OF_RANGE=11]="OUT_OF_RANGE",R[R.UNIMPLEMENTED=12]="UNIMPLEMENTED",R[R.INTERNAL=13]="INTERNAL",R[R.UNAVAILABLE=14]="UNAVAILABLE",R[R.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */new Uo([4294967295,4294967295],0);function ai(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ed{constructor(e,i,r=1e3,o=1.5,c=6e4){this.ui=e,this.timerId=i,this.ko=r,this.qo=o,this.Qo=c,this.Ko=0,this.$o=null,this.Uo=Date.now(),this.reset()}reset(){this.Ko=0}Wo(){this.Ko=this.Qo}Go(e){this.cancel();const i=Math.floor(this.Ko+this.zo()),r=Math.max(0,Date.now()-this.Uo),o=Math.max(0,i-r);o>0&&Z("ExponentialBackoff",`Backing off for ${o} ms (base delay: ${this.Ko} ms, delay with jitter: ${i} ms, last attempt: ${r} ms ago)`),this.$o=this.ui.enqueueAfterDelay(this.timerId,o,()=>(this.Uo=Date.now(),e())),this.Ko*=this.qo,this.Ko<this.ko&&(this.Ko=this.ko),this.Ko>this.Qo&&(this.Ko=this.Qo)}jo(){this.$o!==null&&(this.$o.skipDelay(),this.$o=null)}cancel(){this.$o!==null&&(this.$o.cancel(),this.$o=null)}zo(){return(Math.random()-.5)*this.Ko}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bi{constructor(e,i,r,o,c){this.asyncQueue=e,this.timerId=i,this.targetTimeMs=r,this.op=o,this.removalCallback=c,this.deferred=new it,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(l=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,i,r,o,c){const l=Date.now()+r,d=new Bi(e,i,l,o,c);return d.start(r),d}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new W(G.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function td(t,e){if(Fi("AsyncQueue",`${e}: ${t}`),Fo(t))return new W(G.UNAVAILABLE,`${e}: ${t}`);throw t}var Cs,ks;(ks=Cs||(Cs={})).ea="default",ks.Cache="cache";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nd{constructor(e,i,r,o){this.authCredentials=e,this.appCheckCredentials=i,this.asyncQueue=r,this.databaseInfo=o,this.user=z.UNAUTHENTICATED,this.clientId=Qu.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this.authCredentials.start(r,async c=>{Z("FirestoreClient","Received user=",c.uid),await this.authCredentialListener(c),this.user=c}),this.appCheckCredentials.start(r,c=>(Z("FirestoreClient","Received new app check token=",c),this.appCheckCredentialListener(c,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}verifyNotTerminated(){if(this.asyncQueue.isShuttingDown)throw new W(G.FAILED_PRECONDITION,"The client has already been terminated.")}terminate(){this.asyncQueue.enterRestrictedMode();const e=new it;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(i){const r=td(i,"Failed to shutdown persistence");e.reject(r)}}),e.promise}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jo(t){const e={};return t.timeoutSeconds!==void 0&&(e.timeoutSeconds=t.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rs=new Map;function id(t,e,i,r){if(e===!0&&r===!0)throw new W(G.INVALID_ARGUMENT,`${t} and ${i} cannot be used together.`)}function rd(t){if(t===void 0)return"undefined";if(t===null)return"null";if(typeof t=="string")return t.length>20&&(t=`${t.substring(0,20)}...`),JSON.stringify(t);if(typeof t=="number"||typeof t=="boolean")return""+t;if(typeof t=="object"){if(t instanceof Array)return"an array";{const e=function(r){return r.constructor?r.constructor.name:null}(t);return e?`a custom ${e} object`:"an object"}}return typeof t=="function"?"a function":$i()}function sd(t,e){if("_delegate"in t&&(t=t._delegate),!(t instanceof e)){if(e.name===t.constructor.name)throw new W(G.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const i=rd(t);throw new W(G.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${i}`)}}return t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ps{constructor(e){var i,r;if(e.host===void 0){if(e.ssl!==void 0)throw new W(G.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0}else this.host=e.host,this.ssl=(i=e.ssl)===null||i===void 0||i;if(this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=41943040;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<1048576)throw new W(G.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}id("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=jo((r=e.experimentalLongPollingOptions)!==null&&r!==void 0?r:{}),function(c){if(c.timeoutSeconds!==void 0){if(isNaN(c.timeoutSeconds))throw new W(G.INVALID_ARGUMENT,`invalid long polling timeout: ${c.timeoutSeconds} (must not be NaN)`);if(c.timeoutSeconds<5)throw new W(G.INVALID_ARGUMENT,`invalid long polling timeout: ${c.timeoutSeconds} (minimum allowed value is 5)`);if(c.timeoutSeconds>30)throw new W(G.INVALID_ARGUMENT,`invalid long polling timeout: ${c.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(r,o){return r.timeoutSeconds===o.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class $o{constructor(e,i,r,o){this._authCredentials=e,this._appCheckCredentials=i,this._databaseId=r,this._app=o,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Ps({}),this._settingsFrozen=!1}get app(){if(!this._app)throw new W(G.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!==void 0}_setSettings(e){if(this._settingsFrozen)throw new W(G.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Ps(e),e.credentials!==void 0&&(this._authCredentials=function(r){if(!r)return new zu;switch(r.type){case"firstParty":return new Ku(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new W(G.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask||(this._terminateTask=this._terminate()),this._terminateTask}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(i){const r=Rs.get(i);r&&(Z("ComponentProvider","Removing Datastore"),Rs.delete(i),r.terminate())}(this),Promise.resolve()}}function od(t,e,i,r={}){var o;const c=(t=sd(t,$o))._getSettings(),l=`${e}:${i}`;if(c.host!=="firestore.googleapis.com"&&c.host!==l&&Hu("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used."),t._setSettings(Object.assign(Object.assign({},c),{host:l,ssl:!1})),r.mockUserToken){let d,g;if(typeof r.mockUserToken=="string")d=r.mockUserToken,g=z.MOCK_USER;else{d=Tc(r.mockUserToken,(o=t._app)===null||o===void 0?void 0:o.options.projectId);const T=r.mockUserToken.sub||r.mockUserToken.user_id;if(!T)throw new W(G.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");g=new z(T)}t._authCredentials=new Gu(new xo(d,g))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ad{constructor(){this.au=Promise.resolve(),this.uu=[],this.cu=!1,this.lu=[],this.hu=null,this.Pu=!1,this.Iu=!1,this.Tu=[],this.t_=new ed(this,"async_queue_retry"),this.Eu=()=>{const i=ai();i&&Z("AsyncQueue","Visibility state changed to "+i.visibilityState),this.t_.jo()};const e=ai();e&&typeof e.addEventListener=="function"&&e.addEventListener("visibilitychange",this.Eu)}get isShuttingDown(){return this.cu}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.du(),this.Au(e)}enterRestrictedMode(e){if(!this.cu){this.cu=!0,this.Iu=e||!1;const i=ai();i&&typeof i.removeEventListener=="function"&&i.removeEventListener("visibilitychange",this.Eu)}}enqueue(e){if(this.du(),this.cu)return new Promise(()=>{});const i=new it;return this.Au(()=>this.cu&&this.Iu?Promise.resolve():(e().then(i.resolve,i.reject),i.promise)).then(()=>i.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.uu.push(e),this.Ru()))}async Ru(){if(this.uu.length!==0){try{await this.uu[0](),this.uu.shift(),this.t_.reset()}catch(e){if(!Fo(e))throw e;Z("AsyncQueue","Operation failed with retryable error: "+e)}this.uu.length>0&&this.t_.Go(()=>this.Ru())}}Au(e){const i=this.au.then(()=>(this.Pu=!0,e().catch(r=>{this.hu=r,this.Pu=!1;const o=function(l){let d=l.message||"";return l.stack&&(d=l.stack.includes(l.message)?l.stack:l.message+`
`+l.stack),d}(r);throw Fi("INTERNAL UNHANDLED ERROR: ",o),r}).then(r=>(this.Pu=!1,r))));return this.au=i,i}enqueueAfterDelay(e,i,r){this.du(),this.Tu.indexOf(e)>-1&&(i=0);const o=Bi.createAndSchedule(this,e,i,r,c=>this.Vu(c));return this.lu.push(o),o}du(){this.hu&&$i()}verifyOperationInProgress(){}async mu(){let e;do e=this.au,await e;while(e!==this.au)}fu(e){for(const i of this.lu)if(i.timerId===e)return!0;return!1}gu(e){return this.mu().then(()=>{this.lu.sort((i,r)=>i.targetTimeMs-r.targetTimeMs);for(const i of this.lu)if(i.skipDelay(),e!=="all"&&i.timerId===e)break;return this.mu()})}pu(e){this.Tu.push(e)}Vu(e){const i=this.lu.indexOf(e);this.lu.splice(i,1)}}class cd extends $o{constructor(e,i,r,o){super(e,i,r,o),this.type="firestore",this._queue=function(){return new ad}(),this._persistenceKey=(o==null?void 0:o.name)||"[DEFAULT]"}_terminate(){return this._firestoreClient||hd(this),this._firestoreClient.terminate()}}function ld(t,e){const i=typeof t=="object"?t:Ci(),r=typeof t=="string"?t:"(default)",o=ze(i,"firestore").getImmediate({identifier:r});if(!o._initialized){const c=Ic("firestore");c&&od(o,...c)}return o}function hd(t){var e,i,r;const o=t._freezeSettings(),c=function(d,g,T,b){return new Zu(d,g,T,b.host,b.ssl,b.experimentalForceLongPolling,b.experimentalAutoDetectLongPolling,jo(b.experimentalLongPollingOptions),b.useFetchStreams)}(t._databaseId,((e=t._app)===null||e===void 0?void 0:e.options.appId)||"",t._persistenceKey,o);t._firestoreClient=new nd(t._authCredentials,t._appCheckCredentials,t._queue,c),!((i=o.localCache)===null||i===void 0)&&i._offlineComponentProvider&&(!((r=o.localCache)===null||r===void 0)&&r._onlineComponentProvider)&&(t._firestoreClient._uninitializedComponentsProvider={_offlineKind:o.localCache.kind,_offline:o.localCache._offlineComponentProvider,_online:o.localCache._onlineComponentProvider})}(function(e,i=!0){(function(o){xt=o})(at),le(new se("firestore",(r,{instanceIdentifier:o,options:c})=>{const l=r.getProvider("app").getImmediate(),d=new cd(new Wu(r.getProvider("auth-internal")),new Xu(r.getProvider("app-check-internal")),function(T,b){if(!Object.prototype.hasOwnProperty.apply(T.options,["projectId"]))throw new W(G.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new mn(T.options.projectId,b)}(l,o),l);return c=Object.assign({useFetchStreams:i},c),d._setSettings(c),d},"PUBLIC").setMultipleInstances(!0)),ne(As,"4.7.2",e),ne(As,"4.7.2","esm2017")})();const Bo="@firebase/installations",Vi="0.6.9";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vo=1e4,Ho=`w:${Vi}`,zo="FIS_v2",ud="https://firebaseinstallations.googleapis.com/v1",dd=60*60*1e3,fd="installations",pd="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gd={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},Be=new He(fd,pd,gd);function Go(t){return t instanceof oe&&t.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wo({projectId:t}){return`${ud}/projects/${t}/installations`}function qo(t){return{token:t.token,requestStatus:2,expiresIn:yd(t.expiresIn),creationTime:Date.now()}}async function Ko(t,e){const r=(await e.json()).error;return Be.create("request-failed",{requestName:t,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function Jo({apiKey:t}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":t})}function md(t,{refreshToken:e}){const i=Jo(t);return i.append("Authorization",vd(e)),i}async function Xo(t){const e=await t();return e.status>=500&&e.status<600?t():e}function yd(t){return Number(t.replace("s","000"))}function vd(t){return`${zo} ${t}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function _d({appConfig:t,heartbeatServiceProvider:e},{fid:i}){const r=Wo(t),o=Jo(t),c=e.getImmediate({optional:!0});if(c){const T=await c.getHeartbeatsHeader();T&&o.append("x-firebase-client",T)}const l={fid:i,authVersion:zo,appId:t.appId,sdkVersion:Ho},d={method:"POST",headers:o,body:JSON.stringify(l)},g=await Xo(()=>fetch(r,d));if(g.ok){const T=await g.json();return{fid:T.fid||i,registrationStatus:2,refreshToken:T.refreshToken,authToken:qo(T.authToken)}}else throw await Ko("Create Installation",g)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yo(t){return new Promise(e=>{setTimeout(e,t)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Id(t){return btoa(String.fromCharCode(...t)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wd=/^[cdef][\w-]{21}$/,Ei="";function Td(){try{const t=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(t),t[0]=112+t[0]%16;const i=Ed(t);return wd.test(i)?i:Ei}catch{return Ei}}function Ed(t){return Id(t).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bn(t){return`${t.appName}!${t.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Qo=new Map;function Zo(t,e){const i=bn(t);ea(i,e),bd(i,e)}function ea(t,e){const i=Qo.get(t);if(i)for(const r of i)r(e)}function bd(t,e){const i=Ad();i&&i.postMessage({key:t,fid:e}),Sd()}let Fe=null;function Ad(){return!Fe&&"BroadcastChannel"in self&&(Fe=new BroadcastChannel("[Firebase] FID Change"),Fe.onmessage=t=>{ea(t.data.key,t.data.fid)}),Fe}function Sd(){Qo.size===0&&Fe&&(Fe.close(),Fe=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Cd="firebase-installations-database",kd=1,Ve="firebase-installations-store";let ci=null;function Hi(){return ci||(ci=Zs(Cd,kd,{upgrade:(t,e)=>{switch(e){case 0:t.createObjectStore(Ve)}}})),ci}async function yn(t,e){const i=bn(t),o=(await Hi()).transaction(Ve,"readwrite"),c=o.objectStore(Ve),l=await c.get(i);return await c.put(e,i),await o.done,(!l||l.fid!==e.fid)&&Zo(t,e.fid),e}async function ta(t){const e=bn(t),r=(await Hi()).transaction(Ve,"readwrite");await r.objectStore(Ve).delete(e),await r.done}async function An(t,e){const i=bn(t),o=(await Hi()).transaction(Ve,"readwrite"),c=o.objectStore(Ve),l=await c.get(i),d=e(l);return d===void 0?await c.delete(i):await c.put(d,i),await o.done,d&&(!l||l.fid!==d.fid)&&Zo(t,d.fid),d}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function zi(t){let e;const i=await An(t.appConfig,r=>{const o=Rd(r),c=Pd(t,o);return e=c.registrationPromise,c.installationEntry});return i.fid===Ei?{installationEntry:await e}:{installationEntry:i,registrationPromise:e}}function Rd(t){const e=t||{fid:Td(),registrationStatus:0};return na(e)}function Pd(t,e){if(e.registrationStatus===0){if(!navigator.onLine){const o=Promise.reject(Be.create("app-offline"));return{installationEntry:e,registrationPromise:o}}const i={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},r=Od(t,i);return{installationEntry:i,registrationPromise:r}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:Dd(t)}:{installationEntry:e}}async function Od(t,e){try{const i=await _d(t,e);return yn(t.appConfig,i)}catch(i){throw Go(i)&&i.customData.serverCode===409?await ta(t.appConfig):await yn(t.appConfig,{fid:e.fid,registrationStatus:0}),i}}async function Dd(t){let e=await Os(t.appConfig);for(;e.registrationStatus===1;)await Yo(100),e=await Os(t.appConfig);if(e.registrationStatus===0){const{installationEntry:i,registrationPromise:r}=await zi(t);return r||i}return e}function Os(t){return An(t,e=>{if(!e)throw Be.create("installation-not-found");return na(e)})}function na(t){return Nd(t)?{fid:t.fid,registrationStatus:0}:t}function Nd(t){return t.registrationStatus===1&&t.registrationTime+Vo<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ld({appConfig:t,heartbeatServiceProvider:e},i){const r=Md(t,i),o=md(t,i),c=e.getImmediate({optional:!0});if(c){const T=await c.getHeartbeatsHeader();T&&o.append("x-firebase-client",T)}const l={installation:{sdkVersion:Ho,appId:t.appId}},d={method:"POST",headers:o,body:JSON.stringify(l)},g=await Xo(()=>fetch(r,d));if(g.ok){const T=await g.json();return qo(T)}else throw await Ko("Generate Auth Token",g)}function Md(t,{fid:e}){return`${Wo(t)}/${e}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Gi(t,e=!1){let i;const r=await An(t.appConfig,c=>{if(!ia(c))throw Be.create("not-registered");const l=c.authToken;if(!e&&Fd(l))return c;if(l.requestStatus===1)return i=Ud(t,e),c;{if(!navigator.onLine)throw Be.create("app-offline");const d=$d(c);return i=xd(t,d),d}});return i?await i:r.authToken}async function Ud(t,e){let i=await Ds(t.appConfig);for(;i.authToken.requestStatus===1;)await Yo(100),i=await Ds(t.appConfig);const r=i.authToken;return r.requestStatus===0?Gi(t,e):r}function Ds(t){return An(t,e=>{if(!ia(e))throw Be.create("not-registered");const i=e.authToken;return Bd(i)?Object.assign(Object.assign({},e),{authToken:{requestStatus:0}}):e})}async function xd(t,e){try{const i=await Ld(t,e),r=Object.assign(Object.assign({},e),{authToken:i});return await yn(t.appConfig,r),i}catch(i){if(Go(i)&&(i.customData.serverCode===401||i.customData.serverCode===404))await ta(t.appConfig);else{const r=Object.assign(Object.assign({},e),{authToken:{requestStatus:0}});await yn(t.appConfig,r)}throw i}}function ia(t){return t!==void 0&&t.registrationStatus===2}function Fd(t){return t.requestStatus===2&&!jd(t)}function jd(t){const e=Date.now();return e<t.creationTime||t.creationTime+t.expiresIn<e+dd}function $d(t){const e={requestStatus:1,requestTime:Date.now()};return Object.assign(Object.assign({},t),{authToken:e})}function Bd(t){return t.requestStatus===1&&t.requestTime+Vo<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Vd(t){const e=t,{installationEntry:i,registrationPromise:r}=await zi(e);return r?r.catch(console.error):Gi(e).catch(console.error),i.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Hd(t,e=!1){const i=t;return await zd(i),(await Gi(i,e)).token}async function zd(t){const{registrationPromise:e}=await zi(t);e&&await e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gd(t){if(!t||!t.options)throw li("App Configuration");if(!t.name)throw li("App Name");const e=["projectId","apiKey","appId"];for(const i of e)if(!t.options[i])throw li(i);return{appName:t.name,projectId:t.options.projectId,apiKey:t.options.apiKey,appId:t.options.appId}}function li(t){return Be.create("missing-app-config-values",{valueName:t})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ra="installations",Wd="installations-internal",qd=t=>{const e=t.getProvider("app").getImmediate(),i=Gd(e),r=ze(e,"heartbeat");return{app:e,appConfig:i,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},Kd=t=>{const e=t.getProvider("app").getImmediate(),i=ze(e,ra).getImmediate();return{getId:()=>Vd(i),getToken:o=>Hd(i,o)}};function Jd(){le(new se(ra,qd,"PUBLIC")),le(new se(Wd,Kd,"PRIVATE"))}Jd();ne(Bo,Vi);ne(Bo,Vi,"esm2017");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vn="analytics",Xd="firebase_id",Yd="origin",Qd=60*1e3,Zd="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",Wi="https://www.googletagmanager.com/gtag/js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Y=new wn("@firebase/analytics");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ef={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},ee=new He("analytics","Analytics",ef);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tf(t){if(!t.startsWith(Wi)){const e=ee.create("invalid-gtag-resource",{gtagURL:t});return Y.warn(e.message),""}return t}function sa(t){return Promise.all(t.map(e=>e.catch(i=>i)))}function nf(t,e){let i;return window.trustedTypes&&(i=window.trustedTypes.createPolicy(t,e)),i}function rf(t,e){const i=nf("firebase-js-sdk-policy",{createScriptURL:tf}),r=document.createElement("script"),o=`${Wi}?l=${t}&id=${e}`;r.src=i?i==null?void 0:i.createScriptURL(o):o,r.async=!0,document.head.appendChild(r)}function sf(t){let e=[];return Array.isArray(window[t])?e=window[t]:window[t]=e,e}async function of(t,e,i,r,o,c){const l=r[o];try{if(l)await e[l];else{const g=(await sa(i)).find(T=>T.measurementId===o);g&&await e[g.appId]}}catch(d){Y.error(d)}t("config",o,c)}async function af(t,e,i,r,o){try{let c=[];if(o&&o.send_to){let l=o.send_to;Array.isArray(l)||(l=[l]);const d=await sa(i);for(const g of l){const T=d.find(A=>A.measurementId===g),b=T&&e[T.appId];if(b)c.push(b);else{c=[];break}}}c.length===0&&(c=Object.values(e)),await Promise.all(c),t("event",r,o||{})}catch(c){Y.error(c)}}function cf(t,e,i,r){async function o(c,...l){try{if(c==="event"){const[d,g]=l;await af(t,e,i,d,g)}else if(c==="config"){const[d,g]=l;await of(t,e,i,r,d,g)}else if(c==="consent"){const[d,g]=l;t("consent",d,g)}else if(c==="get"){const[d,g,T]=l;t("get",d,g,T)}else if(c==="set"){const[d]=l;t("set",d)}else t(c,...l)}catch(d){Y.error(d)}}return o}function lf(t,e,i,r,o){let c=function(...l){window[r].push(arguments)};return window[o]&&typeof window[o]=="function"&&(c=window[o]),window[o]=cf(c,t,e,i),{gtagCore:c,wrappedGtag:window[o]}}function hf(t){const e=window.document.getElementsByTagName("script");for(const i of Object.values(e))if(i.src&&i.src.includes(Wi)&&i.src.includes(t))return i;return null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const uf=30,df=1e3;class ff{constructor(e={},i=df){this.throttleMetadata=e,this.intervalMillis=i}getThrottleMetadata(e){return this.throttleMetadata[e]}setThrottleMetadata(e,i){this.throttleMetadata[e]=i}deleteThrottleMetadata(e){delete this.throttleMetadata[e]}}const oa=new ff;function pf(t){return new Headers({Accept:"application/json","x-goog-api-key":t})}async function gf(t){var e;const{appId:i,apiKey:r}=t,o={method:"GET",headers:pf(r)},c=Zd.replace("{app-id}",i),l=await fetch(c,o);if(l.status!==200&&l.status!==304){let d="";try{const g=await l.json();!((e=g.error)===null||e===void 0)&&e.message&&(d=g.error.message)}catch{}throw ee.create("config-fetch-failed",{httpStatus:l.status,responseMessage:d})}return l.json()}async function mf(t,e=oa,i){const{appId:r,apiKey:o,measurementId:c}=t.options;if(!r)throw ee.create("no-app-id");if(!o){if(c)return{measurementId:c,appId:r};throw ee.create("no-api-key")}const l=e.getThrottleMetadata(r)||{backoffCount:0,throttleEndTimeMillis:Date.now()},d=new _f;return setTimeout(async()=>{d.abort()},Qd),aa({appId:r,apiKey:o,measurementId:c},l,d,e)}async function aa(t,{throttleEndTimeMillis:e,backoffCount:i},r,o=oa){var c;const{appId:l,measurementId:d}=t;try{await yf(r,e)}catch(g){if(d)return Y.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${d} provided in the "measurementId" field in the local Firebase config. [${g==null?void 0:g.message}]`),{appId:l,measurementId:d};throw g}try{const g=await gf(t);return o.deleteThrottleMetadata(l),g}catch(g){const T=g;if(!vf(T)){if(o.deleteThrottleMetadata(l),d)return Y.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${d} provided in the "measurementId" field in the local Firebase config. [${T==null?void 0:T.message}]`),{appId:l,measurementId:d};throw g}const b=Number((c=T==null?void 0:T.customData)===null||c===void 0?void 0:c.httpStatus)===503?Qr(i,o.intervalMillis,uf):Qr(i,o.intervalMillis),A={throttleEndTimeMillis:Date.now()+b,backoffCount:i+1};return o.setThrottleMetadata(l,A),Y.debug(`Calling attemptFetch again in ${b} millis`),aa(t,A,r,o)}}function yf(t,e){return new Promise((i,r)=>{const o=Math.max(e-Date.now(),0),c=setTimeout(i,o);t.addEventListener(()=>{clearTimeout(c),r(ee.create("fetch-throttle",{throttleEndTimeMillis:e}))})})}function vf(t){if(!(t instanceof oe)||!t.customData)return!1;const e=Number(t.customData.httpStatus);return e===429||e===500||e===503||e===504}class _f{constructor(){this.listeners=[]}addEventListener(e){this.listeners.push(e)}abort(){this.listeners.forEach(e=>e())}}async function If(t,e,i,r,o){if(o&&o.global){t("event",i,r);return}else{const c=await e,l=Object.assign(Object.assign({},r),{send_to:c});t("event",i,l)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function wf(){if(Js())try{await Xs()}catch(t){return Y.warn(ee.create("indexeddb-unavailable",{errorInfo:t==null?void 0:t.toString()}).message),!1}else return Y.warn(ee.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function Tf(t,e,i,r,o,c,l){var d;const g=mf(t);g.then(D=>{i[D.measurementId]=D.appId,t.options.measurementId&&D.measurementId!==t.options.measurementId&&Y.warn(`The measurement ID in the local Firebase config (${t.options.measurementId}) does not match the measurement ID fetched from the server (${D.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(D=>Y.error(D)),e.push(g);const T=wf().then(D=>{if(D)return r.getId()}),[b,A]=await Promise.all([g,T]);hf(c)||rf(c,b.measurementId),o("js",new Date);const C=(d=l==null?void 0:l.config)!==null&&d!==void 0?d:{};return C[Yd]="firebase",C.update=!0,A!=null&&(C[Xd]=A),o("config",b.measurementId,C),b.measurementId}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ef{constructor(e){this.app=e}_delete(){return delete kt[this.app.options.appId],Promise.resolve()}}let kt={},Ns=[];const Ls={};let hi="dataLayer",bf="gtag",Ms,ca,Us=!1;function Af(){const t=[];if(Ks()&&t.push("This is a browser extension environment."),Cc()||t.push("Cookies are not available."),t.length>0){const e=t.map((r,o)=>`(${o+1}) ${r}`).join(" "),i=ee.create("invalid-analytics-context",{errorInfo:e});Y.warn(i.message)}}function Sf(t,e,i){Af();const r=t.options.appId;if(!r)throw ee.create("no-app-id");if(!t.options.apiKey)if(t.options.measurementId)Y.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${t.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw ee.create("no-api-key");if(kt[r]!=null)throw ee.create("already-exists",{id:r});if(!Us){sf(hi);const{wrappedGtag:c,gtagCore:l}=lf(kt,Ns,Ls,hi,bf);ca=c,Ms=l,Us=!0}return kt[r]=Tf(t,Ns,Ls,e,Ms,hi,i),new Ef(t)}function Cf(t=Ci()){t=De(t);const e=ze(t,vn);return e.isInitialized()?e.getImmediate():kf(t)}function kf(t,e={}){const i=ze(t,vn);if(i.isInitialized()){const o=i.getImmediate();if(Pt(e,i.getOptions()))return o;throw ee.create("already-initialized")}return i.initialize({options:e})}function Rf(t,e,i,r){t=De(t),If(ca,kt[t.app.options.appId],e,i,r).catch(o=>Y.error(o))}const xs="@firebase/analytics",Fs="0.10.8";function Pf(){le(new se(vn,(e,{options:i})=>{const r=e.getProvider("app").getImmediate(),o=e.getProvider("installations-internal").getImmediate();return Sf(r,o,i)},"PUBLIC")),le(new se("analytics-internal",t,"PRIVATE")),ne(xs,Fs),ne(xs,Fs,"esm2017");function t(e){try{const i=e.getProvider(vn).getImmediate();return{logEvent:(r,o,c)=>Rf(i,r,o,c)}}catch(i){throw ee.create("interop-component-reg-failed",{reason:i})}}}Pf();const Of={apiKey:"AIzaSyDiiK5-8yzXxhpSV-B-Prm-8FLtlJjeZO8",authDomain:"jobille-45494.firebaseapp.com",projectId:"jobille-45494",storageBucket:"jobille-45494.appspot.com",messagingSenderId:"656035288386",appId:"1:656035288386:web:d034b9b6afc86f92fba4db",measurementId:"G-B9037MYKGY"},qi=eo(Of),Df=Bu(qi);ld(qi);Cf(qi);function Nf(t){let e;return{c(){e=cn("p"),e.textContent="You are not logged in"},m(i,r){bi(i,e,r)},p:rt,d(i){i&&In(e)}}}function Lf(t){let e,i,r=t[0].email+"",o;return{c(){e=cn("p"),i=ui("You are logged in as "),o=ui(r)},m(c,l){bi(c,e,l),an(e,i),an(e,o)},p(c,l){l&1&&r!==(r=c[0].email+"")&&Qa(o,r)},d(c){c&&In(e)}}}function Mf(t){let e,i,r;function o(d,g){return d[0]?Lf:Nf}let c=o(t),l=c(t);return{c(){e=cn("main"),i=cn("h1"),i.textContent="Welcome to Jobille",r=Xa(),l.c(),qr(i,"class","svelte-1e9puaw"),qr(e,"class","svelte-1e9puaw")},m(d,g){bi(d,e,g),an(e,i),an(e,r),l.m(e,null)},p(d,[g]){c===(c=o(d))&&l?l.p(d,g):(l.d(1),l=c(d),l&&(l.c(),l.m(e,null)))},i:rt,o:rt,d(d){d&&In(e),l.d()}}}function Uf(t,e,i){let r=null;return ec(()=>Df.onAuthStateChanged(c=>{i(0,r=c)})),[r]}class xf extends uc{constructor(e){super(),hc(this,e,Uf,Mf,Ka,{})}}new xf({target:document.getElementById("app")});
