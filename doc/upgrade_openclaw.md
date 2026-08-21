# 如何升级openclaw
```
## 进入某个目录，克隆官方的openclaw
cd /Users/admin/git
git clone https://github.com/openclaw/openclaw
git pull
安装依赖和运行测试
pnpm install
pnpm openclaw 

## 进行本项目目录，同步openclaw，然后删除无用skills 
python upgrade_openclaw.py /Users/admin/git/openclaw
python delete_openclaw_skills.py
```


