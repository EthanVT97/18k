module.exports = {
    // Main domain configuration
    domain: '18kchat.com',
    
    // DNS Records
    records: {
        // A Record - Points domain to IP address
        a_record: {
            hostname: '18kchat.com',
            value: '152.42.163.174',
            ttl: 3600 // 1 hour
        },
        
        // Name Servers
        nameservers: [
            {
                hostname: '18kchat.com',
                value: 'ns1.digitalocean.com.',
                ttl: 1800 // 30 minutes
            },
            {
                hostname: '18kchat.com',
                value: 'ns2.digitalocean.com.',
                ttl: 1800
            },
            {
                hostname: '18kchat.com',
                value: 'ns3.digitalocean.com.',
                ttl: 1800
            }
        ]
    },
    
    // Additional recommended records
    recommended_records: {
        // MX Record for email
        mx: {
            hostname: '18kchat.com',
            value: 'mail.18kchat.com',
            priority: 10,
            ttl: 3600
        },
        
        // TXT Record for SPF (email authentication)
        spf: {
            hostname: '18kchat.com',
            value: 'v=spf1 ip4:152.42.163.174 -all',
            ttl: 3600
        },
        
        // CNAME for www subdomain
        www: {
            hostname: 'www.18kchat.com',
            value: '18kchat.com',
            ttl: 3600
        }
    }
};
