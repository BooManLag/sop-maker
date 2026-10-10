import globalJsdom from 'global-jsdom';

/** Installs a browser-like global DOM; import first, and call the cleanup after the tests. */
export const cleanupDom = globalJsdom();
