---
title: DeepSeek Harness插件手记
published: 2026-08-28
description: '本文记录了我为 DeepSeek Harness（DSH）开发划词工具栏插件 dsh-selection-toolbar 的过程：在会话中划选文本即可唤出复制、引用、询问、解释、翻译、总结等操作，并重点介绍了灵感来自 Claude Code 的 /btw「顺便问」功能——一个不进入对话历史、不打断主任务、即用即弃的悬浮侧问区。文章涵盖它解决的痛点、使用方式、上下文预算与「不进入对话」的架构设计原理、插件设置项，以及其他工具栏功能的介绍与从 GitHub 安装上手的完整步骤，并附有功能演示截图。'
image: 'https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828164607609.png'
tags: [DeepSeek Harness 插件]
category: 'LLM'
draft: false 
lang: 'zh'
---

# 前言

DeepSeek Harness从发布至今已经有有一段时间了，也读了一些 DSH 的解析文章，非常认同「一切皆插件」的观点，提出的两种可结合性：空间可组合性和时间可组合性。

​	**空间可组合性：谁依赖谁，由系统管理**

​	**时间可组合性：插件离开时，撤销它留下的改变**。

让我在使用 DSH 的时候感受到了强大，等后续再细细研究整个框架，深入看懂Deepseek Harness 后再考虑要不要写一遍博客记录下。



这周我在用DSH 为插件添加功能的时候，它已经跑了 18 分钟。

在它进行任务的时候我想在会话窗口仅仅询问下进度或者让它回答我小小的疑惑——

但我没敢。

不是不知道答案会是什么，是**问了怕打断**。主任务排着队呢；等我问完，agent 也回完了，事后还要回头把想问的的内容**从对话历史里再手动挑出来**。

想插话、又怕污染主线——这种憋屈，用 AI 写代码的人都懂。

所以做了个划词工具栏。划一下，工具栏浮上来，几个按钮。其中最常用的不是翻译、不是总结，是一个叫 **`/btw`** 的"顺便问"。



# /btw



它来自 Claude Code。灵感同源，做法不同——子 agent 是派出去干活的，`/btw` 是扭头问同桌的。因为之前 Claude code 用/btw比较多，因此我想要不要也把我的**[dsh-selection-toolbar](https://github.com/suiyideali/dsh-selection-toolbar)** 也添加个同样的功能，于是设计了下。



灵感来自 Claude Code 的 `/btw`——「子代理的反面」：子代理替你**做事**， `/btw` 只替你**看一眼**。它不占对话、不动任务，是悬浮在主任务旁边的 一块便签式问答区。



## 解决的痛点

- **划词杂问不想污染主线**：看到一段看不懂的术语、报错或日志，顺手问一句， 但不想让这条「顺便一问」混进对话历史、干扰后续任务的上下文。
- **任务执行中随时插问**：agent 正在跑长任务，你盯着中间输出想问 「这一步为什么这么做？」——侧问走独立路由，不排队、不插话、不打断 主任务，问完即止。
- **即用即弃的轻量问答**：答案只活在弹窗里，关闭后仅剩一条本地历史， 不产生任何会话副作用。

## 使用方式

1. 划选一段文字（它就是侧问的「划选内容」，会随问题一起交给模型）。

   比如，划选回复里的任意一句：

   ![image-20260828162727886](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828162734496.png)

   

2. 点击工具栏的 **/btw**——按钮行原地切换为侧问控制台。

3. 输入问题，回车发送；等待时显示脉冲动画，可随时「取消」。

4. 答案就地渲染（支持代码块、加粗、列表），可 **复制** 原始 markdown、 **再问一个** 或 **清空历史**。

   ![image-20260828162836846](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828162849767.png)

   ​	![image-20260828162905314](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828162905348.png)

5. 翻看之前的侧问：输入态点击历史条目（或空输入按 ↑）；回答态直接按 ↑。 ↑/↓ 切换条目，Backspace / Esc 返回最新；历史只读，只能整体清空。

   ​	![image-20260828163417115](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828163417143.png)

6. Esc、点击遮罩或弹窗外，随时关闭；再次划词点 /btw 即可重开。

   

## 它知道什么

侧问只看到三样东西：**最近 N 条会话内容**（N 即设置里的「侧问上下文条数」， 5–50、默认 20；自动注入，无需任何勾选）+ **你划选的内容** + **你的问题**。 没有工具、不能联网、不能读文件；答案若不在给定内容里，模型会直说 「当前会话内容里没有」而不是编造。答案下方的统计行显示实际注入了多少 上下文（条数 + 字数），注入为空时明确警示——不让你对着一个「没读过 上下文」的答案猜原因。

## 设计原理

- **「不进入对话」由构造保证**：host 半端收到请求后，读一次会话日志、 序列化、发起一次性的 `llm.stream` 调用，把完整答案原路返回。全程不创建 会话、不写任何消息、不注册任何工具——侧问在主线上的存在感是零。
- **静态 bundle 的约束倒出的架构**：静态插件包没有动态插件那套 package-private host RPC，所以 host 半端用 `webServer` 注册精确路由 `POST /plugins/dsh-selection-toolbar/btw`，client 同源 fetch、JSON 往返 （细节见「架构说明」）。
- **上下文有预算**：条数（5–50 可调）与字符（24k）双预算、逐条截断、 超出折叠为一条省略标记——长会话里侧问也不会悄悄烧掉大量 token。
- **阅读不被打扰**：`position: fixed` 居中模态，滚动既不移动也不关闭它； 输入/等待态高度紧凑自适应，阅读与翻历史时锁定 440×480，翻不同长度的 记录不跳版。
- **失败可见**：服务缺失、会话读不到、模型失败、120s 超时等错误都以 可读文案显示在弹窗内，且不会弄丢你已输入的问题。

## 设置

插件会出现在 **设置 → 插件 → 插件列表**，是与内置 终端 / 网页搜索 同款的 原生风格折叠卡片，包含：

- 弹窗出现延时——选中后延迟多久弹出（0–500 ms）
- 功能开关——可逐个开关工具栏按钮（复制 · 引用 · 询问 · 解释 · 翻译 · 总结 · /btw），关闭的按钮会立即从弹窗消失；「全部开启」一键恢复
- 答案去向——逐个动作选择「进主线」（原行为，作为消息进入当前对话）或 「走侧问」（走 /btw，答案只显示在弹窗）
- 侧问上下文条数——顺便问携带的最近消息条数（5–50，默认 20）
- 恢复默认——重置所有选项

选项保存在浏览器（localStorage），对弹窗即时生效，无需刷新。

![image-20260828163452056](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828163452085.png)

# 除了 btw 还有

在 DeepSeek Harness 会话里划选文本，选区上方浮现一个小工具栏： **复制 · 引用 · 询问 · 解释 · 翻译 · 总结 · /btw**。

## 引用

选中文本以 markdown 引用块（`> …`）插入输入框光标处；多段落时只有内容行带 `> `，空行保持空白（连续空行折叠为一），不会出现一整片孤立的 `>`。

![image-20260828163716475](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828163716513.png)



## 询问

会直接打开内联输入框，回车发送「你的问题 + 选中文本」；留空直接发送原文。



![image-20260828163809340](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828163809371.png)

## 解释

会有提示：发送「请解释下面这段内容：」+ 选中文本。

![image-20260828163908866](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828163908901.png)



## 翻译

发送「请把下面这段内容翻译成中文：」+ 选中文本。

![image-20260828163946227](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828163946256.png)



## 总结

发送「请用简洁的语言总结下面这段内容：」+ 选中文本。

![image-20260828164027563](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images20260828164027600.png)

# 如何上手

项目地址：https://github.com/suiyideali/dsh-selection-toolbar

从 GitHub：

```
dsh plugin --profile web add github:suiyideali/dsh-selection-toolbar
```

或本地 checkout：

```
cd dsh-selection-toolbar && pnpm install   # 或：npm install
dsh plugin --profile web add /path/to/dsh-selection-toolbar
```

host 半端依赖 `@deepseek-ai/dsh-settings` 与 `@deepseek-ai/schemastery` （已在 `package.json` 声明），从本地路径安装前请先装好 checkout 的依赖； 从 GitHub 安装会自动解析这些依赖。

装完后重启 web 应用以加载新的 client bundle。
