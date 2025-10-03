import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { bodyLimit } from 'hono/body-limit';
import { Config } from './core';
import { uAuth } from './uAuth';
import { mList } from './mList';
import { mData } from './mData';
import { mClear } from './mClear';
import { uConf } from './uConf';
import { uSave } from './uSave';
import { uLogin } from './uLogin';
import { uLogout } from './uLogout';
import { uRegister } from './uRegister';
import { uAdv } from './uAdv';
import { uBan } from './uBan';
import { fUpload } from './fUpload';
import { tList } from './tList';
import { tPeak } from './tPeak';
import { pList } from './pList';
import { pJump } from './pJump';
import { pEdit } from './pEdit';
import { pSave } from './pSave';
import { pOmit } from './pOmit';

declare module 'hono' {
  interface ContextVariableMap {
    db: any,
    time: number,
    hostname: string
  }
}
const app = new Hono();

app.use(async (a, next) => {
  a.set('time', Math.floor(Date.now() / 1000));
  a.set('hostname', new URL(a.req.url).hostname);
  return await next();
})
app.use('/*', serveStatic({ root: './public/' }))

app.get('/:page{[0-9]+}?', tList);
app.get('/t/:tid{[0-9]+}/:page{[0-9]+}?', pList);
app.get('/p', pJump);

app.put('/t/:tid{[-0-9]+}?', tPeak);
app.get('/e/:eid{[-0-9]+}?', pEdit);
app.post('/e/:eid{[-0-9]+}?', pSave);
app.delete('/e/:eid{[-0-9]+}?', pOmit);

app.get('/i', uConf);
app.post('/i', uSave);
app.get('/auth', uAuth);
app.post('/login', uLogin);
app.post('/logout', uLogout);
app.post('/register', uRegister);

app.put('/uAdv/:uid{[-0-9]+}', uAdv);
app.put('/uBan/:uid{[-0-9]+}', uBan);

app.get('/m', mList);
app.get('/mData', mData);
app.get('/mClear', mClear);

app.post('/f', bodyLimit({
  maxSize: 10 * 1024 * 1024, // MB
  onError: (a) => a.text('Payload Too Large', 413),
}), fUpload);

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
