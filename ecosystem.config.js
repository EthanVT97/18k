module.exports = {
    apps: [
        {
            name: '18kchat-prod',
            script: 'server.js',
            instances: 'max',
            exec_mode: 'cluster',
            watch: false,
            env: {
                NODE_ENV: 'production',
                PORT: 443
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 443
            }
        },
        {
            name: '18kchat-staging',
            script: 'server.js',
            instances: 2,
            exec_mode: 'cluster',
            watch: true,
            env: {
                NODE_ENV: 'staging',
                PORT: 8080
            }
        }
    ],

    deploy: {
        production: {
            user: 'deploy',
            host: '152.42.163.174',
            ref: 'origin/main',
            repo: 'git@github.com:yourusername/18kchat.git',
            path: '/var/www/18kchat',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
        },
        staging: {
            user: 'deploy',
            host: '152.42.163.174',
            ref: 'origin/develop',
            repo: 'git@github.com:yourusername/18kchat.git',
            path: '/var/www/18kchat-staging',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
        }
    }
};
