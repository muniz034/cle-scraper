module.exports = {
    apps: [
      {
        name: 'cle-scraper:third-phase',
        script: './dist/third-phase/main.js', // or your entry point
        node_args: '--enable-source-maps', // optional for stack traces
        watch: false,                      // set to true if you want to auto-restart on file changes
        autorestart: true,
        max_restarts: 10,                  // prevent infinite restart loops
        restart_delay: 10000,               // wait 5s between restarts
        error_file: './logs/third-phase/cle-error.log',
        out_file: './logs/third-phase/cle-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
      },
    ],
  };
  