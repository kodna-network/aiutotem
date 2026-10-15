/* AIU TOTEM settings for this install.
   api: the account server file. 'api.php' works on any PHP host (WordPress / DirectAdmin).
        'api.cgi' is the Ruby copy of the same server. If one doesn't answer, the app tries the other
        and remembers the one that works. */
window.AIU_CONFIG = {
  api: 'api.php',
  version: '3.0.0',
  devtools: false // 2.6.0: true only on a test copy (Settings > Help & about: tap the version 5 times). The server also turns away test growth unless AIU_ALLOW_DEV=1.
};
