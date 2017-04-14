/**
 * Created by cool.blue on 2/04/2017.
 */
import bundleWorker from 'rollup-plugin-bundle-worker';

export default {
    entry: 'shared.js',
    format: 'umd',
    moduleName: 'shared',
    dest: 'bundle.js',
    plugins: [
        bundleWorker(),
    ]
};