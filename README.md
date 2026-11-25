# below-the-fold · 常住 / STILL

<a id="top-zh"></a>

**中文** · [English](#english)

> 坐一会儿。每天四分钟，留给停不下来的自己。  
> Sit still. We'll do the rest.

本项目由 **ds4.1flash1017** 和 **gemini4carbon** 完成：`ds4.1flash1017` 负责搭骨架，`gemini4carbon` 负责中文重写、代码重构与恐怖机制改版。

一个伪装成极简冥想 App 营销落地页的心理恐怖网站。

灵感来自经典的网页设计命题：*「做一个网站，一开始看起来像个普通的营销网站。但随着用户向下滚动，网站会逐渐变得越来越奇怪、越来越不正常。最后必须变得极其恐怖；就像直接从一部恐怖片里搬出来的场景。」*

这个产品兜售的是「静止」，但网页本身却要求你必须「不停向下滑动」才能读完。整个体验都建立在这条悖论上——越往下滑，幽默感越少，直到彻底失控。

内置 **中文 / 英文** 双语切换（位于顶部导航栏），默认根据浏览器语言自动匹配。

---

## 一个概念，两个品牌

英文版品牌名为 **STILL**，全篇压在这一个词的双重含义上：既是 *Sit still*（安静坐好），也是 *Still here*（还在这儿）。

中文里没有能同时接住这两层意思的对应词，因此中文版不是英文的翻译，而是同一款产品在中文世界里的另一张皮：**常住**。

- 在前半程，「常住」取自禅修语境里的「安住当下」，克制、温和，像任何一款审美在线的冥想应用；
- 到最后一幕，它的字面意思显露出来——**「你还住在这儿。」** 页脚版权也随之变成 `© 留下来常住`。

所有文案集中在 `i18n.js` 中，切换语言时会连同当前滚动深度、动态计数标签、终端打字机与文字侵蚀状态一起实时重算。

## 下潜八幕

| 阶段 | 区块 | 发生了什么 |
| :---: | :--- | :--- |
| **0** | 首屏 Hero | 干净、温暖、毫无破绽的极简落地页。屏幕偏右上角有一个 2px 的反色微点，很容易被当成灰尘忽略——但它全程不会消失。 |
| **1** | 练习方式 | 三张卡片：放下、收神、安住。第二张卡片写着「没有第三步」，而旁边的第三张卡片在停顿近一秒后，会自己浮现出第二句话。 |
| **2** | 实时记录 | 看似全网累计静坐分钟数的大号计数器，实际上**只有在你滑动页面时才会往上跳**——它记的是你的滑动。 |
| **3** | 用户回响 | 前两条是正常的失眠与专注评价；后两条的时间戳是**你打开网页前两分钟与刚刚**，内容会根据你当前的**昼夜时段与手机/电脑设备**实时描写屏幕前的你。从这里开始，静止、切屏、复制文字都会惊动页面。 |
| **4** | 获取方式 | 永久免费，右下角浮现伪装成冥想白噪音的 `环境音` 按钮。此时浏览器右侧滚动条已经滑到 **90% 接近见底**——继续往下滑，深渊静默展开，滚动条滑块会接连缩水并往回弹跳三次。 |
| **5** | 崩塌 | 纸色变灰，画面轻微失准偏斜，四句话随滚动逐行浮现且永不退回。《服务条款》被静默篡改；此时若想向上滚回安全区，**上滑滚轮会像陷进泥潭一样沉重**，且顶部的三张温和卡片已在背后全部变脸。 |
| **6** | 暗室 | 灯光熄灭，鼠标指针消失，暗处浮现一道静止的人影。终端逐字打出你实际滑过的像素数，并与最初锁住时的页面真实总高度对比——*「多出来的这一截，你滑进什么地方了。」* |
| **7** | 黑镜 | 先是 `好了，别再滑了。`，随后变成 `你还住在这儿。`。紧接着背景沉入 `#000000` 绝对纯黑，屏幕变成一面反光的黑镜子，中央浮现极暗的 11px 小字，诱导你把脸凑近屏幕看清倒影。 |
| **8** | 终幕 | 就在你凑近辨认小字与屏幕反光时，环境音与心跳骤然掐断一拍——随后贴脸频闪与尖啸炸开。一切归于死寂后，黑暗里的那道人影依然站在原处。 |

## 核心机制细节

- **非欧空间滚动条与像素谎言**：页面加载时底部三幕处于折叠锁定态，浏览器原生滚动条看起来就像一页普通的五屏营销页（约四千多像素）。滑入第四幕后深渊分三次向下延伸：视口画面零跳动，但右侧滚动条滑块会眼睁睁往回跳三次；第六幕终端报出的「页面总长度」正是最初未展开时的真实像素高度。
- **零权限环境感知**：无需申请任何敏感权限，利用本地时钟、视口与指针特征识别「深夜刷手机」或「坐在显示器前」，动态改写第三幕的无署名评价。
- **中英文各自独立的文字侵蚀**：从第三幕起，文字开始按确定性随机种子发生微妙异变（往回滑看到的损坏位置保持一致）。英文将拉丁字母偷换为西里尔同形字母（`a → а`、`o → о`）；中文则将汉字替换为笔画轮廓极近的诡异形近字（`人 → 入`、`自/日 → 目`、`话 → 活`、`睡 → 瞳`、`眼 → 眠`、`天 → 夭`）。
- **静止检测**：既然产品叫你「别动」，在 3–5 幕如果真的停下鼠标和滚轮满 25 秒，屏幕底部会浮现低语：`手停下来了？` → `别动，呼吸放轻一点。` → `保持住……它快看清你了。`
- **切屏追踪（`visibilitychange`）**：滑入深处后如果切去别的浏览器标签页，原标签页标题会轮播 `别切走` → `切走也没用` → `我还在这儿等你`；切回来的瞬间，页面会自己往下多滑一小截。
- **剪贴板污染（`copy`）**：在中后段选中文字复制给朋友时，剪贴板内容会被夹带私货或整段替换为邀请语与当前网址。
- **不可逆的会话记忆**：滑过 86% 或触发终幕后刷新页面，首屏不再是温和的邀请，而会直接质问 `你又回来了` / `它还没走`。关闭标签页才会彻底重置。
- **纯 WebAudio 合成音效**：全站除两张 AI 生成的暗部人影与贴脸图（`assets/figure.jpg`、`assets/face.jpg`，均非真实人物照片）外无任何媒体文件。双正弦差频低音嗡鸣、滤波气流白噪、随深度不断加速的心跳以及终幕尖啸，全部由浏览器 WebAudio API 实时合成。

## 本地运行与部署

纯原生 HTML + CSS + JavaScript，零外部依赖，无需构建打包。

```sh
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

可直接原样部署至 GitHub Pages、Netlify、Vercel 或任意静态文件服务器。

---

<a id="english"></a>

## English

[中文](#top-zh) · **English**

> Sit still. We'll do the rest.

Built by **ds4.1flash1017** and **gemini4carbon** — `ds4.1flash1017` built the initial skeleton and core prototype; `gemini4carbon` handled the Chinese rewrite, code refactoring, and horror mechanics expansion.

A landing page for a minimalist meditation app. It behaves like a normal marketing site for about ninety seconds.

The product is stillness. The page requires you to keep moving to read it. That is the whole premise, and it stops being funny the further down you go.

Ships in **Chinese and English** (toggle in the top navigation bar).

### Two brands, one joke

The English brand is **STILL**, leaning on one word doing two jobs: *sit still*, and *still here*. Chinese has no single-word equivalent, so the Chinese version isn't a literal translation — it is the same product sold by a twin company: **常住** (*to abide / reside permanently*). What reads like serene Buddhist mindfulness copy at the top lands on *「你还住在这儿。」* (*You still live here.*) at the bottom.

### The descent

| # | Section | What it does |
| :---: | :--- | :--- |
| **0** | Hero | Clean, quiet, plausible. There is a two-pixel inverted dot in the upper-right field. Easy to miss; never leaves. |
| **1** | The method | Three cards. Card two says there is no third step; card three has a second line that arrives a beat too late. |
| **2** | In practice | A live counter that only climbs while you scroll — because it is counting your scrolling. |
| **3** | Voices | The last two testimonials carry live timestamps from moments ago and adapt to your device and time of night. Stopping, copying text, or switching tabs from here on all provoke a response. |
| **4** | Access | Free forever. Your native scrollbar reaches ~90% at the bottom — then snaps backward three times as the abyss unfolds beneath you. |
| **5** | Collapse | The paper goes grey and off-register. Pulling upward turns heavy like mud, and the three calm method cards above rewrite themselves behind your back. |
| **6** | The room | The lights go out, the cursor vanishes, and a terminal types out the pixels you scrolled versus the initial height of the marketing page. |
| **7** | Black mirror | `You can stop now.` → `Still here.` Then pure `#000000` black glass asks you in tiny dim type to lean closer and look behind your reflection. |
| **8** | End | Right as your eyes focus on the glass, audio cuts out for one beat — then the frame shakes and fills with a face. |

### Build

Plain HTML, CSS, and JavaScript. No build step, no dependencies.

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

Deploys as-is to GitHub Pages, Netlify, or any static host.
