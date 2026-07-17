// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'goodsync-backend',
      script: 'server.js',
      // Dynamically use the local directory on Windows, or the hardcoded path on Ubuntu production
      cwd: process.platform === 'win32' ? process.cwd() : '/home/ubuntu/goodsync/backend',
      
      // Scale seamlessly across all available CPU cores of your EC2 instance
      instances: 'max', 
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        
        // Instructs your secrets.js script to dynamically fetch SSM parameters in AWS
        AWS_SSM_ENABLED: 'true' 
      },
      
      // Auto-restart if a thread gets hung up or leaks memory
      autorestart: true,
      max_memory_restart: '800M',
      
      // Logging: Vital for pushing structured logs up to AWS CloudWatch
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      combine_logs: true,
      merge_logs: true,
      
      // Give active DB connections and S3 streams time to finish before stopping
      kill_timeout: 10000,
      listen_timeout: 8000
    }
  ]
};