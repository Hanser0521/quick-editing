import * as obsidian from 'obsidian';
import { evaluateArithmetic } from './utils/arithmetic';
import { escapeRegExp } from './utils/text';
import { convertWindowsPathSyntax } from './utils/windows-path';
import { sanitizeSettings, type QuickEditingSettings } from './settings';
import { transformClipboardText } from './clipboard/smart-paste';
import { htmlToMarkdown } from './clipboard/html-to-markdown';
import { handleClipboardEvent } from './clipboard/event-paste';
import {
    commandCatalogEntry,
    type CommandCatalogEntry,
} from './features/catalog';
import {
    isMarkdownOffsetProtected,
    transformMarkdownOutsideProtected,
    transformMarkdownRangeOutsideProtected,
} from './markdown/context';
import { convertInternalLinkSelection, type InternalLinkServices } from './obsidian/internal-links';
import { executeCoreCommand } from './obsidian/command-compat';
import {
    addCjkLatinSpacing,
    removeHorizontalSpaces,
    removeInlineComments,
    trimTrailingWhitespace,
} from './transformations/whitespace';
import {
    normalizeMixedPunctuation,
    repairExternalText,
    repairMarkdownSyntax,
    repairUnexpectedLineBreaks,
} from './transformations/cleanup';
import { linkPotentialTitles } from './transformations/potential-links';
import { findAdjacentMatch } from './editor/find-adjacent-match';
import { summarizeTransformation } from './transformations/preview';
import { TransformationPreviewModal } from './ui/transformation-preview-modal';
import { createSettingsSection, renderModernSettings } from './ui/modern-settings';

/* *****************************************************************************
使用声明
Quick Editing 由 Hanser0521 基于 obsidian-canzi 的 ZH 增强编辑项目继续维护。
插件包含大量批量文本操作，请在重要笔记上使用前保留备份。
***************************************************************************** */


const 当前版本 = '1.0.0';
const 功能更新 = 'Quick Editing 1.0.0\n- 使用 Markdown 语法树保护代码、Frontmatter、公式和链接\n- 全文转换增加预计修改数量、前后预览和一键撤销\n- 智能粘贴改用 ClipboardEvent，HTML 表格通过 DOM 解析\n- 内链结合 MetadataCache 与 FileManager 生成相对链接\n- 新增四个独立功能组、命令搜索和逐命令开关\n- 支持 Obsidian 多窗口与弹出窗口\n- 移除 27 条 Obsidian 核心已有的重复命令\n- 建立完整 TypeScript、单元测试、构建与发布检查';
const 宣传页面 = '查看 <a href="https://github.com/Hanser0521/quick-editing/releases">Quick Editing GitHub 页面</a>';
const 上标图标 ='<svg xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path fill="currentColor"d="M16 7.41L11.41 12L16 16.59L14.59 18L10 13.41L5.41 18L4 16.59L8.59 12L4 7.41L5.41 6L10 10.59L14.59 6L16 7.41M21.85 9h-4.88V8l.89-.82c.76-.64 1.32-1.18 1.7-1.63c.37-.44.56-.85.57-1.23a.884.884 0 0 0-.27-.7c-.18-.19-.47-.28-.86-.29c-.31.01-.58.07-.84.17l-.66.39l-.45-1.17c.27-.22.59-.39.98-.53S18.85 2 19.32 2c.78 0 1.38.2 1.78.61c.4.39.62.93.62 1.57c-.01.56-.19 1.08-.54 1.55c-.34.48-.76.93-1.27 1.36l-.64.52v.02h2.58V9z"/></svg>';
const 下标图标 = '<svg xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path fill="currentColor" d="M16 7.41L11.41 12L16 16.59L14.59 18L10 13.41L5.41 18L4 16.59L8.59 12L4 7.41L5.41 6L10 10.59L14.59 6L16 7.41m5.85 13.62h-4.88v-1l.89-.8c.76-.65 1.32-1.19 1.7-1.63c.37-.44.56-.85.57-1.24a.898.898 0 0 0-.27-.7c-.18-.16-.47-.28-.86-.28c-.31 0-.58.06-.84.18l-.66.38l-.45-1.17c.27-.21.59-.39.98-.53s.82-.24 1.29-.24c.78.04 1.38.25 1.78.66c.4.41.62.93.62 1.57c-.01.56-.19 1.08-.54 1.55c-.34.47-.76.92-1.27 1.36l-.64.52v.02h2.58v1.35z"/></svg>';
const 格式刷图标 ='<svg t="1650117667147" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="120" height="120"><path d="M409.856 331.9296l103.1936-103.168 307.712 307.712-103.168 103.168z" fill="#777677" p-id="12960"></path><path d="M384 358.4s-153.6 128-256 99.84c23.04 38.4 53.76 76.8 51.2 79.36 79.36 17.92 204.8-51.2 204.8-51.2l25.6 25.6s-133.12 102.4-204.8 76.8c66.56 99.84 212.48 225.28 256 256 97.28 0 230.4-179.2 230.4-179.2L384 358.4z" fill="#FCAF6D" p-id="12961"></path><path d="M641.3568 306.9952l153.856-153.856 103.1936 103.168-153.856 153.856z" fill="#777677" p-id="12962"></path></svg>';
const md语法图标 = '<svg t="1650122437266" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5178" width="120" height="120"><path d="M96 672v-341.333333h85.333333l128 128 128-128h85.333334v341.333333h-85.333334v-220.586667l-128 128-128-128v220.586667h-85.333333m597.333333-341.333333h128v170.666666h106.666667l-170.666667 192-170.666666-192h106.666666z" fill="#42A5F5" p-id="5179"></path></svg>';
const 普通格式刷 ='<svg t="1650117667147" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="120" height="120"><path d="M409.856 331.9296l103.1936-103.168 307.712 307.712-103.168 103.168z" fill="#777677" p-id="12960"></path><path d="M384 358.4s-153.6 128-256 99.84c23.04 38.4 53.76 76.8 51.2 79.36 79.36 17.92 204.8-51.2 204.8-51.2l25.6 25.6s-133.12 102.4-204.8 76.8c66.56 99.84 212.48 225.28 256 256 97.28 0 230.4-179.2 230.4-179.2L384 358.4z" fill="#777677" p-id="12961"></path><path d="M641.3568 306.9952l153.856-153.856 103.1936 103.168-153.856 153.856z" fill="#777677" p-id="12962"></path></svg>';
const 全局命令图标 = '<svg t="1650192738325" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="70946" width="110" height="110"><path d="M129.9 755.5625c-34.025 0-64.5 28.625-64.5 62.6875 0 34.0625 30.4625 64.5 64.5 64.5 34 0 62.6875-30.4375 62.6875-64.5C192.5875 784.1875 163.9 755.5625 129.9 755.5625zM129.9 447.4c-34.025 0-64.5 28.65-64.5 62.6875s30.4625 62.8125 64.5 62.8125c34 0 62.6875-28.775 62.6875-62.8125S163.9 447.4 129.9 447.4zM359.1875 259.3375 901.875 259.3375c32.25 0 59.125-25.0875 59.125-57.3125 0-32.25-26.875-59.125-59.125-59.125L359.1875 142.9c-32.275 0-59.125 26.875-59.125 59.125C300.0625 234.25 326.9 259.3375 359.1875 259.3375zM129.9 137.525c-34.025 0-64.5 30.4625-64.5 64.5 0 34 30.4625 62.6875 64.5 62.6875 34 0 62.6875-28.6875 62.6875-62.6875C192.5875 168 163.9 137.525 129.9 137.525zM901.875 451 359.1875 451c-32.275 0-59.125 26.8375-59.125 59.0875s26.8375 59.15 59.125 59.15L901.875 569.2375c32.25 0 59.125-26.9 59.125-59.15S934.125 451 901.875 451zM901.875 759.125 359.1875 759.125c-32.275 0-59.125 26.875-59.125 59.125 0 32.25 26.8375 59.125 59.125 59.125L901.875 877.375c32.25 0 59.125-26.875 59.125-59.125C961 786 934.125 759.125 901.875 759.125z" fill="#1290f8" p-id="70947"></path></svg>';

var 简体字表 = "皑蔼碍爱肮翱袄奥坝罢摆败颁办绊帮绑镑谤剥饱宝报鲍辈贝钡狈备惫绷笔毕毙币闭边编贬变辩辫标鳖别瘪濒滨宾摈饼并拨钵铂驳卜补财参蚕残惭惨灿苍舱仓沧厕侧册测层诧搀掺蝉馋谗缠铲产阐颤场尝长偿肠厂畅钞车彻尘沉陈衬撑称惩诚骋痴迟驰耻齿炽冲虫宠畴踌筹绸丑橱厨锄雏础储触处传疮闯创锤纯绰辞词赐聪葱囱从丛凑蹿窜错达带贷担单郸掸胆惮诞弹当挡党荡档捣岛祷导盗灯邓敌涤递缔颠点垫电淀凋钓调迭谍叠钉顶锭订丢东动栋冻斗犊独读赌镀锻断缎兑队对吨顿钝夺堕鹅额讹恶饿儿尔饵贰发罚阀珐矾钒烦范贩饭访纺飞诽废费纷坟奋愤粪丰枫锋风疯冯缝讽凤肤辐抚辅赋复负讣妇缚该钙盖干杆赶秆赣冈刚钢纲岗皋镐搁鸽阁铬个给龚宫巩贡钩沟苟构购够蛊顾剐挂关观馆惯贯广规硅归龟闺轨诡柜贵刽辊滚锅国过骇韩汉号阂鹤贺横轰鸿红后壶护沪户哗华画划话怀坏欢环还缓换唤痪焕涣黄谎挥辉毁贿秽会烩汇讳诲绘荤浑伙获货祸击机积饥迹讥鸡绩缉极辑级挤几蓟剂济计记际继纪夹荚颊贾钾价驾歼监坚笺间艰缄茧检碱硷拣捡简俭减荐槛鉴践贱见键舰剑饯渐溅涧将浆蒋桨奖讲酱胶浇骄娇搅铰矫侥脚饺缴绞轿较秸阶节茎鲸惊经颈静镜径痉竞净纠厩旧驹举据锯惧剧鹃绢杰洁结诫届紧锦仅谨进晋烬尽劲荆觉决诀绝钧军骏开凯颗壳课垦恳抠库裤夸块侩宽矿旷况亏岿窥馈溃扩阔蜡腊莱来赖蓝栏拦篮阑兰澜谰揽览懒缆烂滥琅捞劳涝乐镭垒类泪篱狸离里鲤礼丽厉励砾历沥隶俩联莲连镰怜涟帘敛脸链恋炼练粮凉两辆谅疗辽镣猎临邻鳞凛赁龄铃凌灵岭领馏刘龙聋咙笼垄拢陇楼娄搂篓芦卢颅庐炉掳卤虏鲁赂禄录陆驴吕铝侣屡缕虑滤绿峦挛孪滦乱抡轮伦仑沦纶论萝罗逻锣箩骡骆络妈玛码蚂马骂吗买麦卖迈脉瞒馒蛮满谩猫锚铆贸么霉没镁门闷们锰梦眯谜弥觅幂绵缅庙灭悯闽鸣铭谬谋亩呐钠纳难挠脑恼闹馁内拟你腻撵捻酿鸟聂啮镊镍柠狞宁拧泞钮纽脓浓农疟诺欧鸥殴呕沤盘庞抛赔喷鹏骗飘频贫苹凭评泼颇扑铺朴谱栖凄脐齐骑岂启气弃讫牵扦钎铅迁签谦钱钳潜浅谴堑枪呛墙蔷强抢锹桥乔侨翘窍窃钦亲寝轻氢倾顷请庆琼穷趋区躯驱龋颧权劝却鹊确让饶扰绕热韧认纫荣绒软锐闰润洒萨鳃赛叁伞丧骚扫涩杀刹纱筛晒删闪陕赡缮墒伤赏烧绍赊摄慑设绅审婶肾渗声绳胜圣师狮湿诗尸时蚀实识驶势适释饰视试寿兽枢输书赎属术树竖数帅双谁税顺说硕烁丝饲耸怂颂讼诵擞苏诉肃虽随绥岁孙损笋缩琐锁獭挞抬台态摊贪瘫滩坛谭谈叹汤烫涛绦讨腾誊锑题体屉条贴铁厅听烃铜统头秃图涂团颓蜕脱鸵驮驼椭洼袜弯湾顽万网韦违围为潍维苇伟伪纬喂谓卫温闻纹稳问瓮挝蜗涡窝卧呜钨乌污诬无芜吴坞雾务误锡牺袭习铣戏细虾辖峡侠狭厦吓锨鲜纤咸贤衔闲显险现献县馅羡宪线厢镶乡详响项萧嚣销晓啸蝎协挟携胁谐写泻谢锌衅兴凶汹锈绣虚嘘须许叙绪续轩悬选癣绚学勋询寻驯训讯逊压鸦鸭哑亚讶阉烟盐严岩颜阎艳厌砚彦谚验鸯杨扬疡阳痒养样瑶摇尧遥窑谣药爷页业叶一医铱颐遗仪彝蚁艺亿忆义诣议谊译异绎荫阴银饮隐樱婴鹰应缨莹萤营荧蝇赢颖哟拥佣痈踊咏涌优忧邮铀犹游诱于舆鱼渔娱与屿语吁御狱誉预驭鸳渊辕园员圆缘远愿约跃钥岳粤悦阅云郧匀陨运蕴酝晕韵杂灾载攒暂赞赃脏凿枣灶责择则泽贼赠扎札轧铡闸栅诈斋债毡盏斩辗崭栈战绽张涨帐账胀赵蛰辙锗这贞针侦诊镇阵挣睁狰争帧症郑证织职执纸志挚掷帜质滞钟终种肿众诌轴皱昼骤猪诸诛烛瞩嘱贮铸筑注驻专砖转赚桩庄装妆壮状锥赘坠缀谆准着浊兹资渍踪综总纵邹诅组钻锕嗳嫒瑷暧霭谙铵鹌媪骜鳌钯呗钣鸨龅鹎贲锛荜哔滗铋筚跸苄缏笾骠飑飙镖镳鳔傧缤槟殡膑镔髌鬓禀饽钹鹁钸骖黪恻锸侪钗冁谄谶蒇忏婵骣觇禅镡伥苌怅阊鲳砗伧谌榇碜龀枨柽铖铛饬鸱铳俦帱雠刍绌蹰钏怆缍鹑辍龊鹚苁骢枞辏撺锉鹾哒鞑骀绐殚赕瘅箪谠砀裆焘镫籴诋谛绨觌镝巅钿癫铫鲷鲽铤铥岽鸫窦渎椟牍笃黩簖怼镦炖趸铎谔垩阏轭锇锷鹗颚颛鳄诶迩铒鸸鲕钫鲂绯镄鲱偾沣凫驸绂绋赙麸鲋鳆钆赅尴擀绀戆睾诰缟锆纥镉颍亘赓绠鲠诟缑觏诂毂钴锢鸪鹄鹘鸹掴诖掼鹳鳏犷匦刿妫桧鲑鳜衮绲鲧埚呙帼椁蝈铪阚绗颉灏颢诃阖蛎黉讧荭闳鲎浒鹕骅桦铧奂缳锾鲩鳇诙荟哕浍缋珲晖诨馄阍钬镬讦诘荠叽哜骥玑觊齑矶羁虿跻霁鲚鲫郏浃铗镓蛲谏缣戋戬睑鹣笕鲣鞯绛缰挢峤鹪鲛疖颌鲒卺荩馑缙赆觐刭泾迳弪胫靓阄鸠鹫讵屦榉飓钜锔窭龃锩镌隽谲珏皲剀垲忾恺铠锴龛闶钪铐骒缂轲钶锞颔龈铿喾郐哙脍狯髋诓诳邝圹纩贶匮蒉愦聩篑阃锟鲲蛴崃徕涞濑赉睐铼癞籁岚榄斓镧褴阆锒唠崂铑铹痨鳓诔缧俪郦坜苈莅蓠呖逦骊缡枥栎轹砺锂鹂疠粝跞雳鲡鳢蔹奁潋琏殓裢裣鲢魉缭钌鹩蔺廪檩辚躏绫棂蛏鲮浏骝绺镏鹨茏泷珑栊胧砻偻蒌喽嵝镂瘘耧蝼髅垆撸噜闾泸渌栌橹轳辂辘氇胪鸬鹭舻鲈脔娈栾鸾銮囵荦猡泺椤脶镙榈褛锊呒唛嬷杩劢缦镘颡鳗麽扪焖懑钔芈谧猕祢渑腼黾缈缪闵缗谟蓦馍殁镆钼铙讷铌鲵辇鲶茑袅陧蘖嗫颟蹑苎咛聍侬哝驽钕傩讴怄瓯蹒疱辔纰罴铍谝骈缥嫔钋镤镨蕲骐绮桤碛颀颃鳍佥荨悭骞缱椠钤嫱樯戗炝锖锵镪羟跄诮谯荞缲硗跷惬锲箧锓揿鲭茕蛱巯赇虮鳅诎岖阒觑鸲诠绻辁铨阕阙悫荛娆桡饪轫嵘蝾缛铷颦蚬飒毵糁缫啬铯穑铩鲨酾讪姗骟钐鳝垧殇觞厍滠畲诜谂渖谥埘莳弑轼贳铈鲥绶摅纾闩铄厮驷缌锶鸶薮馊飕锼谡稣谇荪狲唢睃闼铊鳎钛鲐昙钽锬顸傥饧铴镗韬铽缇鹈阗粜龆鲦恸钭钍抟饨箨鼍娲腽纨绾辋诿帏闱沩涠玮韪炜鲔阌莴龌邬庑怃妩骛鹉鹜饩阋玺觋硖苋莶藓岘猃娴鹇痫蚝籼跹芗饷骧缃飨哓潇骁绡枭箫亵撷绁缬陉荥馐鸺诩顼谖铉镟谑泶鳕埙浔鲟垭娅桠氩厣赝俨兖谳恹闫酽魇餍鼹炀轺鹞鳐靥谒邺晔烨诒呓峄饴怿驿缢轶贻钇镒镱瘗舣铟瘾茔莺萦蓥撄嘤滢潆璎鹦瘿颏罂镛莸铕鱿伛俣谀谕蓣嵛饫阈妪纡觎欤钰鹆鹬龉橼鸢鼋钺郓芸恽愠纭韫殒氲瓒趱錾驵赜啧帻箦谮缯谵诏钊谪辄鹧浈缜桢轸赈祯鸩诤峥钲铮筝骘栉栀轵轾贽鸷蛳絷踬踯觯锺纣绉伫槠铢啭馔颞骓缒诼镯谘缁辎赀眦锱龇鲻偬诹驺鲰镞缵躜鳟讠谫郄勐凼坂垅垴埯埝苘荬荮莜莼菰藁揸吒吣咔咝咴噘噼嚯幞岙嵴彷徼犸狍馀馇馓馕愣憷懔丬溆滟溷漤潴澹甯纟绔绱珉枧桊桉槔橥轱轷赍肷胨飚煳煅熘愍淼砜磙眍钚钷铘铞锃锍锎锏锘锝锪锫锿镅镎镢镥镩镲稆鹋鹛鹱疬疴痖癯裥襁耢颥螨麴鲅鲆鲇鲞鲴鲺鲼鳊鳋鳘鳙鞒鞴齄";
var 繁体字表 = "皚藹礙愛骯翺襖奧壩罷擺敗頒辦絆幫綁鎊謗剝飽寶報鮑輩貝鋇狽備憊繃筆畢斃幣閉邊編貶變辯辮標鱉別癟瀕濱賓擯餅並撥缽鉑駁蔔補財參蠶殘慚慘燦蒼艙倉滄廁側冊測層詫攙摻蟬饞讒纏鏟產闡顫場嘗長償腸廠暢鈔車徹塵沈陳襯撐稱懲誠騁癡遲馳恥齒熾沖蟲寵疇躊籌綢醜櫥廚鋤雛礎儲觸處傳瘡闖創錘純綽辭詞賜聰蔥囪從叢湊躥竄錯達帶貸擔單鄲撣膽憚誕彈當擋黨蕩檔搗島禱導盜燈鄧敵滌遞締顛點墊電澱雕釣調叠諜疊釘頂錠訂丟東動棟凍鬥犢獨讀賭鍍鍛斷緞兌隊對噸頓鈍奪墮鵝額訛惡餓兒爾餌貳發罰閥琺礬釩煩範販飯訪紡飛誹廢費紛墳奮憤糞豐楓鋒風瘋馮縫諷鳳膚輻撫輔賦復負訃婦縛該鈣蓋幹桿趕稈贛岡剛鋼綱崗臯鎬擱鴿閣鉻個給龔宮鞏貢鉤溝茍構購夠蠱顧剮掛關觀館慣貫廣規矽歸龜閨軌詭櫃貴劊輥滾鍋國過駭韓漢號閡鶴賀橫轟鴻紅後壺護滬戶嘩華畫劃話懷壞歡環還緩換喚瘓煥渙黃謊揮輝毀賄穢會燴匯諱誨繪葷渾夥獲貨禍擊機積饑跡譏雞績緝極輯級擠幾薊劑濟計記際繼紀夾莢頰賈鉀價駕殲監堅箋間艱緘繭檢堿鹼揀撿簡儉減薦檻鑒踐賤見鍵艦劍餞漸濺澗將漿蔣槳獎講醬膠澆驕嬌攪鉸矯僥腳餃繳絞轎較稭階節莖鯨驚經頸靜鏡徑痙競凈糾廄舊駒舉據鋸懼劇鵑絹傑潔結誡屆緊錦僅謹進晉燼盡勁荊覺決訣絕鈞軍駿開凱顆殼課墾懇摳庫褲誇塊儈寬礦曠況虧巋窺饋潰擴闊蠟臘萊來賴藍欄攔籃闌蘭瀾讕攬覽懶纜爛濫瑯撈勞澇樂鐳壘類淚籬貍離裏鯉禮麗厲勵礫歷瀝隸倆聯蓮連鐮憐漣簾斂臉鏈戀煉練糧涼兩輛諒療遼鐐獵臨鄰鱗凜賃齡鈴淩靈嶺領餾劉龍聾嚨籠壟攏隴樓婁摟簍蘆盧顱廬爐擄鹵虜魯賂祿錄陸驢呂鋁侶屢縷慮濾綠巒攣孿灤亂掄輪倫侖淪綸論蘿羅邏鑼籮騾駱絡媽瑪碼螞馬罵嗎買麥賣邁脈瞞饅蠻滿謾貓錨鉚貿麽黴沒鎂門悶們錳夢瞇謎彌覓冪綿緬廟滅憫閩鳴銘謬謀畝吶鈉納難撓腦惱鬧餒內擬妳膩攆撚釀鳥聶嚙鑷鎳檸獰寧擰濘鈕紐膿濃農瘧諾歐鷗毆嘔漚盤龐拋賠噴鵬騙飄頻貧蘋憑評潑頗撲鋪樸譜棲淒臍齊騎豈啟氣棄訖牽扡釬鉛遷簽謙錢鉗潛淺譴塹槍嗆墻薔強搶鍬橋喬僑翹竅竊欽親寢輕氫傾頃請慶瓊窮趨區軀驅齲顴權勸卻鵲確讓饒擾繞熱韌認紉榮絨軟銳閏潤灑薩鰓賽三傘喪騷掃澀殺剎紗篩曬刪閃陜贍繕墑傷賞燒紹賒攝懾設紳審嬸腎滲聲繩勝聖師獅濕詩屍時蝕實識駛勢適釋飾視試壽獸樞輸書贖屬術樹豎數帥雙誰稅順說碩爍絲飼聳慫頌訟誦擻蘇訴肅雖隨綏歲孫損筍縮瑣鎖獺撻擡臺態攤貪癱灘壇譚談嘆湯燙濤絳討騰謄銻題體屜條貼鐵廳聽烴銅統頭禿圖塗團頹蛻脫鴕馱駝橢窪襪彎灣頑萬網韋違圍為濰維葦偉偽緯餵謂衛溫聞紋穩問甕撾蝸渦窩臥嗚鎢烏汙誣無蕪吳塢霧務誤錫犧襲習銑戲細蝦轄峽俠狹廈嚇鍁鮮纖鹹賢銜閑顯險現獻縣餡羨憲線廂鑲鄉詳響項蕭囂銷曉嘯蠍協挾攜脅諧寫瀉謝鋅釁興兇洶銹繡虛噓須許敘緒續軒懸選癬絢學勛詢尋馴訓訊遜壓鴉鴨啞亞訝閹煙鹽嚴巖顏閻艷厭硯彥諺驗鴦楊揚瘍陽癢養樣瑤搖堯遙窯謠藥爺頁業葉壹醫銥頤遺儀彜蟻藝億憶義詣議誼譯異繹蔭陰銀飲隱櫻嬰鷹應纓瑩螢營熒蠅贏穎喲擁傭癰踴詠湧優憂郵鈾猶遊誘於輿魚漁娛與嶼語籲禦獄譽預馭鴛淵轅園員圓緣遠願約躍鑰嶽粵悅閱雲鄖勻隕運蘊醞暈韻雜災載攢暫贊贓臟鑿棗竈責擇則澤賊贈紮劄軋鍘閘柵詐齋債氈盞斬輾嶄棧戰綻張漲帳賬脹趙蟄轍鍺這貞針偵診鎮陣掙睜猙爭幀癥鄭證織職執紙誌摯擲幟質滯鐘終種腫眾謅軸皺晝驟豬諸誅燭矚囑貯鑄築註駐專磚轉賺樁莊裝妝壯狀錐贅墜綴諄準著濁茲資漬蹤綜總縱鄒詛組鉆錒噯嬡璦曖靄諳銨鵪媼驁鰲鈀唄鈑鴇齙鵯賁錛蓽嗶潷鉍篳蹕芐緶籩驃颮飆鏢鑣鰾儐繽檳殯臏鑌髕鬢稟餑鈸鵓鈽驂黲惻鍤儕釵囅諂讖蕆懺嬋驏覘禪鐔倀萇悵閶鯧硨傖諶櫬磣齔棖檉鋮鐺飭鴟銃儔幬讎芻絀躕釧愴綞鶉輟齪鶿蓯驄樅輳攛銼鹺噠韃駘紿殫賧癉簞讜碭襠燾鐙糴詆諦綈覿鏑巔鈿癲銚鯛鰈鋌銩崠鶇竇瀆櫝牘篤黷籪懟鐓燉躉鐸諤堊閼軛鋨鍔鶚顎顓鱷誒邇鉺鴯鮞鈁魴緋鐨鯡僨灃鳧駙紱紼賻麩鮒鰒釓賅尷搟紺戇睪誥縞鋯紇鎘潁亙賡綆鯁詬緱覯詁轂鈷錮鴣鵠鶻鴰摑詿摜鸛鰥獷匭劌媯檜鮭鱖袞緄鯀堝咼幗槨蟈鉿闞絎頡灝顥訶闔蠣黌訌葒閎鱟滸鶘驊樺鏵奐繯鍰鯇鰉詼薈噦澮繢琿暉諢餛閽鈥鑊訐詰薺嘰嚌驥璣覬齏磯羈蠆躋霽鱭鯽郟浹鋏鎵蟯諫縑戔戩瞼鶼筧鰹韉絳韁撟嶠鷦鮫癤頜鮚巹藎饉縉贐覲剄涇逕弳脛靚鬮鳩鷲詎屨櫸颶鉅鋦窶齟錈鐫雋譎玨皸剴塏愾愷鎧鍇龕閌鈧銬騍緙軻鈳錁頷齦鏗嚳鄶噲膾獪髖誆誑鄺壙纊貺匱蕢憒聵簣閫錕鯤蠐崍徠淶瀨賚睞錸癩籟嵐欖斕鑭襤閬鋃嘮嶗銠鐒癆鰳誄縲儷酈壢藶蒞蘺嚦邐驪縭櫪櫟轢礪鋰鸝癘糲躒靂鱺鱧蘞奩瀲璉殮褳襝鰱魎繚釕鷯藺廩檁轔躪綾欞蟶鯪瀏騮綹鎦鷚蘢瀧瓏櫳朧礱僂蔞嘍嶁鏤瘺耬螻髏壚擼嚕閭瀘淥櫨櫓轤輅轆氌臚鸕鷺艫鱸臠孌欒鸞鑾圇犖玀濼欏腡鏍櫚褸鋝嘸嘜嬤榪勱縵鏝顙鰻麼捫燜懣鍆羋謐獼禰澠靦黽緲繆閔緡謨驀饃歿鏌鉬鐃訥鈮鯢輦鯰蔦裊隉蘗囁顢躡苧嚀聹儂噥駑釹儺謳慪甌蹣皰轡紕羆鈹諞駢縹嬪釙鏷鐠蘄騏綺榿磧頎頏鰭僉蕁慳騫繾槧鈐嬙檣戧熗錆鏘鏹羥蹌誚譙蕎繰磽蹺愜鍥篋鋟撳鯖煢蛺巰賕蟣鰍詘嶇闃覷鴝詮綣輇銓闋闕愨蕘嬈橈飪軔嶸蠑縟銣顰蜆颯毿糝繅嗇銫穡鎩鯊釃訕姍騸釤鱔坰殤觴厙灄畬詵諗瀋謚塒蒔弒軾貰鈰鰣綬攄紓閂鑠廝駟緦鍶鷥藪餿颼鎪謖穌誶蓀猻嗩脧闥鉈鰨鈦鮐曇鉭錟頇儻餳鐋鏜韜鋱緹鵜闐糶齠鰷慟鈄釷摶飩籜鼉媧膃紈綰輞諉幃闈溈潿瑋韙煒鮪閿萵齷鄔廡憮嫵騖鵡鶩餼鬩璽覡硤莧薟蘚峴獫嫻鷴癇蠔秈躚薌餉驤緗饗嘵瀟驍綃梟簫褻擷紲纈陘滎饈鵂詡頊諼鉉鏇謔澩鱈塤潯鱘埡婭椏氬厴贗儼兗讞懨閆釅魘饜鼴煬軺鷂鰩靨謁鄴曄燁詒囈嶧飴懌驛縊軼貽釔鎰鐿瘞艤銦癮塋鶯縈鎣攖嚶瀅瀠瓔鸚癭頦罌鏞蕕銪魷傴俁諛諭蕷崳飫閾嫗紆覦歟鈺鵒鷸齬櫞鳶黿鉞鄆蕓惲慍紜韞殞氳瓚趲鏨駔賾嘖幘簀譖繒譫詔釗謫輒鷓湞縝楨軫賑禎鴆諍崢鉦錚箏騭櫛梔軹輊贄鷙螄縶躓躑觶鍾紂縐佇櫧銖囀饌顳騅縋諑鐲諮緇輜貲眥錙齜鯔傯諏騶鯫鏃纘躦鱒訁譾郤猛氹阪壟堖垵墊檾蕒葤蓧蒓菇槁摣咤唚哢噝噅撅劈謔襆嶴脊仿僥獁麅餘餷饊饢楞怵懍爿漵灩混濫瀦淡寧糸絝緔瑉梘棬案橰櫫軲軤賫膁腖飈糊煆溜湣渺碸滾瞘鈈鉕鋣銱鋥鋶鐦鐧鍩鍀鍃錇鎄鎇鎿鐝鑥鑹鑔穭鶓鶥鸌癧屙瘂臒襇繈耮顬蟎麯鮁鮃鮎鯗鯝鯴鱝鯿鰠鰵鱅鞽韝齇";
var newNotice: obsidian.Notice | undefined;
var 当前文件: obsidian.TFile | null = null;
var 当前文件路径 = '';
var 编辑模式: obsidian.Editor = null as unknown as obsidian.Editor;
var 聚焦编辑 = true;
var 所选文本 = "";
var 笔记正文 = "";
var 笔记全文: obsidian.Editor = null as unknown as obsidian.Editor;
var 处理文本 = "";
var 当前行文本 = "";
var 历史行文本 = "";
var 当前光标: obsidian.EditorPosition = { line: 0, ch: 0 };
var 历史光标: obsidian.EditorPosition = { line: 0, ch: 0 };
var 当前行号 = 0;
var 选至行首 = "";
var 选至行尾 = "";
var 末行行号 = 0;
var 末行文本 = "";
var 选至文首 = "";
var 选至文末 = "";
var 历史缩进 = "";
var 按上档键 = false;

var isShift = false;
var isIndent = true;
var isTool = false;
var isbt1Txt = false;
var isbt2Txt = false;
var isText = false;
var isGLS = false;
var isCTS = false;
var isXTS = false;
var isSCS = false;
var isXHS = false;
var isSB = false;
var isXB = false;
var isBgC = false;
var isCTxt = false;
var isGLS1 = false;
var isGLS2 = false;
var isGLS3 = false;

var isTHS = false; //涂黑
var isTCS = false; //涂彩
var isWKS = false; //挖空

function setAttributes(element: Element, attributes: Record<string, string>) {
    for (let key in attributes) {
        const value = attributes[key];
        if (value !== undefined) element.setAttribute(key, value);
    }
}

class QuickEditingPlugin extends obsidian.Plugin {
    settings: QuickEditingSettings = sanitizeSettings(null);
    footnoteStatusBar!: HTMLElement;
    dualLeftLeaf: obsidian.WorkspaceLeaf | undefined;
    dualRightLeaf: obsidian.WorkspaceLeaf | undefined;
    private readonly registeredCommandCatalog: CommandCatalogEntry[] = [];
    private readonly registeredEditorWindows = new WeakSet<Window>();

    getCommandCatalog(): readonly CommandCatalogEntry[] {
        return this.registeredCommandCatalog;
    }

    isCommandEnabled(commandId: string): boolean {
        const override = this.settings.commandEnabled[commandId];
        return override ?? true;
    }

    private addQuickCommand(command: obsidian.Command): void {
        const entry = commandCatalogEntry(command);
        this.registeredCommandCatalog.push(entry);
        if (!this.isCommandEnabled(command.id)) return;
        if (entry.group && !this.settings.featureGroups[entry.group]) return;
        super.addCommand(command);
    }

    private registerPopoutEditorWindow(win: Window): void {
        if (this.registeredEditorWindows.has(win)) return;
        this.registeredEditorWindows.add(win);
        const doc = win.document;
        this.registerDomEvent(doc, 'mouseup', () => {
            if (!this.settings.featureGroups.formatBrush) return;
            历史光标 = 当前光标;
            if (!this.获取编辑器信息()) return;
            if (聚焦编辑 && 所选文本 !== '') {
                历史行文本 = 当前行文本;
                if (isText) this.转换无语法文本();
                else if (isbt1Txt) this.标题语法('#');
                else if (isbt2Txt) this.标题语法('##');
                else if (isCTxt) this.转换文字颜色();
                else if (isBgC) this.转换背景颜色();
                else if (isGLS) this.转换高亮();
                else if (isGLS1) this.转换高亮1();
                else if (isGLS2) this.转换高亮2();
                else if (isGLS3) this.转换高亮3();
                else if (isCTS) this.转换粗体();
                else if (isXTS) this.转换斜体();
                else if (isSCS) this.转换删除线();
                else if (isXHS) this.转换下划线();
                else if (isSB) this.转换上标();
                else if (isXB) this.转换下标();
                else if (isTHS) this.转换涂黑();
                else if (isTCS) this.转换涂彩();
                else if (isWKS) this.转换挖空();
            }
        });
        this.registerDomEvent(doc, 'keydown', (event) => {
            if (event.key === 'Shift') isShift = true;
            if ((event.key === 'Esc' || event.key === 'Escape') && this.settings.featureGroups.formatBrush) {
                this.关闭格式刷();
            }
        });
        this.registerDomEvent(doc, 'keyup', (event) => {
            if (event.key === 'Shift') isShift = false;
        });
    }

    private 获取编辑器文档(editor: obsidian.Editor): Document {
        const leaf = this.app.workspace.getLeavesOfType('markdown').find((candidate) => {
            const view = candidate.view;
            return view instanceof obsidian.MarkdownView && view.editor === editor;
        });
        return leaf?.view.containerEl.ownerDocument ?? activeDocument;
    }

    private 在文档显示通知(
        message: string | DocumentFragment,
        duration: number,
        targetDocument: Document,
    ): obsidian.Notice {
        const notice = new obsidian.Notice(typeof message === 'string' ? message : '', duration);
        if (typeof message !== 'string') {
            notice.messageEl.empty();
            notice.messageEl.appendChild(message);
        }
        if (notice.containerEl.ownerDocument !== targetDocument) {
            let container = targetDocument.querySelector<HTMLElement>('.notice-container');
            if (!container) {
                container = targetDocument.body.createDiv({ cls: 'notice-container' });
            }
            container.appendChild(notice.containerEl);
        }
        return notice;
    }

    async onload() {
        //console.log(t('loadThisPlugin'));
        await this.loadSettings();
        this.registerEvent(this.app.workspace.on('editor-paste', (event, editor) => {
            if (!this.settings.featureGroups.smartPaste || !this.settings.smartPasteOnPaste) return;
            const result = handleClipboardEvent(event, editor);
            if (!result) return;
            const labels: Record<string, string> = {
                html: 'HTML 富文本已转为 Markdown',
                'html-table': 'HTML 表格已通过 DOM 解析为 Markdown 表格',
                'media-url': '媒体网址已转为 Markdown 嵌入',
                url: '网址已转为 Markdown 链接',
                'media-path': '媒体路径已转为 Markdown 嵌入',
                path: '本地路径已转为 Markdown 链接',
                table: '制表符数据已转为 Markdown 表格',
            };
            new obsidian.Notice(labels[result.kind] ?? '已完成智能粘贴');
        }));
        this.registerEvent(this.app.workspace.on('window-open', (_workspaceWindow, win) => {
            this.registerPopoutEditorWindow(win);
        }));
        this.footnoteStatusBar = this.addStatusBarItem();
        this.footnoteStatusBar.setText("");
        this.addQuickCommand({
            id: 'internal-link',
            name: '[[链接]]语法',
            callback: () => this.转换内部链接(),
            hotkeys: [{ modifiers: ["Alt"], key: "Z" } ]
        });
        //console.log('加载了'+this.settings.maxTry);
        this.addQuickCommand({
            id: 'tag-link-text',
            name: '标签双链互转',
            callback: () => this.标签双链互转(),
            hotkeys: [{ modifiers: ["Mod","Alt","Shift"], key: "3" } ]
        });

        /**/
        this.addQuickCommand({
            id: 'all-links',
            name: '全局转换[[链接]]',
            callback: () => this.转换潜在链接()
        });
        this.addQuickCommand({
            id: 'internal-link2',
            name: '[[链接|同名]]语法',
            callback: () => this.转换同义链接(),
            hotkeys: [{ modifiers: ["Alt"], key: "Q" } ]
        });
        this.addQuickCommand({
            id: 'auto-text',
            name: '智能符号',
            callback: () => this.智能符号(),
            hotkeys: [{ modifiers: ["Alt"], key: ";"}]
        });

        this.addQuickCommand({
            id: 'open-up',
            name: '查看同级上方文件',
            callback: () => this.切换文件列表(-1),
            hotkeys: [{ modifiers: ["Alt","Shift"], key: "U" } ]
        });

        this.addQuickCommand({
            id: 'open-down',
            name: '查看同级下方文件',
            callback: () => this.切换文件列表(1),
            hotkeys: [{ modifiers: ["Alt","Shift"], key: "N" } ]
        });
        /*
        this.addQuickCommand({
            id: 'open-RightWin',
            name: '开右窗口预览',
            callback: () => this.开右窗口预览(),
            hotkeys: [{ modifiers: ["Alt","Shift"], key: "L" } ]
        });
        */
        this.addQuickCommand({
            id: 'leftWin-Up',
            name: '左窗向上滚动',
            callback: () => this.左窗向上滚动(),
            hotkeys: [{ modifiers: ["Alt","Shift"], key: "I" } ]
        });
        this.addQuickCommand({
            id: 'leftWin-Down',
            name: '左窗向下滚动',
            callback: () => this.左窗向下滚动(),
            hotkeys: [{ modifiers: ["Alt","Shift"], key: "K" } ]
        });
        /**/

        this.addQuickCommand({
            id: 'zeng-btexts',
            name: '调高标题级别',
            callback: () => this.调节标题级别(true)
        });
        this.addQuickCommand({
            id: 'jian-btexts',
            name: '调低标题级别',
            callback: () => this.调节标题级别(false)
        });

        /**/
        this.addQuickCommand({
            id: 'auto-texts',
            name: '自动设置标题',
            callback: () => this.自动设置标题()
        });
        this.addQuickCommand({
            id: 'enlarge-texts',
            name: '大字号文本',
            callback: () => this.大字号文本()
        });

        this.addQuickCommand({
            id: 'quit-format',
            name: '关闭格式刷',
            callback: () => {
                this.关闭格式刷();
                new obsidian.Notice("已关闭格式刷！");
            }
        });
        this.addQuickCommand({
            id: 'cuti-format',
            name: '**粗体**格式刷',
            callback: () => this.粗体格式刷(),
            hotkeys: [{ modifiers: ["Alt","Shift"], key: "C" } ]
        });
        this.addQuickCommand({
            id: 'gaoliang-format',
            name: '==高亮==格式刷',
            callback: () => this.高亮格式刷(),
            hotkeys: [{ modifiers: ["Alt","Shift"], key: "G" } ]
        });
		this.addQuickCommand({
            id: 'gaoliang1-text',
            name: '*==多彩高亮1==*',
            callback: () => this.转换高亮1()
        });
		this.addQuickCommand({
            id: 'gaoliang2-text',
            name: '**==多彩高亮2==**',
            callback: () => this.转换高亮2()
        });
		this.addQuickCommand({
            id: 'gaoliang3-text',
            name: '***==多彩高亮3==***',
            callback: () => this.转换高亮3()
        });
		this.addQuickCommand({
            id: 'tuhei-text',
            name: '==~~涂黑~~==',
            callback: () => this.转换涂黑()
        });
		this.addQuickCommand({
            id: 'tucai-text',
            name: '*==~~涂彩~~==*',
            callback: () => this.转换涂彩()
        });
		this.addQuickCommand({
            id: 'wakong-text',
            name: '*~~挖空~~*',
            callback: () => this.转换挖空()
        });
        /**/
        this.addQuickCommand({
            id: 'xieti-format',
            name: '*斜体*格式刷',
            callback: () => this.斜体格式刷(),
            hotkeys: [{ modifiers: ["Alt","Shift"], key: "X" } ]
        });
        this.addQuickCommand({
            id: 'shanchu-format',
            name: '~~删除线~~格式刷',
            callback: () => this.删除线格式刷(),
            hotkeys: [{ modifiers: ["Alt","Shift"], key: "S" } ]
        });
        this.addQuickCommand({
            id: 'xiahua-format',
            name: '_下划线_格式刷',
            callback: () => this.下划线格式刷(),
            hotkeys: [{ modifiers: ["Alt","Shift"], key: "H" } ]
        });
        this.addQuickCommand({
            id: 'xiahua-text',
            name: '_下划线_',
            callback: () => this.转换下划线(),
            hotkeys: [{ modifiers: ["Alt"], key: "H" } ]
        });

        this.addQuickCommand({
            id: 'add-langxian',
            name: '~~~三浪线~~~',
            callback: () => this.转换三浪线()
        });
        this.addQuickCommand({
            id: 'internal-hyper',
            name: '[[]]转为[]()',
            callback: () => this.内链转为超链接()
        });
        this.addQuickCommand({
            id: 'hyper-internal',
            name: '[]()转为[[]]',
            callback: () => this.超链接转为内链()
        });
        this.addQuickCommand({
            id: 'clear-link',
            name: '去除超链接语法()',
            callback: () => this.去除超链接语法()
        });

        this.addQuickCommand({
            id: 'common-text',
            name: '转换无语法文本',
            callback: () => this.转换无语法文本(),
            hotkeys: [{ modifiers: ["Mod","Alt"],key: "Z"}]
        });
        this.addQuickCommand({
            id: 'copy-text',
            name: '获取无语法文本',
            callback: () => this.获取无语法文本(),
            hotkeys: [{ modifiers: ["Mod","Alt"],key: "C"}]
        });

        /*this.addQuickCommand({
            id: 'format-up',
            name: '上标格式刷',
            callback: () => this.上标格式刷()
        });*/
        this.addQuickCommand({
            id: 'add-up',
            name: '上标语法',
            callback: () => this.转换上标()
        });

        /*this.addQuickCommand({
            id: 'format-ub',
            name: '下标格式刷',
            callback: () => this.下标格式刷()
        });*/
        this.addQuickCommand({
            id: 'add-ub',
            name: '下标语法',
            callback: () => this.转换下标()
        });

        this.addQuickCommand({
            id: 'text-Color1',
            name: '转换彩色文字1',
            callback: () => {
                this.settings.hColor = this.settings.hColor1;
                this.转换文字颜色();
            },
            hotkeys: [{ modifiers: ["Mod","Shift"], key: "1" } ]
        });
        this.addQuickCommand({
            id: 'text-Color2',
            name: '转换彩色文字2',
            callback: () => {
                this.settings.hColor = this.settings.hColor2;
                this.转换文字颜色();
            },
            hotkeys: [{ modifiers: ["Mod","Shift"], key: "2" } ]
        });
        this.addQuickCommand({
            id: 'text-Color3',
            name: '转换彩色文字3',
            callback: () => {
                this.settings.hColor = this.settings.hColor3;
                this.转换文字颜色();
            },
            hotkeys: [{ modifiers: ["Mod","Shift"], key: "3" } ]
        });
        this.addQuickCommand({
            id: 'text-Color4',
            name: '转换彩色文字4',
            callback: () => {
                this.settings.hColor = this.settings.hColor4;
                this.转换文字颜色();
            },
            hotkeys: [{ modifiers: ["Mod","Shift"], key: "4" } ]
        });
        this.addQuickCommand({
            id: 'text-Color5',
            name: '转换彩色文字5',
            callback: () => {
                this.settings.hColor = this.settings.hColor5;
                this.转换文字颜色();
            },
            hotkeys: [{ modifiers: ["Mod","Shift"], key: "5" } ]
        });
        this.addQuickCommand({
            id: 'text-background1',
            name: '转换彩色背景1',
            callback: () => {
                this.settings.bColor = this.settings.bColor1;
                this.转换背景颜色();
            },
            hotkeys: [{ modifiers: ["Mod","Alt"], key: "1" } ]
        });
        this.addQuickCommand({
            id: 'text-background2',
            name: '转换彩色背景2',
            callback: () => {
                this.settings.bColor = this.settings.bColor2;
                this.转换背景颜色();
            },
            hotkeys: [{ modifiers: ["Mod","Alt"], key: "2" } ]
        });
        this.addQuickCommand({
            id: 'text-background3',
            name: '转换彩色背景3',
            callback: () => {
                this.settings.bColor = this.settings.bColor3;
                this.转换背景颜色();
            },
            hotkeys: [{ modifiers: ["Mod","Alt"], key: "3" } ]
        });
        this.addQuickCommand({
            id: 'text-background4',
            name: '转换彩色背景4',
            callback: () => {
                this.settings.bColor = this.settings.bColor4;
                this.转换背景颜色();
            },
            hotkeys: [{ modifiers: ["Mod","Alt"], key: "4" } ]
        });
        this.addQuickCommand({
            id: 'text-background5',
            name: '转换彩色背景5',
            callback: () => {
                this.settings.bColor = this.settings.bColor5;
                this.转换背景颜色();
            },
            hotkeys: [{ modifiers: ["Mod","Alt"], key: "5" } ]
        });

        this.addQuickCommand({
            id: 'add-todo',
            name: '转换待办状态',
            callback: () => this.转换待办列表()
        });

        this.addQuickCommand({
            id: 'sum-time',
            name: '合计任务用时',
            callback: () => this.合计任务用时()
        });
        this.addQuickCommand({
            id: 'add-todoTime',
            name: '标记完成及时间',
            callback: () => this.标记完成及时间()
        });
        this.addQuickCommand({
            id: 'add-tiankong',
            name: '填空{{c*::选文}}',
            callback: () => this.转换填空()
        });

        this.addQuickCommand({
            id: 'list-mermaid',
            name: '列表转为图示',
            callback: () => this.列表转为图示()
        });
        this.addQuickCommand({
            id: 'file-path',
            name: '转换路径',
            callback: () => this.转换路径()
        });
        this.addQuickCommand({
            id: 'text-line',
            name: '拆分多行',
            callback: () => this.拆分多行()
        });
        this.addQuickCommand({
            id: 'jian-fan',
            name: '简体转繁',
            callback: () => this.简体转繁()
        });
        this.addQuickCommand({
            id: 'fan-jian',
            name: '繁体转简',
            callback: () => this.繁体转简()
        });
        this.addQuickCommand({
            id: 'yinhao-yinhao',
            name: '转换引号',
            callback: () => this.转换引号()
        });
        /*
        this.addQuickCommand({
            id: 'add-kh1',
            name: '【选文】',
            callback: () => this.括选文本1()
        });
        this.addQuickCommand({
            id: 'add-kh2',
            name: '（选文）',
            callback: () => this.括选文本2()
        });
        this.addQuickCommand({
            id: 'add-kh3',
            name: '「选文」',
            callback: () => this.括选文本3()
        });
        this.addQuickCommand({
            id: 'add-kh4',
            name: '《选文》',
            callback: () => this.括选文本4()
        });
        */
        this.addQuickCommand({
            id: 'paste-text',
            name: '智能粘贴',
            callback: () => this.智能粘贴(),
            hotkeys: [{ modifiers: ["Mod","Alt"], key: "V" } ]
        });
        this.addQuickCommand({
            id: 'paste-picText',
            name: '图文粘贴',
            callback: () => this.图文粘贴()
        });
        this.addQuickCommand({
            id: 'jisuan-form',
            name: '计算所选结果',
            callback: () => this.计算所选结果(),
            hotkeys: [{ modifiers: [], key: "F9" } ]
        });
        this.addQuickCommand({
            id: 'edit-intext',
            name: '修复外来文本',
            callback: () => this.修复外来文本()
        });
        this.addQuickCommand({
            id: 'edit-biaodian',
            name: '修复错误标点',
            callback: () => this.修复错误标点()
        });
        this.addQuickCommand({
            id: 'edit-yufa',
            name: '修复错误语法',
            callback: () => this.修复错误语法()
        });
        this.addQuickCommand({
            id: 'edit-duanhang',
            name: '修复意外断行',
            callback: () => this.修复意外断行()
        });
        this.addQuickCommand({
            id: 'search-text',
            name: '搜索当前文本',
            callback: () => this.搜索当前文本()
        });
        this.addQuickCommand({
            id: 'old-Cursor',
            name: '上次光标',
            callback: () => this.上次光标()
        });
        this.addQuickCommand({
            id: 'parent-biaozhu',
            name: '光标向上跳转',
            callback: () => this.光标跳转("上")
        });
        this.addQuickCommand({
            id: 'next-biaozhu',
            name: '光标向下跳转',
            callback: () => this.光标跳转("下")
        });

        this.addQuickCommand({
            id: 'Selection-text',
            name: '选择当前整段',
            callback: () => this.选择当前整段()
        });
        this.addQuickCommand({
            id: 'Selection-juzi',
            name: '选择当前整句',
            callback: () => this.选择当前整句()
        });
        this.addQuickCommand({
            id: 'Selection-markdown',
            name: '选择当前语法',
            callback: () => this.选择当前语法()
        });
        this.addQuickCommand({
            id: 'copy-search-results',
            name: '获取搜索结果',
            callback: () => this.获取搜索结果()
        });
        this.addQuickCommand({
            id: 'tiqu-text',
            name: '获取标注文本',
            callback: () => this.获取标注文本()
        });
        this.addQuickCommand({
            id: 'modify-fileName',
            name: '指定当前文件名',
            callback: () => this.指定当前文件名()
        });
        this.addQuickCommand({
            id: 'iframe-URL',
            name: '嵌入当前网址页面',
            callback: () => this.嵌入当前网址页面()
        });

        this.addQuickCommand({
            id: 'sort-lines',
            name: '升序排列所选段落',
            callback: () => this.升序排列所选段落()
        });
        this.addQuickCommand({
            id: 'reverse-lines',
            name: '降序排列所选段落',
            callback: () => this.降序排列所选段落()
        });
        /*
        this.addQuickCommand({
            id: 'yinyong-list',
            name: '多行引用文本',
            callback: () => this.多行引用文本()
        });*/

        this.addQuickCommand({
            id: 'jiaId-lines',
            name: '添加段落编号',
            callback: () => this.添加段落编号()
        });
        this.addQuickCommand({
            id: 'jianId-lines',
            name: '去除段落编号',
            callback: () => this.去除段落编号()
        });

        this.addQuickCommand({
            id: 'zhe-level-lines',
            name: '折叠同级标题',
            callback: () => this.折叠同级标题(),
            hotkeys: [{ modifiers: ["Mod","Shift","Alt"], key: "D" } ]
        });

        this.addQuickCommand({
            id: 'promote-lines-level',
            name: '调高所有标题级别',
            callback: () => this.调高所有标题级别()
        });
        this.addQuickCommand({
            id: 'Down-lines-level',
            name: '调低所有标题级别',
            callback: () => this.调低所有标题级别()
        });
        /*
        this.addQuickCommand({
            id: 'promote-texts-level',
            name: '调高所选标题级别',
            callback: () => this.调高所选标题级别()
        });
        this.addQuickCommand({
            id: 'Down-texts-level',
            name: '调低所选标题级别',
            callback: () => this.调低所选标题级别()
        });
        */

        this.addQuickCommand({
            id: 'modify-link-showname',
            name: '修改内部链接的显示名称',
            callback: () => this.修改内部链接的显示名称(),
            hotkeys: [{ modifiers: ["Alt"], key: "\\" } ]
        });
        this.addQuickCommand({
            id: 'zhe-level2',
            name: '折叠二级标题',
            callback: () => this.折叠某级别标题(2),
            hotkeys: [{ modifiers: ["Shift"], key: "F2" } ]
        });
        this.addQuickCommand({
            id: 'zhe-level3',
            name: '折叠三级标题',
            callback: () => this.折叠某级别标题(3),
            hotkeys: [{ modifiers: ["Shift"], key: "F3" } ]
        });
        this.addQuickCommand({
            id: 'zhe-level4',
            name: '折叠四级标题',
            callback: () => this.折叠某级别标题(4),
            hotkeys: [{ modifiers: ["Shift"], key: "F4" } ]
        });
        this.addQuickCommand({
            id: 'zhe-level5',
            name: '折叠五级标题',
            callback: () => this.折叠某级别标题(5),
            hotkeys: [{ modifiers: ["Shift"], key: "F5" } ]
        });
        this.addQuickCommand({
            id: 'zhe-level6',
            name: '折叠六级标题',
            callback: () => this.折叠某级别标题(6),
            hotkeys: [{ modifiers: ["Shift"], key: "F6" } ]
        });

        this.addQuickCommand({
            id: 'add-Line0',
            name: '插入有效空行',
            callback: () => this.插入有效空行(),
            hotkeys: [{ modifiers: ["Mod","Shift","Alt"], key: "Enter" } ]
        });
        this.addQuickCommand({
            id: 'space-lines',
            name: '空格转为空行',
            callback: () => this.空格转为空行()
        });
        this.addQuickCommand({
            id: 'add-lines',
            name: '批量插入空行',
            callback: () => this.批量插入空行(),
            hotkeys: [{ modifiers: ["Mod","Shift"], key: "L" } ]
        });
        this.addQuickCommand({
            id: 'add-line1',
            name: '上方插入空行',
            callback: () => this.上方插入空行(),
        });
        this.addQuickCommand({
            id: 'add-line2',
            name: '下方插入空行',
            callback: () => this.下方插入空行()
        });
        this.addQuickCommand({
            id: 'del-lines',
            name: '批量去除空行',
            callback: () => this.批量去除空行(),
            hotkeys: [{ modifiers: ["Mod","Alt"], key: "l" } ]
        });
        this.addQuickCommand({
            id: 'add-twoSpace',
            name: '全文行首缩进/取消缩进',
            callback: () => this.全文首行缩进()
        });
        this.addQuickCommand({
            id: 'this-twoSpace',
            name: '当前行缩进/取消缩进两字符',
            callback: () => this.当前行缩进()
        });
        this.addQuickCommand({
            id: 'add-space2',
            name: '行首添加空格',
            callback: () => this.行首添加空格()
        });
        this.addQuickCommand({
            id: 'del-space1',
            name: '去除行首空格',
            callback: () => this.去除行首空格()
        });
        this.addQuickCommand({
            id: 'add-space1',
            name: '末尾追加空格',
            callback: () => this.末尾追加空格()
        });
        this.addQuickCommand({
            id: 'del-space2',
            name: '去除末尾空格',
            callback: () => this.去除末尾空格()
        });
        this.addQuickCommand({
            id: 'add-allSpspace',
            name: '添加间隔空格',
            callback: () => this.添加间隔空格()
        });
        this.addQuickCommand({
            id: 'del-allSpspace',
            name: '去除所有空格',
            callback: () => this.去除所有空格()
        });
        this.addQuickCommand({
            id: 'del-allZhushi',
            name: '去除所有注释',
            callback: () => this.去除所有注释()
        });


        this.addSettingTab(new QuickEditingSettingTab(this.app, this));
        this.app.workspace.onLayoutReady(() => {
            const setupWindow = activeWindow;
            const setupTimer = setupWindow.setTimeout(() => {
                if (this.settings.featureGroups.formatBrush) this.html语法格式刷();
                this.实用命令菜单();
            });
            this.register(() => setupWindow.clearTimeout(setupTimer));
            this.app.workspace.iterateAllLeaves((leaf) => {
                const win = leaf.view.containerEl.ownerDocument.defaultView;
                if (win && win !== activeWindow) this.registerPopoutEditorWindow(win);
            });
        });


        /*
        this.registerEvent(this.app.workspace.on('editor-change', function (file) {
            if (file) {

            };
        }));
        */

        this.registerDomEvent(document, 'mouseup', (e) => {
            历史光标=当前光标;
            if (!this.获取编辑器信息()) return;
            if(聚焦编辑){
                历史行文本 = 当前行文本;
                if(所选文本 == ""){
                    return
                }else{
                    if(isText){
                        this.转换无语法文本();
                    }else if(isbt1Txt){
                        this.标题语法("#")
                    }else if(isbt2Txt){
                        this.标题语法("##")
                    }else if(isCTxt){
                        this.转换文字颜色();
                    }else if(isBgC){
                        this.转换背景颜色();
                    }else if(isGLS){
                        this.转换高亮();
                    }else if(isGLS1){
                        this.转换高亮1();
					}else if(isGLS2){
                        this.转换高亮2();
                    }else if(isGLS3){
                        this.转换高亮3();
					}else if(isCTS){
                        this.转换粗体();
                    }else if(isXTS){
                        this.转换斜体();
                    }else if(isSCS){
                        this.转换删除线();
                    }else if(isXHS){
                        this.转换下划线();
                    }else if(isSB){
                        this.转换上标();
                    }else if(isXB){
                        this.转换下标();
                    }else if(isTHS){
                        this.转换涂黑();
                    }else if(isTCS){
                        this.转换涂彩();
                    }else if(isWKS){
                        this.转换挖空();
                    }
                    //else if(isShift){
                        //newNotice?.hide();
                        // newNotice = new obsidian.Notice(所选文本);
                    //};
                }

            }else if(isText||isCTxt ||isBgC ||isCTS || isGLS || isGLS1 ||isGLS2 ||isGLS3 ||isSB || isSCS || isXB || isXHS || isXTS || isTHS ||isTCS||isWKS || isbt2Txt || isbt1Txt){
                this.关闭格式刷();
                newNotice = new obsidian.Notice("已关闭格式刷！");
            }
        });

        this.registerDomEvent(document, 'keydown',(e) =>{
            if (!this.获取编辑器信息()) return;
            if(聚焦编辑){
                /*
                if(e.key == "Tab" && this.settings.isTab){
                    选至行首 = 选至行首.replace(/^(    |\t)/m,"");    //消除此次缩进效果
                    if(/^\s*([\-\*]+|`+|\|[^\|]|[\-\+]\s|\d+\.\s)/.test(选至行首)){
                        //当前为分隔行、代码块、列表行或表格行，则不在行内插入制表符
                    }else{
                        笔记全文.replaceRange(选至行首+"‌　　", {line:当前行号,ch:0}, 当前光标); //后补两个全角空格
                    }
                };

                if(e.key =="Tab" && isShift && this.settings.isTab){
                    笔记全文.replaceRange(选至行首.replace(/[‌　]+$/,""), {line:当前行号,ch:0}, 当前光标); //去除行首缩进
                    编辑模式.setCursor({line:当前行号,ch:0});
                }*/

                if(e.key =="Shift"){
                    isShift =true;
                }
                if(e.key == "Esc" || e.key == "Escape"){
                    if(isText||isCTxt ||isBgC ||isCTS || isGLS || isGLS1 ||isGLS2 ||isGLS3 ||isSB || isSCS || isXB || isXHS || isXTS || isTHS ||isTCS||isWKS || isbt2Txt || isbt1Txt){
                        this.关闭格式刷();
                        newNotice = new obsidian.Notice("已关闭格式刷！");
                    }
                }
            };
        });

        this.registerDomEvent(document, 'keyup',(e) =>{
            if (!this.获取编辑器信息()) return;
            if(聚焦编辑){

                if(e.key =="Shift"){
                    isShift = false;
                }
            };
        });

        /** 以下四个侦听函数备用 */

        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (file && file.path) {
                当前文件 = file;
                当前文件路径 = file.path;

                if(this.settings.version != 当前版本){
                    const noticeContent = createFragment();
                    noticeContent.createEl("p").innerHTML = "<b>欢迎使用 Quick Editing！</b>";
                    noticeContent.createEl("p").innerHTML = 功能更新;
                    noticeContent.createEl("button").innerHTML = 宣传页面;
                    noticeContent.createEl("p").innerHTML = '点击此处 可关闭提示窗口......';
                    new obsidian.Notice(noticeContent, 0);
                    this.settings.version = 当前版本;
                    this.saveSettings();
                };
                //this.显示写作进度();
            }
        }));

        /*
        this.registerEvent(this.app.vault.on('delete', (file) => {
            if (file && file.path) {
                this.saveSettings();
            }
        }));

        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (file && file.path) {
                this.saveSettings();
            }
        }));

        this.registerCodeMirror((cm) => {
            let cmEditor = cm;
            let currentExtraKeys = cmEditor.getOption('extraKeys');
            let moreKeys = {
                'Enter': (cm) => {
                    编辑模式 = this.获取编辑模式 ();
                    当前光标 = 编辑模式.getCursor();
                }
            };
        });
        */
    };



    显示写作进度(){
        if (!this.获取编辑器信息()) return;
        if(this.settings.isShowNum){
            let maxTry = this.settings.maxTry;
            let 进度 = Math.round(笔记正文.length/maxTry*100)+"% → "+maxTry +"字";
            //console.log(maxTry+" "+进度);
            this.footnoteStatusBar.setText(进度);
        }
    }

    打开设置(提示文字 = "请在左侧选择「Quick Editing」") {
        const opened = executeCoreCommand(this.app, "app:open-settings");
        if (!opened) {
            new obsidian.Notice("无法打开设置，请手动进入 Obsidian 设置");
            return;
        }
        new obsidian.Notice(提示文字);
    }

    async 复制插件目录路径() {
        const pluginDir = this.manifest.dir ?? obsidian.normalizePath(
            `${this.app.vault.configDir}/plugins/${this.manifest.id}`,
        );
        try {
            await navigator.clipboard.writeText(pluginDir);
            new obsidian.Notice(`插件目录路径已复制：${pluginDir}`);
        } catch (error) {
            console.error("Quick Editing：复制插件目录路径失败", error);
            new obsidian.Notice(`插件目录：${pluginDir}`);
        }
    }

    实用命令菜单() {
        const statusBarIcon = this.addStatusBarItem();
        statusBarIcon.addClass("quick-editing-statusbar-button");
        obsidian.addIcon("md语法图标", 全局命令图标);
        obsidian.setIcon(statusBarIcon, "md语法图标");
        this.registerDomEvent(statusBarIcon, "click", (e) => {
            const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
            if (!activeView) return;
		    if(activeView.getMode() === "preview"){
                void this.设置Markdown模式(activeView, "source");
            };

            const menu = obsidian.Menu.forEvent(e);

            menu.addItem((item) => {
                item.setTitle("设置插件");
                item.setIcon("gear");
                item.onClick(() => this.打开设置());
            });
            menu.addItem((item) => {
                item.setTitle("复制插件目录路径");
                item.setIcon("copy");
                item.onClick(() => void this.复制插件目录路径());
            });
            menu.addItem((item) => {
                item.setTitle("设置快捷键");
                item.setIcon("gear");
                item.onClick(() => this.打开设置("请选择「快捷键」，然后搜索「Quick Editing」"));
            });
            menu.addItem((item) => {
                item.setTitle("去除所有空格");
                item.setIcon("bracket-glyph");
                item.onClick(() =>this.去除所有空格());
            });
            menu.addItem((item) => {
                item.setTitle("添加间隔空格");
                item.setIcon("bracket-glyph");
                item.onClick(() =>this.添加间隔空格());
            });
            menu.addItem((item) => {
                item.setTitle("全文首行缩进");
                item.setIcon("indent-glyph");
                item.onClick(() =>this.全文首行缩进());
            });
            menu.addItem((item) => {
                item.setTitle("批量去除空行");
                item.setIcon("expand-vertically");
                item.onClick(() =>this.批量去除空行());
            });
            menu.addItem((item) => {
                item.setTitle("批量插入空行");
                item.setIcon("expand-vertically");
                item.onClick(() =>this.批量插入空行());
            });
            menu.addItem((item) => {
                item.setTitle("折叠同级标题");
                item.setIcon("double-up-arrow-glyph");
                item.onClick(() =>this.折叠同级标题());
            });
            menu.addItem((item) => {
                item.setTitle("提升多个标题等级");
                item.setIcon("double-up-arrow-glyph");
                item.onClick(() =>this.调高所有标题级别());
            });
            menu.addItem((item) => {
                item.setTitle("下调多个标题等级");
                item.setIcon("double-down-arrow-glyph");
                item.onClick(() =>this.调低所有标题级别());
            });
            menu.addItem((item) => {
                item.setTitle("嵌入当前网址");
                item.setIcon("link");
                item.onClick(() =>this.嵌入当前网址页面());
            });
            menu.addItem((item) => {
                item.setTitle("获取搜索结果");
                item.setIcon("link");
                item.onClick(() =>this.获取搜索结果());
            });
            menu.addItem((item) => {
                item.setTitle("获取当前字数");
                item.setIcon("info");
                item.onClick(() =>this.获取当前字数());
            });
            menu.addItem((item) => {
                item.setTitle("自动设置标题");
                item.setIcon("heading-glyph");
                item.onClick(() =>this.自动设置标题());
            });
            menu.addItem((item) => {
                item.setTitle("列表转为图示");
                item.setIcon("dot-network");
                item.onClick(() =>this.列表转为图示());
            });
            menu.addItem((item) => {
                item.setTitle("修复外来文本");
                item.setIcon("indent-glyph");
                item.onClick(() =>this.修复外来文本());
            });
            menu.addItem((item) => {
                item.setTitle("修复错误语法");
                item.setIcon("check-small");
                item.onClick(() =>this.修复错误语法());
            });
            menu.addItem((item) => {
                item.setTitle("修复意外断行");
                item.setIcon("indent-glyph");
                item.onClick(() =>this.修复意外断行());
            });
            menu.addItem((item) => {
                item.setTitle("转换潜在链接");
                item.setIcon("broken-link");
                item.onClick(() =>this.转换潜在链接());
            });
            menu.showAtMouseEvent(e);
        });
    }


    html语法格式刷() {
        const statusBarIcon = this.addStatusBarItem();

        statusBarIcon.addClass("quick-editing-format-brush-button");
        obsidian.addIcon("格式刷图标", 格式刷图标);
        obsidian.addIcon("普通格式刷", 普通格式刷);
        obsidian.setIcon(statusBarIcon, "格式刷图标");

        this.registerDomEvent(statusBarIcon, "click", (e) => {
            const 格式刷1 ='<svg t="1650117667147" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="120" height="120"><path d="M409.856 331.9296l103.1936-103.168 307.712 307.712-103.168 103.168z" fill="#777677" p-id="12960"></path><path d="M384 358.4s-153.6 128-256 99.84c23.04 38.4 53.76 76.8 51.2 79.36 79.36 17.92 204.8-51.2 204.8-51.2l25.6 25.6s-133.12 102.4-204.8 76.8c66.56 99.84 212.48 225.28 256 256 97.28 0 230.4-179.2 230.4-179.2L384 358.4z" fill="'+this.settings.bColor1+'" p-id="12961"></path><path d="M641.3568 306.9952l153.856-153.856 103.1936 103.168-153.856 153.856z" fill="#777677" p-id="12962"></path></svg>';
            const 格式刷2 ='<svg t="1650117667147" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="120" height="120"><path d="M409.856 331.9296l103.1936-103.168 307.712 307.712-103.168 103.168z" fill="#777677" p-id="12960"></path><path d="M384 358.4s-153.6 128-256 99.84c23.04 38.4 53.76 76.8 51.2 79.36 79.36 17.92 204.8-51.2 204.8-51.2l25.6 25.6s-133.12 102.4-204.8 76.8c66.56 99.84 212.48 225.28 256 256 97.28 0 230.4-179.2 230.4-179.2L384 358.4z" fill="'+this.settings.bColor2+'" p-id="12961"></path><path d="M641.3568 306.9952l153.856-153.856 103.1936 103.168-153.856 153.856z" fill="#777677" p-id="12962"></path></svg>';
            const 格式刷3 ='<svg t="1650117667147" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="120" height="120"><path d="M409.856 331.9296l103.1936-103.168 307.712 307.712-103.168 103.168z" fill="#777677" p-id="12960"></path><path d="M384 358.4s-153.6 128-256 99.84c23.04 38.4 53.76 76.8 51.2 79.36 79.36 17.92 204.8-51.2 204.8-51.2l25.6 25.6s-133.12 102.4-204.8 76.8c66.56 99.84 212.48 225.28 256 256 97.28 0 230.4-179.2 230.4-179.2L384 358.4z" fill="'+this.settings.bColor3+'" p-id="12961"></path><path d="M641.3568 306.9952l153.856-153.856 103.1936 103.168-153.856 153.856z" fill="#777677" p-id="12962"></path></svg>';
            const 格式刷4 ='<svg t="1650117667147" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="120" height="120"><path d="M409.856 331.9296l103.1936-103.168 307.712 307.712-103.168 103.168z" fill="#777677" p-id="12960"></path><path d="M384 358.4s-153.6 128-256 99.84c23.04 38.4 53.76 76.8 51.2 79.36 79.36 17.92 204.8-51.2 204.8-51.2l25.6 25.6s-133.12 102.4-204.8 76.8c66.56 99.84 212.48 225.28 256 256 97.28 0 230.4-179.2 230.4-179.2L384 358.4z" fill="'+this.settings.bColor4+'" p-id="12961"></path><path d="M641.3568 306.9952l153.856-153.856 103.1936 103.168-153.856 153.856z" fill="#777677" p-id="12962"></path></svg>';
            const 格式刷5 ='<svg t="1650117667147" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12959" width="120" height="120"><path d="M409.856 331.9296l103.1936-103.168 307.712 307.712-103.168 103.168z" fill="#777677" p-id="12960"></path><path d="M384 358.4s-153.6 128-256 99.84c23.04 38.4 53.76 76.8 51.2 79.36 79.36 17.92 204.8-51.2 204.8-51.2l25.6 25.6s-133.12 102.4-204.8 76.8c66.56 99.84 212.48 225.28 256 256 97.28 0 230.4-179.2 230.4-179.2L384 358.4z" fill="'+this.settings.bColor5+'" p-id="12961"></path><path d="M641.3568 306.9952l153.856-153.856 103.1936 103.168-153.856 153.856z" fill="#777677" p-id="12962"></path></svg>';

            const 文本刷1 ='<svg t="1650187348745" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="41653" ><path d="M126.656 832c0-35.2 28.8-64 64-64H832c35.2 0 64 28.8 64 64s-28.8 64-64 64H190.656c-35.2 0-64-28.8-64-64z" fill="'+this.settings.hColor1+'" p-id="41654"></path><path d="M587.2 151.936C582.208 138.752 567.04 128 553.472 128H470.528a39.232 39.232 0 0 0-33.792 23.936l-201.024 528.128c-4.992 13.184 2.432 23.936 16.512 23.936h85.76c14.08 0 29.632-10.816 34.496-24l29.632-80A39.616 39.616 0 0 1 436.608 576h150.784c14.08 0 29.632 10.816 34.496 24l29.632 80a39.616 39.616 0 0 0 34.496 24h85.76c14.08 0 21.504-10.752 16.512-23.936L587.2 151.936zM502.912 338.048c4.992-13.184 13.184-13.184 18.176 0l32.768 86.016c4.992 13.184-2.432 23.936-16.512 23.936h-50.688c-14.08 0-21.504-10.752-16.512-23.936l32.768-86.016z" fill="#A5A6A7" p-id="41655"></path></svg>';
            const 文本刷2 ='<svg t="1650187348745" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="41653" ><path d="M126.656 832c0-35.2 28.8-64 64-64H832c35.2 0 64 28.8 64 64s-28.8 64-64 64H190.656c-35.2 0-64-28.8-64-64z" fill="'+this.settings.hColor2+'" p-id="41654"></path><path d="M587.2 151.936C582.208 138.752 567.04 128 553.472 128H470.528a39.232 39.232 0 0 0-33.792 23.936l-201.024 528.128c-4.992 13.184 2.432 23.936 16.512 23.936h85.76c14.08 0 29.632-10.816 34.496-24l29.632-80A39.616 39.616 0 0 1 436.608 576h150.784c14.08 0 29.632 10.816 34.496 24l29.632 80a39.616 39.616 0 0 0 34.496 24h85.76c14.08 0 21.504-10.752 16.512-23.936L587.2 151.936zM502.912 338.048c4.992-13.184 13.184-13.184 18.176 0l32.768 86.016c4.992 13.184-2.432 23.936-16.512 23.936h-50.688c-14.08 0-21.504-10.752-16.512-23.936l32.768-86.016z" fill="#A5A6A7" p-id="41655"></path></svg>';
            const 文本刷3 ='<svg t="1650187348745" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="41653" ><path d="M126.656 832c0-35.2 28.8-64 64-64H832c35.2 0 64 28.8 64 64s-28.8 64-64 64H190.656c-35.2 0-64-28.8-64-64z" fill="'+this.settings.hColor3+'" p-id="41654"></path><path d="M587.2 151.936C582.208 138.752 567.04 128 553.472 128H470.528a39.232 39.232 0 0 0-33.792 23.936l-201.024 528.128c-4.992 13.184 2.432 23.936 16.512 23.936h85.76c14.08 0 29.632-10.816 34.496-24l29.632-80A39.616 39.616 0 0 1 436.608 576h150.784c14.08 0 29.632 10.816 34.496 24l29.632 80a39.616 39.616 0 0 0 34.496 24h85.76c14.08 0 21.504-10.752 16.512-23.936L587.2 151.936zM502.912 338.048c4.992-13.184 13.184-13.184 18.176 0l32.768 86.016c4.992 13.184-2.432 23.936-16.512 23.936h-50.688c-14.08 0-21.504-10.752-16.512-23.936l32.768-86.016z" fill="#A5A6A7" p-id="41655"></path></svg>';
            const 文本刷4 ='<svg t="1650187348745" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="41653" ><path d="M126.656 832c0-35.2 28.8-64 64-64H832c35.2 0 64 28.8 64 64s-28.8 64-64 64H190.656c-35.2 0-64-28.8-64-64z" fill="'+this.settings.hColor4+'" p-id="41654"></path><path d="M587.2 151.936C582.208 138.752 567.04 128 553.472 128H470.528a39.232 39.232 0 0 0-33.792 23.936l-201.024 528.128c-4.992 13.184 2.432 23.936 16.512 23.936h85.76c14.08 0 29.632-10.816 34.496-24l29.632-80A39.616 39.616 0 0 1 436.608 576h150.784c14.08 0 29.632 10.816 34.496 24l29.632 80a39.616 39.616 0 0 0 34.496 24h85.76c14.08 0 21.504-10.752 16.512-23.936L587.2 151.936zM502.912 338.048c4.992-13.184 13.184-13.184 18.176 0l32.768 86.016c4.992 13.184-2.432 23.936-16.512 23.936h-50.688c-14.08 0-21.504-10.752-16.512-23.936l32.768-86.016z" fill="#A5A6A7" p-id="41655"></path></svg>';
            const 文本刷5 ='<svg t="1650187348745" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="41653" ><path d="M126.656 832c0-35.2 28.8-64 64-64H832c35.2 0 64 28.8 64 64s-28.8 64-64 64H190.656c-35.2 0-64-28.8-64-64z" fill="'+this.settings.hColor5+'" p-id="41654"></path><path d="M587.2 151.936C582.208 138.752 567.04 128 553.472 128H470.528a39.232 39.232 0 0 0-33.792 23.936l-201.024 528.128c-4.992 13.184 2.432 23.936 16.512 23.936h85.76c14.08 0 29.632-10.816 34.496-24l29.632-80A39.616 39.616 0 0 1 436.608 576h150.784c14.08 0 29.632 10.816 34.496 24l29.632 80a39.616 39.616 0 0 0 34.496 24h85.76c14.08 0 21.504-10.752 16.512-23.936L587.2 151.936zM502.912 338.048c4.992-13.184 13.184-13.184 18.176 0l32.768 86.016c4.992 13.184-2.432 23.936-16.512 23.936h-50.688c-14.08 0-21.504-10.752-16.512-23.936l32.768-86.016z" fill="#A5A6A7" p-id="41655"></path></svg>';


            obsidian.addIcon("格式刷1", 格式刷1);
            obsidian.addIcon("格式刷2", 格式刷2);
            obsidian.addIcon("格式刷3", 格式刷3);
            obsidian.addIcon("格式刷4", 格式刷4);
            obsidian.addIcon("格式刷5", 格式刷5);
            obsidian.addIcon("文本刷1", 文本刷1);
            obsidian.addIcon("文本刷2", 文本刷2);
            obsidian.addIcon("文本刷3", 文本刷3);
            obsidian.addIcon("文本刷4", 文本刷4);
            obsidian.addIcon("文本刷5", 文本刷5);
            const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
            if (!activeView) return;
		    if(activeView.getMode() === "preview"){
                void this.设置Markdown模式(activeView, "source");
               };
            if(isCTxt ||isBgC ||isCTS || isGLS ||isGLS1 ||isGLS2 ||isGLS3 || isSB || isSCS || isXB || isXHS || isXTS|| isTHS ||isTCS||isWKS){
                this.关闭格式刷();
                new obsidian.Notice("已关闭格式刷！");
            }

            const menu = obsidian.Menu.forEvent(e);

            menu.addItem((item) => {
                item.setTitle("设置插件");
                item.setIcon("gear");
                item.setSection("settings");
                item.onClick(() => this.打开设置());
            });
            menu.addItem((item) => {
                item.setTitle("设置快捷键");
                item.setIcon("gear");
                item.setSection("settings");
                item.onClick(() => this.打开设置("请选择「快捷键」，然后搜索「Quick Editing」"));
            });
            menu.addItem((item) => {
                item.setTitle("刷为一级标题");
                item.setIcon("普通格式刷");
                item.setSection("biaoti");
                item.onClick(() =>{
                    this.关闭格式刷();
                    isbt1Txt = true;
                    new obsidian.Notice("一级标题格式刷 已打开！")
                });
            });
            menu.addItem((item) => {
                item.setTitle("刷为二级标题");
                item.setIcon("普通格式刷");
                item.setSection("biaoti");
                item.onClick(() =>{
                    this.关闭格式刷();
                    isbt2Txt = true;
                    new obsidian.Notice("二级标题格式刷 已打开！")
                });
            });

            menu.addItem((item) => {
                item.setTitle("**粗体**");
                item.setIcon("普通格式刷");
                item.setSection("format");
                item.onClick(() =>this.粗体格式刷());
            });
            menu.addItem((item) => {
                item.setTitle("==高亮==");
                item.setIcon("普通格式刷");
                item.setSection("format");
                item.onClick(() =>this.高亮格式刷());
            });
            menu.addItem((item) => {
                item.setTitle("~~删除线~~");
                item.setIcon("普通格式刷");
                item.setSection("format");
                item.onClick(() =>this.删除线格式刷());
            });
            menu.addItem((item) => {
                item.setTitle(" *斜体* ");
                item.setIcon("普通格式刷");
                item.setSection("format");
                item.onClick(() =>this.斜体格式刷());
            });
            menu.addItem((item) => {
                item.setTitle(" 上标⁺⁻ⁿ ");
                item.setIcon("普通格式刷");
                item.setSection("format");
                item.onClick(() =>this.上标格式刷());
            });
            menu.addItem((item) => {
                item.setTitle(" 下标₁₂₃ ");
                item.setIcon("普通格式刷");
                item.setSection("format");
                item.onClick(() =>this.下标格式刷());
            });
            menu.addItem((item) => {
                item.setTitle("纯文本");
                item.setIcon("普通格式刷");
                item.setSection("format");
                item.onClick(() =>{
                    this.关闭格式刷();
                    isText = true;
                    new obsidian.Notice("纯文本格式刷 已打开！")
                });
            });

            /*
            menu.addItem((item) => {
                item.setTitle("关闭 格式刷");
                item.setIcon("cross");
                item.onClick(() =>{
                    this.关闭格式刷();
                    new obsidian.Notice("已关闭格式刷！");
                });
            });*/

            menu.addItem((item) => {
                item.setTitle("文本颜色1");
                //item.setIcon("文本刷1");
                item.setIcon("普通格式刷");
                item.setSection("fontcolor");
                item.onClick(() => this.彩字格式刷(this.settings.hColor1));
            });

            menu.addItem((item) => {
                item.setTitle("文本颜色2");
                //item.setIcon("文本刷2");
                item.setIcon("普通格式刷");
                item.setSection("fontcolor");
                item.onClick(() => this.彩字格式刷(this.settings.hColor2));
            });

            menu.addItem((item) => {
                item.setTitle("文本颜色3");
                //item.setIcon("文本刷3");
                item.setIcon("普通格式刷");
                item.setSection("fontcolor");
                item.onClick(() => this.彩字格式刷(this.settings.hColor3));
            });
            menu.addItem((item) => {
                item.setTitle("文本颜色4");
                //item.setIcon("文本刷4");
                item.setIcon("普通格式刷");
                item.setSection("fontcolor");
                item.onClick(() => this.彩字格式刷(this.settings.hColor4));
            });
            menu.addItem((item) => {
                item.setTitle("文本颜色5");
                //item.setIcon("文本刷5");
                item.setIcon("普通格式刷");
                item.setSection("fontcolor");
                item.onClick(() => this.彩字格式刷(this.settings.hColor5));
            });

            menu.addItem((item) => {
                item.setTitle("荧光笔1");
                //item.setIcon("格式刷1");
                item.setIcon("普通格式刷");
                item.setSection("highlight_html");
                item.onClick(() => this.彩底格式刷(this.settings.bColor1));
            });
            menu.addItem((item) => {
                item.setTitle("荧光笔2");
                //item.setIcon("格式刷2");
                item.setIcon("普通格式刷");
                item.setSection("highlight_html");
                item.onClick(() => this.彩底格式刷(this.settings.bColor2));
            });
            menu.addItem((item) => {
                item.setTitle("荧光笔3");
                //item.setIcon("格式刷3");
                item.setIcon("普通格式刷");
                item.setSection("highlight_html");
                item.onClick(() => this.彩底格式刷(this.settings.bColor3));
            });
            menu.addItem((item) => {
                item.setTitle("荧光笔4");
                //item.setIcon("格式刷4");
                item.setIcon("普通格式刷");
                item.setSection("highlight_html");
                item.onClick(() => this.彩底格式刷(this.settings.bColor4));
            });
            menu.addItem((item) => {
                item.setTitle("荧光笔5");
                //item.setIcon("格式刷5");
                item.setIcon("普通格式刷");
                item.setSection("highlight_html");
                item.onClick(() => this.彩底格式刷(this.settings.bColor5));
            });

            //如果Bt支持选项开启显示bt主题自带的语法效果
            if(this.settings.isBT)
            {
                menu.addItem((item) => {
                    item.setTitle("*==多彩高亮1==*");
                    item.setIcon("普通格式刷");
                    item.setSection("highlight");
                    item.onClick(() =>this.多彩高亮格式刷1());
                });
                menu.addItem((item) => {
                    item.setTitle("**==多彩高亮2==**");
                    item.setIcon("普通格式刷");
                    item.setSection("highlight");
                    item.onClick(() =>this.多彩高亮格式刷2());
                });
                menu.addItem((item) => {
                    item.setTitle("***==多彩高亮3==***");
                    item.setIcon("普通格式刷");
                    item.setSection("highlight");
                    item.onClick(() =>this.多彩高亮格式刷3());
                });
                menu.addItem((item) => {
                    item.setTitle("==~~涂黑~~==");
                    item.setIcon("普通格式刷");
                    item.setSection("highlight");
                    item.onClick(() =>this.涂黑格式刷());
                });
                menu.addItem((item) => {
                    item.setTitle("*==~~涂彩~~==*");
                    item.setIcon("普通格式刷");
                    item.setSection("highlight");
                    item.onClick(() =>this.涂彩格式刷());
                });
                menu.addItem((item) => {
                    item.setTitle("*~~挖空~~*");
                    item.setIcon("普通格式刷");
                    item.setSection("highlight");
                    item.onClick(() =>this.挖空格式刷());
                });
            }

            menu.showAtMouseEvent(e);
        });
    }


    onunload() {
        newNotice?.hide();
    }

    async loadSettings() {
        try {
            this.settings = sanitizeSettings(await this.loadData());
        } catch (error) {
            console.error("Quick Editing：读取设置失败，已回退默认设置", error);
            this.settings = sanitizeSettings(null);
            new obsidian.Notice("Quick Editing 设置读取失败，本次启动已使用默认设置");
        }
    }
    async saveSettings() {
        this.settings = sanitizeSettings(this.settings);
        await this.saveData(this.settings);
    }

    /** 以下为基础功能函数 */

    获取所选文本(): string {
        var cmEditor = this.获取编辑模式 ();
        if (!cmEditor) return '';
        if (cmEditor.getSelection() == "") {
            return "";
        } else {
            return cmEditor.getSelection();
        }
    };

    获取笔记正文(): string {
        var cmEditor = this.获取编辑模式 ();
        if (!cmEditor) return '';
        //console.log("笔记正文\n"+cmEditor.getValue())
        return cmEditor.getValue();
    };

    替换所选文本(lines: string) {
        var cmEditor = this.获取编辑模式 ();
        if(cmEditor == null){
            return;
        }else{
            cmEditor.replaceSelection(lines);
        };
    };

    替换笔记正文(lines: string) {
        var cmEditor = this.获取编辑模式 ();
        if(cmEditor == null){
            return;
        }else{
            cmEditor.setValue(lines);
        };
    };

    应用文本转换(
        transform: (value: string) => string,
        title = '全文转换',
        onApplied?: () => void,
    ) {
        if (!this.获取编辑器信息()) return;
        const editor = 编辑模式;
        const editorDocument = this.获取编辑器文档(editor);
        const source = editor.getValue();
        const hasSelection = editor.somethingSelected();
        let before = source;
        let after = '';
        let apply: () => void;

        if (hasSelection) {
            const from = editor.getCursor('from');
            const to = editor.getCursor('to');
            const fromOffset = editor.posToOffset(from);
            const toOffset = editor.posToOffset(to);
            before = source.slice(fromOffset, toOffset);
            after = transformMarkdownRangeOutsideProtected(source, fromOffset, toOffset, transform);
            apply = () => editor.transaction({ replaceSelection: after });
        } else {
            after = transformMarkdownOutsideProtected(source, transform);
            const lastLine = editor.lastLine();
            const end = { line: lastLine, ch: editor.getLine(lastLine).length };
            apply = () => editor.transaction({
                changes: [{ from: { line: 0, ch: 0 }, to: end, text: after }],
            });
        }

        const summary = summarizeTransformation(before, after);
        if (summary.estimatedChanges === 0) {
            this.在文档显示通知('没有发现需要修改的内容', 5_000, editorDocument);
            return;
        }
        const applyWithUndoNotice = () => {
            apply();
            onApplied?.();
            const fragment = editorDocument.createDocumentFragment();
            fragment.append(`已完成 ${title}，预计修改 ${summary.estimatedChanges} 处。`);
            const undoButton = fragment.createEl('button', { text: '撤销' });
            undoButton.addEventListener('click', () => editor.undo(), { once: true });
            this.在文档显示通知(fragment, 10_000, editorDocument);
        };
        if (!hasSelection && this.settings.previewFullDocumentChanges) {
            new TransformationPreviewModal(
                this.app,
                `${title}预览`,
                summary,
                applyWithUndoNotice,
            ).openInDocument(editorDocument);
            return;
        }
        applyWithUndoNotice();
    }

    获取编辑模式(): obsidian.Editor | undefined {
        return this.app.workspace.activeEditor?.editor;
    };

    async 设置Markdown模式(view: obsidian.MarkdownView, mode: 'source' | 'preview') {
        const viewState = view.leaf.getViewState();
        const state = viewState.state ?? {};
        await view.leaf.setViewState({
            ...viewState,
            state: {
                ...state,
                mode,
                ...(mode === "source" ? { source: state.source ?? false } : {}),
            },
        });
    }

    获取编辑器信息(): boolean {
        //初始信息获取，最基本函数
        const activeEditor = this.获取编辑模式();
        if (activeEditor == null) {
            聚焦编辑 = false;
            所选文本 = "";
            笔记正文 = "";
            编辑模式 = null as unknown as obsidian.Editor;
            笔记全文 = null as unknown as obsidian.Editor;
            return false;
        };
        编辑模式 = activeEditor;
        聚焦编辑 = 编辑模式.hasFocus();
        笔记全文 = 编辑模式.getDoc();   //此方法获取的笔记全文 是对象，不是文本
        //console.log("笔记全文\n"+笔记全文)
        笔记正文 = this.获取笔记正文(); //此处获取的是笔记内容的纯文本
        所选文本 = this.获取所选文本();
        当前光标 = 编辑模式.getCursor();
        当前行号 = 当前光标.line;
        当前行文本 = 编辑模式.getLine(当前行号);
        选至行首 = 编辑模式.getRange({line:当前行号,ch:0}, 当前光标);
        if(当前行文本!=""){
            选至行尾 = 编辑模式.getRange(当前光标,{line:当前行号,ch:当前行文本.length});
        }else{
            选至行尾 = 编辑模式.getRange(当前光标,{line:当前行号,ch:0});
        };

        末行行号 = 编辑模式.lastLine();
        末行文本 = 编辑模式.getLine(末行行号);
        选至文首 = 编辑模式.getRange({line:0,ch:0},当前光标);
        if(末行文本!=""){
            选至文末 = 编辑模式.getRange(当前光标,{line:末行行号,ch:末行文本.length});
        }else{
            选至文末 = 编辑模式.getRange(当前光标,{line:末行行号,ch:0});
        };
        return true;
    };

    /** 以下为自定义功能函数 */
    上次光标(){
        编辑模式.setCursor(历史光标);
    }

    光标跳转(方向: '上' | '下') {
        if (!this.获取编辑器信息()) return;
        //var 选择字数=0;
        var 表达式;
        if(编辑模式 == null){return;};
        //new obsidian.Notice(所选文本+"\n"+当前行文本);
        if(所选文本 == ""){
            var 标题式1 = /^\s*# [^#]+$/;
            var 标题式2 = /^\s*## [^#]+$/;
            var 标题式3 = /^\s*### [^#]+$/;
            var 标题式4 = /^\s*#### [^#]+$/;
            var 标题式5 = /^\s*##### [^#]+$/;
            var 标题式6 = /^\s*###### [^#]+$/;
            var 列表式1 = /^(\- [^\[]|\d+\. ).*$/;
            var 列表式2 = /^(\s{4}|\t)(\- [^\[]|\d+\. ).*$/;
            var 列表式3 = /^(\s{8}|\t\t)(\- [^\[]|\d+\. ).*$/;
            var 列表式4 = /^(\s{12}|\t\t\t)(\- [^\[]|\d+\. ).*$/;
            var 待办式 = /^\s*\- \[[^\[\]]] .*$/;
            var 代码式 = /^```[^`]*$/;
            var 引用式 = /^\>.*$/;
            if(标题式1.test(当前行文本)){
                表达式 = 标题式1;
            }if(标题式2.test(当前行文本)){
                表达式 = 标题式2;
            }if(标题式3.test(当前行文本)){
                表达式 = 标题式3;
            }if(标题式4.test(当前行文本)){
                表达式 = 标题式4;
            }if(标题式5.test(当前行文本)){
                表达式 = 标题式5;
            }if(标题式6.test(当前行文本)){
                表达式 = 标题式6;
            }else if(待办式.test(当前行文本)){
                表达式 = 待办式;
            }else if(列表式1.test(当前行文本)){
                表达式 = 列表式1;
            }else if(列表式2.test(当前行文本)){
                表达式 = 列表式2;
            }else if(列表式3.test(当前行文本)){
                表达式 = 列表式3;
            }else if(列表式4.test(当前行文本)){
                表达式 = 列表式4;
            }else if(代码式.test(当前行文本)){
                表达式 = 代码式;
            }else if(引用式.test(当前行文本)){
                表达式 = 引用式;
            }else{
                return;
            }
            console.log('表达式 '+表达式);
            //逐行判断是否符合指定表达式
            for (var i=1;i<=末行行号;i++){
                const 新行号 = 方向 === '下' ? 当前行号 + i : 当前行号 - i;
                if(新行号<0 || 新行号>末行行号){
                    return;
                }
                var 临时行文本 = 编辑模式.getLine(新行号);
                if(表达式.test(临时行文本)){
                    编辑模式.setCursor({line:新行号,ch:临时行文本.length});
                    break
                };
            };
        }else{
            var 加粗式 = /^\*\*[^\*]+\*\*$/;
            var 高亮式 = /^==[^=\n]+==$/;
            var 注释式 = /^%%[^%\n]*%%$/;
            var 删除式 = /^~~[^~]*~~$/;
            var 链接式 = /^\[\[[^\[\]]+\]\]$/;
            if(加粗式.test(所选文本)){
                表达式 = /\*\*[^\*]+\*\*/g;
            }else if(高亮式.test(所选文本)){
                表达式 = /==[^=]+==/g;
            }else if(注释式.test(所选文本)){
                表达式 = /%%[^%\n]*%%/g;
            }else if(删除式.test(所选文本)){
                表达式 = /~~[^~]*~~/g;
            }else if(链接式.test(所选文本)){
                表达式 = /\[\[[^\[\]]+\]\]/g;
            }else{
                表达式 = 所选文本;
            }
            const 匹配范围 = findAdjacentMatch(
                编辑模式.getValue(),
                编辑模式.posToOffset(编辑模式.getCursor("from")),
                编辑模式.posToOffset(编辑模式.getCursor("to")),
                表达式,
                方向,
            );
            if (!匹配范围) return;
            编辑模式.setSelection(
                编辑模式.offsetToPos(匹配范围.from),
                编辑模式.offsetToPos(匹配范围.to),
            );
        }
    }

    获取双窗视图() {
        const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
        let leftLeaf = this.dualLeftLeaf && markdownLeaves.includes(this.dualLeftLeaf)
            ? this.dualLeftLeaf
            : undefined;
        let rightLeaf = this.dualRightLeaf && markdownLeaves.includes(this.dualRightLeaf)
            ? this.dualRightLeaf
            : undefined;
        if (!leftLeaf || !rightLeaf) {
            const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
            leftLeaf = activeView?.leaf ?? markdownLeaves[0];
            rightLeaf = markdownLeaves.find((leaf) => leaf !== leftLeaf);
        }
        if (!(leftLeaf?.view instanceof obsidian.MarkdownView) ||
            !(rightLeaf?.view instanceof obsidian.MarkdownView)) return undefined;
        return { leftLeaf, rightLeaf, leftView: leftLeaf.view, rightView: rightLeaf.view };
    }

    async 开右窗口预览(){
        const leftView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!leftView?.file) return;
        const rightLeaf = this.app.workspace.getLeaf('split', 'vertical');
        await rightLeaf.openFile(leftView.file, { active: false, state: { mode: 'preview' } });
        this.dualLeftLeaf = leftView.leaf;
        this.dualRightLeaf = rightLeaf;
        this.app.workspace.setActiveLeaf(leftView.leaf, { focus: true });
    }

    滚动左窗(distance: number){
        const panes = this.获取双窗视图();
        if (!panes) {
            new obsidian.Notice("请先执行「开右窗口预览」");
            return;
        }
        const leftEditor = panes.leftView.editor;
        const rightEditor = panes.rightView.editor;
        const scrollTop = leftEditor.getScrollInfo().top;
        leftEditor.scrollTo(0, scrollTop + distance);
        rightEditor.setSelection({line:0,ch:0}, leftEditor.getCursor());
        rightEditor.exec("goRight");
        this.app.workspace.setActiveLeaf(panes.leftLeaf, { focus: true });
    }

    左窗向上滚动(){
        this.滚动左窗(-this.settings.maxScroll);
    }

    左窗向下滚动(){
        this.滚动左窗(this.settings.maxScroll);
    }

    关闭格式刷() {
        newNotice?.hide();
        //关闭所有格式刷变量
        isText = false; //纯文本
        isBgC = false;  //多彩背景刷
        isCTxt = false; //多彩文字刷
        isGLS =false;   //==普通高亮==
		isGLS1 =false;   ///*==多彩高亮==*
		isGLS2 =false;   ///**==多彩高亮==**
		isGLS3 =false;   ///***==多彩高亮==***
        isCTS =false;   //**粗体**
        isXTS = false;  //*斜体*
        isSCS = false;  //~~删除线~~
        isXHS = false;
        isSB = false;
        isXB = false;

		isTHS = false; //涂黑
		isTCS = false; //涂彩
		isWKS = false; //挖空

        isbt1Txt = false;
        isbt2Txt = false;
    };

    切换文件列表(_num: number) {
        if (!this.获取编辑器信息()) return;
        当前文件 = this.app.workspace.getActiveFile();
        if (!当前文件) return;
        当前文件路径 = 当前文件.path;
        var 父级文件夹 = 当前文件路径.replace(/[^\\\/]+$/,"");

        var 同级文件列表: obsidian.TFile[]=[];
        this.app.vault.getMarkdownFiles().map((file) => {
            if(file.path==父级文件夹+file.basename+".md"){
                同级文件列表.push(file);
            }
        });
        同级文件列表 = 同级文件列表.sort(function (str1, str2) {
            return str1.path.localeCompare(str2.path, 'zh');
            });
        //new obsidian.Notice(同级文件列表.join("\n"));
        var thisID = 同级文件列表.indexOf(当前文件)+_num;
        if(thisID>同级文件列表.length-1){
            thisID=0;
        }else if(thisID<0){
            thisID=同级文件列表.length-1;
        }
        var xinFile = 同级文件列表[thisID];
        //new obsidian.Notice(父级文件夹+" "+thisID+" "+xinFile);
        if (xinFile) void this.app.workspace.getLeaf(false).openFile(xinFile);
    };

    标签双链互转() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            return;
        };

        let tagReg = /(^|\s*)#([^#\s\/]+)(\s|[^\/]|\r*\n|$)/g;
        let linkReg = /\[\[([^\[\]]+)\]\]/g;
        if (tagReg.test(所选文本)) {
            所选文本 = 所选文本.replace(tagReg, "[[$2]]");
		}else if(linkReg.test(所选文本)){
			所选文本 = 所选文本.replace(linkReg, " #$1 ");
		}
        this.替换所选文本 (所选文本);
    };

    转换内部链接() {
        if (!this.获取编辑器信息()) return;
        if (所选文本 === '') {
            let lreg = /\[\[([^\[\]]*)$/;
            let rreg = /^([^\[\]]*)\]\]/;
            const leftMatch = 选至行首.match(lreg);
            const rightMatch = 选至行尾.match(rreg);
            if (leftMatch && rightMatch) {
                const 前文本 = leftMatch[0];
                const 后文本 = rightMatch[0];
                编辑模式.setSelection({line:当前光标.line,ch:Number(当前光标.ch-前文本.length)}, {line:当前光标.line,ch:Number(当前光标.ch+后文本.length)});
                所选文本 = 编辑模式.getRange({line:当前光标.line,ch:Number(当前光标.ch-前文本.length)}, {line:当前光标.line,ch:Number(当前光标.ch+后文本.length)});
            } else {
                this.替换所选文本('[[');
                return;
            }
        }

        const sourcePath = this.app.workspace.activeEditor?.file?.path ?? '';
        const services: InternalLinkServices = {
            resolveLink: (linkpath, path) => this.app.metadataCache.getFirstLinkpathDest(linkpath, path),
            resolveAlias: (alias) => this.app.vault.getMarkdownFiles().find((file) => {
                const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                const aliases = frontmatter?.aliases ?? frontmatter?.alias;
                const values = Array.isArray(aliases) ? aliases : aliases == null ? [] : [aliases];
                return frontmatter?.title === alias || values.some((value) => String(value) === alias);
            }) ?? null,
            generateLink: (file, path, subpath, alias) => this.app.fileManager.generateMarkdownLink(
                file,
                path,
                subpath,
                alias,
            ),
        };
        const converted = convertInternalLinkSelection(所选文本, sourcePath, services);
        this.替换所选文本(converted);
        new obsidian.Notice(converted.startsWith('[[') ? '已生成解析后的内部链接' : '已移除内部链接语法');
    };

    转换潜在链接() {
        if (!this.获取编辑器信息()) return;
        const activeFile = this.app.workspace.activeEditor?.file;
        const titles = this.settings.linkWords.trim() === ""
            ? this.app.vault.getMarkdownFiles()
                .filter((file) => file.path !== activeFile?.path)
                .map((file) => file.basename)
            : this.settings.linkWords.split(/\r?\n/);
        this.应用文本转换(
            (text) => linkPotentialTitles(text, titles).text,
            '转换潜在链接',
        );
    };

    转换同义链接() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            this.替换所选文本 ("[[");
            return;
        }
        var lNum = 所选文本.length +3
        var link = /[\"\|\[\]\?\\\*\<\>\/:\n]/g;	//是否包含[]()及标点符号
        if (link.test(所选文本)) {
            return;
		}else{
			所选文本 = "[[|" + 所选文本 + "]]";
		}
        this.替换所选文本 (所选文本);

        var i=0;
        while (i<lNum){
            编辑模式.exec("goLeft");
            i++;
        }
    };

    粗体格式刷() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isCTS){
                isCTS = false;
                this.关闭格式刷();
                new obsidian.Notice("已关闭粗体格式刷！");
            }else{
                this.关闭格式刷();
                isCTS = true;
                newNotice = new obsidian.Notice("**粗体格式刷** 已打开！\n首尾不要选中标点。",0);
            };
        };
    };

    转换粗体() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isGLS){
                isGLS = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭粗体格式刷！");
            }
            笔记全文.replaceRange("****", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else{
            var link = /.*(\<b\>|\*\*)([^\*]*)(\<\/b\>|\*\*).*/g;	//是否包含加粗符号
            var link1 = /^[^\*](\<\/?b\>|\*\*)[^\*]*$/;	//是否只包含一侧的**
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现==符号");
            }else if (link.test(所选文本)){
                所选文本 = 所选文本.replace(/(\<\/?b\>|\*\*)/g,"");    //new obsidian.Notice("成对出现**符号");
                this.替换所选文本 (所选文本);
            }else{
                if(/^\<.*\>$/.test(所选文本) || /[,\.?!，。、？！]$/.test(所选文本)){
                    所选文本 = 所选文本.replace(/^/,"<b>");
                    所选文本 = 所选文本.replace(/$/,"</b>");
                }else{
                    所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1**$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1**$2");
                    所选文本 = 所选文本.replace(/^\*\*\*\*$/mg,"");
                }
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }
    };

    高亮格式刷() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isGLS){
                this.关闭格式刷();
                new obsidian.Notice("已关闭高亮格式刷！");
            }else{
                this.关闭格式刷();
                isGLS = true;
                newNotice = new obsidian.Notice("==高亮格式刷== 已打开！",0);
            }
        }
    }
	多彩高亮格式刷1() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isGLS1){
                this.关闭格式刷();
                new obsidian.Notice("已关闭多彩高亮刷1！");
            }else{
                this.关闭格式刷();
                isGLS1 = true;
                newNotice = new obsidian.Notice("*==多彩高亮刷1==*  已打开！",0);
            }
        }
    }
	多彩高亮格式刷2() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isGLS2){
                this.关闭格式刷();
                new obsidian.Notice("已关闭彩高亮刷2！");
            }else{
                this.关闭格式刷();
                isGLS2 = true;
                newNotice = new obsidian.Notice("**==多彩高亮刷2==** 已打开！",0);
            }
        }
    }
	多彩高亮格式刷3() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isGLS3){
                this.关闭格式刷();
                new obsidian.Notice("已关闭多彩高亮刷3！");
            }else{
                this.关闭格式刷();
                isGLS3 = true;
                newNotice = new obsidian.Notice("***==多彩高亮刷3==*** 已打开！",0);
            }
        }
    }

	涂黑格式刷() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isTHS){
                this.关闭格式刷();
                new obsidian.Notice("已关闭涂黑格式刷！");
            }else{
                this.关闭格式刷();
                isTHS = true;
                newNotice = new obsidian.Notice("==~~涂黑~~==已打开！",0);
            }
        }
    }
	涂彩格式刷() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isTCS){
                this.关闭格式刷();
                new obsidian.Notice("已关闭涂彩格式刷！");
            }else{
                this.关闭格式刷();
                isTCS = true;
                newNotice = new obsidian.Notice("*==~~涂彩~~==* 已打开！",0);
            }
        }
    }
	挖空格式刷() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isWKS){
                this.关闭格式刷();
                new obsidian.Notice("已关闭挖空格式刷！");
            }else{
                this.关闭格式刷();
                isWKS = true;
                newNotice = new obsidian.Notice("*~~挖空~~* 已打开！",0);
            }
        }
    }


    转换高亮() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isGLS){
                isGLS = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭高亮格式刷！");
            }
            笔记全文.replaceRange("====", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else{
            var link = /==[^=]*==/;	//是否包含高亮符号
            var link1 = /^[^=]*==[^=]*$/;	//是否只包含一侧的==
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现==符号");
            }else if (link.test(所选文本)){
                所选文本 = 所选文本.replace(/==/g,"");    //new obsidian.Notice("成对出现==符号");
                this.替换所选文本 (所选文本);
            }else{
                所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1==$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1==$2");
                所选文本 = 所选文本.replace(/^====$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }
    };

    转换高亮1() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isGLS1){
                isGLS1 = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭高亮格式刷！");
            }
            笔记全文.replaceRange("*====*", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
			编辑模式.exec("goRight");
        }else{
            var link = /\*==[^=]*==\*/;	//是否包含高亮符号
            var link1 = /^[^=]*==[^=]*$/;	//是否只包含一侧的==
			var isbank =/[ ]$/; //末尾是否有空格
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现*==符号");
            }else if (link.test(所选文本)){
				if (isbank.test(所选文本))
				所选文本 = 所选文本.replace(/\*==|==\*/g,"");
				else
				所选文本 = 所选文本.replace(/\ *==|\*==|==\* |==\*/g,""); //new obsidian.Notice("出现*== 或者==*符号");
                this.替换所选文本 (所选文本);
            }else{
				if (isbank.test(所选文本))
				所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1*==$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1==*$2");
				else
                所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1 *==$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1==* $2");

                所选文本 = 所选文本.replace(/^\*====\*$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }
    };

    转换高亮2() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
             if(isGLS2){
                isGLS2 = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭高亮格式刷！");
            }
            笔记全文.replaceRange("**====**", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
			编辑模式.exec("goRight");
			编辑模式.exec("goRight");
        }else{
            var link = /\*\*==[^=]*==\*\*/;	//是否包含高亮符号
            var link1 = /^[^=]*==[^=]*$/;	//是否只包含一侧的==
			var isbank =/[ ]$/; //末尾是否有空格
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现**==符号");
            }else if (link.test(所选文本)){
				if (isbank.test(所选文本))
				所选文本 = 所选文本.replace(/\*\*==|==\*\*/g,"");
				else
				所选文本 = 所选文本.replace(/ \*\*==|\*\*==|==\*\* |==\*\*/g,""); //new obsidian.Notice("出现*== 或者==*符号");
                this.替换所选文本 (所选文本);
            }else{
				if (isbank.test(所选文本))
				所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1**==$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1==**$2");
				else
                所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1 **==$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1==** $2");

                所选文本 = 所选文本.replace(/^\*\*====\*\*$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }
    };

    转换高亮3() {
        if (!this.获取编辑器信息()) return;
         if(所选文本 == ""){
             if(isGLS2){
                isGLS2 = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭高亮格式刷！");
            }
            笔记全文.replaceRange("***====***", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
			编辑模式.exec("goRight");
			编辑模式.exec("goRight");
			编辑模式.exec("goRight");
        }else{
            var link = /\*\*==[^=]*==\*\*/;	//是否包含高亮符号
            var link1 = /^[^=]*==[^=]*$/;	//是否只包含一侧的==
			var isbank =/[ ]$/; //末尾是否有空格
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现**==符号");
            }else if (link.test(所选文本)){
				if (isbank.test(所选文本))
				所选文本 = 所选文本.replace(/\*\*\*==|==\*\*\*/g,"");
				else
				所选文本 = 所选文本.replace(/ \*\*\*==|\*\*\*==|==\*\*\* |==\*\*\*/g,""); //new obsidian.Notice("出现*== 或者==*符号");
                this.替换所选文本 (所选文本);
            }else{
				if (isbank.test(所选文本))
				所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1***==$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1==***$2");
				else
                所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1 ***==$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1==*** $2");

                所选文本 = 所选文本.replace(/^\*\*\*====\*\*\*$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }
    };

	 转换涂黑() {
        if (!this.获取编辑器信息()) return;
         if(所选文本 == ""){
             if(isTHS){
                isTHS = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭涂黑格式刷！");
            }
            笔记全文.replaceRange("==~~~~==", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
			编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else{
            var link = /==~~[^~=]*~~==/;	//是否包含高亮符号
            var link1 = /^[^=]*==[^=]*$/;	//是否只包含一侧的==
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现**==符号");
            }else if (link.test(所选文本)){
				所选文本 = 所选文本.replace(/==~~|==~~ |~~==/g,""); //new obsidian.Notice("出现*== 或者==*符号");
                this.替换所选文本 (所选文本);
            }else{

                所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1==~~$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1~~==$2");
                所选文本 = 所选文本.replace(/^==~~~~==$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }
    };
	 转换涂彩() {
        if (!this.获取编辑器信息()) return;
         if(所选文本 == ""){
             if(isTCS){
                isTCS = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭涂彩格式刷！");
            }
            笔记全文.replaceRange(" *==~~~~==* ", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
			编辑模式.exec("goRight");
            编辑模式.exec("goRight");
			编辑模式.exec("goRight");
			编辑模式.exec("goRight");
        }else{
            var link = /\*==~~[^=]*~~==\*/;	//是否包含高亮符号
            var link1 = /^[^=]*==[^=]*$/;	//是否只包含一侧的==
			var isbank =/[ ]$/; //末尾是否有空格
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现**==符号");
            }else if (link.test(所选文本)){
				if (isbank.test(所选文本))
				所选文本 = 所选文本.replace(/\*==~~|~~==\*/g,"");
				else
				所选文本 = 所选文本.replace(/\*==~~| \*==~~|~~==\* |~~==\*/g,""); //new obsidian.Notice("出现*== 或者==*符号");
                this.替换所选文本 (所选文本);
            }else{
				if (isbank.test(所选文本))
				所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1*==~~$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1~~==*$2");
				else
                所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1 *==~~$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1~~==* $2");

                所选文本 = 所选文本.replace(/^\*==~~~~==\*$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }
    };
	 转换挖空() {
        if (!this.获取编辑器信息()) return;
         if(所选文本 == ""){
             if(isWKS){
                isWKS = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭挖空格式刷！");
            }
            笔记全文.replaceRange(" *~~~~* ", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
			编辑模式.exec("goRight");
        }else{
            var link = /\*~~[^~]*~~\*/;	//是否包含高亮符号
            var link1 = /^[^~]*~~[^~]*$/;	//是否只包含一侧的==
			var isbank =/[ ]$/; //末尾是否有空格
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现**==符号");
            }else if (link.test(所选文本)){
				if (isbank.test(所选文本))
				所选文本 = 所选文本.replace(/\*~~|~~\*/g,"");
				else
				所选文本 = 所选文本.replace(/ \*~~|\*~~|~~\* |~~\*/g,""); //new obsidian.Notice("出现*== 或者==*符号");
                this.替换所选文本 (所选文本);
            }else{
				if (isbank.test(所选文本))
				所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1*~~$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1~~*$2");
				else
                所选文本 = 所选文本.replace(/^([\t\s]*)([^\t\s])/mg,"$1 *~~$2").replace(/([^\t\s])([\t\s]*)$/mg,"$1~~* $2");

                所选文本 = 所选文本.replace(/^\*~~~~\*$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }
    };

    斜体格式刷(){
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isXTS){
                this.关闭格式刷();
                new obsidian.Notice("已关闭格式刷！");
            }else{
                this.关闭格式刷();
                isXTS = true;
                newNotice = new obsidian.Notice("*斜体格式刷* 已打开！\n首尾不要选中标点。",0);
            }
        };
    };
    转换斜体() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isXTS){
                isXTS = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭斜体格式刷！");
            }
            笔记全文.replaceRange("**", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else{
            var link = /\*[^\*]*\*/;	//是否包含高亮符号
            var link1 = /^[^\*]*\*[^\*]*$/;	//是否只包含一侧的\*
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现\*符号");
            }else if (link.test(所选文本)){
                所选文本 = 所选文本.replace(/\*/g,"");    //new obsidian.Notice("成对出现\*符号");
                this.替换所选文本 (所选文本);
            }else{
                所选文本 = 所选文本.replace(/^(.*)$/mg,"\*$1\*");
                所选文本 = 所选文本.replace(/^\*\*$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }
    };

    删除线格式刷(){
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isSCS){
                this.关闭格式刷();
                new obsidian.Notice("已关闭删除线格式刷！");
            }else{
                this.关闭格式刷();
                isSCS = true;
                newNotice = new obsidian.Notice("~~删除线格式刷~~ 已打开！",0);
            }
        }
    };
    转换删除线() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isSCS){
                isSCS = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭删除线格式刷！");
            }
            笔记全文.replaceRange("~~~~", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else{
            var link = /~~[^~]*~~/;	//是否包含删除线符号
            var link1 = /^[^~]*~~[^~]*$/;	//是否只包含一侧的~~
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现~~符号");
            }else if (link.test(所选文本)){
                所选文本 = 所选文本.replace(/~~/g,"");    //new obsidian.Notice("成对出现~~符号");
                this.替换所选文本 (所选文本);
            }else{
                所选文本 = 所选文本.replace(/^(.*)$/mg,"~~$1~~");
                所选文本 = 所选文本.replace(/^~~~~$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }

    };

    下划线格式刷(){
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isXHS){
                this.关闭格式刷();
                new obsidian.Notice("已关闭下划线格式刷！");
            }else{
                this.关闭格式刷();
                isXHS = true;
                newNotice = new obsidian.Notice("<u>下划线格式刷</u> 已打开！",0);
            }
        }
    };

    转换下划线() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isXHS){
                isXHS = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭下划线格式刷！");
            }
            笔记全文.replaceRange("<u></u>", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else{
            var link = /\<u\>([^\<\>]*)\<\/u\>/mg;	//是否包含下划符号
            var link1 = /^[^\<\>]*\<\/?u\>[^\<\>]*$/;	//是否只包含一侧的<>
            if (link1.test(所选文本)){
                return; //new obsidian.Notice("只有一侧出现<>符号");
            }else if (link.test(所选文本)){
                所选文本 = 所选文本.replace(link,"$1");
                this.替换所选文本 (所选文本);
            }else{
                所选文本 = 所选文本.replace(/^(.*)$/mg,"<u>$1</u>");
                所选文本 = 所选文本.replace(/^\<u\>\<\/u\>$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        }
    };


    转换三浪线() {
        if (!this.获取编辑器信息()) return;
        var link = /~~~[^~]+~~~/;	//是否包含代码行符号
        var link1 = /^[^~]*~~~[^~]*$/m;	//是否只包含一侧的~
        if(所选文本 == ""){return};
        所选文本 = 所选文本.replace(/\n/g,"↫");
        if (link1.test(所选文本)){
            //new obsidian.Notice("只有一侧出现~~~符号");
            return;
        }else if (link.test(所选文本)){
            //new obsidian.Notice("成对出现~~~符号");
            所选文本 = 所选文本.replace(/~~~↫?|↫?~~~/g,"");
            所选文本 = 所选文本.replace(/↫/g,"\n");
            this.替换所选文本 (所选文本);
        }else{
            //new obsidian.Notice("需要补充~~~符号");
            所选文本 = 所选文本.replace(/^(.*)$/m,"~~~↫$1↫~~~");
            所选文本 = 所选文本.replace(/↫/g,"\n");
            this.替换所选文本 (所选文本);
            编辑模式.exec("goRight");
        }
    };

    上标格式刷(){
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isSB){
                this.关闭格式刷();
                new obsidian.Notice("已关闭上标格式刷！");
            }else{
                this.关闭格式刷();
                isSB = true;
                newNotice = new obsidian.Notice("<sup>上标格式刷</sup> 已打开！",0);
            }
        }
    };
    转换上标() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isSB){
                isSB = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭上标格式刷！");
            }
            笔记全文.replaceRange("<sup></sup>", 当前光标, 当前光标);
            编辑模式.setCursor({line:当前行号,ch:Number(当前光标.ch+5)});
        }else{
            var link = /\<sup\>[^\<\>]*\<\/sup\>/g;	//是否包含<sup>下标</sup>
            var link1 = /\<sup\>[^\<\>\/]*$|^[^\<\>]*\<\/sup\>/g;	//是否只包含一侧的<sup>下标</sup>
            if (link1.test(所选文本)){
                //new obsidian.Notice("只有一侧出现<sup>下标</sup>符号");
                return;
            }else if (link.test(所选文本)){
                所选文本 = 所选文本.replace(/(\<sup\>|\<\/sup\>)/g,"");
                this.替换所选文本 (所选文本);
            }else{
                所选文本 = 所选文本.replace(/^(.+)$/mg,"\<sup\>$1\<\/sup\>");
                所选文本 = 所选文本.replace(/^\<sup\>\s*\<\/sup\>$/mg,"");
                this.替换所选文本 (所选文本);
                编辑模式.exec("goRight");
            }
        };
    };

    下标格式刷(){
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isXB){
                this.关闭格式刷();
                new obsidian.Notice("已关闭下标格式刷！");
            }else{
                this.关闭格式刷();
                isXB = true;
                newNotice = new obsidian.Notice("<sub>下标格式刷</sub> 已打开！",0);
            }
        }
    };
    转换下标() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isXB){
                isXB = false;
                newNotice?.hide();
                new obsidian.Notice("已关闭下标格式刷！");
            }
            笔记全文.replaceRange("<sub></sub>", 当前光标, 当前光标);
            编辑模式.setCursor({line:当前行号,ch:Number(当前光标.ch+5)});
        }else{
            var link = /\<sub\>[^\<\>]*\<\/sub\>/g;	//是否包含<sub>下标</sub>
            var link1 = /\<sub\>[^\<\>\/]*$|^[^\<\>]*\<\/sub\>/g;	//是否只包含一侧的<sub>下标</sub>
            if (link1.test(所选文本)){
                return;
            }else if (link.test(所选文本)){
                所选文本 = 所选文本.replace(/(\<sub\>|\<\/sub\>)/g,"");
            }else{
                所选文本 = 所选文本.replace(/^(.+)$/mg,"\<sub\>$1\<\/sub\>");
                所选文本 = 所选文本.replace(/^\<sub\>\s*\<\/sub\>$/mg,"");
            }
            this.替换所选文本 (所选文本);
            编辑模式.exec("goRight");
        };
    };

    转换填空() {
        var link = /\{\{c\d+::[^\{\}]+\}\}/ig;	//是否包含{{c*::}}
        var link1 = /\{\{c[^\{\}]*$|^[^\{\}]*\}\}/ig;	//是否只包含一侧的{{c*::}}
        var cs: string[]=[];
        var clinks="";
        var lastId=1;
        if (!this.获取编辑器信息()) return;

        if (link1.test(所选文本)){
            return;
        }else if (link.test(所选文本)){
            所选文本 = 所选文本.replace(/(\{\{c\d::|\}\})/g,"");
        }else{
            if(link.test(笔记正文)){
                cs = 笔记正文.match(link) ?? [];
                clinks = cs.toString().replace(/\{\{c/ig,"").replace(/::[^\}]+\}\}/ig,"");
                new obsidian.Notice(clinks);
                //lastId = Number(clinks.split(",").sort().pop())+1;
                lastId = Number(clinks.split(",").sort((a, b) => Number(a) - Number(b)).pop()) + 1;
                new obsidian.Notice(String(lastId));
            }
            所选文本 = 所选文本.replace(/^(.+)$/m,"{{c"+lastId+"::$1}}");
        }
        this.替换所选文本 (所选文本);
    };

    选择当前整段 () {
        if (!this.获取编辑器信息()) return;
        if(当前行文本!=""){
            编辑模式.setSelection({line:当前行号,ch:0}, {line:当前行号,ch:当前行文本.length});
        };
    };

    选择当前整句 () {
        if (!this.获取编辑器信息()) return;
        var 句前 = 选至行首.match(/(?<=(^|[。？！]))[^。？！]*$/);
        var 句后 = 选至行尾.match(/^[^。？！]*([。？！]|$)/);
        if (句前 == null || 句后 == null) {
            编辑模式.setSelection({line:当前行号,ch:0}, {line:当前行号,ch:当前行文本.length});
        }else{
            var _length1 = 选至行首.length-句前[0].length;
            var _length2 = 选至行首.length+句后[0].length;
            //new obsidian.Notice(句前+"\n光标\n"+句后);
            编辑模式.setSelection({line:当前行号,ch:_length1}, {line:当前行号,ch:_length2});
        }
    };

    选择当前语法 () {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            var 句前 = 选至行首.match(/(^|\*\*|==|~~|%%|\[\[)[^\*=~%\[\]]*$/);
            var 句后 = 选至行尾.match(/^[^\*=~%\[\]]*(\*\*|==|~~|%%|\]\]|$)/);
            if(句前==null ||句后==null){
                return;
            }else{
                var _length1 = 选至行首.length-句前[0].length;
                var _length2 = 选至行首.length+句后[0].length;
                //new obsidian.Notice(句前+"\n光标\n"+句后);
                编辑模式.setSelection({line:当前行号,ch:_length1}, {line:当前行号,ch:_length2});
            };
        }else if(/^(\*\*|==|~~|%%|\[\[)[^\*=~%\[\]]*(\*\*|==|~~|%%|\]\])$/.test(所选文本)){
            this.选择当前整句 ();
        }
    };

    重复当前行 () {
        if (!this.获取编辑器信息()) return;
        var 新行文本 = "\n" + 当前行文本;
        笔记全文.replaceRange(新行文本, {line:当前行号,ch:当前行文本.length}, {line:当前行号,ch:当前行文本.length});
    };

    智能符号 () {
        if (!this.获取编辑器信息()) return;
        const cursorOffset = 编辑模式.posToOffset(当前光标);
        if (isMarkdownOffsetProtected(笔记正文, cursorOffset)) {
            new obsidian.Notice('当前位置位于代码、Frontmatter、公式或链接中，未执行智能符号转换');
            return;
        }
        let 转换文本 = "";
        var 标前两字 = 编辑模式.getRange({line:当前行号,ch:选至行首.length-2}, 当前光标);
        var 标后两字 = 编辑模式.getRange(当前光标,{line:当前行号,ch:选至行首.length+2});
        //new obsidian.Notice("标前两字\n"+标前两字+"\n\n标后两字：\n"+标后两字);

        if(选至行尾.match(/^(\]\]|\=\=|\*\*|\~\~)/)){
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");   //如果下个字符是后括号，则跃过
        }else if(选至行尾.match(/^[$》〉］｝】〗〕』」）}\)]/)){
            编辑模式.exec("goRight");   //如果下个字符是后括号，则跃过
        }else if(标前两字.match(/^[【\[][（\(]$/)){
            笔记全文.replaceRange("〖", {line:当前行号,ch:选至行首.length-2}, 当前光标);
        }else if(标前两字.match(/^[（\(][《\<]$/)){
            笔记全文.replaceRange("〈", {line:当前行号,ch:选至行首.length-2}, 当前光标);
        }else if(标前两字.match(/^[\(（][【\[]$/)){
            笔记全文.replaceRange("〔", {line:当前行号,ch:选至行首.length-2}, 当前光标);
        }else if(标前两字.match(/^[“\"][【\[]$/)){
            笔记全文.replaceRange("『", {line:当前行号,ch:选至行首.length-2}, 当前光标);
        }else if(标前两字.match(/^[‘\'][【\[]$/)){
            笔记全文.replaceRange("「", {line:当前行号,ch:选至行首.length-2}, 当前光标);
        }else if(标前两字.match(/^……$/)){
            笔记全文.replaceRange("^", {line:当前行号,ch:选至行首.length-2}, 当前光标);
        }else if(标前两字.match(/^￥￥$/)){
            笔记全文.replaceRange("$$", {line:当前行号,ch:选至行首.length-2}, 当前光标);
            编辑模式.exec("goLeft");
        }else if(选至行首.match(/《[^《》〈〉｛｝【】〖〗〔〕（）『』「」]*$/)){
            笔记全文.replaceRange("》", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/〈[^《》〈〉［］｛｝【】〖〗〔〕（）『』「」]*$/)){
            笔记全文.replaceRange("〉", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/［[^《》〈〉［］｛｝【】〖〗〔〕（）『』「」]*$/)){
            笔记全文.replaceRange("］", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/｛[^《》〈〉［］｛｝【】〖〗〔〕（）『』「」]*$/)){
            笔记全文.replaceRange("｝", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/【[^《》〈〉［］｛｝【】〖〗〔〕（）『』「」]*$/)){
            笔记全文.replaceRange("】", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/〖[^《》〈〉［］｛｝【】〖〗〔〕（）『』「」]*$/)){
            笔记全文.replaceRange("〗", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/〔[^《》〈〉［］｛｝【】〖〗〔〕（）『』「」]*$/)){
            笔记全文.replaceRange("〕", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/『[^《》〈〉［］｛｝【】〖〗〔〕（）『』「」]*$/)){
            笔记全文.replaceRange("』", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/「[^《》〈〉［］｛｝【】〖〗〔〕（）『』「」]*$/)){
            笔记全文.replaceRange("」", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/（[^《》〈〉［］｛｝【】〖〗〔〕（）『』「」]*$/)){
            笔记全文.replaceRange("）", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/^[》、](.*)$/)){
            转换文本 = 选至行首.replace(/^》(.*)$/,">$1");
            转换文本 = 转换文本.replace(/^、(.*)$/,"/$1");
            笔记全文.replaceRange(转换文本, {line:当前行号,ch:0}, 当前光标);
        }else if(选至行首.match(/\[\[[^=\[\]\*~]*$/)){
            笔记全文.replaceRange("]]", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else if(选至行首.match(/\$\$[^\$]*$/)){
            笔记全文.replaceRange("$$", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else if(选至行首.match(/\$[^\$]*$/)){
            笔记全文.replaceRange("$", 当前光标, 当前光标);
            编辑模式.exec("goRight");
        }else if(选至行首.match(/==[^=\[\]\*~]*$/)){
            笔记全文.replaceRange("==", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else if(选至行首.match(/\*\*[^=\[\]\*~]*$/)){
            笔记全文.replaceRange("**", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else if(选至行首.match(/%%[^=\[\]\*~%]*$/)){
            笔记全文.replaceRange("%%", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else if(选至行首.match(/~~[^=\[\]\*~]*$/)){
            笔记全文.replaceRange("~~", 当前光标, 当前光标);
            编辑模式.exec("goRight");
            编辑模式.exec("goRight");
        }else{
            let coreAry = ["query|qy","mermaid|mm","dataview|dv","ABAP","apl","asciiarmor","ASN.1","asp","assembly","bash","basic","C","C#","cassandra","ceylon","clike","clojure","cmake","cobol","coffeescript","commonlisp","cpp","CQL","crystal","csharp","css","cypher","cython","D","dart","diff","django","dockerfile","ejs","elixir","elm","embeddedjs","erb","erlang","F#","flow","forth","fortran","fsharp","gas","gfm","gherkin","gist","go","groovy","handlebars","haskell","haxe","html","http","hxml","idl","ini","jade","java","Javascript|js","jinja2","json","jsp","jsx","julia","kotlin","latex","less","lisp","livescript","lua","makefile","mariadb","markdown|md","mathematica","matlab","mbox","mermaid","mssql","mysql","nginx","nim","nsis","objc","objective-c","ocaml","octave","oZ","pascal","perl","perl6","pgp","php","php+HTML","plsql","powershell","properties","protobuf","pseudocode","python|py","q","R","react","reStructuredText","rst","ruby","rust","SAS","scala","scheme","SCSS","sequence","sh","shell","smalltalk","solidity","SPARQL","spreadsheet","sql","sqlite","squirrel","stylus","swift","tcl","tex","tiddlywiki","tiki","wiki","toml","tsx","turtle","twig","typescript","V","vbscript","velocity","verilog","vhdl","vb|visual basic","vue","web-idl","xaml","xml","xml-dtd","xquery","yacas","yaml"];
            for (const _coreID of coreAry) {
                let qcStr = _coreID.replace(/\|.+$/,"");
                const aliases = _coreID.split("|");
                if(aliases.some((alias) => alias.toLowerCase() === 选至行首.toLowerCase())){
                    笔记全文.replaceRange("```"+qcStr+"\n\n```\n", {line:当前行号,ch:0}, 当前光标);
                    编辑模式.exec("goLeft");
                    编辑模式.exec("goUp");
                };
            };

            let infoAry = ["note|笔记|记录","abstract|摘要","summary|总结","tldr|概要","info|信息|资讯","todo|待办","tip|hint|提示","important|重要","success|成功","check|检查","done|完成","question|问题","help|帮助","faq|常见问题","warning|警告","caution|提醒","attention|注意","failure|失败","fail|丢失","missing|缺失","danger|危险","error|错误","bug|漏洞|缺陷","example|示例|例子","quote|cite|引用"];
            for (const _strID of infoAry) {
                let oneStr = _strID.replace(/\|.+$/,"");
                const aliases = _strID.split("|");
                const calloutPattern = new RegExp(
                    "^(?:"+aliases.map(escapeRegExp).join("|")+
                    ")(?: (?:[左中右lcr]|left|center|right))*[+-]*$",
                    "i",
                );
                if(calloutPattern.test(选至行首)){
                    let calloutStr = ">[!"+oneStr+"■]▲ " + String.fromCharCode(10) + ">";
                    new obsidian.Notice("符合表达式，可以转换！");
                    if(/\s([左l]|left)(?=[\+\-]|$)/i.test(选至行首)){
                        calloutStr = calloutStr.replace("■"," left");
                    }else if(/\s([中c]|center)(?=[\+\-]|$)/i.test(选至行首)){
                        calloutStr = calloutStr.replace("■"," center");
                    }else if(/\s([右r]|right)(?=[\+\-]|$)/i.test(选至行首)){
                        calloutStr = calloutStr.replace("■"," right");
                    }else{
                        calloutStr = calloutStr.replace("■","");
                    }
                    if(/\+$/.test(选至行首)){
                        calloutStr = calloutStr.replace("▲","+");
                    }else if(/\-$/.test(选至行首)){
                        calloutStr = calloutStr.replace("▲","-");
                    }else{
                        calloutStr = calloutStr.replace("▲","");
                    }

                    笔记全文.replaceRange(calloutStr, {line:当前行号,ch:0}, 当前光标);
                    编辑模式.exec("goLeft");
                    编辑模式.exec("goLeft");
                }
            };
        };
    };

    标题语法(_str: string) {
        if (!this.获取编辑器信息()) return;
        let 新文本 = "";

        if(_str==""){   //若为标题，转为普通文本
            新文本 = 当前行文本.replace(/^(\>*(\[[!\w]+\])?\s*)#+\s/,"$1");
        }else{  //列表、引用，先转为普通文本，再转为标题
            新文本 = 当前行文本.replace(/^\s*(#*|\>|\-|\d+\.)\s*/m,"");
            console.log(新文本);
            新文本 = _str+" "+新文本;
        }
        //笔记全文.replaceRange(新文本, {line:当前行号,ch:0}, {line:当前行号,ch:当前行文本.length});
        编辑模式.setLine(当前行号,新文本);
        编辑模式.setCursor({line:当前行号,ch:Number(新文本.length-选至行尾.length)});
    };

    调节标题级别(增加: boolean) {
        if (!this.获取编辑器信息()) return;
        let 新文本 = "";
        let 位置 = 选至行首.length;
        if(增加){
            if(/^##+\s/.test(当前行文本)){
                新文本 = 当前行文本.replace(/(^\s*)##/,"$1#");
                位置--
            }else{
                return;
            }
        }else{
            if(/^#{1,5}\s/.test(当前行文本)){
                新文本 = 当前行文本.replace(/(^[‌‌‌‌‌‌　]*)#/,"$1##");
                位置++
            }else{
                return;
            }
        }
        //笔记全文.replaceRange(新文本, {line:当前行号,ch:0}, {line:当前行号,ch:当前行文本.length});
        编辑模式.setLine(当前行号,新文本);
        编辑模式.setCursor({line:当前行号,ch:位置});
    };

    彩字格式刷(_color: string){
        this.关闭格式刷();
        isCTxt = true;
        this.settings.hColor = _color;
        newNotice = new obsidian.Notice("多彩文字格式刷 已打开！",0);
    }

    转换文字颜色() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};

        let _html0 = /\<font color=[0-9a-zA-Z#]+[^\<\>]*\>[^\<\>]+\<\/font\>/g;
        let _html1 = /^\<font color=[0-9a-zA-Z#]+[^\<\>]*\>([^\<\>]+)\<\/font\>$/;
        let _html2 = '\<font color='+this.settings.hColor+'\>$1\<\/font\>';
        let _html3 = /\<font color=[^\<]*$|^[^\>]*font\>/g;	//是否只包含一侧的<>

        if (_html3.test(所选文本)){
            return; //new obsidian.Notice("不能转换颜色！");
        }else if (_html0.test(所选文本)){
            if(_html1.test(所选文本)){
                //new obsidian.Notice("替换颜色！");
                所选文本 = 所选文本.replace(_html1,_html2);
            }else{
                所选文本 = 所选文本.replace(/\<font color=[0-9a-zA-Z#]+[^\<\>]*?\>|\<\/font\>/g,"");
            }
        }else{
            所选文本 = 所选文本.replace(/^(.+)$/mg,_html2);  //new obsidian.Notice("可以转换颜色！");
        }
        this.替换所选文本 (所选文本);
        编辑模式.exec("goRight");
    };

    彩底格式刷(_color: string){
        this.关闭格式刷();
        isBgC = true;
        this.settings.bColor = _color;
        newNotice = new obsidian.Notice("多彩背景格式刷 已打开！",0);
    }
    转换背景颜色() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};
        let _html0 = /\<span style=[\"'][^\<\>]+:[0-9a-zA-Z#]+[\"'][^\<\>]*\>[^\<\>]+\<\/span\>/g;
        let _html1 = /^\<span style=[\"'][^\<\>]+:[0-9a-zA-Z#]+[\"'][^\<\>]*\>([^\<\>]+)\<\/span\>$/;
        let _html2 = '\<span style=\"background\:'+this.settings.bColor+'\"\>$1\<\/span\>';
        let _html3 = /\<span style=[^\<]*$|^[^\>]*span\>/g;	//是否只包含一侧的<>
        if (_html3.test(所选文本)){
            return; //new obsidian.Notice("不能转换颜色！");
        }else if (_html0.test(所选文本)){
            if(_html1.test(所选文本)){
                所选文本 = 所选文本.replace(_html1,_html2);
            }else{
                所选文本 = 所选文本.replace(/\<span style=[\"'][^\<\>]+:[0-9a-zA-Z#]+[\"'][^\<\>]*\>|\<\/span\>/g,"");
                //new obsidian.Notice("需要去除颜色！");
            }
        }else{
            所选文本 = 所选文本.replace(/^(.+)$/mg,_html2);  //new obsidian.Notice("可以转换颜色！");
        }
        this.替换所选文本 (所选文本);
        编辑模式.exec("goRight");
    };

    转换无语法文本() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            if(isText){
                this.关闭格式刷();
                new obsidian.Notice("已关闭格式刷！");
            }else{
                this.关闭格式刷();
                isText = true;
                newNotice = new obsidian.Notice("纯文本格式刷 已打开！",0);
                //new obsidian.Notice("请先划选部分文本，再执行命令！");
                let reg1 = /(~~|%%|\*==|==|\*\*?|\<[^\<\>]*?\>|!?\[\[*|`|_|!?\[)([^!#=\[\]\<\>\`_\*~\(\)]*)$/;
                let reg2 = /^([^!=\[\]\<\>\`_\*~\(\)]*)(~~|%%|==\*|==|\*\*?|\<[^\<\>]*\>|\]\]|`|_|\]\([^\(\)\[\]]*\))/;
                if(选至行首.match(reg1)!=null && 选至行尾.match(reg2)!=null){
                    选至行首 = 选至行首.replace(reg1,"$2");
                    选至行尾 = 选至行尾.replace(reg2,"$1");
                    //笔记全文.replaceRange(选至行首+选至行尾, {line:当前行号,ch:0},{line:当前行号,ch:当前行文本.length});
                    编辑模式.setLine(当前行号,选至行首+选至行尾);
                    编辑模式.setCursor({line:当前行号,ch:Number(选至行首.length)});
                }
            }
        }else{
            let mdText = /(^#+\s|(?<=^|\s*)#|^\>|^\- \[( |x)\]|^\+ |\<[^\<\>]+?\>|^1\. |^\s*\- |^\-+$|^\*+$|==\*|\*==|==\*\*|\*\*==|==\*\*\*|\*\*\*==)/mg;
            所选文本 = 所选文本.replace(mdText,"");
            所选文本 = 所选文本.replace(/^[ ]+|[ ]+$/mg,"");
            所选文本 = 所选文本.replace(/\!?\[\[([^\[\]\|]*\|)*([^\(\)\[\]]+)\]\]/g,"$2");
            所选文本 = 所选文本.replace(/\!?\[+([^\[\]\(\)]+)\]+\(([^\(\)]+)\)/g,"$1");
            所选文本 = 所选文本.replace(/`([^`]+)`/g,"$1");
            所选文本 = 所选文本.replace(/_([^_]+)_/g,"$1");
            所选文本 = 所选文本.replace(/==([^=]+)==/g,"$1");
            所选文本 = 所选文本.replace(/\*\*?([^\*]+)\*\*?/g,"$1");
            所选文本 = 所选文本.replace(/~~([^~]+)~~/g,"$1");
            所选文本 = 所选文本.replace(/(\r*\n)+/mg,"\r\n");

			this.替换所选文本 (所选文本);
        }
    };

    内链转为超链接() {
		if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};
        所选文本 = 所选文本.replace(/\[\[([^\[\]]+)(\.\w{3,4})?\]\]/g,"[$1]($1$2)");
        所选文本 = 所选文本.replace(/(?<=\]\([^\)]*)\s(?=[^\(]*\))/g,"%20");
        this.替换所选文本 (所选文本);
    };

    超链接转为内链() {
		if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};
        所选文本 = 所选文本.replace(/\[([^\[\]]+)\]\([^\(\)]+\)/g,"[[$1]]");
        this.替换所选文本 (所选文本);
    };

    去除超链接语法() {
		if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};
        所选文本 = 所选文本.replace(/\[([^\[\]]+)\]\([^\(\)]+\)/g,"$1");
        this.替换所选文本 (所选文本);
    };

    转换引号() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};
        if(/[「『』」]/g.test(所选文本)){
            所选文本 = 所选文本.replace(/「/g,"“");
            所选文本 = 所选文本.replace(/」/g,"”");
            所选文本 = 所选文本.replace(/『/g,"‘");
            所选文本 = 所选文本.replace(/』/g,"’");
        }else{
            所选文本 = 所选文本.replace(/“/g,"「");
            所选文本 = 所选文本.replace(/”/g,"」");
            所选文本 = 所选文本.replace(/‘/g,"『");
            所选文本 = 所选文本.replace(/’/g,"』");
        }
        this.替换所选文本 (所选文本);
    };

    /*
    括选文本1() {
        let link = /(.*【[^【】]+】.*)/g;	//是否包含【】
        let link1 = /【[^【】]*$|^[^【】]*】/g;	//是否只包含一侧的【】
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};
        if (link1.test(所选文本)){
            return;
        }else if (link.test(所选文本)){
            所选文本 = 所选文本.replace(/[【】]/g,"");
        }else{
            所选文本 = 所选文本.replace(/^(.+)$/mg,"【$1】");
            所选文本 = 所选文本.replace(/^【\s*】$/mg,"");
        }
        this.替换所选文本 (所选文本);
    };

    括选文本2() {
        let link = /(.*（[^（）]*）.*)/g;	//是否包含【】
        let link1 = /（[^（）]*$|^[^（）]*）/g;	//是否只包含一侧的【】
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};
        if (link1.test(所选文本)){
            return;
        }else if (link.test(所选文本)){
            所选文本 = 所选文本.replace(/[（）]/g,"");
        }else{
            所选文本 = 所选文本.replace(/^(.+)$/mg,"($1)");
            所选文本 = 所选文本.replace(/^(\s*)$/mg,"");
        }
        this.替换所选文本 (所选文本);
    };

    括选文本3() {
        let link = /(.*「[^「」]*」.*)/g;	//是否包含「」
        let link1 = /「[^「」]*$|^[^「」]*」/g;	//是否只包含一侧的「
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};
        if (link1.test(所选文本)){
            return;
        }else if (link.test(所选文本)){
            所选文本 = 所选文本.replace(/[「」]/g,"");
        }else{
            所选文本 = 所选文本.replace(/^(.+)$/mg,"「$1」");
            所选文本 = 所选文本.replace(/^「\s*」$/mg,"");
        }
        this.替换所选文本 (所选文本);
    };

    括选文本4() {
        let link = /(.*《[^《》]*》.*)/;	//是否包含《》
        let link1 = /《[^《》]*$|^[^《》]*》/;	//是否只包含一侧的《
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};
        if (link1.test(所选文本)){
            return;
        }else if (link.test(所选文本)){
            所选文本 = 所选文本.replace(/[《》]/g,"");
        }else{
            所选文本 = 所选文本.replace(/^(.+)$/mg,"《$1》");
            所选文本 = 所选文本.replace(/^《\s*》$/mg,"");
        }
        this.替换所选文本 (所选文本);
    };
    */

    转换待办列表() {
        if (!this.获取编辑器信息()) return;
        let 当前新文本 = 当前行文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[) (?=\]\s[^\s])/mg,"x☀");
        当前新文本 = 当前新文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[)x(?=\]\s[^\s])/mg,"-☀");
        当前新文本 = 当前新文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[)\-(?=\]\s[^\s])/mg,"!☀");
        当前新文本 = 当前新文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[)\!(?=\]\s[^\s])/mg,"?☀");
        当前新文本 = 当前新文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[)\?(?=\]\s[^\s])/mg,">☀");
        当前新文本 = 当前新文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[)\>(?=\]\s[^\s])/mg,"<☀");
        当前新文本 = 当前新文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[)\<(?=\]\s[^\s])/mg,"+☀");
        当前新文本 = 当前新文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[)\+(?=\]\s[^\s])/mg," ☀");
        当前新文本 = 当前新文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[[\sx\-\+\?\!\<\>])☀(?=\]\s[^\s])/mg,"");
        //笔记全文.replaceRange(当前新文本, {line:当前行号,ch:0},{line:当前行号,ch:当前行文本.length});
        编辑模式.setLine(当前行号,当前新文本);
    };

    合计任务用时() {
        if (!this.获取编辑器信息()) return;
        let 当前缩进 = "";
        let 父级缩进 = "";
        if(/^\s*\- [^\n]+$/.test(当前行文本)){
            当前缩进 = 当前行文本.replace(/\-.*$/m,"");
        }

        let timeReg = /.*(20\d\d\-\d\d\-\d\d \d\d:\d\d)\s*\-\s*(20\d\d\-\d\d\-\d\d \d\d:\d\d)\s*$/m;
        if(timeReg.test(当前行文本)){
            let startTime = 当前行文本.replace(timeReg,"$1");
            let stopTime = 当前行文本.replace(timeReg,"$2");
            let date1 = new Date(startTime.replace(/-/g, '/'));
            let date2 = new Date(stopTime.replace(/-/g, '/'));

            // 有三种方式获取，在后面会讲到三种方式的区别
            let time1 = date1.getTime();
            let time2 = date2.valueOf();

            new obsidian.Notice("当前任务用时 "+Number((time2-time1)/1000)+" 秒");
        }

    }

    标记完成及时间() {
        if (!this.获取编辑器信息()) return;
        let 当前新文本 = 当前行文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[) (?=\]\s[^\s])/mg,"x☀");
        当前新文本 = 当前新文本.replace(/(?<=^\s*([\-\+]|[0-9]+\.)\s\[[\sx\-\+\?\!\<\>])☀(?=\]\s[^\s])/mg,"");
        当前新文本 = 当前新文本+" "+this.生成时间戳();
        //笔记全文.replaceRange(当前新文本, {line:当前行号,ch:0},{line:当前行号,ch:当前行文本.length});
        编辑模式.setLine(当前行号,当前新文本);
    };

    自动设置标题() {    //修复 标题行首的空格或制表符影响正常格式 的问题。 20220807
		if (!this.获取编辑器信息()) return;
        编辑模式.exec("goStart");

        if (!笔记正文) return;
        笔记正文 = 笔记正文.replace(/\r?\n/g,"↫");
        笔记正文 = 笔记正文.replace(/↫\s*↫/g,"↫↫");
        笔记正文 = 笔记正文.replace(/\s*(?=↫)/g,"");
        笔记正文 = 笔记正文.replace(/(?<=^|↫)[\s\t]*([^\s\t#`\[\]\(\)↫]+[^\.\?\!:,0-9，：。？！）↫])(?=(↫|$))/mg,"↫# $1↫");
        //笔记正文 = 笔记正文.replace(/#+([^#↫]+)↫*$/mg,"$1");    //取消末行标题
        笔记正文 = 笔记正文.replace(/↫{3,}/g,"\r\n\r\n");
        笔记正文 = 笔记正文.replace(/↫/g,"\r\n");
        this.替换笔记正文 (笔记正文);
    };

    大字号文本() {    //修复 标题行首的空格或制表符影响正常格式 的问题。 20220807
		if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            return;
        };

        let tagReg = /(.*)\<font size=5px\>([^\<\>]*)\<\/font\>(.*)/ig;	//是否包含html语法
        if (tagReg.test(所选文本)) {
            所选文本 = 所选文本.replace(tagReg, "$1$2$3");
		}else{
			所选文本 = "<font size=5px>" + 所选文本 + "</font>";
		}
        this.替换所选文本 (所选文本);
    };

    async 指定当前文件名 () {
        if (!this.获取编辑器信息()) return;
        const file = this.app.workspace.getActiveFile();
        const newBaseName = 所选文本.trim();
        if (!file || newBaseName === "") return;
        if (/[\\/:*?"<>|]/.test(newBaseName) || newBaseName === "." || newBaseName === "..") {
            new obsidian.Notice("文件名包含不允许的字符");
            return;
        }

        const separator = file.path.lastIndexOf("/");
        const parentPath = separator >= 0 ? file.path.slice(0, separator) : "";
        const newPath = obsidian.normalizePath(
            parentPath ? `${parentPath}/${newBaseName}.md` : `${newBaseName}.md`,
        );
        const existing = this.app.vault.getAbstractFileByPath(newPath);
        if (existing && existing !== file) {
            new obsidian.Notice("同名文件已存在，未执行重命名");
            return;
        }

        try {
            await this.app.fileManager.renameFile(file, newPath);
        } catch (error) {
            console.error("Quick Editing：重命名文件失败", error);
            new obsidian.Notice("重命名失败，请查看开发者控制台");
        }
    };

    async 智能粘贴() {
        if (!this.获取编辑器信息()) return;
        const originalEditor = 编辑模式;
        const originalSelection = 所选文本;
        try {
            const clipboardText = await navigator.clipboard.readText();
            const result = transformClipboardText(clipboardText, originalSelection);
            if (result.kind === 'empty') {
                new obsidian.Notice("剪贴板中没有可粘贴的文本");
                return;
            }
            if (this.获取编辑模式() !== originalEditor) {
                new obsidian.Notice("活动笔记已经改变，已取消粘贴");
                return;
            }
            originalEditor.replaceSelection(result.text);
            const messages = {
                'media-url': "剪贴板网址已转为 Markdown 嵌入语法",
                url: "剪贴板网址已转为 Markdown 链接",
                'media-path': "本地媒体路径已转为 Markdown 嵌入语法",
                path: "本地路径已转为 Markdown 链接",
                table: "制表符数据已转为 Markdown 表格",
                code: "剪贴板文本已转为代码块",
            };
            new obsidian.Notice(messages[result.kind]);
        } catch (error) {
            console.error("Quick Editing：读取剪贴板失败", error);
            new obsidian.Notice("无法读取剪贴板，请检查系统权限");
        }
    };

    async 图文粘贴() {
        if (!this.获取编辑器信息()) return;
        if (typeof navigator.clipboard.read !== 'function') {
            new obsidian.Notice("当前环境不支持读取富文本剪贴板");
            return;
        }
        const originalEditor = 编辑模式;
        try {
            const items = await navigator.clipboard.read();
            const htmlItem = items.find((item) => item.types.includes('text/html'));
            if (!htmlItem) {
                new obsidian.Notice("剪贴板中没有 HTML 富文本");
                return;
            }
            const blob = await htmlItem.getType('text/html');
            const markdown = htmlToMarkdown(await blob.text());
            if (markdown === '') {
                new obsidian.Notice("富文本中没有可转换的内容");
                return;
            }
            if (this.获取编辑模式() !== originalEditor) {
                new obsidian.Notice("活动笔记已经改变，已取消粘贴");
                return;
            }
            originalEditor.replaceSelection(markdown);
            new obsidian.Notice("HTML 富文本已转为 Markdown");
        } catch (error) {
            console.error("Quick Editing：读取富文本剪贴板失败", error);
            new obsidian.Notice("无法读取富文本剪贴板，请检查系统权限");
        }
    }

    计算所选结果() {
        if (!this.获取编辑器信息()) return;
        if (!/\d/.test(所选文本)) {
            new obsidian.Notice("数了数，您划选了"+所选文本.length+"个字符！");
            return;
        }

        try {
            const 结果 = evaluateArithmetic(所选文本);
            new obsidian.Notice(所选文本+"="+结果+"\n结果已写入剪贴板！");
            void navigator.clipboard.writeText(String(结果)).catch((error) => {
                console.error("Quick Editing：写入剪贴板失败", error);
                new obsidian.Notice("计算成功，但写入剪贴板失败");
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "表达式无效";
            new obsidian.Notice("无法计算："+message);
        }
    }

    获取搜索结果() {
        var _linkTxt = "";
        const searchView = this.app.workspace.getLeavesOfType('search')[0]?.view;
        if (!searchView) {
            new obsidian.Notice("请先执行搜索操作...");
            return;
        }
        // Obsidian does not currently expose global-search results as public data.
        // Keep the compatibility boundary here and resolve DOM paths back through Vault.
        const resultPaths = Array.from(
            searchView.containerEl.querySelectorAll('.search-result-file-title[data-path]'),
            (element) => element.getAttribute('data-path'),
        ).filter((path): path is string => typeof path === 'string');
        const markdownFiles = Array.from(new Set(resultPaths))
            .map((path) => this.app.vault.getFileByPath(path))
            .filter((file): file is obsidian.TFile => file?.extension === 'md');
        if (!markdownFiles.length) {
            new obsidian.Notice("当前搜索视图中没有可读取的 Markdown 结果");
            return;
        }
        for (const file of markdownFiles) {
            _linkTxt +=  "[["+file.basename+"]]\n"
        }
        void navigator.clipboard.writeText(_linkTxt).then(() => {
            new obsidian.Notice("搜索结果已写入剪贴板！\n请执行粘贴操作...");
        }).catch((error) => {
            console.error("Quick Editing：写入搜索结果失败", error);
            new obsidian.Notice("读取成功，但写入剪贴板失败");
        });
    };

    获取标注文本() {
        if (!this.获取编辑器信息()) return;
        if (!笔记正文) return;
        let tmp = 笔记正文.replace(/^(?!#+ |#注释|#标注|#批注|#反思|#备注|.*==|.*%%).*$|^[^#\n%=]*(==|%%)|(==|%%)[^\n%=]*$|(==|%%)[^\n%=]*(==|%%)/mg,"\n");
        tmp = tmp.replace(/[\r\n|\n]+/g,"\n")
        new obsidian.Notice("已成功获取标注类文本，可以粘贴！");
        navigator.clipboard.writeText(tmp);
    };

    获取无语法文本() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){
            new obsidian.Notice("请先划选部分文本，再执行命令！");
        }else{
            let mdText = /(^#+\s|(?<=^|\s*)#|^>|^\- \[( |x)\]|^\+ |<[^<>]+>|^1\. |^\-+$|^\*+$|==|\*+|~~|```|!*\[\[|\]\])/mg;
            所选文本 = 所选文本.replace(/\[([^\[\]]*)\]\([^\(\)]+\)/img,"$1");
            所选文本 = 所选文本.replace(mdText,"");
            所选文本 = 所选文本.replace(/^[ ]+|[ ]+$/mg,"");
            所选文本 = 所选文本.replace(/(\r\n|\n)+/mg,"\n");
            new obsidian.Notice("已成功获取无语法文本，可以粘贴！");
            navigator.clipboard.writeText(所选文本);
        }
    };

    获取当前字数() {
        if (!this.获取编辑器信息()) return;
        if (!笔记正文) return;
        let showTip = "";
        let showTip1 = "";
        let showTip2 = "";

        let 可见字符 = 笔记正文.match(/[^\s\t\r\n]/g);
        if(可见字符){
            showTip1 += "\n可见字符 "+可见字符.length;

            let 汉字个数 = 笔记正文.match(/[一-龥]/g);
            if(汉字个数){
                showTip1 += "\n- 汉字 "+汉字个数.length;
            }

            let 字母个数 = 笔记正文.match(/[a-z]/ig);
            if(字母个数){
                showTip1 += "\n- 字母 "+字母个数.length;
            }

            let 数字个数 = 笔记正文.match(/\d/ig);
            if(数字个数){
                showTip1 += "\n- 数字 "+数字个数.length;
            }

            let 标点个数 = 笔记正文.match(/[,，\.。\\、\/\?？\!！:：;；—【】（）{}《》#&@\$\^“”‘’'"\]\[\(\)—…]/ig);
            if(标点个数){
                showTip1 += "\n- 标点 "+标点个数.length;
            }
        }else{
            showTip1 = "\n0 个可见字符";
        }

        let 不可见字符 = 笔记正文.match(/[\s\t\r\n]/g);
        if(不可见字符){
            showTip2 += "\n不可见字符 "+不可见字符.length;

            let 空格个数 = 笔记正文.match(/[ 　\t]/g);
            if(空格个数){
                showTip2 += "\n- 空格 "+空格个数.length;
            }

            let 换行个数 = 笔记正文.match(/\r*\n/g);
            if(换行个数){
                showTip2 += "\n- 换行 "+换行个数.length;
            }
        }else{
            showTip2 = "\n0 个不可见字符";
        }

         new obsidian.Notice("当前笔记含有:"+showTip1+"\n"+showTip2,0);
    };

    嵌入当前网址页面 () {
        if (!this.获取编辑器信息()) return;
        let vid,web;
        let 基本格式 = '\n<iframe src="■" width=100% height="500px" frameborder="0" scrolling="auto"></iframe>';
        if(所选文本.match(/^https?:\/\/[^:]+/)){
            if(所选文本.match(/^https?:\/\/v\.qq\.com/)){
                vid = 所选文本.replace(/^http.*\/([^\/=\?\.]+)(\.html.*)?$/,"$1");
                web = "https://v.qq.com/txp/iframe/player.html?vid="+vid;
            }else if(所选文本.match(/^https?:\/\/www\.bilibili\.com/)){
                vid = 所选文本.replace(/^http.*\/([^\/=\?\.]+)(\?spm.*)?$/,"$1");
                web = "https://player.bilibili.com/player.html?bvid="+vid;
            }else if(所选文本.match(/^https?:\/\/www\.youtube\.com/)){
                vid = 所选文本.replace(/^http.*?v=([^\/=\?\.]+)(\/.*)?$/,"$1");
                web = "https://www.youtube.com/embed/"+vid;
            }else{
                web = 所选文本;
            }
            基本格式 = 基本格式.replace(/■/,web);
            笔记全文.replaceRange(基本格式, {line:当前行号,ch:当前行文本.length},{line:当前行号,ch:当前行文本.length});
            编辑模式.exec("goRight");
        }else{
            new obsidian.Notice("所选文本不符合网址格式，无法嵌入！");
        }
    };

    列表转为图示 () {
        if (!this.获取编辑器信息()) return;
        let 大纲文本 = 所选文本.replace(/(    |\t)/mg,"■");
        大纲文本 = 大纲文本.replace(/(\-\s|\d+\.\s)/mg,"");   //对所有文本行的行首进行替换整理,去除-
        大纲文本 = 大纲文本.replace(/\s+$/mg,"");   //对所有文本行的行尾进行替换去除
        大纲文本 = 大纲文本.replace(/\n/g,"↵");
        大纲文本 = 大纲文本.replace(/↵+$/,"");   //去除末尾多余换行符
        let tagAry = 大纲文本.split("↵");
        //new obsidian.Notice(tagAry[0]);
        let fName = "";
        let 主要语法 = "";
        for(var i =0;i<tagAry.length;i++){
            let thisLine = tagAry[i];   //此行文本
            if (thisLine === undefined) continue;
            var n = thisLine.lastIndexOf("■");
            const upLine = i > 0 ? tagAry[i - 1] ?? '' : '';
            const m = upLine.lastIndexOf("■");

            if(n<0){//无■，即为根级大纲,可创建@导航页面
                fName = thisLine;
            }else{
                //new obsidian.Notice(upLine+"  "+m+"\n"+thisLine+"  "+n);
                //比较下行与当前行的■数，三种情况，下行多，两行同，下行少
                thisLine = thisLine.replace(/^■+/,"");  //去除标识符号
                if(n>m){
                    //本行多，追加-当前行，前缀@
                    fName = fName+"-->"+thisLine;
                }else if(n==m){
                    //替换末尾-旧名称 为 -当前行
                    fName = fName.replace(/(?<=(^|\-\-\>))[^\-\>]+$/,thisLine);
                }else{
                    var cha=Number(m-n)+1;  //计算上行、本行的■数
                    const tailSegments = new RegExp("(?:-->[^->]+){"+cha+"}$");
                    fName = fName.replace(tailSegments,"-->"+thisLine);
                }
                var 行语法 = fName.replace(/^.*\-\-\>(?=[^\-\>]+\-\-\>[^\-\>]+$)/mg,"");
                主要语法 = 主要语法 + "↵"+ 行语法;
            }
        }
        var 输出语法 = "%%此图示由列表文本转换而成！%%↵"+主要语法
        //编辑模式.setCursor({line:0,ch:0});
        //笔记正文 = this.获取笔记正文();
        编辑模式.exec("goRight");
        编辑模式.exec("goDown");
        if (!this.获取编辑器信息()) return;
        输出语法 = 输出语法.replace(/↵/g,"\n");
        笔记全文.replaceRange("```mermaid\ngraph TD\n"+输出语法+"\n```\n", 当前光标, 当前光标);

        /*
        var 新正文 = 笔记正文.replace(/\n/g,"↵");
        if(新正文.includes("%%此图示由列表文本转换而成！%%")){
            新正文 = 新正文.replace(/%%此图示由列表文本转换而成！%%↵.+?(?=↵```)/g, 输出语法);
            新正文 = 新正文.replace(/↵/g,"\n");
            this.替换笔记正文 (新正文);
        }else{
            new obsidian.Notice("列表文本已转为MerMaid语法。\n可以粘贴！");
            输出语法 = 输出语法.replace(/↵/g,"\n");
            navigator.clipboard.writeText("```mermaid\ngraph TD\n"+输出语法+"\n```\n");
        };
        */
    }

    升序排列所选段落() {
		if (!this.获取编辑器信息()) return;
        if (所选文本 == "") return;
        var 段落 = 所选文本.replace(/\n\s*(?=\n)/g,"").split("\n");    //去除空行，拆分为数组
        段落.sort();
        this.替换所选文本 (段落.join("\n"));
    };
    降序排列所选段落() {
		if (!this.获取编辑器信息()) return;
        if (所选文本 == "") return;
        var 段落 = 所选文本.replace(/\n\s*(?=\n)/g,"").split("\n");    //去除空行，拆分为数组
        段落.sort().reverse();
        this.替换所选文本 (段落.join("\n"));
    };

    /*
    多行引用文本() {
		if (!this.获取编辑器信息()) return;
        var 所选数据 = 编辑模式.listSelections();
        if(所选数据){
            var 首选行号 = 所选数据[0].anchor.line;
            var 末选行号 = 所选数据[0].head.line;
            for ( var i = 首选行号;i <= 末选行号;i++){
                var 当前行文本 = 编辑模式.getLine(i);
                if(当前行文本.startsWith(">")){
                    笔记全文.replaceRange("", {line:i,ch:0},{line:i,ch:1});
                }else{
                    笔记全文.replaceRange(">", {line:i,ch:0},{line:i,ch:0});
                }
            }
        }else{
            return;
        }
    };
    */

    添加段落编号() {
		if (!this.获取编辑器信息()) return;
        if (所选文本 == ""){
            所选文本 = 笔记正文;
        };
        let 排除行 = /^(#+.*|```|\.*|\|([^\|]*\|)*|\>.*)\s*$/m;   //排除特殊行文本
        //new obsidian.Notice("当前为标题行 "+_str);
        var 末行行号 = 编辑模式.lastLine();
        let lineId = 1;
        for(var i= 0;i<=末行行号;i++){
            var 本行文本 = 编辑模式.getLine(i);
            if(排除行.test(本行文本)){

            }else{
                笔记全文.replaceRange(lineId+". ", {line:i,ch:0},{line:i,ch:0});
                lineId ++;
            }
        }
    };

    去除段落编号() {
		if (!this.获取编辑器信息()) return;
        if (!笔记正文) return;
        编辑模式.exec("goStart");
        笔记正文 = 笔记正文.replace(/^[0-9]+\.\s+([^\s])/mg,"$1");
        this.替换笔记正文 (笔记正文);
    };


    折叠同级标题() {
		if (!this.获取编辑器信息()) return;
        if (!笔记全文) return;
        if(/^#+ /.test(当前行文本)){
            编辑模式.exec('unfoldAll');
            let _str = 当前行文本.replace(/^(#+) .*$/,"$1");   //获取前面的多个#号
            //new obsidian.Notice("当前为标题行 "+_str);
            var 末行行号 = 编辑模式.lastLine();
            var arr = 编辑模式.getRange({line:0,ch:0},{line:末行行号,ch:0}).split("\n");
            //console.log(arr);
            for (var i=arr.length; i>=0; i--) {
                const line = arr[i];
                if(line?.startsWith(_str) && line[_str.length] !== "#") {
                    编辑模式.setCursor({line:i,ch:0});
                    编辑模式.exec('toggleFold');
                }
            }
        }
    };

    调高所有标题级别() {
		if (!this.获取编辑器信息()) return;
        if (!笔记正文) return;
        笔记正文 = 笔记正文.replace(/(?<=^#+)# /mg," ");
        this.替换笔记正文 (笔记正文);
    };

    调低所有标题级别() {
		if (!this.获取编辑器信息()) return;
        if (!笔记正文) return;
        笔记正文 = 笔记正文.replace(/(?<=^#*)# /mg,"## ");
        this.替换笔记正文 (笔记正文);
    };

    /*
    以下修改所选范围的标题行级别，代码失败，不能很好的获取到选区的首行和末行，处理后无法恢复选区范围
    调高所选标题级别() {
		if (!this.获取编辑器信息()) return;
        if (!所选文本) return;
        所选文本 = 所选文本.replace(/(?<=^#+)# /mg," ");
        this.替换所选文本 (所选文本);
    };

    调低所有标题级别() {
		if (!this.获取编辑器信息()) return;
        if (!所选文本) return;
        所选文本 = 所选文本.replace(/(?<=^#*)# /mg,"## ");
        this.替换所选文本 (所选文本);
    };
    */

    //火冷添加

    当前行内容根据光标所在内部链接分割(): [string, string, string] | null {
        if (!this.获取编辑器信息()) return null;
        if (选至行首.endsWith("]]")) { //光标在内部链接范围(含]]后面，因为添加内部链接光标默认在此位置)
            const match = 选至行首.match(/^(.*)(!?\[\[.*?\]\])$/);
            if (match?.[1] !== undefined && match[2] !== undefined) {
                return [match[1], match[2], 选至行尾];
            }
        } else if (选至行首.match(/\[\[/) && 选至行尾.match(/\]\]/)) { //光标在内部链接内(TODO 不支持在]]符号内)
            const left = 选至行首.match(/^(.*)(!?\[\[.*)$/);
            const right = 选至行尾.match(/^(.*?\]\])(.*)/);
            if (left?.[1] !== undefined && left[2] !== undefined && right?.[1] !== undefined && right[2] !== undefined) {
                return [left[1], left[2] + right[1], right[2]];
            }
        }
        return null;
    }

    //["![[", "内部链接文本" , "]]"]
    内部链接分割(内部链接含符号: string): [string, string, string] | null {
        //console.log("内部链接含符号 = " + 内部链接含符号);
        var m = 内部链接含符号.match(/^(!?\[\[)(.*)(\]\])$/);
        if (m?.[1] !== undefined && m[2] !== undefined && m[3] !== undefined) {
            return [m[1], m[2], m[3]];
        }
        return null;
    }

    内部链接名称(内部链接文本: string): string {
        return 内部链接文本.replace(/.*\//, '');
    }

    //添加内部链接内容的别名，比如 a/b/c → a/b/c|c
    修改内部链接的显示名称() {
        var arr = this.当前行内容根据光标所在内部链接分割();
        if (!arr || arr[1].includes('|')) {
            return;
        }
        var 内部链接数组 = this.内部链接分割(arr[1]);
        if (!内部链接数组) return;
        var 名称 = this.内部链接名称(内部链接数组[1]);
        if (名称.indexOf("#") > -1) //有标题，取标题后面
            名称 = 名称.replace(/.*#/, '');
        if (名称.indexOf("^") > -1) //有段落标记，则删除
            名称 = 名称.replace(/\s+\^.*/, '');
        内部链接数组[1] += `|${名称}`;
        //console.log(内部链接数组);
        arr[1] = 内部链接数组.join("");
        //console.log(arr);
        编辑模式.setLine(当前行号, arr.join(""));
        编辑模式.setCursor({line:当前行号,ch:arr[0].length+arr[1].length-2}); //-2是因为
    }

    所有上级标题路径(): string[] {
        if (!this.获取编辑器信息()) return [];
        当前光标 = 编辑模式.getCursor();
        当前行号 = 当前光标.line;
        var arr = 编辑模式.getRange({line:0,ch:0},{line:当前行号,ch:0}).split("\n");
        //console.log(arr);
        //第一个要匹配的 re
        const lastLine = arr.at(-1) ?? '';
        const lastHeading = lastLine.match(/^(\#+)\s/);
        if (lastHeading?.[1]) { //当前是标题，则查找上一级标题
            var l = lastHeading[1].length - 1;
            if (l == 0)
                return [];
            var re = new RegExp(`^\#{${l}}\\s`);
        } else {
            var re = /^\#+\s/;
        }
        //console.log(re);
        var arrRes: string[] = [];
        for (var i=arr.length-1; i>=0; i--) {
            //console.log(arr[i]);
            const line = arr[i];
            if (line !== undefined && re.test(line)) {
                arrRes.push(line);
                const heading = line.match(/^(\#+)\s/);
                if (!heading?.[1]) continue;
                var l = heading[1].length - 1;
                if (l == 0)
                    return arrRes;
                re = new RegExp(`^\#{${l}}\\s`);
                //console.log(re);
            }
        }
        return arrRes;
    };

    折叠某级别标题(折叠等级: number) {
        if (!this.获取编辑器信息()) return;
        if (!笔记全文) return;
        编辑模式.exec('unfoldAll');
        var 末行行号 = 编辑模式.lastLine();
        var arr = 编辑模式.getRange({line:0,ch:0},{line:末行行号,ch:0}).split("\n");
        var re = new RegExp(`^\#{${折叠等级}}\\s`);
        for (var i=arr.length - 1; i>=0; i--) {
            const line = arr[i];
            if (line !== undefined && re.test(line)) {
                编辑模式.setCursor({line:i,ch:0});
                编辑模式.exec('toggleFold');
            }
        }
    };

    插入有效空行() {
		if (!this.获取编辑器信息()) return;
        if (!笔记全文) return;
        笔记全文.replaceRange("　\n", 当前光标, 当前光标);
        编辑模式.exec("goRight");
        编辑模式.exec("goRight");
    };

    批量插入空行() {
        this.应用文本转换(
            (text) => text.replace(/(?<!^(\s*\- |\s*[0-9]+\.|\s*\>|\n)[^\n]*)\n(?!(\s*\- |\s*[0-9]+\.|\s*\>|\n))/g, '$1\n\n'),
            '批量插入空行',
        );
    };

    批量去除空行() {
        this.应用文本转换(
            (text) => text.replace(/(^\s*\n|\r\n|\n)[\t\s]*(\r\n|\n)/g, '\n'),
            '批量去除空行',
        );
    };

    空格转为空行() {
        this.应用文本转换(
            (text) => text.replace(/(?<=[一-龥。？！])[\t\s](?=[一-龥])/g, '\n'),
            '空格转为空行',
        );
    };

    全文首行缩进() {
        const shouldAddIndent = isIndent;
        this.应用文本转换(
            (text) => {
                const withoutIndent = text.replace(/^[‌‌‌‌　]+/mg, '');
                return shouldAddIndent
                    ? withoutIndent.replace(/^(?!(\s*\d+\.\s|\s*\-\.\s|[\n\s\>#]+|```|\-\-\-|\|[^\|]|\*\*\*))/mg, '‌‌‌‌　　')
                    : withoutIndent;
            },
            shouldAddIndent ? '全文首行缩进' : '取消全文首行缩进',
            () => { isIndent = !shouldAddIndent; },
        );
    };

    当前行缩进() {
		if (!this.获取编辑器信息()) return;
        if (!笔记全文) return;
        let 新文本 = "";
        let 已缩进 = 当前行文本.includes("‌　　");
        let 偏移 = 当前光标.ch;
        新文本 = 当前行文本.replace(/^[‌‌‌‌　]+/mg,"");
        if(已缩进){
        }else{
            新文本 = 新文本.replace(/^(?!(\s*\d+\.\s|\s*\-\.\s|[\n\s\>#]+|```|\-\-\-|\|[^\|]|\*\*\*))/mg,"‌‌‌‌　　");
        }
        笔记全文.replaceRange(新文本,  {line:当前行号,ch:0}, {line:当前行号,ch:当前行文本.length});
        if(已缩进){
            if(当前光标.ch>3){
                编辑模式.setCursor({line:当前行号,ch:Number(偏移-5)});
            }else{
                编辑模式.setCursor({line:当前行号,ch:0});
            }
        }else{
            编辑模式.setCursor({line:当前行号,ch:Number(偏移+5)});
        }
    };

    行首添加空格() {
        this.应用文本转换(
            (text) => text.replace(/(?<=(^|\n))(?!(\-\-\-|\*\*\*|\s))/g, '  '),
            '行首添加空格',
        );
    };

    去除行首空格() {
        this.应用文本转换(
            (text) => text.replace(/(?<=(^|\n))[\t \u3000]+/g, ''),
            '去除行首空格',
        );
    };

    末尾追加空格() {
        this.应用文本转换(
            (text) => text.replace(
                /(?<!(\-\-\-|\*\*\*|\s\s))\n/g,
                '  ' + String.fromCharCode(10),
            ),
            '末尾追加空格',
        );
    };

    去除末尾空格() {
        this.应用文本转换(trimTrailingWhitespace, '去除末尾空格');
    };

    上方插入空行() {
        if (!this.获取编辑器信息()) return;
        if (!笔记全文) return;
        var 新文本 = "\r\n"+当前行文本;
        笔记全文.replaceRange(新文本, {line:当前行号,ch:0},{line:当前行号,ch:当前行文本.length});
    };

    下方插入空行() {
        if (!this.获取编辑器信息()) return;
        if (!笔记全文) return;
        var 新文本 = 当前行文本+"\r\n";  //.replace(/^([^\r\n]*)$/,"$1\n");
        笔记全文.replaceRange(新文本, {line:当前行号,ch:0},{line:当前行号,ch:当前行文本.length});
        编辑模式.setSelection({line:当前行号,ch:当前行文本.length+1}, {line:当前行号,ch:当前行文本.length+1});
    };

    添加间隔空格() {
        this.应用文本转换(addCjkLatinSpacing, '添加中英文间隔空格');
    };

    去除所有空格() {
        this.应用文本转换(removeHorizontalSpaces, '去除所有横向空格');
    };

    去除所有注释() {
        this.应用文本转换(removeInlineComments, '去除行内注释');
    };

    /* 此功能暂未启用。*/
     续选当前文本() {
        if (!this.获取编辑器信息()) return;
        var lang = 选至行尾.indexOf(所选文本);
        var 起始 = 选至行首.length+lang;
        var 结束 = 起始 + 所选文本.length;
        if(lang<0){ return};
        编辑模式.setSelection({line:当前行号,ch:起始}, {line:当前行号,ch:结束});
    };

    async 搜索当前文本() {
        const file = this.app.workspace.getActiveFile();
        const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (!file || !view) return;
        const query = "path:"+file.basename+" /"+view.editor.getSelection();
        if (!executeCoreCommand(this.app, 'global-search:open')) {
            new obsidian.Notice("无法打开全局搜索");
            return;
        }
        const searchLeaf = this.app.workspace.getLeavesOfType('search')[0];
        if (!searchLeaf) {
            new obsidian.Notice("无法打开全局搜索");
            return;
        }
        const currentState = searchLeaf.getViewState();
        await searchLeaf.setViewState({
            ...currentState,
            state: { ...currentState.state, query },
        });
    };

    修复外来文本(){
        this.应用文本转换(repairExternalText, '修复外来文本');
    }

    修复意外断行() {
        this.应用文本转换(repairUnexpectedLineBreaks, '修复意外断行');
    };

    修复错误语法() {
        this.应用文本转换(repairMarkdownSyntax, '修复 Markdown 语法');
    };

    修复错误标点() {
        this.应用文本转换(normalizeMixedPunctuation, '规范中英文标点');
    };

    修替断行(_str: string): string {
        return repairUnexpectedLineBreaks(_str);
    }

    修替标点(_str: string): string {
        return normalizeMixedPunctuation(_str);
    }


    转换路径() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == ""){return};
        const convertedPath = convertWindowsPathSyntax(所选文本);
        if (convertedPath === null) {
            new obsidian.Notice("您划选的路径格式不正确！");
            return;
        }
        this.替换所选文本(convertedPath);
    };

    拆分多行() {
        if (!this.获取编辑器信息()) return;
        if(所选文本 == "" || 笔记正文 == null){return};
        所选文本 = 所选文本.replace(/([。？！]) /g,"$1\n");
        this.替换所选文本 (所选文本);
    };

    简体转繁() {
        if (!this.获取编辑器信息()) return;
        if (所选文本 == "") return;
        for (var i=0;i<简体字表.length;i++){
            const from = 简体字表[i];
            const to = 繁体字表[i];
            if (from !== undefined && to !== undefined) 所选文本 = 所选文本.replaceAll(from, to);
        }
        this.替换所选文本 (所选文本);
    }

    繁体转简() {
        if (!this.获取编辑器信息()) return;
        if (所选文本 == "") return;
        for (var i=0;i<繁体字表.length;i++){
            const from = 繁体字表[i];
            const to = 简体字表[i];
            if (from !== undefined && to !== undefined) 所选文本 = 所选文本.replaceAll(from, to);
        }
        this.替换所选文本 (所选文本);
    }

    生成时间戳() {
        var date = new Date();
        return date.getFullYear().toString() + this.pad2(date.getMonth() + 1) + this.pad2(date.getDate()); // + this.pad2(date.getHours()) + this.pad2(date.getMinutes()) + this.pad2(date.getSeconds()
    };
    pad2(n: number): string | number {
        return n < 10 ? '0' + n : n
    };
}


class QuickEditingSettingTab extends obsidian.PluginSettingTab {
    plugin: QuickEditingPlugin;

    constructor(app: obsidian.App, plugin: QuickEditingPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl, plugin } = this;
        containerEl.empty();
        containerEl.addClass('quick-editing-settings');

        const hero = containerEl.createDiv({ cls: 'quick-editing-settings-hero' });
        const heroIcon = hero.createDiv({ cls: 'quick-editing-settings-hero-icon' });
        obsidian.setIcon(heroIcon, 'sparkles');
        const heroCopy = hero.createDiv({ cls: 'quick-editing-settings-hero-copy' });
        const titleRow = heroCopy.createDiv({ cls: 'quick-editing-settings-title-row' });
        titleRow.createEl('h2', { text: 'Quick Editing' });
        titleRow.createSpan({
            cls: 'quick-editing-settings-version',
            text: `V${当前版本}`,
        });
        heroCopy.createEl('p', {
            text: '专注于 Obsidian 核心之外的安全 Markdown 转换、智能粘贴与批量编辑。',
        });

        renderModernSettings(containerEl, plugin);

        const linkSection = createSettingsSection(
            containerEl,
            '内部链接',
            '控制潜在链接批量转换时优先匹配的标题。',
        );
        const linkSetting = new obsidian.Setting(linkSection)
            .setName('潜在链接标题')
            .setDesc('每行一个优先匹配标题；留空时使用库内笔记标题。转换会保护代码、公式、Frontmatter、现有链接和注释。')
            .addTextArea((text) => {
                text
                    .setPlaceholder('每行一个标题')
                    .setValue(plugin.settings.linkWords)
                    .onChange(async (value) => {
                        plugin.settings.linkWords = value;
                        await plugin.saveSettings();
                    });
                text.inputEl.rows = 8;
                text.inputEl.addClass('quick-editing-link-titles');
            });
        linkSetting.settingEl.addClass('quick-editing-link-setting');

        const colorSection = createSettingsSection(
            containerEl,
            '格式刷配色',
            '自定义五组文字颜色与背景颜色；颜色会同步用于格式刷入口。',
        );
        const colorGrid = colorSection.createDiv({ cls: 'quick-editing-color-grid' });
        const colorSettings = [
            { key: 'hColor1', name: '文字 1' },
            { key: 'hColor2', name: '文字 2' },
            { key: 'hColor3', name: '文字 3' },
            { key: 'hColor4', name: '文字 4' },
            { key: 'hColor5', name: '文字 5' },
            { key: 'bColor1', name: '背景 1' },
            { key: 'bColor2', name: '背景 2' },
            { key: 'bColor3', name: '背景 3' },
            { key: 'bColor4', name: '背景 4' },
            { key: 'bColor5', name: '背景 5' },
        ] as const;
        for (const colorSetting of colorSettings) {
            const setting = new obsidian.Setting(colorGrid)
                .setName(colorSetting.name)
                .addColorPicker((picker) => picker
                    .setValue(plugin.settings[colorSetting.key])
                    .onChange(async (value) => {
                        plugin.settings[colorSetting.key] = value;
                        await plugin.saveSettings();
                    }));
            setting.settingEl.addClass('quick-editing-color-card');
        }

        const windowSection = createSettingsSection(
            containerEl,
            '双窗辅助',
            '调整联动阅读时的滚动步长。',
        );
        const scrollSetting = new obsidian.Setting(windowSection)
            .setName('左侧窗口滚动幅度')
            .setDesc('用于“左窗向上滚动”和“左窗向下滚动”命令。')
            .addSlider((slider) => slider
                .setLimits(25, 900, 25)
                .setValue(plugin.settings.maxScroll)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    plugin.settings.maxScroll = value;
                    await plugin.saveSettings();
                }));
        scrollSetting.settingEl.addClass('quick-editing-slider-setting');

        const coreNote = containerEl.createDiv({ cls: 'quick-editing-core-note' });
        const coreNoteIcon = coreNote.createDiv({ cls: 'quick-editing-core-note-icon' });
        obsidian.setIcon(coreNoteIcon, 'info');
        const coreNoteCopy = coreNote.createDiv();
        coreNoteCopy.createEl('strong', { text: '核心能力分工' });
        coreNoteCopy.createEl('p', {
            text: '标题、基础格式、Callout、列表、代码块、视图切换、段落删除和路径复制均直接使用 Obsidian 核心命令。',
        });
    }
}
export default QuickEditingPlugin;
