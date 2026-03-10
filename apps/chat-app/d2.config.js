const config = {
    type: 'app',
    title: 'CHAT – Climate Health Vulnerability Assessment Tool',

    id: 'b789a17f-de09-4a43-9854-f2623ef6e1f2',
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