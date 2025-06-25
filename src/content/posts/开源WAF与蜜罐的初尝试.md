---
title: 开源WAF与蜜罐的初尝试
published: 2023-08-29 12:45:24
category: 安全工具
tags: [WAF 蜜罐]
description: '写好的两篇博客忘了备份，结果自己捣鼓来捣鼓去不小心删除掉了....而且我没有保留到回收站的习惯，所以找不回来了，于是重新写吧.....'
---

## 1. 环境准备

写好的两篇博客忘了备份，结果自己捣鼓来捣鼓去不小心删除掉了....而且我没有保留到回收站的习惯，所以找不回来了，于是重新写吧.....

**环境准备：**

- 一台云主机
- 牧云主机管理助手（https://rivers.chaitin.cn/app/collie/home）
- 长亭雷池WAF社区版 （https://waf-ce.chaitin.cn/）
- 开源 HFish 蜜罐 （https://hfish.net/） 

我的部署方式为 SaaS + docker ;  当然也可以用其他方式安装，可以查看官方链接使用相应部署方式

登录牧云主机管理助手（https://rivers.chaitin.cn/app/collie/home），绑定云主机后进入应用市场

![绑定云主机](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/image-20230829132604152.png)

选择雷池社区版安装

![选择雷池社区版](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/image-20230829163030773.png)

根据指引成功安装好WAF，后台web界面如下

![雷池后台界面](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308291654530.png)

安装HFish蜜罐，参考链接 https://hfish.net/#/2-1-docker

安装好后蜜罐web管理页面如下

![蜜罐web管理页面](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308291658603.png)

到这一步，SaaS + docker的WAF和蜜罐已经搭建好。

## 2. 如何让低交互蜜罐变得稍微高可信

由于HFish的开源版本中蜜罐大多数都是低交互的，所以当把IP发给朋友的时候，朋友看到80端口为tomcat的时候，说了句：“这一眼看上去就是蜜罐”。 于是蜜罐 “出师未捷身先死”.... 因此需要将低交互蜜罐做的逼真点。

### 2.1  蜜罐与WAF的配合

#### 2.1.1 缩小蜜罐端口暴露面

HFish有环境模板，尽可能的减少了端口的暴露，使其更像真实环境

![环境模板](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308291758985.png)

随意选择一个模板，在其模板的基础上进行调整。关闭了一些TCP常用端口，比如22、23、445、3389等

然后修改高交互Mysql蜜罐的端口，设置默认3306的话，遇到有经验的攻击者会被识别出为蜜罐。

![开放蜜罐端口](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308291802617.png)

#### 2.1.2 修改相应的特征

#####  2.1.2.1 修改telnet协议特征或者使用高交互的telnet蜜罐

Hfish 中的低交互telnet蜜罐，默认监听在23端口。模拟的该协议默认无需验证，并且对各个命令的结果都做了响应的模板来做应答。在命令为空或者直接回车换行时，会响应default模板，该模板内容为test。因此可以利用这个特征进行该蜜罐在telnet服务上的检测如图所示。

![telnet蜜罐](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309070001860.png)



解决办法：

1. 修改配置文件中的默认模版内容

2. 更换为高交互telnet蜜罐

   ![切换高交互telnet蜜罐](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309070005747.png)

##### 2.1.2.2 修改明显的web特征

HFIsh在默认8080端口实现了一个WordPress登录页面，页面中由一个名为x.js的javascript文件用来记录尝试爆破的登录名密码。直接通过判断wordpress登录页是否存在x.js文件就可判断是否为蜜罐。

![HFish蜜罐](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309070008280.png)

![x.js文件](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309070007634.png)

解决办法：

1. 修改x.js的命名和代码内容
2. 关闭WordPress这个蜜罐，使用其他蜜罐

#### 2.1.3 在部分web蜜罐上设置WAF防护

拿宝塔蜜罐和Zabbix监控蜜罐举例

现在宝塔蜜罐和Zabbix的蜜罐IP为 9224 和 9192

在雷池上设置对宝塔蜜罐和Zabbix蜜罐web页面的防护

**宝塔蜜罐页面的防护设置：**

![宝塔蜜罐的防护](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308291811940.png)

**Zabbix蜜罐的防护设置：**

![Zabbix页面的防护设置](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308291812001.png)

然后分别去访问相应的页面，如：https://<你的域名>:<雷池监听端口>

如果能正常访问，接着测试攻击发现被拦截，即表示两个蜜罐web站点已经被waf防护

![被waf防护的蜜罐web页面](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308291815819.png)

![攻击测试发现被waf拦截](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308291818157.png)

并且蜜罐也成功检测到攻击：

![蜜罐告警](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308291820693.png)

这样的话，攻击者在访问IP的特定web页面的时候发现有WAF，或许在思考自己是否踩中蜜罐的情况下有所迟疑。

**另外**： 

在雷池WAF的 防护配置-语义分析中，可以加将 “机器人检测”设置为仅观察，如果策略太严，FOFA、zoomeye、quake等空间测绘的IP节点也会被WAF拦截，这样的话，蜜罐端口就少了一个暴露方向。

![机器人检测](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309070112823.png)



## 3. 从蜜罐上获取高价值IP

思路如下

![获取思路](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308311848653.png)

### 3.1 对踩中蜜罐的攻击IP进行整理分类

**注意：以下分类仅代表个人观点 ，如有异议，以你为准。**

1. 踩中蜜罐，并且IP的威胁情报为以下的，可直接在WAF侧进行拉黑封禁

   ```tex
   Scanner-扫描
   Botnet-僵尸网络
   uspicious-可疑
   Mobile-移动基站
   ```

   

2. 踩中蜜罐，并且IP的威胁情报为以下的，为高价值IP，可尝试进行反制溯源，需不需要放入WAF黑名单视情况（傀儡机通常会进行大量扫描，也可以拉黑）。

   ```tex
   Spam-垃圾邮件
   Zombie-傀儡机
   Exploit-漏洞利用
   IDC-IDC服务器
   Edu-教育
   BTtracker-BT服务器
   Backbone-骨干网 
   ```

可通过蜜罐的API直接调用，提前需要在 平台管理 ->系统信息 处将 **HFish社区云情报计划** 勾上

![勾选社区云情报计划](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308302211406.png)

然后进入 平台管理 -> 系统配置 -> API配置选择已开放的API，根据使用示例中进行API调用

![API配置](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308302214506.png)



![API的参数说明](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202308302213010.png)

用于在WAF侧进行拉黑封禁的IP，其获取脚本可用

```python
import requests
import json


url = "https://Server_IP/api/v1/attack/ip?api_key=YOUR_API_KEY"

payload = json.dumps(
    {
        "start_time": 0,
        "end_time": 0,
        "intranet": 0,
        "threat_label": [
            "Scanner",
            "Botnet",
            "uspicious",
            "Mobile",
        ],
    }
)
headers = {"Content-Type": "application/json"}

response = requests.request("POST", url, headers=headers, data=payload, verify=False)
print(response.text)
```

获取高价值可溯源反制IP，API脚本可用

```py
import requests
import json


url = "https://Server_IP/api/v1/attack/ip?api_key=YOUR_API_KEY"

payload = json.dumps(
    {
        "start_time": 0,
        "end_time": 0,
        "intranet": 0,
        "threat_label": [
            "IDC",
            "Spam",
            "Zombie",
            "Exploit",
            "Edu",
            "BTtracker",
            "Backbone",
        ],
    }
)
headers = {"Content-Type": "application/json"}

response = requests.request("POST", url, headers=headers, data=payload, verify=False)
print(response.text)
```

后续会在对应的脚本上进行添加功能。

### 3.2 将获取到的IP通过webhook形式发送到飞书

根据之前的脚本进行添加调整，基本的demo已经弄好，如下：

```python
import requests
import json
import re
import logging
import os
import warnings

# 忽略警告
warnings.filterwarnings("ignore")

# 获取当前脚本所在的目录
script_dir = os.path.dirname(os.path.realpath(__file__))

# 设置日志
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# 配置选项
RESULT_DIR = os.path.join(script_dir, "result")

# 检查并创建结果目录
if not os.path.exists(RESULT_DIR):
    os.makedirs(RESULT_DIR)
    
BASE_URL = "https://蜜罐的API链接"  # 此处为蜜罐的API
HEADERS = {"Content-Type": "application/json"}
THREAT_LABELS_ATTACK = [
    "IDC",
    "Spam",
    "Zombie",
    "Exploit",
    "Edu",
    "BTtracker",
    "Backbone",
]
THREAT_LABELS_SCANNER = ["Scanner", "Botnet", "uspicious", "Mobile"]
IP_REGEX_PATTERN = r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"


def fetch_data(payload):
    try:
        response = requests.post(BASE_URL, headers=HEADERS, data=payload, verify=False)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching data: {e}")
        return ""


def match_ips(data):
    return re.findall(IP_REGEX_PATTERN, data)


def find_new_ips(old_ips, new_ips):
    return list(set(new_ips) - set(old_ips))


def write_ips_to_file(file_path, ips):
    with open(file_path, "w") as file:
        file.write("\n".join(ips))


def send_notification(webhook_url, content):
    headers = {"Content-Type": "application/json", "Charset": "UTF-8"}
    message = {"msg_type": "text", "content": {"text": content}}
    response = requests.post(url=webhook_url, headers=headers, data=json.dumps(message))


def main():
    attack_webhook = (
        "https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"  # 接收攻击告警机器人的 webhook
    )
    scan_webhook = (
        "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx"  # 接收扫描告警机器人的 webhook
    )

    payload_attacker = json.dumps(
        {
            "start_time": 0,
            "end_time": 0,
            "intranet": 0,
            "source": 0,
            "threat_label": THREAT_LABELS_ATTACK,
        }
    )
    payload_scanner = json.dumps(
        {
            "start_time": 0,
            "end_time": 0,
            "intranet": 0,
            "source": 0,
            "threat_label": THREAT_LABELS_SCANNER,
        }
    )

    attack_data = fetch_data(payload_attacker)
    scanner_data = fetch_data(payload_scanner)

    attacker_ips = match_ips(attack_data)
    scanner_ips = match_ips(scanner_data)

    attacker_ips_path = os.path.join(RESULT_DIR, "attack_ips.txt")
    scan_ips_path = os.path.join(RESULT_DIR, "scan_ips.txt")

    previous_attacker_ips = []
    previous_scan_ips = []

    if os.path.exists(attacker_ips_path):
        with open(attacker_ips_path, "r") as file:
            previous_attacker_ips = file.read().splitlines()

    if os.path.exists(scan_ips_path):
        with open(scan_ips_path, "r") as file:
            previous_scan_ips = file.read().splitlines()

    new_attack_ips = find_new_ips(previous_attacker_ips, attacker_ips)
    new_scan_ips = find_new_ips(previous_scan_ips, scanner_ips)

    write_ips_to_file(attacker_ips_path, attacker_ips)

    if new_attack_ips:
        logger.info("有憨包踩蜜罐咯，尝试下溯源吧! hacking!")
        logger.info("\n".join(new_attack_ips))
        attack_content = "有憨包踩蜜罐咯，尝试下溯源吧! hacking!\n" + "\n".join(new_attack_ips)
    else:
        logger.info("还没新的憨包踩到蜜罐! 请静待有缘人")
        attack_content = "还没新的憨包踩到蜜罐! 请静待有缘人\n"

    write_ips_to_file(scan_ips_path, scanner_ips)

    if new_scan_ips:
        logger.info("快把这些扫描器、爬虫封了！")
        logger.info("\n".join(new_scan_ips))
        scan_content = "快把这些扫描器、爬虫封了！\n" + "\n".join(new_scan_ips)
    else:
        logger.info("目前没得需要封禁的IP")
        scan_content = "目前没得需要封禁的IP\n"

    send_notification(attack_webhook, attack_content)
    send_notification(scan_webhook, scan_content)


if __name__ == "__main__":
    main()

```

将代码放置你的云主机服务器上，使用crontab设置定时任务即可。

![飞书机器人告警效果](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309011444748.png)

![飞书机器人实现效果](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202309011444193.png)









## 4. 参考

1. http://tttang.com/archive/1832 [企业蜜罐建设实践]
2. https://www.anquanke.com/post/id/227833#h2-12 [浅析开源蜜罐识别与全网测绘]
3. https://waf-ce.chaitin.cn/ [长亭雷池WAF社区版]
4. https://hfish.net/  [开源 HFish 蜜罐] 
5. https://rivers.chaitin.cn/app/collie/home  [牧云主机管理助手]
6. https://docs.rivers.chaitin.cn  [长亭百川云平台]

