#!/usr/bin/env node

const esbuild = require('esbuild')
const nodeGlobals = require('@esbuild-plugins/node-globals-polyfill').default

esbuild
  .build({
    entryPoints: ['demo.jsx'],
    outfile: 'demo.build.js',
    bundle: true,
    plugins: [nodeGlobals({buffer: true})],
    define: {
      window: 'self',
      global: 'self'
    },
    sourcemap: 'inline'
  })
  .then(() => console.log('build success.'))
