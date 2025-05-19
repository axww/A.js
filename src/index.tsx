import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { bodyLimit } from 'hono/body-limit'
import { pOmit, pSave, pQuickReply } from '../query/pData'
import { iLogin, iLogout, iRegister, iSave } from '../query/iData'
import { iAuth } from '../query/iAuth'
import { iConf } from '../query/iConf'
import { mList } from '../query/mList'
import { _mClear, _mList, _mRead } from '../query/mData'
import { pJump } from '../query/pJump'
import { pEdit } from '../query/pEdit'
import { pList } from '../query/pList'
import { tList } from '../query/tList'
import { tPeak } from '../query/tData'
import { fUpload } from '../query/fUpload'

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

export default app
