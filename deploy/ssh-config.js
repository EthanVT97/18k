module.exports = {
    // SSH Key Configuration
    ssh: {
        // Production server
        production: {
            host: '152.42.163.174',
            username: '18kchat',
            privateKey: 'AAAAC3NzaC1lZDI1NTE5AAAAIEIdtdt287mTQOBfFtA6ax3o0z0PVQWWOhqVsHGbE2s7',
            port: 22
        },
        // Staging server (if needed)
        staging: {
            host: '152.42.163.174',
            username: '18kchat',
            privateKey: 'AAAAC3NzaC1lZDI1NTE5AAAAIEIdtdt287mTQOBfFtA6ax3o0z0PVQWWOhqVsHGbE2s7',
            port: 22
        }
    },
    
    // Deployment paths
    paths: {
        production: '/var/www/18kchat',
        staging: '/var/www/18kchat-staging'
    },
    
    // Known hosts file path
    knownHosts: '~/.ssh/known_hosts',
    
    // SSH key paths
    keyPaths: {
        private: '~/.ssh/id_ed25519',
        public: '~/.ssh/id_ed25519.pub'
    }
};
