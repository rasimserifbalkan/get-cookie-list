const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: true
    });

    const page = await browser.newPage();

    // Tüm çerezleri toplayacak değişken
    const allCookies = [];

    // Ağ isteği dinleme (Üçüncü taraf çerezleri yakalamak için)
    page.on('response', async (response) => {
        const setCookieHeader = response.headers()['set-cookie'];
        if (setCookieHeader) {
            const cookies = setCookieHeader.split(',').map(cookieStr => {
                const parts = cookieStr.split(';');
                const [name, value] = parts[0].split('=');
                return {
                    name: name.trim(),
                    value: value ? value.trim() : '',
                    domain: response.url().split('/')[2], // Çerezin geldiği domain
                    path: parts.find(part => part.trim().startsWith('Path='))?.split('=')[1] || '/',
                    expires: parts.find(part => part.trim().startsWith('Expires='))?.split('=')[1] || 'Session',
                    httpOnly: parts.some(part => part.trim().toLowerCase() === 'httponly'),
                    secure: parts.some(part => part.trim().toLowerCase() === 'secure')
                };
            });
            allCookies.push(...cookies);
        }
    });

    // Haberlere gidin ve birinci taraf çerezleri alın
    await page.goto('https://www.rasim.com', { waitUntil: 'networkidle2' });
    const firstPartyCookies = await page.cookies();

    // Birinci taraf çerezleri ekle
    allCookies.push(
        ...firstPartyCookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires ? new Date(cookie.expires * 1000).toISOString() : 'Session',
            httpOnly: cookie.httpOnly,
            secure: cookie.secure
        }))
    );

    // Tekrarlanan çerezleri kaldırın
    const uniqueCookies = Array.from(new Map(allCookies.map(c => [c.name + c.domain, c])).values());

    // JSON formatına çevirin ve kaydedin
    const json = JSON.stringify(uniqueCookies, null, 2);
    fs.writeFileSync('all_cookies.json', json, 'utf-8');
    console.log('Tüm çerezler JSON formatında kaydedildi: all_cookies.json');

    await browser.close();
})();
