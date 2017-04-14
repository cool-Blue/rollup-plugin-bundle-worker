var fs = require('fs'),
    path = require('path'),
    paths = new Map(),
    injectorPath;

export default function (options) {
    var options = options || {};
    var include = options.include || [];
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
            var rexp = /^\s*import\s+(\w+)\s+from 'worker-injector';/gm;
            var inject = rexp.test(workerCode);
            if (inject)
                workerCode = workerCode.replace(rexp,
                    `function $1(req, imports, module) {
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
                `var self = this`,
                workerCode]
                    .concat( inject ?
                        [`self.postMessage({`,
                        `    method: 'ready',`,
                        `    message: {t: performance.now(), m: '\tloaded:\t${id}'}`,
                        `});`]
                        : []
                    )
                .concat(
                    [
                        `\n}, ${inject});`
                    ]
                )
                .join('\n');

            return code;
        },
    };
}
