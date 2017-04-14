var TARGET = typeof Symbol === 'undefined' ? '__target' : Symbol(),
    SCRIPT_TYPE = 'text/javascript',
    BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder,
    URL = window.URL || window.webkitURL,
    Worker = window.Worker;

/**
 * Returns a wrapper around Web Worker code that is constructible.
 *
 * @function shimWorker
 *
 * @param { String }    filename    The name of the file
 * @param { Function }  fn          Function wrapping the code of the worker
 */
export default function shimWorker (filename, fn, injecting) {
    return function ShimWorker (forceFallback) {
        var o = this;

        if (!fn || typeof fn !== 'function') {
            return new Worker(filename);
        }
        else if (Worker && !forceFallback) {
            // Convert the function's inner code to a string to construct the worker
            var source = `${ fn }`.replace(/^function.+?{/, '').slice(0, -1),
                objURL = createSourceObject(source);
            this[TARGET] = new Worker(objURL);

            wrapTerminate(this[TARGET], objURL);

            if (injecting)
                this[TARGET].addEventListener('message', startSequence(this[TARGET]));

            return this[TARGET];
        }
        else {
            // todo add dispatcher for on message
            var selfShim = {
                    postMessage: m => {
                        if (o.onmessage) {
                            setTimeout(() => o.onmessage({ data: m, target: selfShim }));
                        }
                    }
                };

            fn.call(selfShim);
            this.postMessage = m => {
                setTimeout(() => selfShim.onmessage({ data: m, target: o }));
            };
            this.isThisThread = true;
        }
    };
};

// Test Worker capabilities
if (Worker) {
    var testWorker,
        objURL = createSourceObject('self.onmessage = function () {}'),
        testArray = new Uint8Array(1);

    try {
        // No workers via blobs in Edge 12 and IE 11 and lower :(
        if (/(?:Trident|Edge)\/(?:[567]|12)/i.test(navigator.userAgent)) {
            throw new Error('Not available');
        }
        testWorker = new Worker(objURL);

        // Native browser on some Samsung devices throws for transferables, let's detect it
        testWorker.postMessage(testArray, [testArray.buffer]);
    }
    catch (e) {
        Worker = null;
    }
    finally {
        URL.revokeObjectURL(objURL);
        if (testWorker) {
            testWorker.terminate();
        }
    }
}

function createSourceObject(str) {
    try {
        return URL.createObjectURL(new Blob([str], { type: SCRIPT_TYPE }));
    }
    catch (e) {
        var blob = new BlobBuilder();
        blob.append(str);
        return URL.createObjectURL(blob.getBlob(type));
    }
}

function wrapTerminate(worker, objURL){
    if(!worker || !objURL) return;
    let term = worker.terminate;
    worker.objURL = objURL;
    worker.terminate = function(){
        if(worker.objURL)
            URL.revokeObjectURL(worker.objURL);
        term.call(worker);
    }
}

function startSequence(webWorker) {
    const hostPath = document.location.pathname.match(/(^.*\/)\w+\.html/)[1];
    const log = console.log.bind(console);
    const _routes = {
        message:
            function (m) {
                log(`${m} ${"Received in main"}`);
            },
        timeStamp:
            function (m) {
                this.message(`${m.t.fmt()}\t${m.m}`)
            },
        injected:
            function (m) {
                webWorker.postMessage({
                    method: 'route',
                    message: `${performance.now().fmt()}\tinjected`
                });
                this.message(m);
                webWorker.removeEventListener('message', listener);
            },
        ready:
            function (m) {
                log(`${performance.now().fmt()}\tready:\tsimpleWorker.js`);
                webWorker.postMessage({
                    method: 'inject',
                    message: document.location.protocol + '//' + document.location.host + hostPath
                });
                this.timeStamp(m);
            }
    };
    function listener(e){
        _routes[e.data.method](e.data.message);
        e.stopImmediatePropagation();
    }
    return listener
}


