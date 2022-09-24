var cacheName = 'phaser-v1';

var filesToCache = [

  '/',

  '/index.html',

  '/img/logo.png',

  '/img/icon-192.png',

  '/img/icon-256.png',

  '/img/icon-512.png',

  '/js/game.js',

  '/css/style.css',

  'https://cdn.jsdelivr.net/npm/phaser@3.20.1/dist/phaser.min.js'

];

 

self.addEventListener('install', function(event) {

  console.log('установка sw');

  event.waitUntil(

    caches.open(cacheName).then(function(cache) {

      console.log('sw кеширует файлы');

      return cache.addAll(filesToCache);

    }).catch(function(err) {

      console.log(err);

    })

  );

});

<script>

    if ('serviceWorker' in navigator) {

        window.addEventListener('load', function() {

            navigator.serviceWorker.register('/sw.js', {scope: '/'}).then(function(registration) {

                console.log('ServiceWorker зарегистрирован с областью видимости в пределах: ', registration.scope);

            }, function(err) {

                console.log('Регистрация ServiceWorker не удалась: ', err);

            });

        });

    }

</script>
