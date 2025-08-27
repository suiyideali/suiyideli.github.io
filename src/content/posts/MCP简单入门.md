---
title: MCP简单入门
published: 2025-08-15
description: '本文详细介绍了模型上下文协议（MCP）的入门知识，内容涵盖MCP的核心概念、与传统API的对比、工作流程以及通过STDIO和SSE的快速上手指南，并附有实际操作截图和代码示例。'
image: 'https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191802201.png'
tags: [大模型]
category: 'LLM'
draft: false 
lang: 'zh'
---

# 一、引言

## 1.1 什么是MCP？

### 定义与核心价值：

MCP（Model Context Protocol，模型上下文协议）是一种开放标准协议，旨在标准化大型语言模型（LLM）与外部数据源、工具和服务之间的交互方式。其核心是通过客户端-服务器架构（包括MCP主机、MCP客户端和MCP服务器）实现安全、高效的通信，让AI模型能够动态访问外部资源（如文件、数据库、API），并执行具体任务（如数据查询、工具调用）。

并且具有以下特点：

1. **标准化接口**：MCP提供统一的协议（类似USB-C接口），简化AI模型与多样化外部资源的连接，避免为每个工具单独开发定制集成。
2. **动态交互能力**：支持双向实时通信，AI模型可主动发现工具、拉取数据或触发操作（如发送邮件、调整日程）。
3. **安全可控**：通过权限管理和本地化数据处理，确保用户数据隐私和操作安全性（如用户授权访问本地文件）。
4. **生态开放性**：作为开源协议，MCP支持开发者构建可复用的MCP服务器（工具提供方）和客户端（AI应用），促进工具生态扩展。

### **通用架构**

MCP 核心采用客户端-服务器架构，主机应用可以连接多个服务器

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191802125.png)

- **MCP Hosts**: 如 Claude Desktop、IDE 或 AI 工具，希望通过 MCP 访问数据的程序
- **MCP Clients**: 维护与服务器一对一连接的协议客户端
- **MCP Servers**: 轻量级程序，通过标准的 Model Context Protocol 提供特定能力
- **本地数据源**: MCP 服务器可安全访问的计算机文件、数据库和服务
- **远程服务**: MCP 服务器可连接的互联网上的外部系统（如通过 APIs

用一句话和一张很经典的图表示：

> *传统API如同给每个电器配不同插头，而MCP是AI世界的“万能插座”*

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191802201.png)

## 1.2 MCP与传统API的对比

MCP（Model Context Protocol）与传统API的核心差异体现在**设计目标、交互模式、开发效率及适用场景**四个方面

### **1. 设计目标与定位**

| **维度**     | **传统API**                         | **MCP**                                      |
| ------------ | ----------------------------------- | -------------------------------------------- |
| **核心目标** | 实现系统间数据交换（如RESTful接口） | **专为AI设计**，支持模型与工具的双向动态交互 |
| **协议性质** | 通用规范（如OpenAPI），无AI特定优化 | **AI专用协议**，内置工具、资源、提示等AI原语 |
| **交互主体** | 人类开发者或程序调用                | **AI模型自主调用**（如Claude触发工具执行）   |

### **2. 交互模式对比**

| **能力**       | **传统API**                     | **MCP**                                          |
| -------------- | ------------------------------- | ------------------------------------------------ |
| **通信方向**   | 单向请求-响应（客户端主动调用） | **双向实时通信**（Server可主动推送更新）         |
| **动态发现**   | 需预定义接口文档，硬编码集成    | **运行时动态发现工具**（AI自动识别可用功能）     |
| **上下文感知** | 无内置机制                      | 支持**资源注入**（如实时加载用户日历数据）       |
| **执行流程**   | 单次调用，边界清晰              | **多步骤工作流**（如“查天气→订机票→发通知”串联） |

### **3. 开发与维护成本**

| **环节**       | **传统API**                                 | **MCP**                                                      |
| -------------- | ------------------------------------------- | ------------------------------------------------------------ |
| **集成工作量** | 每个API独立开发：- 认证- 错误处理- 数据解析 | **一次适配，多模型通用**：MCP Server封装功能，任何兼容MCP的AI均可调用 |
| **生态复用**   | 依赖厂商SDK，跨平台兼容性差                 | **开源协议标准化**：GitHub已有2000+共享MCP Server            |
| **迭代成本**   | 接口变更需重写客户端代码                    | **动态能力协商**：Server功能更新，Client自动适配             |

### **4. 安全与权限控制**

| **维度**     | **传统API**                               | **MCP**                                                  |
| ------------ | ----------------------------------------- | -------------------------------------------------------- |
| **认证机制** | 依赖开发者实现（如API Key/OAuth）         | **标准化授权流**：- 用户实时批准敏感操作（文档40）       |
| **数据隔离** | 全量数据暴露风险（如API返回完整用户信息） | **最小权限原则**：Server限定数据范围（如仅返回所需字段） |
| **执行安全** | 无操作确认机制                            | **操作拦截**：高危工具（如删除文件）需用户二次确认       |

### **5. 适用场景推荐**

| **场景**           | **推荐方案** | **原因**                                               |
| ------------------ | ------------ | ------------------------------------------------------ |
| **简单数据查询**   | API          | 单次调用无需复杂交互（如股票价格接口）                 |
| **AI自动化工作流** | MCP          | 需多工具串联、实时反馈（如数据分析→报告生成→邮件发送） |
| **高安全性操作**   | MCP          | 内置审批机制保障敏感操作（如银行转账）                 |
| **快速原型开发**   | MCP          | 复用开源MCP Server避免重复开发（文档43）               |
| **严格性能控制**   | API          | 低延迟场景（如高频交易）需紧耦合优化                   |

# 二、MCP简单入门

## 2.1 MCP的核心概念

### 客户端-服务器架构

MCP核心是其客户端-服务器架构，它旨在为大型语言模型（LLM）与外部世界之间的信息交换提供一个标准化、可扩展的框架 。这一架构并非简单的客户端与服务器的二元关系，而是一个由三个关键角色组成的“三位一体”交互模型：主机（Host）、客户端（Client）和服务器（Server）

| **组件**                | **角色定位**             | **核心功能**                                                 | **实例**                                                   |
| ----------------------- | ------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------- |
| **MCP主机（Host）**     | 用户交互入口，运行AI应用 | - 管理客户端生命周期- 协调AI模型与工具调用- 执行安全策略（如用户授权） | Claude Desktop、Cursor IDE、聊天机器人                     |
| **MCP客户端（Client）** | 主机内部的“协议代理”     | - 与服务器建立1:1连接- 动态发现可用工具/资源- 转发请求并返回结果给AI模型 | 内嵌于Host中的通信模块（如Claude Desktop内置的MCP Client） |
| **MCP服务器（Server）** | 能力提供者，连接外部系统 | - 暴露三类能力： • **资源（Resources）**：提供只读数据（文件、API响应） • **工具（Tools）**：执行操作（发送邮件、Git提交） • **提示（Prompts）**：预定义任务模板 | 文件系统Server、GitHub API Server、天气预报Server          |

### 传输层与通信方式

MCP 支持多种传输方式，以适应不同的应用场景。根据官方文档，主要的传输方式包括：

- **STDIO (标准输入/输出)**：该方法主要用于本地集成场景，即 MCP 服务器与客户端在同一个环境中运行。例如，当一个桌面 AI 应用需要安全地访问本地文件系统时，通常会通过 STDIO 方式启动一个本地 MCP 服务器。这种方式适用于轻量级、同步的消息传递。
- **HTTP+SSE (Server-Sent Events)**：这是MCP官方支持的一种重要传输方式，专为远程集成设计。客户端通过标准的 HTTP 请求发送消息，而服务器则利用 SSE 技术向客户端进行流式响应和事件推送。这种方式能够有效地处理大量的异步、事件驱动的调用，是大多数生产级云服务的理想选择。

## **2.2 MCP的工作流程**

### **核心原理**

MCP采用基于**JSON-RPC 2.0**的轻量级通信协议，客户端（如AI应用）与服务器（工具/数据源）通过标准化消息格式交互。流程如下：

1. **请求发起**

   - 客户端发送结构化JSON请求，包含：

     ```json
     {
       "jsonrpc": "2.0",
       "method": "tools/call",  // 方法名（如调用工具、查询数据）
       "params": {              // 参数（工具名、输入数据等）
         "name": "weather_query",
         "arguments": { "city": "Beijing" }
       },
       "id": 1                 // 请求唯一标识
     
     ```

   - 请求通过HTTP/WebSocket或本地进程通信传输（如Claude Desktop使用stdio管道）。

2. **服务器处理**

   - 服务器解析请求，验证参数合法性（如检查**`city`**是否存在）。
   - 执行实际操作（如调用天气API、查询数据库）。
   - 若需异步处理（如大文件读取），返回**`pending`**状态并轮询结果。

3. **响应返回**

   - 成功响应：

   ```json
   {
     "jsonrpc": "2.0",
     "result": {             // 返回数据
       "temperature": "25°C",
       "humidity": "60%"
     },
     "id": 1
   }
   ```

   - 错误响应：

   ```json
   {
     "jsonrpc": "2.0",
     "error": {
       "code": -32601,       // 标准错误码（如方法不存在）
       "message": "Tool not found"
     },
     "id": 1
   }
   ```

**关键特性**

- **幂等性**：相同请求多次执行结果一致（如查询操作）。
- **状态管理**：通过**`id`**匹配请求与响应，避免乱序问题。
- **传输层无关**：支持HTTP、WebSocket、gRPC等多种协议（参考[**Model Context Protocol官方文档**](https://modelcontextprotocol.io/)）。

### **工具调用与数据交互流程**

**完整交互链路**

以“AI查询数据库并返回结果”为例

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191802240.png)

# 三、MCP的使用指南

## 3.1 环境准备

### 必要工具与依赖（Node.js、Python等）

[Node.js](https://nodejs.org/en/download/)

[Python](https://www.python.org/downloads/)

### 常见MCP客户端

1. [Claude-code](https://docs.anthropic.com/zh-CN/docs/claude-code/overview)
2. [Claude Desktop](https://claude.ai/download)
3. [Cherry Studio](https://www.cherry-ai.com/)
4. [cursor](https://cursor.com/cn)

## 3.2 快速上手：MCP的简单使用

### **STDIO (标准输入/输出) 的使用**

该方法主要用于本地集成场景，即 MCP 服务器与客户端在同一个环境中运行 。例如，当一个桌面 AI 应用需要安全地访问本地文件系统时，通常会通过 STDIO 方式启动一个本地 MCP 服务器 。这种方式适用于轻量级、同步的消息传递 。

1. 配置mcp的python-sdk

[python-sdk](https://github.com/modelcontextprotocol/python-sdk)

根据提示一步一步安装uv等配置

```bash
mkdir mcp-server-demo # 创建 mcp-server-demo 目录
uv init mcp-server-demo
cd mcp-server-demo
uv add "mcp[cli]" # 安装mcp的SDK
```

然后使用IDE打开mcp-server-demo目录就会发现已经配置好了

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191802253.png)

2. 创建一个简单的 MCP 服务器，它提供计算工具和一些数据，这里依旧使用官方给出的demo，最后不要忘了在最后添加主程序入口点

```bash
"""
FastMCP quickstart example.

cd to the `examples/snippets/clients` directory and run:
    uv run server fastmcp_quickstart stdio
"""

from mcp.server.fastmcp import FastMCP

# Create an MCP server
mcp = FastMCP("Demo")

# Add an addition tool
@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

# Add a dynamic greeting resource
@mcp.resource("greeting://{name}")
def get_greeting(name: str) -> str:
    """Get a personalized greeting"""
    return f"Hello, {name}!"

# Add a prompt
@mcp.prompt()
def greet_user(name: str, style: str = "friendly") -> str:
    """Generate a greeting prompt"""
    styles = {
        "friendly": "Please write a warm, friendly greeting",
        "formal": "Please write a formal, professional greeting",
        "casual": "Please write a casual, relaxed greeting",
    }

    return f"{styles.get(style, styles['friendly'])} for someone named {name}."

# 添加主程序入口点
if __name__ == "__main__":
    # 启动服务器，使用标准输入/输出作为通信通道
    mcp.run(transport="stdio")

```

3. 使用stdio客户端测试mcp

这里使用的客户端是Cherry Studio

选择MCP服务器，点击快速创建

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191802168.png)

分别在类型选择：stdio，命令使用：uv

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191802180.png)

参数填以下（注意<your_path>需要填写你自己的路径:

```bash
--directory
/<your_path>/mcp-server-demo
run
main.py
```

然后保存后使用大模型调用mcp服务

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191803069.png)

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191803105.png)

另外一个mcp我使用的是一个开源的mcp服务器， [VirusTotal MCP Server](https://github.com/yxdm02/mcp-virusTotal-threat-analysis/tree/main?tab=readme-ov-file)，是一个让AI结合威胁情报进行深入分析、基于 Model Context Protocol (MCP) 开发的 VirusTotal API 调用工具，为用户提供文件、IP地址、域名和URL的威胁情报查询功能，并将得到的数据喂给AI进行二次分析，提升威胁情报分析能力并给予处置建议。

从github把项目拉到本地，然后根据提示填写好对应的api_key就好。

实现效果如下：

> 
>
>
> 我来帮您查询IP地址146.190.70.24的物理位置，并分析是否为恶意IP。
>
> 首先查询IP地址的物理位置：
>
> 现在让我查询这个IP地址的信誉信息，分析是否为恶意IP：
>
> ![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191803148.png)
>
> 现在让我对这个IP地址进行更深入的风险分析，包括风险画像和身份验证：
>
> 根据查询结果，我来为您详细分析IP地址146.190.70.24的物理位置和安全性：
>
> ## 📍 物理位置信息
>
> **基本信息：**
>
> - **IP地址**: 146.190.70.24
> - **大洲**: 北美洲
> - **国家**: 美国
> - **州/省**: 新泽西州
> - **城市**: 北伯根 (North Bergen)
> - **邮编**: 07047
> - **时区**: UTC-5
> - **经纬度**: 40.804267, -74.012084
> - **定位精度**: 城市级
>
> **网络信息：**
>
> - **所属机构**: DigitalOcean, LLC
> - **互联网服务提供商**: DigitalOcean, LLC
> - **自治系统号**: 14061
> - **数据来源**: 数据挖掘
>
> ---
>
> ## 🔒 安全信誉分析
>
> ### 恶意检测结果
>
> 根据VirusTotal的多引擎扫描结果：
>
> **总体统计：**
>
> - 🔴 **恶意**: 6个引擎检测
> - 🟡 **可疑**: 3个引擎检测
> - 🟢 **无害**: 56个引擎检测
> - ⚪ **未检测**: 29个引擎
> - ⏰ **超时**: 0个引擎
>
> ### 检测到威胁的引擎详情
>
> ### 🔴 恶意检测 (6个引擎)
>
> 1. **Criminal IP** - 检测为"malicious"
> 2. **ArcSight Threat Intelligence** - 检测为"malware"（恶意软件）
> 3. **Cyble** - 检测为"malicious"
> 4. **CyRadar** - 检测为"malicious"
> 5. **Fortinet** - 检测为"malware"（恶意软件）
> 6. **SOCRadar** - 检测为"malware"（恶意软件）
>
> ### 🟡 可疑检测 (3个引擎)
>
> 1. [**alphaMountain.ai**](http://alphamountain.ai/) - 检测为"suspicious"
> 2. **AlphaSOC** - 检测为"suspicious"
> 3. **Gridinsoft** - 检测为"suspicious"
>
> ### 🟢 主要安全引擎检测结果
>
> 大多数知名安全引擎将其标记为安全，包括：
>
> - **Acronis**: clean
> - **BitDefender**: clean
> - **ESET**: clean
> - **Google Safebrowsing**: clean
> - **Kaspersky**: unrated (未评级)
> - **Sophos**: clean
> - **TrendMicro**: clean
> - **Microsoft**: clean
> - **Fortinet**: malware (检测为恶意)
>
> ---
>
> ## 🚨 综合风险评估
>
> ### 风险等级：**高风险**
>
> ### 判断依据：
>
> ### ⚠️ 高风险因素
>
> 1. **多个权威引擎检测为恶意**：
>    - Fortinet、ArcSight、SOCRadar等知名安全厂商都检测为恶意软件
>    - 共6个引擎标记为恶意，比例较高
> 2. **云服务商IP被滥用**：
>    - 属于DigitalOcean（知名云服务提供商）
>    - 云服务器IP经常被黑客租用进行恶意活动
> 3. **恶意活动多样性**：
>    - 检测结果包括"malicious"、"malware"等多种恶意类型
>    - 表明可能涉及多种恶意活动
>
> ### 📊 风险评分
>
> - **VirusTotal信誉分数**: 0（低信誉）
> - **恶意检测率**: 6.7% (6/94)
> - **可疑检测率**: 3.2% (3/94)
> - **总体风险**: 中高风险
>
> ---
>
> ## 💡 建议措施
>
> ### 🚫 立即行动
>
> 1. **阻止访问**：建议在防火墙中阻止此IP访问您的网络
> 2. **监控日志**：检查是否有来自此IP的可疑活动记录
> 3. **安全加固**：检查可能被此IP攻击的系统和服务
>
> ### 🔍 进一步调查
>
> 1. **联系DigitalOcean**：可以通过abuse@digitalocean.com报告此IP的恶意活动
> 2. **威胁情报**：收集更多关于此IP的威胁情报信息
> 3. **行为分析**：分析此IP的行为模式，确定攻击类型
>
> ### 🛡️ 长期防护
>
> 1. **IP信誉管理**：建立IP信誉黑名单机制
> 2. **云服务监控**：加强对来自云服务商IP的监控
> 3. **实时威胁检测**：部署实时威胁检测系统
>
> ---
>
> ## 📋 结论
>
> **IP地址146.190.70.24被评估为高风险恶意IP，主要原因是：**
>
> 1. **地理位置**：位于美国新泽西州的DigitalOcean云服务器
> 2. **安全信誉**：被6个权威安全引擎检测为恶意，3个检测为可疑
> 3. **风险特征**：云服务器IP被广泛用于恶意软件分发和其他网络攻击活动
> 4. **建议处置**：立即阻止此IP访问，并进行进一步的安全调查
>
> **强烈建议将此IP列入黑名单，并采取相应的安全防护措施。**

### **SSE（Server-Sent Events）的使用**

1. 客户端

依旧使用的是Cherry Studio，在设置处的mcp设置可以使用同步服务器。

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191803191.png)

可以选择不同的服务提供商，只需配置好相应的API即可

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191803227.png)

2. MCP服务器

这里使用的是 [埃文IP定位MCP](https://www.modelscope.cn/mcp/servers/@ipfred/aiwen-mcp-server-geoip)，配置好相应的key即可

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191803282.png)

然后在Cherry Studio即可同步相应的mcp服务，简单易上手

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191803765.png)

测试一下效果

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250815191803822.png)



# 参考来源

1. [MCP中文文档](https://mcp-docs.cn/introduction)
2. [Model Context Protocol官方文档](https://modelcontextprotocol.io/docs/getting-started/intro)
3. https://github.com/modelcontextprotocol
4. https://github.com/NAXG/ThreatMCP
5. https://github.com/modelcontextprotocol/python-sdk
6. https://github.com/yxdm02/mcp-virusTotal-threat-analysis/tree/main?tab=readme-ov-file
7. https://www.modelscope.cn/mcp
