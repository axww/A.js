import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { bodyLimit } from 'hono/body-limit';
import { fUpload } from './file';
import { mClear, mData, mList } from './message';
import { pJump, pEdit, pList, pOmit, pSave } from './post';
import { tList, tPeak } from './thread';
import { uAuth, uLogin, uLogout, uRegister, uConf, uSave, uAdv, uBan } from './user';

declare module 'hono' { interface ContextVariableMap { db: any, time: number } }
const app = new Hono();

app.use((c, next) => { c.set('time', Math.floor(Date.now() / 1000)); return next(); })
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

export default app
