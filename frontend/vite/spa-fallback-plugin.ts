import { Plugin, Connect, DevEnvironment } from 'vite'

import fs from 'node:fs'
import path from 'node:path'


const postfixRE = /[?#].*$/
function cleanUrl(url: string): string {
    return url.replace(postfixRE, '')
}

function joinUrlSegments(a: string, b: string): string {
    if (!a || !b) {
        return a || b || ''
    }
    if (a.endsWith('/')) {
        a = a.substring(0, a.length - 1)
    }
    if (b[0] !== '/') {
        b = '/' + b
    }
    return a + b
}

function htmlFallbackMiddleware(
    root: string,
    filePath: string,
    clientEnvironment?: DevEnvironment,
): Connect.NextHandleFunction {
    const memoryFiles = clientEnvironment?.bundledDev?.memoryFiles;

    function checkFileExists(relativePath: string) {
        return (
            memoryFiles?.has(
                relativePath.slice(1), // remove first /
            ) ?? fs.existsSync(path.join(root, relativePath))
        )
    }

    // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
    return function viteHtmlFallbackMiddleware(req, _res, next) {
        if (
            // Only accept GET or HEAD
            (req.method !== 'GET' && req.method !== 'HEAD') ||
                // Exclude default favicon requests
                req.url === '/favicon.ico' ||
                // Require Accept: text/html or */*
                !(
                    req.headers.accept === undefined || // equivalent to `Accept: */*`
                        req.headers.accept === '' || // equivalent to `Accept: */*`
                        req.headers.accept.includes('text/html') ||
                        req.headers.accept.includes('*/*')
                )
        ) {
            return next()
        }

        const url = cleanUrl(req.url!)
        let pathname
        try {
            pathname = decodeURIComponent(url)
        } catch {
            // ignore malformed URI
            return next()
        }

        // .html files are not handled by serveStaticMiddleware
        // so we need to check if the file exists
        if (pathname.endsWith('.html')) {
            if (checkFileExists(pathname)) {
                req.url = url
                return next()
            }
        }
        else if (pathname.endsWith('/')) {
            if (checkFileExists(joinUrlSegments(pathname, 'index.html'))) {
                const newUrl = url + 'index.html'
                req.url = newUrl
                return next()
            }
        }
        // non-trailing slash should check for fallback .html
        else {
            if (checkFileExists(pathname + '.html')) {
                const newUrl = url + '.html'
                req.url = newUrl
                return next()
            }
        }

        req.url = filePath;

        next()
    }
}

export function spaFallback(fileName: string): Plugin {
    return {
        name: 'spa-fallback',

        configureServer(server) {
            const filePath = fileName.startsWith('/') ? fileName : `/${fileName}`;
            return () => {
                server.middlewares.use(htmlFallbackMiddleware(
                    server.config.root,
                    filePath,
                    server.environments.client
                ));
            }
        },
    }
}
