---
title: 为你的xray部署反连平台
published: 2023-11-29 12:17:42
category: 安全工具
tags: [Xray 安全工具]
description: '此篇博文记录博主部署Xray反连的过程以及踩坑点。大致流程参照xray官方文档以及互联网文章'
---

## 反连平台的作用

在平日的漏洞挖掘或者攻防对抗中，遇到诸如log4j rce、fastjson、ssrf、命令执行等没有回显的时候，这个时候dnslog平台这种反连平台就起到了作用，通过让目标执行`ping`、`curl`等命令，对反连平台发起请求，反连平台在接受到请求后，就能告诉我们，命令触发了，也就代表了漏洞存在了。 Xray也内置了反连平台，此篇博文记录博主部署Xray反连的过程以及踩坑点。大致流程参照xray官方文档以及互联网文章，如有错误可在此篇博文评论留言。

## 搭建前的准备

- 一台服务器（博主本人用的Ubuntu）
- 一个域名
- Xray

### 服务器安全组设置

修改安全组策略，开启53端口（⚠️**注意**，协议类型一定要是**UDP**）

修改安全组策略，开启反连平台的端口，如8888等（⚠️**注意**，协议类型一定要是**TCP**）

![修改安全组策略](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311291546528.png)

### 解决53端口占用

使用以下命令确认端口占用情况

``` bash
 sudo netstat -nultp
```

在确认被占用后，可以执行如下命令停用

```bash
systemd-resolved`sudo systemctl stop systemd-resolved
```

编辑resolved.conf 

```bash
sudo vim /etc/systemd/resolved.conf
```

取消DNS的注释，填写云服务器公网IP

取消DNSStubListener的注释，将值改为no

如下：

```tex
[Resolve]
DNS=x.x.x.x         #取消注释，增加dns，此处的值可以填写你的云服务器公网IP
#FallbackDNS=
#Domains=
#LLMNR=no
#MulticastDNS=no
#DNSSEC=no
#DNSOverTLS=no
#Cache=no-negative
DNSStubListener=no    #取消注释，把yes改为no
#ReadEtcHosts=yes
```

修改完后执行以下命令，即可解除占用

```bash
sudo ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf
```

![解除53端口占用](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311291551473.png)

### 域名的配置

为了**支持http/rmi/dns的反连**，进行以下配置

⚠️ 踩坑点：如果域名是在国内域名提供商注册的，服务器最好也是国内的，这样域名解析会正常，博主本人最开始用国内域名+国外服务器，导致域名解析不正常，dns或者rmi无法使用。需要注意。

1. **自定义DNS Host**

   DNS服务器为主机记录和你的域名，如: ns1.domain.com ，IP地址为你的云服务器IP

![自定义DNS](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311291640847.png)

2. **设置域名解析记录**

   记录值为你的云服务器IP

   ![设置域名解析记录](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311291645297.png)

3. **修改DNS服务器**

   ![修改DNS服务器](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311291647842.png)

## 部署反连平台

博主这里使用的独立远程服务端

### 远程服务端

**服务端xray的配置文件reverse如下**

```yaml
reverse:
  db_file_path: "reverse.db"                      # 反连平台数据库文件位置, 这是一个 KV 数据库
  token: "1qaz@WSX"                             # 反连平台认证的 Token, 独立部署时不能为空
  http:
    enabled: true
    listen_ip: 0.0.0.0 
    listen_port: "8888"
    ip_header: ""                       # 在哪个 http header 中取 ip，为空代表从 REMOTE_ADDR 中取
  dns:
    enabled: true
    listen_ip: 0.0.0.0 
    domain: "your_domain"                          # DNS 域名配置
    is_domain_name_server: true        # 是否修改了域名的 ns 为反连平台，如果是，那 nslookup 等就不需要指定 dns 了
    resolve:                            # DNS 静态解析规则
    - type: A                           # A, AAAA, TXT 三种
      record: localhost
      value: 127.0.0.1
      ttl: 60
  client:
    remote_server: false                # 是否是独立的远程 server，如果是要在下面配置好远程的服务端地址
    http_base_url: "http://your_vps_ip:8888"                   # 默认将根据 ListenIP 和 ListenPort 生成，该地址是存在漏洞的目标反连回来的地址, 当反连平台前面有反代、绑定域名、端口映射时需要自行配置
    dns_server_ip: "your_vps_ip"                   # 和 http_base_url 类似，实际用来访问 dns 服务器的地址
```

⚠️ 需要注意填写位置：

```
db_file_path: 此处填写你要命名的kv数据库，如test.db
token: 为你连接反连平台的认证
enabled: 服务端需要设置的有 http、dns；客户端配置文件此处设置为false就行
http_base_url: 你的云服务器加端口号，端口号为listen_port
dns_server_ip: 你的云服务器IP
```

### 客户端

**客户端xray的配置文件reverse如下**

```yaml
reverse:
  db_file_path: ""                      # 反连平台数据库文件位置, 这是一个 KV 数据库
  token: "1qaz@WSX"                             # 反连平台认证的 Token, 独立部署时不能为空
  http:
    enabled: false
    listen_ip: 0.0.0.0 
    listen_port: ""
    ip_header: ""                       # 在哪个 http header 中取 ip，为空代表从 REMOTE_ADDR 中取
  dns:
    enabled: false
    listen_ip: 0.0.0.0 
    domain: ""                          # DNS 域名配置
    is_domain_name_server: false        # 是否修改了域名的 ns 为反连平台，如果是，那 nslookup 等就不需要指定 dns 了
    resolve:                            # DNS 静态解析规则
    - type: A                           # A, AAAA, TXT 三种
      record: localhost
      value: 127.0.0.1
      ttl: 60
  client:
    remote_server: true                # 是否是独立的远程 server，如果是要在下面配置好远程的服务端地址
    http_base_url: "http://your_vps_ip:8888"                   # 默认将根据 ListenIP 和 ListenPort 生成，该地址是存在漏洞的目标反连回来的地址, 当反连平台前面有反代、绑定域名、端口映射时需要自行配置
    dns_server_ip: "your_vps_ip"                   # 和 http_base_url 类似，实际用来访问 dns 服务器的地址
```

⚠️ 需要注意填写位置：

```
enabled: 设置为false就
client: 因为是独立的远程server 所以 remote_server 的值需要为true
http_base_url: 你的云服务器加端口号，端口号为listen_port
dns_server_ip: 你的云服务器IP
```



至此，服务端和客户端的配置文件已改好。



##  测试部署效果

在服务端启动以下命令

```bash
xray_linux_amd64 reverse
```

![启动xray resverse](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311291711359.png)

访问webUI后的链接即可访问到反连平台，输入你的token值

![登录反连平台](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311291712676.png)

可以生成url或者域名

![生成url或者域名都可](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311291713654.png)

### fastjson漏洞测试

靶场：vulfocus的fastjson 代码执行 （CNVD-2019-22238)

1. 启动远程服务端

2. 使用客户端对目标进行扫描

   ```bash
   ./xray_linux_amd64 ws --plug fastjson --url http://123.58.224.8:32636/
   ```

   ![测试结果](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311291718568.png)

   

## 对接飞书实现自动告警

这点官方文档上面写的是对接Server 酱 和 企业微信，博主喜欢用飞书，于是就在官方的demo上修修改改，对接了飞书自动告警

效果如下：

![飞书机器人](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311301719658.png)

参照官方文档的demo如下

```python
from flask import Flask, request
import requests
import datetime
import logging

app = Flask(__name__)


def push_feishu_group(content):
    resp = requests.post(
        "https://open.feishu.cn/open-apis/bot/v2/hook/{飞书机器人webhook的token}",
        json={
            "Content-Type": "application/json",
            "Charset": "UTF-8",
            "msg_type": "text",
            "content": {"text": f"xray 发现了新漏洞 \n{content}"},
        },
    )
    if resp.json()["errno"] != 0:
        raise ValueError("push wechat group failed, %s" % resp.text)


@app.route("/webhook", methods=["POST"])
def xray_webhook():
    data = request.json
    typed = data["type"]
    if typed == "web_statistic":
        return "ok"
    vuln = data["data"]
    content = """

url: {url}
plugin: {plugin}
create_time: {create_time}

""".format(
        url=vuln["detail"]["addr"],
        plugin=vuln["plugin"],
        create_time=str(datetime.datetime.fromtimestamp(vuln["create_time"] / 1000)),
    )
    try:
        push_feishu_group(content)
    except Exception as e:
        logging.exception(e)
    return "ok"


if __name__ == "__main__":
    app.run()

```

### 使用方法

服务器启动一个screen

```bash
screen -S feishu
```

python 运行脚本

```bash
python3 feishu.py
```

![运行脚本](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311301725831.png)

运行xray即可

```
./xray_linux_amd64 ws -u http://testphp.vulnweb.com  --wo http://127.0.0.1:5000/webhook
```

![漏洞结果](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311301729767.png)

脚本也能看到请求

![脚本接收到的请求](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202311301729691.png)



## 参考来源

1. [如何部署xray反连平台 - xray 安全评估工具文档](https://docs.xray.cool/#/scenario/reverse)
2. [xray三周年系列教程｜如何部署反连平台并编写POC_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1ED4y1v7NK/?vd_source=1ce79553d9a3c0c79cf53797a5c70476)
3. [Xray-反连平台搭建_xray反连平台-CSDN博客](https://blog.csdn.net/qq_38963246/article/details/116712362)
4. [自定义机器人使用指南 - 开发指南 - 开发文档 - 飞书开放平台 (feishu.cn)](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)
