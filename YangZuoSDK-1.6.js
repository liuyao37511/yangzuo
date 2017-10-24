/**
 * 羊左.js
 * @yzDoc
 * 作者:刘瑶
 * 核心功能:任务序列,promise,数据缓存,请求归并,依赖注入,模板管理,事件总线
 */
(function (window, document, undefined) {
    'use strict';

    var yangzuo = window.yangzuo || (window.yangzuo = {});
    /**
     * 基础重置
     */
    var NODE_TYPE_ELEMENT = 1;

    var isArray = Array.isArray;
    var slice = [].slice;

    var toString = Object.prototype.toString;
    var Zepto = !!window["Zepto"]? window["Zepto"]:window["$"];
    if(!Zepto) throw "羊左.js需要依赖Zepto或者jQuery";

    var uid = 0;
    function nextUid() {
        return ++uid;
    }

    function minErr(error) {
        console.log(error);
        throw error;
    }

    var element = Zepto;
    /**
     * @param {string} string String to be converted to lowercase.
     * @returns {string} Lowercased string.
     */
    var lowercase = function(string) {return isString(string) ? string.toLowerCase() : string;};
    /**
     * @param {string} string String to be converted to uppercase.
     * @returns {string} Uppercased string.
     */
    var uppercase = function(string) {return isString(string) ? string.toUpperCase() : string;};

    function isString(value) {
        return typeof value === 'string';
    }

    function isWindow(obj) {
        return obj && obj.window === obj;
    }

    function isNumber(value) {
        return typeof value === 'number';
    }

    function isObject(value) {
        return value !== null && typeof value === 'object';
    }

    function isDate(value) {
        return toString.call(value) === '[object Date]';
    }

    function isRegExp(value) {
        return toString.call(value) === '[object RegExp]';
    }

    function isPromiseLike(obj) {
        return obj && isFunction(obj.then);
    }

    function isUndefined(value) {return typeof value === 'undefined';}

    function isDefined(value) {return typeof value !== 'undefined';}

    /**
     * 是否为函数
     * @param value
     * @returns {boolean} 对象是否为函数
     */
    function isFunction(value) {
        return typeof value === 'function';
    }

    /**
     * @name yangzuo.forEach
     * @param node
     * @yzdoc function
     * @returns {boolean} 是否为Jquery对象
     */
    function isElement(node) {
        return !!(node && (node.nodeName || (node.prop && node.attr && node.find)));
    }

    function createMap() {
        return Object.create(null);
    }

    function isArrayLike(obj) {
        if (obj == null || isWindow(obj)) {
            return false;
        }
        var length = obj.length;
        if (obj.nodeType === NODE_TYPE_ELEMENT && length) {
            return true;
        }
        return isString(obj) || isArray(obj) || length === 0 || typeof length === 'number' && length > 0 && (length - 1) in obj;
    }

    function concat(array1, array2, index) {
        return array1.concat(slice.call(array2, index));
    }

    /**
     * 迭代 ： 可对数组和对象进行迭代
     * @yzdoc function
     * @param {Object|Array} obj Object to iterate over.
     * @param {Function} iterator Iterator function.
     * @param {Object=} context Object to become context (`this`) for the iterator function.
     * @returns {Object|Array} Reference to `obj`.
     */
    function forEach(obj, iterator, context) {
        var key, length;
        if (obj) {
            if (isFunction(obj)) {
                for (key in obj) {
                    // Need to check if hasOwnProperty exists,
                    // as on IE8 the result of querySelectorAll is an object without a hasOwnProperty function
                    if (key != 'prototype' && key != 'length' && key != 'name' && (!obj.hasOwnProperty || obj.hasOwnProperty(key))) {
                        iterator.call(context, obj[key], key, obj);
                    }
                }
            } else if (isArray(obj) || isArrayLike(obj)) {
                var isPrimitive = typeof obj !== 'object';
                for (key = 0, length = obj.length; key < length; key++) {
                    if (isPrimitive || key in obj) {
                        iterator.call(context, obj[key], key, obj);
                    }
                }
            } else if (obj.forEach && obj.forEach !== forEach) {
                obj.forEach(iterator, context, obj);
            } else {
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        iterator.call(context, obj[key], key, obj);
                    }
                }
            }
        }
        return obj;
    }

    /**
     * 属性批量注入
     * @yzdoc function
     * @name yangzuo.extend
     */
    function extend(dst) {
        for (var i = 1, ii = arguments.length; i < ii; i++) {
            var obj = arguments[i];
            if (obj) {
                var keys = Object.keys(obj);
                for (var j = 0, jj = keys.length; j < jj; j++) {
                    var key = keys[j];
                    dst[key] = obj[key];
                }
            }
        }
        return dst;
    }

    /**
     * 空函数 配合 callback || yangzuo.noop 语法
     * @yzdoc function
     * @name yangzuo.noop
     */
    function noop() {}
    noop.$inject = [];

    /**
     * 判断两个对象是否业务等效
     * @yzdoc function
     * @name yangzuo.equals
     * @param o1
     * @param o2
     * @returns {*}
     */
    function equals(o1, o2) {
        if (o1 === o2) return true;
        if (o1 === null || o2 === null) return false;
        if (o1 !== o1 && o2 !== o2) return true; // NaN === NaN
        var t1 = typeof o1, t2 = typeof o2, length, key;
        if (t1 == t2) {
            if (t1 == 'object') {
                if (isArray(o1)) {
                    if (!isArray(o2)) return false;
                    if ((length = o1.length) == o2.length) {
                        for (key = 0; key < length; key++) {
                            if (!equals(o1[key], o2[key])) return false;
                        }
                        return true;
                    }
                } else if (isDate(o1)) {
                    if (!isDate(o2)) return false;
                    return equals(o1.getTime(), o2.getTime());
                } else if (isRegExp(o1) && isRegExp(o2)) {
                    return o1.toString() == o2.toString();
                } else {
                    if (isWindow(o1) || isWindow(o2) || isArray(o2)) return false;
                    var keySet = {};
                    for (key in o1) {
                        if (key.charAt(0) === '$' || isFunction(o1[key])) continue;
                        if (!equals(o1[key], o2[key])) return false;
                        keySet[key] = true;
                    }
                    for (key in o2) {
                        if (!keySet.hasOwnProperty(key) &&
                            key.charAt(0) !== '$' &&
                            o2[key] !== undefined && !isFunction(o2[key])) return false;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    function sliceArgs(args, startIndex) {
        return slice.call(args, startIndex || 0);
    }

    /**
     * 重新指向this
     * @yzdoc function
     * @name yangzuo.bind
     * @param self
     * @param fn
     */
    function bind(self, fn) {
        var curryArgs = arguments.length > 2 ? sliceArgs(arguments, 2) : [];
        if (isFunction(fn) && !(fn instanceof RegExp)) {
            return curryArgs.length ? function () {
                return arguments.length
                    ? fn.apply(self, concat(curryArgs, arguments, 0))
                    : fn.apply(self, curryArgs);
            } : function () {
                return arguments.length
                    ? fn.apply(self, arguments)
                    : fn.call(self);
            };
        } else {
            return fn;
        }
    }

    function toJsonReplacer(key, value) {
        var val = value;

        if (typeof key === 'string' && key.charAt(0) === '$' && key.charAt(1) === '$') {
            val = undefined;
        } else if (isWindow(value)) {
            val = '$WINDOW';
        } else if (value &&  document === value) {
            val = '$DOCUMENT';
        }
        return val;
    }
    /**
     * 把对象转成字符串 如果键名前面存在 $ 将不会被序列化
     * @yzdoc function
     * @name yangzuo.toJson
     * @param obj
     * @param pretty 参考 JSON.stringify
     */
    function toJson(obj, pretty) {
        if (typeof obj === 'undefined') return undefined;
        if (!isNumber(pretty)) {
            pretty = pretty ? 2 : null;
        }
        return JSON.stringify(obj, toJsonReplacer, pretty);
    }
    /**
     * 反序列化
     * @yzdoc function
     * @name yangzuo.fromJson
     * @param json
     */
    function fromJson(json) {
        return isString(json) ? JSON.parse(json) : json;
    }

    /**
     * 依赖注入服务
     */
    /**
     * 服务池
     */
    var factoryCache = {};
    var instanceCache = {};
    var INSTANTIATING = {},path = [];

    var instanceInjector = createInternalInjector(instanceCache,BeanFactory);
    instanceCache.$injector = instanceInjector;

    function BeanFactory(serviceName) {
        if(!(serviceName in factoryCache)) minErr("依赖的服务:"+serviceName+"不存在");
        var factory = factoryCache[serviceName];
        var instance = Object.create(factory.prototype);
        var returnedValue = instanceInjector.invoke(factory, instance);
        return isObject(returnedValue) || isFunction(returnedValue) ? returnedValue : instance;
    }

    function annotate(fn) {
        var $inject;
        if (typeof fn === 'function') {
            if (!($inject = fn.$inject)) {
                $inject = [];
            }
        }else{
            $inject = [];
        }
        forEach($inject,function (item) {
            if(!isString(item)) minErr("$inject中的注解必须为字符串");
        });
        return $inject;
    }

    function createInternalInjector(cache, factory) {

        function getService(serviceName) {
            if (cache.hasOwnProperty(serviceName)) {
                if (cache[serviceName] === INSTANTIATING) {
                    minErr("服务:"+serviceName+"创建时存在循环依赖");
                }
                return cache[serviceName];
            } else {
                try {
                    path.unshift(serviceName);
                    cache[serviceName] = INSTANTIATING;
                    return cache[serviceName] = factory(serviceName);
                } catch (err) {
                    if (cache[serviceName] === INSTANTIATING) {
                        delete cache[serviceName];
                    }
                    throw err;
                } finally {
                    path.shift();
                }
            }
        }

        function invoke(fn, self, params) {
            if(!isFunction(fn)) minErr("invoke的对象必须为函数");
            var args = [],$inject = annotate(fn),length, i,key;

            for (i = 0, length = $inject.length; i < length; i++) {
                key = $inject[i];
                args.push(getService(key));
            }
            if(isArray(params)){
                forEach(params,function (param) {
                    args.push(param);
                })
            }else{
                args.push(params);
            }
            return fn.apply(self, args);
        }

        return {
            invoke: invoke,
            get: getService,
            annotate: annotate,
            has: function(name) {
                return factoryCache.hasOwnProperty(name) || cache.hasOwnProperty(name);
            }
        };
    }

    /**
     * 注入式调用
     * @name yangzuo.injectExecute
     * @param fn
     * @param params 业务参数
     * @param obj this指向
     * fn.$inject = ["service1","service2"]
     * fn(service1,service2,params)
     */
    function injectExecute(fn,params,obj){
        if(!isFunction(fn)) throw "fn必须为函数";
        return instanceInjector.invoke(fn,obj,params);
    }

    /**
     * @name yangzuo.service
     * 注册服务,如果注册的服务需要依赖其他服务,请在factory方法对象上增加属性$inject
     * 如:function Factory(s1,s2){}
     *   Factory.$inject = ["si","s2"]
     * 为了精简,服务池中的服务都是单例的,在注册时调用
     * @param serviceName
     * @param factory
     */
    function service(serviceName,factory){
        if(!isString(serviceName)) throw "服务名必须为字符串";
        if(!factory) throw "服务工厂不能为空";
        if(instanceInjector.has(serviceName)) throw serviceName+"重复注册";
        factoryCache[serviceName] = factory;
    }

    service("$browser",$BrowserService);
    $BrowserService.$inject = [];
    function $BrowserService(){
        var self = this,
            setTimeout = window.setTimeout,
            clearTimeout = window.clearTimeout,
            pendingDeferIds = {};

        self.isMock = false;

        var outstandingRequestCount = 0;
        var outstandingRequestCallbacks = [];

        function completeOutstandingRequest(fn) {
            try {
                fn.apply(null, sliceArgs(arguments, 1));
            } finally {
                outstandingRequestCount--;
                if (outstandingRequestCount === 0) {
                    while (outstandingRequestCallbacks.length) {
                        outstandingRequestCallbacks.pop()();
                    }
                }
            }
        }

        self.defer = function(fn, delay) {
            var timeoutId;
            outstandingRequestCount++;
            timeoutId = setTimeout(function() {
                delete pendingDeferIds[timeoutId];
                completeOutstandingRequest(fn);
            }, delay || 0);
            pendingDeferIds[timeoutId] = true;
            return timeoutId;
        };

        self.defer.cancel = function(deferId) {
            if (pendingDeferIds[deferId]) {
                delete pendingDeferIds[deferId];
                clearTimeout(deferId);
                completeOutstandingRequest(noop);
                return true;
            }
            return false;
        };
    }


    /**
     * promise 服务
     */
    service("$q",$qFactory);
    $qFactory.$inject = ["$browser"];
    function $qFactory($browser){
        function callOnce(self, resolveFn, rejectFn) {
            var called = false;

            function wrap(fn) {
                return function (value) {
                    if (called) return;
                    called = true;
                    fn.call(self, value);
                };
            }

            return [wrap(resolveFn), wrap(rejectFn)];
        }

        var defer = function() {
            return new Deferred();
        };

        var reject = function(reason) {
            var result = new Deferred();
            result.reject(reason);
            return result.promise;
        };

        var when = function(value, callback, errback, progressBack) {
            var result = new Deferred();
            result.resolve(value);
            return result.promise.then(callback, errback, progressBack);
        };

        function all(promises) {
            var deferred = new Deferred(),
                counter = 0,
                results = isArray(promises) ? [] : {};

            forEach(promises, function(promise, key) {
                counter++;
                when(promise).then(function(value) {
                    if (results.hasOwnProperty(key)) return;
                    results[key] = value;
                    if (!(--counter)) deferred.resolve(results);
                }, function(reason) {
                    if (results.hasOwnProperty(key)) return;
                    deferred.reject(reason);
                });
            });

            if (counter === 0) {
                deferred.resolve(results);
            }

            return deferred.promise;
        }

        function Deferred() {
            this.promise = new Promise();
            this.resolve = simpleBind(this, this.resolve);
            this.reject = simpleBind(this, this.reject);
            this.notify = simpleBind(this, this.notify);
        }

        Deferred.prototype = {
            resolve: function(val) {
                if (this.promise.$$state.status) return;
                if (val === this.promise) {
                    this.$$reject("请不要让promise对象参与回调");
                }else {
                    this.$$resolve(val);
                }

            },

            $$resolve: function(val) {
                var then, fns;
                fns = callOnce(this, this.$$resolve, this.$$reject);
                try {
                    if ((isObject(val) || isFunction(val))) then = val && val.then;
                    if (isFunction(then)) {
                        this.promise.$$state.status = -1;
                        then.call(val, fns[0], fns[1], this.notify);
                    } else {
                        this.promise.$$state.value = val;
                        this.promise.$$state.status = 1;
                        scheduleProcessQueue(this.promise.$$state);
                    }
                } catch (e) {
                    fns[1](e);
                }
            },

            reject: function(reason) {
                if (this.promise.$$state.status) return;
                this.$$reject(reason);
            },

            $$reject: function(reason) {
                this.promise.$$state.value = reason;
                this.promise.$$state.status = 2;
                scheduleProcessQueue(this.promise.$$state);
            },

            notify: function(progress) {
                var callbacks = this.promise.$$state.pending;

                if ((this.promise.$$state.status <= 0) && callbacks && callbacks.length) {
                    setTimeout(function() {
                        var callback, result;
                        for (var i = 0, ii = callbacks.length; i < ii; i++) {
                            result = callbacks[i][0];
                            callback = callbacks[i][3];
                            try {
                                result.notify(isFunction(callback) ? callback(progress) : progress);
                            } catch (e) {
                                minErr(e);
                            }
                        }
                    });
                }
            }
        };

        function simpleBind(context, fn) {
            return function(value) {
                fn.call(context, value);
            };
        }

        function Promise() {
            this.$$state = { status: 0 };
        }

        Promise.prototype = {
            //在Promise上注册回调任务,且then可以调用多次
            then: function(onFulfilled, onRejected, progressBack) {
                var result = new Deferred();
                this.$$state.pending = this.$$state.pending || [];
                this.$$state.pending.push([result, onFulfilled, onRejected, progressBack]);
                if (this.$$state.status > 0) scheduleProcessQueue(this.$$state);
                return result.promise;
            }
        };

        function scheduleProcessQueue(state) {
            if (state.processScheduled || !state.pending) return;
            state.processScheduled = true;
            $browser.defer(function(){processQueue(state);})
        }

        function processQueue(state) {
            var fn, promise, pending;

            pending = state.pending;
            state.processScheduled = false;
            state.pending = undefined;
            for (var i = 0, ii = pending.length; i < ii; ++i) {
                promise = pending[i][0];//result
                fn = pending[i][state.status];
                try {
                    if (isFunction(fn)) {
                        promise.resolve(fn(state.value));
                    } else if (state.status === 1) {
                        promise.resolve(state.value);
                    } else {
                        promise.reject(state.value);
                    }
                } catch (e) {
                    promise.reject(e);
                }
            }
        }

        var $Q = function Q(){};
        $Q.defer = defer;
        $Q.reject = reject;
        $Q.when = when;
        $Q.all = all;
        return $Q;
    }

    service("$Timeout",$Timeout);
    $Timeout.$inject = ["$browser","$q"];
    function $Timeout($browser,$q){
        var deferreds = {};

        function timeout(fn, delay) {
            var deferred = $q.defer(),
                promise = deferred.promise,
                timeoutId;

            timeoutId = $browser.defer(function() {
                try {
                    deferred.resolve(fn());
                } catch (e) {
                    deferred.reject(e);
                }finally {
                    delete deferreds[promise.$$timeoutId];
                }
            }, delay);

            promise.$$timeoutId = timeoutId;
            deferreds[timeoutId] = deferred;

            return promise;
        }

        timeout.cancel = function(promise) {
            if (promise && promise.$$timeoutId in deferreds) {
                deferreds[promise.$$timeoutId].reject('canceled');
                delete deferreds[promise.$$timeoutId];
                return $browser.defer.cancel(promise.$$timeoutId);
            }
            return false;
        };

        return timeout;
    }

    service("$Interval",$Interval);
    $Interval.$inject = ["$q"];
    function $Interval($q){
        var intervals = {};

        function interval(fn, delay, count) {
            var setInterval = window.setInterval,
                clearInterval = window.clearInterval,
                iteration = 0,
                deferred = $q.defer(),
                promise = deferred.promise;

            count = isDefined(count) ? count : 0;

            promise.then(null, null, fn);

            promise.$$intervalId = setInterval(function tick() {
                deferred.notify(iteration++);
                if (count > 0 && iteration >= count) {
                    deferred.resolve(iteration);
                    clearInterval(promise.$$intervalId);
                    delete intervals[promise.$$intervalId];
                }

            }, delay);

            intervals[promise.$$intervalId] = deferred;

            return promise;
        }

        interval.cancel = function(promise) {
            if (promise && promise.$$intervalId in intervals) {
                intervals[promise.$$intervalId].reject('canceled');
                window.clearInterval(promise.$$intervalId);
                delete intervals[promise.$$intervalId];
                return true;
            }
            return false;
        };

        return interval;
    }


    /**
     * 数据缓存服务
     */
    service("$cacheFactory",$cacheFactory);
    $cacheFactory.$inject = [];
    function $cacheFactory(){
        var caches = createMap();

        return {
            getCache:getCache
        };

        function getCache(cacheId) {
            if(cacheId in caches){
                return caches[cacheId];
            }else{
                return caches[cacheId] = new $Cache(cacheId,caches);
            }
        }
    }

    function $Cache(cacheId,caches){
        this.state = {size:0,cacheId:cacheId};
        this.data = {};
        this.caches = caches;
    }

    $Cache.prototype = {
        info: function() {
            return this.state;
        },
        destroy: function() {
            this.data = null;
            var cacheId = this.state.cacheId;
            this.state = null;
            delete this.caches[cacheId];
        },
        removeAll: function() {
            this.data = {};
            this.state.size = 0;
        },
        remove: function(key) {
            delete this.data[key];
            this.state.size--;
        },
        put: function(key, value) {
            if (isUndefined(value)) return;
            if (this.state.size > Number.MAX_VALUE-1){
                throw "缓存溢出";
            }
            if (!(key in this.data)) this.state.size++;
            this.data[key] = value;
            return value;
        },
        get: function(key) {
            return this.data[key];
        },
        has:function(key){
            return (key in this.data);
        }
    };


    /**
     * http服务
     * @type {string[]}
     */
    service("$http",$http);
    $http.$inject = ["$q"];
    function $http($q){

        var GET_CONFIG = {type:'GET'};
        var POST_CONFIG = {type:'POST'};
        var JSONP_CONFIG = {type:"GET",dataType:'jsonp'};

        function filterConfig(config){
            if(!isObject(config)){
                return {};
            }
            delete config.type;
            delete config.dataType;
            delete config.success;
            delete config.error;
            return config;
        }

        function get(url,params,config){
            var deferred = $q.defer();
            var get_config = {
                url:url,
                data:params,
                success:function(result){
                    deferred.resolve(result);
                },
                error:function(e){
                    deferred.reject(e);
                }
            };
            extend(get_config,GET_CONFIG,filterConfig(config));
            Zepto["ajax"](get_config);
            return deferred.promise;
        }

        function post(url,params,config){
            var deferred = $q.defer();
            var post_config = {
                url:url,
                data:params,
                success:function(result){
                    deferred.resolve(result);
                },
                error:function(e){
                    deferred.reject(e);
                }
            };
            yangzuo.extend(post_config,POST_CONFIG,filterConfig(config));
            Zepto["ajax"](post_config);
            return deferred.promise;
        }

        function jsonp(url,params,config){
            var deferred = $q.defer();
            var jsonp_config = {
                url:url,
                data:params,
                success:function(result){
                    deferred.resolve(result);
                },
                error:function(e){
                    deferred.reject(e);
                }
            };
            yangzuo.extend(jsonp_config,JSONP_CONFIG,filterConfig(config));
            Zepto["ajax"](jsonp_config);
            return deferred.promise;
        }

        return {
            get:get,
            post:post,
            jsonp:jsonp
        }
    }

    //模板缓存服务
    service("$templateCache",$templateCache);
    $templateCache.$inject = ["$cacheFactory"];
    function $templateCache($cacheFactory){
        this.templateCache = $cacheFactory.getCache("$$templateCache");
        this.compile();//收罗页面的模板
    }

    $templateCache.prototype = {
        get:function(tid){
            if(this.templateCache.has(tid)){
                return this.templateCache.get(tid);
            }else{
                minErr("模板:"+tid+" 加载失败");
            }
        },
        removeAll: function() {
            this.templateCache.removeAll();
        },
        remove: function(tid) {
            this.templateCache.remove(tid);
        },
        has:function(tid){
            return this.templateCache.has(tid);
        },
        put:function(tid,html){
            this.templateCache.put(tid,html);
        },
        compile:function(){//当只有一个模板的时候会不会出问题
            var templates = element("script[type='text/html']");
            if(isArrayLike(templates)){
                forEach(templates,function(dom){
                    var $dom = element(dom);
                    if(!!$dom.attr("yz-loaded")){
                        return;
                    }
                    var tid = $dom.attr("id");
                    if(!tid) return;
                    var html = $dom.html();
                    this.put(tid,html);
                },this);
            }
            templates.attr("yz-loaded",true);
        }
    };

    service("$templateRequest",$templateRequest);
    $templateRequest.$inject = ["$templateCache","$q","$cacheFactory","$http"];
    function $templateRequest($templateCache,$q,$cacheFactory,$http){
        var templateHttpResultCache = $cacheFactory.getCache("$$templateHttpResultCache");

        function getTemplateForTemplateCache(url,tid){
            if(!!tid && !$templateCache.has(tid)){
                minErr("模板Id:"+tid+"对应的模板不存在");
            }
            if(!!tid) return $templateCache.get(tid);

            if($templateCache.has(url)){
                return $templateCache.get(url);
            }else{
                minErr("链接:"+url+"对应的模板不存在");
            }
        }

        function loadTemplate(url,tid){
            if($templateCache.has(url) || !!tid && $templateCache.has(tid)){
                return $q.when(getTemplateForTemplateCache(url,tid));
            }
            var tpromise = $q.defer();
            if(templateHttpResultCache.has(url)){
                templateHttpResultCache.get(url).then(function () {
                    tpromise.resolve(getTemplateForTemplateCache(url,tid));
                },function(e){
                    tpromise.reject(e)
                })
            }else{
                templateHttpResultCache.put(url,tpromise.promise);
                $http.get(url).then(function(template){
                    $templateCache.put(url,template);
                    element("body").append('<div id="Template_Box" style="display: none;"></div>');
                    element("#Template_Box").html(template);
                    $templateCache.compile();
                    element("#Template_Box").remove();
                    tpromise.resolve(getTemplateForTemplateCache(url,tid));
                },function (e) {
                    tpromise.reject(e);
                });
            }
            return tpromise.promise;
        }
        return {
            loadTemplate:loadTemplate
        };
    }


    //请求归并
    service("$httpBatchRequest",$httpBatchRequest);
    $httpBatchRequest.$inject = ["$q","$templateRequest","$http","$cacheFactory"];
    function $httpBatchRequest($q,$templateRequest,$http,$cacheFactory){
        var dataSourceMap = $cacheFactory.getCache("$$dataSourceMap");
        var typeList = ["GET","POST","JSONP"];

        /**
         * 注册数据源
         * {url:请求地址,type:"GET","POST","JSONP"}
         * @param sourceName
         * @param config
         */
        function regestSource(sourceName,config){
            if(!config.type){config.type = "GET";}
            if(typeList.indexOf(config.type)==-1) minErr("数据源只支持"+typeList.join(",")+"类型");
            dataSourceMap.put(sourceName,config);
            return this;
        }

        function createBatchRequest() {
            return new $$batchRequest();
        }

        function hasSource(sourceName){
            return dataSourceMap.has(sourceName);
        }

        return {
            regestSource:regestSource,
            createBatchRequest:createBatchRequest,
            hasSource:hasSource
        };

        function $$batchRequest(){
            var sourceList = [];

            function getData(sourceName, params){
                if(dataSourceMap.has(sourceName)){
                    sourceList.push({type:"dataSource",name:sourceName,params:params});
                }else{
                    minErr("数据源"+sourceName+"不存在");
                }
                return this;
            }

            function getTemplate(url,tid){
                sourceList.push({type:"templateSource",url:url,tid:tid});
                return this;
            }

            function done(){
                var promiseList = [];
                forEach(sourceList,function(source){
                    promiseList.push(executeDataSource(source));
                });
                return $q.all(promiseList);
            }

            function executeDataSource(source){
                if(source.type=="dataSource"){
                    var dataSource = dataSourceMap.get(source.name);
                    if(dataSource.type=="GET"){
                        return $http.get(dataSource.url,source.params);
                    }else if(dataSource.type=="POST"){
                        return $http.post(dataSource.url,source.params);
                    }else if(dataSource.type=="JSONP"){
                        return $http.jsonp(dataSource.url,source.params);
                    }
                }else if(source.type=="templateSource"){
                    var deferred = $q.defer();
                    $templateRequest.loadTemplate(source.url,source.tid).then(function(html){
                        deferred.resolve(html);
                    },function(e){
                        deferred.reject(e);
                    });
                    return deferred.promise;
                }
            }
            return {
                getData:getData,
                getTemplate:getTemplate,
                done:done
            }
        }
    }


    /**
     * 任务队列
     */
    service("$taskQueue",$taskQueue);
    $taskQueue.$inject=["$cacheFactory"];
    function $taskQueue($cacheFactory){
        var teskCache = $cacheFactory.getCache("$$taskFnMap");

        function registTask(teskId,teskFn){
            if(teskCache.has(teskId)){
                throw "任务"+teskId+"已经存在";
            }
            teskCache.put(teskId,teskFn);
        }
        /**
         * @yzDoc yangzuo.executeTaskQueue
         * [{teskId: 任务Id,resolve:fn,beforeFn:fn,afterFn:fn},...]
         * fn 是给 注册的任务注入参数用的,比如 有任务为teskFn(p1,p2,p3),那么 fn 返回result[]
         * @param {Array} teskList
         * @param {Function} beforeFn 队列前置函数.
         * @param {Function} afterFn 队列后置函数.
         */
        function createTaskQueue(teskList){
            if(!isArray(teskList)) minErr("队列参数必须为数组");
            var queue = new $$taskQueue();
            forEach(teskList,function(taskParams,index){
                if(!("id" in taskParams)) throw "任务队列中的对象必须存在Id";
                if(!teskCache.has(taskParams.id)) throw "任务:"+taskParams.id+"没有注册";
                var task = new $$task(teskCache.get(taskParams.id),queue,index);
                if(!!taskParams.resolve) task.setResolve(taskParams.resolve,taskParams.params);
                queue.pushTask(task);
            });
            return queue;
        }

        return {
            registTask:registTask,
            createTaskQueue:createTaskQueue
        }
    }

    function $$taskQueue(){
        this.taskList = [];
        this.currIndex = 0;
        this.prepareMap = createMap();
        this.beforeFn = null;
        this.afterFn = null;
        this.notifyFn = null;
    }
    $$taskQueue.prototype = {
        run:function(){
            if(!!this.beforeFn && isFunction(this.beforeFn)) injectExecute(this.beforeFn);
            this.taskList.length>0 && this.taskList[0].call();
        },
        pushTask:function (task) {
            if(!(task instanceof $$task)){
                return;
            }
            this.taskList.push(task);
        },
        before:function (fn) {
            if(!isFunction(fn)) minErr("队列前置函数类型异常");
            this.beforeFn = fn;
        },
        after:function(fn){
            if(!isFunction(fn)) minErr("队列后置函数类型异常");
            this.afterFn = fn;
        },
        notify:function(fn){
            if(!isFunction(fn)) minErr("任务监听函数类型异常");
            this.notifyFn = fn;
        },
        call:function(index){//当任务内部进入就绪状态时,告知队列可以调用
            this.prepareMap[index] = true;//标记该任务为就绪状态
            if(index!==this.currIndex){
                return;
            }
            if(!(index in this.prepareMap)){
                return;
            }
            this.taskList[index].run();
        },
        callNext:function () {
            if(!!this.notifyFn && isFunction(this.notifyFn)){
                try{
                    injectExecute(this.notifyFn,this.currIndex);
                }catch(e){
                    console.error(e);
                }
            }
            this.currIndex++;
            if(this.currIndex>=this.taskList.length){
                if(!!this.afterFn && isFunction(this.afterFn)){
                    injectExecute(this.afterFn);
                }
                return;
            }
            this.taskList[this.currIndex].call();
        }
    };

    function $$task(teskFn,$taskQueue,index){
        this.teskFn = teskFn;
        this.$taskQueue = $taskQueue;
        this.index = index;

        if(!isFunction(teskFn)) throw "任务的teskFn必须为函数";

        this.prs = null;
        this.data = null;
        this.error = false;
    }

    $$task.prototype = {
        setResolve:function(resolve,params){//执行数据准备
            this.prs = injectExecute(resolve,params);
            if(!isPromiseLike(this.prs)) throw "队列的resolve必须返回promiss对象";
            var _this = this;
            this.prs.then(function(result){
                _this.data = result;
                _this.$taskQueue.call(_this.index);//数据加载完成,告诉队列进行任务调用
            },function(e){
                _this.error = true;
                _this.data = [];
                _this.$taskQueue.call(_this.index);//当出现异常,放弃当前的任务,直接执行下一个任务
            });
        },
        call:function(){//队列发起重新调用指令
            if(!!this.prs && !this.data){//当数据未准备完成时,暂停当前的调用
                return;
            }
            this.$taskQueue.call(this.index);
        },
        run:function(){
            if(!this.error){
                try{
                    injectExecute(this.teskFn,this.data,this.teskFn);
                }catch(e){
                    console.error(e);
                }
            }
            this.$taskQueue.callNext();//当任务执行完成之后,通知队列调用下一个任务
        }
    };

    var taskQueue = instanceInjector.get("$taskQueue");
    /**
     * 事件总线,用于封闭代码之间的通信
     */
    service("$eventBus",$eventBus);
    $eventBus.$inject=["$cacheFactory","$q"];
    function $eventBus($cacheFactory,$q){
        var cache = $cacheFactory.getCache("$$eventMap");
        var singleEventName = {};

        function on(eventName,callback,isSingle){
            if(!isString(eventName)) throw "事件名称必须为字符串";
            if(!isFunction(callback)) throw "callback必须为函数";
            if(eventName in singleEventName) throw "事件"+eventName+"为单一监听事件,不能重复监听";
            if(isSingle){
                singleEventName[eventName] = true;
            }
            if(!cache.has(eventName)){
                cache.put(eventName,$q.defer());
            }
            cache.get(eventName).promise.then(noop,noop,function(event){
                injectExecute(callback,event);
            });
        }

        function post(eventName, event) {
            if(!cache.has(eventName)) return;
            cache.get(eventName).notify(event);
        }
        
        return {
            on:on,
            post:post
        }
    }
    var eventBus = instanceInjector.get("$eventBus");



    /**
     * 在这里你可以看到yangzuo所有的工具API
     * @param yangzuo
     */
    function publishExternalAPI(yangzuo) {
        extend(yangzuo, {
            'isString': isString,
            'isUndefined': isUndefined,
            'isFunction': isFunction,
            'isObject': isObject,
            'isNumber': isNumber,
            'element': Zepto,
            'extend': extend,
            'equals': equals,
            'noop': noop,
            'forEach': forEach,
            'bind': bind,
            'toJson': toJson,
            'fromJson': fromJson,
            'isElement': isElement,
            'isArray': isArray,
            'isDate': isDate,
            'lowercase': lowercase,
            'uppercase': uppercase,
            'injectExecute':injectExecute,
            'service':service,
            'post': bind(eventBus,eventBus.post),
            'on':bind(eventBus,eventBus.on),
            'registTask':bind(taskQueue,taskQueue.registTask),
            'createTaskQueue':bind(taskQueue,taskQueue.createTaskQueue)
        });
    }

    publishExternalAPI(yangzuo);

    var $$RENDER_REMOVE_EVENT = "$$RenderRemoveEvent",
        $$RENDER_FACTORY_CACHE = "$$RenderFactoryCache",//render缓存
        DefaultRenderConfig = {
            element:"",//渲染的根节点
            template:"",//渲染的模板字符串
            templateUrl:"",//渲染预加载模板
            templateId:null,//渲染时用于指定预加载
            data:{},//model对象
            link:yangzuo.noop,//事件关联函数,this为render
            finalize:yangzuo.noop//析构函数,this为render
        };
    /**
     * 渲染对象
     * @param config
     * @constructor
     */
    Render.$inject = ["$eventBus","$q","$$RenderTreeTraverseEngine","$$RenderEngine","RenderFactory"];
    function Render($eventBus,$q,$$RenderTreeTraverseEngine,$$RenderEngine,RenderFactory,configObj){
        var $$thisId = null;
        var childIds = [];
        var config = yangzuo.extend({},DefaultRenderConfig,configObj);
        var renderIsShow = false;

        function $$setId($$id){
            $$thisId = $$id;
        }

        function isShow(){
            return renderIsShow;
        }

        function $$setShow(show){
            renderIsShow = show;
        }

        function $$getConfig(){
            return config;
        }

        function $$getChildIds(){
            return childIds;
        }

        function getData(){
            return config.data;
        }

        /**
         * 添加子对象
         */
        function addChild(render){
            if(!isRender(render)){
                throw "添加的对象必须的是Render类型"
            }
            childIds.push(render.hashCode());
            $$RenderShow(render);
        };

        /**
         * 删除子对象
         */
        function removeChild(render){
            if(!isRender(render)){
                throw "删除的对象必须的是Render类型"
            }
            var renderId = render.hashCode();
            var id = null;
            for(var i = 0;i<childIds.length;i++){
                if(renderId===childIds[i]){
                    id = childIds[i];
                    break;
                }
            }
            if(!id){
                console.log(renderId+"对应的渲染对象不属于"+$$thisId);
            }else{
                childIds.splice(i,1);
                $RenderDeath(render);
            }
        }

        /**
         * 激活组件
         */
        function show() {
            $$RenderShow(RenderFactory.$$getRender($$thisId));
        }

        /**
         * 关闭组件
         */
        function hide(){
            $$RenderHide(RenderFactory.$$getRender($$thisId));
        };

        /**
         * 删除组件
         */
        function remove(){
            $RenderDeath(RenderFactory.$$getRender($$thisId));
        }

        function equals(render){
            if(!isRender(render)){
                return false;
            }
            return hashCode() === render.hashCode()
        }

        function hashCode(){
            return $$thisId;
        }

        function $$RenderShow(render){
            $$RenderTreeTraverseEngine.parentsRenderPriority(render,show);
            function show(){
                return $$RenderEngine.render(render);
            }
        }

        function $$RenderHide(render){
            yangzuo.injectExecute(config.finalize);
            yangzuo.element("#"+config.element).html("");
            render.$$setShow(false);
        }

        function $RenderHide(render){
            $$RenderTreeTraverseEngine.childsRenderPriority(render,hide);
            function hide(){
                $$RenderHide(render);
                return $q.when();
            }
        }

        function $RenderDeath(render){
            $$RenderTreeTraverseEngine.childsRenderPriority(render,death);
            function death() {
                $$RenderHide(render);
                $eventBus.post($$RENDER_REMOVE_EVENT,render.hashCode());
                return $q.when();
            }
        }

        return {
            $$setId:$$setId,
            $$getConfig:$$getConfig,
            $$getChildIds:$$getChildIds,
            getData:getData,
            addChild:addChild,
            removeChild:removeChild,
            show:show,
            hide:hide,
            remove:remove,
            equals:equals,
            hashCode:hashCode,
            isShow:isShow,
            $$setShow:$$setShow
        }

    }

    function isRender(obj){
        return (obj instanceof Render);
    }

    /**
     * 渲染(Render)对象工厂
     * @constructor
     */
    RenderFactory.$inject = ["$cacheFactory","$$RenderEngine","$eventBus"];
    function RenderFactory($cacheFactory,$$RenderEngine,$eventBus){
        var $$RenderFactoryCache = $cacheFactory.getCache($$RENDER_FACTORY_CACHE);

        $eventBus.on($$RENDER_REMOVE_EVENT,function($$id){
            $$RenderFactoryCache.remove($$id);
        });

        /**
         * Render构建方法
         * @param renderConfig
         */
        function newInstance(renderConfig) {
            var $$id = nextUid();
            var render = yangzuo.injectExecute(Render,renderConfig);
            render.$$setId($$id);
            $$RenderFactoryCache.put($$id,render);
            return render;
        }

        /**
         * 设置模板引擎
         * @param engine 模板引擎对象
         * @param renderHandler 渲染适配方法
         */
        function setTemplateEngine(engine,renderHandler){
            if(!yangzuo.isFunction(renderHandler)){
                throw "renderHandler必须是一个方法";
            }
            $$RenderEngine.$setTemplateEngine(engine,renderHandler);
        }

        /**
         * 获取模板引擎
         * @returns {*}
         */
        function getTemplateEngine(){
            return $$RenderEngine.$getTemplateEngine();
        }

        function $$getRender($$id){
            return $$RenderFactoryCache.get($$id);
        }

        return {
            newInstance:newInstance,
            setTemplateEngine:setTemplateEngine,
            getTemplateEngine:getTemplateEngine,
            $$getRender:$$getRender
        }

    }
    yangzuo.service("RenderFactory",RenderFactory);

    /**
     * 渲染工具主要是提供模板引擎
     * 默认的行为是直接将模板渲染的到element对应DOM上
     * @type {string[]}
     */
    $$RenderEngine.$inject = ["$templateRequest","$q"];
    function $$RenderEngine($templateRequest,$q){

        var TemplateEngine = {};
        var RenderHandler = $$DefaulRenderHandler;

        function render(renderObj){
            var defer = $q.defer();
            var config = renderObj.$$getConfig();
            getRenderTemplate(renderObj).then(function(template){
                var html = RenderHandler.apply(config,[TemplateEngine,template,renderObj.getData()]);
                yangzuo.element("#"+config.element).html(html);
                yangzuo.injectExecute(config.link,config.data,renderObj);
                renderObj.$$setShow(true);
                defer.resolve();

            });
            return defer.promise;
        }

        function $setTemplateEngine(templateEngine,renderHandler){
            TemplateEngine = templateEngine;
            RenderHandler = renderHandler;
        }

        function $getTemplateEngine(){
            return RenderHandler;
        }

        //默认的渲染是直接返回html
        function $$DefaulRenderHandler(templateEngine,html,data){
            return html;
        }

        function getRenderTemplate(renderObj){
            var config = renderObj.$$getConfig();
            if(!!config.template){
                return $q.when(config.template);
            }
            return $templateRequest.loadTemplate(config.templateUrl,config.templateId);
        }

        return{
            $setTemplateEngine:$setTemplateEngine,
            $getTemplateEngine:$getTemplateEngine,
            render:render
        }
    }
    yangzuo.service("$$RenderEngine",$$RenderEngine);

    /**
     * Render树形数据结构遍历引擎
     * @type {Array}
     */
    $$RenderTreeTraverseEngine.$inject = ["$cacheFactory","$q"];
    function $$RenderTreeTraverseEngine($cacheFactory,$q){

        var $$RenderFactoryCache = $cacheFactory.getCache($$RENDER_FACTORY_CACHE);

        /**
         * 父节点优先
         * @param render
         * @param renderFunction Render
         */
        function parentsRenderPriority(render,renderFunction){
            var p = $q.defer();
            yangzuo.injectExecute(renderFunction,render).then(function () {
                var promise = [];
                yangzuo.forEach(render.$$getChildIds(),function ($$id) {
                    var childRender = $$RenderFactoryCache.get($$id);
                    promise.push(parentsRenderPriority(renderFunction,childRender));
                });
                $q.all(promise).then(function(){
                    p.resolve();
                })
            });
            return p.promise;
        }

        /**
         * 子节点优先
         * @param render
         * @param renderFunction
         */
        function childsRenderPriority(render,renderFunction){
            var p = $q.defer();
            var promise = [];
            yangzuo.forEach(render.$$getChildIds(),function ($$id) {
                var childRender = $$RenderFactoryCache.get($$id);
                promise.push(childsRenderPriority(renderFunction,childRender));
            });
            $q.all(promise).then(function(){
                yangzuo.injectExecute(renderFunction,render).then(function(){
                    p.resolve();
                })
            });
            return p.promise;
        }

        return {
            parentsRenderPriority:parentsRenderPriority,
            childsRenderPriority:childsRenderPriority
        }

    }
    yangzuo.service("$$RenderTreeTraverseEngine",$$RenderTreeTraverseEngine);

    RenderInit.$inject = ["RenderFactory"];
    function RenderInit(RenderFactory){
        yangzuo.Render = RenderFactory;
    }
    yangzuo.injectExecute(RenderInit);

})(window, document);