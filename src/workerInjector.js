/**
 * workerInjector.js
 * Created by cool.blue on 14/04/2017.
 */
function injector(req, imports, module) {
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
}
