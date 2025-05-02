import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { serveStatic } from 'hono/bun'
import { bodyLimit } from 'hono/body-limit'
import { pOmit, pSave, pQuickReply } from './pData'
import { iLogin, iLogout, iRegister, iSave } from './iData'
import { iAuth } from './iAuth'
import { iConf } from './iConf'
import { mList } from './mList'
import { _mClear, _mList, _mRead } from './mData'
import { pJump } from './pJump'
import { pEdit } from './pEdit'
import { pList } from './pList'
import { tList } from './tList'
import { tPeak } from './tData'
import { fUpload } from './fUpload'

const app = new Hono();
app.use(csrf());

app.get('/:page{[0-9]+}?', tList);
app.get('/t/:tid{[0-9]+}/:page{[0-9]+}?', pList);
app.get('/p', pJump);

app.put('/t/:tid{[-0-9]+}?', tPeak);
app.get('/e/:eid{[-0-9]+}?', pEdit);
app.post('/e/:eid{[-0-9]+}?', pSave);
app.delete('/e/:eid{[-0-9]+}?', pOmit);
app.post('/api/quick-reply', pQuickReply);

app.get('/i', iConf);
app.post('/i', iSave);
app.get('/auth', iAuth);
app.post('/login', iLogin);
app.post('/logout', iLogout);
app.post('/register', iRegister);

app.get('/m', mList);
app.get('/_mList', _mList);
app.get('/_mClear', _mClear);
app.get('/_mRead', _mRead);

app.post('/f', bodyLimit({
    maxSize: 10 * 1024 * 1024, // MB
    onError: (a) => a.text('Payload Too Large', 413),
}), fUpload);

// Sitemap
app.get('/sitemap.xml', async (a) => {
    const baseUrl = new URL(a.req.url).origin;
    const staticRoutes = [
        { url: '/', changefreq: 'daily', priority: 1.0 },
        { url: '/auth', changefreq: 'monthly', priority: 0.3 },
        { url: '/i', changefreq: 'monthly', priority: 0.3 }
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${staticRoutes.map(route => `
    <url>
        <loc>${baseUrl}${route.url}</loc>
        <changefreq>${route.changefreq}</changefreq>
        <priority>${route.priority}</priority>
    </url>`).join('')}
</urlset>`;

    return a.newResponse(xml, 200, {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1800'
    });
});

// File
app.use('/*', serveStatic({ root: './const/' }));

export default {
    port: 3000,
    fetch: app.fetch,
}
