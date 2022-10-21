import {routes} from './router';
import {middlewares, reducers} from './api';

export const ApplicationModule = {
    routes: routes,
    reducers: reducers,
    middlewares: middlewares,
};
