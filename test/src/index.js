/**
 * index.js
 * Created by cool.blue on 9/04/2017.
 */
// import WebWorker from 'worker!./simpleWorker.js'
import WebWorker from 'worker!./injectedWorker.js'
// import WebWorker from 'worker!./worker.js'
import {test as shared, fmtNow} from 'shared'
fmtNow();

function log(msg) {
  // Use a fragment: browser will only render/reflow once.
  var fragment = document.createDocumentFragment();
  fragment.appendChild(document.createTextNode(msg));
  fragment.appendChild(document.createElement('br'));

  document.querySelector("#log").appendChild(fragment);
}

const webWorker = new WebWorker();

log(`${performance.now().fmt()}\tBuilt in main`);

const routes = {
    message:
        function (m) {
            log(`${m} ${shared("Received in main")}`);
        },
    timeStamp:
        function (m) {
        this.message(`${m.t.fmt()}\t${m.m}`)
    },
};

webWorker.addEventListener('message', function (e) {
    routes[e.data.method](e.data.message);
});

log(`${performance.now().fmt()}\tPosted in main`);
window.setTimeout((function countDown(count, phase) {
    return function kick() {
        log(`${performance.now().fmt()}\tkick`);
        webWorker.postMessage({
            method: 'route',
            message: `${performance.now().fmt()}\twoof! ${count}`
        });
        if(count--){
            window.setTimeout(kick, 1000);
        } else {
            if(phase++ === 0){
                webWorker.terminate();
                window.setTimeout(countDown(5, 1));
                log(`${performance.now().fmt()}\tterminated objURL = ${webWorker.objURL}`)
            }
        }
    }
})(3, 0), 1000);
