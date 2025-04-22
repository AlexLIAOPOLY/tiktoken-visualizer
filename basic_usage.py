"""
tiktoken 基本用法示例

这个脚本展示了如何使用tiktoken对文本进行标记化（tokenization）
"""

import tiktoken
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import json

class TiktokenGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Tiktoken 演示工具")
        self.root.geometry("900x700")
        
        # 获取所有编码器名称
        self.encoding_names = tiktoken.list_encoding_names()
        self.current_encoder = None
        
        self.create_widgets()
        self.load_encoder("cl100k_base")  # 默认使用GPT-4编码器
    
    def create_widgets(self):
        # 顶部框架 - 编码器选择
        top_frame = ttk.Frame(self.root, padding=10)
        top_frame.pack(fill=tk.X)
        
        ttk.Label(top_frame, text="选择编码器:").pack(side=tk.LEFT, padx=(0, 10))
        self.encoder_combobox = ttk.Combobox(top_frame, values=self.encoding_names, width=30)
        self.encoder_combobox.pack(side=tk.LEFT)
        self.encoder_combobox.current(self.encoding_names.index("cl100k_base") if "cl100k_base" in self.encoding_names else 0)
        
        ttk.Button(top_frame, text="加载", command=self.on_load_encoder).pack(side=tk.LEFT, padx=10)
        
        # 添加一个标签显示当前编码器信息
        self.encoder_info_label = ttk.Label(top_frame, text="")
        self.encoder_info_label.pack(side=tk.LEFT, padx=10)
        
        # 编码解码区域
        main_frame = ttk.Frame(self.root, padding=10)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 左侧 - 文本输入
        left_frame = ttk.LabelFrame(main_frame, text="输入文本", padding=10)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        self.text_input = scrolledtext.ScrolledText(left_frame, wrap=tk.WORD, width=40, height=15)
        self.text_input.pack(fill=tk.BOTH, expand=True, pady=5)
        
        ttk.Button(left_frame, text="编码", command=self.encode_text).pack(fill=tk.X, pady=5)
        
        # 特殊标记框架
        special_frame = ttk.Frame(left_frame)
        special_frame.pack(fill=tk.X, pady=5)
        
        self.allow_special_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(special_frame, text="允许特殊标记", variable=self.allow_special_var).pack(side=tk.LEFT)
        
        ttk.Label(special_frame, text="特殊标记列表:").pack(side=tk.LEFT, padx=(10, 5))
        self.special_tokens_entry = ttk.Entry(special_frame)
        self.special_tokens_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.special_tokens_entry.insert(0, "<|endoftext|>")
        
        # 右侧 - Token 显示
        right_frame = ttk.LabelFrame(main_frame, text="Token 结果", padding=10)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        self.token_output = scrolledtext.ScrolledText(right_frame, wrap=tk.WORD, width=40, height=15)
        self.token_output.pack(fill=tk.BOTH, expand=True, pady=5)
        
        ttk.Button(right_frame, text="解码", command=self.decode_tokens).pack(fill=tk.X, pady=5)
        
        # 底部 - 统计信息
        stats_frame = ttk.LabelFrame(self.root, text="统计信息", padding=10)
        stats_frame.pack(fill=tk.X, padx=10, pady=10)
        
        self.stats_text = tk.StringVar(value="Token 数量: 0")
        ttk.Label(stats_frame, textvariable=self.stats_text).pack(side=tk.LEFT)
        
        # 底部按钮
        button_frame = ttk.Frame(self.root, padding=10)
        button_frame.pack(fill=tk.X)
        
        ttk.Button(button_frame, text="清空", command=self.clear_all).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="示例文本", command=self.load_example_text).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="显示所有编码器信息", command=self.show_encoders_info).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="退出", command=self.root.quit).pack(side=tk.RIGHT, padx=5)
    
    def on_load_encoder(self):
        encoding_name = self.encoder_combobox.get()
        self.load_encoder(encoding_name)
    
    def load_encoder(self, encoding_name):
        try:
            self.current_encoder = tiktoken.get_encoding(encoding_name)
            # 显示编码器信息
            info_text = f"当前编码器: {encoding_name} | 词汇量: {self.current_encoder.n_vocab}"
            if hasattr(self.current_encoder, 'eot_token'):
                info_text += f" | EOT Token: {self.current_encoder.eot_token}"
            
            self.encoder_info_label.config(text=info_text)
            self.encoder_combobox.set(encoding_name)
        except Exception as e:
            messagebox.showerror("错误", f"加载编码器时出错: {str(e)}")
    
    def encode_text(self):
        if not self.current_encoder:
            messagebox.showinfo("提示", "请先选择一个编码器")
            return
        
        text = self.text_input.get("1.0", tk.END).strip()
        if not text:
            messagebox.showinfo("提示", "请输入要编码的文本")
            return
        
        try:
            # 处理特殊标记
            if self.allow_special_var.get():
                special_tokens = set(self.special_tokens_entry.get().split())
                tokens = self.current_encoder.encode(text, allowed_special=special_tokens)
            else:
                tokens = self.current_encoder.encode(text)
            
            # 更新Token显示
            self.token_output.delete("1.0", tk.END)
            self.token_output.insert("1.0", str(tokens))
            
            # 更新统计信息
            self.stats_text.set(f"Token 数量: {len(tokens)}")
            
        except Exception as e:
            messagebox.showerror("编码错误", str(e))
    
    def decode_tokens(self):
        if not self.current_encoder:
            messagebox.showinfo("提示", "请先选择一个编码器")
            return
        
        token_text = self.token_output.get("1.0", tk.END).strip()
        if not token_text:
            messagebox.showinfo("提示", "没有可解码的token")
            return
        
        try:
            # 将文本转换为token列表
            token_list = json.loads(token_text.replace("'", '"'))
            decoded_text = self.current_encoder.decode(token_list)
            
            # 更新文本输入框
            self.text_input.delete("1.0", tk.END)
            self.text_input.insert("1.0", decoded_text)
            
        except Exception as e:
            messagebox.showerror("解码错误", f"无法解码tokens: {str(e)}\n请确保输入格式正确，例如 [1234, 5678]")
    
    def clear_all(self):
        self.text_input.delete("1.0", tk.END)
        self.token_output.delete("1.0", tk.END)
        self.stats_text.set("Token 数量: 0")
    
    def load_example_text(self):
        example_text = """这是一个tiktoken示例文本。
        
Tiktoken是OpenAI开发的一个快速的BPE标记化工具，用于处理文本。
它支持多种编码方式，如cl100k_base、p50k_base和gpt2等。

你可以在这里输入任何文本，然后点击"编码"按钮来查看它被分割成的tokens。
你也可以试试输入特殊标记，如<|endoftext|>，并勾选"允许特殊标记"选项。

Have fun experimenting with different encodings! 😊
"""
        self.text_input.delete("1.0", tk.END)
        self.text_input.insert("1.0", example_text)
    
    def show_encoders_info(self):
        info_window = tk.Toplevel(self.root)
        info_window.title("编码器信息")
        info_window.geometry("600x400")
        
        info_text = scrolledtext.ScrolledText(info_window, wrap=tk.WORD)
        info_text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        info_text.insert("1.0", "可用的编码器:\n\n")
        
        for name in self.encoding_names:
            try:
                enc = tiktoken.get_encoding(name)
                info = f"名称: {name}\n"
                info += f"词汇量: {enc.n_vocab}\n"
                if hasattr(enc, 'eot_token'):
                    info += f"EOT Token: {enc.eot_token}\n"
                info += "-" * 40 + "\n"
                info_text.insert(tk.END, info)
            except Exception as e:
                info_text.insert(tk.END, f"名称: {name} (加载失败: {str(e)})\n")
                info_text.insert(tk.END, "-" * 40 + "\n")
        
        info_text.config(state=tk.DISABLED)


def run_command_line_demo():
    """运行命令行演示"""
    print("tiktoken 命令行演示\n")
    
    # 打印可用的编码器名称
    print("可用的编码器:")
    encoding_names = tiktoken.list_encoding_names()
    for name in encoding_names:
        print(f"  - {name}")
    print()

    # 获取几种不同的编码器
    cl100k_encoder = tiktoken.get_encoding("cl100k_base")  # GPT-4使用的编码器
    p50k_encoder = tiktoken.get_encoding("p50k_base")      # GPT-3.5使用的编码器
    gpt2_encoder = tiktoken.get_encoding("gpt2")           # GPT-2使用的编码器

    # 示例文本
    text = "Hello world! 你好，世界！"
    
    # 使用不同编码器进行编码
    cl100k_tokens = cl100k_encoder.encode(text)
    p50k_tokens = p50k_encoder.encode(text)
    gpt2_tokens = gpt2_encoder.encode(text)
    
    # 打印结果
    print(f"示例文本: \"{text}\"")
    print(f"cl100k_base编码 (GPT-4): {cl100k_tokens}")
    print(f"p50k_base编码 (GPT-3.5): {p50k_tokens}")
    print(f"gpt2编码 (GPT-2): {gpt2_tokens}")
    print()

    # 解码示例
    print(f"cl100k_base解码: \"{cl100k_encoder.decode(cl100k_tokens)}\"")
    print(f"p50k_base解码: \"{p50k_encoder.decode(p50k_tokens)}\"")
    print(f"gpt2解码: \"{gpt2_encoder.decode(gpt2_tokens)}\"")
    print()

    # 计算token数量
    text_long = """
    Tiktoken is a fast BPE tokeniser for use with OpenAI models.
    It's designed to be fast, accurate, and handle multi-language input well.
    This package provides encodings for all of OpenAI's models.
    """
    
    cl100k_tokens_long = cl100k_encoder.encode(text_long)
    print(f"长文本token数量: {len(cl100k_tokens_long)}")
    
    # 特殊标记示例
    special_text = "Hello <|endoftext|> World"
    print(f"\n特殊标记示例: \"{special_text}\"")
    
    # 默认情况下，特殊标记会引发错误
    try:
        tokens = cl100k_encoder.encode(special_text)
        print("编码结果:", tokens)
    except ValueError as e:
        print(f"编码错误: {e}")
    
    # 允许特殊标记
    tokens = cl100k_encoder.encode(special_text, allowed_special={"<|endoftext|>"})
    print(f"允许特殊标记后编码结果: {tokens}")
    print(f"解码回原文: \"{cl100k_encoder.decode(tokens)}\"")


def main():
    """主函数，决定运行GUI还是命令行演示"""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        # 命令行模式
        run_command_line_demo()
    else:
        # GUI模式
        try:
            root = tk.Tk()
            app = TiktokenGUI(root)
            root.mainloop()
        except Exception as e:
            print(f"启动GUI出错: {e}")
            print("正在运行命令行演示...")
            run_command_line_demo()


if __name__ == "__main__":
    main()
