const assert = require('node:assert/strict');
const {videos} = require('../root/home/.config/qutebrowser/greasemonkey/bilibili-feed.user.js');
const normal = {goto:'av', id:123, bvid:'BV123', title:'普通投稿'};
const input = [normal, {...normal}, ...['live','bangumi','pgc','article','banner','course','newtype'].map(goto=>({...normal,goto}))];
assert.deepEqual(videos(input,'pc'), [normal], 'only ordinary unique videos survive');
for (const flag of [{is_ad:1},{isAd:true},{ad_info:{}},{ad_cb:'x'},{card_goto:'ad_av'},{creative_id:42,source_id:5614}]) {
  assert.deepEqual(videos([{...normal,...flag}],'pc'), [], 'ad wrapped as av must be removed');
}
assert.deepEqual(videos([{goto:'av',param:'123'}],'app'), [], 'App placeholder is not a playable video');
const app = {goto:'av',param:'123',player_args:{aid:123}};
assert.deepEqual(videos([app,app],'app'),[app]);
console.log('Bilibili card filtering: passed');
const {cardInfo} = require('../root/home/.config/qutebrowser/greasemonkey/bilibili-feed.user.js');
const pcInfo = cardInfo({...normal,owner:{name:'UP',face:'https://example.com/a.jpg',mid:42},stat:{view:45000,danmaku:188},pubdate:1700000000,duration:327,rcmd_reason:{content:'已关注'}},'pc');
assert.equal(pcInfo.play,'4.5万'); assert.equal(pcInfo.danmaku,'188');
assert.equal(pcInfo.duration,'05:27'); assert.equal(pcInfo.face,'https://example.com/a.jpg');
const appInfo=cardInfo({...app,args:{up_name:'UP',up_id:42},avatar:{cover:'https://example.com/b.jpg'},desc:'UP · 9月11日',cover_left_icon_1:1,cover_left_text_1:'4.5万',cover_left_icon_2:3,cover_left_text_2:'188',player_args:{duration:327},bottom_rcmd_reason:'2万点赞'},'app');
assert.equal(appInfo.play,'4.5万'); assert.equal(appInfo.danmaku,'188');
assert.equal(appInfo.date,'9月11日'); assert.equal(appInfo.duration,'05:27');
console.log('Bilibili card metadata: passed');
assert.deepEqual(videos([{...normal,redirect_url:'https://www.bilibili.com/bangumi/play/ep3537944'}],'pc'),[], 'PGC disguised as an ordinary video must be removed');
assert.deepEqual(videos([{...normal,season_id:123}],'pc'),[{...normal,season_id:123}], 'ordinary UGC collections must remain');
