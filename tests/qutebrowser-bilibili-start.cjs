const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../root/home/.config/qutebrowser/greasemonkey/bilibili-feed.user.js'),'utf8');
(async () => {
  let mutation, error, attached, disconnected = false;
  const listeners = {};
  const document = {
    head:null, documentElement:null, readyState:'loading',
    getElementById:()=>null, createElement:()=>({}),
    addEventListener:(type,fn)=>listeners[type]=fn,
  };
  vm.runInNewContext(source, {
    document, location:{pathname:'/'},
    MutationObserver:class {
      constructor(callback) { mutation=callback; }
      observe() {}
      disconnect() { disconnected=true; }
    },
  }).catch(e=>error=e);
  await new Promise(setImmediate);
  assert.equal(error,undefined,'must support document-start before head/html exist');
  assert.equal(typeof mutation,'function');
  document.documentElement={append:node=>attached=node};
  mutation();
  assert.ok(attached.textContent.includes('.bili-feed4-layout > :not(#qute-bili-feed)'));
  assert.equal(document.readyState,'loading','original feed hidden before DOM ready');
  assert.ok(disconnected,'startup observer stops after attaching CSS');
  assert.equal(typeof listeners.DOMContentLoaded,'function','UI waits for parsed DOM');
  console.log('Early Bilibili style injection: passed');
})();
