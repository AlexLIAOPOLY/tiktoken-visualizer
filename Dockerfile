FROM python:3.9-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用文件
COPY . .

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["python", "app.py"] 