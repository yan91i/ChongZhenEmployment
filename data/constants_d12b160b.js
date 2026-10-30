// ============================
// GAME CONSTANTS & CHARACTERS
// ============================
const TIER_NAMES = ['恶劣','厌弃','冷淡','观望','亲近','倚重','深信'];
function getTier(v){
  if(v<=14)return 0;if(v<=28)return 1;if(v<=42)return 2;
  if(v<=57)return 3;if(v<=71)return 4;if(v<=85)return 5;return 6;
}
const RANKS = [
  '正七品·知县','从六品·州判','正六品·通判','从五品·知州',
  '正五品·知府','从四品·按察佥事','正四品·道台','从三品·参政',
  '正三品·按察使','从二品·布政使','正二品·巡抚','从一品·右都御史',
  '从一品·兵部侍郎衔','从一品·总督衔','从一品·总督','正一品·大学士'
];
const CHARACTERS = [
  {
    id:'hanmen',name:'寒门',subtitle:'天子门生',rank:'正七品·知县',route:'地方线',
    stats:{caibo:15,wentao:65,lizheng:30,wulue:20,tizhi:60},
    desc:'殿试一篇文章惊动天子，钦点进士及第。如今外放一县，名声比家底响得多。文章锋利，清议和圣眷都肯先多看你一眼；只是这世道，不会因为你会写策论就自己变干净。',
    lore:'吏部暗批："好文章，命薄了些。且看这硬骨头，能炸出几两油水。"'
  },
  {
    id:'jinshen',name:'缙绅',subtitle:'世家荫庇',rank:'从六品·户部主事',route:'户部线',
    stats:{caibo:80,wentao:30,lizheng:65,wulue:15,tizhi:50},
    desc:'带着殷实的家底与错综复杂的乡党人脉入局，可谓如鱼得水。但请时刻留意上面端详你的眼神——那通常是看着太仓候补银库的眼神。财不外露，方能延年益寿。',
    lore:'吏部暗批："银子够铺一座桥，只是到了紫禁城根底下，财大气粗容易被当成备用银库。"'
  },
  {
    id:'shijia',name:'没落世家',subtitle:'旧日余晖',rank:'正六品·百户',route:'边务线',
    stats:{caibo:40,wentao:25,lizheng:20,wulue:65,tizhi:70},
    desc:'祖上从龙余荫将尽，世袭虚名还挂着，家里却只剩旧盔旧马和一屋子讲不出价的体面。你只能投笔从戎，去九边吃沙子。',
    lore:'吏部暗批："武将的命比塞外的风还贱，在文官眼里不过是随时顶罪的耗材。"'
  },
  {
    id:'qingwang',name:'诗文清望',subtitle:'馆阁清名',rank:'正七品·监察御史',route:'言路线',
    stats:{caibo:48,wentao:82,lizheng:28,wulue:12,tizhi:40},
    desc:'家门三代皆以诗文名动东南，座师、书院与文会旧谊早替你把名字送进士林。你未必最富，却从小就知道一篇文章能抬人，也能杀人。',
    lore:'吏部暗批："诗名太盛，落笔自带锋铓。替朝廷开口是把快刀，替士林立名则容易把自己写进风口。"'
  },
  {
    id:'neiting',name:'内廷',subtitle:'内使当差',rank:'无品·御马监小火者',route:'内廷线',
    stats:{caibo:10,wentao:15,lizheng:40,wulue:45,tizhi:65},
    desc:'八岁那年家里揭不开锅，爹把你卖进了宫。净身房里那一刀，疼了三天三夜。你从御马监最末等的小火者做起——喂马、倒夜香、替大太监提灯跑腿。没人拿正眼瞧你，可你拿正眼瞧着所有人。东厂的刀、西厂的眼、锦衣卫的锁链、司礼监的朱笔——这些东西，迟早都得姓你的姓。',
    lore:'司礼监暗批："又一个乡下来的小崽子，能活过第一个冬天再说吧。"'
  }
];

const STAT_LABELS = {caibo:'财帛',wentao:'文韬',lizheng:'理政',wulue:'武略',tizhi:'体质'};
const ATT_LABELS = ['圣眷','中官','清议','士绅','民望'];
const ATT_KEYS = ['shengjuan','zhongguan','yanlu','shishen','minwang'];
