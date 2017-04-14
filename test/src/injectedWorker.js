/**
 * Created by cool.blue on 9/04/2017.
 */
import injector from 'worker-injector';

let importedFunction;

var inject = injector('src/libs/require.js', ['src/common/bundle.js'], function (imports) {
    importedFunction = imports.test;
    imports.fmtNow();
    self.postMessage({
        method: 'injected',
        message: `${performance.now().fmt()}\tloaded:\tsrc/common/bundle.js`
    });
});

function message(m){
  self.postMessage({
    method: 'message',
    message: m
  })
}
function timeStamp(ts){
    self.postMessage({
        method: 'timeStamp',
        message: ts
    })
}

function route(m) {
    message(`${m} ${importedFunction("received in worker")}`)
}

self.onmessage = function (e) {
  let r = route;
  self[e.data.method](e.data.message);
};
