const config = {
    type: 'app',
    title: 'CHAT – Climate Health Vulnerability Assessment Tool',

    id: 'cbe8c2e9-6d64-4236-b1ec-396483082e58',
    minDHIS2Version: '2.40',

    customAuthorities: [
        'F_CHAT_ADD_SETTINGS',
    ],
    additionalNamespaces: [
        { namespace: 'CHAT', authorities: ['F_CHAT_APP'] },
    ],
    entryPoints: {
        app: './src/App.tsx',
    },

    viteConfigExtensions: './vite.config.mts',
}

module.exports = config