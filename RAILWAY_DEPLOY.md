# Railway部署说明 - Tiktoken可视化工具

这个文档提供了如何在Railway上部署Tiktoken可视化工具的步骤说明。

## 部署步骤

1. **注册Railway账号**
   - 访问 [Railway.app](https://railway.app/) 并注册一个账号
   - 可以使用GitHub账号直接登录

2. **连接GitHub仓库**
   - 将修改后的Tiktoken可视化工具代码上传到一个GitHub仓库
   - 确保仓库包含以下文件：
     - app.py (修改后的版本)
     - static/ 文件夹（包含修改后的main.js）
     - requirements.txt
     - Procfile
     - railway.json

3. **创建新项目**
   - 在Railway仪表板中点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 授权Railway访问您的GitHub账号
   - 选择包含Tiktoken可视化工具代码的仓库

4. **配置环境变量**（可选）
   - 点击 "Variables" 标签
   - 添加以下环境变量（如果需要）：
     - DEBUG=False

5. **部署完成**
   - Railway会自动构建和部署您的应用
   - 部署完成后，点击 "Settings" > "Domains" 查看分配的公共URL
   - 可以设置自定义域名（需要Railway付费计划）

## 文件说明

已对以下文件进行必要修改以适应Railway部署：

1. **app.py**
   - 修改了启动代码，使用`PORT`环境变量（Railway会自动提供）
   - 禁用了调试模式，提高安全性

2. **static/js/main.js**
   - 修改了`API_BASE_URL`，使用动态获取的域名，以适应任何部署环境

3. **Procfile**
   - 添加了Railway启动命令

4. **railway.json**
   - 提供了Railway特定的配置设置

## 故障排除

如果部署失败，请检查以下几点：

1. 确保requirements.txt中列出了所有必要的依赖包
2. 检查Railway日志以获取更详细的错误信息
3. 确认app.py中没有硬编码的端口号或主机名

## 更新应用

要更新已部署的应用，只需将更改推送到GitHub仓库，Railway会自动重新部署。 