module.exports = {
    // Production server configuration
    production: {
        host: '152.42.163.174',
        domain: '18kchat.com',
        user: 'deploy',
        path: '/var/www/18kchat',
        pm2_name: '18kchat-prod',
        env: {
            NODE_ENV: 'production',
            PORT: 443,
            DB_HOST: 'localhost',
            DB_NAME: '18kchat_prod',
            REDIS_HOST: 'localhost',
            REDIS_PORT: 6379
        }
    },

    // Staging server configuration
    staging: {
        host: '152.42.163.174',
        domain: 'staging.18kchat.com',
        user: 'deploy',
        path: '/var/www/18kchat-staging',
        pm2_name: '18kchat-staging',
        env: {
            NODE_ENV: 'staging',
            PORT: 8080,
            DB_HOST: 'localhost',
            DB_NAME: '18kchat_staging',
            REDIS_HOST: 'localhost',
            REDIS_PORT: 6379
        }
    },

    // Deployment options
    options: {
        keepReleases: 5,
        timezone: 'Asia/Yangon',
        branch: 'main',
        preSetup: [
            'mkdir -p {{path}}',
            'mkdir -p {{path}}/shared',
            'mkdir -p {{path}}/releases'
        ],
        shared: {
            dirs: [
                'logs',
                'uploads',
                'public/uploads'
            ],
            files: [
                '.env'
            ]
        },
        npm: {
            install: true,
            prune: true,
            ci: true
        }
    }
};
