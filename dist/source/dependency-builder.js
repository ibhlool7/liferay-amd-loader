(function (global, factory) {
    'use strict';

    var built = factory(global);

    /* istanbul ignore else */
    if (typeof module === 'object' && module) {
        module.exports = built;
    }

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define(factory);
    }

    global.DependencyBuilder = built;
}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ this, function (global) {

    'use strict';

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Creates an instance of DependencyBuilder class.
 *
 * @constructor
 * @param {object} - instance of {@link ConfigParser} object.
 */
function DependencyBuilder(configParser) {
    this._configParser = configParser;

    this._result = [];
}

DependencyBuilder.prototype = {
    constructor: DependencyBuilder,

    /**
     * Resolves modules dependencies.
     *
     * @param  {array} modules List of modules which dependencies should be resolved.
     * @return {array} List of module names, representing module dependencies. Module name itself is being returned too.
     */
    resolveDependencies: function (modules) {
        // Copy the passed modules to a resolving modules queue.
        // Modules may be added there during the process of resolving.
        this._queue = modules.slice(0);

        var result;

        try {
            this._resolveDependencies();

            // Reorder the modules list so the modules without dependencies will
            // be moved upfront
            result = this._result.reverse().slice(0);
        }
        finally {
            this._cleanup();
        }

        return result;
    },

    /**
     * Clears the used resources during the process of resolving dependencies.
     *
     * @protected
     */
    _cleanup: function () {
        var modules = this._configParser.getModules();

        // Set to false all temporary markers which were set during the process of
        // dependencies resolving.
        for (var key in modules) {
            /* istanbul ignore else */
            if (hasOwnProperty.call(modules, key)) {
                var module = modules[key];

                module.conditionalMark = false;
                module.mark = false;
                module.tmpMark = false;
            }
        }

        this._queue.length = 0;
        this._result.length = 0;
    },

    /**
     * Processes conditional modules. If a module has conditional module as dependency, this module will be added to
     * the list of modules, which dependencies should be resolved.
     *
     * @protected
     * @param  {object} module Module, which will be checked for conditional modules as dependencies.
     */
    _processConditionalModules: function (module) {
        var conditionalModules = this._configParser.getConditionalModules()[module.name];

        // If the current module has conditional modules as dependencies,
        // add them to the list (queue) of modules, which have to be resolved.
        if (conditionalModules && !module.conditionalMark) {
            var modules = this._configParser.getModules();

            for (var i = 0; i < conditionalModules.length; i++) {
                var conditionalModule = modules[conditionalModules[i]];

                if (this._queue.indexOf(conditionalModule.name) === -1 && this._testConditionalModule(conditionalModule.condition.test)) {

                    this._queue.push(conditionalModule.name);
                }
            }

            module.conditionalMark = true;
        }
    },

    /**
     * Processes all modules in the {@link DependencyBuilder#_queue} and resolves their dependencies. The function
     * implements standard
     * [topological sorting based on depth-first search]{@link http://en.wikipedia.org/wiki/Topological_sorting}.
     *
     * @protected
     */
    _resolveDependencies: function () {
        // Process all modules in the queue.
        // Note: modules may be added to the queue during the process of evaluating.
        var modules = this._configParser.getModules();

        for (var i = 0; i < this._queue.length; i++) {
            var module = modules[this._queue[i]];

            if (!module.mark) {
                this._visit(module);
            }
        }
    },

    /**
     * Executes the test function of an conditional module and adds it to the list of module dependencies if the
     * function returns true.
     *
     * @param  {function|string} testFunction The function which have to be executed. May be Function object or string.
     * @return {boolean} The result of the execution of the test function.
     */
    _testConditionalModule: function (testFunction) {
        if (typeof testFunction === 'function') {
            return testFunction();
        } else {
            return eval('false || ' + testFunction)();
        }
    },

    /**
     * Visits a module during the process of resolving dependencies. The function will throw exception in case of
     * circular dependencies among modules.
     *
     * @protected
     * @param  {object} module The module which have to be visited.
     */
    _visit: function (module) {
        // Directed Acyclic Graph is supported only, throw exception if there are circular dependencies.
        if (module.tmpMark) {
            throw new Error('Error processing module: ' + module.name + '. ' + 'The provided configuration is not Directed Acyclic Graph.');
        }

        // Check if this module has conditional modules and add them to the queue if so.
        this._processConditionalModules(module);

        if (!module.mark) {
            module.tmpMark = true;

            var modules = this._configParser.getModules();

            for (var i = 0; i < module.dependencies.length; i++) {
                var dependencyName = module.dependencies[i];

                if (dependencyName === 'exports') {
                    continue;
                }

                var moduleDependency = modules[dependencyName];

                this._visit(moduleDependency, modules);
            }

            module.mark = true;

            module.tmpMark = false;

            this._result.unshift(module.name);
        }
    },

    /**
     * @property {array} _queue List of modules, which dependencies should be resolved. Initially, it is copy of
     * the array of modules, passed for resolving; during the process more modules may be added to the queue. For
     * example, these might be conditional modules.
     *
     * @protected
     * @memberof! DependencyBuilder#
     * @default []
     */
    _queue: []
};

    return DependencyBuilder;
}));