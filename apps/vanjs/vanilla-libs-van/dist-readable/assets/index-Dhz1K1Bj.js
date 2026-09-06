//#region \0vite/modulepreload-polyfill.js
(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
})();
//#endregion
//#region node_modules/goober/dist/goober.modern.js
var e = { data: "" }, t = (t) => {
	if ("object" == typeof window) {
		let e = (t ? t.querySelector("#_goober") : window._goober) || Object.assign(document.createElement("style"), {
			innerHTML: " ",
			id: "_goober"
		});
		return e.nonce = window.__nonce__, e.parentNode || (t || document.head).appendChild(e), e.firstChild;
	}
	return t || e;
}, a = /(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g, l = /\/\*[^]*?\*\/|  +/g, n = /\n+/g, o = (e, t) => {
	let r = "", a = "", l = "";
	for (let n in e) {
		let c = e[n];
		"@" == n[0] ? "i" == n[1] ? r = n + " " + c + ";" : a += "f" == n[1] ? o(c, n) : n + "{" + o(c, "k" == n[1] ? "" : t) + "}" : "object" == typeof c ? a += o(c, t ? t.replace(/([^,])+/g, (e) => n.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g, (t) => /&/.test(t) ? t.replace(/&/g, e) : e ? e + " " + t : t)) : n) : null != c && (n = "-" == n[1] ? n : n.replace(/[A-Z]/g, "-$&").toLowerCase(), l += o.p ? o.p(n, c) : n + ":" + c + ";");
	}
	return r + (t && l ? t + "{" + l + "}" : l) + a;
}, c = {}, i = (e) => {
	if ("object" == typeof e) {
		let t = "";
		for (let r in e) t += r + i(e[r]);
		return t;
	}
	return e;
}, s = (e, t, r, s, p) => {
	let u = i(e), d = c[u] || (c[u] = ((e) => {
		let t = 0, r = 11;
		for (; t < e.length;) r = 101 * r + e.charCodeAt(t++) >>> 0;
		return "go" + r;
	})(u));
	if (!c[d]) {
		let t = u !== e ? e : ((e) => {
			let t, r, o = [{}];
			for (; t = a.exec(e.replace(l, ""));) t[4] ? o.shift() : t[3] ? (r = t[3].replace(n, " ").trim(), o.unshift(o[0][r] = o[0][r] || {})) : o[0][t[1]] = t[2].replace(n, " ").trim();
			return o[0];
		})(e);
		c[d] = o(p ? { ["@keyframes " + d]: t } : t, r ? "" : "." + d);
	}
	let f = r && c.g;
	return r && (c.g = c[d]), ((e, t, r, a) => {
		a ? t.data = t.data.replace(a, e) : -1 === t.data.indexOf(e) && (t.data = r ? e + t.data : t.data + e);
	})(c[d], t, s, f), d;
}, p$3 = (e, t, r) => e.reduce((e, a, l) => {
	let n = t[l];
	if (n && n.call) {
		let e = n(r), t = e && e.props && e.props.className || /^go/.test(e) && e;
		n = t ? "." + t : e && "object" == typeof e ? e.props ? "" : o(e, "") : !1 === e ? "" : e;
	}
	return e + a + (null == n ? "" : n);
}, "");
function u(e) {
	let r = this || {}, a = e.call ? e(r.p) : e;
	return s(a.unshift ? a.raw ? p$3(a, [].slice.call(arguments, 1), r.p) : a.reduce((e, t) => Object.assign(e, t && t.call ? t(r.p) : t), {}) : a, t(r.target), r.g, r.o, r.k);
}
var b = u.bind({ g: 1 });
u.bind({ k: 1 });
//#endregion
//#region node_modules/vanjs-core/src/van.js
var protoOf = Object.getPrototypeOf;
var changedStates, derivedStates, curDeps, curNewDerives, alwaysConnectedDom = { isConnected: 1 };
var gcCycleInMs = 1e3, statesToGc, propSetterCache = {};
var objProto = protoOf(alwaysConnectedDom), funcProto = protoOf(protoOf), _undefined;
var addAndScheduleOnFirst = (set, s, f, waitMs) => (set ?? (waitMs ? setTimeout(f, waitMs) : queueMicrotask(f), /* @__PURE__ */ new Set())).add(s);
var runAndCaptureDeps = (f, deps, arg) => {
	let prevDeps = curDeps;
	curDeps = deps;
	try {
		return f(arg);
	} catch (e) {
		console.error(e);
		return arg;
	} finally {
		curDeps = prevDeps;
	}
};
var keepConnected = (l) => l.filter((b) => b._dom?.isConnected);
var addStatesToGc = (d) => statesToGc = addAndScheduleOnFirst(statesToGc, d, () => {
	for (let s of statesToGc) s._bindings = keepConnected(s._bindings), s._listeners = keepConnected(s._listeners);
	statesToGc = _undefined;
}, gcCycleInMs);
var stateProto = {
	get val() {
		curDeps?._getters?.add(this);
		return this.rawVal;
	},
	get oldVal() {
		curDeps?._getters?.add(this);
		return this._oldVal;
	},
	set val(v) {
		curDeps?._setters?.add(this);
		if (v !== this.rawVal) {
			this.rawVal = v;
			this._bindings.length + this._listeners.length ? (derivedStates?.add(this), changedStates = addAndScheduleOnFirst(changedStates, this, updateDoms)) : this._oldVal = v;
		}
	}
};
var state = (initVal) => ({
	__proto__: stateProto,
	rawVal: initVal,
	_oldVal: initVal,
	_bindings: [],
	_listeners: []
});
var bind = (f, dom) => {
	let deps = {
		_getters: /* @__PURE__ */ new Set(),
		_setters: /* @__PURE__ */ new Set()
	}, binding = { f }, prevNewDerives = curNewDerives;
	curNewDerives = [];
	let newDom = runAndCaptureDeps(f, deps, dom);
	newDom = (newDom ?? document).nodeType ? newDom : new Text(newDom);
	for (let d of deps._getters) deps._setters.has(d) || (addStatesToGc(d), d._bindings.push(binding));
	for (let l of curNewDerives) l._dom = newDom;
	curNewDerives = prevNewDerives;
	return binding._dom = newDom;
};
var derive = (f, s = state(), dom) => {
	let deps = {
		_getters: /* @__PURE__ */ new Set(),
		_setters: /* @__PURE__ */ new Set()
	}, listener = {
		f,
		s
	};
	listener._dom = dom ?? curNewDerives?.push(listener) ?? alwaysConnectedDom;
	s.val = runAndCaptureDeps(f, deps, s.rawVal);
	for (let d of deps._getters) deps._setters.has(d) || (addStatesToGc(d), d._listeners.push(listener));
	return s;
};
var add = (dom, ...children) => {
	for (let c of children.flat(Infinity)) {
		let protoOfC = protoOf(c ?? 0);
		let child = protoOfC === stateProto ? bind(() => c.val) : protoOfC === funcProto ? bind(c) : c;
		child != _undefined && dom.append(child);
	}
	return dom;
};
var tag = (ns, name, ...args) => {
	let [{ is, ...props }, ...children] = protoOf(args[0] ?? 0) === objProto ? args : [{}, ...args];
	let dom = ns ? document.createElementNS(ns, name, { is }) : document.createElement(name, { is });
	for (let [k, v] of Object.entries(props)) {
		let getPropDescriptor = (proto) => proto ? Object.getOwnPropertyDescriptor(proto, k) ?? getPropDescriptor(protoOf(proto)) : _undefined;
		let cacheKey = name + "," + k;
		let propSetter = propSetterCache[cacheKey] ??= getPropDescriptor(protoOf(dom))?.set ?? 0;
		let setter = k.startsWith("on") ? (v, oldV) => {
			let event = k.slice(2);
			dom.removeEventListener(event, oldV);
			dom.addEventListener(event, v);
		} : propSetter ? propSetter.bind(dom) : dom.setAttribute.bind(dom, k);
		let protoOfV = protoOf(v ?? 0);
		k.startsWith("on") || protoOfV === funcProto && (v = derive(v), protoOfV = stateProto);
		protoOfV === stateProto ? bind(() => (setter(v.val, v._oldVal), dom)) : setter(v);
	}
	return add(dom, children);
};
var handler = (ns) => ({ get: (_, name) => tag.bind(_undefined, ns, name) });
var update = (dom, newDom) => newDom ? newDom !== dom && dom.replaceWith(newDom) : dom.remove();
var updateDoms = () => {
	let iter = 0, derivedStatesArray = [...changedStates].filter((s) => s.rawVal !== s._oldVal);
	do {
		derivedStates = /* @__PURE__ */ new Set();
		for (let l of new Set(derivedStatesArray.flatMap((s) => s._listeners = keepConnected(s._listeners)))) derive(l.f, l.s, l._dom), l._dom = _undefined;
	} while (++iter < 100 && (derivedStatesArray = [...derivedStates]).length);
	let changedStatesArray = [...changedStates].filter((s) => s.rawVal !== s._oldVal);
	changedStates = _undefined;
	for (let b of new Set(changedStatesArray.flatMap((s) => s._bindings = keepConnected(s._bindings)))) update(b._dom, bind(b.f, b._dom)), b._dom = _undefined;
	for (let s of changedStatesArray) s._oldVal = s.rawVal;
};
var van_default = {
	tags: new Proxy((ns) => new Proxy(tag, handler(ns)), handler()),
	hydrate: (dom, f) => update(dom, bind(f, dom)),
	add,
	state,
	derive
};
//#endregion
//#region node_modules/sortablejs/modular/sortable.esm.js
/**!
* Sortable 1.15.7
* @author	RubaXa   <trash@rubaxa.org>
* @author	owenm    <owen23355@gmail.com>
* @license MIT
*/
function _defineProperty(e, r, t) {
	return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[r] = t, e;
}
function _extends() {
	return _extends = Object.assign ? Object.assign.bind() : function(n) {
		for (var e = 1; e < arguments.length; e++) {
			var t = arguments[e];
			for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
		}
		return n;
	}, _extends.apply(null, arguments);
}
function ownKeys(e, r) {
	var t = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var o = Object.getOwnPropertySymbols(e);
		r && (o = o.filter(function(r) {
			return Object.getOwnPropertyDescriptor(e, r).enumerable;
		})), t.push.apply(t, o);
	}
	return t;
}
function _objectSpread2(e) {
	for (var r = 1; r < arguments.length; r++) {
		var t = null != arguments[r] ? arguments[r] : {};
		r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
			_defineProperty(e, r, t[r]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
			Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
		});
	}
	return e;
}
function _objectWithoutProperties(e, t) {
	if (null == e) return {};
	var o, r, i = _objectWithoutPropertiesLoose(e, t);
	if (Object.getOwnPropertySymbols) {
		var n = Object.getOwnPropertySymbols(e);
		for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
	}
	return i;
}
function _objectWithoutPropertiesLoose(r, e) {
	if (null == r) return {};
	var t = {};
	for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
		if (-1 !== e.indexOf(n)) continue;
		t[n] = r[n];
	}
	return t;
}
function _toPrimitive(t, r) {
	if ("object" != typeof t || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r || "default");
		if ("object" != typeof i) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}
function _toPropertyKey(t) {
	var i = _toPrimitive(t, "string");
	return "symbol" == typeof i ? i : i + "";
}
function _typeof(o) {
	"@babel/helpers - typeof";
	return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof(o);
}
var version = "1.15.7";
function userAgent(pattern) {
	if (typeof window !== "undefined" && window.navigator) return !!/*@__PURE__*/ navigator.userAgent.match(pattern);
}
var IE11OrLess = userAgent(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i);
var Edge = userAgent(/Edge/i);
var FireFox = userAgent(/firefox/i);
var Safari = userAgent(/safari/i) && !userAgent(/chrome/i) && !userAgent(/android/i);
var IOS = userAgent(/iP(ad|od|hone)/i);
var ChromeForAndroid = userAgent(/chrome/i) && userAgent(/android/i);
var captureMode = {
	capture: false,
	passive: false
};
function on(el, event, fn) {
	el.addEventListener(event, fn, !IE11OrLess && captureMode);
}
function off(el, event, fn) {
	el.removeEventListener(event, fn, !IE11OrLess && captureMode);
}
function matches(el, selector) {
	if (!selector) return;
	selector[0] === ">" && (selector = selector.substring(1));
	if (el) try {
		if (el.matches) return el.matches(selector);
		else if (el.msMatchesSelector) return el.msMatchesSelector(selector);
		else if (el.webkitMatchesSelector) return el.webkitMatchesSelector(selector);
	} catch (_) {
		return false;
	}
	return false;
}
function getParentOrHost(el) {
	return el.host && el !== document && el.host.nodeType && el.host !== el ? el.host : el.parentNode;
}
function closest(el, selector, ctx, includeCTX) {
	if (el) {
		ctx = ctx || document;
		do {
			if (selector != null && (selector[0] === ">" ? el.parentNode === ctx && matches(el, selector) : matches(el, selector)) || includeCTX && el === ctx) return el;
			if (el === ctx) break;
		} while (el = getParentOrHost(el));
	}
	return null;
}
var R_SPACE = /\s+/g;
function toggleClass(el, name, state) {
	if (el && name) if (el.classList) el.classList[state ? "add" : "remove"](name);
	else el.className = ((" " + el.className + " ").replace(R_SPACE, " ").replace(" " + name + " ", " ") + (state ? " " + name : "")).replace(R_SPACE, " ");
}
function css(el, prop, val) {
	var style = el && el.style;
	if (style) if (val === void 0) {
		if (document.defaultView && document.defaultView.getComputedStyle) val = document.defaultView.getComputedStyle(el, "");
		else if (el.currentStyle) val = el.currentStyle;
		return prop === void 0 ? val : val[prop];
	} else {
		if (!(prop in style) && prop.indexOf("webkit") === -1) prop = "-webkit-" + prop;
		style[prop] = val + (typeof val === "string" ? "" : "px");
	}
}
function matrix(el, selfOnly) {
	var appliedTransforms = "";
	if (typeof el === "string") appliedTransforms = el;
	else do {
		var transform = css(el, "transform");
		if (transform && transform !== "none") appliedTransforms = transform + " " + appliedTransforms;
	} while (!selfOnly && (el = el.parentNode));
	var matrixFn = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
	return matrixFn && new matrixFn(appliedTransforms);
}
function find(ctx, tagName, iterator) {
	if (ctx) {
		var list = ctx.getElementsByTagName(tagName), i = 0, n = list.length;
		if (iterator) for (; i < n; i++) iterator(list[i], i);
		return list;
	}
	return [];
}
function getWindowScrollingElement() {
	var scrollingElement = document.scrollingElement;
	if (scrollingElement) return scrollingElement;
	else return document.documentElement;
}
/**
* Returns the "bounding client rect" of given element
* @param  {HTMLElement} el                       The element whose boundingClientRect is wanted
* @param  {[Boolean]} relativeToContainingBlock  Whether the rect should be relative to the containing block of (including) the container
* @param  {[Boolean]} relativeToNonStaticParent  Whether the rect should be relative to the relative parent of (including) the contaienr
* @param  {[Boolean]} undoScale                  Whether the container's scale() should be undone
* @param  {[HTMLElement]} container              The parent the element will be placed in
* @return {Object}                               The boundingClientRect of el, with specified adjustments
*/
function getRect(el, relativeToContainingBlock, relativeToNonStaticParent, undoScale, container) {
	if (!el.getBoundingClientRect && el !== window) return;
	var elRect, top, left, bottom, right, height, width;
	if (el !== window && el.parentNode && el !== getWindowScrollingElement()) {
		elRect = el.getBoundingClientRect();
		top = elRect.top;
		left = elRect.left;
		bottom = elRect.bottom;
		right = elRect.right;
		height = elRect.height;
		width = elRect.width;
	} else {
		top = 0;
		left = 0;
		bottom = window.innerHeight;
		right = window.innerWidth;
		height = window.innerHeight;
		width = window.innerWidth;
	}
	if ((relativeToContainingBlock || relativeToNonStaticParent) && el !== window) {
		container = container || el.parentNode;
		if (!IE11OrLess) do
			if (container && container.getBoundingClientRect && (css(container, "transform") !== "none" || relativeToNonStaticParent && css(container, "position") !== "static")) {
				var containerRect = container.getBoundingClientRect();
				top -= containerRect.top + parseInt(css(container, "border-top-width"));
				left -= containerRect.left + parseInt(css(container, "border-left-width"));
				bottom = top + elRect.height;
				right = left + elRect.width;
				break;
			}
		while (container = container.parentNode);
	}
	if (undoScale && el !== window) {
		var elMatrix = matrix(container || el), scaleX = elMatrix && elMatrix.a, scaleY = elMatrix && elMatrix.d;
		if (elMatrix) {
			top /= scaleY;
			left /= scaleX;
			width /= scaleX;
			height /= scaleY;
			bottom = top + height;
			right = left + width;
		}
	}
	return {
		top,
		left,
		bottom,
		right,
		width,
		height
	};
}
/**
* Checks if a side of an element is scrolled past a side of its parents
* @param  {HTMLElement}  el           The element who's side being scrolled out of view is in question
* @param  {String}       elSide       Side of the element in question ('top', 'left', 'right', 'bottom')
* @param  {String}       parentSide   Side of the parent in question ('top', 'left', 'right', 'bottom')
* @return {HTMLElement}               The parent scroll element that the el's side is scrolled past, or null if there is no such element
*/
function isScrolledPast(el, elSide, parentSide) {
	var parent = getParentAutoScrollElement(el, true), elSideVal = getRect(el)[elSide];
	while (parent) {
		var parentSideVal = getRect(parent)[parentSide], visible = void 0;
		if (parentSide === "top" || parentSide === "left") visible = elSideVal >= parentSideVal;
		else visible = elSideVal <= parentSideVal;
		if (!visible) return parent;
		if (parent === getWindowScrollingElement()) break;
		parent = getParentAutoScrollElement(parent, false);
	}
	return false;
}
/**
* Gets nth child of el, ignoring hidden children, sortable's elements (does not ignore clone if it's visible)
* and non-draggable elements
* @param  {HTMLElement} el       The parent element
* @param  {Number} childNum      The index of the child
* @param  {Object} options       Parent Sortable's options
* @return {HTMLElement}          The child at index childNum, or null if not found
*/
function getChild(el, childNum, options, includeDragEl) {
	var currentChild = 0, i = 0, children = el.children;
	while (i < children.length) {
		if (children[i].style.display !== "none" && children[i] !== Sortable.ghost && (includeDragEl || children[i] !== Sortable.dragged) && closest(children[i], options.draggable, el, false)) {
			if (currentChild === childNum) return children[i];
			currentChild++;
		}
		i++;
	}
	return null;
}
/**
* Gets the last child in the el, ignoring ghostEl or invisible elements (clones)
* @param  {HTMLElement} el       Parent element
* @param  {selector} selector    Any other elements that should be ignored
* @return {HTMLElement}          The last child, ignoring ghostEl
*/
function lastChild(el, selector) {
	var last = el.lastElementChild;
	while (last && (last === Sortable.ghost || css(last, "display") === "none" || selector && !matches(last, selector))) last = last.previousElementSibling;
	return last || null;
}
/**
* Returns the index of an element within its parent for a selected set of
* elements
* @param  {HTMLElement} el
* @param  {selector} selector
* @return {number}
*/
function index(el, selector) {
	var index = 0;
	if (!el || !el.parentNode) return -1;
	while (el = el.previousElementSibling) if (el.nodeName.toUpperCase() !== "TEMPLATE" && el !== Sortable.clone && (!selector || matches(el, selector))) index++;
	return index;
}
/**
* Returns the scroll offset of the given element, added with all the scroll offsets of parent elements.
* The value is returned in real pixels.
* @param  {HTMLElement} el
* @return {Array}             Offsets in the format of [left, top]
*/
function getRelativeScrollOffset(el) {
	var offsetLeft = 0, offsetTop = 0, winScroller = getWindowScrollingElement();
	if (el) do {
		var elMatrix = matrix(el), scaleX = elMatrix.a, scaleY = elMatrix.d;
		offsetLeft += el.scrollLeft * scaleX;
		offsetTop += el.scrollTop * scaleY;
	} while (el !== winScroller && (el = el.parentNode));
	return [offsetLeft, offsetTop];
}
/**
* Returns the index of the object within the given array
* @param  {Array} arr   Array that may or may not hold the object
* @param  {Object} obj  An object that has a key-value pair unique to and identical to a key-value pair in the object you want to find
* @return {Number}      The index of the object in the array, or -1
*/
function indexOfObject(arr, obj) {
	for (var i in arr) {
		if (!arr.hasOwnProperty(i)) continue;
		for (var key in obj) if (obj.hasOwnProperty(key) && obj[key] === arr[i][key]) return Number(i);
	}
	return -1;
}
function getParentAutoScrollElement(el, includeSelf) {
	if (!el || !el.getBoundingClientRect) return getWindowScrollingElement();
	var elem = el;
	var gotSelf = false;
	do
		if (elem.clientWidth < elem.scrollWidth || elem.clientHeight < elem.scrollHeight) {
			var elemCSS = css(elem);
			if (elem.clientWidth < elem.scrollWidth && (elemCSS.overflowX == "auto" || elemCSS.overflowX == "scroll") || elem.clientHeight < elem.scrollHeight && (elemCSS.overflowY == "auto" || elemCSS.overflowY == "scroll")) {
				if (!elem.getBoundingClientRect || elem === document.body) return getWindowScrollingElement();
				if (gotSelf || includeSelf) return elem;
				gotSelf = true;
			}
		}
	while (elem = elem.parentNode);
	return getWindowScrollingElement();
}
function extend(dst, src) {
	if (dst && src) {
		for (var key in src) if (src.hasOwnProperty(key)) dst[key] = src[key];
	}
	return dst;
}
function isRectEqual(rect1, rect2) {
	return Math.round(rect1.top) === Math.round(rect2.top) && Math.round(rect1.left) === Math.round(rect2.left) && Math.round(rect1.height) === Math.round(rect2.height) && Math.round(rect1.width) === Math.round(rect2.width);
}
var _throttleTimeout;
function throttle(callback, ms) {
	return function() {
		if (!_throttleTimeout) {
			var args = arguments, _this = this;
			if (args.length === 1) callback.call(_this, args[0]);
			else callback.apply(_this, args);
			_throttleTimeout = setTimeout(function() {
				_throttleTimeout = void 0;
			}, ms);
		}
	};
}
function cancelThrottle() {
	clearTimeout(_throttleTimeout);
	_throttleTimeout = void 0;
}
function scrollBy(el, x, y) {
	el.scrollLeft += x;
	el.scrollTop += y;
}
function clone(el) {
	var Polymer = window.Polymer;
	var $ = window.jQuery || window.Zepto;
	if (Polymer && Polymer.dom) return Polymer.dom(el).cloneNode(true);
	else if ($) return $(el).clone(true)[0];
	else return el.cloneNode(true);
}
function getChildContainingRectFromElement(container, options, ghostEl) {
	var rect = {};
	Array.from(container.children).forEach(function(child) {
		var _rect$left, _rect$top, _rect$right, _rect$bottom;
		if (!closest(child, options.draggable, container, false) || child.animated || child === ghostEl) return;
		var childRect = getRect(child);
		rect.left = Math.min((_rect$left = rect.left) !== null && _rect$left !== void 0 ? _rect$left : Infinity, childRect.left);
		rect.top = Math.min((_rect$top = rect.top) !== null && _rect$top !== void 0 ? _rect$top : Infinity, childRect.top);
		rect.right = Math.max((_rect$right = rect.right) !== null && _rect$right !== void 0 ? _rect$right : -Infinity, childRect.right);
		rect.bottom = Math.max((_rect$bottom = rect.bottom) !== null && _rect$bottom !== void 0 ? _rect$bottom : -Infinity, childRect.bottom);
	});
	rect.width = rect.right - rect.left;
	rect.height = rect.bottom - rect.top;
	rect.x = rect.left;
	rect.y = rect.top;
	return rect;
}
var expando = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function AnimationStateManager() {
	var animationStates = [], animationCallbackId;
	return {
		captureAnimationState: function captureAnimationState() {
			animationStates = [];
			if (!this.options.animation) return;
			[].slice.call(this.el.children).forEach(function(child) {
				if (css(child, "display") === "none" || child === Sortable.ghost) return;
				animationStates.push({
					target: child,
					rect: getRect(child)
				});
				var fromRect = _objectSpread2({}, animationStates[animationStates.length - 1].rect);
				if (child.thisAnimationDuration) {
					var childMatrix = matrix(child, true);
					if (childMatrix) {
						fromRect.top -= childMatrix.f;
						fromRect.left -= childMatrix.e;
					}
				}
				child.fromRect = fromRect;
			});
		},
		addAnimationState: function addAnimationState(state) {
			animationStates.push(state);
		},
		removeAnimationState: function removeAnimationState(target) {
			animationStates.splice(indexOfObject(animationStates, { target }), 1);
		},
		animateAll: function animateAll(callback) {
			var _this = this;
			if (!this.options.animation) {
				clearTimeout(animationCallbackId);
				if (typeof callback === "function") callback();
				return;
			}
			var animating = false, animationTime = 0;
			animationStates.forEach(function(state) {
				var time = 0, target = state.target, fromRect = target.fromRect, toRect = getRect(target), prevFromRect = target.prevFromRect, prevToRect = target.prevToRect, animatingRect = state.rect, targetMatrix = matrix(target, true);
				if (targetMatrix) {
					toRect.top -= targetMatrix.f;
					toRect.left -= targetMatrix.e;
				}
				target.toRect = toRect;
				if (target.thisAnimationDuration) {
					if (isRectEqual(prevFromRect, toRect) && !isRectEqual(fromRect, toRect) && (animatingRect.top - toRect.top) / (animatingRect.left - toRect.left) === (fromRect.top - toRect.top) / (fromRect.left - toRect.left)) time = calculateRealTime(animatingRect, prevFromRect, prevToRect, _this.options);
				}
				if (!isRectEqual(toRect, fromRect)) {
					target.prevFromRect = fromRect;
					target.prevToRect = toRect;
					if (!time) time = _this.options.animation;
					_this.animate(target, animatingRect, toRect, time);
				}
				if (time) {
					animating = true;
					animationTime = Math.max(animationTime, time);
					clearTimeout(target.animationResetTimer);
					target.animationResetTimer = setTimeout(function() {
						target.animationTime = 0;
						target.prevFromRect = null;
						target.fromRect = null;
						target.prevToRect = null;
						target.thisAnimationDuration = null;
					}, time);
					target.thisAnimationDuration = time;
				}
			});
			clearTimeout(animationCallbackId);
			if (!animating) {
				if (typeof callback === "function") callback();
			} else animationCallbackId = setTimeout(function() {
				if (typeof callback === "function") callback();
			}, animationTime);
			animationStates = [];
		},
		animate: function animate(target, currentRect, toRect, duration) {
			if (duration) {
				css(target, "transition", "");
				css(target, "transform", "");
				var elMatrix = matrix(this.el), scaleX = elMatrix && elMatrix.a, scaleY = elMatrix && elMatrix.d, translateX = (currentRect.left - toRect.left) / (scaleX || 1), translateY = (currentRect.top - toRect.top) / (scaleY || 1);
				target.animatingX = !!translateX;
				target.animatingY = !!translateY;
				css(target, "transform", "translate3d(" + translateX + "px," + translateY + "px,0)");
				this.forRepaintDummy = repaint(target);
				css(target, "transition", "transform " + duration + "ms" + (this.options.easing ? " " + this.options.easing : ""));
				css(target, "transform", "translate3d(0,0,0)");
				typeof target.animated === "number" && clearTimeout(target.animated);
				target.animated = setTimeout(function() {
					css(target, "transition", "");
					css(target, "transform", "");
					target.animated = false;
					target.animatingX = false;
					target.animatingY = false;
				}, duration);
			}
		}
	};
}
function repaint(target) {
	return target.offsetWidth;
}
function calculateRealTime(animatingRect, fromRect, toRect, options) {
	return Math.sqrt(Math.pow(fromRect.top - animatingRect.top, 2) + Math.pow(fromRect.left - animatingRect.left, 2)) / Math.sqrt(Math.pow(fromRect.top - toRect.top, 2) + Math.pow(fromRect.left - toRect.left, 2)) * options.animation;
}
var plugins = [];
var defaults = { initializeByDefault: true };
var PluginManager = {
	mount: function mount(plugin) {
		for (var option in defaults) if (defaults.hasOwnProperty(option) && !(option in plugin)) plugin[option] = defaults[option];
		plugins.forEach(function(p) {
			if (p.pluginName === plugin.pluginName) throw "Sortable: Cannot mount plugin ".concat(plugin.pluginName, " more than once");
		});
		plugins.push(plugin);
	},
	pluginEvent: function pluginEvent(eventName, sortable, evt) {
		var _this = this;
		this.eventCanceled = false;
		evt.cancel = function() {
			_this.eventCanceled = true;
		};
		var eventNameGlobal = eventName + "Global";
		plugins.forEach(function(plugin) {
			if (!sortable[plugin.pluginName]) return;
			if (sortable[plugin.pluginName][eventNameGlobal]) sortable[plugin.pluginName][eventNameGlobal](_objectSpread2({ sortable }, evt));
			if (sortable.options[plugin.pluginName] && sortable[plugin.pluginName][eventName]) sortable[plugin.pluginName][eventName](_objectSpread2({ sortable }, evt));
		});
	},
	initializePlugins: function initializePlugins(sortable, el, defaults, options) {
		plugins.forEach(function(plugin) {
			var pluginName = plugin.pluginName;
			if (!sortable.options[pluginName] && !plugin.initializeByDefault) return;
			var initialized = new plugin(sortable, el, sortable.options);
			initialized.sortable = sortable;
			initialized.options = sortable.options;
			sortable[pluginName] = initialized;
			_extends(defaults, initialized.defaults);
		});
		for (var option in sortable.options) {
			if (!sortable.options.hasOwnProperty(option)) continue;
			var modified = this.modifyOption(sortable, option, sortable.options[option]);
			if (typeof modified !== "undefined") sortable.options[option] = modified;
		}
	},
	getEventProperties: function getEventProperties(name, sortable) {
		var eventProperties = {};
		plugins.forEach(function(plugin) {
			if (typeof plugin.eventProperties !== "function") return;
			_extends(eventProperties, plugin.eventProperties.call(sortable[plugin.pluginName], name));
		});
		return eventProperties;
	},
	modifyOption: function modifyOption(sortable, name, value) {
		var modifiedValue;
		plugins.forEach(function(plugin) {
			if (!sortable[plugin.pluginName]) return;
			if (plugin.optionListeners && typeof plugin.optionListeners[name] === "function") modifiedValue = plugin.optionListeners[name].call(sortable[plugin.pluginName], value);
		});
		return modifiedValue;
	}
};
function dispatchEvent(_ref) {
	var sortable = _ref.sortable, rootEl = _ref.rootEl, name = _ref.name, targetEl = _ref.targetEl, cloneEl = _ref.cloneEl, toEl = _ref.toEl, fromEl = _ref.fromEl, oldIndex = _ref.oldIndex, newIndex = _ref.newIndex, oldDraggableIndex = _ref.oldDraggableIndex, newDraggableIndex = _ref.newDraggableIndex, originalEvent = _ref.originalEvent, putSortable = _ref.putSortable, extraEventProperties = _ref.extraEventProperties;
	sortable = sortable || rootEl && rootEl[expando];
	if (!sortable) return;
	var evt, options = sortable.options, onName = "on" + name.charAt(0).toUpperCase() + name.substr(1);
	if (window.CustomEvent && !IE11OrLess && !Edge) evt = new CustomEvent(name, {
		bubbles: true,
		cancelable: true
	});
	else {
		evt = document.createEvent("Event");
		evt.initEvent(name, true, true);
	}
	evt.to = toEl || rootEl;
	evt.from = fromEl || rootEl;
	evt.item = targetEl || rootEl;
	evt.clone = cloneEl;
	evt.oldIndex = oldIndex;
	evt.newIndex = newIndex;
	evt.oldDraggableIndex = oldDraggableIndex;
	evt.newDraggableIndex = newDraggableIndex;
	evt.originalEvent = originalEvent;
	evt.pullMode = putSortable ? putSortable.lastPutMode : void 0;
	var allEventProperties = _objectSpread2(_objectSpread2({}, extraEventProperties), PluginManager.getEventProperties(name, sortable));
	for (var option in allEventProperties) evt[option] = allEventProperties[option];
	if (rootEl) rootEl.dispatchEvent(evt);
	if (options[onName]) options[onName].call(sortable, evt);
}
var _excluded = ["evt"];
var pluginEvent = function pluginEvent(eventName, sortable) {
	var _ref = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, originalEvent = _ref.evt, data = _objectWithoutProperties(_ref, _excluded);
	PluginManager.pluginEvent.bind(Sortable)(eventName, sortable, _objectSpread2({
		dragEl,
		parentEl,
		ghostEl,
		rootEl,
		nextEl,
		lastDownEl,
		cloneEl,
		cloneHidden,
		dragStarted: moved,
		putSortable,
		activeSortable: Sortable.active,
		originalEvent,
		oldIndex,
		oldDraggableIndex,
		newIndex,
		newDraggableIndex,
		hideGhostForTarget: _hideGhostForTarget,
		unhideGhostForTarget: _unhideGhostForTarget,
		cloneNowHidden: function cloneNowHidden() {
			cloneHidden = true;
		},
		cloneNowShown: function cloneNowShown() {
			cloneHidden = false;
		},
		dispatchSortableEvent: function dispatchSortableEvent(name) {
			_dispatchEvent({
				sortable,
				name,
				originalEvent
			});
		}
	}, data));
};
function _dispatchEvent(info) {
	dispatchEvent(_objectSpread2({
		putSortable,
		cloneEl,
		targetEl: dragEl,
		rootEl,
		oldIndex,
		oldDraggableIndex,
		newIndex,
		newDraggableIndex
	}, info));
}
var dragEl, parentEl, ghostEl, rootEl, nextEl, lastDownEl, cloneEl, cloneHidden, oldIndex, newIndex, oldDraggableIndex, newDraggableIndex, activeGroup, putSortable, awaitingDragStarted = false, ignoreNextClick = false, sortables = [], tapEvt, touchEvt, lastDx, lastDy, tapDistanceLeft, tapDistanceTop, moved, lastTarget, lastDirection, pastFirstInvertThresh = false, isCircumstantialInvert = false, targetMoveDistance, ghostRelativeParent, ghostRelativeParentInitialScroll = [], _silent = false, savedInputChecked = [];
/** @const */
var documentExists = typeof document !== "undefined", PositionGhostAbsolutely = IOS, CSSFloatProperty = Edge || IE11OrLess ? "cssFloat" : "float", supportDraggable = documentExists && !ChromeForAndroid && !IOS && "draggable" in document.createElement("div"), supportCssPointerEvents = function() {
	if (!documentExists) return;
	if (IE11OrLess) return false;
	var el = document.createElement("x");
	el.style.cssText = "pointer-events:auto";
	return el.style.pointerEvents === "auto";
}(), _detectDirection = function _detectDirection(el, options) {
	var elCSS = css(el), elWidth = parseInt(elCSS.width) - parseInt(elCSS.paddingLeft) - parseInt(elCSS.paddingRight) - parseInt(elCSS.borderLeftWidth) - parseInt(elCSS.borderRightWidth), child1 = getChild(el, 0, options), child2 = getChild(el, 1, options), firstChildCSS = child1 && css(child1), secondChildCSS = child2 && css(child2), firstChildWidth = firstChildCSS && parseInt(firstChildCSS.marginLeft) + parseInt(firstChildCSS.marginRight) + getRect(child1).width, secondChildWidth = secondChildCSS && parseInt(secondChildCSS.marginLeft) + parseInt(secondChildCSS.marginRight) + getRect(child2).width;
	if (elCSS.display === "flex") return elCSS.flexDirection === "column" || elCSS.flexDirection === "column-reverse" ? "vertical" : "horizontal";
	if (elCSS.display === "grid") return elCSS.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
	if (child1 && firstChildCSS["float"] && firstChildCSS["float"] !== "none") {
		var touchingSideChild2 = firstChildCSS["float"] === "left" ? "left" : "right";
		return child2 && (secondChildCSS.clear === "both" || secondChildCSS.clear === touchingSideChild2) ? "vertical" : "horizontal";
	}
	return child1 && (firstChildCSS.display === "block" || firstChildCSS.display === "flex" || firstChildCSS.display === "table" || firstChildCSS.display === "grid" || firstChildWidth >= elWidth && elCSS[CSSFloatProperty] === "none" || child2 && elCSS[CSSFloatProperty] === "none" && firstChildWidth + secondChildWidth > elWidth) ? "vertical" : "horizontal";
}, _dragElInRowColumn = function _dragElInRowColumn(dragRect, targetRect, vertical) {
	var dragElS1Opp = vertical ? dragRect.left : dragRect.top, dragElS2Opp = vertical ? dragRect.right : dragRect.bottom, dragElOppLength = vertical ? dragRect.width : dragRect.height, targetS1Opp = vertical ? targetRect.left : targetRect.top, targetS2Opp = vertical ? targetRect.right : targetRect.bottom, targetOppLength = vertical ? targetRect.width : targetRect.height;
	return dragElS1Opp === targetS1Opp || dragElS2Opp === targetS2Opp || dragElS1Opp + dragElOppLength / 2 === targetS1Opp + targetOppLength / 2;
}, _detectNearestEmptySortable = function _detectNearestEmptySortable(x, y) {
	var ret;
	sortables.some(function(sortable) {
		var threshold = sortable[expando].options.emptyInsertThreshold;
		if (!threshold || lastChild(sortable)) return;
		var rect = getRect(sortable), insideHorizontally = x >= rect.left - threshold && x <= rect.right + threshold, insideVertically = y >= rect.top - threshold && y <= rect.bottom + threshold;
		if (insideHorizontally && insideVertically) return ret = sortable;
	});
	return ret;
}, _prepareGroup = function _prepareGroup(options) {
	function toFn(value, pull) {
		return function(to, from, dragEl, evt) {
			var sameGroup = to.options.group.name && from.options.group.name && to.options.group.name === from.options.group.name;
			if (value == null && (pull || sameGroup)) return true;
			else if (value == null || value === false) return false;
			else if (pull && value === "clone") return value;
			else if (typeof value === "function") return toFn(value(to, from, dragEl, evt), pull)(to, from, dragEl, evt);
			else {
				var otherGroup = (pull ? to : from).options.group.name;
				return value === true || typeof value === "string" && value === otherGroup || value.join && value.indexOf(otherGroup) > -1;
			}
		};
	}
	var group = {};
	var originalGroup = options.group;
	if (!originalGroup || _typeof(originalGroup) != "object") originalGroup = { name: originalGroup };
	group.name = originalGroup.name;
	group.checkPull = toFn(originalGroup.pull, true);
	group.checkPut = toFn(originalGroup.put);
	group.revertClone = originalGroup.revertClone;
	options.group = group;
}, _hideGhostForTarget = function _hideGhostForTarget() {
	if (!supportCssPointerEvents && ghostEl) css(ghostEl, "display", "none");
}, _unhideGhostForTarget = function _unhideGhostForTarget() {
	if (!supportCssPointerEvents && ghostEl) css(ghostEl, "display", "");
};
if (documentExists && !ChromeForAndroid) document.addEventListener("click", function(evt) {
	if (ignoreNextClick) {
		evt.preventDefault();
		evt.stopPropagation && evt.stopPropagation();
		evt.stopImmediatePropagation && evt.stopImmediatePropagation();
		ignoreNextClick = false;
		return false;
	}
}, true);
var nearestEmptyInsertDetectEvent = function nearestEmptyInsertDetectEvent(evt) {
	if (dragEl) {
		evt = evt.touches ? evt.touches[0] : evt;
		var nearest = _detectNearestEmptySortable(evt.clientX, evt.clientY);
		if (nearest) {
			var event = {};
			for (var i in evt) if (evt.hasOwnProperty(i)) event[i] = evt[i];
			event.target = event.rootEl = nearest;
			event.preventDefault = void 0;
			event.stopPropagation = void 0;
			nearest[expando]._onDragOver(event);
		}
	}
};
var _checkOutsideTargetEl = function _checkOutsideTargetEl(evt) {
	if (dragEl) dragEl.parentNode[expando]._isOutsideThisEl(evt.target);
};
/**
* @class  Sortable
* @param  {HTMLElement}  el
* @param  {Object}       [options]
*/
function Sortable(el, options) {
	if (!(el && el.nodeType && el.nodeType === 1)) throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(el));
	this.el = el;
	this.options = options = _extends({}, options);
	el[expando] = this;
	var defaults = {
		group: null,
		sort: true,
		disabled: false,
		store: null,
		handle: null,
		draggable: /^[uo]l$/i.test(el.nodeName) ? ">li" : ">*",
		swapThreshold: 1,
		invertSwap: false,
		invertedSwapThreshold: null,
		removeCloneOnHide: true,
		direction: function direction() {
			return _detectDirection(el, this.options);
		},
		ghostClass: "sortable-ghost",
		chosenClass: "sortable-chosen",
		dragClass: "sortable-drag",
		ignore: "a, img",
		filter: null,
		preventOnFilter: true,
		animation: 0,
		easing: null,
		setData: function setData(dataTransfer, dragEl) {
			dataTransfer.setData("Text", dragEl.textContent);
		},
		dropBubble: false,
		dragoverBubble: false,
		dataIdAttr: "data-id",
		delay: 0,
		delayOnTouchOnly: false,
		touchStartThreshold: (Number.parseInt ? Number : window).parseInt(window.devicePixelRatio, 10) || 1,
		forceFallback: false,
		fallbackClass: "sortable-fallback",
		fallbackOnBody: false,
		fallbackTolerance: 0,
		fallbackOffset: {
			x: 0,
			y: 0
		},
		supportPointer: Sortable.supportPointer !== false && "PointerEvent" in window && (!Safari || IOS),
		emptyInsertThreshold: 5
	};
	PluginManager.initializePlugins(this, el, defaults);
	for (var name in defaults) !(name in options) && (options[name] = defaults[name]);
	_prepareGroup(options);
	for (var fn in this) if (fn.charAt(0) === "_" && typeof this[fn] === "function") this[fn] = this[fn].bind(this);
	this.nativeDraggable = options.forceFallback ? false : supportDraggable;
	if (this.nativeDraggable) this.options.touchStartThreshold = 1;
	if (options.supportPointer) on(el, "pointerdown", this._onTapStart);
	else {
		on(el, "mousedown", this._onTapStart);
		on(el, "touchstart", this._onTapStart);
	}
	if (this.nativeDraggable) {
		on(el, "dragover", this);
		on(el, "dragenter", this);
	}
	sortables.push(this.el);
	options.store && options.store.get && this.sort(options.store.get(this) || []);
	_extends(this, AnimationStateManager());
}
Sortable.prototype = (/** @lends Sortable.prototype */ {
	constructor: Sortable,
	_isOutsideThisEl: function _isOutsideThisEl(target) {
		if (!this.el.contains(target) && target !== this.el) lastTarget = null;
	},
	_getDirection: function _getDirection(evt, target) {
		return typeof this.options.direction === "function" ? this.options.direction.call(this, evt, target, dragEl) : this.options.direction;
	},
	_onTapStart: function _onTapStart(evt) {
		if (!evt.cancelable) return;
		var _this = this, el = this.el, options = this.options, preventOnFilter = options.preventOnFilter, type = evt.type, touch = evt.touches && evt.touches[0] || evt.pointerType && evt.pointerType === "touch" && evt, target = (touch || evt).target, originalTarget = evt.target.shadowRoot && (evt.path && evt.path[0] || evt.composedPath && evt.composedPath()[0]) || target, filter = options.filter;
		_saveInputCheckedState(el);
		if (dragEl) return;
		if (/mousedown|pointerdown/.test(type) && evt.button !== 0 || options.disabled) return;
		if (originalTarget.isContentEditable) return;
		if (!this.nativeDraggable && Safari && target && target.tagName.toUpperCase() === "SELECT") return;
		target = closest(target, options.draggable, el, false);
		if (target && target.animated) return;
		if (lastDownEl === target) return;
		oldIndex = index(target);
		oldDraggableIndex = index(target, options.draggable);
		if (typeof filter === "function") {
			if (filter.call(this, evt, target, this)) {
				_dispatchEvent({
					sortable: _this,
					rootEl: originalTarget,
					name: "filter",
					targetEl: target,
					toEl: el,
					fromEl: el
				});
				pluginEvent("filter", _this, { evt });
				preventOnFilter && evt.preventDefault();
				return;
			}
		} else if (filter) {
			filter = filter.split(",").some(function(criteria) {
				criteria = closest(originalTarget, criteria.trim(), el, false);
				if (criteria) {
					_dispatchEvent({
						sortable: _this,
						rootEl: criteria,
						name: "filter",
						targetEl: target,
						fromEl: el,
						toEl: el
					});
					pluginEvent("filter", _this, { evt });
					return true;
				}
			});
			if (filter) {
				preventOnFilter && evt.preventDefault();
				return;
			}
		}
		if (options.handle && !closest(originalTarget, options.handle, el, false)) return;
		this._prepareDragStart(evt, touch, target);
	},
	_prepareDragStart: function _prepareDragStart(evt, touch, target) {
		var _this = this, el = _this.el, options = _this.options, ownerDocument = el.ownerDocument, dragStartFn;
		if (target && !dragEl && target.parentNode === el) {
			var dragRect = getRect(target);
			rootEl = el;
			dragEl = target;
			parentEl = dragEl.parentNode;
			nextEl = dragEl.nextSibling;
			lastDownEl = target;
			activeGroup = options.group;
			Sortable.dragged = dragEl;
			tapEvt = {
				target: dragEl,
				clientX: (touch || evt).clientX,
				clientY: (touch || evt).clientY
			};
			tapDistanceLeft = tapEvt.clientX - dragRect.left;
			tapDistanceTop = tapEvt.clientY - dragRect.top;
			this._lastX = (touch || evt).clientX;
			this._lastY = (touch || evt).clientY;
			dragEl.style["will-change"] = "all";
			dragStartFn = function dragStartFn() {
				pluginEvent("delayEnded", _this, { evt });
				if (Sortable.eventCanceled) {
					_this._onDrop();
					return;
				}
				_this._disableDelayedDragEvents();
				if (!FireFox && _this.nativeDraggable) dragEl.draggable = true;
				_this._triggerDragStart(evt, touch);
				_dispatchEvent({
					sortable: _this,
					name: "choose",
					originalEvent: evt
				});
				toggleClass(dragEl, options.chosenClass, true);
			};
			options.ignore.split(",").forEach(function(criteria) {
				find(dragEl, criteria.trim(), _disableDraggable);
			});
			on(ownerDocument, "dragover", nearestEmptyInsertDetectEvent);
			on(ownerDocument, "mousemove", nearestEmptyInsertDetectEvent);
			on(ownerDocument, "touchmove", nearestEmptyInsertDetectEvent);
			if (options.supportPointer) {
				on(ownerDocument, "pointerup", _this._onDrop);
				!this.nativeDraggable && on(ownerDocument, "pointercancel", _this._onDrop);
			} else {
				on(ownerDocument, "mouseup", _this._onDrop);
				on(ownerDocument, "touchend", _this._onDrop);
				on(ownerDocument, "touchcancel", _this._onDrop);
			}
			if (FireFox && this.nativeDraggable) {
				this.options.touchStartThreshold = 4;
				dragEl.draggable = true;
			}
			pluginEvent("delayStart", this, { evt });
			if (options.delay && (!options.delayOnTouchOnly || touch) && (!this.nativeDraggable || !(Edge || IE11OrLess))) {
				if (Sortable.eventCanceled) {
					this._onDrop();
					return;
				}
				if (options.supportPointer) {
					on(ownerDocument, "pointerup", _this._disableDelayedDrag);
					on(ownerDocument, "pointercancel", _this._disableDelayedDrag);
				} else {
					on(ownerDocument, "mouseup", _this._disableDelayedDrag);
					on(ownerDocument, "touchend", _this._disableDelayedDrag);
					on(ownerDocument, "touchcancel", _this._disableDelayedDrag);
				}
				on(ownerDocument, "mousemove", _this._delayedDragTouchMoveHandler);
				on(ownerDocument, "touchmove", _this._delayedDragTouchMoveHandler);
				options.supportPointer && on(ownerDocument, "pointermove", _this._delayedDragTouchMoveHandler);
				_this._dragStartTimer = setTimeout(dragStartFn, options.delay);
			} else dragStartFn();
		}
	},
	_delayedDragTouchMoveHandler: function _delayedDragTouchMoveHandler(e) {
		var touch = e.touches ? e.touches[0] : e;
		if (Math.max(Math.abs(touch.clientX - this._lastX), Math.abs(touch.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1))) this._disableDelayedDrag();
	},
	_disableDelayedDrag: function _disableDelayedDrag() {
		dragEl && _disableDraggable(dragEl);
		clearTimeout(this._dragStartTimer);
		this._disableDelayedDragEvents();
	},
	_disableDelayedDragEvents: function _disableDelayedDragEvents() {
		var ownerDocument = this.el.ownerDocument;
		off(ownerDocument, "mouseup", this._disableDelayedDrag);
		off(ownerDocument, "touchend", this._disableDelayedDrag);
		off(ownerDocument, "touchcancel", this._disableDelayedDrag);
		off(ownerDocument, "pointerup", this._disableDelayedDrag);
		off(ownerDocument, "pointercancel", this._disableDelayedDrag);
		off(ownerDocument, "mousemove", this._delayedDragTouchMoveHandler);
		off(ownerDocument, "touchmove", this._delayedDragTouchMoveHandler);
		off(ownerDocument, "pointermove", this._delayedDragTouchMoveHandler);
	},
	_triggerDragStart: function _triggerDragStart(evt, touch) {
		touch = touch || evt.pointerType == "touch" && evt;
		if (!this.nativeDraggable || touch) if (this.options.supportPointer) on(document, "pointermove", this._onTouchMove);
		else if (touch) on(document, "touchmove", this._onTouchMove);
		else on(document, "mousemove", this._onTouchMove);
		else {
			on(dragEl, "dragend", this);
			on(rootEl, "dragstart", this._onDragStart);
		}
		try {
			if (document.selection) _nextTick(function() {
				document.selection.empty();
			});
			else window.getSelection().removeAllRanges();
		} catch (err) {}
	},
	_dragStarted: function _dragStarted(fallback, evt) {
		awaitingDragStarted = false;
		if (rootEl && dragEl) {
			pluginEvent("dragStarted", this, { evt });
			if (this.nativeDraggable) on(document, "dragover", _checkOutsideTargetEl);
			var options = this.options;
			!fallback && toggleClass(dragEl, options.dragClass, false);
			toggleClass(dragEl, options.ghostClass, true);
			Sortable.active = this;
			fallback && this._appendGhost();
			_dispatchEvent({
				sortable: this,
				name: "start",
				originalEvent: evt
			});
		} else this._nulling();
	},
	_emulateDragOver: function _emulateDragOver() {
		if (touchEvt) {
			this._lastX = touchEvt.clientX;
			this._lastY = touchEvt.clientY;
			_hideGhostForTarget();
			var target = document.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
			var parent = target;
			while (target && target.shadowRoot) {
				target = target.shadowRoot.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
				if (target === parent) break;
				parent = target;
			}
			dragEl.parentNode[expando]._isOutsideThisEl(target);
			if (parent) do {
				if (parent[expando]) {
					var inserted = void 0;
					inserted = parent[expando]._onDragOver({
						clientX: touchEvt.clientX,
						clientY: touchEvt.clientY,
						target,
						rootEl: parent
					});
					if (inserted && !this.options.dragoverBubble) break;
				}
				target = parent;
			} while (parent = getParentOrHost(parent));
			_unhideGhostForTarget();
		}
	},
	_onTouchMove: function _onTouchMove(evt) {
		if (tapEvt) {
			var options = this.options, fallbackTolerance = options.fallbackTolerance, fallbackOffset = options.fallbackOffset, touch = evt.touches ? evt.touches[0] : evt, ghostMatrix = ghostEl && matrix(ghostEl, true), scaleX = ghostEl && ghostMatrix && ghostMatrix.a, scaleY = ghostEl && ghostMatrix && ghostMatrix.d, relativeScrollOffset = PositionGhostAbsolutely && ghostRelativeParent && getRelativeScrollOffset(ghostRelativeParent), dx = (touch.clientX - tapEvt.clientX + fallbackOffset.x) / (scaleX || 1) + (relativeScrollOffset ? relativeScrollOffset[0] - ghostRelativeParentInitialScroll[0] : 0) / (scaleX || 1), dy = (touch.clientY - tapEvt.clientY + fallbackOffset.y) / (scaleY || 1) + (relativeScrollOffset ? relativeScrollOffset[1] - ghostRelativeParentInitialScroll[1] : 0) / (scaleY || 1);
			if (!Sortable.active && !awaitingDragStarted) {
				if (fallbackTolerance && Math.max(Math.abs(touch.clientX - this._lastX), Math.abs(touch.clientY - this._lastY)) < fallbackTolerance) return;
				this._onDragStart(evt, true);
			}
			if (ghostEl) {
				if (ghostMatrix) {
					ghostMatrix.e += dx - (lastDx || 0);
					ghostMatrix.f += dy - (lastDy || 0);
				} else ghostMatrix = {
					a: 1,
					b: 0,
					c: 0,
					d: 1,
					e: dx,
					f: dy
				};
				var cssMatrix = "matrix(".concat(ghostMatrix.a, ",").concat(ghostMatrix.b, ",").concat(ghostMatrix.c, ",").concat(ghostMatrix.d, ",").concat(ghostMatrix.e, ",").concat(ghostMatrix.f, ")");
				css(ghostEl, "webkitTransform", cssMatrix);
				css(ghostEl, "mozTransform", cssMatrix);
				css(ghostEl, "msTransform", cssMatrix);
				css(ghostEl, "transform", cssMatrix);
				lastDx = dx;
				lastDy = dy;
				touchEvt = touch;
			}
			evt.cancelable && evt.preventDefault();
		}
	},
	_appendGhost: function _appendGhost() {
		if (!ghostEl) {
			var container = this.options.fallbackOnBody ? document.body : rootEl, rect = getRect(dragEl, true, PositionGhostAbsolutely, true, container), options = this.options;
			if (PositionGhostAbsolutely) {
				ghostRelativeParent = container;
				while (css(ghostRelativeParent, "position") === "static" && css(ghostRelativeParent, "transform") === "none" && ghostRelativeParent !== document) ghostRelativeParent = ghostRelativeParent.parentNode;
				if (ghostRelativeParent !== document.body && ghostRelativeParent !== document.documentElement) {
					if (ghostRelativeParent === document) ghostRelativeParent = getWindowScrollingElement();
					rect.top += ghostRelativeParent.scrollTop;
					rect.left += ghostRelativeParent.scrollLeft;
				} else ghostRelativeParent = getWindowScrollingElement();
				ghostRelativeParentInitialScroll = getRelativeScrollOffset(ghostRelativeParent);
			}
			ghostEl = dragEl.cloneNode(true);
			toggleClass(ghostEl, options.ghostClass, false);
			toggleClass(ghostEl, options.fallbackClass, true);
			toggleClass(ghostEl, options.dragClass, true);
			css(ghostEl, "transition", "");
			css(ghostEl, "transform", "");
			css(ghostEl, "box-sizing", "border-box");
			css(ghostEl, "margin", 0);
			css(ghostEl, "top", rect.top);
			css(ghostEl, "left", rect.left);
			css(ghostEl, "width", rect.width);
			css(ghostEl, "height", rect.height);
			css(ghostEl, "opacity", "0.8");
			css(ghostEl, "position", PositionGhostAbsolutely ? "absolute" : "fixed");
			css(ghostEl, "zIndex", "100000");
			css(ghostEl, "pointerEvents", "none");
			Sortable.ghost = ghostEl;
			container.appendChild(ghostEl);
			css(ghostEl, "transform-origin", tapDistanceLeft / parseInt(ghostEl.style.width) * 100 + "% " + tapDistanceTop / parseInt(ghostEl.style.height) * 100 + "%");
		}
	},
	_onDragStart: function _onDragStart(evt, fallback) {
		var _this = this;
		var dataTransfer = evt.dataTransfer;
		var options = _this.options;
		pluginEvent("dragStart", this, { evt });
		if (Sortable.eventCanceled) {
			this._onDrop();
			return;
		}
		pluginEvent("setupClone", this);
		if (!Sortable.eventCanceled) {
			cloneEl = clone(dragEl);
			cloneEl.removeAttribute("id");
			cloneEl.draggable = false;
			cloneEl.style["will-change"] = "";
			this._hideClone();
			toggleClass(cloneEl, this.options.chosenClass, false);
			Sortable.clone = cloneEl;
		}
		_this.cloneId = _nextTick(function() {
			pluginEvent("clone", _this);
			if (Sortable.eventCanceled) return;
			if (!_this.options.removeCloneOnHide) rootEl.insertBefore(cloneEl, dragEl);
			_this._hideClone();
			_dispatchEvent({
				sortable: _this,
				name: "clone"
			});
		});
		!fallback && toggleClass(dragEl, options.dragClass, true);
		if (fallback) {
			ignoreNextClick = true;
			_this._loopId = setInterval(_this._emulateDragOver, 50);
		} else {
			off(document, "mouseup", _this._onDrop);
			off(document, "touchend", _this._onDrop);
			off(document, "touchcancel", _this._onDrop);
			if (dataTransfer) {
				dataTransfer.effectAllowed = "move";
				options.setData && options.setData.call(_this, dataTransfer, dragEl);
			}
			on(document, "drop", _this);
			css(dragEl, "transform", "translateZ(0)");
		}
		awaitingDragStarted = true;
		_this._dragStartId = _nextTick(_this._dragStarted.bind(_this, fallback, evt));
		on(document, "selectstart", _this);
		moved = true;
		window.getSelection().removeAllRanges();
		if (Safari) css(document.body, "user-select", "none");
	},
	_onDragOver: function _onDragOver(evt) {
		var el = this.el, target = evt.target, dragRect, targetRect, revert, options = this.options, group = options.group, activeSortable = Sortable.active, isOwner = activeGroup === group, canSort = options.sort, fromSortable = putSortable || activeSortable, vertical, _this = this, completedFired = false;
		if (_silent) return;
		function dragOverEvent(name, extra) {
			pluginEvent(name, _this, _objectSpread2({
				evt,
				isOwner,
				axis: vertical ? "vertical" : "horizontal",
				revert,
				dragRect,
				targetRect,
				canSort,
				fromSortable,
				target,
				completed,
				onMove: function onMove(target, after) {
					return _onMove(rootEl, el, dragEl, dragRect, target, getRect(target), evt, after);
				},
				changed
			}, extra));
		}
		function capture() {
			dragOverEvent("dragOverAnimationCapture");
			_this.captureAnimationState();
			if (_this !== fromSortable) fromSortable.captureAnimationState();
		}
		function completed(insertion) {
			dragOverEvent("dragOverCompleted", { insertion });
			if (insertion) {
				if (isOwner) activeSortable._hideClone();
				else activeSortable._showClone(_this);
				if (_this !== fromSortable) {
					toggleClass(dragEl, putSortable ? putSortable.options.ghostClass : activeSortable.options.ghostClass, false);
					toggleClass(dragEl, options.ghostClass, true);
				}
				if (putSortable !== _this && _this !== Sortable.active) putSortable = _this;
				else if (_this === Sortable.active && putSortable) putSortable = null;
				if (fromSortable === _this) _this._ignoreWhileAnimating = target;
				_this.animateAll(function() {
					dragOverEvent("dragOverAnimationComplete");
					_this._ignoreWhileAnimating = null;
				});
				if (_this !== fromSortable) {
					fromSortable.animateAll();
					fromSortable._ignoreWhileAnimating = null;
				}
			}
			if (target === dragEl && !dragEl.animated || target === el && !target.animated) lastTarget = null;
			if (!options.dragoverBubble && !evt.rootEl && target !== document) {
				dragEl.parentNode[expando]._isOutsideThisEl(evt.target);
				!insertion && nearestEmptyInsertDetectEvent(evt);
			}
			!options.dragoverBubble && evt.stopPropagation && evt.stopPropagation();
			return completedFired = true;
		}
		function changed() {
			newIndex = index(dragEl);
			newDraggableIndex = index(dragEl, options.draggable);
			_dispatchEvent({
				sortable: _this,
				name: "change",
				toEl: el,
				newIndex,
				newDraggableIndex,
				originalEvent: evt
			});
		}
		if (evt.preventDefault !== void 0) evt.cancelable && evt.preventDefault();
		target = closest(target, options.draggable, el, true);
		dragOverEvent("dragOver");
		if (Sortable.eventCanceled) return completedFired;
		if (dragEl.contains(evt.target) || target.animated && target.animatingX && target.animatingY || _this._ignoreWhileAnimating === target) return completed(false);
		ignoreNextClick = false;
		if (activeSortable && !options.disabled && (isOwner ? canSort || (revert = parentEl !== rootEl) : putSortable === this || (this.lastPutMode = activeGroup.checkPull(this, activeSortable, dragEl, evt)) && group.checkPut(this, activeSortable, dragEl, evt))) {
			vertical = this._getDirection(evt, target) === "vertical";
			dragRect = getRect(dragEl);
			dragOverEvent("dragOverValid");
			if (Sortable.eventCanceled) return completedFired;
			if (revert) {
				parentEl = rootEl;
				capture();
				this._hideClone();
				dragOverEvent("revert");
				if (!Sortable.eventCanceled) if (nextEl) rootEl.insertBefore(dragEl, nextEl);
				else rootEl.appendChild(dragEl);
				return completed(true);
			}
			var elLastChild = lastChild(el, options.draggable);
			if (!elLastChild || _ghostIsLast(evt, vertical, this) && !elLastChild.animated) {
				if (elLastChild === dragEl) return completed(false);
				if (elLastChild && el === evt.target) target = elLastChild;
				if (target) targetRect = getRect(target);
				if (_onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, !!target) !== false) {
					capture();
					if (elLastChild && elLastChild.nextSibling) el.insertBefore(dragEl, elLastChild.nextSibling);
					else el.appendChild(dragEl);
					parentEl = el;
					changed();
					return completed(true);
				}
			} else if (elLastChild && _ghostIsFirst(evt, vertical, this)) {
				var firstChild = getChild(el, 0, options, true);
				if (firstChild === dragEl) return completed(false);
				target = firstChild;
				targetRect = getRect(target);
				if (_onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, false) !== false) {
					capture();
					el.insertBefore(dragEl, firstChild);
					parentEl = el;
					changed();
					return completed(true);
				}
			} else if (target.parentNode === el) {
				targetRect = getRect(target);
				var direction = 0, targetBeforeFirstSwap, differentLevel = dragEl.parentNode !== el, differentRowCol = !_dragElInRowColumn(dragEl.animated && dragEl.toRect || dragRect, target.animated && target.toRect || targetRect, vertical), side1 = vertical ? "top" : "left", scrolledPastTop = isScrolledPast(target, "top", "top") || isScrolledPast(dragEl, "top", "top"), scrollBefore = scrolledPastTop ? scrolledPastTop.scrollTop : void 0;
				if (lastTarget !== target) {
					targetBeforeFirstSwap = targetRect[side1];
					pastFirstInvertThresh = false;
					isCircumstantialInvert = !differentRowCol && options.invertSwap || differentLevel;
				}
				direction = _getSwapDirection(evt, target, targetRect, vertical, differentRowCol ? 1 : options.swapThreshold, options.invertedSwapThreshold == null ? options.swapThreshold : options.invertedSwapThreshold, isCircumstantialInvert, lastTarget === target);
				var sibling;
				if (direction !== 0) {
					var dragIndex = index(dragEl);
					do {
						dragIndex -= direction;
						sibling = parentEl.children[dragIndex];
					} while (sibling && (css(sibling, "display") === "none" || sibling === ghostEl));
				}
				if (direction === 0 || sibling === target) return completed(false);
				lastTarget = target;
				lastDirection = direction;
				var nextSibling = target.nextElementSibling, after = false;
				after = direction === 1;
				var moveVector = _onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, after);
				if (moveVector !== false) {
					if (moveVector === 1 || moveVector === -1) after = moveVector === 1;
					_silent = true;
					setTimeout(_unsilent, 30);
					capture();
					if (after && !nextSibling) el.appendChild(dragEl);
					else target.parentNode.insertBefore(dragEl, after ? nextSibling : target);
					if (scrolledPastTop) scrollBy(scrolledPastTop, 0, scrollBefore - scrolledPastTop.scrollTop);
					parentEl = dragEl.parentNode;
					if (targetBeforeFirstSwap !== void 0 && !isCircumstantialInvert) targetMoveDistance = Math.abs(targetBeforeFirstSwap - getRect(target)[side1]);
					changed();
					return completed(true);
				}
			}
			if (el.contains(dragEl)) return completed(false);
		}
		return false;
	},
	_ignoreWhileAnimating: null,
	_offMoveEvents: function _offMoveEvents() {
		off(document, "mousemove", this._onTouchMove);
		off(document, "touchmove", this._onTouchMove);
		off(document, "pointermove", this._onTouchMove);
		off(document, "dragover", nearestEmptyInsertDetectEvent);
		off(document, "mousemove", nearestEmptyInsertDetectEvent);
		off(document, "touchmove", nearestEmptyInsertDetectEvent);
	},
	_offUpEvents: function _offUpEvents() {
		var ownerDocument = this.el.ownerDocument;
		off(ownerDocument, "mouseup", this._onDrop);
		off(ownerDocument, "touchend", this._onDrop);
		off(ownerDocument, "pointerup", this._onDrop);
		off(ownerDocument, "pointercancel", this._onDrop);
		off(ownerDocument, "touchcancel", this._onDrop);
		off(document, "selectstart", this);
	},
	_onDrop: function _onDrop(evt) {
		var el = this.el, options = this.options;
		newIndex = index(dragEl);
		newDraggableIndex = index(dragEl, options.draggable);
		pluginEvent("drop", this, { evt });
		parentEl = dragEl && dragEl.parentNode;
		newIndex = index(dragEl);
		newDraggableIndex = index(dragEl, options.draggable);
		if (Sortable.eventCanceled) {
			this._nulling();
			return;
		}
		awaitingDragStarted = false;
		isCircumstantialInvert = false;
		pastFirstInvertThresh = false;
		clearInterval(this._loopId);
		clearTimeout(this._dragStartTimer);
		_cancelNextTick(this.cloneId);
		_cancelNextTick(this._dragStartId);
		if (this.nativeDraggable) {
			off(document, "drop", this);
			off(el, "dragstart", this._onDragStart);
		}
		this._offMoveEvents();
		this._offUpEvents();
		if (Safari) css(document.body, "user-select", "");
		css(dragEl, "transform", "");
		if (evt) {
			if (moved) {
				evt.cancelable && evt.preventDefault();
				!options.dropBubble && evt.stopPropagation();
			}
			ghostEl && ghostEl.parentNode && ghostEl.parentNode.removeChild(ghostEl);
			if (rootEl === parentEl || putSortable && putSortable.lastPutMode !== "clone") cloneEl && cloneEl.parentNode && cloneEl.parentNode.removeChild(cloneEl);
			if (dragEl) {
				if (this.nativeDraggable) off(dragEl, "dragend", this);
				_disableDraggable(dragEl);
				dragEl.style["will-change"] = "";
				if (moved && !awaitingDragStarted) toggleClass(dragEl, putSortable ? putSortable.options.ghostClass : this.options.ghostClass, false);
				toggleClass(dragEl, this.options.chosenClass, false);
				_dispatchEvent({
					sortable: this,
					name: "unchoose",
					toEl: parentEl,
					newIndex: null,
					newDraggableIndex: null,
					originalEvent: evt
				});
				if (rootEl !== parentEl) {
					if (newIndex >= 0) {
						_dispatchEvent({
							rootEl: parentEl,
							name: "add",
							toEl: parentEl,
							fromEl: rootEl,
							originalEvent: evt
						});
						_dispatchEvent({
							sortable: this,
							name: "remove",
							toEl: parentEl,
							originalEvent: evt
						});
						_dispatchEvent({
							rootEl: parentEl,
							name: "sort",
							toEl: parentEl,
							fromEl: rootEl,
							originalEvent: evt
						});
						_dispatchEvent({
							sortable: this,
							name: "sort",
							toEl: parentEl,
							originalEvent: evt
						});
					}
					putSortable && putSortable.save();
				} else if (newIndex !== oldIndex) {
					if (newIndex >= 0) {
						_dispatchEvent({
							sortable: this,
							name: "update",
							toEl: parentEl,
							originalEvent: evt
						});
						_dispatchEvent({
							sortable: this,
							name: "sort",
							toEl: parentEl,
							originalEvent: evt
						});
					}
				}
				if (Sortable.active) {
					if (newIndex == null || newIndex === -1) {
						newIndex = oldIndex;
						newDraggableIndex = oldDraggableIndex;
					}
					_dispatchEvent({
						sortable: this,
						name: "end",
						toEl: parentEl,
						originalEvent: evt
					});
					this.save();
				}
			}
		}
		this._nulling();
	},
	_nulling: function _nulling() {
		pluginEvent("nulling", this);
		rootEl = dragEl = parentEl = ghostEl = nextEl = cloneEl = lastDownEl = cloneHidden = tapEvt = touchEvt = moved = newIndex = newDraggableIndex = oldIndex = oldDraggableIndex = lastTarget = lastDirection = putSortable = activeGroup = Sortable.dragged = Sortable.ghost = Sortable.clone = Sortable.active = null;
		var el = this.el;
		savedInputChecked.forEach(function(checkEl) {
			if (el.contains(checkEl)) checkEl.checked = true;
		});
		savedInputChecked.length = lastDx = lastDy = 0;
	},
	handleEvent: function handleEvent(evt) {
		switch (evt.type) {
			case "drop":
			case "dragend":
				this._onDrop(evt);
				break;
			case "dragenter":
			case "dragover":
				if (dragEl) {
					this._onDragOver(evt);
					_globalDragOver(evt);
				}
				break;
			case "selectstart":
				evt.preventDefault();
				break;
		}
	},
	/**
	* Serializes the item into an array of string.
	* @returns {String[]}
	*/
	toArray: function toArray() {
		var order = [], el, children = this.el.children, i = 0, n = children.length, options = this.options;
		for (; i < n; i++) {
			el = children[i];
			if (closest(el, options.draggable, this.el, false)) order.push(el.getAttribute(options.dataIdAttr) || _generateId(el));
		}
		return order;
	},
	/**
	* Sorts the elements according to the array.
	* @param  {String[]}  order  order of the items
	*/
	sort: function sort(order, useAnimation) {
		var items = {}, rootEl = this.el;
		this.toArray().forEach(function(id, i) {
			var el = rootEl.children[i];
			if (closest(el, this.options.draggable, rootEl, false)) items[id] = el;
		}, this);
		useAnimation && this.captureAnimationState();
		order.forEach(function(id) {
			if (items[id]) {
				rootEl.removeChild(items[id]);
				rootEl.appendChild(items[id]);
			}
		});
		useAnimation && this.animateAll();
	},
	/**
	* Save the current sorting
	*/
	save: function save() {
		var store = this.options.store;
		store && store.set && store.set(this);
	},
	/**
	* For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
	* @param   {HTMLElement}  el
	* @param   {String}       [selector]  default: `options.draggable`
	* @returns {HTMLElement|null}
	*/
	closest: function closest$1(el, selector) {
		return closest(el, selector || this.options.draggable, this.el, false);
	},
	/**
	* Set/get option
	* @param   {string} name
	* @param   {*}      [value]
	* @returns {*}
	*/
	option: function option(name, value) {
		var options = this.options;
		if (value === void 0) return options[name];
		else {
			var modifiedValue = PluginManager.modifyOption(this, name, value);
			if (typeof modifiedValue !== "undefined") options[name] = modifiedValue;
			else options[name] = value;
			if (name === "group") _prepareGroup(options);
		}
	},
	/**
	* Destroy
	*/
	destroy: function destroy() {
		pluginEvent("destroy", this);
		var el = this.el;
		el[expando] = null;
		off(el, "mousedown", this._onTapStart);
		off(el, "touchstart", this._onTapStart);
		off(el, "pointerdown", this._onTapStart);
		if (this.nativeDraggable) {
			off(el, "dragover", this);
			off(el, "dragenter", this);
		}
		Array.prototype.forEach.call(el.querySelectorAll("[draggable]"), function(el) {
			el.removeAttribute("draggable");
		});
		this._onDrop();
		this._disableDelayedDragEvents();
		sortables.splice(sortables.indexOf(this.el), 1);
		this.el = el = null;
	},
	_hideClone: function _hideClone() {
		if (!cloneHidden) {
			pluginEvent("hideClone", this);
			if (Sortable.eventCanceled) return;
			css(cloneEl, "display", "none");
			if (this.options.removeCloneOnHide && cloneEl.parentNode) cloneEl.parentNode.removeChild(cloneEl);
			cloneHidden = true;
		}
	},
	_showClone: function _showClone(putSortable) {
		if (putSortable.lastPutMode !== "clone") {
			this._hideClone();
			return;
		}
		if (cloneHidden) {
			pluginEvent("showClone", this);
			if (Sortable.eventCanceled) return;
			if (dragEl.parentNode == rootEl && !this.options.group.revertClone) rootEl.insertBefore(cloneEl, dragEl);
			else if (nextEl) rootEl.insertBefore(cloneEl, nextEl);
			else rootEl.appendChild(cloneEl);
			if (this.options.group.revertClone) this.animate(dragEl, cloneEl);
			css(cloneEl, "display", "");
			cloneHidden = false;
		}
	}
});
function _globalDragOver(evt) {
	if (evt.dataTransfer) evt.dataTransfer.dropEffect = "move";
	evt.cancelable && evt.preventDefault();
}
function _onMove(fromEl, toEl, dragEl, dragRect, targetEl, targetRect, originalEvent, willInsertAfter) {
	var evt, sortable = fromEl[expando], onMoveFn = sortable.options.onMove, retVal;
	if (window.CustomEvent && !IE11OrLess && !Edge) evt = new CustomEvent("move", {
		bubbles: true,
		cancelable: true
	});
	else {
		evt = document.createEvent("Event");
		evt.initEvent("move", true, true);
	}
	evt.to = toEl;
	evt.from = fromEl;
	evt.dragged = dragEl;
	evt.draggedRect = dragRect;
	evt.related = targetEl || toEl;
	evt.relatedRect = targetRect || getRect(toEl);
	evt.willInsertAfter = willInsertAfter;
	evt.originalEvent = originalEvent;
	fromEl.dispatchEvent(evt);
	if (onMoveFn) retVal = onMoveFn.call(sortable, evt, originalEvent);
	return retVal;
}
function _disableDraggable(el) {
	el.draggable = false;
}
function _unsilent() {
	_silent = false;
}
function _ghostIsFirst(evt, vertical, sortable) {
	var firstElRect = getRect(getChild(sortable.el, 0, sortable.options, true));
	var childContainingRect = getChildContainingRectFromElement(sortable.el, sortable.options, ghostEl);
	var spacer = 10;
	return vertical ? evt.clientX < childContainingRect.left - spacer || evt.clientY < firstElRect.top && evt.clientX < firstElRect.right : evt.clientY < childContainingRect.top - spacer || evt.clientY < firstElRect.bottom && evt.clientX < firstElRect.left;
}
function _ghostIsLast(evt, vertical, sortable) {
	var lastElRect = getRect(lastChild(sortable.el, sortable.options.draggable));
	var childContainingRect = getChildContainingRectFromElement(sortable.el, sortable.options, ghostEl);
	var spacer = 10;
	return vertical ? evt.clientX > childContainingRect.right + spacer || evt.clientY > lastElRect.bottom && evt.clientX > lastElRect.left : evt.clientY > childContainingRect.bottom + spacer || evt.clientX > lastElRect.right && evt.clientY > lastElRect.top;
}
function _getSwapDirection(evt, target, targetRect, vertical, swapThreshold, invertedSwapThreshold, invertSwap, isLastTarget) {
	var mouseOnAxis = vertical ? evt.clientY : evt.clientX, targetLength = vertical ? targetRect.height : targetRect.width, targetS1 = vertical ? targetRect.top : targetRect.left, targetS2 = vertical ? targetRect.bottom : targetRect.right, invert = false;
	if (!invertSwap) {
		if (isLastTarget && targetMoveDistance < targetLength * swapThreshold) {
			if (!pastFirstInvertThresh && (lastDirection === 1 ? mouseOnAxis > targetS1 + targetLength * invertedSwapThreshold / 2 : mouseOnAxis < targetS2 - targetLength * invertedSwapThreshold / 2)) pastFirstInvertThresh = true;
			if (!pastFirstInvertThresh) {
				if (lastDirection === 1 ? mouseOnAxis < targetS1 + targetMoveDistance : mouseOnAxis > targetS2 - targetMoveDistance) return -lastDirection;
			} else invert = true;
		} else if (mouseOnAxis > targetS1 + targetLength * (1 - swapThreshold) / 2 && mouseOnAxis < targetS2 - targetLength * (1 - swapThreshold) / 2) return _getInsertDirection(target);
	}
	invert = invert || invertSwap;
	if (invert) {
		if (mouseOnAxis < targetS1 + targetLength * invertedSwapThreshold / 2 || mouseOnAxis > targetS2 - targetLength * invertedSwapThreshold / 2) return mouseOnAxis > targetS1 + targetLength / 2 ? 1 : -1;
	}
	return 0;
}
/**
* Gets the direction dragEl must be swapped relative to target in order to make it
* seem that dragEl has been "inserted" into that element's position
* @param  {HTMLElement} target       The target whose position dragEl is being inserted at
* @return {Number}                   Direction dragEl must be swapped
*/
function _getInsertDirection(target) {
	if (index(dragEl) < index(target)) return 1;
	else return -1;
}
/**
* Generate id
* @param   {HTMLElement} el
* @returns {String}
* @private
*/
function _generateId(el) {
	var str = el.tagName + el.className + el.src + el.href + el.textContent, i = str.length, sum = 0;
	while (i--) sum += str.charCodeAt(i);
	return sum.toString(36);
}
function _saveInputCheckedState(root) {
	savedInputChecked.length = 0;
	var inputs = root.getElementsByTagName("input");
	var idx = inputs.length;
	while (idx--) {
		var el = inputs[idx];
		el.checked && savedInputChecked.push(el);
	}
}
function _nextTick(fn) {
	return setTimeout(fn, 0);
}
function _cancelNextTick(id) {
	return clearTimeout(id);
}
if (documentExists) on(document, "touchmove", function(evt) {
	if ((Sortable.active || awaitingDragStarted) && evt.cancelable) evt.preventDefault();
});
Sortable.utils = {
	on,
	off,
	css,
	find,
	is: function is(el, selector) {
		return !!closest(el, selector, el, false);
	},
	extend,
	throttle,
	closest,
	toggleClass,
	clone,
	index,
	nextTick: _nextTick,
	cancelNextTick: _cancelNextTick,
	detectDirection: _detectDirection,
	getChild,
	expando
};
/**
* Get the Sortable instance of an element
* @param  {HTMLElement} element The element
* @return {Sortable|undefined}         The instance of Sortable
*/
Sortable.get = function(element) {
	return element[expando];
};
/**
* Mount a plugin to Sortable
* @param  {...SortablePlugin|SortablePlugin[]} plugins       Plugins being mounted
*/
Sortable.mount = function() {
	for (var _len = arguments.length, plugins = new Array(_len), _key = 0; _key < _len; _key++) plugins[_key] = arguments[_key];
	if (plugins[0].constructor === Array) plugins = plugins[0];
	plugins.forEach(function(plugin) {
		if (!plugin.prototype || !plugin.prototype.constructor) throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(plugin));
		if (plugin.utils) Sortable.utils = _objectSpread2(_objectSpread2({}, Sortable.utils), plugin.utils);
		PluginManager.mount(plugin);
	});
};
/**
* Create sortable instance
* @param {HTMLElement}  el
* @param {Object}      [options]
*/
Sortable.create = function(el, options) {
	return new Sortable(el, options);
};
Sortable.version = version;
var autoScrolls = [], scrollEl, scrollRootEl, scrolling = false, lastAutoScrollX, lastAutoScrollY, touchEvt$1, pointerElemChangedInterval;
function AutoScrollPlugin() {
	function AutoScroll() {
		this.defaults = {
			scroll: true,
			forceAutoScrollFallback: false,
			scrollSensitivity: 30,
			scrollSpeed: 10,
			bubbleScroll: true
		};
		for (var fn in this) if (fn.charAt(0) === "_" && typeof this[fn] === "function") this[fn] = this[fn].bind(this);
	}
	AutoScroll.prototype = {
		dragStarted: function dragStarted(_ref) {
			var originalEvent = _ref.originalEvent;
			if (this.sortable.nativeDraggable) on(document, "dragover", this._handleAutoScroll);
			else if (this.options.supportPointer) on(document, "pointermove", this._handleFallbackAutoScroll);
			else if (originalEvent.touches) on(document, "touchmove", this._handleFallbackAutoScroll);
			else on(document, "mousemove", this._handleFallbackAutoScroll);
		},
		dragOverCompleted: function dragOverCompleted(_ref2) {
			var originalEvent = _ref2.originalEvent;
			if (!this.options.dragOverBubble && !originalEvent.rootEl) this._handleAutoScroll(originalEvent);
		},
		drop: function drop() {
			if (this.sortable.nativeDraggable) off(document, "dragover", this._handleAutoScroll);
			else {
				off(document, "pointermove", this._handleFallbackAutoScroll);
				off(document, "touchmove", this._handleFallbackAutoScroll);
				off(document, "mousemove", this._handleFallbackAutoScroll);
			}
			clearPointerElemChangedInterval();
			clearAutoScrolls();
			cancelThrottle();
		},
		nulling: function nulling() {
			touchEvt$1 = scrollRootEl = scrollEl = scrolling = pointerElemChangedInterval = lastAutoScrollX = lastAutoScrollY = null;
			autoScrolls.length = 0;
		},
		_handleFallbackAutoScroll: function _handleFallbackAutoScroll(evt) {
			this._handleAutoScroll(evt, true);
		},
		_handleAutoScroll: function _handleAutoScroll(evt, fallback) {
			var _this = this;
			var x = (evt.touches ? evt.touches[0] : evt).clientX, y = (evt.touches ? evt.touches[0] : evt).clientY, elem = document.elementFromPoint(x, y);
			touchEvt$1 = evt;
			if (fallback || this.options.forceAutoScrollFallback || Edge || IE11OrLess || Safari) {
				autoScroll(evt, this.options, elem, fallback);
				var ogElemScroller = getParentAutoScrollElement(elem, true);
				if (scrolling && (!pointerElemChangedInterval || x !== lastAutoScrollX || y !== lastAutoScrollY)) {
					pointerElemChangedInterval && clearPointerElemChangedInterval();
					pointerElemChangedInterval = setInterval(function() {
						var newElem = getParentAutoScrollElement(document.elementFromPoint(x, y), true);
						if (newElem !== ogElemScroller) {
							ogElemScroller = newElem;
							clearAutoScrolls();
						}
						autoScroll(evt, _this.options, newElem, fallback);
					}, 10);
					lastAutoScrollX = x;
					lastAutoScrollY = y;
				}
			} else {
				if (!this.options.bubbleScroll || getParentAutoScrollElement(elem, true) === getWindowScrollingElement()) {
					clearAutoScrolls();
					return;
				}
				autoScroll(evt, this.options, getParentAutoScrollElement(elem, false), false);
			}
		}
	};
	return _extends(AutoScroll, {
		pluginName: "scroll",
		initializeByDefault: true
	});
}
function clearAutoScrolls() {
	autoScrolls.forEach(function(autoScroll) {
		clearInterval(autoScroll.pid);
	});
	autoScrolls = [];
}
function clearPointerElemChangedInterval() {
	clearInterval(pointerElemChangedInterval);
}
var autoScroll = throttle(function(evt, options, rootEl, isFallback) {
	if (!options.scroll) return;
	var x = (evt.touches ? evt.touches[0] : evt).clientX, y = (evt.touches ? evt.touches[0] : evt).clientY, sens = options.scrollSensitivity, speed = options.scrollSpeed, winScroller = getWindowScrollingElement();
	var scrollThisInstance = false, scrollCustomFn;
	if (scrollRootEl !== rootEl) {
		scrollRootEl = rootEl;
		clearAutoScrolls();
		scrollEl = options.scroll;
		scrollCustomFn = options.scrollFn;
		if (scrollEl === true) scrollEl = getParentAutoScrollElement(rootEl, true);
	}
	var layersOut = 0;
	var currentParent = scrollEl;
	do {
		var el = currentParent, rect = getRect(el), top = rect.top, bottom = rect.bottom, left = rect.left, right = rect.right, width = rect.width, height = rect.height, canScrollX = void 0, canScrollY = void 0, scrollWidth = el.scrollWidth, scrollHeight = el.scrollHeight, elCSS = css(el), scrollPosX = el.scrollLeft, scrollPosY = el.scrollTop;
		if (el === winScroller) {
			canScrollX = width < scrollWidth && (elCSS.overflowX === "auto" || elCSS.overflowX === "scroll" || elCSS.overflowX === "visible");
			canScrollY = height < scrollHeight && (elCSS.overflowY === "auto" || elCSS.overflowY === "scroll" || elCSS.overflowY === "visible");
		} else {
			canScrollX = width < scrollWidth && (elCSS.overflowX === "auto" || elCSS.overflowX === "scroll");
			canScrollY = height < scrollHeight && (elCSS.overflowY === "auto" || elCSS.overflowY === "scroll");
		}
		var vx = canScrollX && (Math.abs(right - x) <= sens && scrollPosX + width < scrollWidth) - (Math.abs(left - x) <= sens && !!scrollPosX);
		var vy = canScrollY && (Math.abs(bottom - y) <= sens && scrollPosY + height < scrollHeight) - (Math.abs(top - y) <= sens && !!scrollPosY);
		if (!autoScrolls[layersOut]) {
			for (var i = 0; i <= layersOut; i++) if (!autoScrolls[i]) autoScrolls[i] = {};
		}
		if (autoScrolls[layersOut].vx != vx || autoScrolls[layersOut].vy != vy || autoScrolls[layersOut].el !== el) {
			autoScrolls[layersOut].el = el;
			autoScrolls[layersOut].vx = vx;
			autoScrolls[layersOut].vy = vy;
			clearInterval(autoScrolls[layersOut].pid);
			if (vx != 0 || vy != 0) {
				scrollThisInstance = true;
				autoScrolls[layersOut].pid = setInterval(function() {
					if (isFallback && this.layer === 0) Sortable.active._onTouchMove(touchEvt$1);
					var scrollOffsetY = autoScrolls[this.layer].vy ? autoScrolls[this.layer].vy * speed : 0;
					var scrollOffsetX = autoScrolls[this.layer].vx ? autoScrolls[this.layer].vx * speed : 0;
					if (typeof scrollCustomFn === "function") {
						if (scrollCustomFn.call(Sortable.dragged.parentNode[expando], scrollOffsetX, scrollOffsetY, evt, touchEvt$1, autoScrolls[this.layer].el) !== "continue") return;
					}
					scrollBy(autoScrolls[this.layer].el, scrollOffsetX, scrollOffsetY);
				}.bind({ layer: layersOut }), 24);
			}
		}
		layersOut++;
	} while (options.bubbleScroll && currentParent !== winScroller && (currentParent = getParentAutoScrollElement(currentParent, false)));
	scrolling = scrollThisInstance;
}, 30);
var drop = function drop(_ref) {
	var originalEvent = _ref.originalEvent, putSortable = _ref.putSortable, dragEl = _ref.dragEl, activeSortable = _ref.activeSortable, dispatchSortableEvent = _ref.dispatchSortableEvent, hideGhostForTarget = _ref.hideGhostForTarget, unhideGhostForTarget = _ref.unhideGhostForTarget;
	if (!originalEvent) return;
	var toSortable = putSortable || activeSortable;
	hideGhostForTarget();
	var touch = originalEvent.changedTouches && originalEvent.changedTouches.length ? originalEvent.changedTouches[0] : originalEvent;
	var target = document.elementFromPoint(touch.clientX, touch.clientY);
	unhideGhostForTarget();
	if (toSortable && !toSortable.el.contains(target)) {
		dispatchSortableEvent("spill");
		this.onSpill({
			dragEl,
			putSortable
		});
	}
};
function Revert() {}
Revert.prototype = {
	startIndex: null,
	dragStart: function dragStart(_ref2) {
		var oldDraggableIndex = _ref2.oldDraggableIndex;
		this.startIndex = oldDraggableIndex;
	},
	onSpill: function onSpill(_ref3) {
		var dragEl = _ref3.dragEl, putSortable = _ref3.putSortable;
		this.sortable.captureAnimationState();
		if (putSortable) putSortable.captureAnimationState();
		var nextSibling = getChild(this.sortable.el, this.startIndex, this.options);
		if (nextSibling) this.sortable.el.insertBefore(dragEl, nextSibling);
		else this.sortable.el.appendChild(dragEl);
		this.sortable.animateAll();
		if (putSortable) putSortable.animateAll();
	},
	drop
};
_extends(Revert, { pluginName: "revertOnSpill" });
function Remove() {}
Remove.prototype = {
	onSpill: function onSpill(_ref4) {
		var dragEl = _ref4.dragEl;
		var parentSortable = _ref4.putSortable || this.sortable;
		parentSortable.captureAnimationState();
		dragEl.parentNode && dragEl.parentNode.removeChild(dragEl);
		parentSortable.animateAll();
	},
	drop
};
_extends(Remove, { pluginName: "removeOnSpill" });
Sortable.mount(new AutoScrollPlugin());
Sortable.mount(Remove, Revert);
//#endregion
//#region src/SortableDemo.js
var { code, div: div$1, h2: h2$1, li, p: p$2, section: section$1, span, ul } = van_default.tags;
var initialItems = [
	{
		id: "a",
		text: "VanJS 创建真实 DOM"
	},
	{
		id: "b",
		text: "Tippy 接管 tooltip 行为"
	},
	{
		id: "c",
		text: "Sortable 接管拖拽排序"
	},
	{
		id: "d",
		text: "拖完后回写 VanJS state"
	}
];
var panelClass$1 = u`
  margin-top: 18px;
  padding: 18px;
  border: 1px solid #ddded8;
  background: #fff;
`;
var sortableListClass = u`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
`;
var sortableItemClass = u`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 10px 12px;
  border: 1px solid #dadce0;
  background: #fafafa;
`;
var dragHandleClass = u`
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border: 1px solid #d2d5d9;
  background: #fff;
  color: #5f6368;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
`;
var sortableGhostClass = u`
  opacity: 0.35;
  background: #dceee8;
`;
var stateViewClass = u`
  margin-top: 14px;
  padding: 10px 12px;
  background: #f1f3f4;
  color: #3c4043;
`;
var SortableDemo = () => {
	const items = van_default.state(initialItems);
	const list = ul({ class: sortableListClass }, items.val.map((item) => li({
		class: sortableItemClass,
		"data-id": item.id
	}, span({ class: dragHandleClass }, "☰"), span(item.text))));
	queueMicrotask(() => {
		Sortable.create(list, {
			animation: 150,
			handle: `.${dragHandleClass}`,
			ghostClass: sortableGhostClass,
			onEnd: () => {
				items.val = Array.from(list.children).map((child) => child.dataset.id).map((id) => items.val.find((item) => item.id === id)).filter(Boolean);
			}
		});
	});
	return section$1({ class: panelClass$1 }, h2$1("SortableJS: 列表行为"), p$2("拖动左侧把手排序。Sortable 临时改 DOM，onEnd 后把新顺序写回 state。"), list, div$1({ class: stateViewClass }, "当前 state 顺序: ", code(() => items.val.map((item) => item.id).join(" -> "))));
};
var bottom = "bottom";
var right = "right";
var left = "left";
var auto = "auto";
var basePlacements = [
	"top",
	bottom,
	right,
	left
];
var start = "start";
var clippingParents = "clippingParents";
var viewport = "viewport";
var popper = "popper";
var reference = "reference";
var variationPlacements = /*#__PURE__*/ basePlacements.reduce(function(acc, placement) {
	return acc.concat([placement + "-" + start, placement + "-end"]);
}, []);
var placements = /*#__PURE__*/ [].concat(basePlacements, [auto]).reduce(function(acc, placement) {
	return acc.concat([
		placement,
		placement + "-" + start,
		placement + "-end"
	]);
}, []);
var modifierPhases = [
	"beforeRead",
	"read",
	"afterRead",
	"beforeMain",
	"main",
	"afterMain",
	"beforeWrite",
	"write",
	"afterWrite"
];
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getNodeName.js
function getNodeName(element) {
	return element ? (element.nodeName || "").toLowerCase() : null;
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getWindow.js
function getWindow(node) {
	if (node == null) return window;
	if (node.toString() !== "[object Window]") {
		var ownerDocument = node.ownerDocument;
		return ownerDocument ? ownerDocument.defaultView || window : window;
	}
	return node;
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/instanceOf.js
function isElement$1(node) {
	return node instanceof getWindow(node).Element || node instanceof Element;
}
function isHTMLElement(node) {
	return node instanceof getWindow(node).HTMLElement || node instanceof HTMLElement;
}
function isShadowRoot(node) {
	if (typeof ShadowRoot === "undefined") return false;
	return node instanceof getWindow(node).ShadowRoot || node instanceof ShadowRoot;
}
//#endregion
//#region node_modules/@popperjs/core/lib/modifiers/applyStyles.js
function applyStyles(_ref) {
	var state = _ref.state;
	Object.keys(state.elements).forEach(function(name) {
		var style = state.styles[name] || {};
		var attributes = state.attributes[name] || {};
		var element = state.elements[name];
		if (!isHTMLElement(element) || !getNodeName(element)) return;
		Object.assign(element.style, style);
		Object.keys(attributes).forEach(function(name) {
			var value = attributes[name];
			if (value === false) element.removeAttribute(name);
			else element.setAttribute(name, value === true ? "" : value);
		});
	});
}
function effect$2(_ref2) {
	var state = _ref2.state;
	var initialStyles = {
		popper: {
			position: state.options.strategy,
			left: "0",
			top: "0",
			margin: "0"
		},
		arrow: { position: "absolute" },
		reference: {}
	};
	Object.assign(state.elements.popper.style, initialStyles.popper);
	state.styles = initialStyles;
	if (state.elements.arrow) Object.assign(state.elements.arrow.style, initialStyles.arrow);
	return function() {
		Object.keys(state.elements).forEach(function(name) {
			var element = state.elements[name];
			var attributes = state.attributes[name] || {};
			var style = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]).reduce(function(style, property) {
				style[property] = "";
				return style;
			}, {});
			if (!isHTMLElement(element) || !getNodeName(element)) return;
			Object.assign(element.style, style);
			Object.keys(attributes).forEach(function(attribute) {
				element.removeAttribute(attribute);
			});
		});
	};
}
var applyStyles_default = {
	name: "applyStyles",
	enabled: true,
	phase: "write",
	fn: applyStyles,
	effect: effect$2,
	requires: ["computeStyles"]
};
//#endregion
//#region node_modules/@popperjs/core/lib/utils/math.js
var max = Math.max;
var min = Math.min;
var round = Math.round;
//#endregion
//#region node_modules/@popperjs/core/lib/utils/userAgent.js
function getUAString() {
	var uaData = navigator.userAgentData;
	if (uaData != null && uaData.brands && Array.isArray(uaData.brands)) return uaData.brands.map(function(item) {
		return item.brand + "/" + item.version;
	}).join(" ");
	return navigator.userAgent;
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/isLayoutViewport.js
function isLayoutViewport() {
	return !/^((?!chrome|android).)*safari/i.test(getUAString());
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getBoundingClientRect.js
function getBoundingClientRect(element, includeScale, isFixedStrategy) {
	if (includeScale === void 0) includeScale = false;
	if (isFixedStrategy === void 0) isFixedStrategy = false;
	var clientRect = element.getBoundingClientRect();
	var scaleX = 1;
	var scaleY = 1;
	if (includeScale && isHTMLElement(element)) {
		scaleX = element.offsetWidth > 0 ? round(clientRect.width) / element.offsetWidth || 1 : 1;
		scaleY = element.offsetHeight > 0 ? round(clientRect.height) / element.offsetHeight || 1 : 1;
	}
	var visualViewport = (isElement$1(element) ? getWindow(element) : window).visualViewport;
	var addVisualOffsets = !isLayoutViewport() && isFixedStrategy;
	var x = (clientRect.left + (addVisualOffsets && visualViewport ? visualViewport.offsetLeft : 0)) / scaleX;
	var y = (clientRect.top + (addVisualOffsets && visualViewport ? visualViewport.offsetTop : 0)) / scaleY;
	var width = clientRect.width / scaleX;
	var height = clientRect.height / scaleY;
	return {
		width,
		height,
		top: y,
		right: x + width,
		bottom: y + height,
		left: x,
		x,
		y
	};
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getWindowScroll.js
function getWindowScroll(node) {
	var win = getWindow(node);
	return {
		scrollLeft: win.pageXOffset,
		scrollTop: win.pageYOffset
	};
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getHTMLElementScroll.js
function getHTMLElementScroll(element) {
	return {
		scrollLeft: element.scrollLeft,
		scrollTop: element.scrollTop
	};
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getNodeScroll.js
function getNodeScroll(node) {
	if (node === getWindow(node) || !isHTMLElement(node)) return getWindowScroll(node);
	else return getHTMLElementScroll(node);
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getDocumentElement.js
function getDocumentElement(element) {
	return ((isElement$1(element) ? element.ownerDocument : element.document) || window.document).documentElement;
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getWindowScrollBarX.js
function getWindowScrollBarX(element) {
	return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getComputedStyle.js
function getComputedStyle(element) {
	return getWindow(element).getComputedStyle(element);
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/isScrollParent.js
function isScrollParent(element) {
	var _getComputedStyle = getComputedStyle(element), overflow = _getComputedStyle.overflow, overflowX = _getComputedStyle.overflowX, overflowY = _getComputedStyle.overflowY;
	return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getCompositeRect.js
function isElementScaled(element) {
	var rect = element.getBoundingClientRect();
	var scaleX = round(rect.width) / element.offsetWidth || 1;
	var scaleY = round(rect.height) / element.offsetHeight || 1;
	return scaleX !== 1 || scaleY !== 1;
}
function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
	if (isFixed === void 0) isFixed = false;
	var isOffsetParentAnElement = isHTMLElement(offsetParent);
	var offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent);
	var documentElement = getDocumentElement(offsetParent);
	var rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled, isFixed);
	var scroll = {
		scrollLeft: 0,
		scrollTop: 0
	};
	var offsets = {
		x: 0,
		y: 0
	};
	if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
		if (getNodeName(offsetParent) !== "body" || isScrollParent(documentElement)) scroll = getNodeScroll(offsetParent);
		if (isHTMLElement(offsetParent)) {
			offsets = getBoundingClientRect(offsetParent, true);
			offsets.x += offsetParent.clientLeft;
			offsets.y += offsetParent.clientTop;
		} else if (documentElement) offsets.x = getWindowScrollBarX(documentElement);
	}
	return {
		x: rect.left + scroll.scrollLeft - offsets.x,
		y: rect.top + scroll.scrollTop - offsets.y,
		width: rect.width,
		height: rect.height
	};
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getLayoutRect.js
function getLayoutRect(element) {
	var clientRect = getBoundingClientRect(element);
	var width = element.offsetWidth;
	var height = element.offsetHeight;
	if (Math.abs(clientRect.width - width) <= 1) width = clientRect.width;
	if (Math.abs(clientRect.height - height) <= 1) height = clientRect.height;
	return {
		x: element.offsetLeft,
		y: element.offsetTop,
		width,
		height
	};
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getParentNode.js
function getParentNode(element) {
	if (getNodeName(element) === "html") return element;
	return element.assignedSlot || element.parentNode || (isShadowRoot(element) ? element.host : null) || getDocumentElement(element);
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getScrollParent.js
function getScrollParent(node) {
	if ([
		"html",
		"body",
		"#document"
	].indexOf(getNodeName(node)) >= 0) return node.ownerDocument.body;
	if (isHTMLElement(node) && isScrollParent(node)) return node;
	return getScrollParent(getParentNode(node));
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/listScrollParents.js
function listScrollParents(element, list) {
	var _element$ownerDocumen;
	if (list === void 0) list = [];
	var scrollParent = getScrollParent(element);
	var isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body);
	var win = getWindow(scrollParent);
	var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
	var updatedList = list.concat(target);
	return isBody ? updatedList : updatedList.concat(listScrollParents(getParentNode(target)));
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/isTableElement.js
function isTableElement(element) {
	return [
		"table",
		"td",
		"th"
	].indexOf(getNodeName(element)) >= 0;
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getOffsetParent.js
function getTrueOffsetParent(element) {
	if (!isHTMLElement(element) || getComputedStyle(element).position === "fixed") return null;
	return element.offsetParent;
}
function getContainingBlock(element) {
	var isFirefox = /firefox/i.test(getUAString());
	if (/Trident/i.test(getUAString()) && isHTMLElement(element)) {
		if (getComputedStyle(element).position === "fixed") return null;
	}
	var currentNode = getParentNode(element);
	if (isShadowRoot(currentNode)) currentNode = currentNode.host;
	while (isHTMLElement(currentNode) && ["html", "body"].indexOf(getNodeName(currentNode)) < 0) {
		var css = getComputedStyle(currentNode);
		if (css.transform !== "none" || css.perspective !== "none" || css.contain === "paint" || ["transform", "perspective"].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === "filter" || isFirefox && css.filter && css.filter !== "none") return currentNode;
		else currentNode = currentNode.parentNode;
	}
	return null;
}
function getOffsetParent(element) {
	var window = getWindow(element);
	var offsetParent = getTrueOffsetParent(element);
	while (offsetParent && isTableElement(offsetParent) && getComputedStyle(offsetParent).position === "static") offsetParent = getTrueOffsetParent(offsetParent);
	if (offsetParent && (getNodeName(offsetParent) === "html" || getNodeName(offsetParent) === "body" && getComputedStyle(offsetParent).position === "static")) return window;
	return offsetParent || getContainingBlock(element) || window;
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/orderModifiers.js
function order(modifiers) {
	var map = /* @__PURE__ */ new Map();
	var visited = /* @__PURE__ */ new Set();
	var result = [];
	modifiers.forEach(function(modifier) {
		map.set(modifier.name, modifier);
	});
	function sort(modifier) {
		visited.add(modifier.name);
		[].concat(modifier.requires || [], modifier.requiresIfExists || []).forEach(function(dep) {
			if (!visited.has(dep)) {
				var depModifier = map.get(dep);
				if (depModifier) sort(depModifier);
			}
		});
		result.push(modifier);
	}
	modifiers.forEach(function(modifier) {
		if (!visited.has(modifier.name)) sort(modifier);
	});
	return result;
}
function orderModifiers(modifiers) {
	var orderedModifiers = order(modifiers);
	return modifierPhases.reduce(function(acc, phase) {
		return acc.concat(orderedModifiers.filter(function(modifier) {
			return modifier.phase === phase;
		}));
	}, []);
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/debounce.js
function debounce$1(fn) {
	var pending;
	return function() {
		if (!pending) pending = new Promise(function(resolve) {
			Promise.resolve().then(function() {
				pending = void 0;
				resolve(fn());
			});
		});
		return pending;
	};
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/mergeByName.js
function mergeByName(modifiers) {
	var merged = modifiers.reduce(function(merged, current) {
		var existing = merged[current.name];
		merged[current.name] = existing ? Object.assign({}, existing, current, {
			options: Object.assign({}, existing.options, current.options),
			data: Object.assign({}, existing.data, current.data)
		}) : current;
		return merged;
	}, {});
	return Object.keys(merged).map(function(key) {
		return merged[key];
	});
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getViewportRect.js
function getViewportRect(element, strategy) {
	var win = getWindow(element);
	var html = getDocumentElement(element);
	var visualViewport = win.visualViewport;
	var width = html.clientWidth;
	var height = html.clientHeight;
	var x = 0;
	var y = 0;
	if (visualViewport) {
		width = visualViewport.width;
		height = visualViewport.height;
		var layoutViewport = isLayoutViewport();
		if (layoutViewport || !layoutViewport && strategy === "fixed") {
			x = visualViewport.offsetLeft;
			y = visualViewport.offsetTop;
		}
	}
	return {
		width,
		height,
		x: x + getWindowScrollBarX(element),
		y
	};
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getDocumentRect.js
function getDocumentRect(element) {
	var _element$ownerDocumen;
	var html = getDocumentElement(element);
	var winScroll = getWindowScroll(element);
	var body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body;
	var width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
	var height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
	var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
	var y = -winScroll.scrollTop;
	if (getComputedStyle(body || html).direction === "rtl") x += max(html.clientWidth, body ? body.clientWidth : 0) - width;
	return {
		width,
		height,
		x,
		y
	};
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/contains.js
function contains(parent, child) {
	var rootNode = child.getRootNode && child.getRootNode();
	if (parent.contains(child)) return true;
	else if (rootNode && isShadowRoot(rootNode)) {
		var next = child;
		do {
			if (next && parent.isSameNode(next)) return true;
			next = next.parentNode || next.host;
		} while (next);
	}
	return false;
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/rectToClientRect.js
function rectToClientRect(rect) {
	return Object.assign({}, rect, {
		left: rect.x,
		top: rect.y,
		right: rect.x + rect.width,
		bottom: rect.y + rect.height
	});
}
//#endregion
//#region node_modules/@popperjs/core/lib/dom-utils/getClippingRect.js
function getInnerBoundingClientRect(element, strategy) {
	var rect = getBoundingClientRect(element, false, strategy === "fixed");
	rect.top = rect.top + element.clientTop;
	rect.left = rect.left + element.clientLeft;
	rect.bottom = rect.top + element.clientHeight;
	rect.right = rect.left + element.clientWidth;
	rect.width = element.clientWidth;
	rect.height = element.clientHeight;
	rect.x = rect.left;
	rect.y = rect.top;
	return rect;
}
function getClientRectFromMixedType(element, clippingParent, strategy) {
	return clippingParent === "viewport" ? rectToClientRect(getViewportRect(element, strategy)) : isElement$1(clippingParent) ? getInnerBoundingClientRect(clippingParent, strategy) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
}
function getClippingParents(element) {
	var clippingParents = listScrollParents(getParentNode(element));
	var clipperElement = ["absolute", "fixed"].indexOf(getComputedStyle(element).position) >= 0 && isHTMLElement(element) ? getOffsetParent(element) : element;
	if (!isElement$1(clipperElement)) return [];
	return clippingParents.filter(function(clippingParent) {
		return isElement$1(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== "body";
	});
}
function getClippingRect(element, boundary, rootBoundary, strategy) {
	var mainClippingParents = boundary === "clippingParents" ? getClippingParents(element) : [].concat(boundary);
	var clippingParents = [].concat(mainClippingParents, [rootBoundary]);
	var firstClippingParent = clippingParents[0];
	var clippingRect = clippingParents.reduce(function(accRect, clippingParent) {
		var rect = getClientRectFromMixedType(element, clippingParent, strategy);
		accRect.top = max(rect.top, accRect.top);
		accRect.right = min(rect.right, accRect.right);
		accRect.bottom = min(rect.bottom, accRect.bottom);
		accRect.left = max(rect.left, accRect.left);
		return accRect;
	}, getClientRectFromMixedType(element, firstClippingParent, strategy));
	clippingRect.width = clippingRect.right - clippingRect.left;
	clippingRect.height = clippingRect.bottom - clippingRect.top;
	clippingRect.x = clippingRect.left;
	clippingRect.y = clippingRect.top;
	return clippingRect;
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/getBasePlacement.js
function getBasePlacement$1(placement) {
	return placement.split("-")[0];
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/getVariation.js
function getVariation(placement) {
	return placement.split("-")[1];
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/getMainAxisFromPlacement.js
function getMainAxisFromPlacement(placement) {
	return ["top", "bottom"].indexOf(placement) >= 0 ? "x" : "y";
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/computeOffsets.js
function computeOffsets(_ref) {
	var reference = _ref.reference, element = _ref.element, placement = _ref.placement;
	var basePlacement = placement ? getBasePlacement$1(placement) : null;
	var variation = placement ? getVariation(placement) : null;
	var commonX = reference.x + reference.width / 2 - element.width / 2;
	var commonY = reference.y + reference.height / 2 - element.height / 2;
	var offsets;
	switch (basePlacement) {
		case "top":
			offsets = {
				x: commonX,
				y: reference.y - element.height
			};
			break;
		case bottom:
			offsets = {
				x: commonX,
				y: reference.y + reference.height
			};
			break;
		case right:
			offsets = {
				x: reference.x + reference.width,
				y: commonY
			};
			break;
		case left:
			offsets = {
				x: reference.x - element.width,
				y: commonY
			};
			break;
		default: offsets = {
			x: reference.x,
			y: reference.y
		};
	}
	var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;
	if (mainAxis != null) {
		var len = mainAxis === "y" ? "height" : "width";
		switch (variation) {
			case start:
				offsets[mainAxis] = offsets[mainAxis] - (reference[len] / 2 - element[len] / 2);
				break;
			case "end":
				offsets[mainAxis] = offsets[mainAxis] + (reference[len] / 2 - element[len] / 2);
				break;
			default:
		}
	}
	return offsets;
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/getFreshSideObject.js
function getFreshSideObject() {
	return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	};
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/mergePaddingObject.js
function mergePaddingObject(paddingObject) {
	return Object.assign({}, getFreshSideObject(), paddingObject);
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/expandToHashMap.js
function expandToHashMap(value, keys) {
	return keys.reduce(function(hashMap, key) {
		hashMap[key] = value;
		return hashMap;
	}, {});
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/detectOverflow.js
function detectOverflow(state, options) {
	if (options === void 0) options = {};
	var _options = options, _options$placement = _options.placement, placement = _options$placement === void 0 ? state.placement : _options$placement, _options$strategy = _options.strategy, strategy = _options$strategy === void 0 ? state.strategy : _options$strategy, _options$boundary = _options.boundary, boundary = _options$boundary === void 0 ? clippingParents : _options$boundary, _options$rootBoundary = _options.rootBoundary, rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary, _options$elementConte = _options.elementContext, elementContext = _options$elementConte === void 0 ? popper : _options$elementConte, _options$altBoundary = _options.altBoundary, altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary, _options$padding = _options.padding, padding = _options$padding === void 0 ? 0 : _options$padding;
	var paddingObject = mergePaddingObject(typeof padding !== "number" ? padding : expandToHashMap(padding, basePlacements));
	var altContext = elementContext === "popper" ? reference : popper;
	var popperRect = state.rects.popper;
	var element = state.elements[altBoundary ? altContext : elementContext];
	var clippingClientRect = getClippingRect(isElement$1(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary, strategy);
	var referenceClientRect = getBoundingClientRect(state.elements.reference);
	var popperOffsets = computeOffsets({
		reference: referenceClientRect,
		element: popperRect,
		strategy: "absolute",
		placement
	});
	var popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets));
	var elementClientRect = elementContext === "popper" ? popperClientRect : referenceClientRect;
	var overflowOffsets = {
		top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
		bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
		left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
		right: elementClientRect.right - clippingClientRect.right + paddingObject.right
	};
	var offsetData = state.modifiersData.offset;
	if (elementContext === "popper" && offsetData) {
		var offset = offsetData[placement];
		Object.keys(overflowOffsets).forEach(function(key) {
			var multiply = ["right", "bottom"].indexOf(key) >= 0 ? 1 : -1;
			var axis = ["top", "bottom"].indexOf(key) >= 0 ? "y" : "x";
			overflowOffsets[key] += offset[axis] * multiply;
		});
	}
	return overflowOffsets;
}
//#endregion
//#region node_modules/@popperjs/core/lib/createPopper.js
var DEFAULT_OPTIONS = {
	placement: "bottom",
	modifiers: [],
	strategy: "absolute"
};
function areValidElements() {
	for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) args[_key] = arguments[_key];
	return !args.some(function(element) {
		return !(element && typeof element.getBoundingClientRect === "function");
	});
}
function popperGenerator(generatorOptions) {
	if (generatorOptions === void 0) generatorOptions = {};
	var _generatorOptions = generatorOptions, _generatorOptions$def = _generatorOptions.defaultModifiers, defaultModifiers = _generatorOptions$def === void 0 ? [] : _generatorOptions$def, _generatorOptions$def2 = _generatorOptions.defaultOptions, defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
	return function createPopper(reference, popper, options) {
		if (options === void 0) options = defaultOptions;
		var state = {
			placement: "bottom",
			orderedModifiers: [],
			options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
			modifiersData: {},
			elements: {
				reference,
				popper
			},
			attributes: {},
			styles: {}
		};
		var effectCleanupFns = [];
		var isDestroyed = false;
		var instance = {
			state,
			setOptions: function setOptions(setOptionsAction) {
				var options = typeof setOptionsAction === "function" ? setOptionsAction(state.options) : setOptionsAction;
				cleanupModifierEffects();
				state.options = Object.assign({}, defaultOptions, state.options, options);
				state.scrollParents = {
					reference: isElement$1(reference) ? listScrollParents(reference) : reference.contextElement ? listScrollParents(reference.contextElement) : [],
					popper: listScrollParents(popper)
				};
				var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers, state.options.modifiers)));
				state.orderedModifiers = orderedModifiers.filter(function(m) {
					return m.enabled;
				});
				runModifierEffects();
				return instance.update();
			},
			forceUpdate: function forceUpdate() {
				if (isDestroyed) return;
				var _state$elements = state.elements, reference = _state$elements.reference, popper = _state$elements.popper;
				if (!areValidElements(reference, popper)) return;
				state.rects = {
					reference: getCompositeRect(reference, getOffsetParent(popper), state.options.strategy === "fixed"),
					popper: getLayoutRect(popper)
				};
				state.reset = false;
				state.placement = state.options.placement;
				state.orderedModifiers.forEach(function(modifier) {
					return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
				});
				for (var index = 0; index < state.orderedModifiers.length; index++) {
					if (state.reset === true) {
						state.reset = false;
						index = -1;
						continue;
					}
					var _state$orderedModifie = state.orderedModifiers[index], fn = _state$orderedModifie.fn, _state$orderedModifie2 = _state$orderedModifie.options, _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2, name = _state$orderedModifie.name;
					if (typeof fn === "function") state = fn({
						state,
						options: _options,
						name,
						instance
					}) || state;
				}
			},
			update: debounce$1(function() {
				return new Promise(function(resolve) {
					instance.forceUpdate();
					resolve(state);
				});
			}),
			destroy: function destroy() {
				cleanupModifierEffects();
				isDestroyed = true;
			}
		};
		if (!areValidElements(reference, popper)) return instance;
		instance.setOptions(options).then(function(state) {
			if (!isDestroyed && options.onFirstUpdate) options.onFirstUpdate(state);
		});
		function runModifierEffects() {
			state.orderedModifiers.forEach(function(_ref) {
				var name = _ref.name, _ref$options = _ref.options, options = _ref$options === void 0 ? {} : _ref$options, effect = _ref.effect;
				if (typeof effect === "function") {
					var cleanupFn = effect({
						state,
						name,
						instance,
						options
					});
					effectCleanupFns.push(cleanupFn || function noopFn() {});
				}
			});
		}
		function cleanupModifierEffects() {
			effectCleanupFns.forEach(function(fn) {
				return fn();
			});
			effectCleanupFns = [];
		}
		return instance;
	};
}
//#endregion
//#region node_modules/@popperjs/core/lib/modifiers/eventListeners.js
var passive = { passive: true };
function effect$1(_ref) {
	var state = _ref.state, instance = _ref.instance, options = _ref.options;
	var _options$scroll = options.scroll, scroll = _options$scroll === void 0 ? true : _options$scroll, _options$resize = options.resize, resize = _options$resize === void 0 ? true : _options$resize;
	var window = getWindow(state.elements.popper);
	var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);
	if (scroll) scrollParents.forEach(function(scrollParent) {
		scrollParent.addEventListener("scroll", instance.update, passive);
	});
	if (resize) window.addEventListener("resize", instance.update, passive);
	return function() {
		if (scroll) scrollParents.forEach(function(scrollParent) {
			scrollParent.removeEventListener("scroll", instance.update, passive);
		});
		if (resize) window.removeEventListener("resize", instance.update, passive);
	};
}
var eventListeners_default = {
	name: "eventListeners",
	enabled: true,
	phase: "write",
	fn: function fn() {},
	effect: effect$1,
	data: {}
};
//#endregion
//#region node_modules/@popperjs/core/lib/modifiers/popperOffsets.js
function popperOffsets(_ref) {
	var state = _ref.state, name = _ref.name;
	state.modifiersData[name] = computeOffsets({
		reference: state.rects.reference,
		element: state.rects.popper,
		strategy: "absolute",
		placement: state.placement
	});
}
var popperOffsets_default = {
	name: "popperOffsets",
	enabled: true,
	phase: "read",
	fn: popperOffsets,
	data: {}
};
//#endregion
//#region node_modules/@popperjs/core/lib/modifiers/computeStyles.js
var unsetSides = {
	top: "auto",
	right: "auto",
	bottom: "auto",
	left: "auto"
};
function roundOffsetsByDPR(_ref, win) {
	var x = _ref.x, y = _ref.y;
	var dpr = win.devicePixelRatio || 1;
	return {
		x: round(x * dpr) / dpr || 0,
		y: round(y * dpr) / dpr || 0
	};
}
function mapToStyles(_ref2) {
	var _Object$assign2;
	var popper = _ref2.popper, popperRect = _ref2.popperRect, placement = _ref2.placement, variation = _ref2.variation, offsets = _ref2.offsets, position = _ref2.position, gpuAcceleration = _ref2.gpuAcceleration, adaptive = _ref2.adaptive, roundOffsets = _ref2.roundOffsets, isFixed = _ref2.isFixed;
	var _offsets$x = offsets.x, x = _offsets$x === void 0 ? 0 : _offsets$x, _offsets$y = offsets.y, y = _offsets$y === void 0 ? 0 : _offsets$y;
	var _ref3 = typeof roundOffsets === "function" ? roundOffsets({
		x,
		y
	}) : {
		x,
		y
	};
	x = _ref3.x;
	y = _ref3.y;
	var hasX = offsets.hasOwnProperty("x");
	var hasY = offsets.hasOwnProperty("y");
	var sideX = left;
	var sideY = "top";
	var win = window;
	if (adaptive) {
		var offsetParent = getOffsetParent(popper);
		var heightProp = "clientHeight";
		var widthProp = "clientWidth";
		if (offsetParent === getWindow(popper)) {
			offsetParent = getDocumentElement(popper);
			if (getComputedStyle(offsetParent).position !== "static" && position === "absolute") {
				heightProp = "scrollHeight";
				widthProp = "scrollWidth";
			}
		}
		offsetParent = offsetParent;
		if (placement === "top" || (placement === "left" || placement === "right") && variation === "end") {
			sideY = bottom;
			var offsetY = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.height : offsetParent[heightProp];
			y -= offsetY - popperRect.height;
			y *= gpuAcceleration ? 1 : -1;
		}
		if (placement === "left" || (placement === "top" || placement === "bottom") && variation === "end") {
			sideX = right;
			var offsetX = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.width : offsetParent[widthProp];
			x -= offsetX - popperRect.width;
			x *= gpuAcceleration ? 1 : -1;
		}
	}
	var commonStyles = Object.assign({ position }, adaptive && unsetSides);
	var _ref4 = roundOffsets === true ? roundOffsetsByDPR({
		x,
		y
	}, getWindow(popper)) : {
		x,
		y
	};
	x = _ref4.x;
	y = _ref4.y;
	if (gpuAcceleration) {
		var _Object$assign;
		return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? "0" : "", _Object$assign[sideX] = hasX ? "0" : "", _Object$assign.transform = (win.devicePixelRatio || 1) <= 1 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
	}
	return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : "", _Object$assign2[sideX] = hasX ? x + "px" : "", _Object$assign2.transform = "", _Object$assign2));
}
function computeStyles(_ref5) {
	var state = _ref5.state, options = _ref5.options;
	var _options$gpuAccelerat = options.gpuAcceleration, gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat, _options$adaptive = options.adaptive, adaptive = _options$adaptive === void 0 ? true : _options$adaptive, _options$roundOffsets = options.roundOffsets, roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets;
	var commonStyles = {
		placement: getBasePlacement$1(state.placement),
		variation: getVariation(state.placement),
		popper: state.elements.popper,
		popperRect: state.rects.popper,
		gpuAcceleration,
		isFixed: state.options.strategy === "fixed"
	};
	if (state.modifiersData.popperOffsets != null) state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
		offsets: state.modifiersData.popperOffsets,
		position: state.options.strategy,
		adaptive,
		roundOffsets
	})));
	if (state.modifiersData.arrow != null) state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
		offsets: state.modifiersData.arrow,
		position: "absolute",
		adaptive: false,
		roundOffsets
	})));
	state.attributes.popper = Object.assign({}, state.attributes.popper, { "data-popper-placement": state.placement });
}
var computeStyles_default = {
	name: "computeStyles",
	enabled: true,
	phase: "beforeWrite",
	fn: computeStyles,
	data: {}
};
//#endregion
//#region node_modules/@popperjs/core/lib/modifiers/offset.js
function distanceAndSkiddingToXY(placement, rects, offset) {
	var basePlacement = getBasePlacement$1(placement);
	var invertDistance = ["left", "top"].indexOf(basePlacement) >= 0 ? -1 : 1;
	var _ref = typeof offset === "function" ? offset(Object.assign({}, rects, { placement })) : offset, skidding = _ref[0], distance = _ref[1];
	skidding = skidding || 0;
	distance = (distance || 0) * invertDistance;
	return ["left", "right"].indexOf(basePlacement) >= 0 ? {
		x: distance,
		y: skidding
	} : {
		x: skidding,
		y: distance
	};
}
function offset(_ref2) {
	var state = _ref2.state, options = _ref2.options, name = _ref2.name;
	var _options$offset = options.offset, offset = _options$offset === void 0 ? [0, 0] : _options$offset;
	var data = placements.reduce(function(acc, placement) {
		acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset);
		return acc;
	}, {});
	var _data$state$placement = data[state.placement], x = _data$state$placement.x, y = _data$state$placement.y;
	if (state.modifiersData.popperOffsets != null) {
		state.modifiersData.popperOffsets.x += x;
		state.modifiersData.popperOffsets.y += y;
	}
	state.modifiersData[name] = data;
}
var offset_default = {
	name: "offset",
	enabled: true,
	phase: "main",
	requires: ["popperOffsets"],
	fn: offset
};
//#endregion
//#region node_modules/@popperjs/core/lib/utils/getOppositePlacement.js
var hash$1 = {
	left: "right",
	right: "left",
	bottom: "top",
	top: "bottom"
};
function getOppositePlacement(placement) {
	return placement.replace(/left|right|bottom|top/g, function(matched) {
		return hash$1[matched];
	});
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/getOppositeVariationPlacement.js
var hash = {
	start: "end",
	end: "start"
};
function getOppositeVariationPlacement(placement) {
	return placement.replace(/start|end/g, function(matched) {
		return hash[matched];
	});
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/computeAutoPlacement.js
function computeAutoPlacement(state, options) {
	if (options === void 0) options = {};
	var _options = options, placement = _options.placement, boundary = _options.boundary, rootBoundary = _options.rootBoundary, padding = _options.padding, flipVariations = _options.flipVariations, _options$allowedAutoP = _options.allowedAutoPlacements, allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
	var variation = getVariation(placement);
	var placements$1 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function(placement) {
		return getVariation(placement) === variation;
	}) : basePlacements;
	var allowedPlacements = placements$1.filter(function(placement) {
		return allowedAutoPlacements.indexOf(placement) >= 0;
	});
	if (allowedPlacements.length === 0) allowedPlacements = placements$1;
	var overflows = allowedPlacements.reduce(function(acc, placement) {
		acc[placement] = detectOverflow(state, {
			placement,
			boundary,
			rootBoundary,
			padding
		})[getBasePlacement$1(placement)];
		return acc;
	}, {});
	return Object.keys(overflows).sort(function(a, b) {
		return overflows[a] - overflows[b];
	});
}
//#endregion
//#region node_modules/@popperjs/core/lib/modifiers/flip.js
function getExpandedFallbackPlacements(placement) {
	if (getBasePlacement$1(placement) === "auto") return [];
	var oppositePlacement = getOppositePlacement(placement);
	return [
		getOppositeVariationPlacement(placement),
		oppositePlacement,
		getOppositeVariationPlacement(oppositePlacement)
	];
}
function flip(_ref) {
	var state = _ref.state, options = _ref.options, name = _ref.name;
	if (state.modifiersData[name]._skip) return;
	var _options$mainAxis = options.mainAxis, checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis, _options$altAxis = options.altAxis, checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis, specifiedFallbackPlacements = options.fallbackPlacements, padding = options.padding, boundary = options.boundary, rootBoundary = options.rootBoundary, altBoundary = options.altBoundary, _options$flipVariatio = options.flipVariations, flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio, allowedAutoPlacements = options.allowedAutoPlacements;
	var preferredPlacement = state.options.placement;
	var isBasePlacement = getBasePlacement$1(preferredPlacement) === preferredPlacement;
	var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
	var placements = [preferredPlacement].concat(fallbackPlacements).reduce(function(acc, placement) {
		return acc.concat(getBasePlacement$1(placement) === "auto" ? computeAutoPlacement(state, {
			placement,
			boundary,
			rootBoundary,
			padding,
			flipVariations,
			allowedAutoPlacements
		}) : placement);
	}, []);
	var referenceRect = state.rects.reference;
	var popperRect = state.rects.popper;
	var checksMap = /* @__PURE__ */ new Map();
	var makeFallbackChecks = true;
	var firstFittingPlacement = placements[0];
	for (var i = 0; i < placements.length; i++) {
		var placement = placements[i];
		var _basePlacement = getBasePlacement$1(placement);
		var isStartVariation = getVariation(placement) === start;
		var isVertical = ["top", bottom].indexOf(_basePlacement) >= 0;
		var len = isVertical ? "width" : "height";
		var overflow = detectOverflow(state, {
			placement,
			boundary,
			rootBoundary,
			altBoundary,
			padding
		});
		var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : "top";
		if (referenceRect[len] > popperRect[len]) mainVariationSide = getOppositePlacement(mainVariationSide);
		var altVariationSide = getOppositePlacement(mainVariationSide);
		var checks = [];
		if (checkMainAxis) checks.push(overflow[_basePlacement] <= 0);
		if (checkAltAxis) checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
		if (checks.every(function(check) {
			return check;
		})) {
			firstFittingPlacement = placement;
			makeFallbackChecks = false;
			break;
		}
		checksMap.set(placement, checks);
	}
	if (makeFallbackChecks) {
		var numberOfChecks = flipVariations ? 3 : 1;
		var _loop = function _loop(_i) {
			var fittingPlacement = placements.find(function(placement) {
				var checks = checksMap.get(placement);
				if (checks) return checks.slice(0, _i).every(function(check) {
					return check;
				});
			});
			if (fittingPlacement) {
				firstFittingPlacement = fittingPlacement;
				return "break";
			}
		};
		for (var _i = numberOfChecks; _i > 0; _i--) if (_loop(_i) === "break") break;
	}
	if (state.placement !== firstFittingPlacement) {
		state.modifiersData[name]._skip = true;
		state.placement = firstFittingPlacement;
		state.reset = true;
	}
}
var flip_default = {
	name: "flip",
	enabled: true,
	phase: "main",
	fn: flip,
	requiresIfExists: ["offset"],
	data: { _skip: false }
};
//#endregion
//#region node_modules/@popperjs/core/lib/utils/getAltAxis.js
function getAltAxis(axis) {
	return axis === "x" ? "y" : "x";
}
//#endregion
//#region node_modules/@popperjs/core/lib/utils/within.js
function within(min$2, value, max$2) {
	return max(min$2, min(value, max$2));
}
function withinMaxClamp(min, value, max) {
	var v = within(min, value, max);
	return v > max ? max : v;
}
//#endregion
//#region node_modules/@popperjs/core/lib/modifiers/preventOverflow.js
function preventOverflow(_ref) {
	var state = _ref.state, options = _ref.options, name = _ref.name;
	var _options$mainAxis = options.mainAxis, checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis, _options$altAxis = options.altAxis, checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis, boundary = options.boundary, rootBoundary = options.rootBoundary, altBoundary = options.altBoundary, padding = options.padding, _options$tether = options.tether, tether = _options$tether === void 0 ? true : _options$tether, _options$tetherOffset = options.tetherOffset, tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
	var overflow = detectOverflow(state, {
		boundary,
		rootBoundary,
		padding,
		altBoundary
	});
	var basePlacement = getBasePlacement$1(state.placement);
	var variation = getVariation(state.placement);
	var isBasePlacement = !variation;
	var mainAxis = getMainAxisFromPlacement(basePlacement);
	var altAxis = getAltAxis(mainAxis);
	var popperOffsets = state.modifiersData.popperOffsets;
	var referenceRect = state.rects.reference;
	var popperRect = state.rects.popper;
	var tetherOffsetValue = typeof tetherOffset === "function" ? tetherOffset(Object.assign({}, state.rects, { placement: state.placement })) : tetherOffset;
	var normalizedTetherOffsetValue = typeof tetherOffsetValue === "number" ? {
		mainAxis: tetherOffsetValue,
		altAxis: tetherOffsetValue
	} : Object.assign({
		mainAxis: 0,
		altAxis: 0
	}, tetherOffsetValue);
	var offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null;
	var data = {
		x: 0,
		y: 0
	};
	if (!popperOffsets) return;
	if (checkMainAxis) {
		var _offsetModifierState$;
		var mainSide = mainAxis === "y" ? "top" : left;
		var altSide = mainAxis === "y" ? bottom : right;
		var len = mainAxis === "y" ? "height" : "width";
		var offset = popperOffsets[mainAxis];
		var min$1 = offset + overflow[mainSide];
		var max$1 = offset - overflow[altSide];
		var additive = tether ? -popperRect[len] / 2 : 0;
		var minLen = variation === "start" ? referenceRect[len] : popperRect[len];
		var maxLen = variation === "start" ? -popperRect[len] : -referenceRect[len];
		var arrowElement = state.elements.arrow;
		var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
			width: 0,
			height: 0
		};
		var arrowPaddingObject = state.modifiersData["arrow#persistent"] ? state.modifiersData["arrow#persistent"].padding : getFreshSideObject();
		var arrowPaddingMin = arrowPaddingObject[mainSide];
		var arrowPaddingMax = arrowPaddingObject[altSide];
		var arrowLen = within(0, referenceRect[len], arrowRect[len]);
		var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis;
		var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis;
		var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
		var clientOffset = arrowOffsetParent ? mainAxis === "y" ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
		var offsetModifierValue = (_offsetModifierState$ = offsetModifierState == null ? void 0 : offsetModifierState[mainAxis]) != null ? _offsetModifierState$ : 0;
		var tetherMin = offset + minOffset - offsetModifierValue - clientOffset;
		var tetherMax = offset + maxOffset - offsetModifierValue;
		var preventedOffset = within(tether ? min(min$1, tetherMin) : min$1, offset, tether ? max(max$1, tetherMax) : max$1);
		popperOffsets[mainAxis] = preventedOffset;
		data[mainAxis] = preventedOffset - offset;
	}
	if (checkAltAxis) {
		var _offsetModifierState$2;
		var _mainSide = mainAxis === "x" ? "top" : left;
		var _altSide = mainAxis === "x" ? bottom : right;
		var _offset = popperOffsets[altAxis];
		var _len = altAxis === "y" ? "height" : "width";
		var _min = _offset + overflow[_mainSide];
		var _max = _offset - overflow[_altSide];
		var isOriginSide = ["top", left].indexOf(basePlacement) !== -1;
		var _offsetModifierValue = (_offsetModifierState$2 = offsetModifierState == null ? void 0 : offsetModifierState[altAxis]) != null ? _offsetModifierState$2 : 0;
		var _tetherMin = isOriginSide ? _min : _offset - referenceRect[_len] - popperRect[_len] - _offsetModifierValue + normalizedTetherOffsetValue.altAxis;
		var _tetherMax = isOriginSide ? _offset + referenceRect[_len] + popperRect[_len] - _offsetModifierValue - normalizedTetherOffsetValue.altAxis : _max;
		var _preventedOffset = tether && isOriginSide ? withinMaxClamp(_tetherMin, _offset, _tetherMax) : within(tether ? _tetherMin : _min, _offset, tether ? _tetherMax : _max);
		popperOffsets[altAxis] = _preventedOffset;
		data[altAxis] = _preventedOffset - _offset;
	}
	state.modifiersData[name] = data;
}
var preventOverflow_default = {
	name: "preventOverflow",
	enabled: true,
	phase: "main",
	fn: preventOverflow,
	requiresIfExists: ["offset"]
};
//#endregion
//#region node_modules/@popperjs/core/lib/modifiers/arrow.js
var toPaddingObject = function toPaddingObject(padding, state) {
	padding = typeof padding === "function" ? padding(Object.assign({}, state.rects, { placement: state.placement })) : padding;
	return mergePaddingObject(typeof padding !== "number" ? padding : expandToHashMap(padding, basePlacements));
};
function arrow(_ref) {
	var _state$modifiersData$;
	var state = _ref.state, name = _ref.name, options = _ref.options;
	var arrowElement = state.elements.arrow;
	var popperOffsets = state.modifiersData.popperOffsets;
	var basePlacement = getBasePlacement$1(state.placement);
	var axis = getMainAxisFromPlacement(basePlacement);
	var len = ["left", "right"].indexOf(basePlacement) >= 0 ? "height" : "width";
	if (!arrowElement || !popperOffsets) return;
	var paddingObject = toPaddingObject(options.padding, state);
	var arrowRect = getLayoutRect(arrowElement);
	var minProp = axis === "y" ? "top" : left;
	var maxProp = axis === "y" ? bottom : right;
	var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets[axis] - state.rects.popper[len];
	var startDiff = popperOffsets[axis] - state.rects.reference[axis];
	var arrowOffsetParent = getOffsetParent(arrowElement);
	var clientSize = arrowOffsetParent ? axis === "y" ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
	var centerToReference = endDiff / 2 - startDiff / 2;
	var min = paddingObject[minProp];
	var max = clientSize - arrowRect[len] - paddingObject[maxProp];
	var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
	var offset = within(min, center, max);
	var axisProp = axis;
	state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset, _state$modifiersData$.centerOffset = offset - center, _state$modifiersData$);
}
function effect(_ref2) {
	var state = _ref2.state;
	var _options$element = _ref2.options.element, arrowElement = _options$element === void 0 ? "[data-popper-arrow]" : _options$element;
	if (arrowElement == null) return;
	if (typeof arrowElement === "string") {
		arrowElement = state.elements.popper.querySelector(arrowElement);
		if (!arrowElement) return;
	}
	if (!contains(state.elements.popper, arrowElement)) return;
	state.elements.arrow = arrowElement;
}
var arrow_default = {
	name: "arrow",
	enabled: true,
	phase: "main",
	fn: arrow,
	effect,
	requires: ["popperOffsets"],
	requiresIfExists: ["preventOverflow"]
};
//#endregion
//#region node_modules/@popperjs/core/lib/modifiers/hide.js
function getSideOffsets(overflow, rect, preventedOffsets) {
	if (preventedOffsets === void 0) preventedOffsets = {
		x: 0,
		y: 0
	};
	return {
		top: overflow.top - rect.height - preventedOffsets.y,
		right: overflow.right - rect.width + preventedOffsets.x,
		bottom: overflow.bottom - rect.height + preventedOffsets.y,
		left: overflow.left - rect.width - preventedOffsets.x
	};
}
function isAnySideFullyClipped(overflow) {
	return [
		"top",
		right,
		bottom,
		left
	].some(function(side) {
		return overflow[side] >= 0;
	});
}
function hide(_ref) {
	var state = _ref.state, name = _ref.name;
	var referenceRect = state.rects.reference;
	var popperRect = state.rects.popper;
	var preventedOffsets = state.modifiersData.preventOverflow;
	var referenceOverflow = detectOverflow(state, { elementContext: "reference" });
	var popperAltOverflow = detectOverflow(state, { altBoundary: true });
	var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
	var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
	var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
	var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
	state.modifiersData[name] = {
		referenceClippingOffsets,
		popperEscapeOffsets,
		isReferenceHidden,
		hasPopperEscaped
	};
	state.attributes.popper = Object.assign({}, state.attributes.popper, {
		"data-popper-reference-hidden": isReferenceHidden,
		"data-popper-escaped": hasPopperEscaped
	});
}
var createPopper = /*#__PURE__*/ popperGenerator({ defaultModifiers: [
	eventListeners_default,
	popperOffsets_default,
	computeStyles_default,
	applyStyles_default,
	offset_default,
	flip_default,
	preventOverflow_default,
	arrow_default,
	{
		name: "hide",
		enabled: true,
		phase: "main",
		requiresIfExists: ["preventOverflow"],
		fn: hide
	}
] });
//#endregion
//#region node_modules/tippy.js/dist/tippy.esm.js
/**!
* tippy.js v6.3.7
* (c) 2017-2021 atomiks
* MIT License
*/
var BOX_CLASS = "tippy-box";
var CONTENT_CLASS = "tippy-content";
var BACKDROP_CLASS = "tippy-backdrop";
var ARROW_CLASS = "tippy-arrow";
var SVG_ARROW_CLASS = "tippy-svg-arrow";
var TOUCH_OPTIONS = {
	passive: true,
	capture: true
};
var TIPPY_DEFAULT_APPEND_TO = function TIPPY_DEFAULT_APPEND_TO() {
	return document.body;
};
function getValueAtIndexOrReturn(value, index, defaultValue) {
	if (Array.isArray(value)) {
		var v = value[index];
		return v == null ? Array.isArray(defaultValue) ? defaultValue[index] : defaultValue : v;
	}
	return value;
}
function isType(value, type) {
	var str = {}.toString.call(value);
	return str.indexOf("[object") === 0 && str.indexOf(type + "]") > -1;
}
function invokeWithArgsOrReturn(value, args) {
	return typeof value === "function" ? value.apply(void 0, args) : value;
}
function debounce(fn, ms) {
	if (ms === 0) return fn;
	var timeout;
	return function(arg) {
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			fn(arg);
		}, ms);
	};
}
function splitBySpaces(value) {
	return value.split(/\s+/).filter(Boolean);
}
function normalizeToArray(value) {
	return [].concat(value);
}
function pushIfUnique(arr, value) {
	if (arr.indexOf(value) === -1) arr.push(value);
}
function unique(arr) {
	return arr.filter(function(item, index) {
		return arr.indexOf(item) === index;
	});
}
function getBasePlacement(placement) {
	return placement.split("-")[0];
}
function arrayFrom(value) {
	return [].slice.call(value);
}
function removeUndefinedProps(obj) {
	return Object.keys(obj).reduce(function(acc, key) {
		if (obj[key] !== void 0) acc[key] = obj[key];
		return acc;
	}, {});
}
function div() {
	return document.createElement("div");
}
function isElement(value) {
	return ["Element", "Fragment"].some(function(type) {
		return isType(value, type);
	});
}
function isNodeList(value) {
	return isType(value, "NodeList");
}
function isMouseEvent(value) {
	return isType(value, "MouseEvent");
}
function isReferenceElement(value) {
	return !!(value && value._tippy && value._tippy.reference === value);
}
function getArrayOfElements(value) {
	if (isElement(value)) return [value];
	if (isNodeList(value)) return arrayFrom(value);
	if (Array.isArray(value)) return value;
	return arrayFrom(document.querySelectorAll(value));
}
function setTransitionDuration(els, value) {
	els.forEach(function(el) {
		if (el) el.style.transitionDuration = value + "ms";
	});
}
function setVisibilityState(els, state) {
	els.forEach(function(el) {
		if (el) el.setAttribute("data-state", state);
	});
}
function getOwnerDocument(elementOrElements) {
	var _element$ownerDocumen;
	var element = normalizeToArray(elementOrElements)[0];
	return element != null && (_element$ownerDocumen = element.ownerDocument) != null && _element$ownerDocumen.body ? element.ownerDocument : document;
}
function isCursorOutsideInteractiveBorder(popperTreeData, event) {
	var clientX = event.clientX, clientY = event.clientY;
	return popperTreeData.every(function(_ref) {
		var popperRect = _ref.popperRect, popperState = _ref.popperState;
		var interactiveBorder = _ref.props.interactiveBorder;
		var basePlacement = getBasePlacement(popperState.placement);
		var offsetData = popperState.modifiersData.offset;
		if (!offsetData) return true;
		var topDistance = basePlacement === "bottom" ? offsetData.top.y : 0;
		var bottomDistance = basePlacement === "top" ? offsetData.bottom.y : 0;
		var leftDistance = basePlacement === "right" ? offsetData.left.x : 0;
		var rightDistance = basePlacement === "left" ? offsetData.right.x : 0;
		var exceedsTop = popperRect.top - clientY + topDistance > interactiveBorder;
		var exceedsBottom = clientY - popperRect.bottom - bottomDistance > interactiveBorder;
		var exceedsLeft = popperRect.left - clientX + leftDistance > interactiveBorder;
		var exceedsRight = clientX - popperRect.right - rightDistance > interactiveBorder;
		return exceedsTop || exceedsBottom || exceedsLeft || exceedsRight;
	});
}
function updateTransitionEndListener(box, action, listener) {
	var method = action + "EventListener";
	["transitionend", "webkitTransitionEnd"].forEach(function(event) {
		box[method](event, listener);
	});
}
/**
* Compared to xxx.contains, this function works for dom structures with shadow
* dom
*/
function actualContains(parent, child) {
	var target = child;
	while (target) {
		var _target$getRootNode;
		if (parent.contains(target)) return true;
		target = target.getRootNode == null ? void 0 : (_target$getRootNode = target.getRootNode()) == null ? void 0 : _target$getRootNode.host;
	}
	return false;
}
var currentInput = { isTouch: false };
var lastMouseMoveTime = 0;
/**
* When a `touchstart` event is fired, it's assumed the user is using touch
* input. We'll bind a `mousemove` event listener to listen for mouse input in
* the future. This way, the `isTouch` property is fully dynamic and will handle
* hybrid devices that use a mix of touch + mouse input.
*/
function onDocumentTouchStart() {
	if (currentInput.isTouch) return;
	currentInput.isTouch = true;
	if (window.performance) document.addEventListener("mousemove", onDocumentMouseMove);
}
/**
* When two `mousemove` event are fired consecutively within 20ms, it's assumed
* the user is using mouse input again. `mousemove` can fire on touch devices as
* well, but very rarely that quickly.
*/
function onDocumentMouseMove() {
	var now = performance.now();
	if (now - lastMouseMoveTime < 20) {
		currentInput.isTouch = false;
		document.removeEventListener("mousemove", onDocumentMouseMove);
	}
	lastMouseMoveTime = now;
}
/**
* When an element is in focus and has a tippy, leaving the tab/window and
* returning causes it to show again. For mouse users this is unexpected, but
* for keyboard use it makes sense.
* TODO: find a better technique to solve this problem
*/
function onWindowBlur() {
	var activeElement = document.activeElement;
	if (isReferenceElement(activeElement)) {
		var instance = activeElement._tippy;
		if (activeElement.blur && !instance.state.isVisible) activeElement.blur();
	}
}
function bindGlobalEventListeners() {
	document.addEventListener("touchstart", onDocumentTouchStart, TOUCH_OPTIONS);
	window.addEventListener("blur", onWindowBlur);
}
var isIE11 = typeof window !== "undefined" && typeof document !== "undefined" ? !!window.msCrypto : false;
var defaultProps = Object.assign({
	appendTo: TIPPY_DEFAULT_APPEND_TO,
	aria: {
		content: "auto",
		expanded: "auto"
	},
	delay: 0,
	duration: [300, 250],
	getReferenceClientRect: null,
	hideOnClick: true,
	ignoreAttributes: false,
	interactive: false,
	interactiveBorder: 2,
	interactiveDebounce: 0,
	moveTransition: "",
	offset: [0, 10],
	onAfterUpdate: function onAfterUpdate() {},
	onBeforeUpdate: function onBeforeUpdate() {},
	onCreate: function onCreate() {},
	onDestroy: function onDestroy() {},
	onHidden: function onHidden() {},
	onHide: function onHide() {},
	onMount: function onMount() {},
	onShow: function onShow() {},
	onShown: function onShown() {},
	onTrigger: function onTrigger() {},
	onUntrigger: function onUntrigger() {},
	onClickOutside: function onClickOutside() {},
	placement: "top",
	plugins: [],
	popperOptions: {},
	render: null,
	showOnCreate: false,
	touch: true,
	trigger: "mouseenter focus",
	triggerTarget: null
}, {
	animateFill: false,
	followCursor: false,
	inlinePositioning: false,
	sticky: false
}, {
	allowHTML: false,
	animation: "fade",
	arrow: true,
	content: "",
	inertia: false,
	maxWidth: 350,
	role: "tooltip",
	theme: "",
	zIndex: 9999
});
var defaultKeys = Object.keys(defaultProps);
var setDefaultProps = function setDefaultProps(partialProps) {
	Object.keys(partialProps).forEach(function(key) {
		defaultProps[key] = partialProps[key];
	});
};
function getExtendedPassedProps(passedProps) {
	var pluginProps = (passedProps.plugins || []).reduce(function(acc, plugin) {
		var name = plugin.name, defaultValue = plugin.defaultValue;
		if (name) {
			var _name;
			acc[name] = passedProps[name] !== void 0 ? passedProps[name] : (_name = defaultProps[name]) != null ? _name : defaultValue;
		}
		return acc;
	}, {});
	return Object.assign({}, passedProps, pluginProps);
}
function getDataAttributeProps(reference, plugins) {
	return (plugins ? Object.keys(getExtendedPassedProps(Object.assign({}, defaultProps, { plugins }))) : defaultKeys).reduce(function(acc, key) {
		var valueAsString = (reference.getAttribute("data-tippy-" + key) || "").trim();
		if (!valueAsString) return acc;
		if (key === "content") acc[key] = valueAsString;
		else try {
			acc[key] = JSON.parse(valueAsString);
		} catch (e) {
			acc[key] = valueAsString;
		}
		return acc;
	}, {});
}
function evaluateProps(reference, props) {
	var out = Object.assign({}, props, { content: invokeWithArgsOrReturn(props.content, [reference]) }, props.ignoreAttributes ? {} : getDataAttributeProps(reference, props.plugins));
	out.aria = Object.assign({}, defaultProps.aria, out.aria);
	out.aria = {
		expanded: out.aria.expanded === "auto" ? props.interactive : out.aria.expanded,
		content: out.aria.content === "auto" ? props.interactive ? null : "describedby" : out.aria.content
	};
	return out;
}
var innerHTML = function innerHTML() {
	return "innerHTML";
};
function dangerouslySetInnerHTML(element, html) {
	element[innerHTML()] = html;
}
function createArrowElement(value) {
	var arrow = div();
	if (value === true) arrow.className = ARROW_CLASS;
	else {
		arrow.className = SVG_ARROW_CLASS;
		if (isElement(value)) arrow.appendChild(value);
		else dangerouslySetInnerHTML(arrow, value);
	}
	return arrow;
}
function setContent(content, props) {
	if (isElement(props.content)) {
		dangerouslySetInnerHTML(content, "");
		content.appendChild(props.content);
	} else if (typeof props.content !== "function") if (props.allowHTML) dangerouslySetInnerHTML(content, props.content);
	else content.textContent = props.content;
}
function getChildren(popper) {
	var box = popper.firstElementChild;
	var boxChildren = arrayFrom(box.children);
	return {
		box,
		content: boxChildren.find(function(node) {
			return node.classList.contains(CONTENT_CLASS);
		}),
		arrow: boxChildren.find(function(node) {
			return node.classList.contains(ARROW_CLASS) || node.classList.contains(SVG_ARROW_CLASS);
		}),
		backdrop: boxChildren.find(function(node) {
			return node.classList.contains(BACKDROP_CLASS);
		})
	};
}
function render(instance) {
	var popper = div();
	var box = div();
	box.className = BOX_CLASS;
	box.setAttribute("data-state", "hidden");
	box.setAttribute("tabindex", "-1");
	var content = div();
	content.className = CONTENT_CLASS;
	content.setAttribute("data-state", "hidden");
	setContent(content, instance.props);
	popper.appendChild(box);
	box.appendChild(content);
	onUpdate(instance.props, instance.props);
	function onUpdate(prevProps, nextProps) {
		var _getChildren = getChildren(popper), box = _getChildren.box, content = _getChildren.content, arrow = _getChildren.arrow;
		if (nextProps.theme) box.setAttribute("data-theme", nextProps.theme);
		else box.removeAttribute("data-theme");
		if (typeof nextProps.animation === "string") box.setAttribute("data-animation", nextProps.animation);
		else box.removeAttribute("data-animation");
		if (nextProps.inertia) box.setAttribute("data-inertia", "");
		else box.removeAttribute("data-inertia");
		box.style.maxWidth = typeof nextProps.maxWidth === "number" ? nextProps.maxWidth + "px" : nextProps.maxWidth;
		if (nextProps.role) box.setAttribute("role", nextProps.role);
		else box.removeAttribute("role");
		if (prevProps.content !== nextProps.content || prevProps.allowHTML !== nextProps.allowHTML) setContent(content, instance.props);
		if (nextProps.arrow) {
			if (!arrow) box.appendChild(createArrowElement(nextProps.arrow));
			else if (prevProps.arrow !== nextProps.arrow) {
				box.removeChild(arrow);
				box.appendChild(createArrowElement(nextProps.arrow));
			}
		} else if (arrow) box.removeChild(arrow);
	}
	return {
		popper,
		onUpdate
	};
}
render.$$tippy = true;
var idCounter = 1;
var mouseMoveListeners = [];
var mountedInstances = [];
function createTippy(reference, passedProps) {
	var props = evaluateProps(reference, Object.assign({}, defaultProps, getExtendedPassedProps(removeUndefinedProps(passedProps))));
	var showTimeout;
	var hideTimeout;
	var scheduleHideAnimationFrame;
	var isVisibleFromClick = false;
	var didHideDueToDocumentMouseDown = false;
	var didTouchMove = false;
	var ignoreOnFirstUpdate = false;
	var lastTriggerEvent;
	var currentTransitionEndListener;
	var onFirstUpdate;
	var listeners = [];
	var debouncedOnMouseMove = debounce(onMouseMove, props.interactiveDebounce);
	var currentTarget;
	var id = idCounter++;
	var popperInstance = null;
	var plugins = unique(props.plugins);
	var instance = {
		id,
		reference,
		popper: div(),
		popperInstance,
		props,
		state: {
			isEnabled: true,
			isVisible: false,
			isDestroyed: false,
			isMounted: false,
			isShown: false
		},
		plugins,
		clearDelayTimeouts,
		setProps,
		setContent,
		show,
		hide,
		hideWithInteractivity,
		enable,
		disable,
		unmount,
		destroy
	};
	/* istanbul ignore if */
	if (!props.render) return instance;
	var _props$render = props.render(instance), popper = _props$render.popper, onUpdate = _props$render.onUpdate;
	popper.setAttribute("data-tippy-root", "");
	popper.id = "tippy-" + instance.id;
	instance.popper = popper;
	reference._tippy = instance;
	popper._tippy = instance;
	var pluginsHooks = plugins.map(function(plugin) {
		return plugin.fn(instance);
	});
	var hasAriaExpanded = reference.hasAttribute("aria-expanded");
	addListeners();
	handleAriaExpandedAttribute();
	handleStyles();
	invokeHook("onCreate", [instance]);
	if (props.showOnCreate) scheduleShow();
	popper.addEventListener("mouseenter", function() {
		if (instance.props.interactive && instance.state.isVisible) instance.clearDelayTimeouts();
	});
	popper.addEventListener("mouseleave", function() {
		if (instance.props.interactive && instance.props.trigger.indexOf("mouseenter") >= 0) getDocument().addEventListener("mousemove", debouncedOnMouseMove);
	});
	return instance;
	function getNormalizedTouchSettings() {
		var touch = instance.props.touch;
		return Array.isArray(touch) ? touch : [touch, 0];
	}
	function getIsCustomTouchBehavior() {
		return getNormalizedTouchSettings()[0] === "hold";
	}
	function getIsDefaultRenderFn() {
		var _instance$props$rende;
		return !!((_instance$props$rende = instance.props.render) != null && _instance$props$rende.$$tippy);
	}
	function getCurrentTarget() {
		return currentTarget || reference;
	}
	function getDocument() {
		var parent = getCurrentTarget().parentNode;
		return parent ? getOwnerDocument(parent) : document;
	}
	function getDefaultTemplateChildren() {
		return getChildren(popper);
	}
	function getDelay(isShow) {
		if (instance.state.isMounted && !instance.state.isVisible || currentInput.isTouch || lastTriggerEvent && lastTriggerEvent.type === "focus") return 0;
		return getValueAtIndexOrReturn(instance.props.delay, isShow ? 0 : 1, defaultProps.delay);
	}
	function handleStyles(fromHide) {
		if (fromHide === void 0) fromHide = false;
		popper.style.pointerEvents = instance.props.interactive && !fromHide ? "" : "none";
		popper.style.zIndex = "" + instance.props.zIndex;
	}
	function invokeHook(hook, args, shouldInvokePropsHook) {
		if (shouldInvokePropsHook === void 0) shouldInvokePropsHook = true;
		pluginsHooks.forEach(function(pluginHooks) {
			if (pluginHooks[hook]) pluginHooks[hook].apply(pluginHooks, args);
		});
		if (shouldInvokePropsHook) {
			var _instance$props;
			(_instance$props = instance.props)[hook].apply(_instance$props, args);
		}
	}
	function handleAriaContentAttribute() {
		var aria = instance.props.aria;
		if (!aria.content) return;
		var attr = "aria-" + aria.content;
		var id = popper.id;
		normalizeToArray(instance.props.triggerTarget || reference).forEach(function(node) {
			var currentValue = node.getAttribute(attr);
			if (instance.state.isVisible) node.setAttribute(attr, currentValue ? currentValue + " " + id : id);
			else {
				var nextValue = currentValue && currentValue.replace(id, "").trim();
				if (nextValue) node.setAttribute(attr, nextValue);
				else node.removeAttribute(attr);
			}
		});
	}
	function handleAriaExpandedAttribute() {
		if (hasAriaExpanded || !instance.props.aria.expanded) return;
		normalizeToArray(instance.props.triggerTarget || reference).forEach(function(node) {
			if (instance.props.interactive) node.setAttribute("aria-expanded", instance.state.isVisible && node === getCurrentTarget() ? "true" : "false");
			else node.removeAttribute("aria-expanded");
		});
	}
	function cleanupInteractiveMouseListeners() {
		getDocument().removeEventListener("mousemove", debouncedOnMouseMove);
		mouseMoveListeners = mouseMoveListeners.filter(function(listener) {
			return listener !== debouncedOnMouseMove;
		});
	}
	function onDocumentPress(event) {
		if (currentInput.isTouch) {
			if (didTouchMove || event.type === "mousedown") return;
		}
		var actualTarget = event.composedPath && event.composedPath()[0] || event.target;
		if (instance.props.interactive && actualContains(popper, actualTarget)) return;
		if (normalizeToArray(instance.props.triggerTarget || reference).some(function(el) {
			return actualContains(el, actualTarget);
		})) {
			if (currentInput.isTouch) return;
			if (instance.state.isVisible && instance.props.trigger.indexOf("click") >= 0) return;
		} else invokeHook("onClickOutside", [instance, event]);
		if (instance.props.hideOnClick === true) {
			instance.clearDelayTimeouts();
			instance.hide();
			didHideDueToDocumentMouseDown = true;
			setTimeout(function() {
				didHideDueToDocumentMouseDown = false;
			});
			if (!instance.state.isMounted) removeDocumentPress();
		}
	}
	function onTouchMove() {
		didTouchMove = true;
	}
	function onTouchStart() {
		didTouchMove = false;
	}
	function addDocumentPress() {
		var doc = getDocument();
		doc.addEventListener("mousedown", onDocumentPress, true);
		doc.addEventListener("touchend", onDocumentPress, TOUCH_OPTIONS);
		doc.addEventListener("touchstart", onTouchStart, TOUCH_OPTIONS);
		doc.addEventListener("touchmove", onTouchMove, TOUCH_OPTIONS);
	}
	function removeDocumentPress() {
		var doc = getDocument();
		doc.removeEventListener("mousedown", onDocumentPress, true);
		doc.removeEventListener("touchend", onDocumentPress, TOUCH_OPTIONS);
		doc.removeEventListener("touchstart", onTouchStart, TOUCH_OPTIONS);
		doc.removeEventListener("touchmove", onTouchMove, TOUCH_OPTIONS);
	}
	function onTransitionedOut(duration, callback) {
		onTransitionEnd(duration, function() {
			if (!instance.state.isVisible && popper.parentNode && popper.parentNode.contains(popper)) callback();
		});
	}
	function onTransitionedIn(duration, callback) {
		onTransitionEnd(duration, callback);
	}
	function onTransitionEnd(duration, callback) {
		var box = getDefaultTemplateChildren().box;
		function listener(event) {
			if (event.target === box) {
				updateTransitionEndListener(box, "remove", listener);
				callback();
			}
		}
		if (duration === 0) return callback();
		updateTransitionEndListener(box, "remove", currentTransitionEndListener);
		updateTransitionEndListener(box, "add", listener);
		currentTransitionEndListener = listener;
	}
	function on(eventType, handler, options) {
		if (options === void 0) options = false;
		normalizeToArray(instance.props.triggerTarget || reference).forEach(function(node) {
			node.addEventListener(eventType, handler, options);
			listeners.push({
				node,
				eventType,
				handler,
				options
			});
		});
	}
	function addListeners() {
		if (getIsCustomTouchBehavior()) {
			on("touchstart", onTrigger, { passive: true });
			on("touchend", onMouseLeave, { passive: true });
		}
		splitBySpaces(instance.props.trigger).forEach(function(eventType) {
			if (eventType === "manual") return;
			on(eventType, onTrigger);
			switch (eventType) {
				case "mouseenter":
					on("mouseleave", onMouseLeave);
					break;
				case "focus":
					on(isIE11 ? "focusout" : "blur", onBlurOrFocusOut);
					break;
				case "focusin":
					on("focusout", onBlurOrFocusOut);
					break;
			}
		});
	}
	function removeListeners() {
		listeners.forEach(function(_ref) {
			var node = _ref.node, eventType = _ref.eventType, handler = _ref.handler, options = _ref.options;
			node.removeEventListener(eventType, handler, options);
		});
		listeners = [];
	}
	function onTrigger(event) {
		var _lastTriggerEvent;
		var shouldScheduleClickHide = false;
		if (!instance.state.isEnabled || isEventListenerStopped(event) || didHideDueToDocumentMouseDown) return;
		var wasFocused = ((_lastTriggerEvent = lastTriggerEvent) == null ? void 0 : _lastTriggerEvent.type) === "focus";
		lastTriggerEvent = event;
		currentTarget = event.currentTarget;
		handleAriaExpandedAttribute();
		if (!instance.state.isVisible && isMouseEvent(event)) mouseMoveListeners.forEach(function(listener) {
			return listener(event);
		});
		if (event.type === "click" && (instance.props.trigger.indexOf("mouseenter") < 0 || isVisibleFromClick) && instance.props.hideOnClick !== false && instance.state.isVisible) shouldScheduleClickHide = true;
		else scheduleShow(event);
		if (event.type === "click") isVisibleFromClick = !shouldScheduleClickHide;
		if (shouldScheduleClickHide && !wasFocused) scheduleHide(event);
	}
	function onMouseMove(event) {
		var target = event.target;
		var isCursorOverReferenceOrPopper = getCurrentTarget().contains(target) || popper.contains(target);
		if (event.type === "mousemove" && isCursorOverReferenceOrPopper) return;
		if (isCursorOutsideInteractiveBorder(getNestedPopperTree().concat(popper).map(function(popper) {
			var _instance$popperInsta;
			var state = (_instance$popperInsta = popper._tippy.popperInstance) == null ? void 0 : _instance$popperInsta.state;
			if (state) return {
				popperRect: popper.getBoundingClientRect(),
				popperState: state,
				props
			};
			return null;
		}).filter(Boolean), event)) {
			cleanupInteractiveMouseListeners();
			scheduleHide(event);
		}
	}
	function onMouseLeave(event) {
		if (isEventListenerStopped(event) || instance.props.trigger.indexOf("click") >= 0 && isVisibleFromClick) return;
		if (instance.props.interactive) {
			instance.hideWithInteractivity(event);
			return;
		}
		scheduleHide(event);
	}
	function onBlurOrFocusOut(event) {
		if (instance.props.trigger.indexOf("focusin") < 0 && event.target !== getCurrentTarget()) return;
		if (instance.props.interactive && event.relatedTarget && popper.contains(event.relatedTarget)) return;
		scheduleHide(event);
	}
	function isEventListenerStopped(event) {
		return currentInput.isTouch ? getIsCustomTouchBehavior() !== event.type.indexOf("touch") >= 0 : false;
	}
	function createPopperInstance() {
		destroyPopperInstance();
		var _instance$props2 = instance.props, popperOptions = _instance$props2.popperOptions, placement = _instance$props2.placement, offset = _instance$props2.offset, getReferenceClientRect = _instance$props2.getReferenceClientRect, moveTransition = _instance$props2.moveTransition;
		var arrow = getIsDefaultRenderFn() ? getChildren(popper).arrow : null;
		var computedReference = getReferenceClientRect ? {
			getBoundingClientRect: getReferenceClientRect,
			contextElement: getReferenceClientRect.contextElement || getCurrentTarget()
		} : reference;
		var modifiers = [
			{
				name: "offset",
				options: { offset }
			},
			{
				name: "preventOverflow",
				options: { padding: {
					top: 2,
					bottom: 2,
					left: 5,
					right: 5
				} }
			},
			{
				name: "flip",
				options: { padding: 5 }
			},
			{
				name: "computeStyles",
				options: { adaptive: !moveTransition }
			},
			{
				name: "$$tippy",
				enabled: true,
				phase: "beforeWrite",
				requires: ["computeStyles"],
				fn: function fn(_ref2) {
					var state = _ref2.state;
					if (getIsDefaultRenderFn()) {
						var box = getDefaultTemplateChildren().box;
						[
							"placement",
							"reference-hidden",
							"escaped"
						].forEach(function(attr) {
							if (attr === "placement") box.setAttribute("data-placement", state.placement);
							else if (state.attributes.popper["data-popper-" + attr]) box.setAttribute("data-" + attr, "");
							else box.removeAttribute("data-" + attr);
						});
						state.attributes.popper = {};
					}
				}
			}
		];
		if (getIsDefaultRenderFn() && arrow) modifiers.push({
			name: "arrow",
			options: {
				element: arrow,
				padding: 3
			}
		});
		modifiers.push.apply(modifiers, (popperOptions == null ? void 0 : popperOptions.modifiers) || []);
		instance.popperInstance = createPopper(computedReference, popper, Object.assign({}, popperOptions, {
			placement,
			onFirstUpdate,
			modifiers
		}));
	}
	function destroyPopperInstance() {
		if (instance.popperInstance) {
			instance.popperInstance.destroy();
			instance.popperInstance = null;
		}
	}
	function mount() {
		var appendTo = instance.props.appendTo;
		var parentNode;
		var node = getCurrentTarget();
		if (instance.props.interactive && appendTo === TIPPY_DEFAULT_APPEND_TO || appendTo === "parent") parentNode = node.parentNode;
		else parentNode = invokeWithArgsOrReturn(appendTo, [node]);
		if (!parentNode.contains(popper)) parentNode.appendChild(popper);
		instance.state.isMounted = true;
		createPopperInstance();
	}
	function getNestedPopperTree() {
		return arrayFrom(popper.querySelectorAll("[data-tippy-root]"));
	}
	function scheduleShow(event) {
		instance.clearDelayTimeouts();
		if (event) invokeHook("onTrigger", [instance, event]);
		addDocumentPress();
		var delay = getDelay(true);
		var _getNormalizedTouchSe = getNormalizedTouchSettings(), touchValue = _getNormalizedTouchSe[0], touchDelay = _getNormalizedTouchSe[1];
		if (currentInput.isTouch && touchValue === "hold" && touchDelay) delay = touchDelay;
		if (delay) showTimeout = setTimeout(function() {
			instance.show();
		}, delay);
		else instance.show();
	}
	function scheduleHide(event) {
		instance.clearDelayTimeouts();
		invokeHook("onUntrigger", [instance, event]);
		if (!instance.state.isVisible) {
			removeDocumentPress();
			return;
		}
		if (instance.props.trigger.indexOf("mouseenter") >= 0 && instance.props.trigger.indexOf("click") >= 0 && ["mouseleave", "mousemove"].indexOf(event.type) >= 0 && isVisibleFromClick) return;
		var delay = getDelay(false);
		if (delay) hideTimeout = setTimeout(function() {
			if (instance.state.isVisible) instance.hide();
		}, delay);
		else scheduleHideAnimationFrame = requestAnimationFrame(function() {
			instance.hide();
		});
	}
	function enable() {
		instance.state.isEnabled = true;
	}
	function disable() {
		instance.hide();
		instance.state.isEnabled = false;
	}
	function clearDelayTimeouts() {
		clearTimeout(showTimeout);
		clearTimeout(hideTimeout);
		cancelAnimationFrame(scheduleHideAnimationFrame);
	}
	function setProps(partialProps) {
		if (instance.state.isDestroyed) return;
		invokeHook("onBeforeUpdate", [instance, partialProps]);
		removeListeners();
		var prevProps = instance.props;
		var nextProps = evaluateProps(reference, Object.assign({}, prevProps, removeUndefinedProps(partialProps), { ignoreAttributes: true }));
		instance.props = nextProps;
		addListeners();
		if (prevProps.interactiveDebounce !== nextProps.interactiveDebounce) {
			cleanupInteractiveMouseListeners();
			debouncedOnMouseMove = debounce(onMouseMove, nextProps.interactiveDebounce);
		}
		if (prevProps.triggerTarget && !nextProps.triggerTarget) normalizeToArray(prevProps.triggerTarget).forEach(function(node) {
			node.removeAttribute("aria-expanded");
		});
		else if (nextProps.triggerTarget) reference.removeAttribute("aria-expanded");
		handleAriaExpandedAttribute();
		handleStyles();
		if (onUpdate) onUpdate(prevProps, nextProps);
		if (instance.popperInstance) {
			createPopperInstance();
			getNestedPopperTree().forEach(function(nestedPopper) {
				requestAnimationFrame(nestedPopper._tippy.popperInstance.forceUpdate);
			});
		}
		invokeHook("onAfterUpdate", [instance, partialProps]);
	}
	function setContent(content) {
		instance.setProps({ content });
	}
	function show() {
		var isAlreadyVisible = instance.state.isVisible;
		var isDestroyed = instance.state.isDestroyed;
		var isDisabled = !instance.state.isEnabled;
		var isTouchAndTouchDisabled = currentInput.isTouch && !instance.props.touch;
		var duration = getValueAtIndexOrReturn(instance.props.duration, 0, defaultProps.duration);
		if (isAlreadyVisible || isDestroyed || isDisabled || isTouchAndTouchDisabled) return;
		if (getCurrentTarget().hasAttribute("disabled")) return;
		invokeHook("onShow", [instance], false);
		if (instance.props.onShow(instance) === false) return;
		instance.state.isVisible = true;
		if (getIsDefaultRenderFn()) popper.style.visibility = "visible";
		handleStyles();
		addDocumentPress();
		if (!instance.state.isMounted) popper.style.transition = "none";
		if (getIsDefaultRenderFn()) {
			var _getDefaultTemplateCh2 = getDefaultTemplateChildren(), box = _getDefaultTemplateCh2.box, content = _getDefaultTemplateCh2.content;
			setTransitionDuration([box, content], 0);
		}
		onFirstUpdate = function onFirstUpdate() {
			var _instance$popperInsta2;
			if (!instance.state.isVisible || ignoreOnFirstUpdate) return;
			ignoreOnFirstUpdate = true;
			popper.offsetHeight;
			popper.style.transition = instance.props.moveTransition;
			if (getIsDefaultRenderFn() && instance.props.animation) {
				var _getDefaultTemplateCh3 = getDefaultTemplateChildren(), _box = _getDefaultTemplateCh3.box, _content = _getDefaultTemplateCh3.content;
				setTransitionDuration([_box, _content], duration);
				setVisibilityState([_box, _content], "visible");
			}
			handleAriaContentAttribute();
			handleAriaExpandedAttribute();
			pushIfUnique(mountedInstances, instance);
			(_instance$popperInsta2 = instance.popperInstance) == null || _instance$popperInsta2.forceUpdate();
			invokeHook("onMount", [instance]);
			if (instance.props.animation && getIsDefaultRenderFn()) onTransitionedIn(duration, function() {
				instance.state.isShown = true;
				invokeHook("onShown", [instance]);
			});
		};
		mount();
	}
	function hide() {
		var isAlreadyHidden = !instance.state.isVisible;
		var isDestroyed = instance.state.isDestroyed;
		var isDisabled = !instance.state.isEnabled;
		var duration = getValueAtIndexOrReturn(instance.props.duration, 1, defaultProps.duration);
		if (isAlreadyHidden || isDestroyed || isDisabled) return;
		invokeHook("onHide", [instance], false);
		if (instance.props.onHide(instance) === false) return;
		instance.state.isVisible = false;
		instance.state.isShown = false;
		ignoreOnFirstUpdate = false;
		isVisibleFromClick = false;
		if (getIsDefaultRenderFn()) popper.style.visibility = "hidden";
		cleanupInteractiveMouseListeners();
		removeDocumentPress();
		handleStyles(true);
		if (getIsDefaultRenderFn()) {
			var _getDefaultTemplateCh4 = getDefaultTemplateChildren(), box = _getDefaultTemplateCh4.box, content = _getDefaultTemplateCh4.content;
			if (instance.props.animation) {
				setTransitionDuration([box, content], duration);
				setVisibilityState([box, content], "hidden");
			}
		}
		handleAriaContentAttribute();
		handleAriaExpandedAttribute();
		if (instance.props.animation) {
			if (getIsDefaultRenderFn()) onTransitionedOut(duration, instance.unmount);
		} else instance.unmount();
	}
	function hideWithInteractivity(event) {
		getDocument().addEventListener("mousemove", debouncedOnMouseMove);
		pushIfUnique(mouseMoveListeners, debouncedOnMouseMove);
		debouncedOnMouseMove(event);
	}
	function unmount() {
		if (instance.state.isVisible) instance.hide();
		if (!instance.state.isMounted) return;
		destroyPopperInstance();
		getNestedPopperTree().forEach(function(nestedPopper) {
			nestedPopper._tippy.unmount();
		});
		if (popper.parentNode) popper.parentNode.removeChild(popper);
		mountedInstances = mountedInstances.filter(function(i) {
			return i !== instance;
		});
		instance.state.isMounted = false;
		invokeHook("onHidden", [instance]);
	}
	function destroy() {
		if (instance.state.isDestroyed) return;
		instance.clearDelayTimeouts();
		instance.unmount();
		removeListeners();
		delete reference._tippy;
		instance.state.isDestroyed = true;
		invokeHook("onDestroy", [instance]);
	}
}
function tippy(targets, optionalProps) {
	if (optionalProps === void 0) optionalProps = {};
	var plugins = defaultProps.plugins.concat(optionalProps.plugins || []);
	bindGlobalEventListeners();
	var passedProps = Object.assign({}, optionalProps, { plugins });
	var instances = getArrayOfElements(targets).reduce(function(acc, reference) {
		var instance = reference && createTippy(reference, passedProps);
		if (instance) acc.push(instance);
		return acc;
	}, []);
	return isElement(targets) ? instances[0] : instances;
}
tippy.defaultProps = defaultProps;
tippy.setDefaultProps = setDefaultProps;
tippy.currentInput = currentInput;
Object.assign({}, applyStyles_default, { effect: function effect(_ref) {
	var state = _ref.state;
	var initialStyles = {
		popper: {
			position: state.options.strategy,
			left: "0",
			top: "0",
			margin: "0"
		},
		arrow: { position: "absolute" },
		reference: {}
	};
	Object.assign(state.elements.popper.style, initialStyles.popper);
	state.styles = initialStyles;
	if (state.elements.arrow) Object.assign(state.elements.arrow.style, initialStyles.arrow);
} });
tippy.setDefaultProps({ render });
//#endregion
//#region src/TooltipDemo.js
var { button, h2, p: p$1, section } = van_default.tags;
var panelClass = u`
  margin-top: 18px;
  padding: 18px;
  border: 1px solid #ddded8;
  background: #fff;
`;
var primaryButtonClass = u`
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #1f6f5b;
  background: #1f6f5b;
  color: #fff;
  cursor: pointer;
`;
var TooltipDemo = () => {
	const count = van_default.state(0);
	let tip;
	const el = button({
		class: primaryButtonClass,
		onclick: () => {
			count.val += 1;
			tip?.setContent(`点击了 ${count.val} 次`);
		}
	}, () => `保存 ${count.val}`);
	queueMicrotask(() => {
		tip = tippy(el, {
			content: `点击了 ${count.val} 次`,
			placement: "bottom"
		});
	});
	return section({ class: panelClass }, h2("Tippy: 单元素增强"), p$1("按钮是 VanJS 创建的真实 DOM，Tippy 只给它加 tooltip。"), el);
};
//#endregion
//#region src/main.js
var { h1, header, main, p } = van_default.tags;
b`
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: #f7f7f4;
    color: #202124;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      sans-serif;
  }

  button {
    font: inherit;
  }

  h1,
  h2,
  p {
    margin-top: 0;
  }

  h1 {
    margin-bottom: 8px;
    font-size: 32px;
  }

  h2 {
    margin-bottom: 8px;
    font-size: 18px;
  }

  p {
    color: #5f6368;
    line-height: 1.5;
  }
`;
var appClass = u`
  width: min(100% - 32px, 720px);
  margin: 36px auto;
`;
var App = () => {
	return main({ class: appClass }, header(h1("VanJS + Vanilla Libraries"), p("VanJS 管 DOM 和 state，原生库只增强局部行为。")), TooltipDemo(), SortableDemo());
};
van_default.add(document.getElementById("app"), App());
//#endregion

//# sourceMappingURL=index-Dhz1K1Bj.js.map