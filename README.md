# Лендинг «Инфографика, которая продаёт» — idesighn.ru

Одностраничный сайт по макету — услуги дизайнера-маркетолога по оформлению
карточек товаров для маркетплейсов (Wildberries, Ozon, Яндекс Маркет, Megamarket).

## Домен
https://idesighn.ru — должен быть настроен A/CNAME на хостинг, сертификат Let's Encrypt активен.

## Стек
Статический сайт без сборки: `index.html`, `styles.css`, `script.js`, PWA `manifest.webmanifest`.
Шрифты Montserrat / Oswald через Google Fonts.

## Локальный запуск
```
python -m http.server 8123
# открыть http://localhost:8123/index.html
```

## Что входит в SEO-проработку (РФ)

### В `<head>` index.html
- `<title>`, `<meta name="description">`, `<meta name="keywords">` под основные запросы (WB/Ozon/ЯМ/Megamarket)
- `<link rel="canonical">` и `<link rel="alternate" hreflang>` (ru-RU, x-default)
- `meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"`
- `meta name="yandex"` и `meta name="googlebot"`
- OpenGraph: `og:title/description/url/image/image:width/image:height/alt/locale=ru_RU`
- Twitter Card: `summary_large_image`
- VK OpenGraph
- Favicon-комплект: SVG, PNG 192, apple-touch-icon 180, mask-icon, msapplication
- `<link rel="manifest">`
- Preconnect к Google Fonts

### Микроразметка JSON-LD (`@graph`)
- `Organization` + `ProfessionalService` (логотип, контакты, рейтинг, areaServed)
- `WebSite` и `WebPage`
- `BreadcrumbList`
- `Service` + `OfferCatalog` (цены)
- `FAQPage` (5 вопросов-ответов)
- `Person` (Иван Буров)

### Служебные файлы
- `robots.txt` — ссылки на sitemap, Host, отдельные правила для Yandex/Google
- `sitemap.xml` — с image-sitemap, hreflang, приоритеты
- `manifest.webmanifest` — PWA
- `humans.txt`
- `.well-known/security.txt`
- `assets/img/browserconfig.xml`
- `privacy.html` (ФЗ-152)
- `offer.html` (договор-оферта)

### Серверная часть (`.htaccess` для Apache / reg.ru, beget, timeweb)
- 301: www→без www, http→https, убрать index.html
- Hotlink-защита
- Gzip, кэш (CSS/JS/IMG на 1 год immutable)
- Заголовки безопасности (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- ETag off, MIME-типы

### Изображения
- SVG-фавикон `assets/img/favicon.svg`
- OG-image `assets/img/og-image.svg` 1200×630
- Apple-touch 180, icon 192/512 (PNG)
- Все `<img>` имеют `width`/`height` (нет CLS), `loading="lazy"` (кроме hero), `decoding="async"`, описательные `alt`

## Настраивается
- Ссылки на VK / Telegram — в блоке «НА СВЯЗИ» (`index.html`, `.socials a href`).
- Отправка заявок в Telegram — в начале `script.js`, объект `TELEGRAM`:
  ```js
  var TELEGRAM = {
    token: "1234567890:AA...",   // токен бота от @BotFather
    chatId: "123456789"          // id чата/группы для заявок
  };
  ```
  Пока поля пустые — форма просто показывает сообщение об успехе (заглушка).
  Как заполните — заявки уходят боту через Telegram Bot API.

## Что сделать после деплоя на idesighn.ru

1. **Яндекс.Вебмастер** (https://webmaster.yandex.ru)
   - Добавить сайт `https://idesighn.ru/`
   - Подтвердить права (через meta-тег `<meta name="yandex-verification">` или TXT-запись)
   - Загрузить `sitemap.xml` в разделе «Файлы Sitemap»
2. **Google Search Console** (https://search.google.com/search-console)
   - Добавить ресурс с префиксом URL
   - Подтвердить через HTML-файл или DNS
   - Отправить `https://idesighn.ru/sitemap.xml`
3. **Метрика** — установить счётчик (код в README выше).
4. **Проверить валидность**: validator.w3.org, search.google.com/test/rich-results, bing.com/webmasters
5. **PageSpeed** (https://pagespeed.web.dev/) — должен быть 90+ Mobile/Desktop.
6. **Переиндексация** после правок — «Переобход страниц» в Я.Вебмастере и GSC.
