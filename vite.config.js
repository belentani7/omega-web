import restart from 'vite-plugin-restart'
import glsl from 'vite-plugin-glsl'

/**
 * La escena cinematográfica (`src/`) se compila con Vite; la experiencia Cosmos
 * (`js/`, `index.html`) es estático puro y no pasa por este bundler.
 *
 * Criterios de build:
 *  - Objetivo ES2020: cubre Safari 14+, Chrome 87+ y Firefox 78+ sin transpilar
 *    clases ni módulos, lo que reduce el peso final.
 *  - Chunks separados por familia de dependencia: el runtime de Three.js cambia
 *    mucho menos que el código de la escena, así que cachea por separado.
 *  - Sin `eval` ni `new Function`: el CSP del sitio puede prohibirlos.
 */
export default {
    root: 'src/',
    publicDir: '../static/',
    server:
    {
        host: true,
        port: 5173,
        strictPort: false,
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env)
    },
    preview: { host: true, port: 4173 },
    build:
    {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: true,
        target: 'es2020',
        cssCodeSplit: true,
        reportCompressedSize: true,
        chunkSizeWarningLimit: 650,
        rollupOptions:
        {
            output:
            {
                manualChunks:
                {
                    three: ['three'],
                    motion: ['gsap'],
                    audio: ['howler'],
                    physics: ['cannon'],
                    inspector: ['dat.gui']
                }
            }
        }
    },
    plugins:
    [
        glsl(),
        restart({ restart: ['../static/**'] })
    ]
}
