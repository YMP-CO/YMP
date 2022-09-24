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
