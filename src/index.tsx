import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { bodyLimit } from 'hono/body-limit';
import { fUpload } from './file';
import { _mClear, _mList, _mRead, mList } from './message';
import { pJump, pEdit, pList, pOmit, pSave, pQuickReply } from './post';
import { tList, tPeak } from './thread';
import { uAuth, uLogin, uLogout, uRegister, uConf, uSave } from './user';

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

app.get('/i', uConf);
app.post('/i', uSave);
app.get('/auth', uAuth);
app.post('/login', uLogin);
app.post('/logout', uLogout);
app.post('/register', uRegister);

app.get('/m', mList);
app.get('/_mList', _mList);
app.get('/_mClear', _mClear);
app.get('/_mRead', _mRead);

app.post('/f', bodyLimit({
  maxSize: 10 * 1024 * 1024, // MB
  onError: (a) => a.text('Payload Too Large', 413),
}), fUpload);

export default app
