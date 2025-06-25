---
title: 开源SOAR的初探
published: 2024-04-11 01:35:19
tags: [SOAR]
category: 企业安全建设
description: '最近工作涉及安全运营方面，工作中了解到SOAR，恰巧又看到了OctoMation的SOAR，于是想着在网上搭建一套自己捣鼓下。'
---

# 1.前言

最近工作涉及安全运营方面，工作中了解到SOAR，恰巧又看到了[OctoMation](https://github.com/flagify-com/OctoMation) SOAR，于是想着在网上搭建一套自己捣鼓下。

阿里云高校计划，可以领300无门槛优惠券，白嫖一波走起。

![300元无门槛优惠券](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404110138324.png)

直接白嫖一个月

![0元付](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404110139895.png)

# 2. 相关硬件软件

1. [OctoMation](https://github.com/flagify-com/OctoMation/wiki)

2. [雷池 WAF 社区版 | 下一代 Web 应用防火墙 | 免费使用](https://waf-ce.chaitin.cn/)

3. [反制溯源*欺骗防御*主动防御-HFish免费蜜罐平台](https://hfish.net/#/)

4. [阿里云服务器](https://www.aliyun.com/minisite/goods?userCode=ul6lrvey)

   

# 3. SOAR 搭建

参考[OctoMation安装部署手册](https://github.com/flagify-com/OctoMation/wiki/OctoMation%E5%AE%89%E8%A3%85%E9%83%A8%E7%BD%B2%E6%89%8B%E5%86%8C)进行搭建

## 3.1 操作系统及软件要求

- 操作系统：**Redhat/Centos 7.8+/8+(9以下) OpencloudOS7/8**
- Docker版本：不低于20.10.12
- Docker-compose版本：1.29.2（最优）
- `swap`分区空间不少于8GB
- 系统防火墙`firewalld`需要处于运行状态
- **系统umask必须为022**

## 3.2 安装方式

笔者这里使用的大文件，离线安装（这也是官方推荐的安装方法）

下载安装文件后，然后以`root`身份执行离线安装脚本

```bash
# 以root身份执行离线安装脚本
chmod +x octomation_community_docker_install_offline_<VERSION>.sh
./octomation_community_docker_install_offline_<VERSION>.sh
```

这里安装时间比较长，可以使用screen，安装完毕如下

![安装完成](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404112031772.png)

## 3.3 登录web管理界面

安装完成后，使用web浏览器访问https://<OCTOMATION_SERVER_IP> 进行登录，登录页面如下：

![web登录页面](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404112033336.png)

## 3.4 剧本Playbook

官方项目上有相关的OctoMation剧本包 ➡️[OctoMation剧本包](https://github.com/flagify-com/OctoMation/blob/main/Playbook%20Packages/PlaybookPackages.md)

以及 APP包

![社区Playbook](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404122332285.png)

导入社区剧本和APP

![剧本](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404122354944.png)

APP

![APP](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404122354863.png)



## 3.5 剧本尝试

导入了社区中的剧本，发现可以在“IP信息增强”剧本上进行调整更改

![IP信息增强](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404130229937.png)

笔者在原有的基础上添加了协同办公-钉钉，并且做了简单测试

![添加钉钉通知](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404130230524.png)

作战室执行结果

![作战室执行结果](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404130240615.png)

钉钉接收到的测试消息

![钉钉消息](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404130241546.png)

# 4. 蜜罐搭建

笔者这里为了方便，试用docker安装

```bash
docker run -itd --name hfish \
-v /usr/share/hfish:/usr/share/hfish \
--network host \
--privileged=true \
threatbook/hfish-server:latest

```

正常情况下返回如下内容

![docker方式安装hfish](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404130226769.png)

以root权限运行以下命令，确保配置防火墙开启TCP/4433、TCP/4434

⚠️ 笔者踩的坑，没有在防火墙开启端口，所以一直无法访问到web界面

```bash
firewall-cmd --add-port=4433/tcp --permanent   #（用于web界面启动）
firewall-cmd --add-port=4434/tcp --permanent   #（用于节点与管理端通信）
firewall-cmd --reload
```

![蜜罐web页面](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404132133914.png)

# 5. 蜜罐+SOAR联动

思路：

蜜罐获取到攻击IP通过syslog发送到SOAR，通过SOAR进行剧本编排发送到飞书



## 5.1 流程图

![流程图](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404151821064.png)

## 5.2 开启四个web蜜罐

1. Coremail仿真登陆蜜罐
2. 通达OA系统仿真登陆蜜罐
3. 齐治堡垒机仿真登陆蜜罐
4. Weblogic蜜罐

![开启web蜜罐](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404150404309.png)

## 5.3 新建一个事件类型

登录OctoMation后台，访问到【事件管理】｜【事件类型】，点击【新建】即可创建新的事件类型。勾选【是否自动执行剧本】，选择【IP信息增强】

![新建事件类型](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404162130227.png)

## 5.4 通过Kafka接收外部事件

### 5.4.1 事件接入添加

登录OctoMation后台，进入【事件管理】｜【事件接入】菜单，新建接入规则。填写勾选基础信息，包括：

- 配置名：HONEYPOT_SIEM_ALERT
- 描述：SIEM蜜罐事件接入
- 接入方式：SYSLOG
- 协议：31514（这里的端口和蜜罐syslog服务器配置的端口一致）
- 勾选转发到KAFKA
- 消息队列：SIEM_HONEYPOT_ALERT
- 服务器：172.19.129.151:9092

![事件接入添加](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404162141817.png)

### 5.4.2 示例事件

选择Grok正则表达式方式识别。在输入框填写一段日志样本，样本可以选择来自于蜜罐【系统配置】| 【通知配置】中【syslog告警示例】：

![syslog告警示例](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404162144232.png)

```
<12>2024-04-16T14:50:44Z mochazz HFish[12]:title: HFish Threat Alert | client: linux64测试机 | client_ip: 192.168.110.110 | class: 基础服务 | type: SSH | name: SSH蜜罐 | src_ip: 141.98.81.141 | src_port: 35635 | dst_ip: 192.168.110.110 | dst_port: 22 | geo: 美国/加州/堪萨斯 | labels: Scanner,Botnet | time: 2021-10-16 13:37:15 | info: root&&123456
```



当然也可以选择kafka收到的告警日志。

### 5.4.3 事件字段提取与映射

点击【下一步】进入Grok正则匹配和字段映射，为了快速看到效果，此处选择【手动编辑】。根据本条告警事件类型所需要关注的信息字段。这里可以自己自定义提取。笔者手动用鼠标选取一个或多个值新建字段。具体操作可以查看官方的wiki。

![提取规则](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404171130271.png)

### 5.4.4 关联事件类型

进入规则设置页面，此处针对已经格式化后的事件信息字段进行规则判断，以确定事件对应的事件类型。点击【新建关联规则】

![新建关联规则](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404162207126.png)

1. 设置条件
2. 执行结果的事件类型名称设置为**SIEM告警的蜜罐攻击事件**，剧本所需字段需要选择日志字段中的Attacklp

![编辑规则](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404171131458.png)

### 5.4.5 蜜罐告警的测试

在蜜罐发送一个端口测试：

![端口测试](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404162252575.png)

查看【事件列表】发现测试的事件已经生效。说明syslog和kafka接受日志都正常。

![测试事件](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404162252934.png)

如果发现事件列表无数据，可能需要排查下kafka是否有接收到日志

![kafka日志](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404171118190.png)

### 5.4.6 模拟一个蜜罐攻击看效果

1. 访问web蜜罐，如weblogic管理界面

   ![weblogic蜜罐](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404171125605.png)

2. 查看事件列表

   ![事件列表](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404171127002.png)

3. 查看飞书告警

   ![飞书告警](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404171128147.png)



# 6. 踩坑点的总结

1. OctoMation已经自带了kafka和syslog了，不用自己再安装了。笔者看wiki的时候没注意，花了一段时间捣鼓kafka和syslog。不过还算是熟悉了下kafka和syslog的基本使用了
2. 蜜罐在配置通知处的syslog服务器配置修改端口后，一定记得在告警策略一定记得勾选Syslog服务器，一定记得！！ 因为更换端口后，告警策略处的☑️syslog服务器的位置会默认取消掉！为此我花了1个小时排查，最开始以为是syslog和kafka出问题了，后来发现更改端口后，会自动取消勾选！！很多时候不经意的改动，最后排查起来会话费成倍的时间！
3. 遇到问题，弄不明白的时候一定记得记得看官方的文档wiki....而且要仔细看和推敲。不仅能提高效率还能走避免走好多弯路。



# 7. 番外记录

以下内容中的配置因为部分原因在SOAR的应用中没有使用到，具体原因相应位置有写明。 仅本次blog的记录。

##  7.1 SOAR+阿里云云防火墙实现自动封禁

直接试用 云防火墙 500元 1000GB

![阿里云WAF试用](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404122323776.png)



![试用云防火墙](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404122335275.png)

###  7.1.1  放弃的原因

1. 阿里云云防火墙（简称云防火墙）和阿里云web应用防火墙（简称阿里云waf）是不同的产品

2. 这里是仅免费使用云防火墙，阿里云waf需要购买...就没使用

3. 官方社区没有发布云防火墙的APP，所以没办法使用到...

   

## 7.2 雷池（社区版）+ SOAR

根据[雷池官方文档](https://waf-ce.chaitin.cn/docs/)安装即可

安装后如下

![雷池](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404110232879.png)

将站点添加到雷池，并测试防护效果

![防护效果](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404110239480.png)

### 7.2.1 放弃的原因

雷池的攻击告警和Syslog需要使用到专业版...我的社区版本无法使用syslog发给SOAR，于是放弃。

下面的截图是雷池官方的demo网站。笔者的社区版已经卸载掉了，懒得重新装上去截图....

![雷池系统配置](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404150351736.png)



## 7.3 Rsyslog转发日志到Kafka （⚠️：这里不需要用户安装，系统自带的有syslog和kafka，这就是不认真看官方说明文档的后果....）

笔者这里选择了rsyslog。因为目前只需要基本的日志收集和转发,rsyslog将是一个较为轻量级的方案,对服务器资源要求较低。

1. 安装rsysylog

   ```bash
   yum install rsyslog -y
   ```

2. 修改rsyslog的配置文件/etc/rsyslog.conf,启用接收日志的模块

   ```bash
   $ModLoad imudp  
   $UDPServerRun 514 # 开启UDP 514端口接收日志
   $ModLoad imtcp
   $InputTCPServerRun 514 # 开启TCP 514端口接收日志
   ```

3. 配置日志文件存储路径,例如: 

   ```bash
   $template RemoteHost,"/data/syslog/%$YEAR%-%$MONTH%-%$DAY%/%FROMHOST-IP%.log"
   ```

4. 重启rsyslog服务使配置生效

   ```bash
   systemctl restart rsyslog
   ```

5. 查看rsyslog的运行状态

![rsyslog启动成功](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404140017673.png)

### 7.3.1 配置rsyslog

1. 编辑`/etc/rsyslog.conf`文件,添加以下内容:

   ```tex
   # 加载Kafka输出模块
   module(load="omkafka")
   
   # 设置Kafka代理地址和Topic
   main_kafka.topic="rsyslog" 
   main_kafka.broker="locahost:9092"
   main_kafka.confParam=[\"compression.codec=snappy\"]
   
   # 发送所有日志到Kafka
   *.* action(type="omkafka" topic="rsyslog" broker="locahost:9092" confParam=[\"compression.codec=snappy\"])
   ```

2. 重启rsyslog服务: 

   ```bash
   systemctl restart rsyslog
   ```

   

### 7.3.2 设置syslog服务器配置并测试

在服务器安装好rsyslog后，在蜜罐通知配置处填写服务器的syslog地址，并测试成功

![syslog服务器配置](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404140023424.png)

查看服务器上的syslog日志，也能看到蜜罐的测试消息

![蜜罐测试消息](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404140024182.png)

### 7.3.3 添加告警策略

在系统配置-告警策略处添加将威胁告警发送到syslog服务器。

![添加策略](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404140029004.png)

### 7.3.4 测试攻击看看效果

蜜罐识别到攻击

![蜜罐识别到攻击](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404140039564.png)

rsyslog收到消息，其中src_ip即攻击源IP。

![rsyslog收到消息](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404140041894.png)



## 7.4 kafka

笔者为了方便测试，安装的是docker版本，并且是单节点部署。

这里安装Kafka是为了接收外部事件。

1. 安装并启动Zookeeper容器

   ```bash
   docker run --name zookeeper -p 2181:2181 -d zookeeper
   ```

![安装Zookeeper容器](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404130117339.png)

2. 拉取Kafka镜像

   ```bash
   docker pull wurstmeister/kafka
   ```

![拉取Kafka镜像](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404130122797.png)

3. 启动Kafka容器并链接Zookeeper

   ```
   docker run -d --name kafka --link zookeeper \
       -p 9092:9092 \
       -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 \
       -e KAFKA_ADVERTISED_HOST_NAME=<主机IP> \
       -e KAFKA_ADVERTISED_PORT=9092 \
       wurstmeister/kafka
   ```

​	其中需要替换`<主机IP>`为实际主机IP。这将启动一个Kafka容器,并将其9092端口映射到主机。

4. 验证Kafka版本

   ```bash
   docker exec -it <kafka容器名> /opt/kafka/bin/kafka-topics.sh --version
   ```

5. 进入kafka容器创建一个Topic用于接收日志数据

   请将`<kafka_broker_host>:<kafka_broker_port>`替换为你的Kafka代理的主机名和端口号。

   ```bash
   kafka-topics.sh --bootstrap-server <kafka_broker_host>:<kafka_broker_port> --create --topic rsyslog --partitions 1 --replication-factor 1
   ```

   ![创建一个Topic](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404140107007.png)

6. 验证Topic是否创建成功

   发现rsyslog成功创建

   ```bash
   kafka-topics.sh --bootstrap-server <kafka_broker_host>:<kafka_broker_port> --list
   ```

   ![Topic成功创建](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202404140109526.png)



### 7.4.1 放弃的原因

OctoMation已经自带了kafka和syslog了，不用自己再安装了...直接在SOAR上配置就好了。
