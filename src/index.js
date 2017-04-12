var fs = require('fs'),
    path = require('path'),
    UglifyJS = require('uglify-js'),
    paths = new Map();

module.exports = function (options) {
    options = options || {};
    include = options.include || [];
    var name = 'bundle-worker';
    var plugins;
    function resolver(importee, importer) {
        var resolved;
        if (Array.isArray(plugins) && plugins.length > 0) {
            resolved = plugins.filter(function(p) {
                return p.name !== name && !!p.resolveId;
            })
                .reduce(function(acc, p) {
                    return acc || p.resolveId(importee, importer);
                }, false);
        }

        return resolved || path.resolve(path.dirname(importer), importee);
    }
    return {
        name: name,
        options: function (opts) {
            plugins = opts.plugins;
        },
        resolveId: function (importee, importer) {
            if (importee === 'rollup-plugin-bundle-worker') {
                return path.resolve(__dirname, 'workerhelper.js');
            }
            else if (importee.indexOf('worker!') === 0) {
                var name = importee.split('!')[1],
                    target = resolver(name, importer);

                paths.set(target, name);
                return target;
            }
            else if (include.indexOf(importee) >= 0) {
                var target = resolver(importee, importer);
                paths.set(target, importee);
                return target;
            }
            else {
                return null;
            }
        },

        /**
         * Do everything in load so that code loaded by the plugin can still be transformed by the
         * rollup configuration
         */
        load: function (id) {
            if (!paths.has(id)) {
                return;
            }

            var workerCode = fs.readFileSync(id, 'utf-8');
            var ast = UglifyJS.parse(workerCode);

            workerCode = workerCode.replace(/^import inject from 'inject'/,
                `function inject(req, imports, module) {
                    return function inject(baseURL) {
                        let reqUrl = baseURL + req;
                        let importsURL = imports.map(function (u) {
                            return baseURL + u;
                        });
                        importScripts(reqUrl);
                        require(['require'].concat(importsURL),
                            function () {
                                module.apply(this, Array.from(arguments).slice(1))
                            });
                    }
                }`
            );

            var code = [
                `import shimWorker from 'rollup-plugin-bundle-worker';`,
                `export default new shimWorker(${JSON.stringify(paths.get(id))}, function (window, document) {`,
                `var self = this;`,
                workerCode,
                `\n});`
            ].join('\n');

            return code;
        }
    };
}
