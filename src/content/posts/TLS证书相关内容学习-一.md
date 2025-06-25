---
title: TLS证书相关内容学习(一)
published: 2025-06-23 17:15:47
tags: [TLS SSL]
category: 计算机网络
description: 'TLS（Transport Layer Security）证书是互联网安全通信的基础，它确保了用户与网站之间的数据传输加密，防止中间人攻击。以下是关键概念及它们之间的关系'
---

# 什么是TLS证书

TLS（Transport Layer Security）证书是互联网安全通信的基础，它确保了用户与网站之间的数据传输加密，防止中间人攻击。以下是关键概念及它们之间的关系：

1. TLS证书的作用

   - 加密通信：通过非对称加密（公钥/私钥）和对称加密结合，确保数据在传输中不被窃取或篡改
   - 身份验证：证明网站的真实性，避免用户连接到假冒的钓鱼网站
   - 数据完整性：确保传输过程中数据未被篡改

2. 核心组成部分：

   - 公钥（Public Key）：嵌入在证书中，用于加密数据或验证签名。
   - 私钥（Private Key）：由网站服务器持有，用于解密数据或生成签名（需严格保密）。
   - 网站域名：证书中绑定的域名（如 example.com），浏览器会验证用户访问的域名是否与证书一致。
   - 证书颁发机构（CA）：可信的第三方机构，负责验证网站身份并签发证书。
   - 有效期：通常为 1-2 年，过期后需要重新申请

3. 证书类型与域名覆盖范围

   - 单域名证书：仅保护一个特定域名（如 example.com）
   - 通配证书（Wildcard）：保护主域名及所有子域名（如 *.example.com）
   - 多域名证书（SAN）：可在一张证书中包含多个域名（如 [example.com](http://example.com) 和 another.com）
   - EV（扩展验证）证书：浏览器地址栏显示绿色锁和公司名称，需严格验证企业身份
   - DV（域名验证）证书：仅验证域名所有权，适合个人网站（如Let's Encrypt 提供的免费证书）

4. 证书颁发机构（CA）的角色

   - 身份验证：CA 需验证申请者对域名的所有权（如通过 DNS 记录，文件上传等方式）
   - 签发证书：CA 使用其私钥对证书签名，确保证书不可伪造。
   - 维护信任链：CA的跟证书需要预装在浏览器/操作系统中，形成“信任链”。
   - 中间 CA （Intermediate CA）：实际签发证书的是中间 CA，根 CA  保持离线以保障安全。

5. 证书申请与验证流程：

   - 生成 CSR （证书签名请求）：

      网站管理员在服务器上生成私钥和 CSR，CSR 包含公钥和域名等信息

   - 提交给 CA：

      将 CSR  发给 CA，并完成域名所有权验证 （如添加DNS TXT 记录）

   - CA 签发证书：

      验证通过后， CA 使用其私钥对 CSR 签名，返回证书文件

   - 安装证书：

      将证书和中间证书链配置到服务器（如 Nginx/Apache），启用HTTPS

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720597.png)

6. 浏览器如何验证证书

   - 检查证书链：

      浏览器从服务器逐级验证到受信任的根证书


      - 域名匹配：
    
         确保证书中的域名与用户访问的域名一致（如 [www.example.com](http://www.example.com) VS example.com）



      - 有效期检查：
    
         证书是否在有效期内



      - 吊销状态检查
    
         通过 OSCP （在线证书状态协议）或 CRL （证书吊销列表）确定证书未被吊销


7. 常见问题与解决方案

   - 中间人攻击：使用HSTS（HTTP Strict Transport Security）强制 HTTPS 连接


   - 自签名证书：不被浏览器信任，适用于内部测试环境，但需要手动信任

8. TSL握手过程简述

   - 客户端（浏览器）向服务器请求连接


   - 服务器发送证书和公钥


   - 客户端验证证书有效性，并生成对称密钥，用公钥加密后发送


   - 双方通过该对称密钥加密后通信

# 中间 CA（Intermediate CA）与根 CA 的关系

在 TLS 证书体系中，**中间 CA（Intermediate Certificate Authority）** 和 **根 CA（Root Certificate Authority）** 共同构成了一个 **分层的信任链** 。它们的分工和协作是互联网安全的核心机制之一。

## 1. **根 CA（Root CA）：信任的源头**

- 角色：

  根 CA 是整个证书信任链的最高权威，其公钥（根证书）被预装在操作系统、浏览器、移动设备等客户端中，所有下游证书（如中间CA证书和服务器证书）的合法性最终依赖根 CA 的信任。

- 特点：

  - 离线存储：根 CA 的私钥通常被严格保护，甚至完全离线（例如存储在硬件安全模块 HSM 中），以防止被黑客窃取。
  - 长期有效：根 CA 证书的有效期长达数十年，因为更换根证书需要重新部署到所有客户端，成本极高。
  - 不可替代：如果根 CA 私钥泄露，整个信任链将崩溃，所有基于它的证书都会失效。

## 2. 中间 CA：实际签发证书的“代理人”

- 角色：

  中间 CA 是根 CA 的直接下属机构，负责日常的证书签发工作。它本身也是一张证书（中间证书），由根 CA 签名背书，因此继承了根 CA 的信任。

- 特点：

  - 灵活性：中间 CA 可以由多个（形成“中间 CA 池”）每个中间 CA 可以专注于特定用途（如签发 DV/EV 证书，支持不同算法等）
  - 短期有效：中间 CA 证书的有效期通常较短（例如 1-5 年）便于更新和吊销
  - 在线运行：中间 CA 需要保持在线，以便相应证书签发请求

## **3. 为什么要分层设计？**

根 CA 和中间 CA 的分层结构是 **安全性和可扩展性的平衡** ，原因如下：

### **（1）保护根 CA 的私钥**

- **风险隔离** ：如果根 CA 直接签发证书，其私钥必须在线运行，容易成为攻击目标。一旦泄露，所有信任链崩塌。
  - **类比** ：根 CA 私钥就像“国家公章”，不能随意外借。中间 CA 是“部门公章”，即使丢失，影响范围有限。
- **离线保护** ：根 CA 私钥通常被离线存储（例如物理隔离的保险库），仅在签发中间 CA 证书时短暂使用。

### **（2）提高证书签发效率**

- **负载分担** ：根 CA 不可能直接处理全球每天数百万的证书签发请求（如 Let's Encrypt 每天签发数百万张证书）。中间 CA 可以并行处理请求，提升效率。
- **快速响应** ：中间 CA 可以灵活调整策略（如支持新算法、吊销机制），而无需改动根 CA。

### **（3）灵活应对安全事件**

- **吊销中间 CA** ：如果某个中间 CA 被泄露，只需吊销该中间证书，不影响其他中间 CA 和根 CA。
  - **示例** ：2015 年，Let's Encrypt 曾因中间 CA 密钥泄露而紧急吊销证书，但未影响根 CA 和其他中间 CA。
- **根 CA 的稳定性** ：根 CA 无需频繁更新，避免了因更换根证书导致的客户端兼容性问题。

## **4. 证书链的验证过程**

当浏览器访问 HTTPS 网站时，会验证证书链的完整性：

1. **服务器证书 → 中间 CA 证书 → 根 CA 证书**

   - 浏览器内置的根证书会验证中间 CA 的签名。
   - 中间 CA 证书验证服务器证书的签名。

2. **信任传递** ：只要根证书可信，且证书链完整，浏览器就会信任服务器证书。

3. **示例：**DigiCert  **的证书链**

   服务器证书（*.example.com）

    └─ 中间 CA（DigiCert Inc ECC CA-1）

   ​	└─ 根 CA（DigiCert Inc）

## 5. 中间 CA 的签发流程

1. 生成中间CA的 CSR （签名请求）

   - CA 运营方生成私钥和CSR，包含中间 CA 的域名、公钥等信息

2. 根 CA 签名中间 CA 和 CSR

   - 根 CA 使用其私钥对中间 CA 的 CSR 签名，生成中间证书

3. 中间 CA 签发服务器证书

   - 网站管理员提交 CSR 给中间 CA，中间 CA 使用自己的私钥签发服务器证书

   ![image-20250624095630010](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506240956249.png)

## **6. 安全风险与防护措施**

- **中间 CA 泄露** ：
  - 如果中间 CA 私钥泄露，攻击者可伪造证书。需立即吊销中间 CA，并启用备用中间 CA。
- **根 CA 泄露** ：
  - 灾难性事件！需全球更新根证书（例如微软、苹果、Google 等推送补丁）。
- **防护手段** ：
  - **HSM（硬件安全模块）** ：中间 CA 私钥存储在 HSM 中，防止导出。
  - **OCSP（在线证书状态协议）** ：实时吊销泄露的中间 CA 或服务器证书。
  - **审计与监控** ：定期检查中间 CA 的日志，检测异常签发行为。

# **签名过程详解**

## 1. CSR（证书签名请求）的生成

- 网站管理员在服务器上生成一对密钥（私钥+公钥）并将公钥和域名信息打包成 CSR 文件
- CSR 中包括：
  - 申请者的公钥
  - 域名（如 example.com）
  - 申请者身份信息（如公司名称、国家等）
  - 对 CSR 内容的哈希签名（由申请者私钥加密）

## 2. CA 验证签名

- CA 收到 CSR 后，会验证申请者身份（如通过 DNS 记录，邮件验证等方式）
- 验证通过后，CA 使用自己的私钥对 CSR 的哈希值进行加密，生成数字签名，并将签名附加到最终的证书文件中。

## 3. 证书内容

 最终的证书文件包含：

- 申请者的公钥
- 域名
- 有效期
- CA 的数字签名（用 CA 私钥加密的哈希值）

# 验证网站的 TLS/SSL 证书

## 使用**`OpenSSL`** 工具

### **1. 获取网站证书并解析**

使用 **`openssl s_client`** 连接到目标网站，获取证书链，再用 **`openssl x509`** 解析证书内容。

### **命令示例 ：**

```bash
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -text -noout
```

### **输出解析 ：**

- **Subject** ：证书持有者（如 **`CN = example.com`**）。
- **Issuer** ：证书颁发机构（如 **`Let's Encrypt`**）。
- **Validity** ：有效期（**`Not Before`** 和 **`Not After`**）。
- **Subject Alternative Name (SAN)** ：扩展域名（如 **`DNS:example.com, DNS:*.example.com`**）。
- **Public Key** ：公钥算法和长度（如 RSA 2048 bits）。
- **Signature Algorithm** ：签名算法（如 SHA256 with RSA）。

以**baidu.com**为例：

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720715.png)

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720751.png)

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720680.png)

### **3. 检查证书链完整性**

证书链不完整会导致浏览器警告。使用以下命令检查：

```bash
openssl s_client -connect example.com:443 -showcerts 2>/dev/null
```

### 4. **验证证书域名匹配**

确保证书中的域名与访问的域名一致：

**命令示例 ：**

```bash
openssl x509 -noout -subject -ext subjectAltName \
  -in <(openssl s_client -connect example.com:443 2>/dev/null | openssl x509)
```

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720644.png)

### 5. **验证证书是否被吊销（CRL/OCSP）**

### **CRL 检查 ：**

1. 从证书的 **`CRL Distribution Points`** 获取 CRL URL。

2. 下载 CRL 并检查证书指纹是否在吊销列表中：

   ```bash
   # 获取证书序列号
   openssl x509 -noout -serial -in <(openssl s_client -connect example.com:443 2>/dev/null | openssl x509)
   # 下载 CRL（以 Let's Encrypt 为例）
   wget http://crl.identrust.com/DSTROOTCAX3.crl
   # 将 CRL 转换为文本格式
   openssl crl -inform DER -text -in DSTROOTCAX3.crl
   ```

### **OCSP 检查 ：**

1. 从证书获取 OCSP URL：

   ```bash
   openssl x509 -noout -ocsp_uri \
     -in <(openssl s_client -connect example.com:443 2>/dev/null | openssl x509)
   ```

2. 使用 **`openssl ocsp`** 命令查询：

   ```bash
   openssl ocsp -issuer <(openssl s_client -connect example.com:443 2>/dev/null | openssl x509) \
                -cert <(openssl s_client -connect example.com:443 2>/dev/null | openssl x509) \
                -url http://ocsp.example.com
   ```

## **使用 `curl` 快速检查**

**命令示例**：

```bash
# 查看证书基本信息
curl -vI https://example.com  2>&1 | grep "SSL certificate"

# 输出证书详细信息
curl --insecure -vI https://example.com  2>&1 | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/'
```

以 **https://www.baidu.com** 为例

```bash
root@yecaoyun:~# curl -vI https://www.baidu.com  2>&1 | grep "SSL certificate"
*  SSL certificate verify ok.
```

# **TLS 1.2 握手过程详解**

TLS 1.2 是当前仍广泛使用的协议版本，其握手过程相比 TLS 1.3 更为复杂，通常需要 **2 个 RTT（往返时间）** ，但支持更广泛的加密算法和兼容性。以下是完整的 TLS 1.2 握手流程解析：

## **一、完整握手流程（Full Handshake）**

### 1. 客户端发送 `ClientHello`

- 发送方：客户端（如浏览器）
- 内容：
  - TLS版本：支持最高版本（如 TLS 1.2）
  - 随机数（Client Random）：32 字节随机值
  - 会话 ID （Session ID）：用于会话恢复（可选）
  - 支持的加密套件（Cipher Suites）：如 `TLS_ECDHE_RAS+WITH_AES_128_GCM_SHA256`
  - 扩展列表（Extensions）：
    - **Server Name Indication（SNI）** ：指定目标域名。
    - **Application Layer Protocol Negotiation（ALPN）** ：协商应用层协议（如 HTTP/1.1）。
    - **Signature Algorithms** ：支持的签名算法（如 RSA、ECDSA）。

### 2. 服务器 **`ServerHello`**

- 发送方：服务器
- 内容 ：
  - TLS 版本 ：确认使用 TLS 1.2。
  - 随机数（Server Random）：32 字节随机值。
  - 会话 ID（Session ID）：用于后续会话恢复。
  - 选择的加密套件 ：如 **`TLS_RSA_WITH_AES_256_CBC_SHA256`**。
  - 压缩方法（Compression） ：默认为 **`null`**（现代服务通常禁用压缩）。

### 3. 服务器发送`Certificate`

- 发送方：服务器
- 内容：
  - 服务器证书链：包含服务器证书（如 [example.com](http://example.com) 的公钥证书）、中间CA证书
  - 根证书：通常不发送，需客户端本地信任。

### 4. 服务器发送 `ServerKeyExchage` (可选，根据加密套件决定）

- 发送发：服务器
- 作用：当密钥交换算法和 DHE 或 ECDHE 时，服务器发送临时 DH 公钥参数
- 内容：
  - DH 参数 （如 ECDHE 的椭圆曲线类型和公钥）
  - 签名：服务器使用私钥对参数签名，客户端验证签名

### 5.  服务器发送 `ServerHelloDone`

- 发送方：服务器
- 作用：通知客户端服务器已完成其部分握手

### 6. 客户端发送 `ClientKeyExchange`

- 发送方：客户端
- 作用：根据加密套件发送密钥交换信息：
  - RSA模式：客户端生成预主密钥（Pre-Master Secret)，用服务器公钥加密后发送
  - DHE/ECDHE 模式：客户端发送自己的DH公钥，服务器计算共享秘密

### 7.  客户端发送 `ChangeCipherSpec`

- 发送方：客户端
- 作用：通知服务器后通信将使用协商的加密参数

### 8. 客户端发送 `Finished`

- 发送方：客户端
- 作用：验证握手过程的完整性
- 实现方式：
  - 客户端使用主密钥（Master Secret）生成 HMAC 摘要，包含所有握手消息
  - 服务器验证摘要是否匹配，防止中间人篡改

### 9. 服务器发送 `ChangeCipherSpec`

- 发送方：服务器
- 作用：通知客户端切换到加密模式

### 10. 服务器发送 `Finished`

- 发送方：服务器
- 作用：验证握手过程的完整性（与客户端的 Finished 类似）

### 11. 加密通信开始

- 密钥派生：

  主密钥通过以下步骤生成：

  1. 使用预主密钥（Pre-Master Secret）和随机数（Client Random + Server Random） 生成主密钥
  2. 通过为随机函数（PRF）扩展生成多个密钥：
     - 客户端写密钥（Client Write Key）
     - 服务器写密钥（Server Write Key）
     - 初始化向量（IV）
     - 其他用途的密钥（如HMAC密钥）

- 加密算法：使用 CBC、 GCM等模式加密数据

## 二、图示**TLS 1.2 握手过程**

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720790.png)

# **TLS 1.3 握手过程详解**

## **一、完整握手流程（Full Handshake）**

### 1. 客户端发送 `ClientHello`

- 目的：客户端向服务器发送连接请求，提供支持的加密参数。
- 内容：
  - TLS版本：如 TLS 1.3
  - 随机数（Client Random）：一个随机生成的 32 字节数据（用于后续密钥生成）。
  - 支持的加密套件（Cipher Suites）：如 `TLS_AES_256_GCM_SHA384`
  - 扩展列表：
    - **Key Share（密钥共享）** ：包含客户端选择的椭圆曲线（如 X25519）及其临时公钥。
    - **Pre-Shared Key（PSK）** （可选）：用于会话恢复。
    - **Server Name Indication（SNI）** ：指定目标域名。
    - **Application Layer Protocol Negotiation（ALPN）** ：协商应用层协议（如 HTTP/2）。

### 2. 服务器响应 `ServerHello`

- 目的：服务器选择双方支持的加密参数，并确认连接。
- 内容：
  - TLS 版本：确认使用 TLS 1.3。
  - 随机数（Server Random）：32 字节随机值。
  - 选择的加密套件：如 **`TLS_CHACHA20_POLY1305_SHA256`**。
  - Key Share：服务器的临时公钥（基于客户端提供的曲线）。
  - 扩展列表 ：可能包含 **`EncryptedExtensions`**。

### 3. 服务器发送**`EncryptedExtensions`**

- 目的：服务器向客户端证明自己的身份
- 内容：
  - ALPN 协议 ：确认最终使用的协议（如 HTTP/2）。
  - SNI 验证：服务器确认客户端请求的域名。
  - 其他扩展：如 **`signed_certificate_timestamp`**（用于证书透明性）。

### **4. Certificate（证书链）**

- 目的：
- 内容：
  - 服务器证书（如 **`example.com`** 的公钥证书）。
  - 中间 CA 证书（如 Let's Encrypt 的中间证书）。
  - 根证书：通常不发送，需客户端本地信任。

### 5. 服务器发送 `CertificateVerify`

- 目的：证明服务器拥有证书对应私钥
- 内容：
  - 服务器使用私钥对之前的握手消息（包括 `ClientHello` 和 `ServerHello`）生成签名，并发送给客户端
  - 客户端用证书中的公钥验证签名

### 6. 客户端和服务器发送 `Finished` 消息

- 目的：验证握手过程是否被篡改
- 内容：
  - 双方使用主密钥生成 `Finished` 消息的摘要（如 HMAC），验证握手消息的完整性
  - 若验证失败，连接终止

### 7.  加密通信开始

- 目的：使用协商的加密参数（如AES-GCM）和会话密钥（Derived Keys）传输数据
- 密钥派生：主密钥通过以下步骤生成：
  1. 使用 ECDHE 密钥交换生成 **共享秘密（Secret）** 。
  2. 通过 HKDF（HMAC-based Key Derivation Function）扩展生成多个密钥：
     - 客户端写密钥（Client Write Key）
     - 服务器写密钥（Server Write Key）
     - 初始化向量（IV）
     - 其他用途的密钥（如 HkdfLabel）。
- 加密算法：使用 AEAD（如 AES-GCM 或 ChaCha20-Poly1305）加密数据。

## 二、图示**TLS 1.3 握手过程**

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720352.png)

## **三、使用 Wireshark 抓包分析 TLS 1.3 握手**

- **过滤条件** ：**`tls.handshake.type == 1 or tls.handshake.type == 2`**
- **关键字段** ：
  - **`ClientHello`** → **`ServerHello`** → **`EncryptedExtensions`** → **`Certificate`** → **`CertificateVerify`** → **`Finished`**

### 通过筛选找到TLS流

这样就能看到完整的SSL交互过程

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720587.png)

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720481.png)

### SSL握手过程

1. **客户端向服务器发起的Client Hello消息**

​	发送的内容有TLS版本： TLS 1.3

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720652.png)

​	随机数（Client Random）、加密套件（Cipher Suites）、扩展列表都有

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720369.png)

2. **Sever开始回复客户端Server Hello**

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720511.png)

3. **Server Hello之后，服务器发了一个证书，并且发送Finished 消息**

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720203.png)

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720281.png)

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720632.png)

4. **客户端用证书中的公钥验证签名，发送Finished 消息**

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720782.png)

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720947.png)

5. **握手结束后，加密通信开始**

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720271.png)

这里配置 Wireshark 解密 了TLS 流量，所以能看到HTTPS的报文信息。

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720538.png)

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/202506231720571.png)
