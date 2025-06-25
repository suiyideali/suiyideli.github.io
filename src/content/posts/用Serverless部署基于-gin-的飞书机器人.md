---
title: 用Serverless部署基于 gin 的飞书机器人
published: 2023-09-05 16:36:31
category: 杂谈
tags: [飞书 Go 机器人]
---

## 1. 使用环境

- Serverless 包管理平台： http://www.devsapp.cn/details.html?name=start-feishubot
- Github：https://github.com/Leizhenpeng/start-gin-feishubot
- 阿里云云函数：https://common-buy.aliyun.com/package?planCode=package_freetierfc_cn
- 飞书开放平台：https://open.feishu.cn/



## 2. 部署方法

访问 Serverless 包管理平台 或者 github

找到部署&体验

![部署&体验](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637912.png)

### 2.1  通过Serverless Devs Cli 部署

参照

https://docs.serverless-devs.com/serverless-devs/install

如果安装成功可以看到相对应的版本信息

![安装Serverless Devs](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637948.png)

- 初始化项目

  ```
  s init start-feishubot -d feishubot
  ```

![初始化项目](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637994.png)

- 进入项目，修改[飞书机器人配置](https://open.feishu.cn/app?lang=zh-CN)

  ```bash
  cd feishubot/code && vim feishu_config.yaml
  ```

将飞书开发平台中 App ID 和 App Secret 填入feishu_config.yaml

![凭证](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637979.png)

然后进入开发者配置-事件订阅；将Encrypt Key 和 Verification Token 也填入feishu_config.yaml

![事件订阅](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637988.png)

- 项目部署发布：

  ```bash
  s deploy -y
  ```

  - 如果出现以下超时错误， 在go env中设置GOPROXY为国内镜像,例如:

    ```bash
    go env -w GOPROXY=https://goproxy.cn,direct
    ```

    

    ![超时错误](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637021.png)

  ![无网络超时](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637552.png)

- 获取部署链接后，将`__PUBLIC_URL__/webhook/event`  domain 配置到飞书机器人事件订阅中，即可体验计算器机器人

  ![部署完成](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637606.png)

![配置请求地址](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637664.png)

## 3 飞书群聊上线机器人

### 3.1   在飞书开放平台发布

成功部署后，需要在飞书开放平台发布，以下是成功发布

![发布](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637722.png)

飞书开发小助手也会提示

![飞书开发小助手](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637764.png)

### 3.2 设置群聊机器人

在群聊中添加机器人，选择已经发布的机器人

![选择机器人](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637786.png)

到这一步，机器人就创建完成

![机器人测试](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309051637142.png)

