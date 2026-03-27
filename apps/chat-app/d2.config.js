const config = {
    type: 'app',
    title: 'CHAT – Climate Health Vulnerability Assessment Tool',

    id: 'a252e365-350e-4c51-8890-8be5409424de',
    minDHIS2Version: '2.41',

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